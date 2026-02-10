import { NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { ObjectId } from "mongodb"

export const runtime = "nodejs"

// PATCH - Update inventory quantities for a product
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const body = await request.json()
    const { sizeQuantities } = body
    const { productId } = await params

    if (sizeQuantities == null || typeof sizeQuantities !== "object") {
      return NextResponse.json(
        { error: "sizeQuantities object is required" },
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

    const existing = await db.collection("inventory").findOne({
      productId: new ObjectId(productId),
    })
    if (!existing) {
      return NextResponse.json(
        { error: "Inventory item not found" },
        { status: 404 }
      )
    }

    const product = await db.collection("products").findOne({
      _id: new ObjectId(productId),
    })
    const productName = product?.name ?? `Product ${productId}`

    const result = await db.collection("inventory").updateOne(
      { productId: new ObjectId(productId) },
      { $set: { sizeQuantities, updatedAt: new Date() } }
    )

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: "Inventory item not found" },
        { status: 404 }
      )
    }

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

    await db.collection("logs").insertOne({
      category: "inventory",
      createdAt: new Date(),
      message: `Updated quantities for "${productName}"`,
      details: {
        productId,
        productName,
        changes: changeText,
      },
    })

    return NextResponse.json(
      { productId, sizeQuantities },
      { status: 200 }
    )
  } catch (error) {
    console.error("Error updating inventory:", error)
    return NextResponse.json(
      { error: "Failed to update inventory" },
      { status: 500 }
    )
  }
}

// DELETE - Remove a product from inventory
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const { productId } = await params

    const client = await clientPromise
    if (!client) {
      return NextResponse.json(
        { error: "Database connection not available" },
        { status: 500 }
      )
    }
    const db = client.db()

    const existing = await db.collection("inventory").findOne({
      productId: new ObjectId(productId),
    })
    if (!existing) {
      return NextResponse.json(
        { error: "Inventory item not found" },
        { status: 404 }
      )
    }

    const product = await db.collection("products").findOne({
      _id: new ObjectId(productId),
    })
    const productName = product?.name ?? `Product ${productId}`

    const sizeQuantities = (existing.sizeQuantities || {}) as Record<string, number>
    const sizesAndQuantities = Object.entries(sizeQuantities)
      .filter(([, qty]) => qty > 0)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([size, qty]) => ({ size, quantity: qty }))
    const summary =
      sizesAndQuantities.length > 0
        ? sizesAndQuantities.map(({ size, quantity }) => `${size}: ${quantity}`).join(", ")
        : "No quantities"

    const result = await db.collection("inventory").deleteOne({
      productId: new ObjectId(productId),
    })

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: "Inventory item not found" },
        { status: 404 }
      )
    }

    await db.collection("logs").insertOne({
      category: "inventory",
      createdAt: new Date(),
      message: `Removed "${productName}" from inventory`,
      details: {
        productId,
        productName,
        action: "removed",
        sizeQuantities: sizeQuantities,
        sizesAndQuantitiesSummary: summary,
      },
    })

    return NextResponse.json(
      { message: "Removed from inventory" },
      { status: 200 }
    )
  } catch (error) {
    console.error("Error removing from inventory:", error)
    return NextResponse.json(
      { error: "Failed to remove from inventory" },
      { status: 500 }
    )
  }
}
