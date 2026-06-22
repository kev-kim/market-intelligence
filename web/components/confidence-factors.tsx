"use client"

import { AlertTriangle } from "lucide-react"
import { cn, pct } from "@/lib/utils"
import type { ConfidenceFactors } from "@/lib/types"
import { confidenceBand } from "@/lib/confidence"
import { SourceTierBadge } from "@/components/source-badge"

const BAND_TEXT = {
  high: "text-conf-high",
  med: "text-conf-med",
  low: "text-conf-low",
} as const

/**
 * The trust surface: explains exactly how a confidence number was computed.
 * Deterministic — mirrors ARCHITECTURE.md §11. No value here comes from an LLM.
 */
export function ConfidenceFactorsPanel({
  factors,
  className,
}: {
  factors: ConfidenceFactors
  className?: string
}) {
  const band = confidenceBand(factors.confidence)
  return (
    <div className={cn("space-y-3 text-sm", className)}>
      <div className="flex items-baseline justify-between">
        <div>
          <div className="text-xs uppercase tracking-wide text-muted-foreground">
            Computed confidence
          </div>
          <div className={cn("text-2xl font-semibold tnum", BAND_TEXT[band])}>
            {pct(factors.confidence)}
          </div>
        </div>
        <div className="text-right text-xs text-muted-foreground max-w-[55%]">
          {factors.summary}
        </div>
      </div>

      {factors.has_conflict && (
        <div className="flex items-start gap-2 rounded-md border border-warning/30 bg-warning/10 px-2.5 py-1.5 text-xs text-warning">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            Sources disagree on this value. Consensus shown is the highest-weight
            claim; dissenting claims are listed below.
          </span>
        </div>
      )}

      {/* Formula breakdown */}
      <div className="grid grid-cols-3 gap-2">
        <Stat label="Corroboration" value={pct(factors.corroboration)} hint="1 − e^(−1.1·Wₐ)" />
        <Stat label="Agreement" value={pct(factors.agreement)} hint="Wₐ / Wₜₒₜₐₗ" />
        <Stat
          label="Official boost"
          value={`×${factors.official_boost.toFixed(2)}`}
          hint={factors.has_official ? "Tier-0 filing" : "none"}
        />
      </div>

      <div className="rounded-md bg-muted/50 px-2.5 py-1.5 font-mono text-2xs text-muted-foreground">
        min(0.99, {factors.corroboration.toFixed(3)} ×{" "}
        {factors.agreement.toFixed(3)} × {factors.official_boost.toFixed(2)}) ={" "}
        <span className={cn("font-semibold", BAND_TEXT[band])}>
          {factors.confidence.toFixed(3)}
        </span>
      </div>

      {/* Per-assertion contributions */}
      <div>
        <div className="mb-1 flex items-center justify-between text-2xs uppercase tracking-wide text-muted-foreground">
          <span>
            {factors.independent_sources} independent ·{" "}
            {factors.total_assertions} total assertions
          </span>
          <span>w = r · ρ · q</span>
        </div>
        <div className="overflow-hidden rounded-md border">
          <table className="w-full text-2xs">
            <thead className="bg-muted/60 text-muted-foreground">
              <tr className="[&>th]:px-2 [&>th]:py-1 [&>th]:text-left">
                <th>Source</th>
                <th className="!text-right">r</th>
                <th className="!text-right">ρ</th>
                <th className="!text-right">q</th>
                <th className="!text-right">w</th>
                <th className="!text-right">Value</th>
              </tr>
            </thead>
            <tbody className="tnum">
              {factors.contributions.map((c) => (
                <tr
                  key={c.assertion_id}
                  className={cn(
                    "border-t [&>td]:px-2 [&>td]:py-1",
                    c.collapsed && "opacity-40 line-through",
                    !c.agrees && !c.collapsed && "bg-warning/5"
                  )}
                >
                  <td className="flex items-center gap-1.5">
                    <SourceTierBadge tier={c.tier} official={c.tier === 0} />
                    <span className="truncate max-w-[90px]">{c.source_name}</span>
                  </td>
                  <td className="text-right">{c.r.toFixed(2)}</td>
                  <td className="text-right">{c.rho.toFixed(2)}</td>
                  <td className="text-right">{c.q.toFixed(2)}</td>
                  <td className="text-right font-medium">{c.weight.toFixed(2)}</td>
                  <td
                    className={cn(
                      "text-right",
                      !c.agrees && !c.collapsed && "text-warning font-medium"
                    )}
                  >
                    {c.value_label}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-1.5 text-2xs text-muted-foreground">
          Struck-through rows are syndicated copies collapsed to one signal
          (anti-churnalism). Amber rows dissent from consensus.
          {factors.half_life_days != null && (
            <> Half-life {factors.half_life_days}d applied to ρ.</>
          )}
        </p>
      </div>
    </div>
  )
}

function Stat({
  label,
  value,
  hint,
}: {
  label: string
  value: string
  hint: string
}) {
  return (
    <div className="rounded-md border bg-background px-2 py-1.5">
      <div className="text-2xs uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="text-sm font-semibold tnum">{value}</div>
      <div className="text-2xs text-muted-foreground font-mono">{hint}</div>
    </div>
  )
}
