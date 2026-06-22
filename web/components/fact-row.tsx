"use client"

import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import { ChevronRight, History, TrendingDown, TrendingUp } from "lucide-react"
import { cn, formatDate, pct } from "@/lib/utils"
import type { Fact } from "@/lib/types"
import { mockApi } from "@/lib/mock-api"
import { ConfidenceChip } from "@/components/confidence-chip"
import { ConfidenceFactorsPanel } from "@/components/confidence-factors"
import {
  ConflictComparison,
  ProvenanceList,
} from "@/components/provenance"
import { DecaySparkline } from "@/components/sparkline"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import {
  FACT_TYPE_LABEL,
  FACT_TYPE_LABEL_KO,
  formatFactValue,
} from "@/lib/format"

export function FactRow({ fact }: { fact: Fact }) {
  const [open, setOpen] = React.useState(false)
  const freshestAge = Math.min(
    ...fact.confidence_factors.contributions
      .filter((c) => !c.collapsed)
      .map((c) => c.age_days),
    Infinity
  )

  return (
    <div className="overflow-hidden rounded-lg border bg-card">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-accent/40"
      >
        <ChevronRight
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-90"
          )}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">
              {FACT_TYPE_LABEL[fact.fact_type]}
            </span>
            <span className="text-2xs text-muted-foreground">
              {FACT_TYPE_LABEL_KO[fact.fact_type]}
            </span>
            {fact.history.length > 1 && (
              <Badge variant="muted">
                <History className="h-3 w-3" /> {fact.history.length}
              </Badge>
            )}
          </div>
          {fact.as_of_date && (
            <div className="text-2xs text-muted-foreground tnum">
              as of {formatDate(fact.as_of_date)}
            </div>
          )}
        </div>

        <div className="text-right">
          <div className="text-base font-semibold tnum">
            {formatFactValue(fact)}
          </div>
        </div>

        <ConfidenceChip
          confidence={fact.confidence}
          showConflict={fact.has_conflict}
          size="sm"
        />
      </button>

      {open && (
        <div className="border-t bg-muted/20 p-4">
          <div className="grid gap-5 lg:grid-cols-2">
            {/* Left: confidence breakdown + decay + history */}
            <div className="space-y-4">
              <ConfidenceFactorsPanel factors={fact.confidence_factors} />

              {fact.confidence_factors.half_life_days != null &&
                Number.isFinite(freshestAge) && (
                  <div className="rounded-lg border bg-card p-3">
                    <div className="mb-1 flex items-center justify-between text-2xs uppercase tracking-wide text-muted-foreground">
                      <span>Recency decay</span>
                      <span>
                        H = {fact.confidence_factors.half_life_days}d
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <DecaySparkline
                        halfLife={fact.confidence_factors.half_life_days}
                        ageDays={freshestAge}
                      />
                      <p className="text-2xs text-muted-foreground">
                        Freshest source is {freshestAge}d old → weight ×
                        {Math.pow(
                          0.5,
                          freshestAge / fact.confidence_factors.half_life_days
                        ).toFixed(2)}
                        . Vertical line marks today.
                      </p>
                    </div>
                  </div>
                )}

              {fact.history.length > 1 && <FactHistory fact={fact} />}
            </div>

            {/* Right: provenance */}
            <div className="space-y-2">
              <div className="text-2xs uppercase tracking-wide text-muted-foreground">
                {fact.has_conflict
                  ? "Conflicting sources — side by side"
                  : "Backing assertions"}
              </div>
              <FactProvenance factId={fact.id} conflict={fact.has_conflict} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function FactProvenance({
  factId,
  conflict,
}: {
  factId: string
  conflict: boolean
}) {
  const { data, isLoading } = useQuery({
    queryKey: ["fact-sources", factId],
    queryFn: () => mockApi.getFactSources(factId),
  })
  if (isLoading || !data)
    return (
      <div className="space-y-2">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    )
  return conflict ? (
    <ConflictComparison bundle={data} />
  ) : (
    <ProvenanceList bundle={data} />
  )
}

/** Materialization history — how the value changed as new assertions arrived. */
function FactHistory({ fact }: { fact: Fact }) {
  const entries = [...fact.history].reverse() // newest first
  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="mb-2 text-2xs uppercase tracking-wide text-muted-foreground">
        Materialization history
      </div>
      <ol className="space-y-2">
        {entries.map((h, i) => {
          const prev = entries[i + 1]
          const delta =
            prev && h.value_numeric != null && prev.value_numeric != null
              ? h.value_numeric - prev.value_numeric
              : null
          const isCurrent = i === 0
          return (
            <li key={h.valid_from} className="flex items-center gap-2 text-xs">
              <span
                className={cn(
                  "h-1.5 w-1.5 shrink-0 rounded-full",
                  isCurrent ? "bg-primary" : "bg-muted-foreground/40"
                )}
              />
              <span className="tnum text-muted-foreground w-32 shrink-0">
                {formatDate(h.valid_from)}
                {h.valid_to ? ` → ${formatDate(h.valid_to)}` : " → 현재"}
              </span>
              <span className="font-medium tnum">
                {formatFactValue({
                  fact_type: fact.fact_type,
                  value_numeric: h.value_numeric,
                  value_text: h.value_text,
                  unit: fact.unit,
                })}
              </span>
              {delta != null && delta !== 0 && (
                <span
                  className={cn(
                    "inline-flex items-center gap-0.5 tnum",
                    delta > 0 ? "text-conf-high" : "text-conf-low"
                  )}
                >
                  {delta > 0 ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  {pct(Math.abs(delta) / (prev!.value_numeric || 1), 0)}
                </span>
              )}
              <ConfidenceChip confidence={h.confidence} size="sm" />
            </li>
          )
        })}
      </ol>
    </div>
  )
}
