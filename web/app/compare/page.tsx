"use client"

import * as React from "react"
import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import { X, Search, ShieldCheck, AlertTriangle, ArrowUpDown } from "lucide-react"
import { api } from "@/lib/api"
import type { CompanyListItem, CompanyProfile, Fact, FactType } from "@/lib/types"
import {
  FACT_TYPE_LABEL,
  FACT_TYPE_LABEL_KO,
  EVENT_TYPE_LABEL,
  formatFactValue,
  sortFactsForDisplay,
} from "@/lib/format"
import { cn, formatDate } from "@/lib/utils"
import { ConfidenceChip } from "@/components/confidence-chip"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"

// ── Constants ──────────────────────────────────────────────────────────────

/** Default companies to pre-select so the page is non-empty on load. */
const DEFAULT_IDS = ["toss", "kurly"]

/** Ordered fact types to show in the comparison rows. */
const COMPARE_FACT_ORDER: FactType[] = [
  "valuation",
  "total_raised",
  "funding_amount",
  "revenue",
  "employee_count",
  "ipo_target_date",
  "headquarters",
  "founded_year",
]

const MAX_COMPANIES = 3

// ── Company picker chip ───────────────────────────────────────────────────

function SelectedChip({
  company,
  onRemove,
}: {
  company: CompanyListItem
  onRemove: () => void
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border bg-card px-3 py-1 text-sm font-medium">
      {company.canonical_name_ko}
      {company.is_dart_anchored && (
        <ShieldCheck className="h-3 w-3 text-conf-high shrink-0" />
      )}
      <button
        type="button"
        onClick={onRemove}
        className="ml-0.5 rounded-full p-0.5 hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
        aria-label={`${company.canonical_name_ko} 제거`}
      >
        <X className="h-3 w-3" />
      </button>
    </span>
  )
}

// ── Picker dropdown ───────────────────────────────────────────────────────

function CompanyPicker({
  selected,
  all,
  onAdd,
}: {
  selected: string[]
  all: CompanyListItem[]
  onAdd: (id: string) => void
}) {
  const [query, setQuery] = React.useState("")
  const [open, setOpen] = React.useState(false)
  const inputRef = React.useRef<HTMLInputElement>(null)
  const containerRef = React.useRef<HTMLDivElement>(null)
  const isFull = selected.length >= MAX_COMPANIES

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    return all.filter(
      (c) =>
        !selected.includes(c.id) &&
        (q === "" ||
          c.canonical_name_ko.toLowerCase().includes(q) ||
          c.canonical_name_en.toLowerCase().includes(q))
    )
  }, [all, selected, query])

  // Close on outside click
  React.useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  if (isFull) return null

  return (
    <div ref={containerRef} className="relative w-64">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
        <Input
          ref={inputRef}
          placeholder="기업 검색 / Search company…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          className="pl-8 h-8 text-sm"
        />
      </div>
      {open && filtered.length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border bg-popover shadow-lg max-h-64 overflow-y-auto">
          {filtered.slice(0, 20).map((c) => (
            <button
              key={c.id}
              type="button"
              className="w-full flex items-start gap-2 px-3 py-2 text-left hover:bg-muted/60 transition-colors"
              onClick={() => {
                onAdd(c.id)
                setQuery("")
                setOpen(false)
                inputRef.current?.focus()
              }}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-medium truncate">
                    {c.canonical_name_ko}
                  </span>
                  {c.is_dart_anchored && (
                    <ShieldCheck className="h-3 w-3 text-conf-high shrink-0" />
                  )}
                </div>
                <div className="text-2xs text-muted-foreground truncate">
                  {c.canonical_name_en} · {c.sector}
                </div>
              </div>
              <Badge variant="outline" className="text-2xs shrink-0 mt-0.5">
                {c.stage}
              </Badge>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Column header ────────────────────────────────────────────────────────

function CompanyColumnHeader({
  profile,
  onRemove,
}: {
  profile: CompanyProfile
  onRemove: () => void
}) {
  const { company } = profile
  return (
    <div className="rounded-t-lg border border-b-0 bg-card p-4 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <Link
              href={`/companies/${company.id}`}
              className="text-base font-bold hover:text-primary transition-colors truncate"
            >
              {company.canonical_name_ko}
            </Link>
            {company.is_dart_anchored && (
              <ShieldCheck className="h-3.5 w-3.5 text-conf-high shrink-0" />
            )}
          </div>
          <div className="text-xs text-muted-foreground truncate mt-0.5">
            {company.canonical_name_en}
          </div>
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors shrink-0"
          aria-label={`${company.canonical_name_ko} 제거`}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="flex flex-wrap gap-1.5 items-center">
        <Badge variant="secondary" className="text-2xs">{company.sector}</Badge>
        <Badge variant="outline" className="text-2xs">{company.stage}</Badge>
        {profile.facts.some((f) => f.is_current && f.has_conflict) && (
          <Badge variant="warning" className="text-2xs gap-1">
            <AlertTriangle className="h-2.5 w-2.5" />
            불일치
          </Badge>
        )}
      </div>
    </div>
  )
}

// ── Loading column ──────────────────────────────────────────────────────

function ColumnSkeleton() {
  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <div className="p-4 space-y-2">
        <Skeleton className="h-5 w-36" />
        <Skeleton className="h-3 w-28" />
        <div className="flex gap-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-14" />
        </div>
      </div>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="border-t px-4 py-3 space-y-1">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-5 w-28" />
        </div>
      ))}
    </div>
  )
}

// ── Single loaded column ───────────────────────────────────────────────

function CompanyColumn({
  id,
  factTypes,
  bestValues,
  onRemove,
}: {
  id: string
  factTypes: FactType[]
  bestValues: Partial<Record<FactType, number>>
  onRemove: () => void
}) {
  const { data, isLoading } = useQuery<CompanyProfile>({
    queryKey: ["company", id],
    queryFn: () => api.getCompany(id),
  })

  if (isLoading) return <ColumnSkeleton />
  if (!data) return null

  const { company, facts, events } = data
  const currentFacts = sortFactsForDisplay(facts.filter((f) => f.is_current))
  const factByType = new Map<FactType, Fact>()
  for (const f of currentFacts) factByType.set(f.fact_type, f)

  // Latest event (events already sorted desc by occurred_on)
  const latestEvent = events[0] ?? null

  return (
    <div className="flex flex-col rounded-lg border bg-card overflow-hidden">
      {/* Header */}
      <div className="rounded-t-lg border-b bg-card p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <Link
                href={`/companies/${company.id}`}
                className="text-base font-bold hover:text-primary transition-colors"
              >
                {company.canonical_name_ko}
              </Link>
              {company.is_dart_anchored && (
                <ShieldCheck className="h-3.5 w-3.5 text-conf-high shrink-0" />
              )}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5 truncate">
              {company.canonical_name_en}
            </div>
          </div>
          <button
            type="button"
            onClick={onRemove}
            className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors shrink-0"
            aria-label={`${company.canonical_name_ko} 제거`}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5 items-center">
          <Badge variant="secondary" className="text-2xs">{company.sector}</Badge>
          <Badge variant="outline" className="text-2xs">{company.stage}</Badge>
          {facts.some((f) => f.is_current && f.has_conflict) && (
            <Badge variant="warning" className="text-2xs gap-1">
              <AlertTriangle className="h-2.5 w-2.5" />
              불일치
            </Badge>
          )}
        </div>
      </div>

      {/* Fact rows */}
      {factTypes.map((ft) => {
        const fact = factByType.get(ft)
        const isBest =
          fact?.value_numeric != null &&
          bestValues[ft] != null &&
          fact.value_numeric === bestValues[ft]

        return (
          <div
            key={ft}
            className={cn(
              "border-b px-4 py-3 last:border-b-0 transition-colors",
              isBest && "bg-conf-high/5"
            )}
          >
            {fact ? (
              <>
                <div
                  className={cn(
                    "text-base font-semibold tnum leading-tight",
                    isBest && "text-conf-high"
                  )}
                >
                  {formatFactValue(fact)}
                  {isBest && (
                    <ArrowUpDown className="inline ml-1 h-3 w-3 text-conf-high opacity-70" />
                  )}
                </div>
                <div className="mt-1">
                  <ConfidenceChip
                    confidence={fact.confidence}
                    factors={fact.confidence_factors}
                    showConflict={fact.has_conflict}
                    size="sm"
                  />
                </div>
              </>
            ) : (
              <span className="text-sm text-muted-foreground">—</span>
            )}
          </div>
        )
      })}

      {/* Latest event row */}
      <div className="border-t px-4 py-3 bg-muted/20">
        {latestEvent ? (
          <div className="space-y-1">
            <Link
              href={`/events/${latestEvent.id}`}
              className="text-xs font-medium leading-snug hover:text-primary transition-colors line-clamp-2"
            >
              {latestEvent.summary}
            </Link>
            <div className="flex items-center gap-2 text-2xs text-muted-foreground">
              <Badge variant="muted" className="text-2xs py-0">
                {EVENT_TYPE_LABEL[latestEvent.event_type]}
              </Badge>
              <span className="tnum">
                {formatDate(latestEvent.occurred_on, latestEvent.date_precision)}
              </span>
            </div>
          </div>
        ) : (
          <span className="text-sm text-muted-foreground">—</span>
        )}
      </div>
    </div>
  )
}

// ── Row label column ────────────────────────────────────────────────────

function LabelColumn({ factTypes }: { factTypes: FactType[] }) {
  return (
    <div className="flex flex-col rounded-lg border bg-card/60 overflow-hidden w-36 shrink-0">
      {/* Spacer matching the column header */}
      <div className="border-b p-4 h-[104px] flex items-end">
        <span className="text-2xs uppercase tracking-wide text-muted-foreground font-semibold">
          지표 / Metric
        </span>
      </div>

      {factTypes.map((ft) => (
        <div
          key={ft}
          className="border-b px-3 py-3 last:border-b-0 flex flex-col justify-center min-h-[68px]"
        >
          <div className="text-xs font-semibold text-foreground">
            {FACT_TYPE_LABEL_KO[ft]}
          </div>
          <div className="text-2xs text-muted-foreground">
            {FACT_TYPE_LABEL[ft]}
          </div>
        </div>
      ))}

      {/* Latest event label */}
      <div className="border-t px-3 py-3 bg-muted/20 min-h-[80px] flex flex-col justify-center">
        <div className="text-xs font-semibold text-foreground">최근 이벤트</div>
        <div className="text-2xs text-muted-foreground">Latest Event</div>
      </div>
    </div>
  )
}

// ── Main page ───────────────────────────────────────────────────────────

export default function ComparePage() {
  const [selectedIds, setSelectedIds] = React.useState<string[]>(DEFAULT_IDS)

  const { data: allCompanies, isLoading: listLoading } = useQuery<CompanyListItem[]>({
    queryKey: ["companies"],
    queryFn: () => api.listCompanies(),
  })

  // Fetch each selected company profile
  const profileQueries = selectedIds.map((id) =>
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useQuery<CompanyProfile>({
      queryKey: ["company", id],
      queryFn: () => api.getCompany(id),
    })
  )

  const profiles = profileQueries
    .map((q) => q.data)
    .filter((d): d is CompanyProfile => d != null)

  // Build the union of fact types present across all loaded profiles
  const factTypes = React.useMemo<FactType[]>(() => {
    const present = new Set<FactType>()
    for (const p of profiles) {
      for (const f of p.facts) {
        if (f.is_current) present.add(f.fact_type)
      }
    }
    return COMPARE_FACT_ORDER.filter((ft) => present.has(ft))
  }, [profiles])

  // Compute best (highest) numeric value per fact type for highlighting
  const bestValues = React.useMemo<Partial<Record<FactType, number>>>(() => {
    const result: Partial<Record<FactType, number>> = {}
    for (const ft of factTypes) {
      let best: number | null = null
      for (const p of profiles) {
        const f = p.facts.find((f) => f.fact_type === ft && f.is_current)
        if (f?.value_numeric != null) {
          if (best == null || f.value_numeric > best) best = f.value_numeric
        }
      }
      if (best != null) result[ft] = best
    }
    return result
  }, [factTypes, profiles])

  const selectedCompanies = React.useMemo(
    () =>
      allCompanies?.filter((c) => selectedIds.includes(c.id)) ?? [],
    [allCompanies, selectedIds]
  )

  function addCompany(id: string) {
    if (selectedIds.length < MAX_COMPANIES && !selectedIds.includes(id)) {
      setSelectedIds((prev) => [...prev, id])
    }
  }

  function removeCompany(id: string) {
    setSelectedIds((prev) => prev.filter((x) => x !== id))
  }

  const anyLoading = profileQueries.some((q) => q.isLoading)

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-xl font-bold tracking-tight">
          비교 <span className="text-muted-foreground font-normal text-base">/ Compare</span>
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          최대 3개 기업을 선택해 지표를 나란히 비교합니다 · Select up to 3 companies to compare side-by-side.
        </p>
      </div>

      {/* Picker row */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Selected chips */}
        {listLoading
          ? null
          : selectedCompanies.map((c) => (
              <SelectedChip
                key={c.id}
                company={c}
                onRemove={() => removeCompany(c.id)}
              />
            ))}

        {/* Search input to add */}
        {!listLoading && allCompanies && (
          <CompanyPicker
            selected={selectedIds}
            all={allCompanies}
            onAdd={addCompany}
          />
        )}

        {selectedIds.length >= MAX_COMPANIES && (
          <span className="text-xs text-muted-foreground">
            최대 {MAX_COMPANIES}개 선택 · Max {MAX_COMPANIES} selected
          </span>
        )}
      </div>

      {/* Empty state */}
      {selectedIds.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl border bg-card py-24 text-center gap-3">
          <div className="rounded-full border bg-muted p-4">
            <ArrowUpDown className="h-8 w-8 text-muted-foreground" />
          </div>
          <div>
            <p className="text-base font-medium">기업을 선택하세요</p>
            <p className="mt-1 text-sm text-muted-foreground">
              위 검색창에서 비교할 기업을 추가하세요. · Use the search above to add companies.
            </p>
          </div>
        </div>
      )}

      {/* Comparison grid */}
      {selectedIds.length > 0 && (
        <div className="overflow-x-auto pb-4">
          <div
            className="inline-flex gap-3 min-w-full"
            style={{ minWidth: `${36 + selectedIds.length * 240}px` }}
          >
            {/* Label column */}
            {(anyLoading || profiles.length > 0) && factTypes.length > 0 && (
              <LabelColumn factTypes={factTypes} />
            )}
            {anyLoading && factTypes.length === 0 && (
              <div className="w-36 shrink-0">
                <div className="rounded-lg border bg-card/60 h-[104px] border-b" />
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="border rounded-lg mt-1 h-[68px] bg-card/60" />
                ))}
              </div>
            )}

            {/* Company columns */}
            {selectedIds.map((id) => {
              const q = profileQueries[selectedIds.indexOf(id)]
              if (q?.isLoading) return <ColumnSkeleton key={id} />
              return (
                <div key={id} className="w-60 shrink-0">
                  <CompanyColumn
                    id={id}
                    factTypes={factTypes}
                    bestValues={bestValues}
                    onRemove={() => removeCompany(id)}
                  />
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Note */}
      {profiles.length > 0 && (
        <p className="text-2xs text-muted-foreground">
          수치는 결정론적 신뢰도 공식으로 계산됩니다. 신뢰도 칩을 클릭하면 세부 내역을 확인할 수 있습니다. ·
          Values computed via deterministic confidence formula. Click any chip for the breakdown.
          {Object.keys(bestValues).length > 0 && (
            <span className="ml-2 inline-flex items-center gap-1 text-conf-high">
              <ArrowUpDown className="h-3 w-3" />
              최고값 강조 표시 / Highest value highlighted
            </span>
          )}
        </p>
      )}
    </div>
  )
}
