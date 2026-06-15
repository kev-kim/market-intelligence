# ARCHITECTURE.md
## Korean Company Intelligence Platform

**Status:** MVP build spec — hand-off to Claude Code
**Last updated:** 2026-06
**Scope:** Ingest Korean business news → resolve companies → extract structured events and facts → attach fact-level confidence with full source traceability → expose via a searchable dashboard with watchlists and alerts.

This document is opinionated by design. Where multiple approaches exist, one is chosen and justified. A competent engineer reading this document should not need further product clarification to build the MVP.

---

## Table of Contents

1. [Product Vision & Principles](#1-product-vision--principles)
2. [The Three Foundational Decisions](#2-the-three-foundational-decisions)
3. [Tech Stack](#3-tech-stack)
4. [System Architecture](#4-system-architecture)
5. [Data Sources](#5-data-sources)
6. [Database Schema](#6-database-schema)
7. [Entity Model](#7-entity-model)
8. [Entity Resolution](#8-entity-resolution)
9. [Data Pipeline](#9-data-pipeline)
10. [Extraction Architecture](#10-extraction-architecture)
11. [Confidence Model](#11-confidence-model)
12. [Search Architecture](#12-search-architecture)
13. [Knowledge Graph](#13-knowledge-graph)
14. [API Surface](#14-api-surface)
15. [Implementation Order (Claude Code Prompts)](#15-implementation-order-claude-code-prompts)
16. [Roadmap](#16-roadmap)
17. [Risk Register](#17-risk-register)
- [Appendix A — Opinionated Departures](#appendix-a--opinionated-departures)
- [Appendix B — Korean NLP Reference](#appendix-b--korean-nlp-reference)
- [Appendix C — Source Reputation Registry](#appendix-c--source-reputation-registry)
- [Appendix D — Confidence Formula Constants](#appendix-d--confidence-formula-constants)

---

## 1. Product Vision & Principles

### Vision

A Korean-company intelligence platform — a narrow first cut of PitchBook / Crunchbase / AlphaSense / CB Insights, focused entirely on Korean private, VC-backed, and growth-stage companies. Automatically collect Korean business news, identify companies and corporate events, build structured company profiles, and allow investors to monitor companies through a searchable dashboard.

**Primary users:** venture capital investors, startup scouts, corporate development teams, investment bankers, consultants, analysts.

### Core Principles

1. **Facts must be attributable.** Every fact shown to a user must be traceable to one or more underlying source articles.
2. **Confidence lives on facts, not companies.** Never "Company X is high-confidence." Always "Valuation: 500B KRW (91%)."
3. **Expose uncertainty, never hide it.** The system must surface conflicting reports and low-confidence facts rather than silently picking one.
4. **Structured data over summaries.** What a source said — in structured, normalized, queryable form — is more valuable than a prose summary of it.
5. **Designed to evolve.** Every schema, pipeline, and API decision should preserve the ability to add sources, event types, and relationship types without rearchitecting.

---

## 2. The Three Foundational Decisions

These three commitments shape every downstream choice. Understand them before reading anything else.

### Decision 1 — The system of record is an immutable assertion log, not a profile

We never write "Company X is valued at 500B KRW" as a primary fact. We write "Article A (from 더벨, published 2026-03-04) *asserts* that Company X raised at a 500B KRW valuation." Every event and every fact shown to a user is a *derived, materialized aggregation* over these immutable assertions.

This is essentially event-sourcing applied to corporate intelligence. Traceability, fact-level confidence, conflicting reports, and historical fact lineage all fall out of this model structurally — they do not need to be bolted on. If we improve the confidence formula, we recompute derived rows from the raw assertion log without losing data.

### Decision 2 — One database does almost everything. Postgres, not a zoo

Postgres is the system of record, the JSONB document store for flexible event payloads, the vector store (pgvector) for dedup and semantic search, *and* the work queue (`FOR UPDATE SKIP LOCKED`). Meilisearch is the only additional datastore in the MVP.

No graph database, no Kafka, no separate vector DB, no Redis. Each of these is a second thing to operate, a second thing to debug, and a second thing to explain. Knowing *when* to defer each of these is as impressive as having added them.

### Decision 3 — Confidence is computed deterministically. The LLM never produces a confidence number

An LLM asked "how confident are you?" produces a number that is uncalibrated, ungrounded, and unauditable. Our confidence is a transparent function of source reputation, independent corroboration, cross-source agreement, recency, and official filings. The UI can render *why* a fact is 91% by showing the exact factor breakdown. This is the product's core differentiator and cannot be a black box.

---

## 3. Tech Stack

| Layer | Choice | Why, not the alternative |
|---|---|---|
| Language (pipeline/backend) | **Python 3.12** | Best ecosystem for Korean NLP, DART, LLM SDKs, data tooling. Non-negotiable for this domain. |
| Backend API | **FastAPI + Pydantic v2** | Async, auto-generated OpenAPI docs. Pydantic models double as extraction-validation schemas — write the schema once, use it for both the API and LLM structured output. |
| System of record | **PostgreSQL 16 via Supabase** | Supabase gives Postgres + pgvector + Auth + Storage + Row-Level Security in one product and one bill. For a solo founder this collapses auth, file storage, and DB into a single mental model. |
| Vectors | **pgvector** (inside Postgres) | Dedup and semantic search both need embeddings. No reason to run a separate vector DB at MVP scale (low millions of rows). |
| Keyword search | **Meilisearch** (single small container) | Korean search needs more than `LIKE`. Meilisearch is trivial to operate, has typo tolerance, instant search, and acceptable CJK handling. Chosen over OpenSearch+Nori purely on operational cost — see §12 for the graduation path. |
| Pipeline orchestration | **Dagster** | Software-defined *assets* map 1:1 onto our data lineage (`article → mention → event/fact`). Built-in scheduling, retries, partitioning, backfills, and an observability UI. More correct and more maintainable than a pile of cron jobs. |
| Work queue | **Postgres `FOR UPDATE SKIP LOCKED`** | Zero extra infra. Add Redis/Celery only if/when throughput demands it. |
| LLM — triage | **Gemini 3 Flash / Claude Haiku-class** (~$0.10–$0.40/M tokens) | Filters the firehose. ~85% of articles die here. This is where the cost savings live. |
| LLM — extraction | **Claude Sonnet 4.6 / GPT-5.x-class** (~$3/M input) | Reliable structured output for the high-stakes extraction pass. Prompt caching + Batch API cuts this ~50–70%. |
| Embeddings | **OpenAI `text-embedding-3-large`** or **ko-sbert / KURE** | Korean-aware embeddings for dedup clustering and semantic retrieval. |
| Frontend | **Next.js 14 + TypeScript + Tailwind + shadcn/ui + TanStack Query** | Standard, fast, recruiter-recognizable. Server components for the read-heavy dashboard. |
| Hosting | Frontend: **Vercel**; pipeline + API + Meilisearch: **Fly.io** or **Railway**; DB/Auth/Storage: **Supabase** | All have generous free/cheap tiers and ship-fast DX. |
| Observability | **Dagster UI** (pipeline) + **Sentry** (errors) + **`pipeline_runs` table** (cost/token accounting) | Track LLM spend per stage from day one — it is the cost that kills solo-founder budgets. |

**Opinionated stance:** resist the urge to add Kafka, Airflow, Neo4j, Elasticsearch, or a microservices split. A modular monolith (one FastAPI app + one Dagster project + one Next.js app) is correct until you have paying users and a real, measured scaling bottleneck.

---

## 4. System Architecture

### Pipeline flow

```
┌──────────────────────────────────────────────────────────────────┐
│  INGEST — Dagster (scheduled assets)                              │
│  Naver News API · media RSS · [later: DART, press, job postings] │
└──────────────────────────┬───────────────────────────────────────┘
                           │  raw articles (metadata + snippet + link)
                           ▼
┌──────────────────────────────────────────────────────────────────┐
│  STORE + DEDUP — PostgreSQL                                       │
│  articles · content_hash · simhash · embedding (pgvector)        │
│  → dedup_cluster                                                  │
└──────────────────────────┬───────────────────────────────────────┘
                           │  new, deduped articles → processing queue
                           ▼
┌──────────────────────────────────────────────────────────────────┐
│  PROCESS — queue workers (FOR UPDATE SKIP LOCKED)                 │
│  1. Triage / relevance filter   (cheap LLM)                      │
│  2. Company NER                 (cheap LLM / NER model)          │
│  3. Entity resolution           (deterministic)                  │
│  4. Event + fact extraction     (reliable LLM, structured JSON)  │
│  5. Validation                  (Pydantic + business rules)      │
│  6. Write event_assertions / fact_assertions                     │
└──────────────────────────┬───────────────────────────────────────┘
                           │  immutable assertion rows
                           ▼
┌──────────────────────────────────────────────────────────────────┐
│  MATERIALIZE — Dagster asset                                      │
│  Aggregate assertions → events + facts                           │
│  Compute confidence (deterministic)                              │
│  Detect new events → enqueue alerts                              │
└────────────┬─────────────────────────────┬────────────────────────┘
             ▼                             ▼
   Meilisearch indices             PostgreSQL (structured filters)
             │                             │
             └──────────────┬──────────────┘
                            ▼
            FastAPI  ──►  Next.js dashboard
                  (search · profile · timeline ·
                   facts+confidence+sources · watchlists · alerts)
```

### Data tier model

Three tiers, strictly separated — understanding this is prerequisite to understanding the schema.

| Tier | Tables | What it is | Mutable? |
|---|---|---|---|
| **Raw** | `articles`, `event_assertions`, `fact_assertions` | What sources said | Immutable, append-only |
| **Derived** | `companies`, `events`, `facts` | Our synthesized best answer, with confidence | Recomputable from raw |
| **Product** | `users`, `watchlists`, `alerts` | User-facing state | Mutable |

Because derived entities are fully recomputable from the raw tier, the system is debuggable ("why is this fact 91%?" → inspect assertions and factors), evolvable ("changed source tiers" → recompute, no data loss), and auditable.

---

## 5. Data Sources

### MVP sources

| Source | What it provides | API constraint | Tier |
|---|---|---|---|
| **Naver News Open API** | Title + short snippet + link (no full body) | ~25,000 calls/day/app, attribution required | 1–2 depending on outlet |
| **Korean media RSS** | Title + snippet + link, broader outlet coverage | No formal quota; be respectful | 1–2 |
| **DART OpenAPI** (Phase 2) | Structured filings: 사업보고서, 주요사항보고서, 증권신고서 | Free; ~10,000 calls/day | 0 (official) |

**Critical constraint on Naver:** the Open API returns metadata and short descriptions only, never full article bodies. Extraction must work from snippets. Full-body fetching is a separate, legally-gated enrichment step that must be handled source-by-source with ToS compliance. The product stores extracted facts and deep-links to originals — it never reproduces article prose.

### Extension points

The ingestion layer is connector-based. Each connector is a Dagster asset that emits standardized article rows to the `articles` table. Adding a new source = adding one connector, one entry in the `sources` table with its reputation tier, and updating relevant query lists. No pipeline restructuring required. Future connectors: company press releases, KRX disclosures, KIPRIS patents, job postings, corporate websites.

---

## 6. Database Schema

Full PostgreSQL 16 DDL. Tables are grouped by tier — read in order.

### 6.1 Raw tier — sources and articles

```sql
-- ========== SOURCES ==========
CREATE TABLE sources (
  id               BIGSERIAL PRIMARY KEY,
  name             TEXT NOT NULL,
  domain           TEXT UNIQUE NOT NULL,        -- e.g. 'thebell.co.kr'
  reputation_tier  SMALLINT NOT NULL,           -- 0=official, 1=major business, 2=startup/general, 3=blog
  reputation_weight NUMERIC(3,2) NOT NULL,      -- 0.00–1.00; see Appendix C
  is_official      BOOLEAN NOT NULL DEFAULT FALSE, -- DART, gov filings, company IR
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ========== ARTICLES ==========
CREATE TABLE articles (
  id               BIGSERIAL PRIMARY KEY,
  source_id        BIGINT REFERENCES sources(id),
  url              TEXT NOT NULL,
  url_canonical    TEXT NOT NULL,               -- tracking params stripped; basis for exact dedup
  title            TEXT NOT NULL,
  snippet          TEXT,                         -- Naver API gives snippet only
  body             TEXT,                         -- present only if legally fetched
  published_at     TIMESTAMPTZ,
  fetched_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  language         TEXT NOT NULL DEFAULT 'ko',
  content_hash     TEXT NOT NULL,               -- sha256(title+snippet) for exact dupes
  simhash          BIGINT,                       -- 64-bit SimHash for near-dupes
  embedding        VECTOR(1536),                 -- pgvector, for semantic dedup + search
  dedup_cluster_id BIGINT,                       -- FK set during dedup; points to canonical article
  processing_status TEXT NOT NULL DEFAULT 'pending', -- pending|triaged|processed|skipped|failed
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (url_canonical)
);
CREATE INDEX idx_articles_status  ON articles(processing_status);
CREATE INDEX idx_articles_pubdate ON articles(published_at DESC);
CREATE INDEX idx_articles_simhash ON articles(simhash);
CREATE INDEX idx_articles_embed   ON articles USING hnsw (embedding vector_cosine_ops);

CREATE TABLE article_dedup_clusters (
  id                   BIGSERIAL PRIMARY KEY,
  canonical_article_id BIGINT REFERENCES articles(id),
  member_count         INT NOT NULL DEFAULT 1,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 6.2 Entity tier — companies and aliases

```sql
-- ========== COMPANIES ==========
CREATE TABLE companies (
  id                BIGSERIAL PRIMARY KEY,
  canonical_name_ko TEXT NOT NULL,
  canonical_name_en TEXT,
  dart_corp_code    TEXT UNIQUE,                -- 8-digit DART code; the ground-truth anchor
  stock_code        TEXT,                        -- KRX ticker if listed
  parent_company_id BIGINT REFERENCES companies(id), -- lightweight subsidiary modeling
  status            TEXT NOT NULL DEFAULT 'active',  -- active|acquired|defunct|merged
  sector            TEXT,
  hq_region         TEXT,
  founded_year      INT,
  is_verified       BOOLEAN NOT NULL DEFAULT FALSE,  -- human-confirmed entity
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE company_aliases (
  id          BIGSERIAL PRIMARY KEY,
  company_id  BIGINT NOT NULL REFERENCES companies(id),
  alias       TEXT NOT NULL,
  alias_norm  TEXT NOT NULL,                    -- lowercased, spacing/legal-suffix stripped
  alias_type  TEXT NOT NULL,                    -- ko|en|romanization|former_name|ticker|brand
  source      TEXT NOT NULL DEFAULT 'manual',   -- dart|manual|extracted
  confidence  NUMERIC(3,2) NOT NULL DEFAULT 1.00,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, alias_norm)
);
CREATE INDEX idx_alias_norm ON company_aliases USING gin (alias_norm gin_trgm_ops);

-- ========== COMPANY MENTIONS (raw, per-article) ==========
CREATE TABLE company_mentions (
  id                    BIGSERIAL PRIMARY KEY,
  article_id            BIGINT NOT NULL REFERENCES articles(id),
  company_id            BIGINT REFERENCES companies(id), -- null until resolved
  surface_form          TEXT NOT NULL,                   -- exactly as written, e.g. '컬리'
  char_span_start       INT,
  char_span_end         INT,
  resolution_status     TEXT NOT NULL DEFAULT 'pending', -- pending|auto|review|resolved|unmatched
  resolution_confidence NUMERIC(4,3),
  resolved_by           TEXT,                            -- auto|human
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 6.3 Raw tier — assertions (immutable, append-only)

```sql
-- ========== EVENT ASSERTIONS ==========
CREATE TABLE event_assertions (
  id                 BIGSERIAL PRIMARY KEY,
  article_id         BIGINT NOT NULL REFERENCES articles(id),
  company_mention_id BIGINT REFERENCES company_mentions(id),
  company_id         BIGINT REFERENCES companies(id),
  event_type         TEXT NOT NULL,               -- see §7.2
  payload            JSONB NOT NULL,               -- typed per event_type; see §7.2
  occurred_on        DATE,
  date_precision     TEXT NOT NULL DEFAULT 'unknown', -- day|month|quarter|year|unknown
  event_status       TEXT NOT NULL DEFAULT 'announced', -- rumored|announced|completed
  evidence_quote     TEXT,                         -- the exact text span the extraction grounded on
  model_name         TEXT NOT NULL,
  model_version      TEXT NOT NULL,
  prompt_version     TEXT NOT NULL,
  extraction_run_id  BIGINT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_evassert_company ON event_assertions(company_id, event_type);

-- ========== FACT ASSERTIONS ==========
CREATE TABLE fact_assertions (
  id                 BIGSERIAL PRIMARY KEY,
  article_id         BIGINT NOT NULL REFERENCES articles(id),
  company_id         BIGINT REFERENCES companies(id),
  event_id           BIGINT,                      -- optional link to the event that produced it
  fact_type          TEXT NOT NULL,               -- see §7.3
  raw_value          TEXT NOT NULL,               -- as written in source, e.g. '500억원'
  value_numeric      NUMERIC,                      -- normalized: 50000000000
  value_text         TEXT,
  unit               TEXT,                         -- krw|count|date|region
  as_of_date         DATE,
  extraction_quality NUMERIC(3,2) NOT NULL DEFAULT 1.00, -- explicit=1.0 derived=0.7 inferred=0.4
  evidence_quote     TEXT,
  model_name         TEXT NOT NULL,
  model_version      TEXT NOT NULL,
  prompt_version     TEXT NOT NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_factassert_lookup ON fact_assertions(company_id, fact_type);
```

### 6.4 Derived tier — events and facts

```sql
-- ========== EVENTS (derived, materialized) ==========
CREATE TABLE events (
  id                 BIGSERIAL PRIMARY KEY,
  company_id         BIGINT NOT NULL REFERENCES companies(id),
  event_type         TEXT NOT NULL,
  payload            JSONB NOT NULL,              -- consensus payload
  occurred_on        DATE,
  date_precision     TEXT NOT NULL DEFAULT 'unknown',
  event_status       TEXT NOT NULL DEFAULT 'announced',
  confidence         NUMERIC(4,3) NOT NULL,       -- computed; see §11
  confidence_factors JSONB NOT NULL,              -- breakdown for the "why" UI
  summary            TEXT,                         -- one-line, source-grounded
  is_published       BOOLEAN NOT NULL DEFAULT TRUE,
  first_seen_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_events_company ON events(company_id, occurred_on DESC);

CREATE TABLE event_assertion_links (
  event_id     BIGINT NOT NULL REFERENCES events(id),
  assertion_id BIGINT NOT NULL REFERENCES event_assertions(id),
  PRIMARY KEY (event_id, assertion_id)
);

-- ========== FACTS (derived, materialized, with history) ==========
CREATE TABLE facts (
  id                 BIGSERIAL PRIMARY KEY,
  company_id         BIGINT NOT NULL REFERENCES companies(id),
  fact_type          TEXT NOT NULL,
  value_numeric      NUMERIC,
  value_text         TEXT,
  unit               TEXT,
  as_of_date         DATE,
  confidence         NUMERIC(4,3) NOT NULL,
  confidence_factors JSONB NOT NULL,
  valid_from         DATE NOT NULL,
  valid_to           DATE,                        -- null = currently valid
  is_current         BOOLEAN NOT NULL DEFAULT TRUE,
  has_conflict       BOOLEAN NOT NULL DEFAULT FALSE, -- true if dissenting assertions exist
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_facts_current ON facts(company_id, fact_type) WHERE is_current;

CREATE TABLE fact_assertion_links (
  fact_id      BIGINT NOT NULL REFERENCES facts(id),
  assertion_id BIGINT NOT NULL REFERENCES fact_assertions(id),
  agrees       BOOLEAN NOT NULL,                  -- agrees with consensus value?
  PRIMARY KEY (fact_id, assertion_id)
);
```

### 6.5 Entity resolution review queue

```sql
CREATE TABLE resolution_queue (
  id                  BIGSERIAL PRIMARY KEY,
  company_mention_id  BIGINT NOT NULL REFERENCES company_mentions(id),
  candidates          JSONB NOT NULL,             -- [{company_id, score, method}]
  top_score           NUMERIC(4,3),
  status              TEXT NOT NULL DEFAULT 'open', -- open|resolved|created_new|discarded
  resolved_company_id BIGINT REFERENCES companies(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 6.6 Audit and product layers

```sql
-- ========== PIPELINE AUDIT / COST ACCOUNTING ==========
CREATE TABLE pipeline_runs (
  id            BIGSERIAL PRIMARY KEY,
  stage         TEXT NOT NULL,
  article_id    BIGINT,
  model_name    TEXT,
  input_tokens  INT,
  output_tokens INT,
  cost_usd      NUMERIC(10,6),
  status        TEXT NOT NULL,                   -- ok|retry|failed
  error         TEXT,
  duration_ms   INT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ========== PRODUCT LAYER ==========
CREATE TABLE watchlists (
  id         BIGSERIAL PRIMARY KEY,
  user_id    UUID NOT NULL,                      -- Supabase auth.uid()
  name       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE watchlist_companies (
  watchlist_id BIGINT NOT NULL REFERENCES watchlists(id),
  company_id   BIGINT NOT NULL REFERENCES companies(id),
  added_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (watchlist_id, company_id)
);
CREATE TABLE alerts (
  id          BIGSERIAL PRIMARY KEY,
  user_id     UUID NOT NULL,
  company_id  BIGINT NOT NULL REFERENCES companies(id),
  event_id    BIGINT REFERENCES events(id),
  alert_type  TEXT NOT NULL DEFAULT 'new_event',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  read_at     TIMESTAMPTZ
);
```

---

## 7. Entity Model

### 7.1 Company entity

A company is a canonical entity with a stable `id`. All downstream events and facts reference `company_id`. The entity is anchored to DART where possible (see §8). The `company_aliases` table is the resolution surface — all name variants, romanizations, brands, and tickers live there.

### 7.2 Event types

Events are discrete corporate occurrences. The model is a **registry**: each `event_type` has a Pydantic schema for its payload and a set of Korean trigger keywords. Adding a new event type means adding one registry entry — never a migration.

**MVP event types:**

```
funding_round     acquisition        merger
ipo_announcement  ipo_completion     profitability_milestone
partnership       executive_hire     executive_departure
```

**Per-type payload schemas** (stored as JSONB, validated by Pydantic):

```jsonc
// funding_round
{
  "round_name": "Series F",       // enum: Seed|Pre-A|Series A..F|Bridge|Pre-IPO
  "amount_krw": 50000000000,      // always KRW integer (see Appendix B)
  "pre_money_krw": null,
  "post_money_krw": 500000000000,
  "lead_investor": "...",
  "investors": ["...", "..."]
}

// acquisition
{ "acquirer": "...", "target": "...", "stake_pct": 100, "amount_krw": null }

// merger
{ "entity_a": "...", "entity_b": "...", "surviving_entity": "..." }

// ipo_announcement / ipo_completion
{
  "exchange": "KOSDAQ",
  "target_date": "2026-Q4",
  "offer_price_krw": null,
  "market_cap_krw": null,
  "underwriters": ["..."]
}

// profitability_milestone
{ "metric": "operating_profit", "period": "2025-FY", "value_krw": 0, "turned_positive": true }

// partnership
{ "partner": "...", "nature": "distribution|tech|jv|supply", "description": "..." }

// executive_hire / executive_departure
{ "person": "...", "role": "CEO|CTO|CFO|...", "direction": "join|leave", "effective_date": "2026-03-01" }
```

**End-to-end normalization example:**

```
Article:      "컬리, 500억원 규모 시리즈 F 투자 유치"

Triage:       relevant=true; candidate_event_types=["funding_round"]
NER:          surface_form="컬리"
Resolution:   "컬리" → company_id=1042 (Kurly, dart_corp_code matched)
Extraction:   event_assertion {
                event_type: "funding_round",
                payload: { round_name: "Series F", amount_krw: 50000000000 },
                occurred_on: 2026-03-04,
                date_precision: "day",
                event_status: "announced",
                evidence_quote: "500억원 규모 시리즈 F 투자 유치"
              }
Materialize:  clustered with other coverage of the same round
              → one canonical events row
              → funding_amount fact (50000000000 KRW)
              → possibly a valuation fact if post_money_krw is stated
```

**Event clustering (assertion → canonical event):** group `event_assertions` for the same `company_id` + `event_type` where dates are within ±14 days (widened for coarser `date_precision`) and payloads are compatible (same round name, same acquirer-target pair, etc.). Each cluster materializes one `events` row.

### 7.3 Fact types

A fact is a stateful company attribute with history and source attribution. Facts are produced by extraction or as a by-product of events (a `funding_round` yields a `funding_amount` fact).

| fact_type | unit | normalization | half-life H |
|---|---|---|---|
| valuation | krw | KRW integer | 180 days |
| funding_amount | krw | KRW integer | n/a (point-in-time) |
| total_raised | krw | KRW integer (sum) | 365 days |
| employee_count | count | integer | 365 days |
| revenue | krw | KRW integer + period | 365 days |
| ipo_target_date | date | ISO date + precision | 90 days |
| headquarters | region | KR region code + text | 730 days |
| founded_year | year | integer | ∞ (immutable) |

**History:** a new contradicting value does not overwrite — it closes the prior row (`valid_to`, `is_current=false`) and inserts a new current row.

**Conflicts:** two concurrent sources reporting different values for the same period are kept as competing `fact_assertions` under the same `facts` row. The `facts` row stores the consensus (highest-weight) value, sets `has_conflict=true`, and the UI surfaces the dissent. This directly satisfies Principle 3.

---

## 8. Entity Resolution

Entity resolution is the hardest problem in this system. The strategy is **reliability over sophistication**, with one killer move.

### 8.1 The killer move: DART corp_code anchoring

Every company that files in Korea has an 8-digit DART corp_code and an official legal name. Download the full `corpCode.xml` (free, one API call) and seed `companies` + `company_aliases` with ground-truth legal names at startup.

Resolution then becomes *matching against a known universe* rather than inventing entities. This is the single highest-leverage reliability decision in the system.

### 8.2 Resolution waterfall

Stop at the first confident match. Process in this order:

**Step 1 — Normalize the surface form.**
Strip legal suffixes (주식회사, ㈜, (주), Inc., Co., Ltd., Corp.). Collapse spacing. Unify Korean/Latin character width. Lowercase Latin. Store the result as `alias_norm`.

**Step 2 — Exact match on `alias_norm`.**
Query `company_aliases` for an exact match. Covers Korean names, English names, tickers, brands, former names. If matched: `resolution_status=auto`, `resolution_confidence=1.0`. Stop.

**Step 3 — Curated KO↔EN alias bridge.**
A hand-seeded table handles the hardest cases: `컬리 ↔ Kurly`, `우아한형제들 ↔ Woowa Brothers ↔ 배달의민족`, `네이버 ↔ NAVER`, `카카오 ↔ Kakao`. Seed the top ~300 VC-relevant companies manually. A few hours here removes the majority of pain. If matched: `resolution_status=auto`. Stop.

**Step 4 — Fuzzy match.**
Trigram similarity (`pg_trgm` on `alias_norm`) + edit distance, with embedding cosine as a tiebreaker.
- Score ≥ 0.92: auto-resolve, log for periodic audit.
- 0.75 ≤ score < 0.92: send to review queue with candidate list.
- Score < 0.75: `resolution_status=unmatched`, create a potential new-company signal.

**Step 5 — Human review queue (`resolution_queue`).**
Each queued item shows the surface form + candidate list with scores. A 15-minute daily review session both fixes resolution *and* generates new alias data for the registry.

**Critical bias:** a wrong auto-merge is worse than a missed match. Merge two distinct companies and every downstream fact is corrupted, and the damage is hard to detect. Bias thresholds toward "send to review" over "auto-merge."

### 8.3 Disambiguation context

When a surface form is ambiguous, use article context (sector, co-mentioned investors, location) and embedding similarity to *rank candidates for the review queue*. Never use context to silently auto-merge below threshold.

### 8.4 Subsidiaries and parents

Modeled with the `parent_company_id` self-reference in `companies`. MVP: seed obvious cases manually (e.g. 쿠팡 ↔ 쿠팡풀필먼트서비스). Do not attempt automated corporate-hierarchy inference at MVP.

---

## 9. Data Pipeline

Stage-by-stage reference. Each stage is a Dagster asset or queue worker.

| # | Stage | Purpose | Inputs | Outputs | Tech | Critical failure modes | Key metrics |
|---|---|---|---|---|---|---|---|
| 1 | **Ingestion** | Pull Korean business news | Naver API queries, media RSS | Raw article rows | Dagster asset; `httpx` | Quota exhaustion; query gaps; 429s | calls/day vs quota; new-articles/run |
| 2 | **Article storage** | Persist raw, dedup-ready | Raw articles | `articles` rows | Postgres; URL canonicalization | Dup URLs; encoding issues; null pubdate | Insert rate; null-pubdate % |
| 3 | **Deduplication** | Collapse identical / near / syndicated stories | title, snippet, embedding | `dedup_cluster_id` | SimHash (lexical) + pgvector cosine (semantic) | Over-merge of distinct stories; under-merge of reprints | Cluster size distribution; merge rate |
| 4 | **Triage** | Filter to event-relevant articles | title + snippet | `processing_status`; candidate event types | Cheap LLM; SKIP LOCKED queue | False negatives (missed events); cost spikes | Relevant %; tokens/article; cost/day |
| 5 | **Company NER** | Find company mentions | Article text | `company_mentions` | Cheap LLM or KR NER model | Missed entities; spurious entities | Mentions/article; null-resolution rate |
| 6 | **Entity resolution** | Mention → canonical company | Mention + registry | `company_id` or review queue | Deterministic waterfall (§8) | Wrong auto-merges (highest severity); queue backlog | Auto-resolve %; queue depth; merge audits |
| 7 | **Event extraction** | Unstructured news → structured events | Resolved article | `event_assertions` | Reliable LLM, structured output | Hallucinated amounts/dates; wrong event type | Schema-valid %; evidence-quote coverage; eval precision |
| 8 | **Fact extraction** | Unstructured news → structured facts | Resolved article / events | `fact_assertions` | Reliable LLM + deterministic normalization | 억/조 unit errors; stale-as-current | Normalization-mismatch rate |
| 9 | **Materialization** | Assertions → canonical events + facts | `event_assertions`, `fact_assertions` | `events`, `facts`, link tables | Dagster asset; Python | Clustering errors; history gaps | Assertion→event coverage |
| 10 | **Confidence scoring** | Compute deterministic confidence | Assertions + source metadata | `confidence` + `confidence_factors` | Deterministic Python (§11) | Miscalibration; syndication double-count | Brier score; calibration drift |
| 11 | **Search indexing** | Keep search indices current | `companies`, `articles`, `events` | Meilisearch documents | Write-through + nightly reconcile | Index drift vs DB | Index lag; doc count parity |
| 12 | **Dashboard serving** | Serve product | DB + Meilisearch | API responses | FastAPI + Next.js | Slow joins; N+1 queries; auth gaps | p95 latency; error rate |
| — | **Alerting** | Notify watchers of new events | New `events` + `watchlist_companies` | `alerts` rows + email | Dagster sensor | Duplicate or missed alerts | Alerts/day; dedupe rate |

---

## 10. Extraction Architecture

Five passes. Each pass has a frozen `prompt_version`. The LLM never produces a confidence number.

### Pass 0 — Triage (cheap model)

**Input:** title + snippet.
**Output:** `{ relevant: bool, candidate_event_types: [...] }`.
**Purpose:** filter the firehose. ~85% of articles die here. This is the primary cost-control mechanism. A false negative (missed real event) is bad; tune recall high and accept some false positives — the reliable model will reject them in Pass 3.

### Pass 1 — Company NER (cheap model or KR NER model)

**Input:** article text.
**Output:** `[{ surface_form: "컬리", char_span_start: 0, char_span_end: 2 }]`.
**Feeds:** `company_mentions`.

### Pass 2 — Entity resolution (deterministic — no LLM)

See §8. Attach `company_id` to mentions or route to review queue.

### Pass 3 — Structured extraction (reliable model)

**Input:** article text (or snippet if that's all we have) + resolved company context + target JSON Schema for candidate event type(s).
**Method:** native structured output / function calling — the model *must* return schema-valid JSON. Do not ask for free-form JSON and parse it.
**Critical rule:** require an `evidence_quote` for every extracted value. If the model cannot quote the text that produced a value, it cannot assert the value. This is the single most effective anti-hallucination control available. Validate that the quote actually appears in the source text.

### Pass 4 — Validation and normalization

- Pydantic schema validation. Reject or repair malformed output.
- **Deterministic re-derivation:** parse `raw_value` ("500억원") independently using the normalization table (Appendix B) and confirm it matches `value_numeric`. Mismatch → lower `extraction_quality` or send to review.
- **Business rules:** amounts non-negative and within sane bounds; dates not in the far future (except `ipo_target_date`); round names in the allowed enum; acquirer ≠ target.

### Pass 5 — Write assertions

Append immutable rows to `event_assertions` / `fact_assertions` with:
- `model_name`, `model_version`, `prompt_version` — for attribution of quality changes
- `evidence_quote` — for UI traceability
- `extraction_quality` — explicit/derived/inferred

### Quality controls

- **Golden eval set:** ~100–200 hand-labeled Korean articles with expected structured output. Run on every prompt or model change. Block regressions. Track precision/recall per event type.
- **Prompt versioning:** every assertion records `prompt_version`. A quality regression can be attributed to a specific prompt change.
- **Cost guardrails:** Batch API + prompt caching for stable system prompts; per-day spend ceiling in the orchestrator; all calls logged to `pipeline_runs`.
- **Snippet-only reality:** design extraction to work from snippets. Full-body content is enrichment, not baseline.

---

## 11. Confidence Model

Confidence lives on the *fact* and on the *event*. Never on the company. It is deterministic, explainable, and stored as both a scalar and a factor breakdown JSONB.

### 11.1 Per-assertion weight

For each supporting assertion *i*, compute weight `w_i = r_i · ρ(Δt_i) · q_i`:

- **Source reputation** `r_i`: Tier 0 (official) = **1.00** · Tier 1 (major business media) = **0.85** · Tier 2 (startup/general media) = **0.60** · Tier 3 (blog/aggregator) = **0.30**. See Appendix C for the full source list and Appendix D for all constants.
- **Recency** `ρ(Δt) = 0.5^(Δt / H)` — exponential decay on report age, where `H` is the per-fact-type half-life from §7.3. A 2-year-old employee count is weak; a founding year never decays.
- **Extraction quality** `q_i`: explicit value in text = **1.0** · derived/computed = **0.7** · inferred/ambiguous = **0.4**.

### 11.2 Independence collapse (anti-syndication)

Before counting, collapse syndicated copies. Five outlets reprinting one press release are one independent signal, not five. Use `dedup_cluster_id`: assertions sharing a cluster contribute the **max** single weight, not the sum. This prevents manufactured confidence from churnalism.

### 11.3 Aggregation formula

Cluster the (now-independent) assertions by normalized value — numeric within 5% tolerance, exact match for categorical. Let `v*` = the value with the highest summed weight.

```
W_agree = Σ_{i agrees with v*} w_i
W_total = Σ_all w_i

Corroboration  = 1 − exp(−k · W_agree)        [k = 1.1; saturating, diminishing returns]
Agreement      = W_agree / W_total              [penalty for dissent]
Official boost = 1.15 if any agreeing assertion is Tier 0, else 1.0

Confidence = min(0.99, Corroboration · Agreement · Official_boost)
```

The cap at 0.99 is intentional. The product *never* claims certainty.

### 11.4 Worked examples

**Valuation = 500B KRW** — three independent sources, all agreeing, none official:

| source | r | ρ | q | w |
|---|---|---|---|---|
| 더벨 (T1) | 0.85 | 1.00 | 1.0 | 0.850 |
| 한국경제 (T1) | 0.85 | 0.95 | 1.0 | 0.808 |
| 플래텀 (T2) | 0.60 | 0.90 | 1.0 | 0.540 |

W_agree = 2.198, A = 1.0, B = 1.0.
Corrob = 1 − exp(−1.1 × 2.198) = 0.911.
**Confidence = 91%.** ✅

**Employee count = 120** — single, slightly stale, approximate source ("약 120명", T1):

w = 0.85 × 0.95 × 0.85 = 0.686.
Corrob = 1 − exp(−1.1 × 0.686) = 0.530.
**Confidence = 54%.** ✅

The contrast is the product story. The `confidence_factors` JSONB makes the breakdown visible in the UI ("3 independent sources, full agreement, no official filing").

### 11.5 Calibration

Maintain a labeled set of facts with known-true values. Track calibration via **Brier score** and reliability diagrams: of all facts rated ~90%, are ~90% actually correct? Tune `k`, tier weights, and half-lives to minimize miscalibration. All tunable constants are in Appendix D.

---

## 12. Search Architecture

### MVP surfaces

**Company search:** Meilisearch `companies` index over `{canonical_name_ko, canonical_name_en, aliases[], sector}`. Typo tolerance and prefix search. This is the primary search entry point.

**Article/event search:** Meilisearch `articles` index over `{title, snippet, company names, event_type, published_at}`. Faceted filters (event_type, sector, date range) via Meilisearch. Structured filters requiring joins (confidence thresholds, watchlist scoping) resolved at the FastAPI layer against Postgres.

**Semantic "find similar":** pgvector cosine over article/company embeddings. No extra infra. Powers "companies like this" and "related coverage" features.

### Index sync

Write-through on materialize: when an `events`, `facts`, or `companies` row changes, push affected documents to Meilisearch. Nightly full reconcile job repairs drift. Monitor: index lag and doc-count parity.

### Graduation path to OpenSearch + Nori

When Korean *relevance ranking* quality becomes a measured complaint — not before — migrate the article index to **OpenSearch with the Nori (한국어 형태소 분석) analyzer**. Nori does proper Korean morphological tokenization (조사/어미 stripping, compound splitting) that Meilisearch approximates but does not match. Defer until query volume and relevance issues justify the operational cost. Running and tuning OpenSearch solo is real toil.

---

## 13. Knowledge Graph

**Recommendation: relational Postgres with a subject–predicate–object table. No graph database for MVP.**

The relationships we care about (investor→company, acquirer→target, parent→subsidiary, executive→company) are low-cardinality and shallow. They are expressible as relational rows and queryable with recursive CTEs:

```sql
CREATE TABLE relationships (
  id           BIGSERIAL PRIMARY KEY,
  subject_type TEXT NOT NULL,     -- company|person|investor
  subject_id   BIGINT NOT NULL,
  predicate    TEXT NOT NULL,     -- invested_in|acquired|subsidiary_of|executive_of
  object_type  TEXT NOT NULL,
  object_id    BIGINT NOT NULL,
  event_id     BIGINT REFERENCES events(id),  -- provenance: which event created this edge
  confidence   NUMERIC(4,3) NOT NULL,
  valid_from   DATE,
  valid_to     DATE
);
```

This SPO table *is* a property graph. It gives graph queries (`WITH RECURSIVE` for "all companies this fund has touched, 2 hops out") without a second database, second query language, or second operational burden. Every edge carries `event_id` provenance and `confidence`, staying faithful to the traceability principle.

**When to revisit:** only if you need deep multi-hop traversals at scale (investor co-investment networks 5 hops deep, 100k+ entities) *and* recursive CTE performance is a measured bottleneck. At that point, consider Apache AGE (a Postgres extension) before adding a standalone Neo4j instance.

---

## 14. API Surface

FastAPI, REST. All read endpoints return source-linked data. The `/sources` endpoints are the product's spine — clicking a confidence chip in the UI calls one of them.

```
GET  /companies/search?q=             → company hits (Meilisearch + alias resolution)
GET  /companies/{id}                  → profile (current facts + confidence + sector + status)
GET  /companies/{id}/events           → timeline (events, confidence, supporting article links)
GET  /companies/{id}/facts            → facts with history, confidence, conflict flags
GET  /facts/{id}/sources              → assertions + articles behind a fact  ← traceability spine
GET  /events/{id}/sources             → assertions + articles behind an event ← traceability spine
GET  /articles/search?q=&facets=      → article search with filters
POST /watchlists                      → create watchlist
POST /watchlists/{id}/companies       → add company to watchlist
GET  /alerts                          → unread alerts for current user
```

---

## 15. Implementation Order (Claude Code Prompts)

One Claude Code session per step. Do not let it run ahead of the dependency order. Entity resolution (steps 5–6) deliberately precedes extraction (step 7) — extraction without resolution produces orphan assertions that are expensive to fix retroactively.

**Step 1 — Scaffold**
"Create the monorepo: FastAPI backend (`/api`), Dagster project (`/pipeline`), Next.js frontend (`/web`, Tailwind + shadcn). Supabase client config. Set up Postgres migrations with Alembic. Add `.env` config and a `pipeline_runs` cost-logging helper that every LLM call writes to."

**Step 2 — Schema**
"Implement the full Postgres schema from §6 as Alembic migrations, in order: sources → articles → companies/aliases/mentions → event_assertions/fact_assertions → events/facts/links → resolution_queue → pipeline_runs → watchlists/alerts. Enable pgvector and pg_trgm extensions. Seed the `sources` table with the Appendix C reputation registry."

**Step 3 — Ingestion**
"Build the Naver News API connector as a Dagster scheduled asset. Query a configurable list of companies/keywords. Canonicalize URLs (strip tracking params, normalize scheme). Persist to `articles` with `content_hash` (sha256 of title+snippet). Deduplicate on `url_canonical` with `ON CONFLICT DO NOTHING`."

**Step 4 — Deduplication**
"Add a Dagster asset for dedup. For each new article: generate a 64-bit SimHash over title+snippet and store to `articles.simhash`; generate an embedding (text-embedding-3-large) and store to `articles.embedding`. Cluster near-dupes: SimHash Hamming distance ≤ 3 = same cluster; embedding cosine ≥ 0.92 = same cluster. Write `dedup_cluster_id` and `article_dedup_clusters`."

**Step 5 — Company registry seed**
"Fetch DART `corpCode.xml` and seed `companies` + `company_aliases` with legal names (alias_type='ko', source='dart'). Add a CLI script that reads a CSV of manual KO↔EN mappings (see Appendix B for the top-300 seed list) and inserts them as aliases (source='manual'). Run this before any extraction."

**Step 6 — Entity resolution**
"Implement the §8 resolution waterfall as a Python module: (1) normalize surface form per Appendix B; (2) exact alias match; (3) pg_trgm fuzzy match + embedding cosine tiebreaker; (4) route to `resolution_queue` if ambiguous. Build a minimal `/admin/resolution-queue` endpoint that shows candidates with scores and accepts a human decision. Use conservative auto-merge thresholds (≥ 0.92). Log all auto-resolutions for periodic audit."

**Step 7 — Triage and NER**
"Implement a SKIP-LOCKED queue worker that processes `articles` with `processing_status='pending'`. Pass 0: call cheap LLM with title+snippet, get `{relevant: bool, candidate_event_types: [...]}`. Mark irrelevant articles as 'skipped'. Pass 1: for relevant articles, call cheap LLM / NER model to extract company surface forms and char spans. Write to `company_mentions`. Log all token usage and cost to `pipeline_runs`."

**Step 8 — Structured extraction**
"Implement Passes 3–5 for resolved articles. Use native structured output (function calling) against the §7.2 Pydantic payload schemas. Require `evidence_quote` for every value — reject outputs missing it. Implement deterministic Korean amount normalization per Appendix B and validate against `value_numeric`. Enforce business rules. Write to `event_assertions` and `fact_assertions` with model/prompt versioning. Add a golden-eval harness that runs against a hand-labeled test set and reports precision/recall per event type."

**Step 9 — Materialization**
"Implement a Dagster asset that aggregates `event_assertions` into `events`: cluster by company_id + event_type + date proximity (±14 days, adjusted for date_precision) + payload compatibility. One cluster = one `events` row. Write `event_assertion_links`. Produce `fact_assertions` from event payloads and standalone extractions. Apply history logic: close prior `facts` rows (valid_to, is_current=false) when new values supersede; set has_conflict=true when concurrent assertions disagree."

**Step 10 — Confidence scoring**
"Implement the §11 deterministic confidence function in Python. Inputs: list of fact_assertion rows, their source rows, and the dedup_cluster_id for each. Steps: (1) compute per-assertion weight w_i = r_i · ρ(Δt_i) · q_i; (2) collapse syndicated assertions by cluster (keep max weight); (3) cluster by value; (4) compute W_agree, W_total, Corroboration, Agreement, Official_boost; (5) Confidence = min(0.99, Corrob · A · B). Write scalar + factors JSONB to `events.confidence` and `facts.confidence`. Add a Brier-score calibration script that reads the labeled fact set and reports miscalibration."

**Step 11 — Search**
"Stand up Meilisearch (Docker or managed). Build two indices: `companies` (canonical_name_ko, canonical_name_en, aliases, sector) and `articles` (title, snippet, company names, event_type, published_at, facets). Write-through sync: after each materialization, push changed documents to Meilisearch. Add a nightly reconcile Dagster asset that compares doc counts and re-syncs drift. Add a pgvector cosine endpoint for 'companies like this'."

**Step 12 — API**
"Implement all §14 FastAPI endpoints. Priority: `/facts/{id}/sources` and `/events/{id}/sources` — these must return the full chain (fact → fact_assertion_links → fact_assertions → articles → sources) in a single response, joinable and fast. Add Supabase Auth JWT validation. Implement Row-Level Security so watchlists and alerts are user-scoped. Add a Pydantic response model for every endpoint."

**Step 13 — Dashboard**
"Build Next.js pages: (1) Search — instant search against Meilisearch, company hits with sector badges. (2) Company profile — header with verified badge, current facts with confidence chips (click → source drill-down modal). (3) Event timeline — chronological events with confidence, source count badges, expandable source list. (4) Source drill-down — calls `/facts/{id}/sources`, shows each supporting article with publication, excerpt, confidence contribution. (5) Watchlists — add/remove companies, list watched companies with latest event. Use TanStack Query for data fetching and caching."

**Step 14 — Alerts**
"Add a Dagster sensor that fires after each materialization. For each new `events` row: find all `watchlist_companies` entries for that company, write `alerts` rows, send email via Resend or Postmark. Deduplicate: one alert per user per event_id. Build the `/alerts` view in Next.js."

**Step 15 — Hardening**
"Add Sentry (FastAPI + Next.js). Add a cost dashboard page over `pipeline_runs` (daily spend by stage, model, tokens). Schedule the Brier-score calibration job as a weekly Dagster asset. Add a daily Dagster asset that verifies Meilisearch doc-count parity vs Postgres and pages on drift > 1%. Add structured logging to all pipeline workers."

---

## 16. Roadmap

### 16.1 MVP milestones

| Milestone | Week | Demoable artifact |
|---|---|---|
| 0 — Foundation | 1 | Repo, schema, Supabase, Dagster skeleton, source registry |
| 1 — Ingestion + dedup | 1–2 | "N deduped Korean articles flowing in daily" |
| 2 — Registry + resolution | 2–3 | Company search over DART-seeded registry; review queue |
| 3 — Extraction | 3–4 | Structured events/facts from live articles; eval harness |
| 4 — Materialization + confidence | 4–5 | Events with confidence chips; source drill-down works |
| 5 — Search + API | 5–6 | Full API including `/sources`; Meilisearch live |
| 6 — Dashboard | 6–7 | Search → profile → timeline → fact drill-down → watchlist |
| 7 — Alerts + hardening | 7–8 | Email alerts; cost dashboard; Brier-score tracking |

**MVP definition:** a user can search a Korean company, see its event timeline and structured facts with per-fact confidence scores, click any fact to see the exact source articles that produced it, add the company to a watchlist, and receive an email when something new happens.

### 16.2 Phase 2 (post-MVP, ordered by leverage)

- **DART integration:** structured filings as Tier-0 assertions. Hard cross-check on extracted facts. Dramatically raises confidence on KOSDAQ/KOSPI companies.
- **Search upgrade:** OpenSearch + Nori morphological analyzer for Korean relevance quality (trigger: measured user complaints, not schedule).
- **More sources:** job postings (employee-count signal), company press releases, KRX disclosures, KIPRIS patents.
- **Relationship graph surfacing:** render investor networks, co-investment graphs, acquisition trees from the `relationships` table.
- **Predictive signals:** "likely to raise soon" from event cadence + hiring velocity + coverage volume.
- **Confidence v2:** learned calibration on top of deterministic factors; per-source learned reputation weights.
- **Entity resolution v2:** active-learning loop that converts review-queue decisions into training data for a better matcher.
- **English UI + API product:** cross-border investor access; potential revenue stream.

---

## 17. Risk Register

| Risk | Severity | Mitigation | Early warning signal |
|---|---|---|---|
| **Entity-resolution false merge** | Critical | DART corp_code anchoring; conservative thresholds; bias toward review queue; monthly merge audits | Two companies' event timelines look implausibly merged; sudden confidence spike on an unrelated event type |
| **LLM hallucinated amounts/dates** | High | Mandatory evidence_quote; deterministic re-derivation from raw_value; business-rule validation; golden eval gating | Normalization-mismatch rate rising; eval precision dropping |
| **Naver API: snippets only, ToS on full bodies** | High | Build on snippets + structured facts + deep-links; never reproduce article prose; full-body as separate, compliant enrichment | Legal review flag; ToS change notification |
| **Confidence miscalibration** | High | Labeled calibration set; weekly Brier-score tracking; periodic recompute (cheap, derived) | Facts rated 90% being wrong at >15% rate on labeled set |
| **LLM cost blowup** | High | Aggressive triage (~85% kill rate); Batch API + prompt caching; per-day spend ceiling; token logging | Daily cost spike in `pipeline_runs`; triage relevant-% unexpectedly rising |
| **Korean normalization bugs** (억/조/만 errors, date precision) | Medium | Deterministic normalization table (Appendix B); raw_value stored for audit; business-rule bounds checking | Normalization-mismatch rate; absurd amount values in DB |
| **Syndication inflating confidence** | Medium | Dedup cluster before counting independent sources; spot-check high-confidence facts | Facts from press-release cycles rated implausibly high |
| **Meilisearch / DB index drift** | Low | Write-through sync; nightly parity check; monitoring alert on drift > 1% | Doc count divergence in reconcile job |

---

## Appendix A — Opinionated Departures

These decisions differ from the obvious first choice. They are the right calls; override only with a clear reason.

**Assertion-log as system of record** (vs. writing facts directly): makes traceability, confidence, conflict-handling, and history structural rather than bolted-on. Every downstream product promise falls out of the model.

**Postgres + Meilisearch only** (vs. Neo4j, OpenSearch, Redis, Kafka): the simplest configuration that preserves future flexibility. Knowing when to defer these tools is a more impressive engineering judgment than having added them preemptively.

**DART corp_code as resolution anchor** (vs. open-world clustering): turns the hardest problem (entity resolution) from open-world ambiguity into closed-world matching against a known universe. Highest single reliability lever in the system.

**Deterministic confidence with 0.99 cap** (vs. LLM-generated confidence): LLM confidence is uncalibrated and unauditable. Ours is a measurable, tunable, explainable function. The 0.99 cap enforces epistemic humility — the product never claims certainty.

**Resolution before extraction in build order** (vs. extraction first): extraction without resolution produces orphan assertions. Fixing resolution retroactively requires re-linking thousands of assertions. Do it right once, in order.

---

## Appendix B — Korean NLP Reference

### Amount normalization

Always normalize Korean currency amounts to KRW integers before storage. Apply deterministically *before* trusting the LLM's `value_numeric`; re-derive from `raw_value` as a validation check.

| Korean unit | Multiplier | Example |
|---|---|---|
| 만 (man) | 10^4 | 5만 = 50,000 |
| 억 (eok) | 10^8 | 500억 = 50,000,000,000 |
| 조 (jo) | 10^12 | 1조 = 1,000,000,000,000 |

**Compound examples:**
- `500억원` = 500 × 10^8 = **50,000,000,000 KRW**
- `1조 2천억` = 1.2 × 10^12 = **1,200,000,000,000 KRW**
- `3조 5,000억` = 3.5 × 10^12 = **3,500,000,000,000 KRW**

Never store "500억" as a string in `value_numeric`. Always store the KRW integer.

**Edge cases to handle:**
- `약 500억` ("approximately 500 eok") → value_numeric = 50_000_000_000, extraction_quality = 0.7
- `수백억` ("hundreds of eok") → do not extract a numeric value; store in value_text
- USD/EUR amounts → convert to KRW at date-of-article exchange rate; flag unit as 'krw_converted'

### Legal suffix normalization

Strip before alias matching:

```
주식회사  →  (주)  →  ㈜  →  Inc.  →  Co., Ltd.  →  Corp.  →  LLC
```

Also strip: `그룹` (group), `홀딩스` (holdings), `코리아` (Korea) when used as disambiguators only.

### Common alias patterns

```
Brand name  ≠  legal entity name:
배달의민족  ↔  우아한형제들 (주)
쿠팡이츠   ↔  쿠팡 (parent)
카카오페이  ↔  카카오페이 (주) [separate listed entity]

Romanization variants (all valid aliases):
네이버   ↔  Naver  ↔  NAVER Corporation
카카오   ↔  Kakao  ↔  Kakao Corp.
컬리     ↔  Kurly  ↔  Kurly Inc.
토스     ↔  Toss   ↔  Viva Republica
크래프톤  ↔  Krafton
무신사   ↔  Musinsa
```

### Date precision handling

Korean news often gives coarse dates. Store precision explicitly — never fabricate day from month:

| Korean phrase | `occurred_on` | `date_precision` |
|---|---|---|
| "3월 4일 발표" | 2026-03-04 | day |
| "3월 중" / "3월에" | 2026-03-01 | month |
| "1분기" / "Q1" | 2026-01-01 | quarter |
| "올해" / "2026년" | 2026-01-01 | year |
| "최근" / "곧" | null | unknown |

---

## Appendix C — Source Reputation Registry

Seed this into the `sources` table. Tier and weight determine confidence contributions.

| domain | name | tier | weight | is_official |
|---|---|---|---|---|
| dart.fss.or.kr | DART 전자공시 | 0 | 1.00 | true |
| kind.krx.co.kr | KRX 공시 | 0 | 1.00 | true |
| thebell.co.kr | 더벨 | 1 | 0.85 | false |
| hankyung.com | 한국경제 | 1 | 0.85 | false |
| mk.co.kr | 매일경제 | 1 | 0.85 | false |
| etnews.com | 전자신문 | 1 | 0.85 | false |
| mt.co.kr | 머니투데이 | 1 | 0.85 | false |
| edaily.co.kr | 이데일리 | 1 | 0.80 | false |
| zdnet.co.kr | ZDNet Korea | 1 | 0.80 | false |
| bloter.net | 블로터 | 2 | 0.65 | false |
| platum.kr | 플래텀 | 2 | 0.60 | false |
| venturesquare.net | 벤처스퀘어 | 2 | 0.60 | false |
| outstanding.kr | 아웃스탠딩 | 2 | 0.60 | false |
| startuprecipe.co.kr | 스타트업레시피 | 2 | 0.55 | false |
| *(unknown / aggregator)* | — | 3 | 0.30 | false |

---

## Appendix D — Confidence Formula Constants

All tunable parameters in one place. When recalibrating against the labeled set, adjust these values here and recompute derived `confidence` rows.

```python
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

# Recency half-lives by fact type (days)
HALF_LIVES = {
    "valuation":       180,
    "funding_amount":  None,   # point-in-time; no decay
    "total_raised":    365,
    "employee_count":  365,
    "revenue":         365,
    "ipo_target_date": 90,
    "headquarters":    730,
    "founded_year":    None,   # immutable; no decay
}

# Dedup clustering thresholds
SIMHASH_HAMMING_THRESHOLD = 3    # ≤ 3 bits different = near-duplicate
EMBEDDING_COSINE_THRESHOLD = 0.92  # ≥ 0.92 cosine = same story

# Entity resolution auto-merge threshold
RESOLUTION_AUTO_MERGE_THRESHOLD = 0.92  # below this → review queue
RESOLUTION_REVIEW_THRESHOLD = 0.75      # below this → unmatched
```