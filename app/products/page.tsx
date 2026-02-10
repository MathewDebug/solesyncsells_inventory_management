"use client"

import { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Plus, Upload, X, Edit, Search, Trash2 } from "lucide-react"
import { Label } from "@/components/ui/label"

interface Product {
  id: string
  name: string
  image: string
  brand?: string
  sizes?: string[]
  createdAt: string
}

const AVAILABLE_SIZES = ["XXS", "XS", "S", "M", "L", "XL", "XXL"]

export default function ProductsPage() {
  const [isOpen, setIsOpen] = useState(false)
  const [isStatsOpen, setIsStatsOpen] = useState(false)
  const [selectedProductForStats, setSelectedProductForStats] = useState<Product | null>(null)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [itemName, setItemName] = useState("")
  const [itemBrand, setItemBrand] = useState("")
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [selectedSizes, setSelectedSizes] = useState<string[]>([])
  const [customSizes, setCustomSizes] = useState<string[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const img = new Image()
        img.onload = () => {
          const canvas = document.createElement('canvas')
          const ctx = canvas.getContext('2d')
          
          if (!ctx) {
            reject(new Error('Could not get canvas context'))
            return
          }

          // Set max dimensions (800x800 is a good balance)
          const MAX_WIDTH = 800
          const MAX_HEIGHT = 800
          
          let width = img.width
          let height = img.height

          // Calculate new dimensions maintaining aspect ratio
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

          // Draw and compress
          ctx.drawImage(img, 0, 0, width, height)
          
          // Convert to base64 with quality compression (0.7 = 70% quality)
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7)
          resolve(compressedBase64)
        }
        img.onerror = reject
        img.src = e.target?.result as string
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      try {
        // Compress the image
        const compressedBase64 = await compressImage(file)
        setImagePreview(compressedBase64)
        
        // Create a File object from the compressed base64 for form submission
        // We'll use the base64 directly in handleSubmit, so we can store it
        setSelectedImage(file) // Keep original for reference, but we'll use compressed base64
      } catch (error) {
        console.error('Error compressing image:', error)
        setError('Failed to process image. Please try again.')
      }
    }
  }

  const handleRemoveImage = () => {
    setSelectedImage(null)
    setImagePreview(null)
  }

  // Fetch products on component mount
  useEffect(() => {
    fetchProducts()
  }, [])

  // Filter products based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredProducts(products)
    } else {
      const filtered = products.filter((product) =>
        product.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
      setFilteredProducts(filtered)
    }
  }, [searchQuery, products])

  const fetchProducts = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/products")
      if (response.ok) {
        const data = await response.json()
        setProducts(data)
        setFilteredProducts(data)
      }
    } catch (error) {
      console.error("Error fetching products:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (product: Product) => {
    setEditingProduct(product)
    setItemName(product.name)
    setItemBrand(product.brand ?? "")
    setImagePreview(product.image)
    setSelectedImage(null)
    const allSizes = product.sizes || []
    // Separate standard sizes from custom sizes
    const standardSizes = allSizes.filter(size => AVAILABLE_SIZES.includes(size))
    const custom = allSizes.filter(size => !AVAILABLE_SIZES.includes(size))
    setSelectedSizes(standardSizes)
    setCustomSizes(custom)
    setIsOpen(true)
  }

  const handleCloseDialog = () => {
    setIsOpen(false)
    setEditingProduct(null)
    setItemName("")
    setItemBrand("")
    setSelectedImage(null)
    setImagePreview(null)
    setSelectedSizes([])
    setCustomSizes([])
    setError(null)
  }

  const toggleSize = (size: string) => {
    setSelectedSizes((prev) =>
      prev.includes(size) ? prev.filter((s) => s !== size) : [...prev, size]
    )
  }

  const addCustomSize = () => {
    setCustomSizes([...customSizes, ""])
  }

  const updateCustomSize = (index: number, value: string) => {
    const updated = [...customSizes]
    updated[index] = value
    setCustomSizes(updated)
  }

  const removeCustomSize = (index: number) => {
    setCustomSizes(customSizes.filter((_, i) => i !== index))
  }

  const handleSubmit = async () => {
    if (!itemName) {
      setError("Item name is required")
      return
    }

    // For new products, image is required. For editing, use existing if no new image
    if (!editingProduct && !selectedImage) {
      setError("Image is required")
      return
    }

    try {
      setSubmitting(true)
      setError(null)
      
      // Use the compressed preview if available, otherwise use existing image
      let base64Image = imagePreview || ""

      // If we have a new image preview (which is already compressed), use it
      // Otherwise, if editing and no new image selected, keep existing image
      if (!base64Image && editingProduct) {
        base64Image = editingProduct.image
      }

      const url = editingProduct 
        ? `/api/products/${editingProduct.id}`
        : "/api/products"
      
      const method = editingProduct ? "PUT" : "POST"

      // Combine standard and custom sizes, filtering out empty custom sizes
      const allSizes = [
        ...selectedSizes,
        ...customSizes.filter(size => size.trim() !== "")
      ]

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: itemName,
          image: base64Image,
          brand: itemBrand.trim() || "",
          sizes: allSizes,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        // Refresh products list
        await fetchProducts()
        handleCloseDialog()
      } else {
        setError(data.error || "Failed to save product")
      }
    } catch (error) {
      console.error("Error saving product:", error)
      setError("An error occurred while saving the product")
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!editingProduct) return

    if (!confirm(`Are you sure you want to delete "${editingProduct.name}"? This action cannot be undone.`)) {
      return
    }

    try {
      setDeleting(true)
      setError(null)

      const response = await fetch(`/api/products/${editingProduct.id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        // Refresh products list
        await fetchProducts()
        handleCloseDialog()
      } else {
        const data = await response.json()
        setError(data.error || "Failed to delete product")
      }
    } catch (error) {
      console.error("Error deleting product:", error)
      setError("An error occurred while deleting the product")
    } finally {
      setDeleting(false)
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Products</h1>
          <Button onClick={() => {
            setEditingProduct(null)
            setItemName("")
            setItemBrand("")
            setSelectedImage(null)
            setImagePreview(null)
            setSelectedSizes([])
            setCustomSizes([])
            setError(null)
            setIsOpen(true)
          }}>
            <Plus className="mr-2 h-4 w-4" />
            Add New Product
          </Button>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {loading ? (
          <Card>
            <CardContent className="p-6">
              <p className="text-muted-foreground">Loading products...</p>
            </CardContent>
          </Card>
        ) : products.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>All Products</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">No products yet. Add your first product!</p>
            </CardContent>
          </Card>
        ) : filteredProducts.length === 0 ? (
          <Card>
            <CardContent className="p-6">
              <p className="text-muted-foreground">
                {searchQuery ? "No products found matching your search." : "No products yet. Add your first product!"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div>
            <h2 className="text-2xl font-semibold mb-4">All Products</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {filteredProducts.map((product) => (
                <Card key={product.id} className="overflow-hidden">
                  <div 
                    className="relative w-full aspect-square bg-card dark:bg-card cursor-pointer"
                    onClick={() => {
                      setSelectedProductForStats(product)
                      setIsStatsOpen(true)
                    }}
                  >
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-lg break-words leading-tight" style={{ fontSize: 'clamp(0.75rem, 2vw, 1.125rem)' }}>{product.name}</h3>
                        {product.brand && (
                          <p className="text-xs text-muted-foreground mt-0.5">{product.brand}</p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 flex-shrink-0"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleEdit(product)
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                    {product.sizes && product.sizes.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {product.sizes.map((size) => (
                          <span
                            key={size}
                            className="px-2 py-0.5 text-xs font-medium bg-card dark:bg-card text-foreground dark:text-foreground rounded"
                          >
                            {size}
                          </span>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>

      <Dialog open={isOpen} onOpenChange={handleCloseDialog}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>{editingProduct ? "Edit Product" : "Add New Product"}</DialogTitle>
            <DialogDescription>
              {editingProduct 
                ? "Update the product details below."
                : "Enter the product details below to add a new item to your inventory."}
            </DialogDescription>
          </DialogHeader>
          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 rounded-md flex-shrink-0">
              {error}
            </div>
          )}
          <div className="space-y-4 py-4 overflow-y-auto flex-1 min-h-0">
            <div className="space-y-2">
              <Label htmlFor="item">Item</Label>
              <Input
                id="item"
                placeholder="Enter item name"
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="brand">Brand</Label>
              <Input
                id="brand"
                placeholder="e.g. Essentials"
                value={itemBrand}
                onChange={(e) => setItemBrand(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Sizes</Label>
              <div className="space-y-3">
                {/* Standard Sizes */}
                <div>
                  <Label className="text-xs text-muted-foreground mb-2 block">Standard Sizes</Label>
                  <div className="flex flex-wrap gap-2 p-3 border rounded-md min-h-[3rem]">
                    {AVAILABLE_SIZES.map((size) => (
                      <button
                        key={size}
                        type="button"
                        onClick={() => toggleSize(size)}
                        className={`
                          px-3 py-1 rounded-md text-sm font-medium transition-colors
                          ${
                            selectedSizes.includes(size)
                              ? "bg-primary dark:bg-foreground text-primary-foreground dark:text-background"
                              : "bg-card dark:bg-card text-foreground dark:text-foreground hover:bg-accent dark:hover:bg-accent"
                          }
                        `}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* Custom Sizes */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-xs text-muted-foreground">Custom Sizes</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addCustomSize}
                      className="h-7 text-xs"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Add Custom Size
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {customSizes.map((customSize, index) => (
                      <div key={index} className="flex gap-2 items-center">
                        <Input
                          placeholder="Enter custom size (e.g., 28, 30, One Size)"
                          value={customSize}
                          onChange={(e) => updateCustomSize(index, e.target.value)}
                          className="flex-1"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeCustomSize(index)}
                          className="h-8 w-8"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    {customSizes.length === 0 && (
                      <p className="text-xs text-muted-foreground italic">
                        No custom sizes added. Click &quot;Add Custom Size&quot; to add one.
                      </p>
                    )}
                  </div>
                </div>
              </div>
              {(selectedSizes.length > 0 || customSizes.some(s => s.trim() !== "")) && (
                <p className="text-xs text-muted-foreground">
                  Selected: {[...selectedSizes, ...customSizes.filter(s => s.trim() !== "")].join(", ")}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="image">Image</Label>
              {imagePreview ? (
                <div className="relative">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-full aspect-square object-cover rounded-md border"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2"
                    onClick={handleRemoveImage}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center justify-center w-full">
                  <label
                    htmlFor="image-upload"
                    className="flex flex-col items-center justify-center w-full aspect-square border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-accent dark:hover:bg-accent"
                  >
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <Upload className="w-10 h-10 mb-3 text-gray-400" />
                      <p className="mb-2 text-sm text-gray-500 dark:text-muted-foreground">
                        <span className="font-semibold">Click to upload</span> or drag and drop
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        PNG, JPG, GIF up to 10MB
                      </p>
                    </div>
                    <input
                      id="image-upload"
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={handleImageChange}
                    />
                  </label>
                </div>
              )}
            </div>
          </div>
          <DialogFooter className="flex items-center justify-between flex-shrink-0 border-t pt-4 mt-4">
            <div>
              {editingProduct && (
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="mr-auto"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  {deleting ? "Deleting..." : "Delete"}
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleCloseDialog}>
                Cancel
              </Button>
              <Button 
                onClick={handleSubmit} 
                disabled={!itemName || (!imagePreview && !selectedImage) || submitting}
              >
                {submitting 
                  ? (editingProduct ? "Updating..." : "Adding...") 
                  : (editingProduct ? "Update Product" : "Add Product")}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Product Statistics Dialog */}
      <Dialog open={isStatsOpen} onOpenChange={setIsStatsOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Product Statistics</DialogTitle>
            <DialogDescription>
              View statistics for {selectedProductForStats?.name}
            </DialogDescription>
          </DialogHeader>
          {selectedProductForStats && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Product Name</Label>
                <p className="text-sm font-medium">{selectedProductForStats.name}</p>
              </div>
              {selectedProductForStats.brand && (
                <div className="space-y-2">
                  <Label>Brand</Label>
                  <p className="text-sm text-muted-foreground">{selectedProductForStats.brand}</p>
                </div>
              )}
              {selectedProductForStats.sizes && selectedProductForStats.sizes.length > 0 && (
                <div className="space-y-2">
                  <Label>Available Sizes</Label>
                  <div className="flex flex-wrap gap-2">
                    {selectedProductForStats.sizes.map((size) => (
                      <span
                        key={size}
                        className="px-3 py-1 text-sm font-medium bg-card dark:bg-card text-foreground dark:text-foreground rounded"
                      >
                        {size}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <div className="space-y-2">
                <Label>Product Image</Label>
                <div className="relative w-full aspect-square bg-card dark:bg-card rounded-md overflow-hidden">
                  <img
                    src={selectedProductForStats.image}
                    alt={selectedProductForStats.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Created</Label>
                <p className="text-sm text-muted-foreground">
                  {selectedProductForStats.createdAt 
                    ? new Date(selectedProductForStats.createdAt).toLocaleDateString()
                    : "N/A"}
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsStatsOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  )
}

