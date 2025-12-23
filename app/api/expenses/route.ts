import { NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { ObjectId } from "mongodb"

export const runtime = "nodejs"

// GET - Fetch all expenses
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
    
    const expenses = await db.collection("expenses")
      .find({})
      .sort({ createdAt: -1 })
      .limit(1000)
      .toArray()

    return NextResponse.json(
      expenses.map(expense => ({
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
      })),
      { status: 200 }
    )
  } catch (error) {
    console.error("Error fetching expenses:", error)
    return NextResponse.json(
      { error: "Failed to fetch expenses" },
      { status: 500 }
    )
  }
}

// POST - Create a new expense
export async function POST(request: Request) {
  try {
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

    const expenseData: any = {
      date: date ? new Date(date) : null,
      item,
      cost: parseFloat(cost),
      quantity: quantity ? parseFloat(quantity) : null,
      isRecurring: isRecurring || false,
      createdAt: new Date(),
    }

    if (isRecurring) {
      expenseData.recurringInterval = recurringInterval
      expenseData.recurringEvery = parseInt(recurringEvery)
      expenseData.startDate = new Date(startDate)
      if (endDate) {
        expenseData.endDate = new Date(endDate)
      }
    }

    const result = await db.collection("expenses").insertOne(expenseData)

    return NextResponse.json(
      {
        id: result.insertedId.toString(),
        date: expenseData.date,
        item,
        cost: expenseData.cost,
        quantity: expenseData.quantity || null,
        isRecurring: expenseData.isRecurring,
        recurringInterval: expenseData.recurringInterval || null,
        recurringEvery: expenseData.recurringEvery || null,
        startDate: expenseData.startDate || null,
        endDate: expenseData.endDate || null,
        createdAt: expenseData.createdAt,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("Error creating expense:", error)
    return NextResponse.json(
      { error: "Failed to create expense" },
      { status: 500 }
    )
  }
}

