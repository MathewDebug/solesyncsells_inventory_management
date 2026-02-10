import { NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

export const runtime = "nodejs"

type Platform =
  | "Depop"
  | "Ebay"
  | "Poshmark"
  | "Vinted"
  | "Mercari"
  | "Curtsy"
  | "Store"
  | "Reseller"
  | "International"

type PaymentMethod =
  | "Zelle"
  | "Venmo"
  | "Cashapp"
  | "Apple Cash"
  | "Crypto"
  | "Cash"

type SaleKind = "online" | "wholesale"
type WholesaleType = "Physical" | "Store" | "International"

// GET - Fetch all sales
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

    const sales = await db
      .collection("sales")
      .find({})
      .sort({ dateSold: -1, createdAt: -1 })
      .limit(1000)
      .toArray()

    return NextResponse.json(
      sales.map((sale) => ({
        id: sale._id.toString(),
        platform: sale.platform as Platform,
        saleType: (sale.saleType as SaleKind) ?? "online",
        wholesaleType: (sale.wholesaleType as WholesaleType | undefined) ?? undefined,
        buyerStoreId: sale.buyerStoreId ?? null,
        buyerStoreName: sale.buyerStoreName ?? null,
        dateSold: sale.dateSold,
        paymentMethod: sale.paymentMethod as PaymentMethod,
        notes: sale.notes ?? "",
        lineItems: sale.lineItems ?? [],
        totalAmount: sale.totalAmount ?? null,
        createdAt: sale.createdAt,
      })),
      { status: 200 }
    )
  } catch (error) {
    console.error("Error fetching sales:", error)
    return NextResponse.json(
      { error: "Failed to fetch sales" },
      { status: 500 }
    )
  }
}

// POST - Create a new sale
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      platform,
      dateSold,
      paymentMethod,
      notes,
      lineItems,
      saleType,
      wholesaleType,
      buyerStoreId,
      buyerStoreName,
    }: {
      platform?: Platform
      dateSold?: string
      paymentMethod?: PaymentMethod
      notes?: string
      lineItems?: Array<{
        productId: string
        productName: string
        quantity: number
        pricePerUnit: number
        size?: string | null
      }>
      saleType?: SaleKind
      wholesaleType?: WholesaleType
      buyerStoreId?: string | null
      buyerStoreName?: string | null
    } = body

    const kind: SaleKind = saleType ?? "online"

    if (!platform) {
      return NextResponse.json(
        { error: "Platform is required" },
        { status: 400 }
      )
    }

    // For wholesale sales, enforce payment method and wholesale type
    if (kind === "wholesale") {
      if (!paymentMethod) {
        return NextResponse.json(
          { error: "Payment method is required for wholesale sales" },
          { status: 400 }
        )
      }
      if (!wholesaleType) {
        return NextResponse.json(
          { error: "Wholesale type is required for wholesale sales" },
          { status: 400 }
        )
      }
    }

    if (!lineItems || !Array.isArray(lineItems) || lineItems.length === 0) {
      return NextResponse.json(
        { error: "At least one line item is required" },
        { status: 400 }
      )
    }

    const sanitizedItems = lineItems
      .map((item) => ({
        productId: item.productId,
        productName: item.productName,
        quantity: Number(item.quantity) || 0,
        pricePerUnit: Number(item.pricePerUnit) || 0,
        size: item.size ?? null,
      }))
      .filter((item) => item.productId && item.productName && item.quantity > 0)

    if (sanitizedItems.length === 0) {
      return NextResponse.json(
        { error: "All line items are invalid" },
        { status: 400 }
      )
    }

    const totalAmount = sanitizedItems.reduce(
      (sum, item) => sum + item.quantity * item.pricePerUnit,
      0
    )

    const client = await clientPromise
    if (!client) {
      return NextResponse.json(
        { error: "Database connection not available" },
        { status: 500 }
      )
    }
    const db = client.db()

    const now = new Date()

    const saleDoc = {
      platform,
      dateSold: dateSold ? new Date(dateSold) : now,
      paymentMethod,
      notes: notes || "",
      lineItems: sanitizedItems,
      totalAmount,
      saleType: kind,
      wholesaleType: wholesaleType ?? null,
      buyerStoreId: buyerStoreId ?? null,
      buyerStoreName: buyerStoreName ?? null,
      createdAt: now,
    }

    const result = await db.collection("sales").insertOne(saleDoc)

    return NextResponse.json(
      {
        id: result.insertedId.toString(),
        ...saleDoc,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("Error creating sale:", error)
    return NextResponse.json(
      { error: "Failed to create sale" },
      { status: 500 }
    )
  }
}

