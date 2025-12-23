"use client"

import { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"

interface SupplierCount {
  name: string
  count: number
}

interface Stats {
  totalProducts: number
  totalOrders: number
  productsBought: number
  totalSpent: number
  topSuppliers: SupplierCount[]
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/stats")
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (error) {
      console.error("Error fetching stats:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        
        {/* Stats Cards */}
        <div className="grid gap-6 md:grid-cols-4">
          <Card>
            <CardHeader>
              <CardTitle>Total Products</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-3xl font-bold text-muted-foreground">Loading...</div>
              ) : (
                <div className="text-3xl font-bold">{stats?.totalProducts ?? 0}</div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Total Orders</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-3xl font-bold text-muted-foreground">Loading...</div>
              ) : (
                <div className="text-3xl font-bold">{stats?.totalOrders ?? 0}</div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Products Bought</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-3xl font-bold text-muted-foreground">Loading...</div>
              ) : (
                <div className="text-3xl font-bold">{stats?.productsBought ?? 0}</div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Total Spent</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-3xl font-bold text-muted-foreground">Loading...</div>
              ) : (
                <div className="text-3xl font-bold">${(stats?.totalSpent ?? 0).toFixed(2)}</div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Top Suppliers Card */}
        <Card>
          <CardHeader>
            <CardTitle>Top 5 Suppliers</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-muted-foreground">Loading...</div>
            ) : stats?.topSuppliers && stats.topSuppliers.length > 0 ? (
              <div className="space-y-3">
                {stats.topSuppliers.map((supplier, index) => (
                  <div key={supplier.name} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-secondary text-sm font-semibold">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium">{supplier.name}</p>
                      </div>
                    </div>
                    <div className="text-muted-foreground">
                      {supplier.count} {supplier.count === 1 ? 'order' : 'orders'}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">No suppliers found</p>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}

