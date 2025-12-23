"use client"

import { Sidebar } from "@/components/sidebar"

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-background dark:bg-background">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-6 bg-background dark:bg-background">{children}</main>
    </div>
  )
}

