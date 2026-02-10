import { NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

export const runtime = "nodejs"

type StoreType = "Store" | "Reseller" | "International"

// GET - Fetch all stores/resellers
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

    const stores = await db
      .collection("stores")
      .find({})
      .sort({ name: 1 })
      .limit(1000)
      .toArray()

    return NextResponse.json(
      stores.map((store) => ({
        id: store._id.toString(),
        name: store.name as string,
        type: (store.type as StoreType) ?? "Store",
        createdAt: store.createdAt,
      })),
      { status: 200 }
    )
  } catch (error) {
    console.error("Error fetching stores:", error)
    return NextResponse.json(
      { error: "Failed to fetch stores" },
      { status: 500 }
    )
  }
}

// POST - Create a new store/reseller
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      name,
      type,
    }: {
      name?: string
      type?: StoreType
    } = body

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      )
    }

    const allowedTypes: StoreType[] = ["Store", "Reseller", "International"]
    const storeType: StoreType =
      (type && allowedTypes.includes(type) && type) || "Store"

    const client = await clientPromise
    if (!client) {
      return NextResponse.json(
        { error: "Database connection not available" },
        { status: 500 }
      )
    }
    const db = client.db()

    const now = new Date()

    const result = await db.collection("stores").insertOne({
      name: name.trim(),
      type: storeType,
      createdAt: now,
    })

    return NextResponse.json(
      {
        id: result.insertedId.toString(),
        name: name.trim(),
        type: storeType,
        createdAt: now,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("Error creating store:", error)
    return NextResponse.json(
      { error: "Failed to create store" },
      { status: 500 }
    )
  }
}

