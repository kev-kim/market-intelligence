"""
Stage 1+2 — Ingest Naver News API and persist to articles.

Critical constraints (§5):
- API returns title + snippet + link only — no full body.
- ~25,000 calls/day quota; we paginate politely and track in pipeline_runs.
- Store extracted facts and deep-links only; never reproduce article prose.
"""
import hashlib
import html
import os
import re
import time
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from typing import Any
from urllib.parse import urlparse

import httpx
import psycopg
import yaml
from dagster import MetadataValue, Output, asset

from market_intelligence_pipeline.helpers.llm import log_llm_call
from market_intelligence_pipeline.utils.db import get_db_url
from market_intelligence_pipeline.utils.url import canonicalize_url  # noqa: F401 (re-exported)


def extract_domain(url: str) -> str:
    """Return bare domain (no www/m/news prefix) from a canonical URL."""
    try:
        netloc = urlparse(url).netloc.lower()
        for prefix in ("www.", "m.", "news.", "mobile.", "amp."):
            if netloc.startswith(prefix):
                netloc = netloc[len(prefix) :]
        return netloc
    except Exception:
        return ""


# ─── Text helpers ─────────────────────────────────────────────────────────────


def _clean_naver_text(text: str) -> str:
    """Strip <b>...</b> tags and HTML entities that Naver injects into titles."""
    text = html.unescape(text or "")
    return re.sub(r"<[^>]+>", "", text).strip()


def _content_hash(title: str, snippet: str | None) -> str:
    return hashlib.sha256((title + (snippet or "")).encode("utf-8")).hexdigest()


def _parse_pub_date(date_str: str | None) -> datetime | None:
    if not date_str:
        return None
    try:
        return parsedate_to_datetime(date_str).astimezone(timezone.utc)
    except Exception:
        return None


# ─── Naver API ────────────────────────────────────────────────────────────────

_NAVER_URL = "https://openapi.naver.com/v1/search/news.json"


def _fetch_naver_page(
    query: str,
    *,
    display: int,
    start: int,
    client_id: str,
    client_secret: str,
) -> dict[str, Any]:
    r = httpx.get(
        _NAVER_URL,
        headers={
            "X-Naver-Client-Id": client_id,
            "X-Naver-Client-Secret": client_secret,
        },
        params={"query": query, "display": display, "start": start, "sort": "date"},
        timeout=30,
    )
    r.raise_for_status()
    return r.json()


# ─── Asset ────────────────────────────────────────────────────────────────────

_CONFIG_PATH = os.path.join(os.path.dirname(__file__), "../../config/queries.yaml")


@asset(
    group_name="ingestion",
    description=(
        "Fetch Korean business news from Naver News Search API "
        "and persist to articles (ON CONFLICT url_canonical DO NOTHING)."
    ),
)
def ingest_naver_news(context) -> Output[None]:
    client_id = os.environ["NAVER_CLIENT_ID"]
    client_secret = os.environ["NAVER_CLIENT_SECRET"]

    with open(_CONFIG_PATH) as f:
        cfg: dict[str, Any] = yaml.safe_load(f)

    max_pages: int = int(cfg.get("max_pages_per_query", 3))
    display_per_page = 100

    queries: list[dict[str, str]] = [
        {"label": item["label"], "query": item["query"]}
        for item in cfg.get("companies", [])
    ] + [
        {"label": kw, "query": kw}
        for kw in cfg.get("keywords", [])
    ]

    context.log.info(
        f"Running {len(queries)} queries × {max_pages} pages "
        f"(max {len(queries) * max_pages * display_per_page} items)"
    )

    db_url = get_db_url()
    inserted = skipped = api_calls = null_pubdate = 0

    with psycopg.connect(db_url) as conn:
        # Cache sources table once: domain → id
        with conn.cursor() as cur:
            cur.execute("SELECT domain, id FROM sources")
            sources_by_domain: dict[str, int] = dict(cur.fetchall())

        for q in queries:
            for page in range(max_pages):
                start_idx = page * display_per_page + 1
                try:
                    data = _fetch_naver_page(
                        q["query"],
                        display=display_per_page,
                        start=start_idx,
                        client_id=client_id,
                        client_secret=client_secret,
                    )
                    api_calls += 1
                except httpx.HTTPStatusError as exc:
                    context.log.warning(
                        f"HTTP {exc.response.status_code} for {q['label']!r} "
                        f"page {page + 1}: {exc}"
                    )
                    if exc.response.status_code == 429:
                        time.sleep(2)
                    break
                except Exception as exc:
                    context.log.warning(f"Request failed for {q['label']!r}: {exc}")
                    break

                items = data.get("items", [])
                if not items:
                    break

                for item in items:
                    raw_title = _clean_naver_text(item.get("title", ""))
                    raw_snippet = _clean_naver_text(item.get("description", ""))
                    raw_url = (item.get("link") or item.get("originallink") or "").strip()

                    if not raw_url or not raw_title:
                        skipped += 1
                        continue

                    url_canonical = canonicalize_url(raw_url)
                    domain = extract_domain(url_canonical)
                    source_id: int | None = None
                    for candidate_domain in (domain, f"www.{domain}"):
                        if candidate_domain in sources_by_domain:
                            source_id = sources_by_domain[candidate_domain]
                            break

                    pub_date = _parse_pub_date(item.get("pubDate"))
                    if pub_date is None:
                        null_pubdate += 1

                    with conn.cursor() as cur:
                        cur.execute(
                            """
                            INSERT INTO articles
                                (source_id, url, url_canonical, title, snippet,
                                 published_at, language, content_hash, processing_status)
                            VALUES (%s, %s, %s, %s, %s, %s, 'ko', %s, 'pending')
                            ON CONFLICT (url_canonical) DO NOTHING
                            """,
                            (
                                source_id,
                                raw_url,
                                url_canonical,
                                raw_title,
                                raw_snippet or None,
                                pub_date,
                                _content_hash(raw_title, raw_snippet),
                            ),
                        )
                        if cur.rowcount > 0:
                            inserted += 1
                        else:
                            skipped += 1
                    conn.commit()

                # Fewer items than requested → we've exhausted this query
                if len(items) < display_per_page:
                    break

                time.sleep(0.05)  # polite pacing

    log_llm_call(
        stage="ingest_naver",
        model_name="naver-news-api",
        input_tokens=0,
        output_tokens=0,
        cost_usd=0.0,
        status="ok",
    )

    context.log.info(
        f"Done: {inserted} inserted, {skipped} skipped/duplicate, "
        f"{api_calls} API calls, {null_pubdate} null pubdates"
    )

    return Output(
        value=None,
        metadata={
            "articles_inserted": MetadataValue.int(inserted),
            "articles_skipped_duplicate": MetadataValue.int(skipped),
            "api_calls": MetadataValue.int(api_calls),
            "null_pubdate_count": MetadataValue.int(null_pubdate),
            "queries_run": MetadataValue.int(len(queries)),
        },
    )
