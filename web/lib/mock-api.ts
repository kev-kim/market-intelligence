/**
 * MOCK API — the single swap boundary.
 *
 * Every screen talks to TanStack Query, which calls this module. To wire the real
 * FastAPI backend later, reimplement these functions as `fetch` calls against the
 * §14 endpoints; nothing else in the app changes. Each call returns a Promise with
 * a little artificial latency so loading states are real.
 *
 * Mutable product state (watchlists, alert read/unread) lives here in memory only —
 * no localStorage / sessionStorage (DEMO constraint). It resets on reload.
 */
import { getDataset } from "./fixtures"
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
let wlSeq = 1000

const clone = <T>(v: T): T => structuredClone(v)

// ─────────────────────────── companies ────────────────────────────────

export interface CompanyFilters {
  query?: string
  sectors?: string[]
  stages?: string[]
  minConfidence?: number // min valuation-fact confidence
  watchlistId?: string
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

export const mockApi = {
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
    if (filters.minConfidence != null)
      rows = rows.filter((c) => valuationConfidence(c.id) >= filters.minConfidence!)
    if (filters.watchlistId) {
      const wl = watchlists.find((w) => w.id === filters.watchlistId)
      const set = new Set(wl?.company_ids ?? [])
      rows = rows.filter((c) => set.has(c.id))
    }
    return delay(clone(rows.map(toListItem)))
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

    return delay({
      companyCount: companies.length,
      eventCount: ds.events.length,
      assertionCount:
        Object.keys(ds.factAssertions).length +
        Object.keys(ds.eventAssertions).length,
      unreadAlerts: alerts.filter((a) => !a.read_at).length,
      conflicts,
      recentEvents: clone(recentEvents),
      watchlistActivity: clone(watchlistActivity),
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

// ─────────────────────────── view types ───────────────────────────────

export interface DashboardData {
  companyCount: number
  eventCount: number
  assertionCount: number
  unreadAlerts: number
  conflicts: number
  recentEvents: { event: CompanyEvent; company: Company }[]
  watchlistActivity: { event: CompanyEvent; company: Company }[]
  sectorDist: { name: string; value: number }[]
  stageDist: { name: string; value: number }[]
}

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
