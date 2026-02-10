import { NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

export const runtime = "nodejs"

// GET - List logs, optional ?category=inventory
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get("category")

    const client = await clientPromise
    if (!client) {
      return NextResponse.json(
        { error: "Database connection not available" },
        { status: 500 }
      )
    }
    const db = client.db()

    const filter = category ? { category } : {}
    const logs = await db
      .collection("logs")
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(500)
      .toArray()

    const result = logs.map((log) => ({
      id: log._id.toString(),
      category: log.category,
      createdAt: log.createdAt,
      message: log.message,
      details: log.details ?? null,
    }))

    return NextResponse.json(result, { status: 200 })
  } catch (error) {
    console.error("Error fetching logs:", error)
    return NextResponse.json(
      { error: "Failed to fetch logs" },
      { status: 500 }
    )
  }
}
