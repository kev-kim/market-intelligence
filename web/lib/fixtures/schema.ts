/**
 * Compact authoring schema for fixture seeds. The generator (generate.ts) expands
 * these into the full Article / Assertion / Event / Fact graph and runs the real
 * confidence engine over them, so fixture confidence numbers are not hand-typed —
 * they are computed exactly as production would compute them.
 */
import type {
  CompanyStage,
  DatePrecision,
  EventPayload,
  EventStatus,
  EventType,
  ExtractionQualityLabel,
  FactType,
  FactUnit,
} from "../types"
import type { SourceKey } from "./sources"

export interface EventAssertionSeed {
  src: SourceKey
  daysAgo: number
  title: string
  snippet: string
  quote: string
  status?: EventStatus
  /** Syndication cluster: copies of one wire story share this id. */
  cluster?: string
  /** Override the agreement key to model a disputed event. */
  valueKey?: string
}

export interface EventSeed {
  type: EventType
  payload: EventPayload
  occurred_on: string
  date_precision?: DatePrecision
  status?: EventStatus
  summary: string
  assertions: EventAssertionSeed[]
  /** Auto-derive funding_amount / valuation facts from a funding_round. */
  derivesFacts?: boolean
}

export interface FactAssertionSeed {
  src: SourceKey
  daysAgo: number
  /** Normalized value: KRW integer / count / year, or text for region. */
  value: number | string
  /** As written in source, e.g. "500억원", "약 350명". */
  raw: string
  quote: string
  title?: string
  snippet?: string
  quality?: ExtractionQualityLabel
  /** as_of_date ISO; defaults to the report date. */
  asOf?: string
  /** History generation (0 = oldest). Latest generation is the current fact. */
  gen?: number
  cluster?: string
}

export interface FactSeed {
  type: FactType
  unit: FactUnit
  assertions: FactAssertionSeed[]
  /** Optional ground-truth value for the calibration view. */
  trueValue?: number | string | null
}

export interface CompanySeed {
  id: string
  dart: string | null
  ko: string
  en: string
  aliases: string[]
  sector: string
  stage: CompanyStage
  hqRegion: string
  hq: string
  founded: number
  description: string
  events: EventSeed[]
  facts: FactSeed[]
}

export interface WatchlistSeed {
  id: string
  name: string
  company_ids: string[]
  daysAgo: number
}
