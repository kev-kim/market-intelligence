"use client"

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
import { AlertTriangle, Building2, GitBranch, Layers, Bell } from "lucide-react"
import { mockApi } from "@/lib/mock-api"
import { EventRow } from "@/components/event-row"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { cn, formatNumber } from "@/lib/utils"

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
const GRID_STROKE = "hsl(var(--border))"
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
  { key: "companyCount",    label: "Companies",   labelKo: "기업",    icon: Building2 },
  { key: "eventCount",      label: "Events",      labelKo: "이벤트",  icon: GitBranch },
  { key: "assertionCount",  label: "Assertions",  labelKo: "어설션",  icon: Layers },
  { key: "unreadAlerts",    label: "Alerts",      labelKo: "알림",    icon: Bell,          alert: true },
  { key: "conflicts",       label: "Conflicts",   labelKo: "충돌",    icon: AlertTriangle, alert: true },
]

// ── loading skeleton ──────────────────────────────────────────────────
function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-7 w-40 mb-1" />
        <Skeleton className="h-4 w-64" />
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

      {/* charts */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card><CardContent className="p-4"><Skeleton className="h-48 w-full" /></CardContent></Card>
        <Card><CardContent className="p-4"><Skeleton className="h-48 w-full" /></CardContent></Card>
      </div>

      {/* feed */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-[72px] w-full rounded-lg" />
          ))}
        </div>
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[72px] w-full rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  )
}

// ── main page ─────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => mockApi.getDashboard(),
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
      {/* ── Page header ─────────────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            한국 성장기업 인텔리전스 · source-traceable intelligence on Korean private companies
          </p>
        </div>
        {data.conflicts > 0 && (
          <Badge variant="warning" className="shrink-0 mt-1">
            <AlertTriangle className="h-3 w-3" />
            {data.conflicts} conflict{data.conflicts !== 1 ? "s" : ""}
          </Badge>
        )}
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

      {/* ── Charts row ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Sector distribution — horizontal bar */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">
              섹터 분포 <span className="text-muted-foreground font-normal">/ Sector Distribution</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pr-2">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={data.sectorDist}
                layout="vertical"
                margin={{ top: 0, right: 24, bottom: 0, left: 4 }}
              >
                <XAxis
                  type="number"
                  allowDecimals={false}
                  tick={AXIS_STYLE}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={100}
                  tick={AXIS_STYLE}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  cursor={{ fill: "hsl(var(--muted))" }}
                  contentStyle={TOOLTIP_STYLE}
                  itemStyle={{ color: "hsl(var(--foreground))" }}
                  formatter={(v: number) => [v, "기업 수"]}
                />
                <Bar dataKey="value" radius={[0, 3, 3, 0]}>
                  {data.sectorDist.map((_, i) => (
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
              스테이지 분포 <span className="text-muted-foreground font-normal">/ Stage Distribution</span>
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

      {/* ── Event feeds ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent high-confidence events */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-medium">
              최근 고신뢰도 이벤트{" "}
              <span className="text-muted-foreground font-normal">/ Recent Events</span>
            </h2>
            <Badge variant="muted">{data.recentEvents.length}</Badge>
          </div>
          <div className="space-y-2">
            {data.recentEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">이벤트 없음</p>
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

        {/* Watchlist activity */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-medium">
              관심 기업 활동{" "}
              <span className="text-muted-foreground font-normal">/ Watchlist Activity</span>
            </h2>
            <Badge variant="muted">{data.watchlistActivity.length}</Badge>
          </div>
          <div className="space-y-2">
            {data.watchlistActivity.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">
                관심 기업의 최근 활동이 없습니다.
              </p>
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
      </div>
    </div>
  )
}
