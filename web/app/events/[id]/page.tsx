"use client"

import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import {
  ArrowLeft,
  Banknote,
  Briefcase,
  Building,
  Handshake,
  LineChart,
  TrendingUp,
  UserMinus,
  UserPlus,
  type LucideIcon,
} from "lucide-react"
import { api } from "@/lib/api"
import type { EventPayload, EventType } from "@/lib/types"
import { EVENT_TYPE_LABEL, eventHeadlineAmount } from "@/lib/format"
import { cn, formatDate, formatKRWShort } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import { ConfidenceChip } from "@/components/confidence-chip"
import { ConfidenceFactorsPanel } from "@/components/confidence-factors"
import { ProvenanceList, ConflictComparison } from "@/components/provenance"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

// ── icon map ──────────────────────────────────────────────────────────
const EVENT_ICON: Record<EventType, LucideIcon> = {
  funding_round: Banknote,
  acquisition: Briefcase,
  merger: Briefcase,
  ipo_announcement: LineChart,
  ipo_completion: LineChart,
  profitability_milestone: TrendingUp,
  partnership: Handshake,
  executive_hire: UserPlus,
  executive_departure: UserMinus,
}

const EVENT_TONE_CLASS: Record<EventType, string> = {
  funding_round: "text-conf-high bg-conf-high/10",
  acquisition: "text-primary bg-primary/10",
  merger: "text-primary bg-primary/10",
  ipo_announcement: "text-warning bg-warning/10",
  ipo_completion: "text-warning bg-warning/10",
  profitability_milestone: "text-conf-high bg-conf-high/10",
  partnership: "text-primary bg-primary/10",
  executive_hire: "text-muted-foreground bg-muted",
  executive_departure: "text-muted-foreground bg-muted",
}

const STATUS_VARIANT: Record<string, "muted" | "warning" | "default" | "success"> = {
  rumored: "warning",
  announced: "default",
  completed: "success",
}

const STATUS_LABEL: Record<string, string> = {
  rumored: "루머",
  announced: "공시됨",
  completed: "완료됨",
}

// ── payload rendering ─────────────────────────────────────────────────

type KRWFields = "amount_krw" | "pre_money_krw" | "post_money_krw" | "offer_price_krw" | "market_cap_krw" | "value_krw"
type PctFields = "stake_pct"

const KRW_FIELDS = new Set<KRWFields>([
  "amount_krw", "pre_money_krw", "post_money_krw", "offer_price_krw", "market_cap_krw", "value_krw",
])

const PCT_FIELDS = new Set<PctFields>(["stake_pct"])

const PAYLOAD_LABELS: Partial<Record<keyof EventPayload, string>> = {
  round_name: "라운드 / Round",
  amount_krw: "투자금액 / Amount",
  pre_money_krw: "투자 전 가치 / Pre-money",
  post_money_krw: "투자 후 가치 / Post-money",
  lead_investor: "리드 투자자 / Lead Investor",
  investors: "투자자 / Investors",
  acquirer: "인수자 / Acquirer",
  target: "대상 / Target",
  stake_pct: "지분 / Stake",
  entity_a: "기업 A / Entity A",
  entity_b: "기업 B / Entity B",
  surviving_entity: "존속 법인 / Surviving Entity",
  exchange: "거래소 / Exchange",
  target_date: "목표일 / Target Date",
  offer_price_krw: "공모가 / Offer Price",
  market_cap_krw: "시가총액 / Market Cap",
  underwriters: "주관사 / Underwriters",
  metric: "지표 / Metric",
  period: "기간 / Period",
  value_krw: "금액 / Value",
  turned_positive: "흑자 전환 / Turned Positive",
  partner: "파트너 / Partner",
  nature: "협력 성격 / Nature",
  description: "설명 / Description",
  person: "인물 / Person",
  role: "직책 / Role",
  direction: "방향 / Direction",
  effective_date: "발효일 / Effective Date",
}

function formatPayloadValue(key: keyof EventPayload, value: unknown): string {
  if (value == null) return "—"
  if (key as string in KRW_FIELDS || KRW_FIELDS.has(key as KRWFields)) {
    return typeof value === "number" ? formatKRWShort(value) : String(value)
  }
  if (key as string in PCT_FIELDS || PCT_FIELDS.has(key as PctFields)) {
    return typeof value === "number" ? `${value.toFixed(1)}%` : String(value)
  }
  if (Array.isArray(value)) return value.join(", ")
  if (typeof value === "boolean") return value ? "예 / Yes" : "아니오 / No"
  if (key === "direction") return value === "join" ? "입사 / Join" : "퇴사 / Leave"
  return String(value)
}

function PayloadPanel({ payload }: { payload: EventPayload }) {
  const entries = (Object.entries(payload) as [keyof EventPayload, unknown][]).filter(
    ([, v]) => v != null && v !== "" && !(Array.isArray(v) && v.length === 0)
  )
  if (entries.length === 0) return null

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">
          상세 내용 <span className="font-normal text-muted-foreground">/ Event Details</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
          {entries.map(([key, value]) => (
            <div key={key} className="flex flex-col gap-0.5">
              <dt className="text-2xs uppercase tracking-wide text-muted-foreground">
                {PAYLOAD_LABELS[key] ?? key}
              </dt>
              <dd className="text-sm font-medium tnum">
                {formatPayloadValue(key, value)}
              </dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  )
}

// ── skeleton ──────────────────────────────────────────────────────────
function EventDetailSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-4 w-32" />
      <div className="space-y-2">
        <Skeleton className="h-8 w-3/4" />
        <div className="flex gap-2">
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-5 w-16" />
        </div>
      </div>
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-40 w-full" />
      <Skeleton className="h-48 w-full" />
    </div>
  )
}

// ── main page ─────────────────────────────────────────────────────────
export default function EventDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const { id } = params

  const { data, isLoading, isError } = useQuery({
    queryKey: ["event", id],
    queryFn: () => api.getEvent(id),
  })

  const { data: bundle, isLoading: sourcesLoading } = useQuery({
    queryKey: ["event-sources", id],
    queryFn: () => api.getEventSources(id),
    enabled: !!data,
  })

  if (isLoading) return <EventDetailSkeleton />

  if (isError || !data) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-sm text-muted-foreground">이벤트를 찾을 수 없습니다. / Event not found.</p>
      </div>
    )
  }

  const { event, company } = data
  const Icon = EVENT_ICON[event.event_type] ?? Building
  const toneClass = EVENT_TONE_CLASS[event.event_type]
  const headlineAmount = eventHeadlineAmount(event)
  const hasConflict = event.confidence_factors?.has_conflict

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* ── back nav ──────────────────────────────────────────────── */}
      <Link
        href={`/companies/${company.id}`}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        <span className="font-medium">{company.canonical_name_ko}</span>
        <span className="text-muted-foreground/60">·</span>
        <span>{company.canonical_name_en}</span>
      </Link>

      {/* ── header card ───────────────────────────────────────────── */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-start gap-4">
            <div
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                toneClass
              )}
            >
              <Icon className="h-5 w-5" />
            </div>

            <div className="min-w-0 flex-1 space-y-2">
              {/* badges row */}
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge variant="default">{EVENT_TYPE_LABEL[event.event_type]}</Badge>
                <Badge variant={STATUS_VARIANT[event.event_status] ?? "muted"}>
                  {STATUS_LABEL[event.event_status] ?? event.event_status}
                </Badge>
                <span className="text-xs text-muted-foreground tnum">
                  {formatDate(event.occurred_on, event.date_precision)}
                </span>
              </div>

              {/* headline */}
              <h1 className="text-lg font-semibold leading-snug">{event.summary}</h1>

              {/* amount + confidence row */}
              <div className="flex flex-wrap items-center gap-3">
                {headlineAmount != null && (
                  <span className="text-xl font-bold tnum">
                    {formatKRWShort(headlineAmount)}
                  </span>
                )}
                <ConfidenceChip
                  confidence={event.confidence}
                  factors={event.confidence_factors}
                  showConflict={hasConflict}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── payload details ───────────────────────────────────────── */}
      <PayloadPanel payload={event.payload} />

      {/* ── confidence breakdown ──────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">
            신뢰도 산출 근거 <span className="font-normal text-muted-foreground">/ Confidence Breakdown</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ConfidenceFactorsPanel factors={event.confidence_factors} />
        </CardContent>
      </Card>

      {/* ── provenance ────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">
            어설션 출처 <span className="font-normal text-muted-foreground">/ Assertion Provenance</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {sourcesLoading || !bundle ? (
            <div className="space-y-2">
              {[1, 2].map((i) => (
                <Skeleton key={i} className="h-28 w-full rounded-lg" />
              ))}
            </div>
          ) : bundle.assertions.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              출처 정보 없음 / No source assertions found.
            </p>
          ) : (
            <div className="space-y-4">
              {hasConflict && (
                <>
                  <div className="rounded-md border border-warning/30 bg-warning/5 px-3 py-2 text-xs text-warning">
                    출처 간 수치 불일치가 감지됐습니다. 아래에서 합의값과 반론 출처를 비교하세요.
                    <br />
                    Sources report conflicting values. Consensus vs. dissent is shown below.
                  </div>
                  <ConflictComparison bundle={bundle} />
                  <Separator />
                </>
              )}
              <ProvenanceList bundle={bundle} />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
