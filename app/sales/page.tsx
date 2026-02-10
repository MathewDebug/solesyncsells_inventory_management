"use client"

import { useEffect, useMemo, useState } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import { format } from "date-fns"

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

interface ProductInfo {
  id: string
  name: string
  image: string
  brand?: string
  type?: string
  sizes?: string[]
}

interface SaleLineItem {
  productId: string
  productName: string
  quantity: number
  pricePerUnit: number
  size?: string | null
}

interface Sale {
  id: string
  platform: Platform
  dateSold: string
  paymentMethod: PaymentMethod
  notes: string
  lineItems: SaleLineItem[]
  totalAmount: number
  createdAt: string
}

interface StoreBuyer {
  id: string
  name: string
  type: "Store" | "Reseller" | "International"
}

export default function SalesPage() {
  const [sales, setSales] = useState<Sale[]>([])
  const [loading, setLoading] = useState(true)
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [saleKind, setSaleKind] = useState<SaleKind>("online")
  const [inventoryItems, setInventoryItems] = useState<ProductInfo[]>([])
  const [inventoryLoading, setInventoryLoading] = useState(false)
  const [buyers, setBuyers] = useState<StoreBuyer[]>([])
  const [buyersLoading, setBuyersLoading] = useState(false)

  const [platform, setPlatform] = useState<Platform>("Depop")
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("Zelle")
  const [dateSold, setDateSold] = useState<Date | null>(new Date())
  const [wholesaleType, setWholesaleType] = useState<WholesaleType>("Physical")
  const [notes, setNotes] = useState("")
  const [selectedBuyerId, setSelectedBuyerId] = useState<string | "">("")
  const [lineItems, setLineItems] = useState<
    Array<SaleLineItem & { key: string }>
  >([])
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetchSales()
  }, [])

  const fetchSales = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/sales")
      if (response.ok) {
        const data = await response.json()
        setSales(data)
      }
    } catch (error) {
      console.error("Error fetching sales:", error)
    } finally {
      setLoading(false)
    }
  }

  const ensureInventoryLoaded = async () => {
    if (inventoryItems.length > 0 || inventoryLoading) return
    try {
      setInventoryLoading(true)
      const response = await fetch("/api/inventory")
      if (response.ok) {
        type InventoryApiItem = {
          product: {
            id: string
            name: string
            image: string
            brand?: string
            type?: string
            sizes?: string[]
          }
        }
        const data: InventoryApiItem[] = await response.json()
        const mapped: ProductInfo[] = data.map((item) => ({
          id: item.product.id,
          name: item.product.name,
          image: item.product.image,
          brand: item.product.brand ?? "",
          type: item.product.type ?? "",
          sizes: item.product.sizes ?? [],
        }))
        setInventoryItems(mapped)
      }
    } catch (error) {
      console.error("Error fetching inventory products:", error)
    } finally {
      setInventoryLoading(false)
    }
  }

  const ensureBuyersLoaded = async () => {
    if (buyers.length > 0 || buyersLoading) return
    try {
      setBuyersLoading(true)
      const res = await fetch("/api/stores")
      if (res.ok) {
        const data: Array<{ id: string; name: string; type: StoreBuyer["type"] }> =
          await res.json()
        setBuyers(data)
      }
    } catch (e) {
      console.error("Error fetching buyers", e)
    } finally {
      setBuyersLoading(false)
    }
  }

  const openAddDialog = async (kind: SaleKind) => {
    setSaleKind(kind)
    setIsAddOpen(true)
    await ensureInventoryLoaded()
    if (kind === "wholesale") {
      await ensureBuyersLoaded()
    }
  }

  const addLineItem = () => {
    if (inventoryItems.length === 0) return
    const first = inventoryItems[0]
    setLineItems((prev) => [
      ...prev,
      {
        key: `${Date.now()}-${prev.length}`,
        productId: first.id,
        productName: first.name,
        quantity: saleKind === "online" ? 1 : 1,
        pricePerUnit: 0,
        size: first.sizes && first.sizes.length > 0 ? first.sizes[0] : undefined,
      },
    ])
  }

  const updateLineItem = (
    key: string,
    updates: Partial<SaleLineItem> & { productId?: string }
  ) => {
    setLineItems((prev) =>
      prev.map((item) => {
        if (item.key !== key) return item
        const next: SaleLineItem & { key: string } = {
          ...item,
          ...updates,
        }
        if (updates.productId) {
          const product = inventoryItems.find((p) => p.id === updates.productId)
          if (product) {
            next.productName = product.name
            next.productId = product.id
          }
        }
        return next
      })
    )
  }

  const removeLineItem = (key: string) => {
    setLineItems((prev) => prev.filter((item) => item.key !== key))
  }

  const totalForLine = (item: SaleLineItem) =>
    (item.quantity || 0) * (item.pricePerUnit || 0)

  const saleTotal = useMemo(
    () =>
      lineItems.reduce(
        (sum, item) => sum + totalForLine(item),
        0
      ),
    [lineItems]
  )

  const handleCreateSale = async () => {
    const validItems = lineItems.filter(
      (i) => i.productId && (saleKind === "online" ? i.pricePerUnit >= 0 : i.quantity > 0 && i.pricePerUnit >= 0)
    )
    if (validItems.length === 0) return

    try {
      setSubmitting(true)
      const response = await fetch("/api/sales", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          saleType: saleKind,
          platform,
          paymentMethod: saleKind === "wholesale" ? paymentMethod : undefined,
          wholesaleType: saleKind === "wholesale" ? wholesaleType : undefined,
          buyerStoreId: saleKind === "wholesale" ? (selectedBuyerId || null) : null,
          buyerStoreName:
            saleKind === "wholesale"
              ? buyers.find((b) => b.id === selectedBuyerId)?.name ?? null
              : null,
          dateSold: dateSold ? dateSold.toISOString() : undefined,
          notes: saleKind === "wholesale" ? notes.trim() : "",
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          lineItems: validItems.map(({ key, ...rest }) => ({
            ...rest,
            quantity: saleKind === "online" ? 1 : rest.quantity,
          })),
        }),
      })

      if (response.ok) {
        setPlatform("Depop")
        setPaymentMethod("Zelle")
        setDateSold(new Date())
        setNotes("")
        setWholesaleType("Physical")
        setSelectedBuyerId("")
        setLineItems([])
        setIsAddOpen(false)
        await fetchSales()
      } else {
        const data = await response.json()
        console.error("Failed to create sale:", data)
      }
    } catch (error) {
      console.error("Error creating sale:", error)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Sales</h1>
          <div className="flex gap-2">
            <Button onClick={() => openAddDialog("online")}>
              <Plus className="mr-2 h-4 w-4" />
              Add Online Sale
            </Button>
            <Button variant="outline" onClick={() => openAddDialog("wholesale")}>
              <Plus className="mr-2 h-4 w-4" />
              Add Wholesale Sale
            </Button>
          </div>
        </div>

        {loading ? (
          <Card>
            <CardContent className="p-6">
              <p className="text-muted-foreground">Loading sales...</p>
            </CardContent>
          </Card>
        ) : sales.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>All Sales</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                No sales recorded yet. Add your first sale!
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Recent Sales</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date Sold</TableHead>
                      <TableHead>Platform</TableHead>
                      <TableHead>Payment</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sales.map((sale) => (
                      <TableRow key={sale.id}>
                        <TableCell>
                          {sale.dateSold
                            ? new Date(sale.dateSold).toLocaleDateString()
                            : "N/A"}
                        </TableCell>
                        <TableCell>{sale.platform}</TableCell>
                        <TableCell>{sale.paymentMethod}</TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1 text-xs">
                            {sale.lineItems.map((item, idx) => (
                              <div key={idx}>
                                {item.productName} &times; {item.quantity} @ $
                                {item.pricePerUnit.toFixed(2)}
                              </div>
                            ))}
                            {sale.notes && (
                              <div className="text-muted-foreground italic mt-1">
                                {sale.notes}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          ${sale.totalAmount?.toFixed(2) ?? "0.00"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Add Sale Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-[720px] max-h-[90vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>
              {saleKind === "online" ? "Add Online Sale" : "Add Wholesale Sale"}
            </DialogTitle>
            <DialogDescription>
              {saleKind === "online"
                ? "Record an online marketplace sale with individual item prices."
                : "Record a wholesale / bulk sale with quantities per size and buyer."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4 overflow-y-auto flex-1 min-h-0">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>{saleKind === "online" ? "Platform" : "Type"}</Label>
                <Select
                  value={
                    saleKind === "online"
                      ? platform
                      : (wholesaleType as unknown as string)
                  }
                  onValueChange={(value) => {
                    if (saleKind === "online") {
                      setPlatform(value as Platform)
                    } else {
                      setWholesaleType(value as WholesaleType)
                      // Map wholesale type to a platform label for storage
                      if (value === "Physical") {
                        setPlatform("Store")
                      } else if (value === "Store") {
                        setPlatform("Store")
                      } else {
                        setPlatform("International")
                      }
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        saleKind === "online"
                          ? "Select platform"
                          : "Select type"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {saleKind === "online" ? (
                      <>
                        <SelectItem value="Depop">Depop</SelectItem>
                        <SelectItem value="Ebay">Ebay</SelectItem>
                        <SelectItem value="Poshmark">Poshmark</SelectItem>
                        <SelectItem value="Vinted">Vinted</SelectItem>
                        <SelectItem value="Mercari">Mercari</SelectItem>
                        <SelectItem value="Curtsy">Curtsy</SelectItem>
                      </>
                    ) : (
                      <>
                        <SelectItem value="Physical">Physical</SelectItem>
                        <SelectItem value="Store">Store</SelectItem>
                        <SelectItem value="International">International</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>
              {saleKind === "wholesale" && (
                <div className="space-y-2">
                  <Label>Payment Method</Label>
                  <Select
                    value={paymentMethod}
                    onValueChange={(value) =>
                      setPaymentMethod(value as PaymentMethod)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select payment method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Zelle">Zelle</SelectItem>
                      <SelectItem value="Venmo">Venmo</SelectItem>
                      <SelectItem value="Cashapp">Cashapp</SelectItem>
                      <SelectItem value="Apple Cash">Apple Cash</SelectItem>
                      <SelectItem value="Crypto">Crypto</SelectItem>
                      <SelectItem value="Cash">Cash</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-2">
                <Label>Date Sold</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !dateSold && "text-muted-foreground"
                      )}
                    >
                      {dateSold ? format(dateSold, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dateSold ?? undefined}
                      onSelect={(d) => setDateSold(d ?? null)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {saleKind === "wholesale" && (
              <div className="space-y-2">
                <Label>Sold to</Label>
                {buyersLoading ? (
                  <p className="text-xs text-muted-foreground">
                    Loading buyers...
                  </p>
                ) : buyers.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    No stores/resellers yet. Add them on the Stores tab.
                  </p>
                ) : (
                  <Select
                    value={selectedBuyerId}
                    onValueChange={(value) => setSelectedBuyerId(value)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select buyer (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {buyers.map((b) => (
                        <SelectItem key={b.id} value={b.id}>
                          {b.name} ({b.type})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label>Products sold</Label>
              {inventoryLoading ? (
                <p className="text-xs text-muted-foreground">
                  Loading inventory products...
                </p>
              ) : inventoryItems.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  No inventory products available. Add items to inventory first.
                </p>
              ) : (
                <div className="space-y-2 border rounded-md">
                  <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/40">
                    <span className="text-xs font-medium">Line items</span>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      type="button"
                      onClick={addLineItem}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Add Product
                    </Button>
                  </div>
                  {lineItems.length === 0 ? (
                    <p className="px-3 py-2 text-xs text-muted-foreground">
                      No products added yet.
                    </p>
                  ) : (
                    <div className="max-h-64 overflow-y-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Product</TableHead>
                            <TableHead className="w-28">Size</TableHead>
                            {saleKind === "wholesale" && (
                              <TableHead className="w-20">Qty</TableHead>
                            )}
                            <TableHead className="w-28">Price</TableHead>
                            <TableHead className="w-28 text-right">
                              Total
                            </TableHead>
                            <TableHead className="w-10"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {lineItems.map((item) => (
                            <TableRow key={item.key}>
                              <TableCell>
                                <Select
                                  value={item.productId}
                                  onValueChange={(value) =>
                                    updateLineItem(item.key, { productId: value })
                                  }
                                >
                                  <SelectTrigger className="w-52">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {inventoryItems.map((p) => (
                                      <SelectItem key={p.id} value={p.id}>
                                        {p.name}
                                        {p.brand ? ` (${p.brand})` : ""}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </TableCell>
                              <TableCell>
                                <Select
                                  value={item.size ?? ""}
                                  onValueChange={(value) =>
                                    updateLineItem(item.key, { size: value })
                                  }
                                >
                                  <SelectTrigger className="w-28">
                                    <SelectValue placeholder="Size" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {(inventoryItems.find(
                                      (p) => p.id === item.productId
                                    )?.sizes ?? []
                                    ).map((s) => (
                                      <SelectItem key={s} value={s}>
                                        {s}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </TableCell>
                              {saleKind === "wholesale" && (
                                <TableCell>
                                  <Input
                                    type="number"
                                    min={0}
                                    value={item.quantity}
                                    onChange={(e) =>
                                      updateLineItem(item.key, {
                                        quantity: Number(e.target.value) || 0,
                                      })
                                    }
                                    className="h-8"
                                  />
                                </TableCell>
                              )}
                              <TableCell>
                                <Input
                                  type="number"
                                  min={0}
                                  step="0.01"
                                  value={item.pricePerUnit}
                                  onChange={(e) =>
                                    updateLineItem(item.key, {
                                      pricePerUnit: Number(e.target.value) || 0,
                                    })
                                  }
                                  className="h-8"
                                />
                              </TableCell>
                              <TableCell className="text-right text-sm">
                                ${totalForLine(item).toFixed(2)}
                              </TableCell>
                              <TableCell className="text-right">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-red-500 hover:text-red-600"
                                  onClick={() => removeLineItem(item.key)}
                                >
                                  ×
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                  <div className="flex items-center justify-between px-3 py-2 border-t bg-muted/40 text-sm">
                    <span className="font-medium">Total</span>
                    <span className="font-semibold">${saleTotal.toFixed(2)}</span>
                  </div>
                </div>
              )}
            </div>

            {saleKind === "wholesale" && (
              <div className="space-y-2">
                <Label>Notes</Label>
                <textarea
                  className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                  placeholder="Optional notes about this sale (buyer info, discounts, etc.)"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            )}
          </div>

          <DialogFooter className="flex-shrink-0 border-t pt-3 mt-2">
            <Button
              variant="outline"
              onClick={() => setIsAddOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateSale}
              disabled={
                submitting ||
                inventoryItems.length === 0 ||
                lineItems.length === 0
              }
            >
              {submitting ? "Saving..." : "Save Sale"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  )
}

