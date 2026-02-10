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

    const result = await db.collection("inventory").deleteOne({
      productId: new ObjectId(productId),
    })

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: "Inventory item not found" },
        { status: 404 }
      )
    }

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
