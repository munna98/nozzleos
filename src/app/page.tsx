"use client"

import { useAuth } from "@/lib/auth-context"
import { ActiveShiftsPanel } from "./components/ActiveShiftsPanel"
import { PendingVerificationsPanel } from "./components/PendingVerificationsPanel"
import { FuelRatesPanel } from "./components/FuelRatesPanel"
import { RecentActivityFeed } from "./components/RecentActivityFeed"
import { StaffPerformanceChart } from "./components/StaffPerformanceChart"
import { QuickLinksCard } from "./components/QuickLinksCard"

export default function DashboardPage() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'Admin' || user?.role === 'Manager'

  if (!isAdmin) {
    return (
      <div className="container mx-auto py-10 px-4">
        <h1 className="text-2xl font-bold">Welcome, {user?.name || user?.username}</h1>
        <p className="text-muted-foreground mt-2">
          Please use the sidebar menu to navigate.
        </p>
        {/* Employee dashboard specific content could go here if needed, 
                    but sticking to admin dashboard as requested */}
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4 space-y-8">
      <div className="flex flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Dashboard</h1>
        </div>
        <div className="text-xs md:text-sm text-muted-foreground bg-muted px-3 py-1 rounded-full whitespace-nowrap">
          <span className="md:hidden">
            {new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
          </span>
          <span className="hidden md:inline">
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </span>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Left Column - Operational Status */}
        <div className="space-y-6 lg:row-span-2">
          <ActiveShiftsPanel />
          <PendingVerificationsPanel />
        </div>

        {/* Middle Column Top - Fuel Rates */}
        <div className="space-y-6">
          <FuelRatesPanel />
        </div>

        {/* Right Column Top - Quick Links */}
        <div className="space-y-6">
          <QuickLinksCard />
        </div>

        {/* Middle & Right Column Bottom - Activity Feed */}
        <div className="space-y-6 md:col-span-2 lg:col-span-2">
          <RecentActivityFeed />
        </div>

        {/* Bottom Section - Analytics */}
        <div className="md:col-span-2 lg:col-span-3">
          <StaffPerformanceChart />
        </div>
      </div>
    </div>
  )
}
