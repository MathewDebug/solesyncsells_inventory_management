import { NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

export const runtime = "nodejs"

// GET - Fetch all products (optional ?inventory=true for only inventory products)
export async function GET(request: Request) {
  try {
    const client = await clientPromise
    if (!client) {
      return NextResponse.json(
        { error: "Database connection not available" },
        { status: 500 }
      )
    }
    const db = client.db()
    const { searchParams } = new URL(request.url)
    const inventoryOnly = searchParams.get("inventory") === "true"

    const filter = inventoryOnly ? { inInventory: true } : {}
    const products = await db.collection("products")
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(1000)
      .toArray()

    return NextResponse.json(
      products.map(product => ({
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
        sizeQuantities: product.sizeQuantities || {},
        inInventory: product.inInventory ?? false,
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
    const { name, image, imageBack, brand, category, type, colorway, productCode, sizes, sizeQuantities } = body

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
      imageBack: imageBack || null,
      brand: brand ?? "",
      category: category || "",
      type: type || name,
      colorway: colorway || "",
      productCode: productCode || "",
      sizes: sizes || [],
      sizeQuantities: sizeQuantities && typeof sizeQuantities === "object" ? sizeQuantities : {},
      inInventory: false,
      createdAt: new Date(),
    })

    return NextResponse.json(
      {
        id: result.insertedId.toString(),
        name,
        image,
        imageBack: imageBack || null,
        brand: brand ?? "",
        category: category || "",
        type: type || name,
        colorway: colorway || "",
        productCode: productCode || "",
        sizes: sizes || [],
        sizeQuantities: sizeQuantities && typeof sizeQuantities === "object" ? sizeQuantities : {},
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

