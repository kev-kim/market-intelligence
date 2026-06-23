"use client"

import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import {
  Search,
  X,
  ArrowUpDown,
  Building2,
  BookmarkPlus,
  Bookmark,
  Trash2,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
} from "lucide-react"
import { api, type CompanyFilters } from "@/lib/api"
import { CompanyCard } from "@/components/company-card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { Skeleton } from "@/components/ui/skeleton"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

// ── constants ────────────────────────────────────────────────────────────────

const RAISED_PRESETS = [
  { label: "<100억", min: undefined, max: 10_000_000_000 },
  { label: "100–1,000억", min: 10_000_000_000, max: 100_000_000_000 },
  { label: "1,000억+", min: 100_000_000_000, max: undefined },
] as const

const RECENCY_PRESETS = [
  { label: "90일", days: 90 },
  { label: "180일", days: 180 },
  { label: "1년", days: 365 },
] as const

const CONF_PRESETS = [
  { label: "Any", value: 0 },
  { label: "≥50%", value: 0.5 },
  { label: "≥80%", value: 0.8 },
  { label: "≥90%", value: 0.9 },
] as const

type SortOption = "valuation" | "raised" | "recency" | "name"

const SORT_LABELS: Record<SortOption, string> = {
  valuation: "밸류에이션 / Valuation",
  raised: "총 조달 / Raised",
  recency: "최신 이벤트 / Recency",
  name: "기업명 / Name",
}

// ── saved screen shape ───────────────────────────────────────────────────────

interface SavedScreen {
  id: string
  name: string
  filters: ActiveFilters
}

// ── filter state (separate from CompanyFilters for UI binding) ───────────────

interface ActiveFilters {
  query: string
  sectors: string[]
  stages: string[]
  regions: string[]
  raisedPreset: number | null // index into RAISED_PRESETS, or null
  raisedMin: number | undefined
  raisedMax: number | undefined
  foundedFrom: string
  foundedTo: string
  recencyDays: number | null
  minConfidence: number
  hasConflict: boolean
  sort: SortOption
}

const DEFAULT_FILTERS: ActiveFilters = {
  query: "",
  sectors: [],
  stages: [],
  regions: [],
  raisedPreset: null,
  raisedMin: undefined,
  raisedMax: undefined,
  foundedFrom: "",
  foundedTo: "",
  recencyDays: null,
  minConfidence: 0,
  hasConflict: false,
  sort: "valuation",
}

function filtersToApi(f: ActiveFilters): CompanyFilters {
  return {
    query: f.query.trim() || undefined,
    sectors: f.sectors.length ? f.sectors : undefined,
    stages: f.stages.length ? f.stages : undefined,
    regions: f.regions.length ? f.regions : undefined,
    raisedMin: f.raisedMin,
    raisedMax: f.raisedMax,
    foundedFrom: f.foundedFrom ? Number(f.foundedFrom) : undefined,
    foundedTo: f.foundedTo ? Number(f.foundedTo) : undefined,
    lastFundingWithinDays: f.recencyDays ?? undefined,
    minConfidence: f.minConfidence || undefined,
    hasConflict: f.hasConflict || undefined,
    sort: f.sort,
  }
}

function hasActiveFilters(f: ActiveFilters): boolean {
  return (
    f.query.trim() !== "" ||
    f.sectors.length > 0 ||
    f.stages.length > 0 ||
    f.regions.length > 0 ||
    f.raisedPreset !== null ||
    f.foundedFrom !== "" ||
    f.foundedTo !== "" ||
    f.recencyDays !== null ||
    f.minConfidence > 0 ||
    f.hasConflict
  )
}

// ── small helpers ────────────────────────────────────────────────────────────

function toggle<T>(arr: T[], item: T): T[] {
  return arr.includes(item) ? arr.filter((x) => x !== item) : [...arr, item]
}

// ── sub-components ───────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-2xs font-semibold uppercase tracking-widest text-muted-foreground/70 mb-1.5">
      {children}
    </p>
  )
}

function CheckItem({
  checked,
  label,
  onToggle,
}: {
  checked: boolean
  label: string
  onToggle: () => void
}) {
  return (
    <button
      onClick={onToggle}
      className={cn(
        "flex w-full items-center gap-2 rounded px-1.5 py-1 text-xs transition-colors hover:bg-accent",
        checked && "text-primary"
      )}
    >
      <span
        className={cn(
          "flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-sm border",
          checked
            ? "border-primary bg-primary text-primary-foreground"
            : "border-muted-foreground/40"
        )}
      >
        {checked && (
          <svg viewBox="0 0 10 10" className="h-2.5 w-2.5 fill-current">
            <path d="M1 5l3 3 5-5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
      <span className="truncate">{label}</span>
    </button>
  )
}

function PresetChips<T extends string | number>({
  options,
  active,
  onSelect,
  getLabel,
}: {
  options: readonly T[]
  active: T | null
  onSelect: (v: T | null) => void
  getLabel: (v: T) => string
}) {
  return (
    <div className="flex flex-wrap gap-1">
      {options.map((opt) => (
        <button
          key={String(opt)}
          onClick={() => onSelect(active === opt ? null : opt)}
          className={cn(
            "rounded-full border px-2 py-0.5 text-xs transition-colors",
            active === opt
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-transparent text-muted-foreground hover:border-primary/50 hover:text-foreground"
          )}
        >
          {getLabel(opt)}
        </button>
      ))}
    </div>
  )
}

function ResultSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 9 }).map((_, i) => (
        <Skeleton key={i} className="h-[180px] w-full rounded-lg" />
      ))}
    </div>
  )
}

// ── filter rail ──────────────────────────────────────────────────────────────

function FilterRail({
  filters,
  setFilters,
  facets,
  savedScreens,
  onSaveScreen,
  onLoadScreen,
  onDeleteScreen,
}: {
  filters: ActiveFilters
  setFilters: React.Dispatch<React.SetStateAction<ActiveFilters>>
  facets: { sectors: string[]; stages: string[]; regions: string[] } | undefined
  savedScreens: SavedScreen[]
  onSaveScreen: () => void
  onLoadScreen: (s: SavedScreen) => void
  onDeleteScreen: (id: string) => void
}) {
  const [sectorOpen, setSectorOpen] = React.useState(true)
  const [stageOpen, setStageOpen] = React.useState(true)
  const [regionOpen, setRegionOpen] = React.useState(false)

  function set<K extends keyof ActiveFilters>(key: K, value: ActiveFilters[K]) {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  const confLabel = CONF_PRESETS.find((p) => p.value === filters.minConfidence)?.label ?? "Any"
  const raisedIndex = filters.raisedPreset

  return (
    <aside className="flex w-full flex-col gap-4 lg:w-56 lg:shrink-0 xl:w-64">
      {/* save / load screens */}
      <div className="rounded-md border bg-card p-3">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs font-semibold text-foreground">스크린 저장</p>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 gap-1 px-1.5 text-2xs text-muted-foreground hover:text-foreground"
            onClick={onSaveScreen}
          >
            <BookmarkPlus className="h-3 w-3" />
            저장 / Save
          </Button>
        </div>
        {savedScreens.length === 0 ? (
          <p className="text-2xs text-muted-foreground/60">저장된 스크린이 없습니다</p>
        ) : (
          <div className="flex flex-col gap-1">
            {savedScreens.map((s) => (
              <div
                key={s.id}
                className="group flex items-center justify-between rounded px-1.5 py-1 hover:bg-accent"
              >
                <button
                  onClick={() => onLoadScreen(s)}
                  className="flex min-w-0 items-center gap-1.5 text-xs text-foreground"
                >
                  <Bookmark className="h-3 w-3 shrink-0 text-muted-foreground" />
                  <span className="truncate">{s.name}</span>
                </button>
                <button
                  onClick={() => onDeleteScreen(s.id)}
                  className="ml-1 hidden text-muted-foreground/50 hover:text-destructive group-hover:block"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* filter sections */}
      <div className="rounded-md border bg-card p-3 space-y-4">
        {/* Sector */}
        <div>
          <button
            className="flex w-full items-center justify-between"
            onClick={() => setSectorOpen((v) => !v)}
          >
            <SectionLabel>섹터 / Sector</SectionLabel>
            {sectorOpen ? (
              <ChevronUp className="h-3 w-3 text-muted-foreground/50" />
            ) : (
              <ChevronDown className="h-3 w-3 text-muted-foreground/50" />
            )}
          </button>
          {sectorOpen && (
            <div className="mt-1 space-y-0.5 max-h-48 overflow-y-auto">
              {(facets?.sectors ?? []).map((s) => (
                <CheckItem
                  key={s}
                  label={s}
                  checked={filters.sectors.includes(s)}
                  onToggle={() => set("sectors", toggle(filters.sectors, s))}
                />
              ))}
            </div>
          )}
        </div>

        <Separator />

        {/* Stage */}
        <div>
          <button
            className="flex w-full items-center justify-between"
            onClick={() => setStageOpen((v) => !v)}
          >
            <SectionLabel>스테이지 / Stage</SectionLabel>
            {stageOpen ? (
              <ChevronUp className="h-3 w-3 text-muted-foreground/50" />
            ) : (
              <ChevronDown className="h-3 w-3 text-muted-foreground/50" />
            )}
          </button>
          {stageOpen && (
            <div className="mt-1 space-y-0.5">
              {(facets?.stages ?? []).map((s) => (
                <CheckItem
                  key={s}
                  label={s}
                  checked={filters.stages.includes(s)}
                  onToggle={() => set("stages", toggle(filters.stages, s))}
                />
              ))}
            </div>
          )}
        </div>

        <Separator />

        {/* Region */}
        <div>
          <button
            className="flex w-full items-center justify-between"
            onClick={() => setRegionOpen((v) => !v)}
          >
            <SectionLabel>지역 / Region</SectionLabel>
            {regionOpen ? (
              <ChevronUp className="h-3 w-3 text-muted-foreground/50" />
            ) : (
              <ChevronDown className="h-3 w-3 text-muted-foreground/50" />
            )}
          </button>
          {regionOpen && (
            <div className="mt-1 space-y-0.5">
              {(facets?.regions ?? []).map((r) => (
                <CheckItem
                  key={r}
                  label={r}
                  checked={filters.regions.includes(r)}
                  onToggle={() => set("regions", toggle(filters.regions, r))}
                />
              ))}
            </div>
          )}
        </div>

        <Separator />

        {/* Total raised */}
        <div>
          <SectionLabel>총 조달액 / Total Raised</SectionLabel>
          <PresetChips
            options={[0, 1, 2] as const}
            active={raisedIndex}
            onSelect={(idx) => {
              if (idx === null) {
                set("raisedPreset", null)
                set("raisedMin", undefined)
                set("raisedMax", undefined)
              } else {
                const p = RAISED_PRESETS[idx]
                setFilters((prev) => ({
                  ...prev,
                  raisedPreset: idx,
                  raisedMin: p.min,
                  raisedMax: p.max,
                }))
              }
            }}
            getLabel={(idx) => RAISED_PRESETS[idx].label}
          />
        </div>

        <Separator />

        {/* Founded year */}
        <div>
          <SectionLabel>설립 연도 / Founded</SectionLabel>
          <div className="flex items-center gap-1.5">
            <Input
              type="number"
              placeholder="From"
              value={filters.foundedFrom}
              onChange={(e) => set("foundedFrom", e.target.value)}
              className="h-7 w-full text-xs tabular-nums"
              min={1990}
              max={2026}
            />
            <span className="shrink-0 text-xs text-muted-foreground">–</span>
            <Input
              type="number"
              placeholder="To"
              value={filters.foundedTo}
              onChange={(e) => set("foundedTo", e.target.value)}
              className="h-7 w-full text-xs tabular-nums"
              min={1990}
              max={2026}
            />
          </div>
        </div>

        <Separator />

        {/* Last funding recency */}
        <div>
          <SectionLabel>최근 투자 / Last Funding</SectionLabel>
          <PresetChips
            options={[90, 180, 365] as const}
            active={filters.recencyDays}
            onSelect={(v) => set("recencyDays", v)}
            getLabel={(days) =>
              RECENCY_PRESETS.find((p) => p.days === days)?.label ?? `${days}d`
            }
          />
        </div>

        <Separator />

        {/* Min confidence */}
        <div>
          <SectionLabel>최소 신뢰도 / Min Confidence</SectionLabel>
          <div className="flex gap-1 flex-wrap">
            {CONF_PRESETS.map((p) => (
              <button
                key={p.value}
                onClick={() => set("minConfidence", p.value)}
                className={cn(
                  "rounded-full border px-2 py-0.5 text-xs transition-colors",
                  filters.minConfidence === p.value
                    ? "border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    : "border-border text-muted-foreground hover:border-muted-foreground/50 hover:text-foreground"
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <Separator />

        {/* Has conflict toggle */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium">출처 불일치만</p>
            <p className="text-2xs text-muted-foreground">Has conflict</p>
          </div>
          <Switch
            checked={filters.hasConflict}
            onCheckedChange={(v) => set("hasConflict", v)}
          />
        </div>
      </div>

      {/* clear all */}
      {hasActiveFilters(filters) && (
        <Button
          variant="outline"
          size="sm"
          className="w-full h-8 gap-1.5 text-xs text-muted-foreground"
          onClick={() => setFilters(DEFAULT_FILTERS)}
        >
          <X className="h-3.5 w-3.5" />
          필터 초기화 / Clear all
        </Button>
      )}
    </aside>
  )
}

// ── main page ────────────────────────────────────────────────────────────────

export default function CompaniesPage() {
  const [filters, setFilters] = React.useState<ActiveFilters>(DEFAULT_FILTERS)
  const [debouncedQuery, setDebouncedQuery] = React.useState("")
  const [railOpen, setRailOpen] = React.useState(false)
  const [savedScreens, setSavedScreens] = React.useState<SavedScreen[]>([])
  const [screenSeq, setScreenSeq] = React.useState(1)

  // Seed filters from URL params on mount (e.g. dashboard "disputed facts" →
  // /companies?hasConflict=true). Applied post-mount to avoid hydration mismatch.
  React.useEffect(() => {
    const p = new URLSearchParams(window.location.search)
    if (![...p.keys()].length) return
    setFilters((f) => ({
      ...f,
      hasConflict: p.get("hasConflict") === "true" ? true : f.hasConflict,
      sectors: p.get("sector") ? [p.get("sector")!] : f.sectors,
      stages: p.get("stage") ? [p.get("stage")!] : f.stages,
      query: p.get("q") ?? f.query,
    }))
  }, [])

  // debounce query
  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(filters.query), 200)
    return () => clearTimeout(t)
  }, [filters.query])

  const apiFilters: CompanyFilters = filtersToApi({
    ...filters,
    query: debouncedQuery,
  })

  const { data: facets } = useQuery({
    queryKey: ["facets"],
    queryFn: () => api.getFacets(),
  })

  const { data: results, isLoading } = useQuery({
    queryKey: ["screener", apiFilters],
    queryFn: () => api.searchCompanies(apiFilters),
  })

  // saved screens
  function handleSaveScreen() {
    const name = `스크린 ${screenSeq}`
    setScreenSeq((n) => n + 1)
    setSavedScreens((prev) => [
      ...prev,
      { id: `screen-${Date.now()}`, name, filters: { ...filters } },
    ])
  }

  function handleLoadScreen(s: SavedScreen) {
    setFilters({ ...s.filters })
  }

  function handleDeleteScreen(id: string) {
    setSavedScreens((prev) => prev.filter((s) => s.id !== id))
  }

  const count = results?.length ?? 0
  const hasFilters = hasActiveFilters(filters)
  const confLabel =
    CONF_PRESETS.find((p) => p.value === filters.minConfidence)?.label ?? "Any"

  return (
    <div className="space-y-4">
      {/* ── page header ────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            기업 스크리너{" "}
            <span className="text-base font-normal text-muted-foreground">
              / Company Screener
            </span>
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            투자 thesis에 맞는 기업을 조건으로 필터링합니다
          </p>
        </div>
        {results != null && (
          <Badge variant="muted" className="mt-1.5 shrink-0 tabular-nums">
            <Building2 className="h-3 w-3" />
            {count.toLocaleString()} 결과
          </Badge>
        )}
      </div>

      {/* ── search bar + mobile rail toggle ────────────────────────────── */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={filters.query}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, query: e.target.value }))
            }
            placeholder="기업명, 영문명, 섹터로 검색…"
            className="pl-9 h-10"
          />
          {filters.query && (
            <button
              onClick={() =>
                setFilters((prev) => ({ ...prev, query: "" }))
              }
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* mobile filter toggle */}
        <Button
          variant="outline"
          size="sm"
          className="h-10 gap-1.5 lg:hidden"
          onClick={() => setRailOpen((v) => !v)}
        >
          <SlidersHorizontal className="h-4 w-4" />
          필터
          {hasFilters && (
            <Badge variant="default" className="h-4 px-1 py-0 text-2xs">
              !
            </Badge>
          )}
        </Button>
      </div>

      {/* ── active filter pills ─────────────────────────────────────────── */}
      {hasFilters && (
        <div className="flex flex-wrap gap-1.5">
          {filters.sectors.map((s) => (
            <ActivePill
              key={s}
              label={s}
              onRemove={() =>
                setFilters((prev) => ({
                  ...prev,
                  sectors: prev.sectors.filter((x) => x !== s),
                }))
              }
            />
          ))}
          {filters.stages.map((s) => (
            <ActivePill
              key={s}
              label={s}
              onRemove={() =>
                setFilters((prev) => ({
                  ...prev,
                  stages: prev.stages.filter((x) => x !== s),
                }))
              }
            />
          ))}
          {filters.regions.map((r) => (
            <ActivePill
              key={r}
              label={r}
              onRemove={() =>
                setFilters((prev) => ({
                  ...prev,
                  regions: prev.regions.filter((x) => x !== r),
                }))
              }
            />
          ))}
          {filters.raisedPreset !== null && (
            <ActivePill
              label={`조달 ${RAISED_PRESETS[filters.raisedPreset].label}`}
              onRemove={() =>
                setFilters((prev) => ({
                  ...prev,
                  raisedPreset: null,
                  raisedMin: undefined,
                  raisedMax: undefined,
                }))
              }
            />
          )}
          {filters.foundedFrom && (
            <ActivePill
              label={`설립 ≥${filters.foundedFrom}`}
              onRemove={() =>
                setFilters((prev) => ({ ...prev, foundedFrom: "" }))
              }
            />
          )}
          {filters.foundedTo && (
            <ActivePill
              label={`설립 ≤${filters.foundedTo}`}
              onRemove={() =>
                setFilters((prev) => ({ ...prev, foundedTo: "" }))
              }
            />
          )}
          {filters.recencyDays !== null && (
            <ActivePill
              label={`최근 ${RECENCY_PRESETS.find((p) => p.days === filters.recencyDays)?.label ?? `${filters.recencyDays}일`} 투자`}
              onRemove={() =>
                setFilters((prev) => ({ ...prev, recencyDays: null }))
              }
            />
          )}
          {filters.minConfidence > 0 && (
            <ActivePill
              label={`신뢰도 ${confLabel}`}
              onRemove={() =>
                setFilters((prev) => ({ ...prev, minConfidence: 0 }))
              }
            />
          )}
          {filters.hasConflict && (
            <ActivePill
              label="출처 불일치"
              onRemove={() =>
                setFilters((prev) => ({ ...prev, hasConflict: false }))
              }
            />
          )}
        </div>
      )}

      {/* ── main layout: rail + results ─────────────────────────────────── */}
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
        {/* filter rail — always visible on lg+, togglable on mobile */}
        <div
          className={cn(
            "lg:sticky lg:top-16",
            railOpen ? "block" : "hidden lg:block"
          )}
        >
          <FilterRail
            filters={filters}
            setFilters={setFilters}
            facets={facets}
            savedScreens={savedScreens}
            onSaveScreen={handleSaveScreen}
            onLoadScreen={handleLoadScreen}
            onDeleteScreen={handleDeleteScreen}
          />
        </div>

        {/* results area */}
        <div className="min-w-0 flex-1 space-y-3">
          {/* results header */}
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground tabular-nums">
              {isLoading ? (
                "검색 중…"
              ) : (
                <>
                  <span className="font-medium text-foreground tabular-nums">
                    {count.toLocaleString()}
                  </span>
                  개 기업
                </>
              )}
            </p>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
                  <ArrowUpDown className="h-3.5 w-3.5" />
                  {SORT_LABELS[filters.sort].split(" / ")[0]}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel className="text-xs">정렬 / Sort by</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {(Object.keys(SORT_LABELS) as SortOption[]).map((k) => (
                  <DropdownMenuItem
                    key={k}
                    className={cn(
                      "text-xs",
                      filters.sort === k && "bg-accent font-medium"
                    )}
                    onClick={() =>
                      setFilters((prev) => ({ ...prev, sort: k }))
                    }
                  >
                    {SORT_LABELS[k]}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* results grid */}
          {isLoading ? (
            <ResultSkeleton />
          ) : count === 0 ? (
            <EmptyState
              hasFilters={hasFilters || filters.query.trim() !== ""}
              onClear={() => setFilters(DEFAULT_FILTERS)}
            />
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {(results ?? []).map((company) => (
                <CompanyCard key={company.id} company={company} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── active filter pill ───────────────────────────────────────────────────────

function ActivePill({
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

// ── empty state ──────────────────────────────────────────────────────────────

function EmptyState({
  hasFilters,
  onClear,
}: {
  hasFilters: boolean
  onClear: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
      <Building2 className="h-10 w-10 text-muted-foreground/30" />
      <div>
        <p className="text-sm font-medium">검색 결과가 없습니다</p>
        <p className="mt-1 text-sm text-muted-foreground">
          검색어 또는 필터 조건을 변경해보세요.
        </p>
      </div>
      {hasFilters && (
        <Button variant="outline" size="sm" onClick={onClear}>
          모두 초기화 / Clear all
        </Button>
      )}
    </div>
  )
}
