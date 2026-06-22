"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

/** Minimal dependency-free sparkline. */
export function Sparkline({
  values,
  width = 96,
  height = 28,
  className,
  strokeClass = "stroke-primary",
  fill = true,
}: {
  values: number[]
  width?: number
  height?: number
  className?: string
  strokeClass?: string
  fill?: boolean
}) {
  if (values.length === 0) return null
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  const pad = 2
  const stepX = (width - pad * 2) / Math.max(1, values.length - 1)
  const pts = values.map((v, i) => {
    const x = pad + i * stepX
    const y = pad + (height - pad * 2) * (1 - (v - min) / span)
    return [x, y] as const
  })
  const line = pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ")
  const area = `${pad},${height - pad} ${line} ${width - pad},${height - pad}`

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={cn("overflow-visible", className)}
      preserveAspectRatio="none"
    >
      {fill && (
        <polygon
          points={area}
          className={cn("opacity-10", strokeClass.replace("stroke", "fill"))}
        />
      )}
      <polyline
        points={line}
        fill="none"
        className={cn("stroke-2", strokeClass)}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {pts.length > 0 && (
        <circle
          cx={pts[pts.length - 1][0]}
          cy={pts[pts.length - 1][1]}
          r={2}
          className={cn(strokeClass.replace("stroke", "fill"))}
        />
      )}
    </svg>
  )
}

/**
 * Confidence-decay sparkline: ρ(t)=0.5^(t/H) sampled from the fact's report date
 * to today, illustrating how recency erodes the assertion weight.
 */
export function DecaySparkline({
  halfLife,
  ageDays,
  width = 120,
  height = 32,
}: {
  halfLife: number
  ageDays: number
  width?: number
  height?: number
}) {
  const horizon = Math.max(halfLife * 2, ageDays + 30)
  const samples = 24
  const values = Array.from({ length: samples }, (_, i) => {
    const t = (horizon / (samples - 1)) * i
    return Math.pow(0.5, t / halfLife)
  })
  // marker position for "today"
  const markerIdx = Math.min(
    samples - 1,
    Math.round((ageDays / horizon) * (samples - 1))
  )
  return (
    <div className="relative inline-block">
      <Sparkline
        values={values}
        width={width}
        height={height}
        strokeClass="stroke-conf-med"
      />
      <div
        className="absolute top-0 h-full w-px bg-foreground/40"
        style={{ left: `${(markerIdx / (samples - 1)) * 100}%` }}
      />
    </div>
  )
}
