"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, Search } from "lucide-react"

interface Order {
  id: string
  orderNumber: number | null
  products: Array<{
    productId: string
    productName: string
    size: string
    quantity: number
    price?: number
  }>
  date: string
  paymentMethod: string
  totalItemCount: number
  supplier?: string | null
  notes?: string | null
  totalOrderAmount?: number | null
  feesAndShipping?: number | null
  createdAt: string
}

export default function OrdersPage() {
  const router = useRouter()
  const [orders, setOrders] = useState<Order[]>([])
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(true)

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
                      <CardTitle>Order #{order.orderNumber ?? order.id.slice(-6)}</CardTitle>
                      <div className="text-sm text-muted-foreground">
                        {new Date(order.date).toLocaleDateString()}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {order.supplier && (
                        <div>
                          <p className="text-sm font-medium">Supplier:</p>
                          <p className="text-sm text-muted-foreground">{order.supplier}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-medium">Payment Method:</p>
                        <p className="text-sm text-muted-foreground">{order.paymentMethod}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Total Items:</p>
                        <p className="text-sm text-muted-foreground">{order.totalItemCount || 0}</p>
                      </div>
                      {order.totalOrderAmount && (
                        <div>
                          <p className="text-sm font-medium">Total Order Amount:</p>
                          <p className="text-sm text-muted-foreground">${order.totalOrderAmount.toFixed(2)}</p>
                        </div>
                      )}
                      {order.feesAndShipping && order.feesAndShipping > 0 && (
                        <div>
                          <p className="text-sm font-medium">Fees and Shipping:</p>
                          <p className="text-sm text-muted-foreground">${order.feesAndShipping.toFixed(2)}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-medium">Products:</p>
                        <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                          {order.products
                            .sort((a, b) => {
                              // First sort by product name
                              if (a.productName !== b.productName) {
                                return a.productName.localeCompare(b.productName)
                              }
                              // Then sort by size (XXS to XXL)
                              const sizeOrder = ["XXS", "XS", "S", "M", "L", "XL", "XXL"]
                              return sizeOrder.indexOf(a.size) - sizeOrder.indexOf(b.size)
                            })
                            .map((product, idx) => (
                              <li key={idx}>
                                {product.productName} - Size: {product.size} - Qty: {product.quantity}
                                {product.price && ` - $${product.price.toFixed(2)} each ($${(product.price * product.quantity).toFixed(2)} total)`}
                              </li>
                            ))}
                        </ul>
                      </div>
                      {order.notes && (
                        <div>
                          <p className="text-sm font-medium">Notes:</p>
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{order.notes}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}

