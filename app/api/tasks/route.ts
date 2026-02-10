import { NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { ObjectId } from "mongodb"

export const runtime = "nodejs"

type TaskStatus = "backlog" | "in_progress" | "completed"
type TaskPriority = "low" | "medium" | "high"

// GET - Fetch all tasks
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

    const tasks = await db
      .collection("tasks")
      .find({})
      .sort({ createdAt: -1 })
      .limit(1000)
      .toArray()

    return NextResponse.json(
      tasks.map((task) => ({
        id: task._id.toString(),
        title: task.title ?? "",
        description: task.description ?? "",
        status: (task.status as TaskStatus) ?? "backlog",
        priority: (task.priority as TaskPriority) ?? "medium",
        dueDate: task.dueDate ?? null,
        createdAt: task.createdAt,
      })),
      { status: 200 }
    )
  } catch (error) {
    console.error("Error fetching tasks:", error)
    return NextResponse.json(
      { error: "Failed to fetch tasks" },
      { status: 500 }
    )
  }
}

// POST - Create a new task (goes into backlog by default)
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      description,
      priority,
      dueDate,
    }: {
      description?: string
      priority?: TaskPriority
      dueDate?: string | null
    } = body

    if (!description || !description.trim()) {
      return NextResponse.json(
        { error: "Task description is required" },
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

    const now = new Date()
    const doc = {
      title: description.trim().split("\n")[0].slice(0, 80),
      description: description.trim(),
      status: "backlog" as TaskStatus,
      priority: (priority ?? "medium") as TaskPriority,
      dueDate: dueDate ? new Date(dueDate) : null,
      createdAt: now,
    }

    const result = await db.collection("tasks").insertOne(doc)

    return NextResponse.json(
      {
        id: result.insertedId.toString(),
        ...doc,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("Error creating task:", error)
    return NextResponse.json(
      { error: "Failed to create task" },
      { status: 500 }
    )
  }
}

// PATCH - Update task (status, priority, description, dueDate)
export async function PATCH(request: Request) {
  try {
    const body = await request.json()
    const {
      id,
      status,
      priority,
      description,
      dueDate,
    }: {
      id?: string
      status?: TaskStatus
      priority?: TaskPriority
      description?: string
      dueDate?: string | null
    } = body

    if (!id) {
      return NextResponse.json(
        { error: "Task id is required" },
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

    const update: Record<string, unknown> = {}
    if (status) update.status = status
    if (priority) update.priority = priority
    if (description !== undefined) update.description = description
    if (dueDate !== undefined) {
      update.dueDate = dueDate ? new Date(dueDate) : null
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json(
        { error: "No fields provided to update" },
        { status: 400 }
      )
    }

    const result = await db.collection("tasks").updateOne(
      { _id: new ObjectId(id) },
      { $set: update }
    )

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: "Task not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({ id, ...update }, { status: 200 })
  } catch (error) {
    console.error("Error updating task:", error)
    return NextResponse.json(
      { error: "Failed to update task" },
      { status: 500 }
    )
  }
}

// DELETE - Delete a task by id (id in query string: ?id=...)
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json(
        { error: "Task id is required" },
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

    const result = await db.collection("tasks").deleteOne({
      _id: new ObjectId(id),
    })

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: "Task not found" },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { message: "Task deleted successfully" },
      { status: 200 }
    )
  } catch (error) {
    console.error("Error deleting task:", error)
    return NextResponse.json(
      { error: "Failed to delete task" },
      { status: 500 }
    )
  }
}

