"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
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
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Search, X, ChevronDownIcon, ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react"
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
  price: number | undefined // undefined means blank/unknown, will be saved as -1
  sizeQuantities: Record<string, number> // Dynamic sizes
  arrivedQuantities: Record<string, number> // How many of each size have arrived
  status: "SHIPPING" | "PARTIALLY ARRIVED" | "COMPLETED"
}

type OrderStatus = "SHIPPING" | "PARTIALLY ARRIVED" | "COMPLETED"

interface OrderProduct {
  productId: string
  productName: string
  size: string
  quantity: number
  price?: number
  arrivedQuantity?: number
  status?: OrderStatus
}

interface Order {
  id: string
  orderNumber: number | null
  products: OrderProduct[]
  date: string
  paymentMethod: string
  totalItemCount: number
  supplier?: string | null
  notes?: string | null
  totalOrderAmount?: number | null
  feesAndShipping?: number | null
  productCost?: number | null
  carrier?: string | null
  shipStartDate?: string | null
  trackingLinks?: TrackingLink[]
  status?: OrderStatus
  createdAt: string
}

const AVAILABLE_SIZES = ["XXS", "XS", "S", "M", "L", "XL", "XXL"]
const PAYMENT_METHODS = ["PayPal", "Zelle", "Wire Transfer", "Cashapp", "Venmo", "Cash"]
const CARRIERS = ["UPS", "USPS", "FedEx", "DHL"]

interface TrackingLink {
  url: string
  notes: string
  arrivalDate: Date | null
}

export default function EditOrderPage() {
  const router = useRouter()
  const params = useParams()
  const orderId = params.id as string

  const [products, setProducts] = useState<Product[]>([])
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedProducts, setSelectedProducts] = useState<SelectedProduct[]>([])
  const [date, setDate] = useState<Date>(new Date())
  const [paymentMethod, setPaymentMethod] = useState<string>("")
  const [supplier, setSupplier] = useState<string>("")
  const [notes, setNotes] = useState<string>("")
  const [totalOrderAmount, setTotalOrderAmount] = useState<number | null>(null)
  const [feesAndShipping, setFeesAndShipping] = useState<number | null>(0)
  const [productCost, setProductCost] = useState<number | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isOrderDetailsOpen, setIsOrderDetailsOpen] = useState(true)
  const [isShippingDetailsOpen, setIsShippingDetailsOpen] = useState(true)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [carrier, setCarrier] = useState<string>("")
  const [shipStartDate, setShipStartDate] = useState<Date | null>(null)
  const [trackingLinks, setTrackingLinks] = useState<TrackingLink[]>([{ url: "", notes: "", arrivalDate: null }])
  const [orderStatus, setOrderStatus] = useState<OrderStatus>("SHIPPING")

  useEffect(() => {
    fetchProducts()
    fetchOrder()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetchOrder depends on orderId only
  }, [orderId])

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

  const fetchOrder = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/orders/${orderId}`)
      if (response.ok) {
        const order: Order = await response.json()
        
        // Set basic order info
        setDate(new Date(order.date))
        setPaymentMethod(order.paymentMethod)
        setSupplier(order.supplier || "")
        setNotes(order.notes || "")
        setTotalOrderAmount(order.totalOrderAmount || null)
        setFeesAndShipping(order.feesAndShipping ?? 0)
        // Shipping info
        setCarrier(order.carrier || "")
        setShipStartDate(order.shipStartDate ? new Date(order.shipStartDate) : new Date(order.date))
        // Convert tracking links, ensuring arrivalDate is a Date object
        interface TrackingLinkInput {
          url?: string
          notes?: string
          arrivalDate?: string | Date | null
        }
        const processedTrackingLinks = order.trackingLinks && order.trackingLinks.length > 0 
          ? order.trackingLinks.map((link: TrackingLinkInput) => ({
              url: link.url || "",
              notes: link.notes || "",
              arrivalDate: link.arrivalDate ? new Date(link.arrivalDate) : null,
            }))
          : [{ url: "", notes: "", arrivalDate: null }]
        setTrackingLinks(processedTrackingLinks)
        setOrderStatus(order.status || "SHIPPING")
        
        // Product cost will be calculated from products, but use stored value if available as initial value
        // It will be recalculated in the useEffect anyway

        // Convert order products to SelectedProduct format
        const productMap = new Map<string, SelectedProduct>()

        order.products.forEach((orderProduct) => {
          const { productId, productName, size, quantity, price, arrivedQuantity, status } = orderProduct
          // Convert -1 (unknown) to undefined, keep other values as is
          const normalizedPrice = price === -1 ? undefined : (price ?? undefined)
          // Convert ARRIVED status to COMPLETED for backward compatibility
          const rawStatus = status as string | undefined
          const normalizedStatus: OrderStatus = rawStatus === "ARRIVED" ? "COMPLETED" : (rawStatus && ["SHIPPING", "PARTIALLY ARRIVED", "COMPLETED"].includes(rawStatus) ? rawStatus as OrderStatus : "SHIPPING")

          if (!productMap.has(productId)) {
            // Initialize with empty size quantities and arrived quantities - we'll populate from order data
            const initialSizeQuantities: Record<string, number> = {}
            const initialArrivedQuantities: Record<string, number> = {}

            productMap.set(productId, {
              productId,
              productName,
              price: normalizedPrice,
              sizeQuantities: initialSizeQuantities,
              arrivedQuantities: initialArrivedQuantities,
              status: normalizedStatus,
            })
          }

          const selectedProduct = productMap.get(productId)!
          selectedProduct.sizeQuantities[size] = quantity
          selectedProduct.arrivedQuantities[size] = arrivedQuantity || 0
          // Use the price from the first product entry if available (and not undefined)
          if (normalizedPrice !== undefined && selectedProduct.price === undefined) {
            selectedProduct.price = normalizedPrice
          }
          // Use the status from the first product entry if available
          if (normalizedStatus && !selectedProduct.status) {
            selectedProduct.status = normalizedStatus
          }
        })

        // Calculate product statuses based on arrived quantities
        productMap.forEach((product) => {
          product.status = calculateProductStatus(product)
        })

        setSelectedProducts(Array.from(productMap.values()))
      } else {
        setError("Failed to load order")
      }
    } catch (error) {
      console.error("Error fetching order:", error)
      setError("An error occurred while loading the order")
    } finally {
      setLoading(false)
    }
  }

  const addProductToOrder = (product: Product) => {
    // Initialize with all product sizes set to 0
    const initialSizeQuantities: Record<string, number> = {}
    const initialArrivedQuantities: Record<string, number> = {}
    const productSizes = product.sizes || AVAILABLE_SIZES
    productSizes.forEach(size => {
      initialSizeQuantities[size] = 0
      initialArrivedQuantities[size] = 0
    })

    const newProduct: SelectedProduct = {
      productId: product.id,
      productName: product.name,
      price: undefined, // Start with blank/unknown price
      sizeQuantities: initialSizeQuantities,
      arrivedQuantities: initialArrivedQuantities,
      status: "SHIPPING",
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
    // Ensure arrived quantity doesn't exceed ordered quantity
    const maxArrived = Math.min(updated[index].arrivedQuantities[size] || 0, quantity)
    updated[index].arrivedQuantities = {
      ...updated[index].arrivedQuantities,
      [size]: maxArrived,
    }
    // Update product status based on arrived quantities
    updated[index].status = calculateProductStatus(updated[index])
    setSelectedProducts(updated)
  }

  const updateArrivedQuantity = (index: number, size: string, arrivedQuantity: number) => {
    if (arrivedQuantity < 0) return
    const updated = [...selectedProducts]
    const orderedQuantity = updated[index].sizeQuantities[size] || 0
    // Ensure arrived quantity doesn't exceed ordered quantity
    const clampedArrived = Math.min(arrivedQuantity, orderedQuantity)
    updated[index].arrivedQuantities = {
      ...updated[index].arrivedQuantities,
      [size]: clampedArrived,
    }
    // Update product status based on arrived quantities
    updated[index].status = calculateProductStatus(updated[index])
    setSelectedProducts(updated)
  }

  const calculateProductStatus = (product: SelectedProduct): OrderStatus => {
    const sizes = Object.keys(product.sizeQuantities)
    let totalOrdered = 0
    let totalArrived = 0

    sizes.forEach(size => {
      totalOrdered += product.sizeQuantities[size] || 0
      totalArrived += product.arrivedQuantities[size] || 0
    })

    if (totalArrived === 0) return "SHIPPING"
    if (totalArrived === totalOrdered && totalOrdered > 0) return "COMPLETED"
    if (totalArrived < totalOrdered) return "PARTIALLY ARRIVED"
    return "COMPLETED"
  }

  const calculateOrderStatus = (products: SelectedProduct[]): OrderStatus => {
    if (products.length === 0) return "SHIPPING"
    
    const allCompleted = products.every(p => p.status === "COMPLETED")
    const allShipping = products.every(p => p.status === "SHIPPING")
    const hasPartially = products.some(p => p.status === "PARTIALLY ARRIVED")
    
    if (allCompleted) return "COMPLETED"
    if (hasPartially) return "PARTIALLY ARRIVED"
    if (allShipping) return "SHIPPING"
    return "PARTIALLY ARRIVED"
  }

  const updateProductPrice = (index: number, price: number | undefined) => {
    const updated = [...selectedProducts]
    // If price is negative, undefined, or NaN, set to undefined (blank)
    // If price is 0, keep it as 0 (explicit zero, not blank)
    if (price === undefined || price === null || isNaN(price) || price < 0) {
      updated[index].price = undefined
    } else {
      updated[index].price = price
    }
    setSelectedProducts(updated)
  }

  const addTrackingLink = () => {
    setTrackingLinks([...trackingLinks, { url: "", notes: "", arrivalDate: null }])
  }

  const removeTrackingLink = (index: number) => {
    if (trackingLinks.length > 1) {
      setTrackingLinks(trackingLinks.filter((_, i) => i !== index))
    }
  }

  const updateTrackingLink = (index: number, field: "url" | "notes", value: string) => {
    const updated = [...trackingLinks]
    updated[index] = { ...updated[index], [field]: value }
    setTrackingLinks(updated)
  }

  const updateTrackingLinkArrivalDate = (index: number, arrivalDate: Date | null) => {
    const updated = [...trackingLinks]
    updated[index] = { ...updated[index], arrivalDate }
    setTrackingLinks(updated)
  }

  useEffect(() => {
    // Check if any product has an unknown price
    const hasUnknownPrice = selectedProducts.some((product) => {
      const hasQuantity = Object.values(product.sizeQuantities).some(qty => qty > 0)
      return hasQuantity && (product.price === undefined || product.price === null || isNaN(product.price))
    })

    if (hasUnknownPrice) {
      // If any product has unknown price, set cost to null (will show N/A)
      setProductCost(null)
      setFeesAndShipping(null)
      return
    }

    // Calculate total product cost (price * quantity for each size)
    let totalProductCost = 0
    selectedProducts.forEach((product) => {
      // Only calculate if price is defined (not blank/unknown)
      if (product.price !== undefined && product.price !== null && !isNaN(product.price) && product.price >= 0) {
        Object.entries(product.sizeQuantities).forEach(([, quantity]) => {
          if (quantity > 0) {
            totalProductCost += product.price! * quantity
          }
        })
      }
    })
    setProductCost(totalProductCost)

    // Calculate fees and shipping if total order amount is set
    if (totalOrderAmount === null || totalOrderAmount === 0) {
      setFeesAndShipping(0)
      return
    }

    // Fees and shipping = Total Order Amount - Total Product Cost
    const calculatedFees = totalOrderAmount - totalProductCost
    setFeesAndShipping(calculatedFees >= 0 ? calculatedFees : 0)
  }, [totalOrderAmount, selectedProducts])

  useEffect(() => {
    // Auto-update order status based on product statuses
    if (selectedProducts.length > 0) {
      const calculatedStatus = calculateOrderStatus(selectedProducts)
      setOrderStatus(calculatedStatus)
    }
  }, [selectedProducts])

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
      arrivedQuantity: number
      status: OrderStatus
    }> = []

    selectedProducts.forEach((product) => {
      Object.entries(product.sizeQuantities).forEach(([size, quantity]) => {
        if (quantity > 0) {
          orderProducts.push({
            productId: product.productId,
            productName: product.productName,
            size,
            quantity,
            arrivedQuantity: product.arrivedQuantities[size] || 0,
            status: product.status,
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

      // Build products with prices, status, and arrived quantities
      const productsWithPrices: Array<{
        productId: string
        productName: string
        size: string
        quantity: number
        price: number
        arrivedQuantity: number
        status: OrderStatus
      }> = []

      selectedProducts.forEach((product) => {
        Object.entries(product.sizeQuantities).forEach(([size, quantity]) => {
          if (quantity > 0) {
            // Convert undefined (blank) to -1 for unknown price, otherwise use the price value
            const price = product.price === undefined || product.price === null || isNaN(product.price) 
              ? -1 
              : product.price
            productsWithPrices.push({
              productId: product.productId,
              productName: product.productName,
              size,
              quantity,
              price: price,
              arrivedQuantity: product.arrivedQuantities[size] || 0,
              status: product.status,
            })
          }
        })
      })

      const response = await fetch(`/api/orders/${orderId}`, {
        method: "PUT",
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
          feesAndShipping: feesAndShipping !== null && feesAndShipping !== undefined ? feesAndShipping : undefined,
          productCost: productCost !== null ? productCost : undefined,
          carrier: carrier || undefined,
          shipStartDate: shipStartDate ? shipStartDate.toISOString() : undefined,
          trackingLinks: trackingLinks.filter(link => link.url.trim() !== "").map(link => ({
            url: link.url,
            notes: link.notes,
            arrivalDate: link.arrivalDate ? link.arrivalDate.toISOString() : null,
          })),
          status: orderStatus,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        router.push("/orders")
      } else {
        setError(data.error || "Failed to update order")
      }
    } catch (error) {
      console.error("Error updating order:", error)
      setError("An error occurred while updating the order")
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    try {
      setDeleting(true)
      const response = await fetch(`/api/orders/${orderId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        router.push("/orders")
      } else {
        const data = await response.json()
        setError(data.error || "Failed to delete order")
        setDeleteDialogOpen(false)
      }
    } catch (error) {
      console.error("Error deleting order:", error)
      setError("An error occurred while deleting the order")
      setDeleteDialogOpen(false)
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Card>
            <CardContent className="p-6">
              <p className="text-muted-foreground">Loading order...</p>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 h-[calc(100vh-6rem)] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between flex-shrink-0">
          <h1 className="text-3xl font-bold">Edit Order</h1>
          <div className="flex items-center gap-2">
            <Button
              variant="destructive"
              onClick={() => setDeleteDialogOpen(true)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
            <Button variant="outline" onClick={() => router.push("/orders")}>
              Cancel
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-0">
          {/* Left Column - Product Selection */}
          <Card className="flex flex-col h-full overflow-hidden">
            <CardHeader className="flex-shrink-0">
              <CardTitle>Select Products</CardTitle>
            </CardHeader>
            <div className="flex flex-col flex-1 min-h-0 overflow-hidden px-6 pb-6">
              {/* Search Bar */}
              <div className="relative flex-shrink-0 mb-4">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Products Grid - Scrollable Container */}
              <div className="flex-1 min-h-0 overflow-hidden">
                <div className="h-full overflow-y-auto pr-2">
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 pb-2">
                {filteredProducts
                  .filter((product) => !selectedProducts.some((selected) => selected.productId === product.id))
                  .map((product) => (
                    <div
                      key={product.id}
                      className="border rounded-lg p-2 cursor-pointer hover:bg-accent dark:hover:bg-accent transition-colors"
                      onClick={() => addProductToOrder(product)}
                    >
                      <div className="relative w-full aspect-square bg-card dark:bg-card rounded mb-2">
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
                </div>
              </div>
            </div>
          </Card>

          {/* Right Column - Order Details */}
          <Card className="flex flex-col h-full overflow-hidden">
            <CardHeader className="flex-shrink-0">
              <CardTitle>Order Details</CardTitle>
            </CardHeader>
            <div className="flex flex-col flex-1 min-h-0 overflow-hidden px-6 pb-6">
              {/* Scrollable Content Area */}
              <div className="flex-1 min-h-0 overflow-hidden">
                <div className="h-full overflow-y-auto pr-2">
                  <div className="space-y-4 pb-4">
                    {/* Error Message */}
                  {error && (
                    <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 rounded-md">
                      {error}
                    </div>
                  )}

                  {/* Collapsible Order Details Card */}
                  <Card className="bg-secondary">
                  <CardHeader 
                    className="cursor-pointer hover:bg-muted transition-colors"
                    onClick={() => setIsOrderDetailsOpen(!isOrderDetailsOpen)}
                  >
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">Order Details</CardTitle>
                      {isOrderDetailsOpen ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </div>
                  </CardHeader>
                  {isOrderDetailsOpen && (
                    <CardContent className="space-y-4 pt-0">
                      {/* Row 1: Order Date, Supplier, Payment Method */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Date Picker */}
                <div className="space-y-2">
                  <Label>Order Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-between font-normal",
                          !date && "text-muted-foreground"
                        )}
                      >
                        {date ? date.toLocaleDateString() : "Select date"}
                        <ChevronDownIcon className="h-4 w-4" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto overflow-hidden p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={date}
                        captionLayout="dropdown"
                        onSelect={(selectedDate) => {
                          if (selectedDate) setDate(selectedDate)
                        }}
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
              </div>

                      {/* Row 2: Total Order Amount, Product Cost, and Fees and Shipping */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

                        {/* Product Cost */}
                        <div className="space-y-2">
                          <Label>Product Cost ($)</Label>
                          <Input
                            type="text"
                            value={productCost === null ? "N/A" : productCost.toFixed(2)}
                            disabled
                            className="bg-card dark:bg-card"
                          />
                        </div>

                        {/* Fees and Shipping (calculated) */}
                        <div className="space-y-2">
                          <Label>Fees and Shipping ($)</Label>
                          <Input
                            type="text"
                            value={feesAndShipping === null ? "N/A" : feesAndShipping.toFixed(2)}
                            disabled
                            className="bg-card dark:bg-card"
                          />
                        </div>
                      </div>

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
                    </CardContent>
                  )}
                </Card>

                {/* Collapsible Shipping Details Card */}
                <Card className="bg-secondary">
                  <CardHeader 
                    className="cursor-pointer hover:bg-muted transition-colors"
                    onClick={() => setIsShippingDetailsOpen(!isShippingDetailsOpen)}
                  >
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">Shipping Details</CardTitle>
                      {isShippingDetailsOpen ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </div>
                  </CardHeader>
                  {isShippingDetailsOpen && (
                    <CardContent className="space-y-4 pt-0">
                      {/* Carrier */}
                      <div className="space-y-2">
                        <Label>Carrier</Label>
                        <Select value={carrier} onValueChange={setCarrier}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select carrier" />
                          </SelectTrigger>
                          <SelectContent>
                            {CARRIERS.map((carrierOption) => (
                              <SelectItem key={carrierOption} value={carrierOption}>
                                {carrierOption}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Ship Start Date */}
                      <div className="space-y-2">
                        <Label>Ship Start Date</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full justify-between font-normal",
                                !shipStartDate && "text-muted-foreground"
                              )}
                            >
                              {shipStartDate ? shipStartDate.toLocaleDateString() : "Select date"}
                              <ChevronDownIcon className="h-4 w-4" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto overflow-hidden p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={shipStartDate || undefined}
                              captionLayout="dropdown"
                              onSelect={(selectedDate) => {
                                setShipStartDate(selectedDate || null)
                              }}
                            />
                          </PopoverContent>
                        </Popover>
                      </div>

                      {/* Tracking Links */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label>Tracking Links</Label>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={addTrackingLink}
                            className="h-7 text-xs"
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            Add Link
                          </Button>
                        </div>
                        <div className="space-y-2">
                          {trackingLinks.map((link, index) => (
                            <div key={index} className="space-y-2 p-3 border rounded-md">
                              <div className="flex items-center justify-between mb-2">
                                <Label className="text-xs text-muted-foreground">Tracking Link #{index + 1}</Label>
                                {trackingLinks.length > 1 && (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => removeTrackingLink(index)}
                                    className="h-6 w-6"
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                )}
                              </div>
                              <Input
                                placeholder="Enter tracking URL"
                                value={link.url}
                                onChange={(e) => updateTrackingLink(index, "url", e.target.value)}
                              />
                              <Input
                                placeholder="Notes (optional)"
                                value={link.notes}
                                onChange={(e) => updateTrackingLink(index, "notes", e.target.value)}
                                className="text-sm"
                              />
                              {/* Arrival Date for this tracking link */}
                              <div className="space-y-2">
                                <Label className="text-xs">Arrival Date (Optional)</Label>
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <Button
                                      variant="outline"
                                      className={cn(
                                        "w-full justify-between font-normal text-sm h-9",
                                        !link.arrivalDate && "text-muted-foreground"
                                      )}
                                    >
                                      {link.arrivalDate ? link.arrivalDate.toLocaleDateString() : "Select date"}
                                      <ChevronDownIcon className="h-4 w-4" />
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-auto overflow-hidden p-0" align="start">
                                    <Calendar
                                      mode="single"
                                      selected={link.arrivalDate || undefined}
                                      captionLayout="dropdown"
                                      onSelect={(selectedDate) => {
                                        updateTrackingLinkArrivalDate(index, selectedDate || null)
                                      }}
                                    />
                                  </PopoverContent>
                                </Popover>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  )}
                </Card>

                {/* Selected Products */}
                <div className="space-y-2 mt-4">
                  <Label className="text-sm font-medium">Selected Products</Label>
                  {selectedProducts.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No products selected</p>
                  ) : (
                    <div className="space-y-3">
                    {[...selectedProducts].sort((a, b) => a.productName.localeCompare(b.productName)).map((product) => {
                      // Find original index for updates
                      const originalIndex = selectedProducts.findIndex(p => p.productId === product.productId && p.productName === product.productName)
                      return (
                      <div
                        key={originalIndex}
                        className="border rounded-lg p-3 space-y-3 bg-secondary"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="font-medium text-sm">{product.productName}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">Status: {product.status}</p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => removeProductFromOrder(originalIndex)}
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
                            value={product.price === undefined ? "" : product.price}
                            onChange={(e) => {
                              const value = e.target.value
                              // If blank, set to undefined. Otherwise parse the number
                              if (value === "" || value === null) {
                                updateProductPrice(originalIndex, undefined)
                              } else {
                                const numValue = parseFloat(value)
                                if (!isNaN(numValue)) {
                                  updateProductPrice(originalIndex, numValue)
                                } else {
                                  updateProductPrice(originalIndex, undefined)
                                }
                              }
                            }}
                            className="h-8"
                            placeholder="0.00"
                          />
                        </div>

                        {/* Size Quantity Inputs */}
                        <div className="space-y-2">
                          <Label className="text-xs">Ordered Quantities by Size</Label>
                          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 gap-2">
                            {Object.keys(product.sizeQuantities).map((size) => (
                              <div key={size} className="space-y-1">
                                <Label className="text-xs text-muted-foreground">{size}</Label>
                                <Input
                                  type="number"
                                  min="0"
                                  value={product.sizeQuantities[size] || 0}
                                  onChange={(e) =>
                                    updateSizeQuantity(
                                      originalIndex,
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

                        {/* Arrived Quantity Inputs */}
                        <div className="space-y-2">
                          <Label className="text-xs">Arrived Quantities by Size</Label>
                          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 gap-2">
                            {Object.keys(product.sizeQuantities).map((size) => {
                              const orderedQty = product.sizeQuantities[size] || 0
                              const arrivedQty = product.arrivedQuantities[size] || 0
                              return (
                                <div key={size} className="space-y-1">
                                  <Label className="text-xs text-muted-foreground">{size}</Label>
                                  <Input
                                    type="number"
                                    min="0"
                                    max={orderedQty}
                                    value={arrivedQty}
                                    onChange={(e) =>
                                      updateArrivedQuantity(
                                        originalIndex,
                                        size,
                                        parseInt(e.target.value) || 0
                                      )
                                    }
                                    className="h-8"
                                    placeholder="0"
                                    disabled={orderedQty === 0}
                                  />
                                  {orderedQty > 0 && (
                                    <p className="text-xs text-muted-foreground">{arrivedQty}/{orderedQty}</p>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      </div>
                    )
                    })}
                    </div>
                  )}
                </div>
                  </div>
                </div>
              </div>

              {/* Submit Button - Always at bottom */}
              <div className="pt-4 border-t mt-4 flex-shrink-0">
                <Button
                  onClick={handleSubmit}
                  disabled={selectedProducts.length === 0 || !paymentMethod || submitting}
                  className="w-full"
                >
                  {submitting ? "Updating Order..." : "Update Order"}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Order</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this order? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  )
}

