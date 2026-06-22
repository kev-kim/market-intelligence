"use client"

import { ShieldCheck } from "lucide-react"
import { cn } from "@/lib/utils"
import type { SourceTier } from "@/lib/types"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

const TIER_META: Record<
  SourceTier,
  { label: string; desc: string; cls: string }
> = {
  0: {
    label: "T0",
    desc: "Official filing (DART · KRX · IR) — reputation weight 1.00",
    cls: "bg-conf-high/15 text-conf-high border-conf-high/30",
  },
  1: {
    label: "T1",
    desc: "Major business media — reputation weight 0.80–0.85",
    cls: "bg-primary/12 text-primary border-primary/25",
  },
  2: {
    label: "T2",
    desc: "Startup / general media — reputation weight 0.55–0.65",
    cls: "bg-warning/15 text-warning border-warning/30",
  },
  3: {
    label: "T3",
    desc: "Blog / aggregator — reputation weight 0.30",
    cls: "bg-muted text-muted-foreground border-border",
  },
}

export function SourceTierBadge({
  tier,
  official,
  className,
}: {
  tier: SourceTier
  official?: boolean
  className?: string
}) {
  const meta = TIER_META[tier]
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-2xs font-semibold tnum",
            meta.cls,
            className
          )}
        >
          {official && <ShieldCheck className="h-3 w-3" />}
          {meta.label}
        </span>
      </TooltipTrigger>
      <TooltipContent>{meta.desc}</TooltipContent>
    </Tooltip>
  )
}

export { TIER_META }
