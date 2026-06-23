"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
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
  Search,
} from "lucide-react"
import { api } from "@/lib/api"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { SourceTierBadge } from "@/components/source-badge"
import { formatKRWShort } from "@/lib/utils"

const NAV = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Company Search", href: "/companies", icon: Building2 },
  { label: "Investors", href: "/investors", icon: Landmark },
  { label: "Network", href: "/network", icon: Network },
  { label: "Compare", href: "/compare", icon: GitCompare },
  { label: "Watchlists", href: "/watchlists", icon: ListChecks },
  { label: "Alerts", href: "/alerts", icon: Bell },
  { label: "Calibration", href: "/calibration", icon: GaugeCircle },
]

const PaletteContext = React.createContext<{ open: () => void }>({
  open: () => {},
})

export function useCommandPalette() {
  return React.useContext(PaletteContext)
}

export function CommandPaletteProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [open, setOpen] = React.useState(false)
  const router = useRouter()
  const { data: companies = [] } = useQuery({
    queryKey: ["search-index"],
    queryFn: () => api.searchIndex(),
  })
  const { data: investors = [] } = useQuery({
    queryKey: ["investors-index"],
    queryFn: () => api.listInvestors(),
  })

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((o) => !o)
      }
    }
    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  const go = (href: string) => {
    setOpen(false)
    router.push(href)
  }

  return (
    <PaletteContext.Provider value={{ open: () => setOpen(true) }}>
      {children}
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="기업 검색 또는 이동… (회사명, 영문명, 별칭)" />
        <CommandList>
          <CommandEmpty>결과 없음</CommandEmpty>
          <CommandGroup heading="Navigate">
            {NAV.map((n) => (
              <CommandItem
                key={n.href}
                value={`nav ${n.label}`}
                onSelect={() => go(n.href)}
              >
                <n.icon className="h-4 w-4 text-muted-foreground" />
                {n.label}
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandGroup heading="Companies">
            {companies.map((c) => (
              <CommandItem
                key={c.id}
                value={`${c.canonical_name_ko} ${c.canonical_name_en} ${c.aliases.join(" ")} ${c.sector}`}
                onSelect={() => go(`/companies/${c.id}`)}
              >
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{c.canonical_name_ko}</span>
                <span className="text-xs text-muted-foreground">
                  {c.canonical_name_en}
                </span>
                <span className="ml-auto flex items-center gap-2 text-2xs text-muted-foreground">
                  {c.is_dart_anchored && <SourceTierBadge tier={0} official />}
                  {c.latest_valuation_krw
                    ? formatKRWShort(c.latest_valuation_krw)
                    : c.stage}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandGroup heading="Investors">
            {investors.map((inv) => (
              <CommandItem
                key={inv.name}
                value={`investor ${inv.name}`}
                onSelect={() => go(`/investors/${encodeURIComponent(inv.name)}`)}
              >
                <Landmark className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{inv.name}</span>
                <span className="ml-auto text-2xs text-muted-foreground tnum">
                  {inv.companyCount}개사
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </PaletteContext.Provider>
  )
}

/** Topbar search affordance that opens the palette. */
export function CommandTrigger() {
  const { open } = useCommandPalette()
  return (
    <button
      onClick={open}
      className="flex h-9 w-full max-w-sm items-center gap-2 rounded-md border border-input bg-background/60 px-3 text-sm text-muted-foreground transition-colors hover:bg-accent"
    >
      <Search className="h-4 w-4" />
      <span>기업 검색…</span>
      <kbd className="ml-auto rounded border bg-muted px-1.5 py-0.5 font-mono text-2xs">
        ⌘K
      </kbd>
    </button>
  )
}
