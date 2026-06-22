/**
 * Expands compact seeds (schema.ts) into the full domain graph and runs the real
 * confidence engine (../confidence.ts) over every fact and event. Nothing here
 * hand-types a confidence number — it is all computed.
 */
import {
  aggregate,
  factInputs,
  HALF_LIVES,
  NOW,
  type AggregationInput,
} from "../confidence"
import type {
  Alert,
  Article,
  Company,
  CompanyEvent,
  EventAssertion,
  Fact,
  FactAssertion,
  FactHistoryEntry,
  Source,
  Watchlist,
} from "../types"
import { SOURCES } from "./sources"
import type { CompanySeed, EventSeed, FactSeed, WatchlistSeed } from "./schema"

export interface Dataset {
  companies: Company[]
  sources: Record<string, Source>
  articles: Record<string, Article>
  eventAssertions: Record<string, EventAssertion>
  factAssertions: Record<string, FactAssertion>
  events: CompanyEvent[]
  facts: Fact[]
  watchlists: Watchlist[]
  alerts: Alert[]
}

const QUALITY = { explicit: 1.0, derived: 0.7, inferred: 0.4 } as const
const EVENT_QUALITY: Record<string, number> = {
  completed: 1.0,
  announced: 1.0,
  rumored: 0.7,
}

function isoMinusDays(days: number): string {
  const d = new Date(NOW.getTime() - days * 86_400_000)
  return d.toISOString().slice(0, 10)
}

export function generate(
  seeds: CompanySeed[],
  watchlistSeeds: WatchlistSeed[]
): Dataset {
  const articles: Record<string, Article> = {}
  const eventAssertions: Record<string, EventAssertion> = {}
  const factAssertions: Record<string, FactAssertion> = {}
  const companies: Company[] = []
  const events: CompanyEvent[] = []
  const facts: Fact[] = []

  let artN = 0
  let evAsN = 0
  let faAsN = 0

  const mkArticle = (
    srcKey: string,
    title: string,
    snippet: string,
    daysAgo: number,
    cluster?: string
  ): string => {
    const id = `art-${++artN}`
    const src = SOURCES[srcKey as keyof typeof SOURCES]
    articles[id] = {
      id,
      source_id: src.id,
      title,
      snippet,
      url: `https://${src.domain}/news/${id}`,
      published_at: isoMinusDays(daysAgo),
      dedup_cluster_id: cluster ?? `clu-${id}`,
    }
    return id
  }

  for (const seed of seeds) {
    const companyEvents: CompanyEvent[] = []
    const companyFacts: Fact[] = []

    // ── Events ──────────────────────────────────────────────────────────
    for (const ev of seed.events) {
      const assertionIds: string[] = []
      const inputs: AggregationInput[] = []
      for (const a of ev.assertions) {
        const artId = mkArticle(a.src, a.title, a.snippet, a.daysAgo, a.cluster)
        const id = `ea-${++evAsN}`
        const status = a.status ?? ev.status ?? "announced"
        eventAssertions[id] = {
          id,
          article_id: artId,
          company_id: seed.id,
          event_type: ev.type,
          payload: ev.payload,
          occurred_on: ev.occurred_on,
          date_precision: ev.date_precision ?? "day",
          event_status: status,
          evidence_quote: a.quote,
          model_name: "claude-sonnet-4-6",
          model_version: "2026-02",
          prompt_version: "extract-v3",
          created_at: isoMinusDays(a.daysAgo),
        }
        assertionIds.push(id)
        const valueKey =
          a.valueKey ?? ev.payload.round_name ?? ev.payload.target ?? ev.type
        inputs.push({
          assertion_id: id,
          value: valueKey,
          value_label: valueKey,
          raw_date: articles[artId].published_at,
          source: SOURCES[a.src],
          quality: EVENT_QUALITY[status] ?? 1.0,
          dedup_cluster_id: articles[artId].dedup_cluster_id,
        })
      }
      const agg = aggregate(inputs, null)
      const event: CompanyEvent = {
        id: `ev-${seed.id}-${companyEvents.length + 1}`,
        company_id: seed.id,
        event_type: ev.type,
        payload: ev.payload,
        occurred_on: ev.occurred_on,
        date_precision: ev.date_precision ?? "day",
        event_status: ev.status ?? "announced",
        confidence: agg.confidence,
        confidence_factors: agg.factors,
        summary: ev.summary,
        is_published: true,
        first_seen_at: isoMinusDays(
          Math.max(...ev.assertions.map((a) => a.daysAgo))
        ),
        assertion_ids: assertionIds,
      }
      companyEvents.push(event)
    }

    // ── Authored facts ──────────────────────────────────────────────────
    const seededTypes = new Set(seed.facts.map((f) => f.type))
    for (const f of seed.facts) {
      companyFacts.push(buildFact(seed, f, articles, factAssertions, () => `fa-${++faAsN}`, mkArticle))
    }

    // ── Auto-derived facts from the latest funding round ─────────────────
    const fundingRounds = companyEvents
      .filter((e) => e.event_type === "funding_round")
      .sort((a, b) => (a.occurred_on! < b.occurred_on! ? 1 : -1))
    const latestRound = fundingRounds[0]
    if (latestRound) {
      if (!seededTypes.has("funding_amount") && latestRound.payload.amount_krw) {
        companyFacts.push(
          deriveFactFromEvent(
            seed,
            latestRound,
            "funding_amount",
            "krw",
            latestRound.payload.amount_krw,
            eventAssertions,
            articles,
            factAssertions,
            () => `fa-${++faAsN}`
          )
        )
      }
      if (!seededTypes.has("valuation") && latestRound.payload.post_money_krw) {
        companyFacts.push(
          deriveFactFromEvent(
            seed,
            latestRound,
            "valuation",
            "krw",
            latestRound.payload.post_money_krw,
            eventAssertions,
            articles,
            factAssertions,
            () => `fa-${++faAsN}`
          )
        )
      }
    }

    // ── founded_year always present (DART-anchored if available) ─────────
    if (!seededTypes.has("founded_year")) {
      const srcKey = seed.dart ? "dart" : "hankyung"
      const artId = mkArticle(
        srcKey,
        `${seed.ko} 법인 등기 정보`,
        `${seed.en} 설립연도 ${seed.founded}년.`,
        900
      )
      const id = `fa-${++faAsN}`
      factAssertions[id] = {
        id,
        article_id: artId,
        company_id: seed.id,
        fact_type: "founded_year",
        raw_value: `${seed.founded}년`,
        value_numeric: seed.founded,
        value_text: null,
        unit: "year",
        as_of_date: `${seed.founded}-01-01`,
        extraction_quality: 1.0,
        evidence_quote: `설립 ${seed.founded}년`,
        model_name: "deterministic",
        model_version: "dart-seed",
        prompt_version: "n/a",
        created_at: isoMinusDays(900),
      }
      const agg = aggregate(factInputs([factAssertions[id]], SOURCES as any, articles), HALF_LIVES.founded_year)
      companyFacts.push({
        id: `fact-${seed.id}-founded_year`,
        company_id: seed.id,
        fact_type: "founded_year",
        value_numeric: seed.founded,
        value_text: null,
        unit: "year",
        as_of_date: `${seed.founded}-01-01`,
        confidence: agg.confidence,
        confidence_factors: agg.factors,
        valid_from: `${seed.founded}-01-01`,
        valid_to: null,
        is_current: true,
        has_conflict: false,
        assertion_ids: [id],
        history: [],
        label_true_value: seed.founded,
      })
    }

    // ── Company headline (derived from current facts) ───────────────────
    const cur = (t: string) =>
      companyFacts.find((f) => f.fact_type === t && f.is_current)
    const company: Company = {
      id: seed.id,
      dart_corp_code: seed.dart,
      canonical_name_ko: seed.ko,
      canonical_name_en: seed.en,
      aliases: seed.aliases,
      sector: seed.sector,
      stage: seed.stage,
      hq_region: seed.hqRegion,
      hq_text: seed.hq,
      founded_year: seed.founded,
      employee_count: cur("employee_count")?.value_numeric ?? null,
      total_raised_krw: cur("total_raised")?.value_numeric ?? null,
      latest_valuation_krw: cur("valuation")?.value_numeric ?? null,
      description: seed.description,
      is_dart_anchored: seed.dart != null,
    }

    companies.push(company)
    events.push(...companyEvents)
    facts.push(...companyFacts)
  }

  const watchlists: Watchlist[] = watchlistSeeds.map((w) => ({
    id: w.id,
    name: w.name,
    company_ids: w.company_ids,
    created_at: isoMinusDays(w.daysAgo),
  }))

  const alerts = buildAlerts(events, facts, companies, watchlists)

  return {
    companies,
    sources: SOURCES as unknown as Record<string, Source>,
    articles,
    eventAssertions,
    factAssertions,
    events,
    facts,
    watchlists,
    alerts,
  }
}

// ── helpers ───────────────────────────────────────────────────────────

function buildFact(
  seed: CompanySeed,
  f: FactSeed,
  articles: Record<string, Article>,
  factAssertions: Record<string, FactAssertion>,
  nextId: () => string,
  mkArticle: (s: string, t: string, sn: string, d: number, c?: string) => string
): Fact {
  const halfLife = HALF_LIVES[f.type]
  // group by generation
  const gens = new Map<number, FactAssertion[]>()
  for (const a of f.assertions) {
    const artId = mkArticle(
      a.src,
      a.title ?? `${seed.ko} ${labelFor(f.type)} 보도`,
      a.snippet ?? a.quote,
      a.daysAgo,
      a.cluster
    )
    const id = nextId()
    const numeric = typeof a.value === "number" ? a.value : null
    const text = typeof a.value === "string" ? a.value : null
    const fa: FactAssertion = {
      id,
      article_id: artId,
      company_id: seed.id,
      fact_type: f.type,
      raw_value: a.raw,
      value_numeric: numeric,
      value_text: text,
      unit: f.unit,
      as_of_date: a.asOf ?? articles[artId].published_at,
      extraction_quality: QUALITY[a.quality ?? "explicit"],
      evidence_quote: a.quote,
      model_name: "claude-sonnet-4-6",
      model_version: "2026-02",
      prompt_version: "extract-v3",
      created_at: articles[artId].published_at,
    }
    factAssertions[id] = fa
    const g = a.gen ?? 0
    const arr = gens.get(g) ?? []
    arr.push(fa)
    gens.set(g, arr)
  }

  const genKeys = [...gens.keys()].sort((a, b) => a - b)
  const history: FactHistoryEntry[] = []
  for (let i = 0; i < genKeys.length; i++) {
    const assertions = gens.get(genKeys[i])!
    const agg = aggregate(factInputs(assertions, SOURCES as any, articles), halfLife)
    const validFrom = minDate(assertions.map((a) => a.as_of_date ?? a.created_at))
    const validTo =
      i < genKeys.length - 1
        ? minDate(gens.get(genKeys[i + 1])!.map((a) => a.as_of_date ?? a.created_at))
        : null
    history.push({
      value_numeric: numericConsensus(agg.consensus_value),
      value_text: typeof agg.consensus_value === "string" ? agg.consensus_value : null,
      as_of_date: validFrom,
      valid_from: validFrom,
      valid_to: validTo,
      confidence: agg.confidence,
    })
  }

  const currentAssertions = gens.get(genKeys[genKeys.length - 1])!
  const agg = aggregate(
    factInputs(currentAssertions, SOURCES as any, articles),
    halfLife
  )
  const validFrom = minDate(currentAssertions.map((a) => a.as_of_date ?? a.created_at))

  return {
    id: `fact-${seed.id}-${f.type}`,
    company_id: seed.id,
    fact_type: f.type,
    value_numeric: numericConsensus(agg.consensus_value),
    value_text: typeof agg.consensus_value === "string" ? agg.consensus_value : null,
    unit: f.unit,
    as_of_date: maxDate(currentAssertions.map((a) => a.as_of_date ?? a.created_at)),
    confidence: agg.confidence,
    confidence_factors: agg.factors,
    valid_from: validFrom,
    valid_to: null,
    is_current: true,
    has_conflict: agg.has_conflict,
    assertion_ids: currentAssertions.map((a) => a.id),
    history: history.length > 1 ? history : [],
    label_true_value: f.trueValue ?? null,
  }
}

function deriveFactFromEvent(
  seed: CompanySeed,
  event: CompanyEvent,
  factType: "valuation" | "funding_amount",
  unit: "krw",
  value: number,
  eventAssertions: Record<string, EventAssertion>,
  articles: Record<string, Article>,
  factAssertions: Record<string, FactAssertion>,
  nextId: () => string
): Fact {
  const halfLife = HALF_LIVES[factType]
  const assertions: FactAssertion[] = event.assertion_ids.map((eid) => {
    const ea = eventAssertions[eid]
    const id = nextId()
    const fa: FactAssertion = {
      id,
      article_id: ea.article_id,
      company_id: seed.id,
      event_id: event.id,
      fact_type: factType,
      raw_value: ea.evidence_quote,
      value_numeric: value,
      value_text: null,
      unit,
      as_of_date: event.occurred_on,
      extraction_quality: factType === "valuation" ? 0.7 : 1.0, // valuation often derived
      evidence_quote: ea.evidence_quote,
      model_name: ea.model_name,
      model_version: ea.model_version,
      prompt_version: ea.prompt_version,
      created_at: ea.created_at,
    }
    factAssertions[id] = fa
    return fa
  })
  const agg = aggregate(factInputs(assertions, SOURCES as any, articles), halfLife)
  return {
    id: `fact-${seed.id}-${factType}`,
    company_id: seed.id,
    fact_type: factType,
    value_numeric: value,
    value_text: null,
    unit,
    as_of_date: event.occurred_on,
    confidence: agg.confidence,
    confidence_factors: agg.factors,
    valid_from: event.occurred_on ?? minDate(assertions.map((a) => a.created_at)),
    valid_to: null,
    is_current: true,
    has_conflict: agg.has_conflict,
    assertion_ids: assertions.map((a) => a.id),
    history: [],
    label_true_value: null,
  }
}

function buildAlerts(
  events: CompanyEvent[],
  facts: Fact[],
  companies: Company[],
  watchlists: Watchlist[]
): Alert[] {
  const watched = new Set(watchlists.flatMap((w) => w.company_ids))
  const byCompany = new Map(companies.map((c) => [c.id, c]))
  const alerts: Alert[] = []
  let n = 0
  // recent events on watched companies → alerts
  const recent = events
    .filter((e) => watched.has(e.company_id) && e.occurred_on)
    .sort((a, b) => (a.occurred_on! < b.occurred_on! ? 1 : -1))
    .slice(0, 14)
  for (const e of recent) {
    const c = byCompany.get(e.company_id)!
    const type =
      e.event_type === "funding_round"
        ? "new_funding"
        : e.event_type.startsWith("ipo")
          ? "ipo_filing"
          : "new_event"
    alerts.push({
      id: `al-${++n}`,
      company_id: e.company_id,
      event_id: e.id,
      alert_type: type as Alert["alert_type"],
      title: `${c.canonical_name_ko} · ${e.summary}`,
      detail: e.confidence_factors.summary,
      created_at: e.first_seen_at,
      read_at: n > 5 ? e.first_seen_at : null, // first few unread
    })
  }
  // conflict alerts
  for (const f of facts.filter(
    (f) => f.has_conflict && watched.has(f.company_id)
  )) {
    const c = byCompany.get(f.company_id)!
    alerts.push({
      id: `al-${++n}`,
      company_id: f.company_id,
      event_id: null,
      fact_id: f.id,
      alert_type: "conflict_detected",
      title: `${c.canonical_name_ko} · ${labelFor(f.fact_type)} 출처 간 불일치`,
      detail: f.confidence_factors.summary,
      created_at: f.valid_from,
      read_at: null,
    })
  }
  return alerts.sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
}

function labelFor(t: string): string {
  const map: Record<string, string> = {
    valuation: "기업가치",
    funding_amount: "투자금액",
    total_raised: "누적투자",
    employee_count: "임직원수",
    revenue: "매출",
    ipo_target_date: "IPO 목표시점",
    headquarters: "본사",
    founded_year: "설립연도",
  }
  return map[t] ?? t
}

function numericConsensus(v: number | string | null): number | null {
  return typeof v === "number" ? v : null
}

function minDate(dates: (string | null)[]): string {
  const valid = dates.filter((d): d is string => !!d).sort()
  return valid[0] ?? isoMinusDays(0)
}
function maxDate(dates: (string | null)[]): string {
  const valid = dates.filter((d): d is string => !!d).sort()
  return valid[valid.length - 1] ?? isoMinusDays(0)
}

export { labelFor as factLabel }
