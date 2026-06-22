"use client"

import * as React from "react"
import Link from "next/link"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  ShieldCheck,
  MapPin,
  Calendar,
  AlertTriangle,
  Plus,
  Check,
  ChevronLeft,
  ExternalLink,
  BookOpen,
  Users,
} from "lucide-react"
import { mockApi } from "@/lib/mock-api"
import type { Fact, CompanyEvent } from "@/lib/types"
import {
  FACT_TYPE_LABEL,
  FACT_TYPE_LABEL_KO,
  EVENT_TYPE_LABEL,
  formatFactValue,
  sortFactsForDisplay,
} from "@/lib/format"
import { cn, formatKRWShort, formatNumber, formatDate, relativeTime } from "@/lib/utils"
import { FactRow } from "@/components/fact-row"
import { EventRow } from "@/components/event-row"
import { ConfidenceChip } from "@/components/confidence-chip"
import { SourceTierBadge } from "@/components/source-badge"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

// ── not found / error ──────────────────────────────────────────────────────
function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-32 text-center">
      <div className="rounded-full border bg-muted p-4">
        <BookOpen className="h-8 w-8 text-muted-foreground" />
      </div>
      <div>
        <p className="text-base font-medium">기업을 찾을 수 없습니다</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Company not found or may have been removed.
        </p>
      </div>
      <Button variant="outline" size="sm" asChild>
        <Link href="/companies">
          <ChevronLeft className="h-4 w-4" />
          기업 목록으로
        </Link>
      </Button>
    </div>
  )
}

// ── header skeleton ─────────────────────────────────────────────────────────
function HeaderSkeleton() {
  return (
    <div className="rounded-xl border bg-card p-6 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-4 w-40" />
          <div className="flex gap-2 mt-2">
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-5 w-24" />
          </div>
        </div>
        <Skeleton className="h-9 w-36" />
      </div>
      <div className="grid grid-cols-3 gap-4 pt-3 border-t">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="space-y-1">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-7 w-28" />
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Watchlist add button ────────────────────────────────────────────────────
function WatchlistButton({ companyId }: { companyId: string }) {
  const qc = useQueryClient()
  const { data: watchlists } = useQuery({
    queryKey: ["watchlists"],
    queryFn: () => mockApi.listWatchlists(),
  })

  const addMutation = useMutation({
    mutationFn: ({ wlId }: { wlId: string }) =>
      mockApi.addToWatchlist(wlId, companyId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["watchlists"] }),
  })

  const inAnyWatchlist = watchlists?.some((w) =>
    w.company_ids.includes(companyId)
  )

  if (!watchlists) return <Skeleton className="h-9 w-36" />

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={inAnyWatchlist ? "secondary" : "outline"}
          size="sm"
          className="gap-1.5 shrink-0"
        >
          {inAnyWatchlist ? (
            <Check className="h-4 w-4 text-conf-high" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          {inAnyWatchlist ? "관심 기업" : "관심 기업 추가"}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel>관심 목록에 추가</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {watchlists.length === 0 ? (
          <DropdownMenuItem disabled>
            관심 목록이 없습니다
          </DropdownMenuItem>
        ) : (
          watchlists.map((wl) => {
            const already = wl.company_ids.includes(companyId)
            return (
              <DropdownMenuItem
                key={wl.id}
                onClick={() => !already && addMutation.mutate({ wlId: wl.id })}
                className={cn(already && "opacity-50 cursor-default")}
              >
                {already && <Check className="h-3.5 w-3.5 text-conf-high" />}
                {!already && <div className="h-3.5 w-3.5" />}
                {wl.name}
                <span className="ml-auto text-2xs text-muted-foreground">
                  {wl.company_ids.length}
                </span>
              </DropdownMenuItem>
            )
          })
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// ── Headline metric tile ────────────────────────────────────────────────────
function MetricTile({
  labelKo,
  labelEn,
  value,
  chip,
}: {
  labelKo: string
  labelEn: string
  value: React.ReactNode
  chip?: React.ReactNode
}) {
  return (
    <div>
      <div className="text-2xs uppercase tracking-wide text-muted-foreground">
        {labelKo}{" "}
        <span className="normal-case tracking-normal">{labelEn}</span>
      </div>
      <div className="mt-1.5 flex items-baseline gap-2">
        <span className="text-xl font-semibold tnum">{value}</span>
        {chip}
      </div>
    </div>
  )
}

// ── Overview tab ───────────────────────────────────────────────────────────
function OverviewTab({
  facts,
  events,
  companyName,
}: {
  facts: Fact[]
  events: CompanyEvent[]
  companyName: string
}) {
  const displayFacts = sortFactsForDisplay(facts)
  const conflictFacts = displayFacts.filter((f) => f.has_conflict)
  const recentEvents = events.slice(0, 4)

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      {/* Left column — facts grid + conflict callouts */}
      <div className="lg:col-span-3 space-y-5">
        {/* Key facts summary */}
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            주요 지표 / Key Metrics
          </h2>
          {displayFacts.length === 0 ? (
            <p className="text-sm text-muted-foreground">집계된 지표가 없습니다.</p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {displayFacts.map((f) => (
                <div
                  key={f.id}
                  className={cn(
                    "rounded-lg border bg-card p-3",
                    f.has_conflict && "border-warning/40"
                  )}
                >
                  <div className="text-2xs text-muted-foreground flex items-center gap-1">
                    {FACT_TYPE_LABEL_KO[f.fact_type]}
                    {f.has_conflict && (
                      <AlertTriangle className="h-3 w-3 text-warning" />
                    )}
                  </div>
                  <div className="mt-1 text-base font-semibold tnum leading-none">
                    {formatFactValue(f)}
                  </div>
                  <div className="mt-1.5">
                    <ConfidenceChip
                      confidence={f.confidence}
                      factors={f.confidence_factors}
                      showConflict={f.has_conflict}
                      size="sm"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Conflict callouts */}
        {conflictFacts.length > 0 && (
          <section>
            <div className="mb-2 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-warning" />
              <h2 className="text-sm font-semibold text-warning">
                출처 불일치 / Source Conflicts
              </h2>
              <Badge variant="warning">{conflictFacts.length}</Badge>
            </div>
            <div className="rounded-lg border border-warning/30 bg-warning/5 p-3 space-y-1">
              {conflictFacts.map((f) => (
                <div key={f.id} className="flex items-center gap-2 text-sm">
                  <span className="font-medium">
                    {FACT_TYPE_LABEL[f.fact_type]}
                  </span>
                  <span className="text-muted-foreground">
                    {f.confidence_factors.summary}
                  </span>
                </div>
              ))}
              <p className="mt-2 text-xs text-muted-foreground">
                Facts 탭에서 assertion 별 세부 내용을 확인하세요.
              </p>
            </div>
          </section>
        )}
      </div>

      {/* Right column — recent events */}
      <div className="lg:col-span-2 space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          최근 이벤트 / Recent Events
        </h2>
        {recentEvents.length === 0 ? (
          <p className="text-sm text-muted-foreground">기록된 이벤트가 없습니다.</p>
        ) : (
          recentEvents.map((e) => (
            <EventRow key={e.id} event={e} companyName={companyName} />
          ))
        )}
        {events.length > 4 && (
          <p className="text-xs text-muted-foreground text-center">
            +{events.length - 4}개 더 · Events 탭에서 전체 보기
          </p>
        )}
      </div>
    </div>
  )
}

// ── Events tab ─────────────────────────────────────────────────────────────
function EventsTab({
  events,
  companyName,
}: {
  events: CompanyEvent[]
  companyName: string
}) {
  if (events.length === 0) {
    return (
      <div className="py-16 text-center text-sm text-muted-foreground">
        기록된 이벤트가 없습니다.
      </div>
    )
  }

  // Group by year for timeline headings
  const byYear = new Map<string, CompanyEvent[]>()
  for (const ev of events) {
    const yr = ev.occurred_on ? ev.occurred_on.slice(0, 4) : "미상"
    const arr = byYear.get(yr) ?? []
    arr.push(ev)
    byYear.set(yr, arr)
  }
  const years = [...byYear.keys()].sort((a, b) => b.localeCompare(a))

  return (
    <div className="space-y-6">
      {years.map((yr) => (
        <section key={yr}>
          <div className="mb-3 flex items-center gap-3">
            <span className="text-sm font-semibold tnum">{yr}</span>
            <Separator className="flex-1" />
            <Badge variant="muted">{byYear.get(yr)!.length}</Badge>
          </div>
          {/* Vertical timeline rail */}
          <div className="relative pl-5">
            <div className="absolute left-0 top-0 bottom-0 w-px bg-border" />
            <div className="space-y-3">
              {byYear.get(yr)!.map((ev) => (
                <div key={ev.id} className="relative">
                  {/* Rail dot */}
                  <div
                    className={cn(
                      "absolute -left-5 top-3 flex h-4 w-4 -translate-x-1/2 items-center justify-center rounded-full border-2 bg-card",
                      ev.confidence >= 0.8
                        ? "border-conf-high"
                        : ev.confidence >= 0.5
                        ? "border-conf-med"
                        : "border-conf-low"
                    )}
                  >
                    <div
                      className={cn(
                        "h-1.5 w-1.5 rounded-full",
                        ev.confidence >= 0.8
                          ? "bg-conf-high"
                          : ev.confidence >= 0.5
                          ? "bg-conf-med"
                          : "bg-conf-low"
                      )}
                    />
                  </div>
                  <EventRow event={ev} companyName={companyName} />
                </div>
              ))}
            </div>
          </div>
        </section>
      ))}
    </div>
  )
}

// ── Facts tab ─────────────────────────────────────────────────────────────
function FactsTab({ facts }: { facts: Fact[] }) {
  const displayFacts = sortFactsForDisplay(facts)

  return (
    <div className="space-y-4">
      {/* Explainer */}
      <div className="rounded-lg border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
        모든 수치는 하나 이상의 assertion에서 결정론적으로 집계됩니다.
        각 행을 클릭하면 신뢰도 분해, 출처 인용, 이력을 확인할 수 있습니다.
        <span className="ml-1 text-foreground">
          Every value traces to named assertions — no LLM confidence estimates.
        </span>
      </div>

      {displayFacts.length === 0 ? (
        <div className="py-16 text-center text-sm text-muted-foreground">
          집계된 팩트가 없습니다.
        </div>
      ) : (
        <div className="space-y-2">
          {displayFacts.map((f) => (
            <FactRow key={f.id} fact={f} />
          ))}
        </div>
      )}

      {/* Historical / superseded facts */}
      {facts.filter((f) => !f.is_current).length > 0 && (
        <details className="group">
          <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground list-none flex items-center gap-1.5 py-2">
            <ChevronLeft className="h-4 w-4 rotate-90 group-open:-rotate-90 transition-transform" />
            이전 버전 팩트 ({facts.filter((f) => !f.is_current).length}개) / Historical facts
          </summary>
          <div className="mt-2 space-y-2 opacity-60">
            {facts
              .filter((f) => !f.is_current)
              .map((f) => (
                <FactRow key={f.id} fact={f} />
              ))}
          </div>
        </details>
      )}
    </div>
  )
}

// ── Sources tab ────────────────────────────────────────────────────────────
function EventSourcesCard({
  event,
  companyName,
}: {
  event: CompanyEvent
  companyName: string
}) {
  const { data, isLoading } = useQuery({
    queryKey: ["event-sources", event.id],
    queryFn: () => mockApi.getEventSources(event.id),
  })

  if (isLoading)
    return <Skeleton className="h-24 w-full rounded-lg" />

  if (!data) return null

  const articles = Object.values(data.articles)
  const sources = data.sources

  return (
    <div className="rounded-lg border bg-card">
      {/* Event header */}
      <div className="flex items-center gap-3 border-b px-4 py-3">
        <Badge variant="muted">{EVENT_TYPE_LABEL[event.event_type]}</Badge>
        <span className="flex-1 truncate text-sm font-medium">
          {event.summary}
        </span>
        <div className="flex shrink-0 items-center gap-2 text-2xs text-muted-foreground tnum">
          <span>{formatDate(event.occurred_on, event.date_precision)}</span>
          <ConfidenceChip
            confidence={event.confidence}
            factors={event.confidence_factors}
            size="sm"
          />
        </div>
      </div>

      {/* Article list */}
      {articles.length === 0 ? (
        <p className="px-4 py-3 text-sm text-muted-foreground">출처 없음</p>
      ) : (
        <ul className="divide-y">
          {articles.map((art) => {
            const src = sources[art.source_id]
            return (
              <li key={art.id} className="px-4 py-3">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 shrink-0">
                    {src && (
                      <SourceTierBadge
                        tier={src.tier}
                        official={src.is_official}
                      />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <a
                      href={art.url}
                      target="_blank"
                      rel="noreferrer"
                      className="group flex items-start gap-1 text-sm font-medium hover:text-primary"
                    >
                      <span className="leading-snug">{art.title}</span>
                      <ExternalLink className="mt-0.5 h-3 w-3 shrink-0 opacity-0 transition-opacity group-hover:opacity-60" />
                    </a>
                    <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
                      {art.snippet}
                    </p>
                    <div className="mt-1.5 flex items-center gap-2 text-2xs text-muted-foreground tnum">
                      {src && (
                        <span className="font-medium text-foreground/70">
                          {src.name}
                        </span>
                      )}
                      <span>·</span>
                      <span>{formatDate(art.published_at)}</span>
                      <span>·</span>
                      <span>{relativeTime(art.published_at)}</span>
                    </div>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

function SourcesTab({
  events,
  companyName,
}: {
  events: CompanyEvent[]
  companyName: string
}) {
  // Show a note about the product rule, then per-event source lists
  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
        제목, 스니펫, 출처 링크만 표시합니다 — 원문 전체는 표시하지 않습니다.
        <span className="ml-1 text-foreground">
          Titles, snippets, and deep-links only — never full article body text.
        </span>
      </div>

      {events.length === 0 ? (
        <div className="py-16 text-center text-sm text-muted-foreground">
          연결된 이벤트가 없습니다.
        </div>
      ) : (
        <div className="space-y-4">
          {events.map((ev) => (
            <EventSourcesCard
              key={ev.id}
              event={ev}
              companyName={companyName}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Main profile page ──────────────────────────────────────────────────────
export default function CompanyProfilePage({
  params,
}: {
  params: { id: string }
}) {
  const { id } = params

  const { data, isLoading, isError } = useQuery({
    queryKey: ["company", id],
    queryFn: () => mockApi.getCompany(id),
    retry: false,
  })

  if (isLoading) return <HeaderSkeleton />
  if (isError || !data) return <NotFound />

  const { company, facts, events } = data

  // Headline fact lookups
  const valuationFact = facts.find(
    (f) => f.fact_type === "valuation" && f.is_current
  )
  const totalRaisedFact = facts.find(
    (f) => f.fact_type === "total_raised" && f.is_current
  )
  const headcountFact = facts.find(
    (f) => f.fact_type === "employee_count" && f.is_current
  )

  const conflictCount = facts.filter((f) => f.is_current && f.has_conflict).length

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link href="/companies" className="hover:text-foreground transition-colors">
          기업 검색
        </Link>
        <ChevronLeft className="h-3.5 w-3.5 rotate-180" />
        <span className="text-foreground font-medium truncate">
          {company.canonical_name_ko}
        </span>
      </nav>

      {/* ── Company header card ──────────────────────────────────────── */}
      <div className="rounded-xl border bg-card p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          {/* Identity */}
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold tracking-tight">
                {company.canonical_name_ko}
              </h1>
              {company.is_dart_anchored && (
                <span
                  className="inline-flex items-center gap-1 rounded-full bg-conf-high/10 px-2 py-0.5 text-2xs font-semibold text-conf-high"
                  title="DART 등록 기업 — DART-anchored entity"
                >
                  <ShieldCheck className="h-3.5 w-3.5" />
                  DART
                </span>
              )}
              {conflictCount > 0 && (
                <Badge variant="warning">
                  <AlertTriangle className="h-3 w-3" />
                  {conflictCount} 불일치
                </Badge>
              )}
            </div>
            <p className="mt-0.5 text-sm text-muted-foreground font-medium">
              {company.canonical_name_en}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {company.description}
            </p>

            {/* Meta row */}
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm">
              <Badge variant="secondary">{company.sector}</Badge>
              <Badge variant="outline">{company.stage}</Badge>
              <span className="flex items-center gap-1 text-muted-foreground text-xs">
                <MapPin className="h-3.5 w-3.5" />
                {company.hq_text}
              </span>
              <span className="flex items-center gap-1 text-muted-foreground text-xs">
                <Calendar className="h-3.5 w-3.5" />
                설립 {company.founded_year}
              </span>
              {company.employee_count != null && (
                <span className="flex items-center gap-1 text-muted-foreground text-xs">
                  <Users className="h-3.5 w-3.5" />
                  {formatNumber(company.employee_count)}명
                </span>
              )}
            </div>
          </div>

          {/* Watchlist action */}
          <WatchlistButton companyId={company.id} />
        </div>

        {/* ── Headline metrics strip ──────────────────────────────── */}
        <Separator className="mt-5 mb-4" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <MetricTile
            labelKo="기업가치"
            labelEn="/ Valuation"
            value={formatKRWShort(company.latest_valuation_krw)}
            chip={
              valuationFact && (
                <ConfidenceChip
                  confidence={valuationFact.confidence}
                  factors={valuationFact.confidence_factors}
                  showConflict={valuationFact.has_conflict}
                  size="sm"
                />
              )
            }
          />
          <MetricTile
            labelKo="누적 투자"
            labelEn="/ Total Raised"
            value={formatKRWShort(company.total_raised_krw)}
            chip={
              totalRaisedFact && (
                <ConfidenceChip
                  confidence={totalRaisedFact.confidence}
                  factors={totalRaisedFact.confidence_factors}
                  size="sm"
                />
              )
            }
          />
          <MetricTile
            labelKo="임직원수"
            labelEn="/ Headcount"
            value={
              company.employee_count != null
                ? `${formatNumber(company.employee_count)}명`
                : "—"
            }
            chip={
              headcountFact && (
                <ConfidenceChip
                  confidence={headcountFact.confidence}
                  factors={headcountFact.confidence_factors}
                  size="sm"
                />
              )
            }
          />
        </div>
      </div>

      {/* ── Tabs ─────────────────────────────────────────────────── */}
      <Tabs defaultValue="overview">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="overview">
            개요
            <span className="ml-1.5 hidden sm:inline text-muted-foreground font-normal text-2xs">
              / Overview
            </span>
          </TabsTrigger>
          <TabsTrigger value="events">
            이벤트
            <span className="ml-1.5 hidden sm:inline text-muted-foreground font-normal text-2xs">
              / Events
            </span>
            {events.length > 0 && (
              <Badge variant="muted" className="ml-1.5 px-1.5">
                {events.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="facts">
            팩트
            <span className="ml-1.5 hidden sm:inline text-muted-foreground font-normal text-2xs">
              / Facts
            </span>
            {conflictCount > 0 && (
              <Badge variant="warning" className="ml-1.5 px-1.5">
                ⚠ {conflictCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="sources">
            출처
            <span className="ml-1.5 hidden sm:inline text-muted-foreground font-normal text-2xs">
              / Sources
            </span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <OverviewTab
            facts={facts}
            events={events}
            companyName={company.canonical_name_ko}
          />
        </TabsContent>

        <TabsContent value="events">
          <EventsTab
            events={events}
            companyName={company.canonical_name_ko}
          />
        </TabsContent>

        <TabsContent value="facts">
          <FactsTab facts={facts} />
        </TabsContent>

        <TabsContent value="sources">
          <SourcesTab
            events={events}
            companyName={company.canonical_name_ko}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
