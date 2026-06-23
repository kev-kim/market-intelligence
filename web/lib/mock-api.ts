/**
 * DEMO BACKEND — the in-memory implementation of the data layer (`DataApi`).
 *
 * Screens never import this directly; they import `api` from `lib/api`, which
 * selects this (`demoApi`) or the real FastAPI client (`realApi`) based on the
 * `NEXT_PUBLIC_DEMO` env flag. So "use the real backend" is a config change, not
 * a code change. Each call returns a Promise with a little artificial latency so
 * loading states are real.
 *
 * The exported `DataApi` type (= `typeof demoApi`, at the bottom of this file) is
 * the contract the real client must satisfy — keeping the two in lockstep.
 *
 * Mutable product state (watchlists, alert read/unread) lives here in memory only —
 * no localStorage / sessionStorage (DEMO constraint). It resets on reload.
 */
import { getDataset } from "./fixtures"
import { FOUNDERS, type Person } from "./fixtures/people"
import { STAGE_ORDER } from "./format"
import type {
  Alert,
  Company,
  CompanyEvent,
  CompanyListItem,
  CompanyProfile,
  Fact,
  FactType,
  ProvenanceBundle,
  Watchlist,
} from "./types"

// ───────────────────────────── infra ──────────────────────────────────

const LATENCY = [120, 280] as const
function delay<T>(value: T, ms?: number): Promise<T> {
  const t = ms ?? LATENCY[0] + Math.random() * (LATENCY[1] - LATENCY[0])
  return new Promise((resolve) => setTimeout(() => resolve(value), t))
}

// Mutable product-tier store, seeded from the dataset (deep copies).
const ds = getDataset()
let watchlists: Watchlist[] = ds.watchlists.map((w) => ({
  ...w,
  company_ids: [...w.company_ids],
}))
let alerts: Alert[] = ds.alerts.map((a) => ({ ...a }))
let alertRules: AlertRule[] = []
let wlSeq = 1000
let ruleSeq = 1
let alertSeq = 5000

const clone = <T>(v: T): T => structuredClone(v)

// ─────────────────────────── companies ────────────────────────────────

export type CompanySort = "valuation" | "raised" | "recency" | "name"

export interface CompanyFilters {
  query?: string
  sectors?: string[]
  stages?: string[]
  regions?: string[]
  minConfidence?: number // min valuation-fact confidence
  raisedMin?: number // KRW
  raisedMax?: number // KRW
  foundedFrom?: number // year
  foundedTo?: number // year
  lastFundingWithinDays?: number // days from NOW
  hasConflict?: boolean
  watchlistId?: string
  sort?: CompanySort
}

/** Fixed "today" — matches the fixtures' deterministic NOW (2026-06-22). */
const NOW = new Date("2026-06-22T00:00:00")
function daysAgo(iso: string | null | undefined): number {
  if (!iso) return Infinity
  return Math.round((NOW.getTime() - new Date(iso + "T00:00:00").getTime()) / 86_400_000)
}

function valuationConfidence(companyId: string): number {
  const f = ds.facts.find(
    (f) => f.company_id === companyId && f.fact_type === "valuation" && f.is_current
  )
  return f?.confidence ?? 0
}

/** Enrich a company with the at-a-glance trust signals used on cards/lists. */
function toListItem(company: Company): CompanyListItem {
  const val = ds.facts.find(
    (f) =>
      f.company_id === company.id &&
      f.fact_type === "valuation" &&
      f.is_current
  )
  const events = ds.events.filter((e) => e.company_id === company.id)
  const latest = events
    .filter((e) => e.occurred_on)
    .sort((a, b) => ((a.occurred_on ?? "") < (b.occurred_on ?? "") ? 1 : -1))[0]
  const anyConflict = ds.facts.some(
    (f) => f.company_id === company.id && f.is_current && f.has_conflict
  )
  return {
    ...company,
    valuation_confidence: val?.confidence ?? null,
    valuation_factors: val?.confidence_factors ?? null,
    event_count: events.length,
    has_conflict: anyConflict,
    latest_event: latest
      ? { id: latest.id, summary: latest.summary, occurred_on: latest.occurred_on, event_type: latest.event_type }
      : null,
  }
}

export const demoApi = {
  // GET /companies
  listCompanies: (): Promise<CompanyListItem[]> =>
    delay(clone(ds.companies.map(toListItem))),

  // GET /companies/search?q=&facets=
  searchCompanies: (filters: CompanyFilters): Promise<CompanyListItem[]> => {
    let rows = ds.companies
    const q = filters.query?.trim().toLowerCase()
    if (q) {
      rows = rows.filter((c) => {
        const hay = [
          c.canonical_name_ko,
          c.canonical_name_en,
          c.sector,
          ...c.aliases,
        ]
          .join(" ")
          .toLowerCase()
        return hay.includes(q)
      })
    }
    if (filters.sectors?.length)
      rows = rows.filter((c) => filters.sectors!.includes(c.sector))
    if (filters.stages?.length)
      rows = rows.filter((c) => filters.stages!.includes(c.stage))
    if (filters.regions?.length)
      rows = rows.filter((c) => filters.regions!.includes(c.hq_region))
    if (filters.minConfidence != null)
      rows = rows.filter((c) => valuationConfidence(c.id) >= filters.minConfidence!)
    if (filters.raisedMin != null)
      rows = rows.filter((c) => (c.total_raised_krw ?? 0) >= filters.raisedMin!)
    if (filters.raisedMax != null)
      rows = rows.filter((c) => (c.total_raised_krw ?? Infinity) <= filters.raisedMax!)
    if (filters.foundedFrom != null)
      rows = rows.filter((c) => c.founded_year >= filters.foundedFrom!)
    if (filters.foundedTo != null)
      rows = rows.filter((c) => c.founded_year <= filters.foundedTo!)
    if (filters.lastFundingWithinDays != null) {
      rows = rows.filter((c) => {
        const last = ds.events
          .filter((e) => e.company_id === c.id && e.event_type === "funding_round" && e.occurred_on)
          .map((e) => daysAgo(e.occurred_on))
          .sort((a, b) => a - b)[0]
        return last != null && last <= filters.lastFundingWithinDays!
      })
    }
    if (filters.hasConflict)
      rows = rows.filter((c) =>
        ds.facts.some((f) => f.company_id === c.id && f.is_current && f.has_conflict)
      )
    if (filters.watchlistId) {
      const wl = watchlists.find((w) => w.id === filters.watchlistId)
      const set = new Set(wl?.company_ids ?? [])
      rows = rows.filter((c) => set.has(c.id))
    }

    const items = rows.map(toListItem)
    const sort = filters.sort ?? "valuation"
    items.sort((a, b) => {
      if (sort === "name") return a.canonical_name_ko.localeCompare(b.canonical_name_ko, "ko")
      if (sort === "raised") return (b.total_raised_krw ?? 0) - (a.total_raised_krw ?? 0)
      if (sort === "recency") {
        const da = a.latest_event?.occurred_on ?? ""
        const db = b.latest_event?.occurred_on ?? ""
        return db.localeCompare(da)
      }
      return (b.latest_valuation_krw ?? 0) - (a.latest_valuation_krw ?? 0)
    })
    return delay(clone(items))
  },

  // Distinct facet values for the screener filter rail.
  getFacets: (): Promise<{ sectors: string[]; stages: string[]; regions: string[] }> => {
    const uniq = (xs: string[]) => [...new Set(xs)].sort()
    return delay({
      sectors: uniq(ds.companies.map((c) => c.sector)),
      stages: uniq(ds.companies.map((c) => c.stage)),
      regions: uniq(ds.companies.map((c) => c.hq_region)),
    })
  },

  // GET /companies/{id}
  getCompany: (id: string): Promise<CompanyProfile> => {
    const company = ds.companies.find((c) => c.id === id)
    if (!company) return Promise.reject(new Error("Company not found"))
    const facts = ds.facts.filter((f) => f.company_id === id)
    const events = ds.events
      .filter((e) => e.company_id === id)
      .sort((a, b) => (a.occurred_on ?? "") < (b.occurred_on ?? "") ? 1 : -1)
    return delay(clone({ company, facts, events }))
  },

  // GET /companies/{id}/events
  getCompanyEvents: (id: string): Promise<CompanyEvent[]> =>
    delay(
      clone(
        ds.events
          .filter((e) => e.company_id === id)
          .sort((a, b) => ((a.occurred_on ?? "") < (b.occurred_on ?? "") ? 1 : -1))
      )
    ),

  // GET /companies/{id}/facts
  getCompanyFacts: (id: string): Promise<Fact[]> =>
    delay(clone(ds.facts.filter((f) => f.company_id === id))),

  // GET /events/{id}  (+ company for header)
  getEvent: (id: string): Promise<{ event: CompanyEvent; company: Company }> => {
    const event = ds.events.find((e) => e.id === id)
    if (!event) return Promise.reject(new Error("Event not found"))
    const company = ds.companies.find((c) => c.id === event.company_id)!
    return delay(clone({ event, company }))
  },

  // GET /facts/{id}/sources  ← traceability spine
  getFactSources: (factId: string): Promise<ProvenanceBundle> => {
    const fact = ds.facts.find((f) => f.id === factId)
    if (!fact) return Promise.reject(new Error("Fact not found"))
    return delay(clone(bundle(fact.assertion_ids, "fact")))
  },

  // GET /events/{id}/sources  ← traceability spine
  getEventSources: (eventId: string): Promise<ProvenanceBundle> => {
    const event = ds.events.find((e) => e.id === eventId)
    if (!event) return Promise.reject(new Error("Event not found"))
    return delay(clone(bundle(event.assertion_ids, "event")))
  },

  // ─────────────────────────── dashboard ──────────────────────────────
  getDashboard: (): Promise<DashboardData> => {
    const companies = ds.companies
    const recentEvents = ds.events
      .filter((e) => e.confidence >= 0.6 && e.occurred_on)
      .sort((a, b) => ((a.occurred_on ?? "") < (b.occurred_on ?? "") ? 1 : -1))
      .slice(0, 12)
      .map((e) => ({
        event: e,
        company: companies.find((c) => c.id === e.company_id)!,
      }))

    const sectorDist = tally(companies.map((c) => c.sector))
    const stageDist = tally(companies.map((c) => c.stage))

    const watched = new Set(watchlists.flatMap((w) => w.company_ids))
    const watchlistActivity = ds.events
      .filter((e) => watched.has(e.company_id) && e.occurred_on)
      .sort((a, b) => ((a.occurred_on ?? "") < (b.occurred_on ?? "") ? 1 : -1))
      .slice(0, 8)
      .map((e) => ({
        event: e,
        company: companies.find((c) => c.id === e.company_id)!,
      }))

    const conflicts = ds.facts.filter((f) => f.has_conflict && f.is_current).length

    // Top raises in the trailing ~120 days ("this quarter").
    const topRaises = ds.events
      .filter(
        (e) =>
          e.event_type === "funding_round" &&
          e.payload.amount_krw &&
          daysAgo(e.occurred_on) <= 120
      )
      .sort((a, b) => (b.payload.amount_krw ?? 0) - (a.payload.amount_krw ?? 0))
      .slice(0, 6)
      .map((e) => ({
        event: e,
        company: companies.find((c) => c.id === e.company_id)!,
      }))

    // Funding velocity by sector (count + total KRW of funding rounds).
    const sectorAgg = new Map<string, { count: number; total_krw: number }>()
    for (const e of ds.events) {
      if (e.event_type !== "funding_round" || !e.payload.amount_krw) continue
      const c = companies.find((x) => x.id === e.company_id)
      if (!c) continue
      const cur = sectorAgg.get(c.sector) ?? { count: 0, total_krw: 0 }
      cur.count += 1
      cur.total_krw += e.payload.amount_krw
      sectorAgg.set(c.sector, cur)
    }
    const fundingBySector = [...sectorAgg.entries()]
      .map(([sector, v]) => ({ sector, ...v }))
      .sort((a, b) => b.total_krw - a.total_krw)

    // "Movers" — distinct watched companies with activity in the window.
    const moverCompanies = [...new Set(watchlistActivity.map((x) => x.company.id))].length

    return delay({
      companyCount: companies.length,
      eventCount: ds.events.length,
      assertionCount:
        Object.keys(ds.factAssertions).length +
        Object.keys(ds.eventAssertions).length,
      unreadAlerts: alerts.filter((a) => !a.read_at).length,
      conflicts,
      sinceLabel: "지난 30일 / Last 30 days",
      moverCount: moverCompanies,
      recentEvents: clone(recentEvents),
      watchlistActivity: clone(watchlistActivity),
      topRaises: clone(topRaises),
      fundingBySector,
      sectorDist,
      stageDist,
    })
  },

  // ─────────────────────────── watchlists ─────────────────────────────
  listWatchlists: (): Promise<Watchlist[]> => delay(clone(watchlists)),

  createWatchlist: (name: string): Promise<Watchlist> => {
    const wl: Watchlist = {
      id: `wl-${++wlSeq}`,
      name,
      company_ids: [],
      created_at: new Date().toISOString().slice(0, 10),
    }
    watchlists = [...watchlists, wl]
    return delay(clone(wl))
  },

  renameWatchlist: (id: string, name: string): Promise<Watchlist> => {
    watchlists = watchlists.map((w) => (w.id === id ? { ...w, name } : w))
    return delay(clone(watchlists.find((w) => w.id === id)!))
  },

  deleteWatchlist: (id: string): Promise<{ id: string }> => {
    watchlists = watchlists.filter((w) => w.id !== id)
    return delay({ id })
  },

  addToWatchlist: (id: string, companyId: string): Promise<Watchlist> => {
    watchlists = watchlists.map((w) =>
      w.id === id && !w.company_ids.includes(companyId)
        ? { ...w, company_ids: [...w.company_ids, companyId] }
        : w
    )
    return delay(clone(watchlists.find((w) => w.id === id)!))
  },

  removeFromWatchlist: (id: string, companyId: string): Promise<Watchlist> => {
    watchlists = watchlists.map((w) =>
      w.id === id
        ? { ...w, company_ids: w.company_ids.filter((c) => c !== companyId) }
        : w
    )
    return delay(clone(watchlists.find((w) => w.id === id)!))
  },

  // ─────────────────────────── alerts ─────────────────────────────────
  listAlerts: (): Promise<Alert[]> => delay(clone(alerts)),

  markAlertRead: (id: string): Promise<Alert> => {
    const now = new Date().toISOString()
    alerts = alerts.map((a) => (a.id === id ? { ...a, read_at: now } : a))
    return delay(clone(alerts.find((a) => a.id === id)!))
  },

  markAllAlertsRead: (): Promise<Alert[]> => {
    const now = new Date().toISOString()
    alerts = alerts.map((a) => (a.read_at ? a : { ...a, read_at: now }))
    return delay(clone(alerts))
  },

  // ─────────────────────────── calibration ────────────────────────────
  getCalibration: (): Promise<CalibrationData> => {
    const labeled = ds.facts.filter(
      (f) => f.is_current && f.label_true_value != null
    )
    const points = labeled.map((f) => {
      const correct = isCorrect(f)
      return {
        fact_id: f.id,
        company_id: f.company_id,
        fact_type: f.fact_type,
        predicted: f.confidence,
        correct,
        value_label: f.confidence_factors.consensus_value,
      }
    })
    // Brier score: mean((p - outcome)^2)
    const brier =
      points.reduce((s, p) => s + Math.pow(p.predicted - (p.correct ? 1 : 0), 2), 0) /
      Math.max(1, points.length)

    // Reliability bins (10% buckets)
    const bins = Array.from({ length: 5 }, (_, i) => ({
      lo: i * 0.2,
      hi: i * 0.2 + 0.2,
      label: `${i * 20}–${i * 20 + 20}%`,
      count: 0,
      sumPred: 0,
      sumCorrect: 0,
    }))
    for (const p of points) {
      const idx = Math.min(4, Math.floor(p.predicted / 0.2))
      bins[idx].count++
      bins[idx].sumPred += p.predicted
      bins[idx].sumCorrect += p.correct ? 1 : 0
    }
    const reliability = bins.map((b) => ({
      label: b.label,
      mid: (b.lo + b.hi) / 2,
      count: b.count,
      predicted: b.count ? b.sumPred / b.count : null,
      actual: b.count ? b.sumCorrect / b.count : null,
    }))

    return delay({ brier, points: clone(points), reliability })
  },

  // command palette index
  searchIndex: (): Promise<Company[]> => delay(clone(ds.companies), 40),

  // ─────────────────── company depth (profile tabs) ───────────────────

  // Aggregate investors across the company's funding rounds.
  getCompanyInvestors: (id: string): Promise<CompanyInvestors> => {
    const rounds = ds.events.filter(
      (e) => e.company_id === id && e.event_type === "funding_round"
    )
    const map = new Map<string, { rounds: string[]; isLead: boolean }>()
    for (const e of rounds) {
      const round = e.payload.round_name ?? "—"
      const lead = e.payload.lead_investor
      const all = [
        ...(lead ? [lead] : []),
        ...(e.payload.investors ?? []),
      ]
      for (const name of all) {
        const cur = map.get(name) ?? { rounds: [], isLead: false }
        if (!cur.rounds.includes(round)) cur.rounds.push(round)
        if (name === lead) cur.isLead = true
        map.set(name, cur)
      }
    }
    const investors = [...map.entries()]
      .map(([name, v]) => ({ name, rounds: v.rounds, isLead: v.isLead }))
      .sort((a, b) => Number(b.isLead) - Number(a.isLead) || b.rounds.length - a.rounds.length)
    return delay({ count: investors.length, investors })
  },

  // Founders (seed) + execs derived from executive_* events.
  getCompanyPeople: (id: string): Promise<CompanyPeople> => {
    const founders = FOUNDERS[id] ?? []
    const execs = ds.events
      .filter(
        (e) =>
          e.company_id === id &&
          (e.event_type === "executive_hire" || e.event_type === "executive_departure")
      )
      .sort((a, b) => ((a.occurred_on ?? "") < (b.occurred_on ?? "") ? 1 : -1))
      .map((e) => ({
        person: e.payload.person ?? "—",
        role: e.payload.role ?? "—",
        direction: e.event_type === "executive_hire" ? ("join" as const) : ("leave" as const),
        occurred_on: e.occurred_on,
        event_id: e.id,
      }))
    return delay(clone({ founders, execs }))
  },

  // Time series for valuation / revenue / headcount from materialized history.
  getCompanyTrends: (id: string): Promise<CompanyTrends> => {
    const series = (factType: FactType) => {
      const fact = ds.facts.find(
        (f) => f.company_id === id && f.fact_type === factType && f.is_current
      )
      if (!fact) return []
      const points = (fact.history.length ? fact.history : [
        {
          value_numeric: fact.value_numeric,
          as_of_date: fact.as_of_date,
          valid_from: fact.valid_from,
          valid_to: fact.valid_to,
          value_text: fact.value_text,
          confidence: fact.confidence,
        },
      ])
        .filter((h) => h.value_numeric != null)
        .map((h) => ({
          date: h.as_of_date ?? h.valid_from,
          value: h.value_numeric as number,
          confidence: h.confidence,
        }))
        .sort((a, b) => a.date.localeCompare(b.date))
      return points
    }
    return delay({
      valuation: series("valuation"),
      revenue: series("revenue"),
      headcount: series("employee_count"),
    })
  },

  // Funding rounds table for the profile.
  getFundingHistory: (id: string): Promise<FundingRoundRow[]> => {
    const rows = ds.events
      .filter((e) => e.company_id === id && e.event_type === "funding_round")
      .sort((a, b) => ((a.occurred_on ?? "") < (b.occurred_on ?? "") ? 1 : -1))
      .map((e) => ({
        event_id: e.id,
        round_name: e.payload.round_name ?? "—",
        amount_krw: e.payload.amount_krw ?? null,
        post_money_krw: e.payload.post_money_krw ?? null,
        lead_investor: e.payload.lead_investor ?? null,
        investors: e.payload.investors ?? [],
        occurred_on: e.occurred_on,
        confidence: e.confidence,
      }))
    return delay(clone(rows))
  },

  // "Companies like this": sector match + stage proximity + co-investor overlap.
  similarCompanies: (id: string, limit = 5): Promise<SimilarCompany[]> => {
    const target = ds.companies.find((c) => c.id === id)
    if (!target) return Promise.reject(new Error("Company not found"))
    const targetInvestors = new Set(investorNames(id))
    const stageIdx = (s: string) => STAGE_ORDER.indexOf(s)
    const scored = ds.companies
      .filter((c) => c.id !== id)
      .map((c) => {
        let score = 0
        const reasons: string[] = []
        if (c.sector === target.sector) {
          score += 0.5
          reasons.push("같은 섹터")
        }
        const sd = Math.abs(stageIdx(c.stage) - stageIdx(target.stage))
        if (sd <= 1) {
          score += 0.2
          reasons.push("유사 스테이지")
        }
        const overlap = investorNames(c.id).filter((n) => targetInvestors.has(n))
        if (overlap.length) {
          score += Math.min(0.3, overlap.length * 0.15)
          reasons.push(`공동 투자자 ${overlap.length}`)
        }
        return { company: toListItem(c), score, reasons }
      })
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
    return delay(clone(scored))
  },

  // ─────────────────────────── network graph ──────────────────────────
  getNetworkGraph: (): Promise<NetworkGraph> => buildNetwork(),

  getCompanyNetwork: (id: string): Promise<NetworkGraph> => buildNetwork(id),

  // ─────────────────────────── investors ──────────────────────────────
  listInvestors: (): Promise<InvestorSummary[]> => {
    const map = new Map<string, { companies: Set<string>; leads: number; sectors: Set<string>; deployed: number }>()
    for (const e of ds.events) {
      if (e.event_type !== "funding_round") continue
      const c = ds.companies.find((x) => x.id === e.company_id)
      if (!c) continue
      const lead = e.payload.lead_investor
      const names = [...(lead ? [lead] : []), ...(e.payload.investors ?? [])]
      const amount = e.payload.amount_krw ?? 0
      const per = names.length ? amount / names.length : 0
      for (const name of names) {
        const cur = map.get(name) ?? { companies: new Set(), leads: 0, sectors: new Set(), deployed: 0 }
        cur.companies.add(c.id)
        cur.sectors.add(c.sector)
        cur.deployed += per
        if (name === lead) cur.leads += 1
        map.set(name, cur)
      }
    }
    const out: InvestorSummary[] = [...map.entries()]
      .map(([name, v]) => ({
        name,
        companyCount: v.companies.size,
        leadCount: v.leads,
        sectors: [...v.sectors].sort(),
        estDeployedKrw: Math.round(v.deployed),
      }))
      .sort((a, b) => b.companyCount - a.companyCount || b.leadCount - a.leadCount)
    return delay(out)
  },

  getInvestor: (name: string): Promise<InvestorProfile> => {
    const portfolio: InvestorProfile["portfolio"] = []
    const coInvest = new Map<string, number>()
    const sectors = new Set<string>()
    let leadCount = 0
    for (const c of ds.companies) {
      const rounds = ds.events.filter(
        (e) => e.company_id === c.id && e.event_type === "funding_round"
      )
      const involved = rounds.filter(
        (e) =>
          e.payload.lead_investor === name || (e.payload.investors ?? []).includes(name)
      )
      if (!involved.length) continue
      sectors.add(c.sector)
      const isLead = involved.some((e) => e.payload.lead_investor === name)
      if (isLead) leadCount += 1
      portfolio.push({
        company: toListItem(c),
        isLead,
        rounds: involved.map((e) => e.payload.round_name ?? "—"),
      })
      // co-investors in those rounds
      for (const e of involved) {
        const others = [
          ...(e.payload.lead_investor ? [e.payload.lead_investor] : []),
          ...(e.payload.investors ?? []),
        ].filter((n) => n !== name)
        for (const o of others) coInvest.set(o, (coInvest.get(o) ?? 0) + 1)
      }
    }
    if (!portfolio.length) return Promise.reject(new Error("Investor not found"))
    portfolio.sort((a, b) => Number(b.isLead) - Number(a.isLead) || (b.company.latest_valuation_krw ?? 0) - (a.company.latest_valuation_krw ?? 0))
    const coInvestors = [...coInvest.entries()]
      .map(([n, shared]) => ({ name: n, shared }))
      .sort((a, b) => b.shared - a.shared)
    return delay(clone({
      name,
      companyCount: portfolio.length,
      leadCount,
      sectors: [...sectors].sort(),
      portfolio,
      coInvestors,
    }))
  },

  // ─────────────────────── company news / coverage ────────────────────
  getCompanyArticles: (id: string): Promise<CompanyArticle[]> => {
    const seen = new Map<string, CompanyArticle>()
    const collect = (assertionIds: string[], store: typeof ds.factAssertions | typeof ds.eventAssertions, evType?: (aid: string) => string | undefined) => {
      for (const aid of assertionIds) {
        const a = store[aid]
        if (!a) continue
        const art = ds.articles[a.article_id]
        if (!art) continue
        const src = ds.sources[art.source_id]
        const existing = seen.get(art.id)
        const et = evType?.(aid)
        if (existing) {
          if (et && !existing.event_types.includes(et)) existing.event_types.push(et)
          continue
        }
        seen.set(art.id, {
          id: art.id,
          title: art.title,
          snippet: art.snippet,
          url: art.url,
          published_at: art.published_at,
          source: src ? { name: src.name, domain: src.domain, tier: src.tier, is_official: src.is_official } : null,
          event_types: et ? [et] : [],
        })
      }
    }
    const eventAssertionIds = Object.values(ds.eventAssertions)
      .filter((a) => a.company_id === id)
      .map((a) => a.id)
    const factAssertionIds = Object.values(ds.factAssertions)
      .filter((a) => a.company_id === id)
      .map((a) => a.id)
    collect(eventAssertionIds, ds.eventAssertions, (aid) => ds.eventAssertions[aid]?.event_type)
    collect(factAssertionIds, ds.factAssertions)
    const out = [...seen.values()].sort((a, b) =>
      (b.published_at ?? "").localeCompare(a.published_at ?? "")
    )
    return delay(out)
  },

  // ─────────────────────────── alert rules ────────────────────────────
  listAlertRules: (): Promise<AlertRule[]> => delay(clone(alertRules)),

  createAlertRule: (input: AlertRuleInput): Promise<{ rule: AlertRule; created: number }> => {
    const rule: AlertRule = { id: `rule-${++ruleSeq}`, ...input, created_at: new Date().toISOString().slice(0, 10) }
    alertRules = [...alertRules, rule]
    const created = generateAlertsForRule(rule)
    return delay(clone({ rule, created }))
  },

  deleteAlertRule: (id: string): Promise<{ id: string }> => {
    alertRules = alertRules.filter((r) => r.id !== id)
    return delay({ id })
  },
}

// ─────────────────────────── helpers ──────────────────────────────────

function bundle(assertionIds: string[], kind: "fact" | "event"): ProvenanceBundle {
  const store = kind === "fact" ? ds.factAssertions : ds.eventAssertions
  const assertions = assertionIds.map((id) => store[id]).filter(Boolean)
  const articles: ProvenanceBundle["articles"] = {}
  const sources: ProvenanceBundle["sources"] = {}
  for (const a of assertions) {
    const art = ds.articles[a.article_id]
    if (art) {
      articles[art.id] = art
      const src = ds.sources[art.source_id]
      if (src) sources[src.id] = src
    }
  }
  return { assertions, articles, sources }
}

function isCorrect(fact: Fact): boolean {
  const truth = fact.label_true_value
  if (truth == null) return false
  if (typeof truth === "number" && fact.value_numeric != null) {
    const denom = Math.max(Math.abs(truth), Math.abs(fact.value_numeric))
    return denom === 0 ? true : Math.abs(truth - fact.value_numeric) / denom <= 0.1
  }
  return String(truth) === String(fact.value_text)
}

function tally(values: string[]): { name: string; value: number }[] {
  const m = new Map<string, number>()
  for (const v of values) m.set(v, (m.get(v) ?? 0) + 1)
  return [...m.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
}

/** All investor names (lead + participants) across a company's funding rounds. */
function investorNames(companyId: string): string[] {
  const names = new Set<string>()
  for (const e of ds.events) {
    if (e.company_id !== companyId || e.event_type !== "funding_round") continue
    if (e.payload.lead_investor) names.add(e.payload.lead_investor)
    for (const i of e.payload.investors ?? []) names.add(i)
  }
  return [...names]
}

/**
 * Build the investor↔company (+ acquisition) graph. With `focusId`, returns a
 * tight subgraph: the focus company, its investors, and those investors' other
 * portfolio companies (one hop) — the "investor network" mini-graph.
 */
function buildNetwork(focusId?: string): Promise<NetworkGraph> {
  const nodes = new Map<string, GraphNode>()
  const edges: GraphEdge[] = []

  const addCompany = (c: Company) =>
    nodes.set(c.id, {
      id: c.id,
      type: "company",
      label: c.canonical_name_ko,
      sector: c.sector,
      stage: c.stage,
      valuation_krw: c.latest_valuation_krw,
      focus: c.id === focusId,
    })
  const addInvestor = (name: string) => {
    const id = `inv:${name}`
    if (!nodes.has(id)) nodes.set(id, { id, type: "investor", label: name })
    return id
  }

  const focusInvestors = focusId ? new Set(investorNames(focusId)) : null

  let companyIds: Set<string>
  if (focusId) {
    companyIds = new Set([focusId])
    for (const c of ds.companies) {
      if (investorNames(c.id).some((n) => focusInvestors!.has(n))) companyIds.add(c.id)
    }
  } else {
    companyIds = new Set(ds.companies.map((c) => c.id))
  }

  for (const cid of companyIds) {
    const c = ds.companies.find((x) => x.id === cid)
    if (!c) continue
    addCompany(c)

    for (const e of ds.events) {
      if (e.company_id !== cid || e.event_type !== "funding_round") continue
      const lead = e.payload.lead_investor
      const invs = [...(lead ? [lead] : []), ...(e.payload.investors ?? [])]
      for (const name of invs) {
        // In focus mode keep the graph tight: only the focus company's investors.
        if (focusInvestors && !focusInvestors.has(name)) continue
        const invId = addInvestor(name)
        edges.push({
          id: `${invId}->${cid}`,
          source: invId,
          target: cid,
          kind: name === lead ? "lead" : "invested_in",
        })
      }
    }

    for (const e of ds.events) {
      if (e.company_id !== cid || e.event_type !== "acquisition") continue
      const targetName = e.payload.target
      if (!targetName) continue
      const tc = ds.companies.find((x) => x.canonical_name_ko === targetName)
      const tid = tc?.id ?? `co:${targetName}`
      if (tc) addCompany(tc)
      else if (!nodes.has(tid))
        nodes.set(tid, { id: tid, type: "company", label: targetName })
      edges.push({ id: `${cid}=>${tid}`, source: cid, target: tid, kind: "acquired" })
    }
  }

  const seen = new Set<string>()
  const uniqEdges = edges.filter((e) => (seen.has(e.id) ? false : (seen.add(e.id), true)))
  return delay(clone({ nodes: [...nodes.values()], edges: uniqEdges }))
}

const ALERT_TYPE_FOR: Record<string, Alert["alert_type"]> = {
  funding_round: "new_funding",
  ipo_announcement: "ipo_filing",
  ipo_completion: "ipo_filing",
}

/** Create alert rows for events matching a rule. Idempotent per (event, type). */
function generateAlertsForRule(rule: AlertRule): number {
  const watched = new Set(watchlists.flatMap((w) => w.company_ids))
  const existing = new Set(alerts.map((a) => `${a.event_id}:${a.alert_type}`))
  let created = 0
  for (const e of ds.events) {
    if (!rule.eventTypes.includes(e.event_type)) continue
    if (daysAgo(e.occurred_on) > 365) continue
    const c = ds.companies.find((x) => x.id === e.company_id)
    if (!c) continue
    if (rule.scope === "watchlist" && !watched.has(c.id)) continue
    if (rule.sectors?.length && !rule.sectors.includes(c.sector)) continue
    if (rule.minAmountKrw != null && (e.payload.amount_krw ?? 0) < rule.minAmountKrw) continue
    const alertType = ALERT_TYPE_FOR[e.event_type] ?? "new_event"
    const key = `${e.id}:${alertType}`
    if (existing.has(key)) continue
    existing.add(key)
    alerts = [
      {
        id: `al-${++alertSeq}`,
        company_id: c.id,
        event_id: e.id,
        alert_type: alertType,
        title: `${c.canonical_name_ko} · ${e.summary}`,
        detail: `규칙 "${rule.label}" 일치 · ${e.confidence_factors.summary}`,
        created_at: new Date().toISOString(),
        read_at: null,
      },
      ...alerts,
    ]
    created++
  }
  return created
}

// ─────────────────────────── view types ───────────────────────────────

export interface DashboardData {
  companyCount: number
  eventCount: number
  assertionCount: number
  unreadAlerts: number
  conflicts: number
  sinceLabel: string
  moverCount: number
  recentEvents: { event: CompanyEvent; company: Company }[]
  watchlistActivity: { event: CompanyEvent; company: Company }[]
  topRaises: { event: CompanyEvent; company: Company }[]
  fundingBySector: { sector: string; count: number; total_krw: number }[]
  sectorDist: { name: string; value: number }[]
  stageDist: { name: string; value: number }[]
}

// ─────────────────── company-depth view types ───────────────────

export interface CompanyInvestors {
  count: number
  investors: { name: string; rounds: string[]; isLead: boolean }[]
}

export interface CompanyPeople {
  founders: Person[]
  execs: {
    person: string
    role: string
    direction: "join" | "leave"
    occurred_on: string | null
    event_id: string
  }[]
}

export interface TrendPoint {
  date: string
  value: number
  confidence: number
}

export interface CompanyTrends {
  valuation: TrendPoint[]
  revenue: TrendPoint[]
  headcount: TrendPoint[]
}

export interface FundingRoundRow {
  event_id: string
  round_name: string
  amount_krw: number | null
  post_money_krw: number | null
  lead_investor: string | null
  investors: string[]
  occurred_on: string | null
  confidence: number
}

export interface SimilarCompany {
  company: CompanyListItem
  score: number
  reasons: string[]
}

// ─────────────────── network graph view types ───────────────────

export interface GraphNode {
  id: string
  type: "company" | "investor"
  label: string
  sector?: string
  stage?: string
  valuation_krw?: number | null
  focus?: boolean
}

export interface GraphEdge {
  id: string
  source: string
  target: string
  kind: "lead" | "invested_in" | "acquired"
}

export interface NetworkGraph {
  nodes: GraphNode[]
  edges: GraphEdge[]
}

// ─────────────────────────── investor view types ────────────────────

export interface InvestorSummary {
  name: string
  companyCount: number
  leadCount: number
  sectors: string[]
  estDeployedKrw: number
}

export interface InvestorProfile {
  name: string
  companyCount: number
  leadCount: number
  sectors: string[]
  portfolio: { company: CompanyListItem; isLead: boolean; rounds: string[] }[]
  coInvestors: { name: string; shared: number }[]
}

export interface CompanyArticle {
  id: string
  title: string
  snippet: string
  url: string
  published_at: string
  source: { name: string; domain: string; tier: number; is_official: boolean } | null
  event_types: string[]
}

// ─────────────────────────── alert-rule view types ──────────────────

export interface AlertRuleInput {
  label: string
  eventTypes: import("./types").EventType[]
  scope: "all" | "watchlist"
  sectors?: string[]
  minAmountKrw?: number
}

export interface AlertRule extends AlertRuleInput {
  id: string
  created_at: string
}

/**
 * The data-layer contract. `lib/api.ts` dispatches to `demoApi` or `realApi`
 * based on NEXT_PUBLIC_DEMO; the real FastAPI client must satisfy this type.
 */
export type DataApi = typeof demoApi

export interface CalibrationPoint {
  fact_id: string
  company_id: string
  fact_type: FactType
  predicted: number
  correct: boolean
  value_label: string
}

export interface CalibrationData {
  brier: number
  points: CalibrationPoint[]
  reliability: {
    label: string
    mid: number
    count: number
    predicted: number | null
    actual: number | null
  }[]
}
