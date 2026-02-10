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
