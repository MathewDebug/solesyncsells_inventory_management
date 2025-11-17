import { NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

export const runtime = "nodejs"

// GET - Fetch all orders
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
    
    const orders = await db.collection("orders")
      .find({})
      .sort({ createdAt: -1 })
      .limit(1000)
      .toArray()

    return NextResponse.json(
      orders.map(order => ({
        id: order._id.toString(),
        orderNumber: order.orderNumber || null,
        products: order.products,
        date: order.date,
        paymentMethod: order.paymentMethod,
        totalItemCount: order.totalItemCount || 0,
        supplier: order.supplier || null,
        notes: order.notes || null,
        totalOrderAmount: order.totalOrderAmount || null,
        feesAndShipping: order.feesAndShipping || null,
        createdAt: order.createdAt,
      })),
      { status: 200 }
    )
  } catch (error) {
    console.error("Error fetching orders:", error)
    return NextResponse.json(
      { error: "Failed to fetch orders" },
      { status: 500 }
    )
  }
}

// POST - Create a new order
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { products, date, paymentMethod, totalItemCount, supplier, notes, totalOrderAmount, feesAndShipping } = body

    if (!products || !Array.isArray(products) || products.length === 0) {
      return NextResponse.json(
        { error: "At least one product is required" },
        { status: 400 }
      )
    }

    if (!date) {
      return NextResponse.json(
        { error: "Date is required" },
        { status: 400 }
      )
    }

    if (!paymentMethod) {
      return NextResponse.json(
        { error: "Payment method is required" },
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

    // Calculate total item count if not provided
    const calculatedTotalItemCount = totalItemCount || products.reduce((sum: number, p: { quantity: number }) => sum + (p.quantity || 0), 0)

    // Get the highest order number and increment by 1
    const lastOrder = await db.collection("orders")
      .findOne({}, { sort: { orderNumber: -1 } })
    const nextOrderNumber = lastOrder?.orderNumber ? lastOrder.orderNumber + 1 : 1

    const result = await db.collection("orders").insertOne({
      orderNumber: nextOrderNumber,
      products,
      date: new Date(date),
      paymentMethod,
      totalItemCount: calculatedTotalItemCount,
      supplier: supplier || null,
      notes: notes || null,
      totalOrderAmount: totalOrderAmount || null,
      feesAndShipping: feesAndShipping || null,
      createdAt: new Date(),
    })

    return NextResponse.json(
      {
        id: result.insertedId.toString(),
        orderNumber: nextOrderNumber,
        products,
        date: new Date(date),
        paymentMethod,
        totalItemCount: calculatedTotalItemCount,
        supplier: supplier || null,
        notes: notes || null,
        totalOrderAmount: totalOrderAmount || null,
        feesAndShipping: feesAndShipping || null,
        createdAt: new Date(),
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("Error creating order:", error)
    return NextResponse.json(
      { error: "Failed to create order" },
      { status: 500 }
    )
  }
}

