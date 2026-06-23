"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import {
  Bell,
  Building2,
  GaugeCircle,
  GitCompare,
  Landmark,
  LayoutDashboard,
  ListChecks,
  Network,
  Activity,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { api, IS_DEMO } from "@/lib/api"
import { ThemeToggle } from "@/components/theme-toggle"
import {
  CommandPaletteProvider,
  CommandTrigger,
} from "@/components/command-palette"
import { Badge } from "@/components/ui/badge"

const NAV = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Companies", href: "/companies", icon: Building2 },
  { label: "Investors", href: "/investors", icon: Landmark },
  { label: "Network", href: "/network", icon: Network },
  { label: "Compare", href: "/compare", icon: GitCompare },
  { label: "Watchlists", href: "/watchlists", icon: ListChecks },
  { label: "Alerts", href: "/alerts", icon: Bell },
  { label: "Calibration", href: "/calibration", icon: GaugeCircle },
]

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <CommandPaletteProvider>
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar />
          <main className="flex-1 px-6 py-6">
            <div className="mx-auto max-w-[1400px]">{children}</div>
          </main>
        </div>
      </div>
    </CommandPaletteProvider>
  )
}

function Sidebar() {
  const pathname = usePathname()
  const { data: alerts = [] } = useQuery({
    queryKey: ["alerts"],
    queryFn: () => api.listAlerts(),
  })
  const unread = alerts.filter((a) => !a.read_at).length

  return (
    <aside className="sticky top-0 hidden h-screen w-56 shrink-0 flex-col border-r bg-card/40 md:flex">
      <Link href="/dashboard" className="flex items-center gap-2 px-4 py-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <Activity className="h-4 w-4" />
        </div>
        <div className="leading-tight">
          <div className="text-sm font-semibold">KCI</div>
          <div className="text-2xs text-muted-foreground">
            Korean Company Intel
          </div>
        </div>
      </Link>

      <nav className="flex-1 space-y-0.5 px-2 py-2">
        {NAV.map((n) => {
          const active =
            pathname === n.href ||
            (n.href !== "/dashboard" && pathname.startsWith(n.href))
          return (
            <Link
              key={n.href}
              href={n.href}
              className={cn(
                "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              <n.icon className="h-4 w-4" />
              {n.label}
              {n.href === "/alerts" && unread > 0 && (
                <Badge variant="destructive" className="ml-auto">
                  {unread}
                </Badge>
              )}
            </Link>
          )
        })}
      </nav>

      <div className="border-t px-4 py-3 text-2xs text-muted-foreground">
        <p>System of record: assertions.</p>
        <p>Confidence is computed, never claimed.</p>
      </div>
    </aside>
  )
}

function Topbar() {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-background/80 px-6 backdrop-blur">
      <div className="flex-1">
        <CommandTrigger />
      </div>
      <Badge variant="muted" className="hidden sm:inline-flex">
        {IS_DEMO ? "Demo · mock data" : "Live · API"}
      </Badge>
      <ThemeToggle />
    </header>
  )
}
