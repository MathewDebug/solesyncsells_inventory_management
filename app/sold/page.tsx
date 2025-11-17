"use client"

import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"

export default function SoldPage() {
  return (
    <DashboardLayout>
      <Card>
        <CardHeader>
          <CardTitle>Sold</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Sold items page content coming soon...</p>
        </CardContent>
      </Card>
    </DashboardLayout>
  )
}

