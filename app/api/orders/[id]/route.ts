import { NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { ObjectId } from "mongodb"

export const runtime = "nodejs"

// GET - Fetch a single order by ID
export async function GET(
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

    const order = await db.collection("orders").findOne({
      _id: new ObjectId(id),
    })

    if (!order) {
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404 }
      )
    }

    return NextResponse.json(
      {
        id: order._id.toString(),
        orderNumber: order.orderNumber ?? null,
        products: order.products,
        date: order.date,
        paymentMethod: order.paymentMethod,
        totalItemCount: order.totalItemCount ?? 0,
        supplier: order.supplier ?? null,
        notes: order.notes ?? null,
        totalOrderAmount: order.totalOrderAmount ?? null,
        feesAndShipping: order.feesAndShipping ?? null,
        productCost: order.productCost ?? null,
        carrier: order.carrier ?? null,
        shipStartDate: order.shipStartDate ?? null,
        trackingLinks: order.trackingLinks ?? [],
        shipArrivalDate: order.shipArrivalDate ?? null,
        status: order.status === "ARRIVED" ? "COMPLETED" : (order.status ?? "SHIPPING"),
        createdAt: order.createdAt,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error("Error fetching order:", error)
    return NextResponse.json(
      { error: "Failed to fetch order" },
      { status: 500 }
    )
  }
}

// PUT - Update an order
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body = await request.json()
    const { products, date, paymentMethod, totalItemCount, supplier, notes, totalOrderAmount, feesAndShipping, productCost, carrier, shipStartDate, trackingLinks, shipArrivalDate, status } = body
    const { id } = await params

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

    const result = await db.collection("orders").updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          products,
          date: new Date(date),
          paymentMethod,
          totalItemCount: calculatedTotalItemCount,
          supplier: supplier ?? null,
          notes: notes ?? null,
          totalOrderAmount: totalOrderAmount ?? null,
          feesAndShipping: feesAndShipping ?? null,
          productCost: productCost ?? null,
          carrier: carrier ?? null,
          shipStartDate: shipStartDate ? new Date(shipStartDate) : null,
          trackingLinks: trackingLinks ?? [],
          shipArrivalDate: shipArrivalDate ? new Date(shipArrivalDate) : null,
          status: status === "ARRIVED" ? "COMPLETED" : (status || "SHIPPING"),
          updatedAt: new Date(),
        },
      }
    )

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404 }
      )
    }

    return NextResponse.json(
      {
        id,
        products,
        date: new Date(date),
        paymentMethod,
        totalItemCount: calculatedTotalItemCount,
        supplier: supplier ?? null,
        notes: notes ?? null,
        totalOrderAmount: totalOrderAmount ?? null,
        feesAndShipping: feesAndShipping ?? null,
        productCost: productCost ?? null,
        carrier: carrier ?? null,
        shipStartDate: shipStartDate ? new Date(shipStartDate) : null,
        trackingLinks: trackingLinks ?? [],
        shipArrivalDate: shipArrivalDate ? new Date(shipArrivalDate) : null,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error("Error updating order:", error)
    return NextResponse.json(
      { error: "Failed to update order" },
      { status: 500 }
    )
  }
}

// DELETE - Delete an order
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

    const result = await db.collection("orders").deleteOne({
      _id: new ObjectId(id),
    })

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { message: "Order deleted successfully" },
      { status: 200 }
    )
  } catch (error) {
    console.error("Error deleting order:", error)
    return NextResponse.json(
      { error: "Failed to delete order" },
      { status: 500 }
    )
  }
}

