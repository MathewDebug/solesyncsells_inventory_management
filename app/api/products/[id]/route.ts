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
    const { name, image, imageBack, category, type, colorway, productCode, sizes, sizeQuantities } = body
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

    const updatePayload: {
      name: string
      image: string
      sizes: string[]
      updatedAt: Date
      imageBack?: string | null
      category?: string
      type?: string
      colorway?: string
      productCode?: string
      sizeQuantities?: Record<string, number>
    } = {
      name,
      image,
      sizes: sizes || [],
      updatedAt: new Date(),
    }
    if (imageBack !== undefined) updatePayload.imageBack = imageBack || null
    if (category !== undefined) updatePayload.category = category || ""
    if (type !== undefined) updatePayload.type = type || name
    if (colorway !== undefined) updatePayload.colorway = colorway || ""
    if (productCode !== undefined) updatePayload.productCode = productCode || ""
    if (sizeQuantities != null && typeof sizeQuantities === "object") {
      updatePayload.sizeQuantities = sizeQuantities
    }
    const result = await db.collection("products").updateOne(
      { _id: new ObjectId(id) },
      { $set: updatePayload }
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
        imageBack: updatePayload.imageBack ?? null,
        category: updatePayload.category ?? "",
        type: updatePayload.type ?? name,
        colorway: updatePayload.colorway ?? "",
        productCode: updatePayload.productCode ?? "",
        sizes: sizes || [],
        sizeQuantities: updatePayload.sizeQuantities ?? {},
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

// PATCH - Update inventory (sizeQuantities and/or inInventory)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body = await request.json()
    const { sizeQuantities, inInventory } = body
    const { id } = await params

    const client = await clientPromise
    if (!client) {
      return NextResponse.json(
        { error: "Database connection not available" },
        { status: 500 }
      )
    }
    const db = client.db()

    const update: Record<string, unknown> = { updatedAt: new Date() }
    if (sizeQuantities != null && typeof sizeQuantities === "object") {
      update.sizeQuantities = sizeQuantities
    }
    if (inInventory !== undefined && typeof inInventory === "boolean") {
      update.inInventory = inInventory
    }
    if (Object.keys(update).length <= 1) {
      return NextResponse.json(
        { error: "Provide sizeQuantities and/or inInventory" },
        { status: 400 }
      )
    }

    const result = await db.collection("products").updateOne(
      { _id: new ObjectId(id) },
      { $set: update }
    )

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { id, sizeQuantities, inInventory },
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

