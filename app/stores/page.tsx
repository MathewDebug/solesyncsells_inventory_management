"use client"

import { useEffect, useState } from "react"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"

type StoreType = "Store" | "Reseller" | "International"

interface Store {
  id: string
  name: string
  type: StoreType
  createdAt: string
}

export default function StoresPage() {
  const [stores, setStores] = useState<Store[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [name, setName] = useState("")
  const [type, setType] = useState<StoreType>("Store")
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetchStores()
  }, [])

  const fetchStores = async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/stores")
      if (res.ok) {
        const data = await res.json()
        setStores(data)
      }
    } catch (e) {
      console.error("Error fetching stores", e)
    } finally {
      setLoading(false)
    }
  }

  const handleAddStore = async () => {
    if (!name.trim()) return
    try {
      setSubmitting(true)
      const res = await fetch("/api/stores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), type }),
      })
      if (res.ok) {
        setName("")
        setType("Store")
        setIsDialogOpen(false)
        await fetchStores()
      } else {
        const data = await res.json()
        console.error("Failed to add store", data)
      }
    } catch (e) {
      console.error("Error adding store", e)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Stores & Resellers</h1>
          <Button onClick={() => setIsDialogOpen(true)}>
            Add Store / Reseller
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Saved Stores</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-muted-foreground">Loading stores...</p>
            ) : stores.length === 0 ? (
              <p className="text-muted-foreground">
                No stores or resellers yet. Add one above.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {stores.map((store) => (
                  <Card key={store.id}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-semibold truncate">
                        {store.name}
                      </CardTitle>
                      <Badge variant="outline" className="text-xs">
                        {store.type}
                      </Badge>
                    </CardHeader>
                    <CardContent>
                      <p className="text-xs text-muted-foreground">
                        Added{" "}
                        {store.createdAt
                          ? new Date(store.createdAt).toLocaleDateString()
                          : "N/A"}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Add Store / Reseller</DialogTitle>
            <DialogDescription>
              Save a store, reseller, or international buyer to select in
              wholesale sales.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Name</label>
              <Input
                placeholder="e.g. Local Vintage Shop"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Type</label>
              <Select
                value={type}
                onValueChange={(value) => setType(value as StoreType)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Store">Store</SelectItem>
                  <SelectItem value="Reseller">Reseller</SelectItem>
                  <SelectItem value="International">International</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddStore}
              disabled={!name.trim() || submitting}
            >
              {submitting ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  )
}

