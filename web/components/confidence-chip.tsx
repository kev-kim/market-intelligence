"use client"

import { cn, pct } from "@/lib/utils"
import type { ConfidenceFactors } from "@/lib/types"
import { confidenceBand } from "@/lib/confidence"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { ConfidenceFactorsPanel } from "@/components/confidence-factors"

const BAND_STYLE = {
  high: "bg-conf-high/12 text-conf-high border-conf-high/25",
  med: "bg-conf-med/12 text-conf-med border-conf-med/25",
  low: "bg-conf-low/12 text-conf-low border-conf-low/25",
} as const

const DOT = {
  high: "bg-conf-high",
  med: "bg-conf-med",
  low: "bg-conf-low",
} as const

/**
 * The single confidence chip reused at company / fact / event / assertion level.
 * Click to open the full deterministic breakdown popover.
 */
export function ConfidenceChip({
  confidence,
  factors,
  size = "default",
  showConflict,
  className,
}: {
  confidence: number
  factors?: ConfidenceFactors
  size?: "default" | "sm"
  showConflict?: boolean
  className?: string
}) {
  const band = confidenceBand(confidence)
  const conflict = showConflict ?? factors?.has_conflict ?? false

  const chip = (
    <button
      type="button"
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border font-medium tnum transition-colors",
        BAND_STYLE[band],
        size === "sm" ? "px-1.5 py-0.5 text-2xs" : "px-2 py-0.5 text-xs",
        factors && "hover:brightness-110 cursor-pointer",
        className
      )}
    >
      <span
        className={cn(
          "rounded-full",
          DOT[band],
          size === "sm" ? "h-1.5 w-1.5" : "h-2 w-2"
        )}
      />
      {pct(confidence)}
      {conflict && (
        <span className="ml-0.5 rounded-sm bg-warning/20 px-1 text-2xs font-semibold text-warning">
          ⚠ 불일치
        </span>
      )}
    </button>
  )

  if (!factors) return chip

  return (
    <Popover>
      <PopoverTrigger asChild>{chip}</PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[380px] max-w-[calc(100vw-2rem)]"
      >
        <ConfidenceFactorsPanel factors={factors} />
      </PopoverContent>
    </Popover>
  )
}

/** Inline confidence bar (for tables / lists). */
export function ConfidenceBar({ confidence }: { confidence: number }) {
  const band = confidenceBand(confidence)
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full", DOT[band])}
          style={{ width: `${Math.round(confidence * 100)}%` }}
        />
      </div>
      <span className="text-2xs tnum text-muted-foreground">
        {pct(confidence)}
      </span>
    </div>
  )
}
