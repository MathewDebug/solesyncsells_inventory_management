import { NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { ObjectId } from "mongodb"

export const runtime = "nodejs"

// GET - List all inventory items with product details
export async function GET() {
  try {
    const client = await clientPromise
    if (!client) {
      return NextResponse.json(
        { error: "Database connection not available" },
        { status: 500 }
      )
    }
    const db = client.db()

    const items = await db
      .collection("inventory")
      .find({})
      .sort({ createdAt: -1 })
      .toArray()

    if (items.length === 0) {
      return NextResponse.json([], { status: 200 })
    }

    const productIds = items.map((i) => i.productId)
    const products = await db
      .collection("products")
      .find({ _id: { $in: productIds } })
      .toArray()
    const productMap = new Map(products.map((p) => [p._id.toString(), p]))

    const result = items.map((item) => {
      const product = productMap.get(item.productId.toString())
      if (!product) return null
      return {
        productId: item.productId.toString(),
        sizeQuantities: item.sizeQuantities || {},
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
        product: {
          id: product._id.toString(),
          name: product.name,
          image: product.image,
          imageBack: product.imageBack ?? null,
          brand: product.brand ?? "",
          category: product.category ?? "",
          type: product.type ?? product.name,
          colorway: product.colorway ?? "",
          productCode: product.productCode ?? "",
          sizes: product.sizes || [],
        },
      }
    }).filter(Boolean)

    return NextResponse.json(result, { status: 200 })
  } catch (error) {
    console.error("Error fetching inventory:", error)
    return NextResponse.json(
      { error: "Failed to fetch inventory" },
      { status: 500 }
    )
  }
}

// PATCH - Batch update multiple inventory items (one log for the whole batch)
export async function PATCH(request: Request) {
  try {
    const body = await request.json()
    const { updates } = body

    if (!Array.isArray(updates) || updates.length === 0) {
      return NextResponse.json(
        { error: "updates array with at least one item is required" },
        { status: 400 }
      )
    }

    const client = await clientPromise
    if (!client) {
      return NextResponse.json(
        { error: "Database connection not available" },
        { status: 500 }
      )
    }
    const db = client.db()

    const logEntries: { productName: string; changes: string }[] = []
    const now = new Date()

    for (const u of updates) {
      const { productId, sizeQuantities } = u
      if (!productId || sizeQuantities == null || typeof sizeQuantities !== "object") continue

      const existing = await db.collection("inventory").findOne({
        productId: new ObjectId(productId),
      })
      if (!existing) continue

      const product = await db.collection("products").findOne({
        _id: new ObjectId(productId),
      })
      const productName = product?.name ?? `Product ${productId}`

      await db.collection("inventory").updateOne(
        { productId: new ObjectId(productId) },
        { $set: { sizeQuantities, updatedAt: now } }
      )

      const oldQty = (existing.sizeQuantities || {}) as Record<string, number>
      const newQty = sizeQuantities as Record<string, number>
      const allSizes = new Set([...Object.keys(oldQty), ...Object.keys(newQty)])
      const changes: string[] = []
      for (const size of Array.from(allSizes).sort()) {
        const prev = oldQty[size] ?? 0
        const next = newQty[size] ?? 0
        if (prev !== next) {
          changes.push(`${size}: ${prev}→${next}`)
        }
      }
      const changeText = changes.length > 0 ? changes.join(", ") : "No quantity changes"
      logEntries.push({ productName, changes: changeText })
    }

    if (logEntries.length > 0) {
      const count = logEntries.length
      const message =
        count === 1
          ? `Updated quantities for "${logEntries[0].productName}"`
          : `Updated ${count} products`
      await db.collection("logs").insertOne({
        category: "inventory",
        createdAt: now,
        message,
        details: {
          productCount: count,
          products: logEntries,
        },
      })
    }

    return NextResponse.json(
      { updated: logEntries.length },
      { status: 200 }
    )
  } catch (error) {
    console.error("Error batch updating inventory:", error)
    return NextResponse.json(
      { error: "Failed to update inventory" },
      { status: 500 }
    )
  }
}

// POST - Add a product to inventory
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { productId } = body

    if (!productId) {
      return NextResponse.json(
        { error: "productId is required" },
        { status: 400 }
      )
    }

    const client = await clientPromise
    if (!client) {
      return NextResponse.json(
        { error: "Database connection not available" },
        { status: 500 }
      )
    }
    const db = client.db()

    const product = await db.collection("products").findOne({
      _id: new ObjectId(productId),
    })
    if (!product) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      )
    }

    const existing = await db.collection("inventory").findOne({
      productId: new ObjectId(productId),
    })
    if (existing) {
      return NextResponse.json(
        { error: "Product is already in inventory" },
        { status: 409 }
      )
    }

    const sizes = (product.sizes && product.sizes.length > 0)
      ? product.sizes
      : ["XXS", "XS", "S", "M", "L", "XL", "XXL"]
    const sizeQuantities: Record<string, number> = {}
    sizes.forEach((s: string) => {
      sizeQuantities[s] = product.sizeQuantities?.[s] ?? 0
    })

    await db.collection("inventory").insertOne({
      productId: new ObjectId(productId),
      sizeQuantities,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    await db.collection("logs").insertOne({
      category: "inventory",
      createdAt: new Date(),
      message: `Added "${product.name}" to inventory`,
      details: {
        productId,
        productName: product.name,
        action: "added",
      },
    })

    return NextResponse.json(
      {
        productId,
        sizeQuantities,
        message: "Added to inventory",
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("Error adding to inventory:", error)
    return NextResponse.json(
      { error: "Failed to add to inventory" },
      { status: 500 }
    )
  }
}
