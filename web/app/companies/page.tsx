"use client"

import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import { Search, SlidersHorizontal, X, ArrowUpDown, Building2 } from "lucide-react"
import { mockApi, type CompanyFilters } from "@/lib/mock-api"
import type { CompanyListItem, CompanyStage } from "@/lib/types"
import { STAGE_ORDER } from "@/lib/format"
import { CompanyCard } from "@/components/company-card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

// ── sort options ────────────────────────────────────────────────────────────
type SortKey = "valuation_desc" | "name_asc" | "events_desc" | "confidence_desc"

const SORT_LABELS: Record<SortKey, string> = {
  valuation_desc: "Valuation ↓",
  name_asc: "Name A–Z",
  events_desc: "Most Events",
  confidence_desc: "Confidence ↓",
}

function sortCompanies(items: CompanyListItem[], key: SortKey): CompanyListItem[] {
  return [...items].sort((a, b) => {
    switch (key) {
      case "valuation_desc":
        return (b.latest_valuation_krw ?? 0) - (a.latest_valuation_krw ?? 0)
      case "name_asc":
        return a.canonical_name_ko.localeCompare(b.canonical_name_ko, "ko")
      case "events_desc":
        return b.event_count - a.event_count
      case "confidence_desc":
        return (b.valuation_confidence ?? 0) - (a.valuation_confidence ?? 0)
    }
  })
}

// ── confidence filter options ───────────────────────────────────────────────
const CONF_OPTIONS: { label: string; value: number }[] = [
  { label: "Any", value: 0 },
  { label: "≥ 50%", value: 0.5 },
  { label: "≥ 80%", value: 0.8 },
  { label: "≥ 90%", value: 0.9 },
]

// ── loading skeleton ────────────────────────────────────────────────────────
function SearchSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Skeleton className="h-9 w-full" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-28" />
          <Skeleton className="h-8 w-28" />
          <Skeleton className="h-8 w-32" />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 9 }).map((_, i) => (
          <Skeleton key={i} className="h-[180px] w-full rounded-lg" />
        ))}
      </div>
    </div>
  )
}

// ── filter pill ─────────────────────────────────────────────────────────────
function FilterPill({
  label,
  onRemove,
}: {
  label: string
  onRemove: () => void
}) {
  return (
    <button
      onClick={onRemove}
      className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/8 px-2.5 py-0.5 text-2xs font-medium text-primary transition-colors hover:bg-primary/15"
    >
      {label}
      <X className="h-3 w-3" />
    </button>
  )
}

// ── main page ───────────────────────────────────────────────────────────────
export default function CompaniesPage() {
  const [query, setQuery] = React.useState("")
  const [sectors, setSectors] = React.useState<string[]>([])
  const [stages, setStages] = React.useState<string[]>([])
  const [minConfidence, setMinConfidence] = React.useState(0)
  const [sort, setSort] = React.useState<SortKey>("valuation_desc")

  // Build debounced filters: for query we use a 150ms debounce
  const [debouncedQuery, setDebouncedQuery] = React.useState("")
  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 150)
    return () => clearTimeout(t)
  }, [query])

  const filters: CompanyFilters = {
    query: debouncedQuery || undefined,
    sectors: sectors.length ? sectors : undefined,
    stages: stages.length ? stages : undefined,
    minConfidence: minConfidence || undefined,
  }

  // Fetch all companies to derive available facets
  const { data: allCompanies } = useQuery({
    queryKey: ["companies"],
    queryFn: () => mockApi.listCompanies(),
  })

  // Fetch filtered results
  const { data: results, isLoading } = useQuery({
    queryKey: ["companies-search", filters],
    queryFn: () => mockApi.searchCompanies(filters),
  })

  const allSectors = React.useMemo(() => {
    if (!allCompanies) return []
    return [...new Set(allCompanies.map((c) => c.sector))].sort()
  }, [allCompanies])

  const allStages = React.useMemo(() => {
    if (!allCompanies) return []
    const present = new Set(allCompanies.map((c) => c.stage))
    return STAGE_ORDER.filter((s) => present.has(s as CompanyStage))
  }, [allCompanies])

  const sorted = React.useMemo(
    () => (results ? sortCompanies(results, sort) : []),
    [results, sort]
  )

  const hasFilters =
    sectors.length > 0 || stages.length > 0 || minConfidence > 0

  function clearAll() {
    setSectors([])
    setStages([])
    setMinConfidence(0)
  }

  function toggleSector(s: string) {
    setSectors((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    )
  }

  function toggleStage(s: string) {
    setStages((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    )
  }

  const activeConfLabel =
    CONF_OPTIONS.find((o) => o.value === minConfidence)?.label ?? "Any"

  return (
    <div className="space-y-5">
      {/* ── Page header ──────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            기업 검색{" "}
            <span className="text-muted-foreground font-normal text-base">
              / Company Search
            </span>
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {allCompanies
              ? `${allCompanies.length}개 기업 데이터베이스`
              : "데이터베이스 로딩 중…"}
          </p>
        </div>
        {results != null && (
          <Badge variant="muted" className="mt-1.5 shrink-0">
            <Building2 className="h-3 w-3" />
            {results.length.toLocaleString()} 결과
          </Badge>
        )}
      </div>

      {/* ── Search + filter bar ───────────────────────────────────────── */}
      <div className="space-y-2.5">
        {/* Search input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="기업명, 영문명, 섹터로 검색…"
            className="pl-9 h-10"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Filter controls row */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Sector multi-select */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "h-8 gap-1.5",
                  sectors.length > 0 && "border-primary/50 bg-primary/6 text-primary"
                )}
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                섹터
                {sectors.length > 0 && (
                  <Badge variant="default" className="h-4 px-1 py-0 text-2xs">
                    {sectors.length}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-52">
              <DropdownMenuLabel>섹터 / Sector</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {allSectors.map((s) => (
                <DropdownMenuCheckboxItem
                  key={s}
                  checked={sectors.includes(s)}
                  onCheckedChange={() => toggleSector(s)}
                >
                  {s}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Stage multi-select */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "h-8 gap-1.5",
                  stages.length > 0 && "border-primary/50 bg-primary/6 text-primary"
                )}
              >
                스테이지
                {stages.length > 0 && (
                  <Badge variant="default" className="h-4 px-1 py-0 text-2xs">
                    {stages.length}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-44">
              <DropdownMenuLabel>스테이지 / Stage</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {allStages.map((s) => (
                <DropdownMenuCheckboxItem
                  key={s}
                  checked={stages.includes(s)}
                  onCheckedChange={() => toggleStage(s)}
                >
                  {s}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Min confidence */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "h-8",
                  minConfidence > 0 && "border-conf-high/50 bg-conf-high/6 text-conf-high"
                )}
              >
                신뢰도 {minConfidence > 0 ? activeConfLabel : "≥ Any"}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-36">
              <DropdownMenuLabel>최소 신뢰도</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {CONF_OPTIONS.map((o) => (
                <DropdownMenuItem
                  key={o.value}
                  onClick={() => setMinConfidence(o.value)}
                  className={cn(
                    minConfidence === o.value && "bg-accent font-medium"
                  )}
                >
                  {o.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Sort */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 gap-1.5 ml-auto">
                <ArrowUpDown className="h-3.5 w-3.5" />
                {SORT_LABELS[sort]}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuLabel>정렬 / Sort</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {(Object.keys(SORT_LABELS) as SortKey[]).map((k) => (
                <DropdownMenuItem
                  key={k}
                  onClick={() => setSort(k)}
                  className={cn(sort === k && "bg-accent font-medium")}
                >
                  {SORT_LABELS[k]}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Clear all */}
          {hasFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAll}
              className="h-8 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
              필터 초기화
            </Button>
          )}
        </div>

        {/* Active filter pills */}
        {hasFilters && (
          <div className="flex flex-wrap gap-1.5">
            {sectors.map((s) => (
              <FilterPill
                key={s}
                label={s}
                onRemove={() => toggleSector(s)}
              />
            ))}
            {stages.map((s) => (
              <FilterPill
                key={s}
                label={s}
                onRemove={() => toggleStage(s)}
              />
            ))}
            {minConfidence > 0 && (
              <FilterPill
                label={`신뢰도 ${activeConfLabel}`}
                onRemove={() => setMinConfidence(0)}
              />
            )}
          </div>
        )}
      </div>

      {/* ── Results grid ─────────────────────────────────────────────── */}
      {isLoading ? (
        <SearchSkeleton />
      ) : sorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
          <Building2 className="h-10 w-10 text-muted-foreground/40" />
          <div>
            <p className="text-sm font-medium">검색 결과가 없습니다</p>
            <p className="mt-1 text-sm text-muted-foreground">
              검색어 또는 필터 조건을 변경해보세요.
            </p>
          </div>
          {(query || hasFilters) && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setQuery("")
                clearAll()
              }}
            >
              모두 초기화
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {sorted.map((company) => (
            <CompanyCard key={company.id} company={company} />
          ))}
        </div>
      )}
    </div>
  )
}
