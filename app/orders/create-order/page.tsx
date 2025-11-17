"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Search, X, CalendarIcon } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"

interface Product {
  id: string
  name: string
  image: string
  sizes?: string[]
}

interface SelectedProduct {
  productId: string
  productName: string
  price: number
  sizeQuantities: {
    XXS: number
    XS: number
    S: number
    M: number
    L: number
    XL: number
    XXL: number
  }
}

const AVAILABLE_SIZES = ["XXS", "XS", "S", "M", "L", "XL", "XXL"]
const PAYMENT_METHODS = ["PayPal", "Zelle", "Wire Transfer", "Cashapp", "Venmo", "Cash"]

export default function CreateOrderPage() {
  const router = useRouter()
  const [products, setProducts] = useState<Product[]>([])
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedProducts, setSelectedProducts] = useState<SelectedProduct[]>([])
  const [date, setDate] = useState<Date>(new Date())
  const [paymentMethod, setPaymentMethod] = useState<string>("")
  const [supplier, setSupplier] = useState<string>("")
  const [notes, setNotes] = useState<string>("")
  const [totalOrderAmount, setTotalOrderAmount] = useState<number | null>(null)
  const [feesAndShipping, setFeesAndShipping] = useState<number>(0)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchProducts()
  }, [])

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
      const response = await fetch("/api/products")
      if (response.ok) {
        const data = await response.json()
        setProducts(data)
        setFilteredProducts(data)
      }
    } catch (error) {
      console.error("Error fetching products:", error)
    }
  }

  const addProductToOrder = (product: Product) => {
    // Initialize with all sizes set to 0
    const initialSizeQuantities = {
      XXS: 0,
      XS: 0,
      S: 0,
      M: 0,
      L: 0,
      XL: 0,
      XXL: 0,
    }

    const newProduct: SelectedProduct = {
      productId: product.id,
      productName: product.name,
      price: 0,
      sizeQuantities: initialSizeQuantities,
    }
    setSelectedProducts([...selectedProducts, newProduct])
  }

  const removeProductFromOrder = (index: number) => {
    setSelectedProducts(selectedProducts.filter((_, i) => i !== index))
  }

  const updateSizeQuantity = (index: number, size: string, quantity: number) => {
    if (quantity < 0) return
    const updated = [...selectedProducts]
    updated[index].sizeQuantities = {
      ...updated[index].sizeQuantities,
      [size]: quantity,
    }
    setSelectedProducts(updated)
  }

  const updateProductPrice = (index: number, price: number) => {
    if (price < 0) return
    const updated = [...selectedProducts]
    updated[index].price = price
    setSelectedProducts(updated)
  }

  useEffect(() => {
    const calculateFeesAndShipping = () => {
      if (totalOrderAmount === null || totalOrderAmount === 0) {
        setFeesAndShipping(0)
        return
      }

      // Calculate total product cost (price * quantity for each size)
      let totalProductCost = 0
      selectedProducts.forEach((product) => {
        AVAILABLE_SIZES.forEach((size) => {
          const quantity = product.sizeQuantities[size as keyof typeof product.sizeQuantities]
          if (quantity > 0) {
            totalProductCost += product.price * quantity
          }
        })
      })

      // Fees and shipping = Total Order Amount - Total Product Cost
      const calculatedFees = totalOrderAmount - totalProductCost
      setFeesAndShipping(calculatedFees >= 0 ? calculatedFees : 0)
    }

    calculateFeesAndShipping()
  }, [totalOrderAmount, selectedProducts])

  const handleSubmit = async () => {
    if (selectedProducts.length === 0) {
      setError("Please select at least one product")
      return
    }

    // Build products array with only sizes that have quantity > 0
    const orderProducts: Array<{
      productId: string
      productName: string
      size: string
      quantity: number
    }> = []

    selectedProducts.forEach((product) => {
      AVAILABLE_SIZES.forEach((size) => {
        const quantity = product.sizeQuantities[size as keyof typeof product.sizeQuantities]
        if (quantity > 0) {
          orderProducts.push({
            productId: product.productId,
            productName: product.productName,
            size,
            quantity,
          })
        }
      })
    })

    if (orderProducts.length === 0) {
      setError("Please add at least one item with quantity > 0")
      return
    }

    if (!paymentMethod) {
      setError("Please select a payment method")
      return
    }

    try {
      setSubmitting(true)
      setError(null)

      // Calculate total item count
      const totalItemCount = orderProducts.reduce((sum, product) => sum + product.quantity, 0)

      // Build products with prices
      const productsWithPrices: Array<{
        productId: string
        productName: string
        size: string
        quantity: number
        price: number
      }> = []

      selectedProducts.forEach((product) => {
        AVAILABLE_SIZES.forEach((size) => {
          const quantity = product.sizeQuantities[size as keyof typeof product.sizeQuantities]
          if (quantity > 0) {
            productsWithPrices.push({
              productId: product.productId,
              productName: product.productName,
              size,
              quantity,
              price: product.price,
            })
          }
        })
      })

      const response = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          products: productsWithPrices,
          date: date.toISOString(),
          paymentMethod,
          totalItemCount,
          supplier: supplier || undefined,
          notes: notes || undefined,
          totalOrderAmount: totalOrderAmount || undefined,
          feesAndShipping: feesAndShipping > 0 ? feesAndShipping : undefined,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        router.push("/orders")
      } else {
        setError(data.error || "Failed to create order")
      }
    } catch (error) {
      console.error("Error creating order:", error)
      setError("An error occurred while creating the order")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Create New Order</h1>
          <Button variant="outline" onClick={() => router.push("/orders")}>
            Cancel
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Product Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Select Products</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
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

              {/* Products Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[500px] overflow-y-auto">
                {filteredProducts
                  .filter((product) => !selectedProducts.some((selected) => selected.productId === product.id))
                  .map((product) => (
                    <div
                      key={product.id}
                      className="border rounded-lg p-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                      onClick={() => addProductToOrder(product)}
                    >
                      <div className="relative w-full aspect-square bg-gray-100 dark:bg-gray-800 rounded mb-2">
                        <img
                          src={product.image}
                          alt={product.name}
                          className="w-full h-full object-cover rounded"
                        />
                      </div>
                      <p className="text-xs font-medium text-center break-words" style={{ fontSize: 'clamp(0.7rem, 1.5vw, 0.875rem)' }}>
                        {product.name}
                      </p>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>

          {/* Right Column - Order Details */}
          <Card>
            <CardHeader>
              <CardTitle>Order Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {error && (
                <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 rounded-md">
                  {error}
                </div>
              )}

              {/* Date Picker */}
              <div className="space-y-2">
                <Label>Order Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !date && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {date ? format(date, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      selected={date}
                      onSelect={(selectedDate) => selectedDate && setDate(selectedDate)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Supplier */}
              <div className="space-y-2">
                <Label>Supplier</Label>
                <Input
                  placeholder="Enter supplier name"
                  value={supplier}
                  onChange={(e) => setSupplier(e.target.value)}
                />
              </div>

              {/* Payment Method */}
              <div className="space-y-2">
                <Label>Payment Method</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select payment method" />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map((method) => (
                      <SelectItem key={method} value={method}>
                        {method}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Total Order Amount */}
              <div className="space-y-2">
                <Label>Total Order Amount ($)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={totalOrderAmount === null ? "" : totalOrderAmount}
                  onChange={(e) => {
                    const value = e.target.value === "" ? null : parseFloat(e.target.value)
                    setTotalOrderAmount(value)
                  }}
                />
              </div>

              {/* Fees and Shipping (calculated) */}
              {feesAndShipping > 0 && (
                <div className="space-y-2">
                  <Label>Fees and Shipping ($)</Label>
                  <Input
                    type="number"
                    value={feesAndShipping.toFixed(2)}
                    disabled
                    className="bg-gray-100 dark:bg-gray-800"
                  />
                </div>
              )}

              {/* Notes */}
              <div className="space-y-2">
                <Label>Notes</Label>
                <textarea
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="Enter any notes about this order..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                />
              </div>

              {/* Selected Products */}
              <div className="space-y-2">
                <Label>Selected Products</Label>
                {selectedProducts.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No products selected</p>
                ) : (
                  <div className="space-y-3 max-h-[400px] overflow-y-auto">
                    {selectedProducts.map((product, index) => (
                      <div
                        key={index}
                        className="border rounded-lg p-3 space-y-3"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="font-medium text-sm">{product.productName}</p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => removeProductFromOrder(index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>

                        {/* Product Price */}
                        <div className="space-y-1">
                          <Label className="text-xs">Price per Item ($)</Label>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={product.price || ""}
                            onChange={(e) =>
                              updateProductPrice(index, parseFloat(e.target.value) || 0)
                            }
                            className="h-8"
                            placeholder="0.00"
                          />
                        </div>

                        {/* Size Quantity Inputs */}
                        <div className="space-y-2">
                          <Label className="text-xs">Quantities by Size</Label>
                          <div className="grid grid-cols-7 gap-2">
                            {AVAILABLE_SIZES.map((size) => (
                              <div key={size} className="space-y-1">
                                <Label className="text-xs text-muted-foreground">{size}</Label>
                                <Input
                                  type="number"
                                  min="0"
                                  value={product.sizeQuantities[size as keyof typeof product.sizeQuantities]}
                                  onChange={(e) =>
                                    updateSizeQuantity(
                                      index,
                                      size,
                                      parseInt(e.target.value) || 0
                                    )
                                  }
                                  className="h-8"
                                  placeholder="0"
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <Button
                onClick={handleSubmit}
                disabled={selectedProducts.length === 0 || !paymentMethod || submitting}
                className="w-full"
              >
                {submitting ? "Creating Order..." : "Create Order"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}
