"use client"

import { useEffect, useMemo, useState } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"
import { Plus, ArrowRight, ArrowLeft, Trash2 } from "lucide-react"
import { format } from "date-fns"

type TaskStatus = "backlog" | "in_progress" | "completed"
type TaskPriority = "low" | "medium" | "high"

interface Task {
  id: string
  title: string
  description: string
  status: TaskStatus
  priority: TaskPriority
  dueDate: string | null
  createdAt: string
}

const STATUS_COLUMNS: { key: TaskStatus; label: string }[] = [
  { key: "backlog", label: "Backlog" },
  { key: "in_progress", label: "In Progress" },
  { key: "completed", label: "Completed" },
]

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [description, setDescription] = useState("")
  const [priority, setPriority] = useState<TaskPriority>("medium")
  const [dueDate, setDueDate] = useState<Date | null>(null)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null)

  useEffect(() => {
    fetchTasks()
  }, [])

  const fetchTasks = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/tasks")
      if (response.ok) {
        const data = await response.json()
        setTasks(data)
      }
    } catch (error) {
      console.error("Error fetching tasks:", error)
    } finally {
      setLoading(false)
    }
  }

  const groupedTasks = useMemo(() => {
    const groups: Record<TaskStatus, Task[]> = {
      backlog: [],
      in_progress: [],
      completed: [],
    }
    for (const task of tasks) {
      groups[task.status ?? "backlog"].push(task)
    }
    return groups
  }, [tasks])

  const handleCreateTask = async () => {
    if (!description.trim()) return

    try {
      setSubmitting(true)
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          description: description.trim(),
          priority,
          dueDate: dueDate ? dueDate.toISOString() : null,
        }),
      })

      if (response.ok) {
        setDescription("")
        setPriority("medium")
        setDueDate(null)
        setIsAddOpen(false)
        await fetchTasks()
      } else {
        const data = await response.json()
        console.error("Failed to create task:", data)
      }
    } catch (error) {
      console.error("Error creating task:", error)
    } finally {
      setSubmitting(false)
    }
  }

  const moveTask = async (task: Task, direction: "left" | "right") => {
    const order: TaskStatus[] = ["backlog", "in_progress", "completed"]
    const currentIndex = order.indexOf(task.status)
    const nextIndex =
      direction === "left" ? Math.max(0, currentIndex - 1) : Math.min(order.length - 1, currentIndex + 1)
    const nextStatus = order[nextIndex]

    if (nextStatus === task.status) return

    try {
      const response = await fetch("/api/tasks", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: task.id,
          status: nextStatus,
        }),
      })

      if (response.ok) {
        setTasks((prev) =>
          prev.map((t) => (t.id === task.id ? { ...t, status: nextStatus } : t))
        )
      } else {
        const data = await response.json()
        console.error("Failed to update task:", data)
      }
    } catch (error) {
      console.error("Error updating task:", error)
    }
  }

  const openDeleteDialog = (task: Task) => {
    setTaskToDelete(task)
    setDeleteConfirmOpen(true)
  }

  const handleDeleteTask = async () => {
    if (!taskToDelete) return

    try {
      const response = await fetch(`/api/tasks?id=${taskToDelete.id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        setTasks((prev) => prev.filter((t) => t.id !== taskToDelete.id))
        setDeleteConfirmOpen(false)
        setTaskToDelete(null)
      } else {
        const data = await response.json()
        console.error("Failed to delete task:", data)
      }
    } catch (error) {
      console.error("Error deleting task:", error)
    }
  }

  const priorityBadgeClasses = (p: TaskPriority) => {
    if (p === "high") {
      return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
    }
    if (p === "medium") {
      return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
    }
    return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Tasks</h1>
          <Button onClick={() => setIsAddOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Task
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {STATUS_COLUMNS.map((col) => (
            <Card key={col.key} className="flex flex-col max-h-[75vh]">
              <CardHeader className="flex-shrink-0">
                <div className="flex items-center justify-between">
                  <CardTitle>{col.label}</CardTitle>
                  <span className="text-xs text-muted-foreground">
                    {groupedTasks[col.key].length} task
                    {groupedTasks[col.key].length === 1 ? "" : "s"}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="flex-1 min-h-0 overflow-y-auto space-y-3">
                {loading && <p className="text-xs text-muted-foreground">Loading tasks...</p>}
                {!loading && groupedTasks[col.key].length === 0 && (
                  <p className="text-xs text-muted-foreground italic">No tasks here.</p>
                )}
                {groupedTasks[col.key].map((task) => (
                  <div
                    key={task.id}
                    className="border rounded-md p-3 bg-card/70 dark:bg-card/70 flex flex-col gap-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium text-sm line-clamp-2">{task.title}</p>
                      <span
                        className={cn(
                          "px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase",
                          priorityBadgeClasses(task.priority)
                        )}
                      >
                        {task.priority}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-3 whitespace-pre-line">
                      {task.description}
                    </p>
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground mt-1">
                      <span>
                        Created{" "}
                        {task.createdAt
                          ? new Date(task.createdAt).toLocaleDateString()
                          : "N/A"}
                      </span>
                      {task.dueDate && (
                        <span>
                          Due {new Date(task.dueDate).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between mt-2 gap-2">
                      <div className="flex gap-1">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7"
                          disabled={task.status === "backlog"}
                          onClick={() => moveTask(task, "left")}
                        >
                          <ArrowLeft className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7"
                          disabled={task.status === "completed"}
                          onClick={() => moveTask(task, "right")}
                        >
                          <ArrowRight className="h-3 w-3" />
                        </Button>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-red-500 hover:text-red-600"
                        onClick={() => openDeleteDialog(task)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* New Task Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>New Task</DialogTitle>
            <DialogDescription>
              Create a task in the backlog. You can move it between columns as it progresses.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="description">Task description</Label>
              <textarea
                id="description"
                className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder="Describe what needs to be done..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select
                  value={priority}
                  onValueChange={(value) => setPriority(value as TaskPriority)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Due date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !dueDate && "text-muted-foreground"
                      )}
                    >
                      {dueDate ? format(dueDate, "PPP") : "Pick a date (optional)"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dueDate ?? undefined}
                      onSelect={(d) => setDueDate(d ?? null)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsAddOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateTask}
              disabled={!description.trim() || submitting}
            >
              {submitting ? "Creating..." : "Create Task"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="sm:max-w-[380px]">
          <DialogHeader>
            <DialogTitle>Delete task</DialogTitle>
            <DialogDescription>
              This will permanently remove the task. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <p className="text-sm">
              Are you sure you want to delete{" "}
              <span className="font-medium">
                {taskToDelete?.title || "this task"}
              </span>
              ?
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteConfirmOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteTask}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  )
}

