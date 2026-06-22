/**
 * Deterministic confidence engine — ARCHITECTURE.md §11, constants from §Appendix D
 * and CLAUDE.md. LLMs NEVER produce these numbers (CLAUDE.md rule 3). Everything
 * here is computed from source reputation, independent corroboration, agreement,
 * recency, and the official-filing boost.
 *
 * This mirrors `config/confidence.py`. If the formula changes we recompute — we
 * never migrate derived rows.
 */

import type {
  AssertionContribution,
  ConfidenceFactors,
  FactAssertion,
  FactType,
  Source,
  Article,
  SourceTier,
} from "./types"

// ───────────────────────── canonical constants ────────────────────────

export const K_CORROB = 1.1

export const TIER_WEIGHTS: Record<SourceTier, number> = {
  0: 1.0, // official (DART, KRX, company IR)
  1: 0.85, // major business media
  2: 0.6, // startup/general media
  3: 0.3, // blog/aggregator
}

export const CONFIDENCE_CAP = 0.99
export const OFFICIAL_BOOST = 1.15

export const EXTRACTION_QUALITY = {
  explicit: 1.0,
  derived: 0.7,
  inferred: 0.4,
} as const

/** Recency half-lives by fact type (days). null = no decay. */
export const HALF_LIVES: Record<FactType, number | null> = {
  valuation: 180,
  funding_amount: null,
  total_raised: 365,
  employee_count: 365,
  revenue: 365,
  ipo_target_date: 90,
  headquarters: 730,
  founded_year: null,
}

export const SIMHASH_HAMMING_THRESHOLD = 3
export const EMBEDDING_COSINE_THRESHOLD = 0.92
export const RESOLUTION_AUTO_MERGE_THRESHOLD = 0.92
export const RESOLUTION_REVIEW_THRESHOLD = 0.75

/** Fixed "today" so recency decay is deterministic across the demo. */
export const NOW = new Date("2026-06-22T00:00:00")

// ─────────────────────────── core math ────────────────────────────────

/** ρ(Δt) = 0.5^(Δt / H). No decay when H is null. */
export function recencyFactor(ageDays: number, halfLife: number | null): number {
  if (halfLife == null) return 1.0
  return Math.pow(0.5, ageDays / halfLife)
}

function ageDays(iso: string | null, now: Date): number {
  if (!iso) return 0
  const then = new Date(iso + "T00:00:00").getTime()
  return Math.max(0, Math.round((now.getTime() - then) / 86_400_000))
}

/** Two numeric values agree if within 5%; categorical must match exactly. */
function valuesAgree(
  a: number | string | null,
  b: number | string | null
): boolean {
  if (a == null || b == null) return a === b
  if (typeof a === "number" && typeof b === "number") {
    if (a === 0 && b === 0) return true
    const denom = Math.max(Math.abs(a), Math.abs(b))
    return Math.abs(a - b) / denom <= 0.05
  }
  return String(a) === String(b)
}

export interface AggregationInput {
  assertion_id: string
  value: number | string | null
  value_label: string
  raw_date: string | null // report date used for recency
  source: Source
  quality: number // extraction quality q
  dedup_cluster_id: string
}

export interface AggregationResult {
  confidence: number
  consensus_value: number | string | null
  consensus_label: string
  has_conflict: boolean
  factors: ConfidenceFactors
}

/**
 * The §11 aggregation, shared by facts and events.
 *  1. weight each assertion  w = r · ρ(Δt) · q
 *  2. independence collapse — syndicated copies keep MAX weight, not sum
 *  3. cluster by value, pick v* with highest summed weight
 *  4. Corroboration · Agreement · OfficialBoost, capped at 0.99
 */
export function aggregate(
  inputs: AggregationInput[],
  halfLife: number | null,
  now: Date = NOW
): AggregationResult {
  // 1. raw weights
  const rows = inputs.map((inp) => {
    const r = inp.source.weight
    const age = ageDays(inp.raw_date, now)
    const rho = recencyFactor(age, halfLife)
    const weight = r * rho * inp.quality
    return { ...inp, r, rho, age, weight, collapsed: false }
  })

  // 2. independence collapse: within a dedup cluster only the max weight counts
  const byCluster = new Map<string, typeof rows>()
  for (const row of rows) {
    const arr = byCluster.get(row.dedup_cluster_id) ?? []
    arr.push(row)
    byCluster.set(row.dedup_cluster_id, arr)
  }
  for (const arr of byCluster.values()) {
    if (arr.length <= 1) continue
    const keep = arr.reduce(
      (m: (typeof arr)[number], x: (typeof arr)[number]) =>
        x.weight > m.weight ? x : m,
      arr[0]
    )
    for (const row of arr) if (row !== keep) row.collapsed = true
  }

  const live = rows.filter((r) => !r.collapsed)

  // 3. cluster by value, choose v* = highest summed weight
  type Cluster = {
    value: number | string | null
    label: string
    weight: number
    hasOfficial: boolean
  }
  const clusters: Cluster[] = []
  for (const row of live) {
    const c = clusters.find((cl) => valuesAgree(cl.value, row.value))
    if (c) {
      c.weight += row.weight
      if (row.source.is_official) c.hasOfficial = true
    } else {
      clusters.push({
        value: row.value,
        label: row.value_label,
        weight: row.weight,
        hasOfficial: row.source.is_official,
      })
    }
  }
  clusters.sort((a, b) => b.weight - a.weight)
  const consensus = clusters[0] ?? {
    value: null,
    label: "—",
    weight: 0,
    hasOfficial: false,
  }
  const hasConflict = clusters.length > 1

  // 4. aggregation formula
  const wTotal = live.reduce((s, r) => s + r.weight, 0)
  const agreeRows = live.filter((r) => valuesAgree(consensus.value, r.value))
  const wAgree = agreeRows.reduce((s, r) => s + r.weight, 0)
  const hasOfficialAgree = agreeRows.some((r) => r.source.is_official)

  const corroboration = 1 - Math.exp(-K_CORROB * wAgree)
  const agreement = wTotal > 0 ? wAgree / wTotal : 0
  const officialBoost = hasOfficialAgree ? OFFICIAL_BOOST : 1.0
  const confidence = Math.min(
    CONFIDENCE_CAP,
    corroboration * agreement * officialBoost
  )

  const independentSources = live.length
  const contributions: AssertionContribution[] = rows.map((r) => ({
    assertion_id: r.assertion_id,
    source_name: r.source.name,
    tier: r.source.tier,
    r: round(r.r, 2),
    rho: round(r.rho, 3),
    q: round(r.quality, 2),
    weight: round(r.weight, 3),
    age_days: r.age,
    agrees: valuesAgree(consensus.value, r.value),
    collapsed: r.collapsed,
    value_label: r.value_label,
  }))

  const summary = buildSummary({
    independentSources,
    agreement,
    hasOfficialAgree,
    hasConflict,
    confidence,
  })

  const factors: ConfidenceFactors = {
    confidence: round(confidence, 3),
    corroboration: round(corroboration, 3),
    agreement: round(agreement, 3),
    official_boost: officialBoost,
    independent_sources: independentSources,
    total_assertions: rows.length,
    consensus_value: consensus.label,
    w_agree: round(wAgree, 3),
    w_total: round(wTotal, 3),
    has_official: hasOfficialAgree,
    has_conflict: hasConflict,
    half_life_days: halfLife,
    contributions,
    summary,
  }

  return {
    confidence: round(confidence, 3),
    consensus_value: consensus.value,
    consensus_label: consensus.label,
    has_conflict: hasConflict,
    factors,
  }
}

function buildSummary(a: {
  independentSources: number
  agreement: number
  hasOfficialAgree: boolean
  hasConflict: boolean
  confidence: number
}): string {
  const parts: string[] = []
  parts.push(
    `${a.independentSources} independent source${a.independentSources === 1 ? "" : "s"}`
  )
  parts.push(
    a.agreement >= 0.999
      ? "full agreement"
      : `${Math.round(a.agreement * 100)}% weighted agreement`
  )
  parts.push(a.hasOfficialAgree ? "official filing" : "no official filing")
  if (a.hasConflict) parts.push("conflicting claims present")
  return parts.join(", ")
}

/** Build the AggregationInput list for a fact from its assertions. */
export function factInputs(
  assertions: FactAssertion[],
  sources: Record<string, Source>,
  articles: Record<string, Article>
): AggregationInput[] {
  return assertions.map((a) => {
    const art = articles[a.article_id]
    const src = sources[art.source_id]
    const value: number | string | null =
      a.value_numeric != null ? a.value_numeric : a.value_text
    return {
      assertion_id: a.id,
      value,
      value_label: a.raw_value,
      raw_date: art.published_at,
      source: src,
      quality: a.extraction_quality,
      dedup_cluster_id: art.dedup_cluster_id,
    }
  })
}

function round(n: number, digits: number): number {
  const f = Math.pow(10, digits)
  return Math.round(n * f) / f
}

/** Bucket a confidence scalar into a semantic band for color/labeling. */
export function confidenceBand(c: number): "high" | "med" | "low" {
  if (c >= 0.8) return "high"
  if (c >= 0.5) return "med"
  return "low"
}
