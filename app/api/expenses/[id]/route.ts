import { NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { ObjectId } from "mongodb"

export const runtime = "nodejs"

// GET - Fetch a single expense by ID
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

    const expense = await db.collection("expenses").findOne({
      _id: new ObjectId(id),
    })

    if (!expense) {
      return NextResponse.json(
        { error: "Expense not found" },
        { status: 404 }
      )
    }

    return NextResponse.json(
      {
        id: expense._id.toString(),
        date: expense.date,
        item: expense.item,
        cost: expense.cost,
        quantity: expense.quantity || null,
        isRecurring: expense.isRecurring || false,
        recurringInterval: expense.recurringInterval || null,
        recurringEvery: expense.recurringEvery || null,
        startDate: expense.startDate || null,
        endDate: expense.endDate || null,
        createdAt: expense.createdAt,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error("Error fetching expense:", error)
    return NextResponse.json(
      { error: "Failed to fetch expense" },
      { status: 500 }
    )
  }
}

// PUT - Update an expense
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { date, item, cost, quantity, isRecurring, recurringInterval, recurringEvery, startDate, endDate } = body

    if (!item || cost === undefined || cost === null) {
      return NextResponse.json(
        { error: "Item and cost are required" },
        { status: 400 }
      )
    }

    if (isRecurring && (!recurringInterval || !recurringEvery || !startDate)) {
      return NextResponse.json(
        { error: "Recurring expenses require recurringInterval, recurringEvery, and startDate" },
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

    const updateData: any = {
      date: date ? new Date(date) : null,
      item,
      cost: parseFloat(cost),
      quantity: quantity ? parseFloat(quantity) : null,
      isRecurring: isRecurring || false,
      updatedAt: new Date(),
    }

    if (isRecurring) {
      updateData.recurringInterval = recurringInterval
      updateData.recurringEvery = parseInt(recurringEvery)
      updateData.startDate = new Date(startDate)
      if (endDate) {
        updateData.endDate = new Date(endDate)
      } else {
        updateData.endDate = null
      }
    } else {
      updateData.recurringInterval = null
      updateData.recurringEvery = null
      updateData.startDate = null
      updateData.endDate = null
    }
    
    // Quantity is already set above for both recurring and non-recurring

    const result = await db.collection("expenses").updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    )

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: "Expense not found" },
        { status: 404 }
      )
    }

    const updatedExpense = await db.collection("expenses").findOne({
      _id: new ObjectId(id),
    })

    return NextResponse.json(
      {
        id: updatedExpense!._id.toString(),
        date: updatedExpense!.date,
        item: updatedExpense!.item,
        cost: updatedExpense!.cost,
        quantity: updatedExpense!.quantity || null,
        isRecurring: updatedExpense!.isRecurring || false,
        recurringInterval: updatedExpense!.recurringInterval || null,
        recurringEvery: updatedExpense!.recurringEvery || null,
        startDate: updatedExpense!.startDate || null,
        endDate: updatedExpense!.endDate || null,
        createdAt: updatedExpense!.createdAt,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error("Error updating expense:", error)
    return NextResponse.json(
      { error: "Failed to update expense" },
      { status: 500 }
    )
  }
}

// DELETE - Delete an expense
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

    const result = await db.collection("expenses").deleteOne({
      _id: new ObjectId(id),
    })

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: "Expense not found" },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { message: "Expense deleted successfully" },
      { status: 200 }
    )
  } catch (error) {
    console.error("Error deleting expense:", error)
    return NextResponse.json(
      { error: "Failed to delete expense" },
      { status: 500 }
    )
  }
}

