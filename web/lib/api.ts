/**
 * DATA LAYER ENTRY POINT.
 *
 * Every screen imports `api` from here. It dispatches to the in-memory demo
 * backend (`demoApi`) or the real FastAPI client (`realApi`) based on the
 * `NEXT_PUBLIC_DEMO` flag — so switching backends is a config change, not a code
 * change.
 *
 *   NEXT_PUBLIC_DEMO unset or "true"  → demo backend (default; fully self-contained)
 *   NEXT_PUBLIC_DEMO="false"          → real FastAPI at NEXT_PUBLIC_API_URL
 *
 * Types (CompanyFilters, DashboardData, view-models, DataApi, …) are re-exported
 * from `mock-api` so screens can import value + types from this one module.
 */
export * from "./mock-api"

import { demoApi } from "./mock-api"
import { realApi } from "./real-api"
import type { DataApi } from "./mock-api"

/** True unless NEXT_PUBLIC_DEMO is explicitly "false". */
export const IS_DEMO =
  (process.env.NEXT_PUBLIC_DEMO ?? "true").toLowerCase() !== "false"

export const api: DataApi = IS_DEMO ? demoApi : realApi
