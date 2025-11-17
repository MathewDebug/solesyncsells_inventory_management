import bcrypt from "bcryptjs"
import clientPromise from "./mongodb"

export interface User {
  _id?: string
  email: string
  password: string
  name?: string
  createdAt?: Date
}

export async function createUser(email: string, password: string, name?: string): Promise<User | null> {
  try {
    const client = await clientPromise
    const db = client.db()

    // Check if user already exists
    const existingUser = await db.collection("users").findOne({ email })
    if (existingUser) {
      return null
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create user
    const result = await db.collection("users").insertOne({
      email,
      password: hashedPassword,
      name: name || email.split("@")[0],
      createdAt: new Date(),
    })

    return {
      _id: result.insertedId.toString(),
      email,
      name: name || email.split("@")[0],
    }
  } catch (error) {
    console.error("Error creating user:", error)
    return null
  }
}

