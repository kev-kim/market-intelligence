import type { CompanyEvent, EventType, Fact, FactType } from "./types"
import { formatKRWShort, formatNumber } from "./utils"

export const FACT_TYPE_LABEL: Record<FactType, string> = {
  valuation: "Valuation",
  funding_amount: "Latest Round",
  total_raised: "Total Raised",
  employee_count: "Headcount",
  revenue: "Revenue",
  ipo_target_date: "IPO Target",
  headquarters: "Headquarters",
  founded_year: "Founded",
}

export const FACT_TYPE_LABEL_KO: Record<FactType, string> = {
  valuation: "기업가치",
  funding_amount: "최근 투자",
  total_raised: "누적 투자",
  employee_count: "임직원수",
  revenue: "매출",
  ipo_target_date: "IPO 목표",
  headquarters: "본사",
  founded_year: "설립",
}

export const EVENT_TYPE_LABEL: Record<EventType, string> = {
  funding_round: "Funding Round",
  acquisition: "Acquisition",
  merger: "Merger",
  ipo_announcement: "IPO Filing",
  ipo_completion: "IPO Completed",
  profitability_milestone: "Profitability",
  partnership: "Partnership",
  executive_hire: "Exec Hire",
  executive_departure: "Exec Departure",
}

export type EventTone = "fund" | "exit" | "ipo" | "ops" | "people"

export const EVENT_TONE: Record<EventType, EventTone> = {
  funding_round: "fund",
  acquisition: "exit",
  merger: "exit",
  ipo_announcement: "ipo",
  ipo_completion: "ipo",
  profitability_milestone: "ops",
  partnership: "ops",
  executive_hire: "people",
  executive_departure: "people",
}

/** Display string for a fact's current value, respecting unit. */
export function formatFactValue(fact: {
  fact_type: FactType
  value_numeric: number | null
  value_text: string | null
  unit: string
}): string {
  if (fact.value_numeric == null && fact.value_text)
    return fact.value_text
  switch (fact.unit) {
    case "krw":
      return formatKRWShort(fact.value_numeric)
    case "count":
      return fact.value_numeric != null
        ? `${formatNumber(fact.value_numeric)}명`
        : "—"
    case "year":
      return fact.value_numeric != null ? `${fact.value_numeric}` : "—"
    case "region":
      return fact.value_text ?? "—"
    case "date":
      return fact.value_text ?? "—"
    default:
      return fact.value_numeric != null ? formatNumber(fact.value_numeric) : "—"
  }
}

/** Headline amount for an event card/timeline row. */
export function eventHeadlineAmount(event: CompanyEvent): number | null {
  const p = event.payload
  return (
    p.amount_krw ??
    p.post_money_krw ??
    p.market_cap_krw ??
    p.value_krw ??
    null
  )
}

export const STAGE_ORDER = [
  "Seed",
  "Series A",
  "Series B",
  "Series C",
  "Series D",
  "Series E+",
  "Pre-IPO",
  "Public",
  "Acquired",
]

export function sortFactsForDisplay(facts: Fact[]): Fact[] {
  const order: FactType[] = [
    "valuation",
    "total_raised",
    "funding_amount",
    "revenue",
    "employee_count",
    "ipo_target_date",
    "headquarters",
    "founded_year",
  ]
  return [...facts]
    .filter((f) => f.is_current)
    .sort((a, b) => order.indexOf(a.fact_type) - order.indexOf(b.fact_type))
}
