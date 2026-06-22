"use client"

import Link from "next/link"
import {
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
import { cn, formatDate, formatKRWShort, relativeTime } from "@/lib/utils"
import type { CompanyEvent, EventType } from "@/lib/types"
import { Badge } from "@/components/ui/badge"
import { ConfidenceChip } from "@/components/confidence-chip"
import { EVENT_TYPE_LABEL, eventHeadlineAmount } from "@/lib/format"

const ICON: Record<EventType, LucideIcon> = {
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

const TONE: Record<EventType, string> = {
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

export function EventRow({
  event,
  companyName,
  companyId,
  className,
}: {
  event: CompanyEvent
  companyName?: string
  companyId?: string
  className?: string
}) {
  const Icon = ICON[event.event_type] ?? Building
  const amount = eventHeadlineAmount(event)

  return (
    <Link
      href={`/events/${event.id}`}
      className={cn(
        "group flex items-start gap-3 rounded-lg border bg-card p-3 transition-colors hover:border-primary/40",
        className
      )}
    >
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-md",
          TONE[event.event_type]
        )}
      >
        <Icon className="h-4 w-4" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <Badge variant="muted">{EVENT_TYPE_LABEL[event.event_type]}</Badge>
          {event.event_status === "rumored" && (
            <Badge variant="warning">루머</Badge>
          )}
          {companyName && (
            <span className="truncate text-xs font-medium">{companyName}</span>
          )}
        </div>
        <p className="mt-1 truncate text-sm font-medium group-hover:text-primary">
          {event.summary}
        </p>
        <div className="mt-1 flex items-center gap-2 text-2xs text-muted-foreground tnum">
          <span>{formatDate(event.occurred_on, event.date_precision)}</span>
          {event.occurred_on && <span>· {relativeTime(event.occurred_on)}</span>}
        </div>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-1.5">
        {amount != null && (
          <span className="text-sm font-semibold tnum">
            {formatKRWShort(amount)}
          </span>
        )}
        <ConfidenceChip
          confidence={event.confidence}
          factors={event.confidence_factors}
          size="sm"
        />
      </div>
    </Link>
  )
}

export { ICON as EVENT_ICON, TONE as EVENT_TONE_CLASS }
