import { NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

export const runtime = "nodejs"

// POST - Add '?' size to all products
// This is a one-time migration script - DELETE THIS FILE AFTER RUNNING
export async function POST() {
  try {
    const client = await clientPromise
    if (!client) {
      return NextResponse.json(
        { error: "Database connection not available" },
        { status: 500 }
      )
    }
    const db = client.db()
    
    // Fetch all products
    const products = await db.collection("products").find({}).toArray()
    
    if (products.length === 0) {
      return NextResponse.json(
        { message: "No products found in database", updated: 0 },
        { status: 200 }
      )
    }

    let updatedCount = 0
    
    // Update each product to add '?' to sizes if not already present
    for (const product of products) {
      const currentSizes = product.sizes || []
      
      // Only add '?' if it's not already in the sizes array
      if (!currentSizes.includes('?')) {
        const updatedSizes = [...currentSizes, '?']
        
        await db.collection("products").updateOne(
          { _id: product._id },
          {
            $set: {
              sizes: updatedSizes,
            },
          }
        )
        updatedCount++
      }
    }

    return NextResponse.json(
      {
        message: `Successfully updated ${updatedCount} out of ${products.length} products`,
        totalProducts: products.length,
        updated: updatedCount,
        skipped: products.length - updatedCount,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error("Error migrating products:", error)
    return NextResponse.json(
      { error: "Failed to migrate products", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}

