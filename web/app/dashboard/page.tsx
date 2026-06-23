"use client"

import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts"
import {
  AlertTriangle,
  Bell,
  Building2,
  Eye,
  GitBranch,
  Layers,
  TrendingUp,
} from "lucide-react"
import { api } from "@/lib/api"
import { EventRow } from "@/components/event-row"
import { ConfidenceChip } from "@/components/confidence-chip"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { cn, formatKRWShort, formatNumber } from "@/lib/utils"

// ── chart palette: literal hsl strings for SVG rendering ─────────────
const CHART = [
  "hsl(213 90% 62%)",
  "hsl(152 52% 50%)",
  "hsl(40 90% 56%)",
  "hsl(280 65% 65%)",
  "hsl(2 74% 60%)",
  "hsl(190 70% 50%)",
  "hsl(220 10% 55%)",
]

const AXIS_STYLE = { fill: "hsl(var(--muted-foreground))", fontSize: 11 }
const TOOLTIP_STYLE = {
  background: "hsl(var(--popover))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "6px",
  color: "hsl(var(--foreground))",
  fontSize: 12,
  padding: "6px 10px",
}

// ── KPI card definition ───────────────────────────────────────────────
interface KpiDef {
  key: "companyCount" | "eventCount" | "assertionCount" | "unreadAlerts" | "conflicts"
  label: string
  labelKo: string
  icon: React.ElementType
  alert?: boolean
}

const KPI_DEFS: KpiDef[] = [
  { key: "companyCount",   label: "Companies",  labelKo: "기업",   icon: Building2 },
  { key: "eventCount",     label: "Events",     labelKo: "이벤트", icon: GitBranch },
  { key: "assertionCount", label: "Assertions", labelKo: "어설션", icon: Layers },
  { key: "unreadAlerts",   label: "Alerts",     labelKo: "알림",   icon: Bell,          alert: true },
  { key: "conflicts",      label: "Conflicts",  labelKo: "충돌",   icon: AlertTriangle, alert: true },
]

// ── loading skeleton ──────────────────────────────────────────────────
function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* header */}
      <div>
        <Skeleton className="h-7 w-40 mb-1" />
        <Skeleton className="h-4 w-64" />
      </div>

      {/* attention band */}
      <div className="grid grid-cols-3 gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <Skeleton className="h-3 w-24 mb-2.5" />
              <Skeleton className="h-8 w-12" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <Skeleton className="h-4 w-16 mb-2" />
              <Skeleton className="h-8 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* watchlist + top raises */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card><CardContent className="p-4"><Skeleton className="h-64 w-full" /></CardContent></Card>
        <Card><CardContent className="p-4"><Skeleton className="h-64 w-full" /></CardContent></Card>
      </div>

      {/* charts */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card><CardContent className="p-4"><Skeleton className="h-48 w-full" /></CardContent></Card>
        <Card><CardContent className="p-4"><Skeleton className="h-48 w-full" /></CardContent></Card>
      </div>

      {/* recent events feed */}
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-[72px] w-full rounded-lg" />
        ))}
      </div>
    </div>
  )
}

// ── main page ─────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => api.getDashboard(),
  })

  if (isLoading) return <DashboardSkeleton />

  if (isError || !data) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-sm text-muted-foreground">데이터를 불러오지 못했습니다.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* ── 1. Page header ──────────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {data.sinceLabel} 기준 · source-traceable intelligence on Korean private companies
          </p>
        </div>
      </div>

      {/* ── 2. "Since you last looked" attention band ────────────────── */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {/* Watchlist movers */}
        <Link href="/watchlists" className="group block">
          <Card className="h-full transition-colors group-hover:border-primary/40">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xs text-muted-foreground uppercase tracking-wide">
                  관심 기업 변동 / Watchlist Movers
                </span>
                <Eye className="h-3.5 w-3.5 text-primary/70" />
              </div>
              <p className="text-3xl font-semibold tnum leading-none text-primary">
                {data.moverCount}
              </p>
              <p className="mt-1.5 text-2xs text-muted-foreground">
                {data.sinceLabel} 기준
              </p>
            </CardContent>
          </Card>
        </Link>

        {/* Unread alerts */}
        <Link href="/alerts" className="group block">
          <Card className={cn(
            "h-full transition-colors group-hover:border-primary/40",
            data.unreadAlerts > 0 && "border-primary/30"
          )}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xs text-muted-foreground uppercase tracking-wide">
                  읽지 않은 알림 / Unread Alerts
                </span>
                <Bell className={cn(
                  "h-3.5 w-3.5",
                  data.unreadAlerts > 0 ? "text-primary" : "text-muted-foreground/60"
                )} />
              </div>
              <p className={cn(
                "text-3xl font-semibold tnum leading-none",
                data.unreadAlerts > 0 ? "text-primary" : "text-muted-foreground"
              )}>
                {data.unreadAlerts}
              </p>
              <p className="mt-1.5 text-2xs text-muted-foreground">
                알림함 보기 →
              </p>
            </CardContent>
          </Card>
        </Link>

        {/* Disputed facts */}
        <Link href="/companies?hasConflict=true" className="group block">
          <Card className={cn(
            "h-full transition-colors group-hover:border-warning/40",
            data.conflicts > 0 && "border-warning/40 bg-warning/5"
          )}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xs text-muted-foreground uppercase tracking-wide">
                  검토 필요 충돌 / Disputed Facts
                </span>
                <AlertTriangle className={cn(
                  "h-3.5 w-3.5",
                  data.conflicts > 0 ? "text-warning" : "text-muted-foreground/60"
                )} />
              </div>
              <p className={cn(
                "text-3xl font-semibold tnum leading-none",
                data.conflicts > 0 ? "text-warning" : "text-muted-foreground"
              )}>
                {data.conflicts}
              </p>
              <p className="mt-1.5 text-2xs text-muted-foreground">
                {data.conflicts > 0 ? "검토 필요" : "충돌 없음"}
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* ── KPI stat cards ──────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {KPI_DEFS.map(({ key, label, labelKo, icon: Icon, alert }) => {
          const value = data[key]
          const isAlertActive = alert && value > 0
          return (
            <Card
              key={key}
              className={cn(
                "transition-colors",
                isAlertActive && key === "conflicts" && "border-warning/40 bg-warning/5",
                isAlertActive && key === "unreadAlerts" && "border-primary/30"
              )}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-2xs text-muted-foreground uppercase tracking-wide">
                    {labelKo} / {label}
                  </span>
                  <Icon
                    className={cn(
                      "h-3.5 w-3.5",
                      isAlertActive && key === "conflicts" ? "text-warning" :
                      isAlertActive && key === "unreadAlerts" ? "text-primary" :
                      "text-muted-foreground/60"
                    )}
                  />
                </div>
                <p
                  className={cn(
                    "text-2xl font-semibold tnum leading-none",
                    isAlertActive && key === "conflicts" && "text-warning",
                    isAlertActive && key === "unreadAlerts" && "text-primary"
                  )}
                >
                  {formatNumber(value)}
                </p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* ── 3 + 4. Watchlist activity + Top raises ──────────────────── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* 3. Watchlist activity */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-medium">
              관심 기업 활동{" "}
              <span className="text-muted-foreground font-normal">/ Watchlist Activity</span>
            </h2>
            <div className="flex items-center gap-2">
              <Badge variant="muted">{data.watchlistActivity.length}</Badge>
              <Link href="/watchlists" className="text-2xs text-primary hover:underline">
                관심 목록 →
              </Link>
            </div>
          </div>
          <div className="space-y-2">
            {data.watchlistActivity.length === 0 ? (
              <div className="rounded-lg border border-dashed p-6 text-center">
                <Eye className="mx-auto mb-2 h-5 w-5 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">관심 기업의 최근 활동이 없습니다.</p>
              </div>
            ) : (
              data.watchlistActivity.map(({ event, company }) => (
                <EventRow
                  key={event.id}
                  event={event}
                  companyName={company?.canonical_name_ko}
                />
              ))
            )}
          </div>
        </section>

        {/* 4. Top raises leaderboard */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-medium">
              최대 투자 유치{" "}
              <span className="text-muted-foreground font-normal">/ Top Raises This Quarter</span>
            </h2>
            <Badge variant="muted">{data.topRaises.length}</Badge>
          </div>

          {data.topRaises.length === 0 ? (
            <div className="rounded-lg border border-dashed p-6 text-center">
              <TrendingUp className="mx-auto mb-2 h-5 w-5 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">이번 분기 투자 데이터가 없습니다.</p>
            </div>
          ) : (
            <div className="rounded-lg border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="px-3 py-2 text-left text-2xs text-muted-foreground font-medium w-7">#</th>
                    <th className="px-3 py-2 text-left text-2xs text-muted-foreground font-medium">기업 / Company</th>
                    <th className="px-3 py-2 text-left text-2xs text-muted-foreground font-medium hidden sm:table-cell">라운드 / Round</th>
                    <th className="px-3 py-2 text-right text-2xs text-muted-foreground font-medium">금액 / Amount</th>
                    <th className="px-3 py-2 text-right text-2xs text-muted-foreground font-medium hidden md:table-cell">신뢰도</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data.topRaises.map(({ event, company }, i) => (
                    <tr
                      key={event.id}
                      className="hover:bg-muted/30 transition-colors"
                    >
                      <td className="px-3 py-2.5 text-2xs text-muted-foreground tnum">
                        {i + 1}
                      </td>
                      <td className="px-3 py-2.5">
                        {company ? (
                          <Link
                            href={`/companies/${company.id}`}
                            className="font-medium hover:text-primary transition-colors truncate block max-w-[140px]"
                          >
                            {company.canonical_name_ko}
                          </Link>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 hidden sm:table-cell">
                        <span className="text-xs text-muted-foreground">
                          {event.payload.round_name ?? "—"}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <span className="text-sm font-semibold tnum text-conf-high">
                          {formatKRWShort(event.payload.amount_krw)}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-right hidden md:table-cell">
                        <ConfidenceChip
                          confidence={event.confidence}
                          factors={event.confidence_factors}
                          size="sm"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {/* ── 5. Funding velocity + Stage donut ───────────────────────── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Funding velocity by sector — horizontal bar */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">
              섹터별 투자 규모{" "}
              <span className="text-muted-foreground font-normal">/ Funding Velocity by Sector</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pr-2">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={data.fundingBySector}
                layout="vertical"
                margin={{ top: 0, right: 60, bottom: 0, left: 4 }}
              >
                <XAxis
                  type="number"
                  allowDecimals={false}
                  tick={AXIS_STYLE}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: number) => formatKRWShort(v)}
                />
                <YAxis
                  type="category"
                  dataKey="sector"
                  width={90}
                  tick={AXIS_STYLE}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  cursor={{ fill: "hsl(var(--muted))" }}
                  contentStyle={TOOLTIP_STYLE}
                  itemStyle={{ color: "hsl(var(--foreground))" }}
                  formatter={(v: number) => [formatKRWShort(v), "총 투자액"]}
                />
                <Bar dataKey="total_krw" radius={[0, 3, 3, 0]}>
                  {data.fundingBySector.map((_, i) => (
                    <Cell key={i} fill={CHART[i % CHART.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Stage distribution — donut */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">
              스테이지 분포{" "}
              <span className="text-muted-foreground font-normal">/ Stage Distribution</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={data.stageDist}
                  cx="45%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={2}
                  dataKey="value"
                  nameKey="name"
                  stroke="none"
                >
                  {data.stageDist.map((_, i) => (
                    <Cell key={i} fill={CHART[i % CHART.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  itemStyle={{ color: "hsl(var(--foreground))" }}
                  formatter={(v: number) => [v, "기업 수"]}
                />
                <Legend
                  layout="vertical"
                  align="right"
                  verticalAlign="middle"
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: 11, color: "hsl(var(--muted-foreground))" }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* ── 6. Recent high-confidence events ────────────────────────── */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-medium">
            최근 고신뢰도 이벤트{" "}
            <span className="text-muted-foreground font-normal">/ Recent High-Confidence Events</span>
          </h2>
          <Badge variant="muted">{data.recentEvents.length}</Badge>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {data.recentEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center col-span-full">
              이벤트 없음
            </p>
          ) : (
            data.recentEvents.map(({ event, company }) => (
              <EventRow
                key={event.id}
                event={event}
                companyName={company?.canonical_name_ko}
              />
            ))
          )}
        </div>
      </section>
    </div>
  )
}
