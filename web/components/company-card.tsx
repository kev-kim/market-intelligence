"use client"

import Link from "next/link"
import { ShieldCheck, Users } from "lucide-react"
import { cn, formatKRWShort, formatNumber } from "@/lib/utils"
import type { CompanyListItem } from "@/lib/types"
import { Badge } from "@/components/ui/badge"
import { ConfidenceChip } from "@/components/confidence-chip"
import { EVENT_TYPE_LABEL } from "@/lib/format"

export function CompanyCard({
  company,
  action,
  className,
}: {
  company: CompanyListItem
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "group relative flex flex-col rounded-lg border bg-card p-4 transition-colors hover:border-primary/40",
        className
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <Link href={`/companies/${company.id}`} className="min-w-0">
          <div className="flex items-center gap-1.5">
            <h3 className="truncate text-base font-semibold group-hover:text-primary">
              {company.canonical_name_ko}
            </h3>
            {company.is_dart_anchored && (
              <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-conf-high" />
            )}
          </div>
          <p className="truncate text-xs text-muted-foreground">
            {company.canonical_name_en}
          </p>
        </Link>
        {action}
      </div>

      <div className="mt-2 flex flex-wrap gap-1.5">
        <Badge variant="secondary">{company.sector}</Badge>
        <Badge variant="outline">{company.stage}</Badge>
        {company.has_conflict && (
          <Badge variant="warning">⚠ 출처 불일치</Badge>
        )}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
        <Metric label="기업가치">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold tnum">
              {formatKRWShort(company.latest_valuation_krw)}
            </span>
            {company.valuation_confidence != null && (
              <ConfidenceChip
                confidence={company.valuation_confidence}
                factors={company.valuation_factors ?? undefined}
                size="sm"
              />
            )}
          </div>
        </Metric>
        <Metric label="누적 투자">
          <span className="font-semibold tnum">
            {formatKRWShort(company.total_raised_krw)}
          </span>
        </Metric>
        <Metric label="임직원">
          <span className="inline-flex items-center gap-1 tnum">
            <Users className="h-3 w-3 text-muted-foreground" />
            {company.employee_count != null
              ? formatNumber(company.employee_count)
              : "—"}
          </span>
        </Metric>
        <Metric label="설립">
          <span className="tnum">{company.founded_year}</span>
        </Metric>
      </div>

      {company.latest_event && (
        <Link
          href={`/events/${company.latest_event.id}`}
          className="mt-3 flex items-center gap-2 border-t pt-2 text-2xs text-muted-foreground hover:text-foreground"
        >
          <Badge variant="muted">
            {EVENT_TYPE_LABEL[company.latest_event.event_type]}
          </Badge>
          <span className="truncate">{company.latest_event.summary}</span>
        </Link>
      )}
    </div>
  )
}

function Metric({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div>
      <div className="text-2xs uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="mt-0.5">{children}</div>
    </div>
  )
}
