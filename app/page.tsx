"use client"

import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table"

export default function DashboardPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid gap-6 md:grid-cols-3">
          {[
            { title: "Total Sales", value: "$12,345", change: "+12%" },
            { title: "Active Users", value: "1,234", change: "+8%" },
            { title: "Open Tickets", value: "56", change: "-3%" },
          ].map((stat) => (
            <Card key={stat.title}>
              <CardHeader>
                <CardTitle>{stat.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stat.value}</div>
                <Badge variant={stat.change.startsWith("+") ? "default" : "destructive"}>
                  {stat.change}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>

        <Separator />

        {/* Table */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[
                  { id: "TX-001", name: "John Doe", status: "Completed", amount: "$120" },
                  { id: "TX-002", name: "Jane Smith", status: "Pending", amount: "$75" },
                  { id: "TX-003", name: "Mike Ross", status: "Failed", amount: "$90" },
                ].map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell>{tx.id}</TableCell>
                    <TableCell>{tx.name}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          tx.status === "Completed"
                            ? "default"
                            : tx.status === "Pending"
                            ? "secondary"
                            : "destructive"
                        }
                      >
                        {tx.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{tx.amount}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}

