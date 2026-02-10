"use client"

import { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ScrollText } from "lucide-react"

interface LogEntry {
  id: string
  category: string
  createdAt: string
  message: string
  details: {
    productId?: string
    productName?: string
    changes?: string
    action?: string
  } | null
}

export default function LogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [categoryFilter, setCategoryFilter] = useState<string>("all")

  useEffect(() => {
    fetchLogs()
  }, [categoryFilter])

  const fetchLogs = async () => {
    try {
      setLoading(true)
      const url =
        categoryFilter === "all"
          ? "/api/logs"
          : `/api/logs?category=${encodeURIComponent(categoryFilter)}`
      const res = await fetch(url)
      if (res.ok) {
        const data = await res.json()
        setLogs(data)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    return d.toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    })
  }

  return (
    <DashboardLayout>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="flex items-center gap-2">
            <ScrollText className="h-5 w-5" />
            Logs
          </CardTitle>
          <Select
            value={categoryFilter}
            onValueChange={setCategoryFilter}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              <SelectItem value="inventory">Inventory</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground py-8 text-center">
              Loading logs...
            </p>
          ) : logs.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground border border-dashed rounded-lg">
              <p>No logs yet.</p>
              <p className="text-sm mt-1">
                Logs are created when you edit inventory or other tracked
                actions.
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-[160px]">Date</TableHead>
                    <TableHead className="w-[120px]">Category</TableHead>
                    <TableHead>What changed</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                        {formatDate(log.createdAt)}
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs font-medium capitalize">
                          {log.category}
                        </span>
                      </TableCell>
                      <TableCell>
                        <p className="font-medium text-sm">{log.message}</p>
                        {log.details?.changes && (
                          <p className="text-muted-foreground text-xs mt-0.5">
                            {log.details.changes}
                          </p>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  )
}
