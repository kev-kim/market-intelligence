/**
 * Domain types for the Korean Company Intelligence Platform.
 * These mirror the Postgres schema in docs/ARCHITECTURE.md §6 so that swapping
 * the mock API for the real FastAPI client later is a shape-compatible change.
 *
 * Tier model (CLAUDE.md):
 *   Raw     — articles, event_assertions, fact_assertions   (immutable)
 *   Derived — companies, events, facts                       (recomputable)
 *   Product — watchlists, alerts                             (mutable, user-owned)
 */

// ────────────────────────────── Raw tier ──────────────────────────────

export type SourceTier = 0 | 1 | 2 | 3

export interface Source {
  id: string
  domain: string
  name: string
  tier: SourceTier
  weight: number
  is_official: boolean
}

export interface Article {
  id: string
  source_id: string
  title: string
  /** Short snippet ONLY — never full article body (CLAUDE.md invariant). */
  snippet: string
  url: string
  published_at: string // ISO date
  /** Syndication cluster: copies of the same wire story share a cluster id. */
  dedup_cluster_id: string
}

export type ExtractionQualityLabel = "explicit" | "derived" | "inferred"
export type DatePrecision = "day" | "month" | "quarter" | "year" | "unknown"
export type EventStatus = "rumored" | "announced" | "completed"

export type EventType =
  | "funding_round"
  | "acquisition"
  | "merger"
  | "ipo_announcement"
  | "ipo_completion"
  | "profitability_milestone"
  | "partnership"
  | "executive_hire"
  | "executive_departure"

export type FactType =
  | "valuation"
  | "funding_amount"
  | "total_raised"
  | "employee_count"
  | "revenue"
  | "ipo_target_date"
  | "headquarters"
  | "founded_year"

export type FactUnit = "krw" | "count" | "date" | "region" | "year"

/** Per-event-type payloads (ARCHITECTURE.md §7.2). Loose union for the demo. */
export interface EventPayload {
  round_name?: string
  amount_krw?: number | null
  pre_money_krw?: number | null
  post_money_krw?: number | null
  lead_investor?: string
  investors?: string[]
  acquirer?: string
  target?: string
  stake_pct?: number
  entity_a?: string
  entity_b?: string
  surviving_entity?: string
  exchange?: string
  target_date?: string
  offer_price_krw?: number | null
  market_cap_krw?: number | null
  underwriters?: string[]
  metric?: string
  period?: string
  value_krw?: number
  turned_positive?: boolean
  partner?: string
  nature?: string
  description?: string
  person?: string
  role?: string
  direction?: "join" | "leave"
  effective_date?: string
}

export interface EventAssertion {
  id: string
  article_id: string
  company_id: string
  event_type: EventType
  payload: EventPayload
  occurred_on: string | null
  date_precision: DatePrecision
  event_status: EventStatus
  evidence_quote: string
  model_name: string
  model_version: string
  prompt_version: string
  created_at: string
}

export interface FactAssertion {
  id: string
  article_id: string
  company_id: string
  event_id?: string | null
  fact_type: FactType
  raw_value: string // as written, e.g. "500억원"
  value_numeric: number | null // normalized KRW integer / count / year
  value_text: string | null
  unit: FactUnit
  as_of_date: string | null
  extraction_quality: number // 1.0 explicit / 0.7 derived / 0.4 inferred
  evidence_quote: string
  model_name: string
  model_version: string
  prompt_version: string
  created_at: string
}

// ─────────────────────────── Confidence ───────────────────────────────

/** Human-readable breakdown rendered in the trust UI (CLAUDE.md invariant). */
export interface ConfidenceFactors {
  confidence: number
  corroboration: number
  agreement: number
  official_boost: number
  independent_sources: number
  total_assertions: number
  consensus_value: string
  w_agree: number
  w_total: number
  has_official: boolean
  has_conflict: boolean
  half_life_days: number | null
  /** Per-assertion contribution rows for the table in the popover. */
  contributions: AssertionContribution[]
  summary: string
}

export interface AssertionContribution {
  assertion_id: string
  source_name: string
  tier: SourceTier
  r: number // source reputation
  rho: number // recency factor
  q: number // extraction quality
  weight: number
  age_days: number
  agrees: boolean
  collapsed: boolean // suppressed as syndicated duplicate
  value_label: string
}

// ─────────────────────────── Derived tier ─────────────────────────────

export interface CompanyEvent {
  id: string
  company_id: string
  event_type: EventType
  payload: EventPayload
  occurred_on: string | null
  date_precision: DatePrecision
  event_status: EventStatus
  confidence: number
  confidence_factors: ConfidenceFactors
  summary: string
  is_published: boolean
  first_seen_at: string
  assertion_ids: string[]
}

/** A single point in a fact's materialization history. */
export interface FactHistoryEntry {
  value_numeric: number | null
  value_text: string | null
  as_of_date: string | null
  valid_from: string
  valid_to: string | null
  confidence: number
}

export interface Fact {
  id: string
  company_id: string
  fact_type: FactType
  value_numeric: number | null
  value_text: string | null
  unit: FactUnit
  as_of_date: string | null
  confidence: number
  confidence_factors: ConfidenceFactors
  valid_from: string
  valid_to: string | null
  is_current: boolean
  has_conflict: boolean
  assertion_ids: string[]
  history: FactHistoryEntry[]
  /** Optional ground-truth label for the calibration view. */
  label_true_value?: number | string | null
}

export type CompanyStage =
  | "Seed"
  | "Series A"
  | "Series B"
  | "Series C"
  | "Series D"
  | "Series E+"
  | "Pre-IPO"
  | "Public"
  | "Acquired"

export interface Company {
  id: string
  dart_corp_code: string | null
  canonical_name_ko: string
  canonical_name_en: string
  aliases: string[]
  sector: string
  stage: CompanyStage
  hq_region: string
  hq_text: string
  founded_year: number
  employee_count: number | null
  total_raised_krw: number | null
  latest_valuation_krw: number | null
  description: string
  is_dart_anchored: boolean
}

/** Profile bundle returned for the company page. */
export interface CompanyProfile {
  company: Company
  facts: Fact[]
  events: CompanyEvent[]
}

/** Company enriched with at-a-glance trust signals for cards / search lists. */
export interface CompanyListItem extends Company {
  valuation_confidence: number | null
  valuation_factors: ConfidenceFactors | null
  event_count: number
  has_conflict: boolean
  latest_event: {
    id: string
    summary: string
    occurred_on: string | null
    event_type: EventType
  } | null
}

// ─────────────────────────── Product tier ─────────────────────────────

export interface Watchlist {
  id: string
  name: string
  company_ids: string[]
  created_at: string
}

export type AlertType =
  | "new_funding"
  | "valuation_change"
  | "ipo_filing"
  | "new_event"
  | "conflict_detected"

export interface Alert {
  id: string
  company_id: string
  event_id: string | null
  fact_id?: string | null
  alert_type: AlertType
  title: string
  detail: string
  created_at: string
  read_at: string | null
}

// ─────────────────────────── Provenance bundle ────────────────────────

/** The traceability spine: assertions + their articles + sources behind a row. */
export interface ProvenanceBundle {
  assertions: (FactAssertion | EventAssertion)[]
  articles: Record<string, Article>
  sources: Record<string, Source>
}
