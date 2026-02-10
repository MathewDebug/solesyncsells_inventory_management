import { NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

export const runtime = "nodejs"

// GET - Set brand "Essentials" on all products that don't have a brand
// One-time migration - run once then optional to remove or leave disabled
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

    const result = await db.collection("products").updateMany(
      {
        $or: [
          { brand: { $exists: false } },
          { brand: "" },
          { brand: null },
        ],
      },
      { $set: { brand: "Essentials" } }
    )

    return NextResponse.json(
      {
        message: `Set brand "Essentials" on ${result.modifiedCount} product(s)`,
        matchedCount: result.matchedCount,
        modifiedCount: result.modifiedCount,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error("Error migrating products (add brand):", error)
    return NextResponse.json(
      {
        error: "Failed to migrate products",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}
