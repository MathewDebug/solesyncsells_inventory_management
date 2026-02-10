"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Package, 
  Store,
  Box,
  LogOut,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  ScrollText,
  ListChecks,
  BarChart3,
} from "lucide-react"
import { signOut, useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { ThemeToggle } from "@/components/theme-toggle"

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Tasks", href: "/tasks", icon: ListChecks },
  { name: "Sales", href: "/sales", icon: BarChart3 },
  { name: "Orders", href: "/orders", icon: ShoppingCart },
  { name: "Inventory", href: "/inventory", icon: Package },
  { name: "Stores", href: "/stores", icon: Store },
  { name: "Products", href: "/products", icon: Box },
  { name: "Expenses", href: "/expenses", icon: DollarSign },
  { name: "Logs", href: "/logs", icon: ScrollText },
]

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const { data: session } = useSession()

  const handleLogout = async () => {
    await signOut({ redirect: false })
    router.push("/login")
  }

  const userInitials = session?.user?.name
    ? session.user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : session?.user?.email
    ? session.user.email[0].toUpperCase()
    : "U"

  return (
    <div className={cn(
      "flex h-screen flex-col border-r bg-card dark:bg-card border-gray-200 dark:border-border transition-all duration-300 shadow-sm",
      collapsed ? "w-16" : "w-64"
    )}>
      {/* Header */}
      <div className="flex h-16 items-center justify-between border-b border-gray-200 dark:border-border px-4 bg-card dark:bg-card">
        {!collapsed && (
          <h2 className="text-lg font-semibold text-foreground dark:text-foreground">SoleSync Sells</h2>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 hover:bg-accent dark:hover:bg-accent"
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-3 overflow-y-auto">
        <TooltipProvider delayDuration={0}>
          {navigation.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            return (
              <Tooltip key={item.name}>
                <TooltipTrigger asChild>
                  <Link href={item.href} className="block">
                    <Button
                      variant={isActive ? "default" : "ghost"}
                      className={cn(
                        "w-full transition-all duration-200",
                        collapsed ? "justify-center px-2" : "justify-start",
                        isActive 
                          ? "bg-primary dark:bg-foreground text-primary-foreground dark:text-background hover:bg-primary/90 dark:hover:bg-accent shadow-sm font-medium" 
                          : "text-foreground dark:text-foreground hover:bg-accent dark:hover:bg-accent"
                      )}
                    >
                      <Icon className={cn("h-4 w-4 flex-shrink-0", !collapsed && "mr-2")} />
                      {!collapsed && <span className="truncate">{item.name}</span>}
                    </Button>
                  </Link>
                </TooltipTrigger>
                {collapsed && (
                  <TooltipContent side="right" className="z-50">
                    <p>{item.name}</p>
                  </TooltipContent>
                )}
              </Tooltip>
            )
          })}
        </TooltipProvider>
      </nav>

      {/* Footer */}
      <div className="border-t border-gray-200 dark:border-border space-y-2 p-3 bg-card dark:bg-card">
        {session?.user && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className={cn(
                  "flex items-center gap-3 px-2 py-2 rounded-md hover:bg-accent dark:hover:bg-accent transition-colors",
                  collapsed ? "justify-center" : "justify-start"
                )}>
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    <AvatarImage src="" alt={session?.user?.name || "User"} />
                    <AvatarFallback className="bg-secondary dark:bg-secondary text-foreground dark:text-foreground text-xs">
                      {userInitials}
                    </AvatarFallback>
                  </Avatar>
                  {!collapsed && (
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate text-foreground dark:text-foreground">
                        {session.user.name || "User"}
                      </p>
                      <p className="text-xs text-muted-foreground dark:text-muted-foreground truncate">
                        {session.user.email}
                      </p>
                    </div>
                  )}
                </div>
              </TooltipTrigger>
              {collapsed && (
                <TooltipContent side="right" className="z-50">
                  <div>
                    <p className="font-medium">{session.user.name || "User"}</p>
                    <p className="text-xs text-muted-foreground">{session.user.email}</p>
                  </div>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        )}
        <ThemeToggle collapsed={collapsed} />
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                className={cn(
                  "w-full text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-accent transition-all duration-200",
                  collapsed ? "justify-center px-2" : "justify-start"
                )}
                onClick={handleLogout}
              >
                <LogOut className={cn("h-4 w-4 flex-shrink-0", !collapsed && "mr-2")} />
                {!collapsed && <span>Logout</span>}
              </Button>
            </TooltipTrigger>
            {collapsed && (
              <TooltipContent side="right" className="z-50">
                <p>Logout</p>
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  )
}

