"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Plus, Search, Edit, Trash2 } from "lucide-react"

interface TrackingLink {
  url: string
  notes: string
}

type OrderStatus = "SHIPPING" | "PARTIALLY ARRIVED" | "COMPLETED"

interface Order {
  id: string
  orderNumber: number | null
  products: Array<{
    productId: string
    productName: string
    size: string
    quantity: number
    price?: number
    arrivedQuantity?: number
    status?: OrderStatus
  }>
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
  shipArrivalDate?: string | null
  status?: OrderStatus
  createdAt: string
}

export default function OrdersPage() {
  const router = useRouter()
  const [orders, setOrders] = useState<Order[]>([])
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(true)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [orderToDelete, setOrderToDelete] = useState<Order | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    fetchOrders()
  }, [])

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredOrders(orders)
    } else {
      const filtered = orders.filter((order) =>
        order.products.some((p) =>
          p.productName.toLowerCase().includes(searchQuery.toLowerCase())
        )
      )
      setFilteredOrders(filtered)
    }
  }, [searchQuery, orders])

  const fetchOrders = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/orders")
      if (response.ok) {
        const data = await response.json()
        setOrders(data)
        setFilteredOrders(data)
      }
    } catch (error) {
      console.error("Error fetching orders:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteClick = (order: Order) => {
    setOrderToDelete(order)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!orderToDelete) return

    try {
      setDeleting(true)
      const response = await fetch(`/api/orders/${orderToDelete.id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        // Remove the deleted order from the list
        setOrders(orders.filter((order) => order.id !== orderToDelete.id))
        setFilteredOrders(filteredOrders.filter((order) => order.id !== orderToDelete.id))
        setDeleteDialogOpen(false)
        setOrderToDelete(null)
      } else {
        const data = await response.json()
        alert(data.error || "Failed to delete order")
      }
    } catch (error) {
      console.error("Error deleting order:", error)
      alert("An error occurred while deleting the order")
    } finally {
      setDeleting(false)
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Orders</h1>
          <Button onClick={() => router.push("/orders/create-order")}>
            <Plus className="mr-2 h-4 w-4" />
            Add Order
          </Button>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search orders..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {loading ? (
          <Card>
            <CardContent className="p-6">
              <p className="text-muted-foreground">Loading orders...</p>
            </CardContent>
          </Card>
        ) : filteredOrders.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>All Orders</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                {searchQuery ? "No orders found matching your search." : "No orders yet. Add your first order!"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div>
            <h2 className="text-2xl font-semibold mb-4">All Orders</h2>
            <div className="space-y-4">
              {filteredOrders.map((order) => (
                <Card key={order.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <CardTitle>Order #{order.orderNumber ?? order.id.slice(-6)}</CardTitle>
                        {order.status && (
                          <Badge variant={
                            (order.status === "COMPLETED" || (order.status as string) === "ARRIVED") ? "default" :
                            order.status === "PARTIALLY ARRIVED" ? "secondary" :
                            "outline"
                          }>
                            {(order.status as string) === "ARRIVED" ? "COMPLETED" : order.status}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => router.push(`/orders/edit/${order.id}`)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleDeleteClick(order)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {/* Row 1: Order Date, Supplier, Payment Method */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div>
                        <p className="text-sm font-medium">Order Date</p>
                        <p className="text-sm text-muted-foreground">{new Date(order.date).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Supplier</p>
                        <p className="text-sm text-muted-foreground">{order.supplier || "N/A"}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Payment Method</p>
                        <p className="text-sm text-muted-foreground">{order.paymentMethod}</p>
                      </div>
                    </div>

                    {/* Row 2: Total Order Amount, Product Cost, Fees and Shipping */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div>
                        <p className="text-sm font-medium">Total Order Amount</p>
                        <p className="text-sm text-muted-foreground">
                          {order.totalOrderAmount ? `$${order.totalOrderAmount.toFixed(2)}` : "N/A"}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Product Cost</p>
                        <p className="text-sm text-muted-foreground">
                          {order.productCost !== null && order.productCost !== undefined ? `$${order.productCost.toFixed(2)}` : "N/A"}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Fees and Shipping</p>
                        <p className="text-sm text-muted-foreground">
                          {order.feesAndShipping !== null && order.feesAndShipping !== undefined && order.feesAndShipping > 0
                            ? `$${order.feesAndShipping.toFixed(2)}`
                            : "N/A"}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div>
                        <p className="text-sm font-medium">Total Items:</p>
                        <p className="text-sm text-muted-foreground">{order.totalItemCount || 0}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Products:</p>
                        {/* Group products by name and status */}
                        {(() => {
                          const productGroups = new Map<string, typeof order.products>()
                          order.products.forEach(product => {
                            const key = product.productId
                            if (!productGroups.has(key)) {
                              productGroups.set(key, [])
                            }
                            productGroups.get(key)!.push(product)
                          })

                          const sortedGroups = Array.from(productGroups.entries()).sort((a, b) => 
                            a[1][0].productName.localeCompare(b[1][0].productName)
                          )

                          return (
                            <div className="grid grid-cols-2 gap-3">
                              {sortedGroups.map(([productId, products]) => {
                                // Convert ARRIVED to COMPLETED for backward compatibility
                                const rawStatus = products[0].status as string | undefined || "SHIPPING"
                                const productStatus: OrderStatus = rawStatus === "ARRIVED" ? "COMPLETED" : (rawStatus && ["SHIPPING", "PARTIALLY ARRIVED", "COMPLETED"].includes(rawStatus) ? rawStatus as OrderStatus : "SHIPPING")
                                const isCompleted = productStatus === "COMPLETED"
                                const isPartiallyArrived = productStatus === "PARTIALLY ARRIVED"
                                
                                return (
                                  <div 
                                    key={productId} 
                                    className={`p-2 rounded-md border ${
                                      isCompleted 
                                        ? "bg-green-950/20 dark:bg-green-950/20 border-green-200 dark:border-green-800" 
                                        : isPartiallyArrived
                                        ? "bg-yellow-950/20 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800"
                                        : "bg-gray-950/20 dark:bg-gray-950/20 border-gray-200 dark:border-gray-800"
                                    }`}
                                  >
                                    <div className="flex items-center justify-between mb-1">
                                      <p className="text-sm font-semibold">{products[0].productName}</p>
                                      <Badge variant={
                                        productStatus === "COMPLETED" ? "default" :
                                        productStatus === "PARTIALLY ARRIVED" ? "secondary" :
                                        "outline"
                                      } className="text-xs">
                                        {productStatus}
                                      </Badge>
                                    </div>
                                    <ul className="list-none text-sm text-muted-foreground space-y-1">
                                      {products
                                        .sort((a, b) => {
                                          const sizeOrder = ["XXS", "XS", "S", "M", "L", "XL", "XXL"]
                                          return sizeOrder.indexOf(a.size) - sizeOrder.indexOf(b.size)
                                        })
                                        .map((product, idx) => (
                                          <li key={idx} className="flex items-center gap-2">
                                            <span>
                                              Size: {product.size} - Ordered: {product.quantity}
                                              {product.arrivedQuantity !== undefined && product.arrivedQuantity > 0 && (
                                                <span className={isCompleted ? "text-green-600 dark:text-green-400" : "text-yellow-600 dark:text-yellow-400"}>
                                                  {" "}/ Arrived: {product.arrivedQuantity}
                                                </span>
                                              )}
                                            </span>
                                            <span className="text-xs">
                                              {product.price !== undefined && product.price !== null && product.price !== -1
                                                ? `- $${product.price.toFixed(2)} each ($${(product.price * product.quantity).toFixed(2)} total)`
                                                : "- ? each"}
                                            </span>
                                          </li>
                                        ))}
                                    </ul>
                                  </div>
                                )
                              })}
                            </div>
                          )
                        })()}
                      </div>
                      {order.notes && (
                        <div>
                          <p className="text-sm font-medium">Notes:</p>
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{order.notes}</p>
                        </div>
                      )}
                    </div>

                    {/* Shipping Details */}
                    {(order.carrier || order.shipStartDate || (order.trackingLinks && order.trackingLinks.length > 0) || order.shipArrivalDate) && (
                      <div className="mt-4 pt-4 border-t space-y-2">
                        <p className="text-sm font-medium">Shipping Details</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {order.carrier && (
                            <div>
                              <p className="text-xs font-medium text-muted-foreground">Carrier</p>
                              <p className="text-sm">{order.carrier}</p>
                            </div>
                          )}
                          {order.shipStartDate && (
                            <div>
                              <p className="text-xs font-medium text-muted-foreground">Ship Start Date</p>
                              <p className="text-sm">{new Date(order.shipStartDate).toLocaleDateString()}</p>
                            </div>
                          )}
                          {order.shipArrivalDate && (
                            <div>
                              <p className="text-xs font-medium text-muted-foreground">Ship Arrival Date</p>
                              <p className="text-sm">{new Date(order.shipArrivalDate).toLocaleDateString()}</p>
                            </div>
                          )}
                        </div>
                        {order.trackingLinks && order.trackingLinks.length > 0 && (
                          <div className="mt-2">
                            <p className="text-xs font-medium text-muted-foreground mb-1">Tracking Links</p>
                            <div className="space-y-2">
                              {order.trackingLinks.map((link, idx) => (
                                <div key={idx} className="text-sm">
                                  <a
                                    href={link.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 dark:text-blue-400 hover:underline"
                                  >
                                    {link.url}
                                  </a>
                                  {link.notes && (
                                    <p className="text-xs text-muted-foreground mt-0.5">{link.notes}</p>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Order</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete Order #{orderToDelete?.orderNumber ?? orderToDelete?.id.slice(-6)}? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setDeleteDialogOpen(false)
                  setOrderToDelete(null)
                }}
                disabled={deleting}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteConfirm}
                disabled={deleting}
              >
                {deleting ? "Deleting..." : "Delete"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
}

