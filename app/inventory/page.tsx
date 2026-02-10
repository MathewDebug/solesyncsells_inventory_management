"use client"

import { useState, useEffect, useMemo } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Plus, Search, Pencil, Check, Trash2 } from "lucide-react"

interface ProductInfo {
  id: string
  name: string
  image: string
  imageBack?: string | null
  brand?: string
  category?: string
  type?: string
  colorway?: string
  productCode?: string
  sizes?: string[]
}

interface InventoryItem {
  productId: string
  product: ProductInfo
  sizeQuantities: Record<string, number>
  createdAt?: string
  updatedAt?: string
}

const AVAILABLE_SIZES = ["XXS", "XS", "S", "M", "L", "XL", "XXL"]
const DEFAULT_CATEGORIES = ["Hoodies", "Sweatpants (Cuffed)", "Sweatpants (Relaxed)", "Shorts"]

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [allProducts, setAllProducts] = useState<ProductInfo[]>([])
  const [allProductsLoading, setAllProductsLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [addingId, setAddingId] = useState<string | null>(null)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [isEditMode, setIsEditMode] = useState(false)
  const [editQuantities, setEditQuantities] = useState<Record<string, Record<string, number>>>({})
  const [confirming, setConfirming] = useState(false)

  const itemsByCategory = useMemo(() => {
    const map = new Map<string, InventoryItem[]>()
    items.forEach((item) => {
      const cat =
        (item.product.category && item.product.category.trim()) || "Uncategorized"
      if (!map.has(cat)) map.set(cat, [])
      map.get(cat)!.push(item)
    })
    const order = [...new Set([...DEFAULT_CATEGORIES, ...map.keys()].filter(Boolean))]
    const sorted = new Map<string, InventoryItem[]>()
    order.forEach((cat) => {
      if (map.has(cat)) sorted.set(cat, map.get(cat)!)
    })
    map.forEach((list, cat) => {
      if (!sorted.has(cat)) sorted.set(cat, list)
    })
    return sorted
  }, [items])

  const getSizesForItem = (item: InventoryItem): string[] => {
    const fromSizes =
      item.product.sizes && item.product.sizes.length > 0
        ? item.product.sizes
        : AVAILABLE_SIZES
    const fromQty = Object.keys(item.sizeQuantities || {})
    const set = new Set<string>([...fromSizes, ...fromQty])
    const standard = AVAILABLE_SIZES.filter((s) => set.has(s))
    const custom = [...set].filter((s) => !AVAILABLE_SIZES.includes(s)).sort()
    return [...standard, ...custom]
  }

  const inventoryProductIds = useMemo(() => new Set(items.map((i) => i.productId)), [items])

  const addableProducts = useMemo(() => {
    const list = allProducts.filter((p) => !inventoryProductIds.has(p.id))
    if (!searchQuery.trim()) return list
    const q = searchQuery.toLowerCase()
    return list.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.type && p.type.toLowerCase().includes(q)) ||
        (p.colorway && p.colorway.toLowerCase().includes(q)) ||
        (p.category && p.category.toLowerCase().includes(q))
    )
  }, [allProducts, inventoryProductIds, searchQuery])

  const getQuantity = (item: InventoryItem, size: string): number => {
    if (isEditMode && editQuantities[item.productId]) {
      return editQuantities[item.productId][size] ?? item.sizeQuantities?.[size] ?? 0
    }
    return item.sizeQuantities?.[size] ?? 0
  }

  const getTotal = (item: InventoryItem): number => {
    const qty = isEditMode && editQuantities[item.productId]
      ? editQuantities[item.productId]
      : item.sizeQuantities || {}
    return Object.values(qty).reduce((a, b) => a + b, 0)
  }

  const setEditQty = (productId: string, size: string, value: number) => {
    setEditQuantities((prev) => ({
      ...prev,
      [productId]: {
        ...(prev[productId] ?? {}),
        [size]: value,
      },
    }))
  }

  useEffect(() => {
    fetchInventory()
  }, [])

  useEffect(() => {
    if (isAddOpen) {
      setSearchQuery("")
      fetchAllProducts()
    }
  }, [isAddOpen])

  useEffect(() => {
    if (!isEditMode) setEditQuantities({})
  }, [isEditMode])

  const fetchInventory = async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/inventory")
      if (res.ok) {
        const data = await res.json()
        setItems(data)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const fetchAllProducts = async () => {
    try {
      setAllProductsLoading(true)
      const res = await fetch("/api/products")
      if (res.ok) {
        const data = await res.json()
        setAllProducts(data)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setAllProductsLoading(false)
    }
  }

  const addToInventory = async (product: ProductInfo) => {
    try {
      setAddingId(product.id)
      const res = await fetch("/api/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: product.id }),
      })
      if (res.ok) await fetchInventory()
    } catch (e) {
      console.error(e)
    } finally {
      setAddingId(null)
    }
  }

  const removeFromInventory = async (productId: string) => {
    if (!confirm("Remove this product from inventory? Its quantities will no longer be tracked here.")) return
    try {
      setRemovingId(productId)
      const res = await fetch(`/api/inventory/${productId}`, { method: "DELETE" })
      if (res.ok) await fetchInventory()
    } catch (e) {
      console.error(e)
    } finally {
      setRemovingId(null)
    }
  }

  const confirmEdit = async () => {
    const toUpdate = Object.entries(editQuantities).filter(([, qty]) =>
      Object.keys(qty).length > 0
    )
    if (toUpdate.length === 0) {
      setIsEditMode(false)
      setEditQuantities({})
      return
    }
    try {
      setConfirming(true)
      const updates = toUpdate.map(([productId, editedQty]) => {
        const item = items.find((i) => i.productId === productId)
        const sizeQuantities = item
          ? { ...item.sizeQuantities, ...editedQty }
          : editedQty
        return { productId, sizeQuantities }
      })
      await fetch("/api/inventory", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates }),
      })
      await fetchInventory()
      setIsEditMode(false)
      setEditQuantities({})
    } catch (e) {
      console.error(e)
    } finally {
      setConfirming(false)
    }
  }

  return (
    <DashboardLayout>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle>Inventory</CardTitle>
          <div className="flex gap-2">
            <Button
              variant={isEditMode ? "default" : "outline"}
              onClick={() => (isEditMode ? confirmEdit() : setIsEditMode(true))}
              disabled={items.length === 0 || confirming}
            >
              {isEditMode ? (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  {confirming ? "Saving..." : "Confirm"}
                </>
              ) : (
                <>
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit inventory
                </>
              )}
            </Button>
            <Button onClick={() => setIsAddOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Product
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground py-8 text-center">
              Loading inventory...
            </p>
          ) : items.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground border border-dashed rounded-lg">
              <p className="mb-4">No products in inventory yet.</p>
              <p className="text-sm mb-4">
                Add products from your catalog using the button above.
              </p>
              <Button onClick={() => setIsAddOpen(true)} variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Add Product
              </Button>
            </div>
          ) : (
            <div className="space-y-10">
              {Array.from(itemsByCategory.entries()).map(([cat, list]) => (
                <div key={cat}>
                  <h2 className="text-lg font-semibold border-b pb-2 mb-4 text-foreground">
                    {cat}
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {list.map((item) => {
                      const sizes = getSizesForItem(item)
                      const total = getTotal(item)
                      return (
                        <div
                          key={item.productId}
                          className="rounded-lg border bg-card overflow-hidden flex flex-row gap-2 p-2 relative"
                        >
                          {isEditMode && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="absolute top-1 right-1 h-6 w-6 text-muted-foreground hover:text-destructive z-10"
                              onClick={() => removeFromInventory(item.productId)}
                              disabled={removingId === item.productId}
                              title="Remove from inventory"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          <div className="flex-shrink-0 w-20 h-20 rounded border bg-muted/40 overflow-hidden">
                            <img
                              src={item.product.image}
                              alt={item.product.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="flex-1 min-w-0 flex flex-col pr-5">
                            <p className="font-semibold text-xs leading-tight truncate">
                              {item.product.type || item.product.name}
                            </p>
                            {item.product.brand && (
                              <p className="text-[10px] text-muted-foreground truncate">
                                {item.product.brand}
                              </p>
                            )}
                            <p className="text-[10px] text-muted-foreground truncate">
                              {[item.product.colorway, item.product.productCode]
                                .filter(Boolean)
                                .join(" ")}
                            </p>
                            <div className="mt-1 border rounded overflow-hidden flex-1 min-h-0">
                              <Table>
                                <TableHeader>
                                  <TableRow className="bg-muted/50">
                                    <TableHead className="w-8 text-[10px] font-medium py-0.5">
                                      Size
                                    </TableHead>
                                    <TableHead className="w-8 text-[10px] font-medium text-right py-0.5">
                                      Qty
                                    </TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {sizes.map((size) => (
                                    <TableRow key={size}>
                                      <TableCell className="text-[10px] py-0.5">
                                        {size}
                                      </TableCell>
                                      <TableCell className="py-0.5 pr-1 text-right">
                                        {isEditMode ? (
                                          <Input
                                            type="number"
                                            min={0}
                                            className="h-7 w-14 min-w-[3rem] text-right text-sm font-medium bg-background text-foreground border-input"
                                            value={getQuantity(item, size)}
                                            onChange={(e) => {
                                              const v = e.target.value
                                              const n =
                                                v === "" ? 0 : parseInt(v, 10)
                                              if (
                                                !Number.isNaN(n) &&
                                                n >= 0
                                              ) {
                                                setEditQty(
                                                  item.productId,
                                                  size,
                                                  n
                                                )
                                              }
                                            }}
                                          />
                                        ) : (
                                          <span className="text-[10px]">
                                            {getQuantity(item, size)}
                                          </span>
                                        )}
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                  <TableRow className="bg-muted/30 font-medium">
                                    <TableCell className="text-[10px] py-0.5">
                                      Total
                                    </TableCell>
                                    <TableCell className="text-[10px] py-0.5 text-right pr-1">
                                      {total}
                                    </TableCell>
                                  </TableRow>
                                </TableBody>
                              </Table>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-[480px] max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Add product to inventory</DialogTitle>
            <DialogDescription>
              Search and select a product from your catalog to add it to
              inventory.
            </DialogDescription>
          </DialogHeader>
          <div className="relative mt-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search products by name, type, colorway..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto border rounded-md mt-3">
            {allProductsLoading ? (
              <p className="p-4 text-sm text-muted-foreground text-center">
                Loading products...
              </p>
            ) : addableProducts.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground text-center">
                {allProducts.length === 0
                  ? "No products in your catalog yet. Add products from the Products page first."
                  : inventoryProductIds.size >= allProducts.length
                    ? "All products are already in inventory."
                    : "No products match your search."}
              </p>
            ) : (
              <ul className="p-2 space-y-1">
                {addableProducts.map((product) => (
                  <li
                    key={product.id}
                    className="flex items-center gap-3 rounded-lg border bg-card p-2 hover:bg-muted/50"
                  >
                    <div className="w-12 h-12 rounded overflow-hidden border bg-muted flex-shrink-0">
                      <img
                        src={product.image}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {product.type || product.name}
                      </p>
                      {product.colorway && (
                        <p className="text-xs text-muted-foreground truncate">
                          {product.colorway}
                          {product.productCode
                            ? ` · ${product.productCode}`
                            : ""}
                        </p>
                      )}
                    </div>
                    <Button
                      size="sm"
                      onClick={() => addToInventory(product)}
                      disabled={addingId === product.id}
                    >
                      {addingId === product.id ? "Adding..." : "Add"}
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  )
}
