"use client"

import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"

export default function InventoryPage() {
  return (
    <DashboardLayout>
      <Card>
        <CardHeader>
          <CardTitle>Inventory</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Inventory page content coming soon...</p>
        </CardContent>
      </Card>
    </DashboardLayout>
  )
}

