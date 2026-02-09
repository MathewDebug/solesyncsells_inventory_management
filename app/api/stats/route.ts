import { NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

export const runtime = "nodejs"

// GET - Fetch statistics
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

    // Count products
    const totalProducts = await db.collection("products").countDocuments({})

    // Count orders
    const totalOrders = await db.collection("orders").countDocuments({})

    // Calculate total products bought (sum of all quantities from all orders)
    const orders = await db.collection("orders").find({}).toArray()
    let productsBought = 0
    let totalSpent = 0
    const supplierCounts: Record<string, number> = {}
    
    interface OrderProduct {
      quantity?: number
    }
    interface StatsOrder {
      products?: OrderProduct[]
      totalOrderAmount?: number
      supplier?: string
    }
    ;(orders as StatsOrder[]).forEach((order) => {
      // Calculate products bought
      if (order.products && Array.isArray(order.products)) {
        order.products.forEach((product: OrderProduct) => {
          if (product.quantity && typeof product.quantity === 'number') {
            productsBought += product.quantity
          }
        })
      }
      
      // Calculate total spent (sum of totalOrderAmount)
      if (order.totalOrderAmount && typeof order.totalOrderAmount === 'number') {
        totalSpent += order.totalOrderAmount
      }
      
      // Count suppliers (exact string match)
      if (order.supplier && typeof order.supplier === 'string' && order.supplier.trim() !== '') {
        const supplierName = order.supplier.trim()
        supplierCounts[supplierName] = (supplierCounts[supplierName] || 0) + 1
      }
    })

    // Get top 5 suppliers sorted by count (descending)
    const topSuppliers = Object.entries(supplierCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)

    return NextResponse.json(
      {
        totalProducts,
        totalOrders,
        productsBought,
        totalSpent,
        topSuppliers,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error("Error fetching stats:", error)
    return NextResponse.json(
      { error: "Failed to fetch statistics" },
      { status: 500 }
    )
  }
}

