"use client"

import * as React from "react"
import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import { Search, X, Building2, TrendingUp } from "lucide-react"
import { api, type InvestorSummary } from "@/lib/api"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { cn, formatKRWShort } from "@/lib/utils"

// ── investor card ─────────────────────────────────────────────────────────────

function InvestorCard({ investor }: { investor: InvestorSummary }) {
  const href = `/investors/${encodeURIComponent(investor.name)}`
  return (
    <Link
      href={href}
      className="group flex flex-col rounded-lg border bg-card p-4 transition-colors hover:border-primary/40"
    >
      {/* name row */}
      <div className="flex items-start justify-between gap-2">
        <h3 className="truncate text-base font-semibold group-hover:text-primary">
          {investor.name}
        </h3>
        <Badge variant="outline" className="shrink-0 tabular-nums text-2xs">
          리드 {investor.leadCount}
        </Badge>
      </div>

      {/* stats row */}
      <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
        <Stat label="포트폴리오">
          <span className="font-semibold tabular-nums">
            {investor.companyCount}개사
          </span>
        </Stat>
        <Stat label="추정 집행액">
          <span className="font-semibold tabular-nums">
            {formatKRWShort(investor.estDeployedKrw)}
          </span>
        </Stat>
      </div>

      {/* sector chips */}
      {investor.sectors.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1 border-t pt-2">
          {investor.sectors.slice(0, 4).map((s) => (
            <Badge key={s} variant="secondary" className="text-2xs">
              {s}
            </Badge>
          ))}
          {investor.sectors.length > 4 && (
            <Badge variant="muted" className="text-2xs">
              +{investor.sectors.length - 4}
            </Badge>
          )}
        </div>
      )}
    </Link>
  )
}

function Stat({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div>
      <div className="text-2xs uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="mt-0.5">{children}</div>
    </div>
  )
}

// ── skeleton grid ─────────────────────────────────────────────────────────────

function GridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 9 }).map((_, i) => (
        <Skeleton key={i} className="h-[148px] w-full rounded-lg" />
      ))}
    </div>
  )
}

// ── empty state ───────────────────────────────────────────────────────────────

function EmptyState({ onClear }: { onClear: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
      <TrendingUp className="h-10 w-10 text-muted-foreground/30" />
      <div>
        <p className="text-sm font-medium">검색 결과가 없습니다</p>
        <p className="mt-1 text-sm text-muted-foreground">
          검색어를 변경하거나 전체 목록을 확인하세요.
        </p>
      </div>
      <button
        onClick={onClear}
        className="text-xs text-primary underline-offset-2 hover:underline"
      >
        초기화 / Clear
      </button>
    </div>
  )
}

// ── main page ─────────────────────────────────────────────────────────────────

export default function InvestorsPage() {
  const [query, setQuery] = React.useState("")

  const { data: investors, isLoading } = useQuery({
    queryKey: ["investors"],
    queryFn: () => api.listInvestors(),
  })

  // Client-side filter on name
  const filtered = React.useMemo(() => {
    if (!investors) return []
    const q = query.trim().toLowerCase()
    const rows = q
      ? investors.filter((inv) => inv.name.toLowerCase().includes(q))
      : investors
    // already sorted by companyCount desc from the API, preserve it
    return rows
  }, [investors, query])

  const count = filtered.length

  return (
    <div className="space-y-4">
      {/* ── header ──────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            투자자{" "}
            <span className="text-base font-normal text-muted-foreground">
              / Investors
            </span>
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            포트폴리오 기업 기준으로 정렬된 투자사 목록입니다
          </p>
        </div>
        {investors != null && (
          <Badge variant="muted" className="mt-1.5 shrink-0 tabular-nums">
            <Building2 className="h-3 w-3" />
            {investors.length.toLocaleString()}개
          </Badge>
        )}
      </div>

      {/* ── search bar ──────────────────────────────────────────────────── */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="투자사명 검색…"
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

      {/* ── results count ───────────────────────────────────────────────── */}
      {!isLoading && investors != null && (
        <p className="text-sm text-muted-foreground tabular-nums">
          <span className="font-medium text-foreground">{count.toLocaleString()}</span>개
          투자사
        </p>
      )}

      {/* ── grid ────────────────────────────────────────────────────────── */}
      {isLoading ? (
        <GridSkeleton />
      ) : count === 0 ? (
        <EmptyState onClear={() => setQuery("")} />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((inv) => (
            <InvestorCard key={inv.name} investor={inv} />
          ))}
        </div>
      )}
    </div>
  )
}
