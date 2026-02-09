"use client"

import { useState, useEffect, useMemo } from "react"
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Plus, Upload, X } from "lucide-react"

interface Product {
  id: string
  name: string
  image: string
  imageBack?: string | null
  category?: string
  type?: string
  colorway?: string
  productCode?: string
  sizes?: string[]
  sizeQuantities?: Record<string, number>
  createdAt?: string
}

const AVAILABLE_SIZES = ["XXS", "XS", "S", "M", "L", "XL", "XXL"]

const DEFAULT_CATEGORIES = ["Hoodies", "Sweatpants (Cuffed)", "Sweatpants (Relaxed)", "Shorts"]

function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement("canvas")
        const ctx = canvas.getContext("2d")
        if (!ctx) {
          reject(new Error("Could not get canvas context"))
          return
        }
        const MAX_WIDTH = 800
        const MAX_HEIGHT = 800
        let width = img.width
        let height = img.height
        if (width > height) {
          if (width > MAX_WIDTH) {
            height = (height * MAX_WIDTH) / width
            width = MAX_WIDTH
          }
        } else {
          if (height > MAX_HEIGHT) {
            width = (width * MAX_HEIGHT) / height
            height = MAX_HEIGHT
          }
        }
        canvas.width = width
        canvas.height = height
        ctx.drawImage(img, 0, 0, width, height)
        resolve(canvas.toDataURL("image/jpeg", 0.7))
      }
      img.onerror = reject
      img.src = e.target?.result as string
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  // Add product form state
  const [category, setCategory] = useState("")
  const [productType, setProductType] = useState("")
  const [colorway, setColorway] = useState("")
  const [productCode, setProductCode] = useState("")
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [imageBackPreview, setImageBackPreview] = useState<string | null>(null)
  const [selectedSizes, setSelectedSizes] = useState<string[]>(AVAILABLE_SIZES)
  const [customSizes, setCustomSizes] = useState<string[]>([])
  const [initialQuantities, setInitialQuantities] = useState<Record<string, string>>({})

  const productsByCategory = useMemo(() => {
    const map = new Map<string, Product[]>()
    products.forEach((p) => {
      const cat = (p.category && p.category.trim()) || "Uncategorized"
      if (!map.has(cat)) map.set(cat, [])
      map.get(cat)!.push(p)
    })
    const order = [...new Set([...DEFAULT_CATEGORIES, ...map.keys()].filter(Boolean))]
    const sorted = new Map<string, Product[]>()
    order.forEach((cat) => {
      if (map.has(cat)) sorted.set(cat, map.get(cat)!)
    })
    map.forEach((list, cat) => {
      if (!sorted.has(cat)) sorted.set(cat, list)
    })
    return sorted
  }, [products])

  const getSizesForProduct = (product: Product): string[] => {
    const fromSizes = product.sizes && product.sizes.length > 0 ? product.sizes : AVAILABLE_SIZES
    const fromQty = Object.keys(product.sizeQuantities || {})
    const set = new Set<string>([...fromSizes, ...fromQty])
    const standard = AVAILABLE_SIZES.filter((s) => set.has(s))
    const custom = [...set].filter((s) => !AVAILABLE_SIZES.includes(s)).sort()
    return [...standard, ...custom]
  }

  useEffect(() => {
    fetchProducts()
  }, [])

  const fetchProducts = async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/products")
      if (res.ok) {
        const data = await res.json()
        setProducts(data)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const handleImageChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
    isBack: boolean
  ) => {
    const file = e.target.files?.[0]
    if (file) {
      try {
        const base64 = await compressImage(file)
        if (isBack) setImageBackPreview(base64)
        else setImagePreview(base64)
      } catch {
        setError("Failed to process image.")
      }
    }
  }

  const toggleSize = (size: string) => {
    setSelectedSizes((prev) =>
      prev.includes(size) ? prev.filter((s) => s !== size) : [...prev, size]
    )
  }

  const addCustomSize = () => setCustomSizes((prev) => [...prev, ""])
  const updateCustomSize = (index: number, value: string) => {
    setCustomSizes((prev) => {
      const next = [...prev]
      next[index] = value
      return next
    })
  }
  const removeCustomSize = (index: number) => {
    setCustomSizes((prev) => prev.filter((_, i) => i !== index))
  }

  const closeAddDialog = () => {
    setIsAddOpen(false)
    setCategory("")
    setProductType("")
    setColorway("")
    setProductCode("")
    setImagePreview(null)
    setImageBackPreview(null)
    setSelectedSizes(AVAILABLE_SIZES)
    setCustomSizes([])
    setInitialQuantities({})
    setError(null)
  }

  const handleAddProduct = async () => {
    const name = [productType.trim(), colorway.trim()].filter(Boolean).join(" - ") || "New Product"
    if (!imagePreview) {
      setError("Front image is required.")
      return
    }
    const allSizes = [
      ...selectedSizes,
      ...customSizes.filter((s) => s.trim() !== ""),
    ]
    const sizeQuantities: Record<string, number> = {}
    allSizes.forEach((size) => {
      const v = initialQuantities[size]
      const n = v ? parseInt(v, 10) : 0
      if (!Number.isNaN(n) && n >= 0) sizeQuantities[size] = n
    })
    try {
      setSubmitting(true)
      setError(null)
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          image: imagePreview,
          imageBack: imageBackPreview || null,
          category: category.trim() || "",
          type: productType.trim() || name,
          colorway: colorway.trim() || "",
          productCode: productCode.trim() || "",
          sizes: allSizes,
          sizeQuantities,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        await fetchProducts()
        closeAddDialog()
      } else {
        setError(data.error || "Failed to add product.")
      }
    } catch {
      setError("Something went wrong.")
    } finally {
      setSubmitting(false)
    }
  }

  const getQuantity = (product: Product, size: string): number =>
    product.sizeQuantities?.[size] ?? 0

  const getTotal = (product: Product): number =>
    Object.values(product.sizeQuantities || {}).reduce((a, b) => a + b, 0)

  const updateQuantity = async (productId: string, size: string, value: number) => {
    const product = products.find((p) => p.id === productId)
    if (!product) return
    const next = { ...(product.sizeQuantities || {}), [size]: value }
    try {
      setUpdatingId(productId)
      const res = await fetch(`/api/products/${productId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sizeQuantities: next }),
      })
      if (res.ok) {
        setProducts((prev) =>
          prev.map((p) => (p.id === productId ? { ...p, sizeQuantities: next } : p))
        )
      }
    } catch (e) {
      console.error(e)
    } finally {
      setUpdatingId(null)
    }
  }

  return (
    <DashboardLayout>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle>Inventory</CardTitle>
          <Button onClick={() => setIsAddOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Product
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground py-8 text-center">
              Loading inventory...
            </p>
          ) : products.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground border border-dashed rounded-lg">
              <p className="mb-4">No products in inventory yet.</p>
              <Button onClick={() => setIsAddOpen(true)} variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Add Product
              </Button>
            </div>
          ) : (
            <div className="space-y-10">
              {Array.from(productsByCategory.entries()).map(([cat, list]) => (
                <div key={cat}>
                  <h2 className="text-lg font-semibold border-b pb-2 mb-4 text-foreground">
                    {cat}
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {list.map((product) => {
                      const sizes = getSizesForProduct(product)
                      const total = getTotal(product)
                      return (
                        <div
                          key={product.id}
                          className="rounded-lg border bg-card overflow-hidden flex flex-col"
                        >
                          <div className="flex gap-1 p-2 bg-muted/40">
                            <div className="flex-1 flex flex-col">
                              <span className="text-[10px] font-medium text-muted-foreground uppercase">
                                Front
                              </span>
                              <div className="aspect-square rounded border bg-background overflow-hidden">
                                <img
                                  src={product.image}
                                  alt={`${product.name} front`}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            </div>
                            {product.imageBack ? (
                              <div className="flex-1 flex flex-col">
                                <span className="text-[10px] font-medium text-muted-foreground uppercase">
                                  Back
                                </span>
                                <div className="aspect-square rounded border bg-background overflow-hidden">
                                  <img
                                    src={product.imageBack}
                                    alt={`${product.name} back`}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                              </div>
                            ) : (
                              <div className="flex-1 flex flex-col">
                                <span className="text-[10px] font-medium text-muted-foreground uppercase">
                                  Back
                                </span>
                                <div className="aspect-square rounded border border-dashed bg-muted/30 flex items-center justify-center">
                                  <span className="text-xs text-muted-foreground">—</span>
                                </div>
                              </div>
                            )}
                          </div>
                          <div className="p-3 flex-1 flex flex-col min-w-0">
                            <p className="font-semibold text-sm">{product.type || product.name}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {[product.colorway, product.productCode].filter(Boolean).join(" ")}
                            </p>
                            <div className="mt-3 border rounded overflow-hidden">
                              <Table>
                                <TableHeader>
                                  <TableRow className="bg-muted/50">
                                    <TableHead className="w-12 text-xs font-medium">Size</TableHead>
                                    <TableHead className="w-14 text-xs font-medium text-right">
                                      Qty
                                    </TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {sizes.map((size) => (
                                    <TableRow key={size}>
                                      <TableCell className="text-xs py-1">{size}</TableCell>
                                      <TableCell className="py-1 pr-1 text-right">
                                        <Input
                                          key={`${product.id}-${size}-${getQuantity(product, size)}`}
                                          type="number"
                                          min={0}
                                          className="h-7 w-12 text-right text-xs"
                                          defaultValue={getQuantity(product, size)}
                                          onBlur={(e) => {
                                            const v = e.target.value
                                            const n = v === "" ? 0 : parseInt(v, 10)
                                            if (!Number.isNaN(n) && n >= 0) {
                                              updateQuantity(product.id, size, n)
                                            }
                                          }}
                                          disabled={updatingId === product.id}
                                        />
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                  <TableRow className="bg-muted/30 font-medium">
                                    <TableCell className="text-xs py-1">Total</TableCell>
                                    <TableCell className="text-xs py-1 text-right pr-2">
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

      <Dialog open={isAddOpen} onOpenChange={(open) => !open && closeAddDialog()}>
        <DialogContent className="sm:max-w-[560px] max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Add Product</DialogTitle>
            <DialogDescription>
              Add a new product variant. Group by category (e.g. Hoodies, Shorts), set type and
              colorway, then sizes and quantities.
            </DialogDescription>
          </DialogHeader>
          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 rounded-md">
              {error}
            </div>
          )}
          <div className="space-y-4 py-2 overflow-y-auto">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Category</Label>
                <Input
                  placeholder="e.g. Hoodies"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  list="categories"
                />
                <datalist id="categories">
                  {DEFAULT_CATEGORIES.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Input
                  placeholder="e.g. SS22 Hoodie"
                  value={productType}
                  onChange={(e) => setProductType(e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Colorway</Label>
                <Input
                  placeholder="e.g. Stretch Limo"
                  value={colorway}
                  onChange={(e) => setColorway(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Product code (optional)</Label>
                <Input
                  placeholder="e.g. 192BT212110F"
                  value={productCode}
                  onChange={(e) => setProductCode(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Images</Label>
              <div className="flex gap-4">
                <div>
                  <span className="text-xs text-muted-foreground block mb-1">Front *</span>
                  {imagePreview ? (
                    <div className="relative inline-block">
                      <img
                        src={imagePreview}
                        alt="Front"
                        className="w-24 h-24 object-cover rounded border"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute -top-1 -right-1 h-5 w-5"
                        onClick={() => setImagePreview(null)}
                      >
                        <X className="h-2.5 w-2.5" />
                      </Button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-24 h-24 border-2 border-dashed rounded cursor-pointer hover:bg-muted/50">
                      <Upload className="h-6 w-6 text-muted-foreground" />
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleImageChange(e, false)}
                      />
                    </label>
                  )}
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block mb-1">Back (optional)</span>
                  {imageBackPreview ? (
                    <div className="relative inline-block">
                      <img
                        src={imageBackPreview}
                        alt="Back"
                        className="w-24 h-24 object-cover rounded border"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute -top-1 -right-1 h-5 w-5"
                        onClick={() => setImageBackPreview(null)}
                      >
                        <X className="h-2.5 w-2.5" />
                      </Button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-24 h-24 border-2 border-dashed rounded cursor-pointer hover:bg-muted/50">
                      <Upload className="h-6 w-6 text-muted-foreground" />
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleImageChange(e, true)}
                      />
                    </label>
                  )}
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Sizes</Label>
              <div className="flex flex-wrap gap-2">
                {AVAILABLE_SIZES.map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => toggleSize(size)}
                    className={`px-2.5 py-1 rounded text-sm font-medium ${
                      selectedSizes.includes(size)
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted hover:bg-muted/80"
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
              <div className="flex gap-2 flex-wrap items-center mt-2">
                {customSizes.map((val, i) => (
                  <div key={i} className="flex items-center gap-1">
                    <Input
                      placeholder="Custom"
                      value={val}
                      onChange={(e) => updateCustomSize(i, e.target.value)}
                      className="w-20 h-7 text-sm"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => removeCustomSize(i)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={addCustomSize} className="h-7">
                  <Plus className="h-3 w-3 mr-1" />
                  Custom
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground">Initial quantities (optional)</Label>
              <div className="flex flex-wrap gap-3">
                {[...selectedSizes, ...customSizes.filter((s) => s.trim())].map((size) => (
                  <div key={size} className="flex items-center gap-1">
                    <span className="text-sm w-7">{size}</span>
                    <Input
                      type="number"
                      min={0}
                      className="w-16 h-7 text-sm"
                      placeholder="0"
                      value={initialQuantities[size] ?? ""}
                      onChange={(e) =>
                        setInitialQuantities((prev) => ({ ...prev, [size]: e.target.value }))
                      }
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeAddDialog}>
              Cancel
            </Button>
            <Button onClick={handleAddProduct} disabled={submitting}>
              {submitting ? "Adding..." : "Add Product"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  )
}
