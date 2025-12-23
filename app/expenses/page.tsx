"use client"

import { useState, useEffect } from "react"
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
import { Plus, Edit, Trash2, CalendarIcon, ChevronDown, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

interface Expense {
  id: string
  date: string
  item: string
  cost: number
  quantity?: number | null
  isRecurring: boolean
  recurringInterval?: string | null
  recurringEvery?: number | null
  startDate?: string | null
  endDate?: string | null
  createdAt: string
}

const RECURRING_INTERVALS = [
  { value: "days", label: "Days" },
  { value: "weeks", label: "Weeks" },
  { value: "months", label: "Months" },
  { value: "years", label: "Years" },
]

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isRecurringDialogOpen, setIsRecurringDialogOpen] = useState(false)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Regular expense form state
  const [date, setDate] = useState<Date | null>(null)
  const [item, setItem] = useState("")
  const [cost, setCost] = useState("")
  const [quantity, setQuantity] = useState<string>("")

  // Recurring expense form state
  const [recurringDate, setRecurringDate] = useState<Date>(new Date())
  const [recurringItem, setRecurringItem] = useState("")
  const [recurringCost, setRecurringCost] = useState("")
  const [recurringQuantity, setRecurringQuantity] = useState<string>("")
  const [recurringInterval, setRecurringInterval] = useState("weeks")
  const [recurringEvery, setRecurringEvery] = useState("1")
  const [recurringEndDate, setRecurringEndDate] = useState<Date | null>(null)

  useEffect(() => {
    fetchExpenses()
  }, [])

  const fetchExpenses = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/expenses")
      if (response.ok) {
        const data = await response.json()
        setExpenses(data)
      }
    } catch (error) {
      console.error("Error fetching expenses:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddExpense = async () => {
    if (!item.trim() || !cost) {
      alert("Please fill in all fields")
      return
    }

    try {
      setSubmitting(true)
      const response = await fetch("/api/expenses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          date: date ? date.toISOString() : null,
          item: item.trim(),
          cost: parseFloat(cost),
          quantity: quantity ? parseFloat(quantity) : null,
          isRecurring: false,
        }),
      })

      if (response.ok) {
        setIsAddDialogOpen(false)
        setItem("")
        setCost("")
        setDate(new Date())
        fetchExpenses()
      } else {
        const data = await response.json()
        alert(data.error || "Failed to add expense")
      }
    } catch (error) {
      console.error("Error adding expense:", error)
      alert("An error occurred while adding the expense")
    } finally {
      setSubmitting(false)
    }
  }

  const handleAddRecurringExpense = async () => {
    if (!recurringItem.trim() || !recurringCost || !recurringEvery) {
      alert("Please fill in all fields")
      return
    }

    try {
      setSubmitting(true)
      const response = await fetch("/api/expenses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          date: recurringDate.toISOString(),
          item: recurringItem.trim(),
          cost: parseFloat(recurringCost),
          quantity: recurringQuantity ? parseFloat(recurringQuantity) : null,
          isRecurring: true,
          recurringInterval: recurringInterval,
          recurringEvery: parseInt(recurringEvery),
          startDate: recurringDate.toISOString(),
          endDate: recurringEndDate ? recurringEndDate.toISOString() : null,
        }),
      })

      if (response.ok) {
        setIsRecurringDialogOpen(false)
        setRecurringItem("")
        setRecurringCost("")
        setRecurringQuantity("")
        setRecurringDate(new Date())
        setRecurringInterval("weeks")
        setRecurringEvery("1")
        setRecurringEndDate(null)
        fetchExpenses()
      } else {
        const data = await response.json()
        alert(data.error || "Failed to add recurring expense")
      }
    } catch (error) {
      console.error("Error adding recurring expense:", error)
      alert("An error occurred while adding the recurring expense")
    } finally {
      setSubmitting(false)
    }
  }

  const handleEditClick = (expense: Expense) => {
    setEditingExpense(expense)
    setDate(expense.date ? new Date(expense.date) : null)
    setItem(expense.item)
    setCost(expense.cost.toString())
    setQuantity(expense.quantity?.toString() || "")
    if (expense.isRecurring && expense.startDate) {
      setRecurringDate(new Date(expense.startDate))
      setRecurringItem(expense.item)
      setRecurringCost(expense.cost.toString())
      setRecurringQuantity(expense.quantity?.toString() || "")
      setRecurringInterval(expense.recurringInterval || "weeks")
      setRecurringEvery(expense.recurringEvery?.toString() || "1")
      setRecurringEndDate(expense.endDate ? new Date(expense.endDate) : null)
    }
    setIsEditDialogOpen(true)
  }

  const handleUpdateExpense = async () => {
    if (!editingExpense || !item.trim() || !cost) {
      alert("Please fill in all fields")
      return
    }

    try {
      setSubmitting(true)
      const updateData: any = {
        date: date ? date.toISOString() : null,
        item: item.trim(),
        cost: parseFloat(cost),
        quantity: quantity ? parseFloat(quantity) : null,
        isRecurring: editingExpense.isRecurring,
      }

      if (editingExpense.isRecurring) {
        updateData.recurringInterval = recurringInterval
        updateData.recurringEvery = parseInt(recurringEvery)
        updateData.startDate = recurringDate.toISOString()
        updateData.endDate = recurringEndDate ? recurringEndDate.toISOString() : null
        updateData.quantity = recurringQuantity ? parseFloat(recurringQuantity) : null
      }

      const response = await fetch(`/api/expenses/${editingExpense.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updateData),
      })

      if (response.ok) {
        setIsEditDialogOpen(false)
        setEditingExpense(null)
        setItem("")
        setCost("")
        setDate(new Date())
        fetchExpenses()
      } else {
        const data = await response.json()
        alert(data.error || "Failed to update expense")
      }
    } catch (error) {
      console.error("Error updating expense:", error)
      alert("An error occurred while updating the expense")
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteClick = (expense: Expense) => {
    setExpenseToDelete(expense)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!expenseToDelete) return

    try {
      setDeleting(true)
      const response = await fetch(`/api/expenses/${expenseToDelete.id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        setDeleteDialogOpen(false)
        setExpenseToDelete(null)
        fetchExpenses()
      } else {
        const data = await response.json()
        alert(data.error || "Failed to delete expense")
      }
    } catch (error) {
      console.error("Error deleting expense:", error)
      alert("An error occurred while deleting the expense")
    } finally {
      setDeleting(false)
    }
  }

  const formatRecurringLabel = (expense: Expense) => {
    if (!expense.isRecurring || !expense.recurringInterval || !expense.recurringEvery) {
      return ""
    }
    const intervalLabel = expense.recurringInterval === "days" ? "day" :
                         expense.recurringInterval === "weeks" ? "week" :
                         expense.recurringInterval === "months" ? "month" :
                         expense.recurringInterval === "years" ? "year" : expense.recurringInterval
    return `Every ${expense.recurringEvery} ${expense.recurringEvery === 1 ? intervalLabel : intervalLabel + "s"}`
  }

  const totalCost = expenses.reduce((sum, expense) => sum + expense.cost, 0)

  // Group expenses by item name
  const groupedExpenses = expenses.reduce((acc, expense) => {
    const itemName = expense.item.toLowerCase().trim()
    if (!acc[itemName]) {
      acc[itemName] = []
    }
    acc[itemName].push(expense)
    return acc
  }, {} as Record<string, Expense[]>)

  // Create summary for each item group
  const itemSummaries = Object.entries(groupedExpenses).map(([itemName, itemExpenses]) => {
    const sortedExpenses = [...itemExpenses].sort((a, b) => {
      const dateA = a.date ? new Date(a.date).getTime() : 0
      const dateB = b.date ? new Date(b.date).getTime() : 0
      return dateB - dateA
    })
    const totalSpent = itemExpenses.reduce((sum, exp) => sum + exp.cost, 0)
    const totalQuantity = itemExpenses.reduce((sum, exp) => sum + (exp.quantity || 0), 0)
    const averagePrice = totalSpent / itemExpenses.length
    const averageUnitPrice = totalQuantity > 0 ? totalSpent / totalQuantity : null
    const purchaseCount = itemExpenses.length
    
    return {
      itemName: itemExpenses[0].item, // Use original casing from first expense
      normalizedName: itemName,
      expenses: sortedExpenses,
      totalSpent,
      totalQuantity,
      averagePrice,
      averageUnitPrice,
      purchaseCount,
    }
  }).sort((a, b) => b.totalSpent - a.totalSpent)

  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())

  const toggleItemExpansion = (itemName: string) => {
    const newExpanded = new Set(expandedItems)
    if (newExpanded.has(itemName)) {
      newExpanded.delete(itemName)
    } else {
      newExpanded.add(itemName)
    }
    setExpandedItems(newExpanded)
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Expenses</h1>
          <div className="flex gap-2">
            <Button onClick={() => setIsRecurringDialogOpen(true)} variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Add Recurring Expense
            </Button>
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Expense
            </Button>
          </div>
        </div>

        {/* Total Cost Card */}
        <Card>
          <CardHeader>
            <CardTitle>Total Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">${totalCost.toFixed(2)}</div>
          </CardContent>
        </Card>

        {/* Expenses List */}
        {loading ? (
          <Card>
            <CardContent className="p-6">
              <p className="text-muted-foreground">Loading expenses...</p>
            </CardContent>
          </Card>
        ) : expenses.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>All Expenses</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">No expenses yet. Add your first expense!</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {itemSummaries.map((summary) => {
              const isExpanded = expandedItems.has(summary.normalizedName)
              const hasMultiple = summary.purchaseCount > 1
              
              return (
                <Card key={summary.normalizedName}>
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      {/* Item Summary Header */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1">
                          {hasMultiple && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => toggleItemExpansion(summary.normalizedName)}
                            >
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </Button>
                          )}
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold">{summary.itemName}</h3>
                            {hasMultiple && (
                              <div className="text-sm text-muted-foreground mt-1">
                                <span>{summary.purchaseCount} purchase{summary.purchaseCount !== 1 ? 's' : ''}</span>
                                <span className="mx-2">•</span>
                                <span>Total: ${summary.totalSpent.toFixed(2)}</span>
                                {summary.totalQuantity > 0 && (
                                  <>
                                    <span className="mx-2">•</span>
                                    <span>Qty: {summary.totalQuantity}</span>
                                    {summary.averageUnitPrice !== null && (
                                      <>
                                        <span className="mx-2">•</span>
                                        <span>${summary.averageUnitPrice.toFixed(2)}/unit</span>
                                      </>
                                    )}
                                  </>
                                )}
                                <span className="mx-2">•</span>
                                <span>Avg: ${summary.averagePrice.toFixed(2)}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        {!hasMultiple && summary.expenses[0] && (
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <p className="text-2xl font-bold">
                                ${summary.expenses[0].cost.toFixed(2)}
                                {summary.expenses[0].quantity && summary.expenses[0].quantity > 0 && (
                                  <span className="text-sm font-normal text-muted-foreground ml-2">
                                    (${(summary.expenses[0].cost / summary.expenses[0].quantity).toFixed(2)}/unit)
                                  </span>
                                )}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {summary.expenses[0].date ? new Date(summary.expenses[0].date).toLocaleDateString() : "No date"}
                                {summary.expenses[0].quantity && summary.expenses[0].quantity > 0 && (
                                  <> • Qty: {summary.expenses[0].quantity}</>
                                )}
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleEditClick(summary.expenses[0])}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={() => handleDeleteClick(summary.expenses[0])}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        )}
                        {hasMultiple && (
                          <div className="text-right">
                            <p className="text-2xl font-bold">${summary.totalSpent.toFixed(2)}</p>
                            <p className="text-xs text-muted-foreground">Total Spent</p>
                          </div>
                        )}
                      </div>

                      {/* Expanded Purchase List */}
                      {hasMultiple && isExpanded && (
                        <div className="border-t pt-4 space-y-3">
                          {summary.expenses.map((expense) => (
                            <div
                              key={expense.id}
                              className="flex items-center justify-between p-3 bg-muted/50 rounded-md"
                            >
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-1">
                                  <p className="font-medium">
                                    ${expense.cost.toFixed(2)}
                                    {expense.quantity && expense.quantity > 0 && (
                                      <span className="text-muted-foreground font-normal ml-2">
                                        (${(expense.cost / expense.quantity).toFixed(2)}/unit)
                                      </span>
                                    )}
                                  </p>
                                  {expense.isRecurring && (
                                    <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-0.5 rounded">
                                      Recurring
                                    </span>
                                  )}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  <p>Date: {expense.date ? new Date(expense.date).toLocaleDateString() : "No date"}</p>
                                  {expense.quantity && expense.quantity > 0 && (
                                    <p>Quantity: {expense.quantity}</p>
                                  )}
                                  {expense.isRecurring && expense.startDate && (
                                    <p>Start: {new Date(expense.startDate).toLocaleDateString()}</p>
                                  )}
                                  {expense.isRecurring && expense.endDate && (
                                    <p>End: {new Date(expense.endDate).toLocaleDateString()}</p>
                                  )}
                                  {expense.isRecurring && (
                                    <p>{formatRecurringLabel(expense)}</p>
                                  )}
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => handleEditClick(expense)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                  onClick={() => handleDeleteClick(expense)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}

        {/* Add Expense Dialog */}
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Expense</DialogTitle>
              <DialogDescription>
                Add a new one-time expense.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Date (Optional)</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-between text-left font-normal",
                        !date && "text-muted-foreground"
                      )}
                    >
                      {date ? date.toLocaleDateString() : <span>No date selected</span>}
                      <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={date || undefined}
                      onSelect={(newDate) => setDate(newDate || null)}
                      captionLayout="dropdown"
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                {date && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDate(null)}
                    className="text-xs text-muted-foreground"
                  >
                    Clear date
                  </Button>
                )}
              </div>
              <div className="space-y-2">
                <Label>Item</Label>
                <Input
                  value={item}
                  onChange={(e) => setItem(e.target.value)}
                  placeholder="Enter item name"
                />
              </div>
              <div className="space-y-2">
                <Label>Cost ($)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={cost}
                  onChange={(e) => setCost(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label>Quantity (Optional)</Label>
                <Input
                  type="number"
                  step="1"
                  min="0"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="Leave blank if not applicable"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddExpense} disabled={submitting}>
                {submitting ? "Adding..." : "Add Expense"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add Recurring Expense Dialog */}
        <Dialog open={isRecurringDialogOpen} onOpenChange={setIsRecurringDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Recurring Expense</DialogTitle>
              <DialogDescription>
                Add a new recurring expense that repeats on a schedule.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-between text-left font-normal",
                        !recurringDate && "text-muted-foreground"
                      )}
                    >
                      {recurringDate ? recurringDate.toLocaleDateString() : <span>Pick a date</span>}
                      <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={recurringDate}
                      onSelect={(newDate) => newDate && setRecurringDate(newDate)}
                      captionLayout="dropdown"
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label>Item</Label>
                <Input
                  value={recurringItem}
                  onChange={(e) => setRecurringItem(e.target.value)}
                  placeholder="Enter item name"
                />
              </div>
              <div className="space-y-2">
                <Label>Cost ($)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={recurringCost}
                  onChange={(e) => setRecurringCost(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label>Quantity (Optional)</Label>
                <Input
                  type="number"
                  step="1"
                  min="0"
                  value={recurringQuantity}
                  onChange={(e) => setRecurringQuantity(e.target.value)}
                  placeholder="Leave blank if not applicable"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Every</Label>
                  <Input
                    type="number"
                    min="1"
                    value={recurringEvery}
                    onChange={(e) => setRecurringEvery(e.target.value)}
                    placeholder="1"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Interval</Label>
                  <Select value={recurringInterval} onValueChange={setRecurringInterval}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {RECURRING_INTERVALS.map((interval) => (
                        <SelectItem key={interval.value} value={interval.value}>
                          {interval.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>End Date (Optional)</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-between text-left font-normal",
                        !recurringEndDate && "text-muted-foreground"
                      )}
                    >
                      {recurringEndDate ? recurringEndDate.toLocaleDateString() : <span>No end date (ongoing)</span>}
                      <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={recurringEndDate || undefined}
                      onSelect={(newDate) => setRecurringEndDate(newDate || null)}
                      captionLayout="dropdown"
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                {recurringEndDate && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setRecurringEndDate(null)}
                    className="text-xs text-muted-foreground"
                  >
                    Clear end date
                  </Button>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsRecurringDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddRecurringExpense} disabled={submitting}>
                {submitting ? "Adding..." : "Add Recurring Expense"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Expense Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Expense</DialogTitle>
              <DialogDescription>
                {editingExpense?.isRecurring ? "Update the recurring expense details." : "Update the expense details."}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {editingExpense?.isRecurring ? (
                <>
                  <div className="space-y-2">
                    <Label>Start Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-between text-left font-normal",
                            !recurringDate && "text-muted-foreground"
                          )}
                        >
                          {recurringDate ? recurringDate.toLocaleDateString() : <span>Pick a date</span>}
                          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={recurringDate}
                          onSelect={(newDate) => newDate && setRecurringDate(newDate)}
                          captionLayout="dropdown"
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    {date && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDate(null)}
                        className="text-xs text-muted-foreground"
                      >
                        Clear date
                      </Button>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Item</Label>
                    <Input
                      value={recurringItem}
                      onChange={(e) => setRecurringItem(e.target.value)}
                      placeholder="Enter item name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Cost ($)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={recurringCost}
                      onChange={(e) => setRecurringCost(e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Quantity (Optional)</Label>
                    <Input
                      type="number"
                      step="1"
                      min="0"
                      value={recurringQuantity}
                      onChange={(e) => setRecurringQuantity(e.target.value)}
                      placeholder="Leave blank if not applicable"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Every</Label>
                      <Input
                        type="number"
                        min="1"
                        value={recurringEvery}
                        onChange={(e) => setRecurringEvery(e.target.value)}
                        placeholder="1"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Interval</Label>
                      <Select value={recurringInterval} onValueChange={setRecurringInterval}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {RECURRING_INTERVALS.map((interval) => (
                            <SelectItem key={interval.value} value={interval.value}>
                              {interval.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label>Date (Optional)</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-between text-left font-normal",
                            !date && "text-muted-foreground"
                          )}
                        >
                          {date ? date.toLocaleDateString() : <span>No date selected</span>}
                          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={date || undefined}
                          onSelect={(newDate) => setDate(newDate || null)}
                          captionLayout="dropdown"
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    {date && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDate(null)}
                        className="text-xs text-muted-foreground"
                      >
                        Clear date
                      </Button>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Item</Label>
                    <Input
                      value={item}
                      onChange={(e) => setItem(e.target.value)}
                      placeholder="Enter item name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Cost ($)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={cost}
                      onChange={(e) => setCost(e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                </>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpdateExpense} disabled={submitting}>
                {submitting ? "Updating..." : "Update Expense"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Expense</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this expense? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
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

