/**
 * REAL BACKEND CLIENT — the FastAPI implementation of the data layer (`DataApi`).
 *
 * Selected over `demoApi` when NEXT_PUBLIC_DEMO=false (see lib/api.ts). Methods
 * backed by an existing §14 endpoint are wired here; demo-only aggregations
 * (dashboard rollups, network graph, investor rollups, trends, etc.) reject with
 * a clear message naming the endpoint the backend still needs to expose. This
 * file IS the deferred backend-integration TODO list — filling it in is the only
 * work needed to flip the app onto the real API.
 *
 * NOTE: some §14 responses use the API's own shapes (e.g. /companies/search →
 * CompanyHit, /facts/{id}/sources → SourcesBundle). Where those differ from the
 * demo view-models, an adapter is needed — marked `// TODO adapter` below.
 */
import type { CompanyProfile } from "./types"
import type { DataApi } from "./mock-api"

const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  })
  if (!res.ok) throw new Error(`API ${res.status} ${init?.method ?? "GET"} ${path}`)
  return res.json() as Promise<T>
}

/** Reject with a clear pointer to the backend endpoint that needs to exist. */
const needs = (endpoint: string): Promise<never> =>
  Promise.reject(
    new Error(`[real-api] not wired yet — implement backend endpoint: ${endpoint}`)
  )

export const realApi: DataApi = {
  // ── §14 endpoints that exist ───────────────────────────────────────────
  // TODO adapter: API returns CompanyHit[]; map to CompanyListItem[] (+ facets).
  searchCompanies: (f) =>
    http(`/companies/search?q=${encodeURIComponent(f.query ?? "")}`),

  getCompany: async (id) => {
    const [company, facts, events] = await Promise.all([
      http(`/companies/${id}`),
      http(`/companies/${id}/facts`),
      http(`/companies/${id}/events`),
    ])
    return { company, facts, events } as unknown as CompanyProfile
  },
  getCompanyEvents: (id) => http(`/companies/${id}/events`),
  getCompanyFacts: (id) => http(`/companies/${id}/facts`),
  // TODO adapter: §14 SourcesBundle → demo ProvenanceBundle shape.
  getFactSources: (id) => http(`/facts/${id}/sources`),
  getEventSources: (id) => http(`/events/${id}/sources`),

  listWatchlists: () => http(`/watchlists`),
  createWatchlist: (name) =>
    http(`/watchlists`, { method: "POST", body: JSON.stringify({ name }) }),
  addToWatchlist: (id, companyId) =>
    http(`/watchlists/${id}/companies`, {
      method: "POST",
      body: JSON.stringify({ company_id: companyId }),
    }),
  removeFromWatchlist: (id, companyId) =>
    http(`/watchlists/${id}/companies/${companyId}`, { method: "DELETE" }),
  deleteWatchlist: (id) => http(`/watchlists/${id}`, { method: "DELETE" }),
  listAlerts: () => http(`/alerts`),
  markAlertRead: (id) => http(`/alerts/${id}/read`, { method: "POST" }),

  // ── endpoints the backend still needs to add ──────────────────────────
  listCompanies: () => needs("GET /companies"),
  getFacets: () => needs("GET /companies/facets"),
  getEvent: (id) => needs(`GET /events/${id} (event + company)`),
  renameWatchlist: (id) => needs(`PATCH /watchlists/${id}`),
  markAllAlertsRead: () => needs("POST /alerts/read-all"),
  getDashboard: () => needs("GET /dashboard (rollups)"),
  getCalibration: () => needs("GET /calibration"),
  searchIndex: () => needs("GET /companies (cmd-K index)"),
  getCompanyInvestors: (id) => needs(`GET /companies/${id}/investors`),
  getCompanyPeople: (id) => needs(`GET /companies/${id}/people`),
  getCompanyTrends: (id) => needs(`GET /companies/${id}/trends`),
  getFundingHistory: (id) => needs(`GET /companies/${id}/funding`),
  similarCompanies: (id) => needs(`GET /companies/${id}/similar`),
  getNetworkGraph: () => needs("GET /network"),
  getCompanyNetwork: (id) => needs(`GET /companies/${id}/network`),
  listInvestors: () => needs("GET /investors"),
  getInvestor: (name) => needs(`GET /investors/${encodeURIComponent(name)}`),
  getCompanyArticles: (id) => needs(`GET /companies/${id}/articles`),
  listAlertRules: () => needs("GET /alert-rules"),
  createAlertRule: () => needs("POST /alert-rules"),
  deleteAlertRule: (id) => needs(`DELETE /alert-rules/${id}`),
}
