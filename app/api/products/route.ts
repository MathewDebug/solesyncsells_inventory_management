import { NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

export const runtime = "nodejs"

// GET - Fetch all products
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
    
    const products = await db.collection("products")
      .find({})
      .sort({ createdAt: -1 })
      .limit(1000) // Limit to prevent memory issues
      .toArray()

    return NextResponse.json(
      products.map(product => ({
        id: product._id.toString(),
        name: product.name,
        image: product.image,
        sizes: product.sizes || [],
        createdAt: product.createdAt,
      })),
      { status: 200 }
    )
  } catch (error) {
    console.error("Error fetching products:", error)
    return NextResponse.json(
      { error: "Failed to fetch products" },
      { status: 500 }
    )
  }
}

// POST - Create a new product
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, image, sizes } = body

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

    // Check for duplicate name
    const existingProduct = await db.collection("products").findOne({ name })
    if (existingProduct) {
      return NextResponse.json(
        { error: "A product with this name already exists" },
        { status: 409 }
      )
    }

    const result = await db.collection("products").insertOne({
      name,
      image,
      sizes: sizes || [],
      createdAt: new Date(),
    })

    return NextResponse.json(
      {
        id: result.insertedId.toString(),
        name,
        image,
        sizes: sizes || [],
        createdAt: new Date(),
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("Error creating product:", error)
    return NextResponse.json(
      { error: "Failed to create product" },
      { status: 500 }
    )
  }
}

