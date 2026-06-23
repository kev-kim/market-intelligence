"use client"

import { useQuery } from "@tanstack/react-query"
import {
  ComposedChart,
  Line,
  ReferenceLine,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Dot,
} from "recharts"
import { CheckCircle2, XCircle, BarChart2 } from "lucide-react"
import { api } from "@/lib/api"
import type { CalibrationData, CalibrationPoint } from "@/lib/api"
import { FACT_TYPE_LABEL } from "@/lib/format"
import { ConfidenceChip } from "@/components/confidence-chip"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { cn, pct } from "@/lib/utils"

// ── chart constants ────────────────────────────────────────────────────
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
const OBSERVED_COLOR = "hsl(213 90% 62%)"
const REF_COLOR = "hsl(var(--muted-foreground))"

// ── loading skeleton ───────────────────────────────────────────────────
function CalibrationSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="mb-1 h-7 w-56" />
        <Skeleton className="h-4 w-96" />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <Skeleton className="mb-2 h-4 w-24" />
              <Skeleton className="h-8 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardContent className="p-4">
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4">
          <Skeleton className="h-40 w-full" />
        </CardContent>
      </Card>
    </div>
  )
}

// ── per-bin table ──────────────────────────────────────────────────────
interface BinRow {
  label: string
  mid: number
  count: number
  predicted: number | null
  actual: number | null
}

function BinTable({ rows }: { rows: BinRow[] }) {
  return (
    <div className="overflow-x-auto scrollbar-thin">
      <table className="w-full text-xs tnum">
        <thead>
          <tr className="border-b text-left text-muted-foreground">
            <th className="pb-2 pr-4 font-medium">Bin</th>
            <th className="pb-2 pr-4 font-medium text-right">Count</th>
            <th className="pb-2 pr-4 font-medium text-right">Mean Predicted</th>
            <th className="pb-2 pr-4 font-medium text-right">Observed Acc.</th>
            <th className="pb-2 font-medium text-right">Gap</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const gap =
              row.predicted != null && row.actual != null
                ? row.predicted - row.actual
                : null
            const isEmpty = row.count === 0
            return (
              <tr
                key={row.label}
                className={cn(
                  "border-b last:border-0",
                  isEmpty && "opacity-40"
                )}
              >
                <td className="py-2 pr-4 font-mono text-foreground">
                  {row.label}
                </td>
                <td className="py-2 pr-4 text-right">
                  {isEmpty ? "—" : row.count}
                </td>
                <td className="py-2 pr-4 text-right">
                  {row.predicted != null ? pct(row.predicted, 1) : "—"}
                </td>
                <td className="py-2 pr-4 text-right">
                  {row.actual != null ? pct(row.actual, 1) : "—"}
                </td>
                <td
                  className={cn(
                    "py-2 text-right font-medium",
                    gap == null
                      ? "text-muted-foreground"
                      : gap > 0.05
                        ? "text-negative"   // over-confident
                        : gap < -0.05
                          ? "text-conf-med"  // under-confident
                          : "text-positive"  // well-calibrated
                  )}
                >
                  {gap == null
                    ? "—"
                    : `${gap >= 0 ? "+" : ""}${pct(gap, 1)}`}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ── labeled facts table ────────────────────────────────────────────────
function PointsTable({ points }: { points: CalibrationPoint[] }) {
  const sorted = [...points].sort((a, b) => b.predicted - a.predicted)
  return (
    <div className="overflow-x-auto scrollbar-thin">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b text-left text-muted-foreground">
            <th className="pb-2 pr-4 font-medium">Fact Type</th>
            <th className="pb-2 pr-4 font-medium">Value</th>
            <th className="pb-2 pr-4 font-medium">Confidence</th>
            <th className="pb-2 font-medium text-center">Correct?</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((pt) => (
            <tr key={pt.fact_id} className="border-b last:border-0">
              <td className="py-2 pr-4 text-muted-foreground">
                {FACT_TYPE_LABEL[pt.fact_type]}
              </td>
              <td className="py-2 pr-4 tnum font-medium text-foreground max-w-[180px] truncate">
                {pt.value_label}
              </td>
              <td className="py-2 pr-4">
                <ConfidenceChip confidence={pt.predicted} size="sm" />
              </td>
              <td className="py-2 text-center">
                {pt.correct ? (
                  <CheckCircle2 className="mx-auto h-4 w-4 text-positive" />
                ) : (
                  <XCircle className="mx-auto h-4 w-4 text-negative" />
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── reliability diagram custom dot (scaled by count) ──────────────────
type CountDotProps = {
  cx?: number
  cy?: number
  payload?: { actual?: number | null; count?: number }
}
function CountDot(props: CountDotProps) {
  const { cx, cy, payload } = props
  if (payload?.actual == null || payload?.count == null) return null
  const r = Math.max(4, Math.min(10, 4 + Math.sqrt(payload.count) * 1.2))
  return (
    <circle
      cx={cx}
      cy={cy}
      r={r}
      fill={OBSERVED_COLOR}
      fillOpacity={0.85}
      stroke="hsl(var(--background))"
      strokeWidth={1.5}
    />
  )
}

// ── brier label ────────────────────────────────────────────────────────
function brierLabel(score: number): string {
  if (score < 0.1) return "well-calibrated"
  if (score < 0.2) return "needs tuning"
  return "miscalibrated"
}

// ── main page ─────────────────────────────────────────────────────────
export default function CalibrationPage() {
  const { data, isLoading, isError } = useQuery<CalibrationData>({
    queryKey: ["calibration"],
    queryFn: () => api.getCalibration(),
  })

  if (isLoading) return <CalibrationSkeleton />

  if (isError || !data) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-sm text-muted-foreground">
          데이터를 불러오지 못했습니다. · Failed to load calibration data.
        </p>
      </div>
    )
  }

  const { brier, points, reliability } = data

  const totalLabeled = points.length
  const correctCount = points.filter((p) => p.correct).length
  const overallAcc = totalLabeled > 0 ? correctCount / totalLabeled : 0

  // Build chart data: skip bins with no data for line rendering but keep for table
  // For the perfect-calibration reference, we need 0→1 segment data
  const refLine = [
    { xRef: 0, yRef: 0 },
    { xRef: 1, yRef: 1 },
  ]

  // Chart data: bins with observations (non-null predicted/actual)
  const chartData = reliability
    .filter((b) => b.count > 0)
    .map((b) => ({
      label: b.label,
      mid: b.mid,
      count: b.count,
      predicted: b.predicted,
      actual: b.actual,
    }))

  return (
    <div className="space-y-6">
      {/* ── Page header ─────────────────────────────────────────────── */}
      <div className="flex items-start gap-3">
        <BarChart2 className="mt-0.5 h-6 w-6 shrink-0 text-primary" />
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            Confidence Calibration{" "}
            <span className="ml-1 text-sm font-normal text-muted-foreground">
              신뢰도 보정
            </span>
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground max-w-2xl">
            Of all facts rated at ~90% confidence, are ~90% actually correct?
            Calibration is tracked via the Brier score and reliability diagrams;
            constants are tuned in Python—never by asking an LLM.
          </p>
        </div>
      </div>

      {/* ── KPI cards ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {/* Brier score */}
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Brier Score · 브라이어 점수
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <p className="text-3xl font-semibold tnum leading-none">
              {brier.toFixed(3)}
            </p>
            <p
              className={cn(
                "mt-1 text-xs font-medium",
                brier < 0.1
                  ? "text-positive"
                  : brier < 0.2
                    ? "text-conf-med"
                    : "text-negative"
              )}
            >
              {brierLabel(brier)}
            </p>
            <p className="mt-0.5 text-2xs text-muted-foreground">
              Lower is better · 낮을수록 좋음
            </p>
          </CardContent>
        </Card>

        {/* Labeled facts */}
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Labeled Facts · 레이블된 사실
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <p className="text-3xl font-semibold tnum leading-none">
              {totalLabeled.toLocaleString()}
            </p>
            <p className="mt-1 text-2xs text-muted-foreground">
              {correctCount} correct · {totalLabeled - correctCount} incorrect
            </p>
          </CardContent>
        </Card>

        {/* Overall accuracy */}
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Overall Accuracy · 전체 정확도
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <p className="text-3xl font-semibold tnum leading-none">
              {pct(overallAcc, 1)}
            </p>
            <p className="mt-1 text-2xs text-muted-foreground">
              Across all labeled facts
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ── Reliability diagram ─────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">
            Reliability Diagram{" "}
            <span className="ml-1 text-xs font-normal text-muted-foreground">
              신뢰도 다이어그램
            </span>
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Points above the diagonal line indicate under-confidence; below indicates over-confidence.
            Dot size scales with bin count.
          </p>
        </CardHeader>
        <CardContent>
          {chartData.length === 0 ? (
            <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
              No labeled data yet.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <ComposedChart
                data={chartData}
                margin={{ top: 8, right: 16, bottom: 24, left: 8 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={GRID_STROKE}
                  strokeOpacity={0.6}
                />
                <XAxis
                  dataKey="predicted"
                  type="number"
                  domain={[0, 1]}
                  tickCount={6}
                  tickFormatter={(v: number) => pct(v)}
                  tick={AXIS_STYLE}
                  label={{
                    value: "Predicted confidence",
                    position: "insideBottom",
                    offset: -12,
                    style: { ...AXIS_STYLE, fontSize: 10 },
                  }}
                />
                <YAxis
                  type="number"
                  domain={[0, 1]}
                  tickCount={6}
                  tickFormatter={(v: number) => pct(v)}
                  tick={AXIS_STYLE}
                  label={{
                    value: "Observed accuracy",
                    angle: -90,
                    position: "insideLeft",
                    offset: 12,
                    style: { ...AXIS_STYLE, fontSize: 10 },
                  }}
                />
                <Tooltip
                  wrapperStyle={TOOLTIP_STYLE}
                  contentStyle={TOOLTIP_STYLE}
                  formatter={(value: number, name: string) => [
                    pct(value, 1),
                    name === "actual" ? "Observed accuracy" : "Mean predicted",
                  ]}
                  labelFormatter={(label: number) =>
                    `Predicted: ${pct(label, 0)}`
                  }
                />

                {/* Perfect calibration diagonal: y = x */}
                <ReferenceLine
                  segment={[
                    { x: 0, y: 0 },
                    { x: 1, y: 1 },
                  ]}
                  stroke={REF_COLOR}
                  strokeDasharray="6 4"
                  strokeWidth={1.5}
                  label={{
                    value: "Perfect",
                    position: "insideTopLeft",
                    style: { fill: REF_COLOR, fontSize: 10 },
                  }}
                />

                {/* Observed line with count-scaled dots */}
                <Line
                  type="linear"
                  dataKey="actual"
                  stroke={OBSERVED_COLOR}
                  strokeWidth={2}
                  dot={<CountDot />}
                  activeDot={{ r: 5, fill: OBSERVED_COLOR }}
                  connectNulls={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* ── Per-bin table ────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">
            Bin Summary{" "}
            <span className="ml-1 text-xs font-normal text-muted-foreground">
              구간별 요약
            </span>
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Gap = mean predicted − observed accuracy. Positive gap = over-confident (
            <span className="text-negative">red</span>), negative = under-confident (
            <span className="text-conf-med">amber</span>), |gap| ≤ 5 pp = on-target (
            <span className="text-positive">green</span>).
          </p>
        </CardHeader>
        <CardContent>
          <BinTable rows={reliability} />
        </CardContent>
      </Card>

      {/* ── Labeled facts scatter table ──────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">
            Labeled Facts{" "}
            <span className="ml-1 text-xs font-normal text-muted-foreground">
              레이블된 사실 목록
            </span>
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Sorted by predicted confidence descending. Green ✓ = model value matches
            ground truth (within 10% for numeric). Red ✗ = mismatch.
          </p>
        </CardHeader>
        <CardContent>
          {points.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No labeled facts yet. Label ground-truth values in the database to
              enable calibration tracking.
            </p>
          ) : (
            <PointsTable points={points} />
          )}
        </CardContent>
      </Card>

      {/* ── Methodology note ─────────────────────────────────────────── */}
      <Card className="border-dashed">
        <CardContent className="p-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            Methodology · 방법론
          </p>
          <p className="text-xs text-muted-foreground leading-relaxed max-w-3xl">
            Confidence is computed deterministically in Python—never produced by an
            LLM. The formula is:{" "}
            <span className="font-mono text-foreground">
              Confidence = min(0.99, Corroboration · Agreement · Official_boost)
            </span>
            , where Corroboration = 1 − exp(−k · W_agree) with saturation constant
            k = 1.1; Agreement = W_agree / W_total; Official boost = 1.15 if any
            agreeing assertion comes from a Tier-0 (DART / KRX / IR) source, else
            1.0. Per-assertion weights are{" "}
            <span className="font-mono text-foreground">w = r · ρ(Δt) · q</span> —
            source reputation × recency decay × extraction quality. The 0.99 cap is
            intentional: the system never claims certainty. Calibration is tracked
            via Brier score and reliability diagrams; k, tier weights, and half-lives
            are tuned in{" "}
            <span className="font-mono text-foreground">
              config/confidence.py
            </span>{" "}
            through offline calibration runs, not by prompting an LLM.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
