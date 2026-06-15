# CLAUDE.md

This file is loaded at the start of every Claude Code session. It contains the invariants. The full spec lives in `docs/ARCHITECTURE.md` — read the referenced section before writing code for that section.

---

## Project

**Korean Company Intelligence Platform.** Ingest Korean business news → resolve companies → extract structured events and facts → attach fact-level confidence with full source traceability → expose via a searchable dashboard with watchlists and alerts. A narrow first cut of PitchBook / Crunchbase / AlphaSense / CB Insights, focused on Korean private, VC-backed, and growth-stage companies.

---

## Three rules that override everything

1. **Never write facts directly. Write assertions.** The system of record is `event_assertions` and `fact_assertions` — immutable, append-only, one row per "this article asserted this value." `events` and `facts` are *derived, recomputable aggregations* over assertions. If you find yourself writing an UPDATE to `facts` or `events`, stop — you are violating the model. Corrections happen by appending new assertions and re-materializing.

2. **One database. Postgres + pgvector + Meilisearch. Nothing else.** Postgres is the system of record, JSONB store, vector store (pgvector), and work queue (`FOR UPDATE SKIP LOCKED`). Meilisearch is the only additional datastore. No Redis. No Neo4j. No Kafka. No separate vector DB. If a feature seems to require one of these, you're missing a simpler Postgres pattern — ask before adding infra.

3. **LLMs never produce confidence numbers.** Confidence is computed deterministically in Python from source reputation, independent corroboration, agreement, recency, and official-filing boost. The formula and all tunable constants are in `ARCHITECTURE.md` §11 and Appendix D. Asking an LLM "how confident are you?" is forbidden.

---

## Data tiers (understand this before touching the schema)

| Tier | Tables | Mutability |
|---|---|---|
| **Raw** | `articles`, `event_assertions`, `fact_assertions` | Immutable, append-only |
| **Derived** | `companies`, `events`, `facts` | Recomputable from raw |
| **Product** | `watchlists`, `watchlist_companies`, `alerts` | Mutable (user-owned) |

Derived rows must be fully reproducible from raw rows. If the confidence formula changes, we recompute — we do not migrate.

---

## Tech stack (canonical — do not substitute without asking)

- **Backend:** Python 3.12, FastAPI, Pydantic v2, Alembic, `uv` for package management
- **DB:** PostgreSQL 16 via Supabase, with `pgvector` and `pg_trgm` extensions
- **Search:** Meilisearch (single container)
- **Pipeline:** Dagster (assets, scheduling, sensors)
- **Work queue:** Postgres `FOR UPDATE SKIP LOCKED` — not Celery, not Redis
- **LLM — triage:** Gemini Flash / Claude Haiku-class (cheap)
- **LLM — extraction:** Claude Sonnet 4.6 / GPT-5.x-class (reliable, structured output)
- **Embeddings:** `text-embedding-3-large` (1536 dims — matches schema)
- **Frontend:** Next.js 14 App Router, TypeScript, Tailwind, shadcn/ui, TanStack Query
- **Hosting:** Vercel (web), Fly.io or Railway (api + pipeline + Meilisearch), Supabase (DB/Auth/Storage)
- **Observability:** Dagster UI, Sentry, the `pipeline_runs` table for LLM cost accounting

---

## Repo layout

```
api/          FastAPI backend
pipeline/     Dagster project (ingestion, extraction, materialization, alerts)
web/          Next.js 14 frontend
scripts/      One-off CLI tools (DART seed, alias import, calibration runs)
docs/         ARCHITECTURE.md and supporting documentation
migrations/   Alembic migrations
```

---

## Invariants Claude Code must enforce

- **Every LLM call writes to `pipeline_runs`** with stage, model, input/output tokens, cost, status. Use the `log_llm_call()` helper — never bypass it.
- **Every assertion records `model_name`, `model_version`, `prompt_version`, and `evidence_quote`.** If an extraction cannot quote the text that produced a value, it cannot assert the value.
- **Every fact and event row has a `confidence_factors` JSONB.** The UI renders the breakdown — it must be human-readable.
- **All Korean amounts are stored as KRW integers.** Never store `"500억"` as a string in `value_numeric`. See Appendix B in `ARCHITECTURE.md` for the normalization table.
- **The `0.99` confidence cap is intentional.** Do not remove it. The product never claims certainty.
- **Bias entity resolution toward "send to review" over "auto-merge."** A wrong merge corrupts every downstream fact and is hard to detect. Use `RESOLUTION_AUTO_MERGE_THRESHOLD = 0.92`.
- **Never reproduce article body text in any UI surface or API response.** Show titles, snippets, and deep-links only. We store extracted *facts*, not prose.

---

## Confidence constants (canonical source — use these in code)

These supersede any numbers found elsewhere. When tuning calibration, change them here in code, not in the spec.

```python
# config/confidence.py

# Corroboration saturation constant
K_CORROB = 1.1

# Source reputation weights by tier
TIER_WEIGHTS = {
    0: 1.00,   # official (DART, KRX, company IR)
    1: 0.85,   # major business media
    2: 0.60,   # startup/general media
    3: 0.30,   # blog/aggregator
}

# Confidence cap — the system never claims certainty
CONFIDENCE_CAP = 0.99

# Official source boost (applied if any agreeing assertion is Tier 0)
OFFICIAL_BOOST = 1.15

# Extraction quality scores
EXTRACTION_QUALITY = {
    "explicit": 1.0,   # value clearly stated in text
    "derived":  0.7,   # computed from stated figures
    "inferred": 0.4,   # ambiguous or approximate
}

# Recency half-lives by fact type (days). None = no decay.
HALF_LIVES = {
    "valuation":       180,
    "funding_amount":  None,
    "total_raised":    365,
    "employee_count":  365,
    "revenue":         365,
    "ipo_target_date": 90,
    "headquarters":    730,
    "founded_year":    None,
}

# Dedup clustering thresholds
SIMHASH_HAMMING_THRESHOLD  = 3      # ≤ 3 bits different = near-duplicate
EMBEDDING_COSINE_THRESHOLD = 0.92   # ≥ 0.92 cosine = same story

# Entity resolution thresholds
RESOLUTION_AUTO_MERGE_THRESHOLD = 0.92  # below → review queue
RESOLUTION_REVIEW_THRESHOLD     = 0.75  # below → unmatched
```

---

## Implementation order (do not skip ahead)

Each step is one Claude Code session. Sessions 5–6 (entity resolution) must precede session 7 (extraction) — extraction without resolution produces orphan assertions that are painful to fix retroactively.

1. Scaffold (monorepo + Alembic + log_llm_call helper)
2. Schema (full §6 schema, sources seeded from Appendix C)
3. Ingestion (Naver News connector → `articles`)
4. Deduplication (SimHash + embedding clustering)
5. Company registry seed (DART `corpCode.xml` + manual KO↔EN alias bridge)
6. Entity resolution (waterfall + review queue)
7. Triage + NER (Pass 0–1, cheap LLM)
8. Structured extraction (Pass 3–5, reliable LLM, golden eval harness)
9. Materialization (assertions → events + facts with history)
10. Confidence scoring (deterministic + Brier-score calibration)
11. Search (Meilisearch indices + nightly reconcile)
12. API (FastAPI + Supabase Auth + RLS)
13. Dashboard (Next.js)
14. Alerts (Dagster sensor + email)
15. Hardening (Sentry, cost dashboard, calibration on schedule)

---

## How to work with me on this codebase

- **Before writing code for a section, read the relevant `docs/ARCHITECTURE.md` section.** It is detailed enough that you do not need to invent design decisions.
- **If the spec is ambiguous, ask before guessing.** Inventing a column, an event type, or a confidence factor is a worse outcome than a 30-second clarifying question.
- **Match schema column names and types exactly.** The schema is the contract between sessions.
- **Show me the plan before the code on multi-step tasks.** A bulleted plan of what files you'll create/modify, in what order, with what tests, before any code is written.
- **Prefer one well-tested feature complete over three half-done.** Do not declare a session done until the "Done when" criteria are met.
- **No mocked LLM responses in production code paths.** Tests can mock. Pipeline code calls real models with cost logging.

---

## Current task

> Update this line at the start of each session.

**Step 1 — Scaffold + Step 2 — Schema** (see `docs/ARCHITECTURE.md` §15, Steps 1–2)