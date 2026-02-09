import { NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { ObjectId } from "mongodb"

export const runtime = "nodejs"

// PUT - Update a product
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body = await request.json()
    const { name, image, sizes } = body
    const { id } = await params

    if (!name || !image) {
      return NextResponse.json(
        { error: "Name and image are required" },
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

    // Check for duplicate name (excluding current product)
    const existingProduct = await db.collection("products").findOne({
      name: name,
      _id: { $ne: new ObjectId(id) }
    })

    if (existingProduct) {
      return NextResponse.json(
        { error: "A product with this name already exists" },
        { status: 409 }
      )
    }

    const result = await db.collection("products").updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          name,
          image,
          sizes: sizes || [],
          updatedAt: new Date(),
        },
      }
    )

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      )
    }

    return NextResponse.json(
      {
        id,
        name,
        image,
        sizes: sizes || [],
      },
      { status: 200 }
    )
  } catch (error) {
    console.error("Error updating product:", error)
    return NextResponse.json(
      { error: "Failed to update product" },
      { status: 500 }
    )
  }
}

// DELETE - Delete a product
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const client = await clientPromise
    if (!client) {
      return NextResponse.json(
        { error: "Database connection not available" },
        { status: 500 }
      )
    }
    const db = client.db()

    const result = await db.collection("products").deleteOne({
      _id: new ObjectId(id),
    })

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { message: "Product deleted successfully" },
      { status: 200 }
    )
  } catch (error) {
    console.error("Error deleting product:", error)
    return NextResponse.json(
      { error: "Failed to delete product" },
      { status: 500 }
    )
  }
}

