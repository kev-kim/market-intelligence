"""
Stage 3 — Deduplication.

Two-pass strategy (§9, Stage 3):
  Pass A — Lexical: 64-bit SimHash over title+snippet; Hamming distance ≤ 3 on same-day articles.
  Pass B — Semantic: text-embedding-3-large cosine similarity ≥ 0.92 across ±3-day window.

Over-merge is the critical failure mode (two distinct stories collapsed into one cluster).
Bias thresholds toward under-merge: SIMHASH_HAMMING_THRESHOLD=3, EMBEDDING_COSINE_THRESHOLD=0.92.
"""
import ctypes
import math
import os
import re
import time
from typing import Any

import psycopg
import psycopg.rows
from dagster import MetadataValue, Output, asset
from openai import OpenAI
from pgvector.psycopg import register_vector
from simhash import Simhash

from market_intelligence_pipeline.assets.ingest_naver import ingest_naver_news
from market_intelligence_pipeline.helpers.llm import log_llm_call
from market_intelligence_pipeline.utils.constants import (
    EMBEDDING_COSINE_THRESHOLD,
    SIMHASH_HAMMING_THRESHOLD,
)
from market_intelligence_pipeline.utils.db import get_db_url

# ─── SimHash helpers ──────────────────────────────────────────────────────────

_NGRAM_WIDTH = 3


def _char_ngrams(text: str, width: int = _NGRAM_WIDTH) -> list[str]:
    """
    Character n-grams for SimHash.

    Normalize aggressively before shingling so that reprints with minor
    punctuation/formatting differences (commas, brackets, ellipsis, [단독])
    hash nearly identically.
    """
    text = (text or "").lower()
    text = re.sub(r"[^\w\s]", "", text)   # strip punctuation; keeps Korean chars
    text = re.sub(r"\s+", " ", text).strip()
    if len(text) < width:
        return [text] if text else [""]
    return [text[i : i + width] for i in range(len(text) - width + 1)]


def compute_simhash(text: str) -> int:
    """Return unsigned 64-bit SimHash integer."""
    return Simhash(_char_ngrams(text)).value


def _to_signed_int64(n: int) -> int:
    """Convert unsigned 64-bit int → signed BIGINT for PostgreSQL storage."""
    return ctypes.c_int64(n).value


def _simhash_distance(h1: int, h2: int) -> int:
    """Hamming distance between two SimHash values (handles signed or unsigned)."""
    return bin((h1 & 0xFFFFFFFFFFFFFFFF) ^ (h2 & 0xFFFFFFFFFFFFFFFF)).count("1")


# ─── Cosine similarity (pure Python — no numpy dependency in tests) ───────────


def _cosine_sim(v1: list[float], v2) -> float:
    """Cosine similarity between two vectors. v2 may be a numpy array."""
    dot = sum(float(a) * float(b) for a, b in zip(v1, v2))
    norm1 = math.sqrt(sum(float(a) ** 2 for a in v1))
    norm2 = math.sqrt(sum(float(b) ** 2 for b in v2))
    if norm1 == 0 or norm2 == 0:
        return 0.0
    return dot / (norm1 * norm2)


# ─── Pure cluster-matching logic (no DB — testable in isolation) ───────────────


def select_best_cluster(
    art_simhash: int | None,
    art_embedding: list[float] | None,
    art_date,
    candidates: list[dict],
    simhash_threshold: int = SIMHASH_HAMMING_THRESHOLD,
    cosine_threshold: float = EMBEDDING_COSINE_THRESHOLD,
) -> int | None:
    """
    Pick the best matching cluster from *candidates*.

    Each candidate must have keys: dedup_cluster_id, simhash, embedding, published_at.
    SimHash matching is restricted to same-day candidates (art_date must not be None).
    Returns cluster_id of best match, or None if no candidate meets either threshold.
    """
    best_cluster_id: int | None = None
    best_score: float = -1.0

    for row in candidates:
        cluster_id: int = row["dedup_cluster_id"]

        # SimHash — same calendar day only
        if (
            art_simhash is not None
            and row.get("simhash") is not None
            and art_date is not None
            and row.get("published_at") is not None
        ):
            if art_date.date() == row["published_at"].date():
                dist = _simhash_distance(art_simhash, row["simhash"])
                if dist <= simhash_threshold:
                    score = 1.0 - dist / 64.0
                    if score > best_score:
                        best_score = score
                        best_cluster_id = cluster_id

        # Cosine similarity — no date restriction
        if art_embedding is not None and row.get("embedding") is not None:
            sim = _cosine_sim(art_embedding, row["embedding"])
            if sim >= cosine_threshold and sim > best_score:
                best_score = sim
                best_cluster_id = cluster_id

    return best_cluster_id


# ─── Embedding helpers ────────────────────────────────────────────────────────

_EMBED_MODEL = "text-embedding-3-large"
_EMBED_DIMS = 1536
_EMBED_COST_PER_1M = 0.13  # USD as of 2026-06
_BATCH_SIZE = 100


def _embed_texts(
    texts: list[str],
    client: OpenAI,
    *,
    stage: str,
    article_ids: list[int],
) -> tuple[list[list[float]], int, float]:
    """
    Call OpenAI embeddings API for one batch; log cost to pipeline_runs.

    Returns (embeddings, total_tokens, cost_usd).
    """
    t0 = time.monotonic()
    try:
        response = client.embeddings.create(
            model=_EMBED_MODEL,
            input=texts,
            dimensions=_EMBED_DIMS,
        )
    except Exception as exc:
        log_llm_call(
            stage=stage,
            model_name=_EMBED_MODEL,
            input_tokens=0,
            output_tokens=0,
            cost_usd=0.0,
            status="failed",
            error=str(exc),
            duration_ms=int((time.monotonic() - t0) * 1000),
        )
        raise

    total_tokens = response.usage.total_tokens
    cost_usd = total_tokens * _EMBED_COST_PER_1M / 1_000_000
    duration_ms = int((time.monotonic() - t0) * 1000)

    log_llm_call(
        stage=stage,
        model_name=_EMBED_MODEL,
        input_tokens=total_tokens,
        output_tokens=0,
        cost_usd=cost_usd,
        status="ok",
        duration_ms=duration_ms,
    )

    return [e.embedding for e in response.data], total_tokens, cost_usd


# ─── Asset ────────────────────────────────────────────────────────────────────


@asset(
    group_name="ingestion",
    deps=[ingest_naver_news],
    description=(
        "Compute SimHash + text-embedding-3-large for new articles; "
        "cluster near-duplicates into article_dedup_clusters."
    ),
)
def dedup_articles(context) -> Output[None]:
    db_url = get_db_url()
    openai_client = OpenAI(api_key=os.environ["OPENAI_API_KEY"])

    # ── Pass 1: compute SimHash for articles that don't have one yet ──────────
    with psycopg.connect(db_url) as conn:
        with conn.cursor(row_factory=psycopg.rows.dict_row) as cur:
            cur.execute(
                "SELECT id, title, snippet FROM articles WHERE simhash IS NULL ORDER BY id"
            )
            needs_simhash: list[dict[str, Any]] = cur.fetchall()

    context.log.info(f"SimHash: {len(needs_simhash)} articles to process")

    if needs_simhash:
        with psycopg.connect(db_url) as conn:
            with conn.cursor() as cur:
                for row in needs_simhash:
                    text = (row["title"] or "") + " " + (row["snippet"] or "")
                    sh_signed = _to_signed_int64(compute_simhash(text))
                    cur.execute(
                        "UPDATE articles SET simhash = %s WHERE id = %s",
                        (sh_signed, row["id"]),
                    )
            conn.commit()

    # ── Pass 2: compute embeddings in batches of 100 ──────────────────────────
    with psycopg.connect(db_url) as conn:
        with conn.cursor(row_factory=psycopg.rows.dict_row) as cur:
            cur.execute(
                "SELECT id, title, snippet FROM articles WHERE embedding IS NULL ORDER BY id"
            )
            needs_embedding: list[dict[str, Any]] = cur.fetchall()

    context.log.info(f"Embedding: {len(needs_embedding)} articles to embed")

    total_tokens = 0
    total_cost = 0.0
    embedded_count = 0

    for batch_start in range(0, len(needs_embedding), _BATCH_SIZE):
        batch = needs_embedding[batch_start : batch_start + _BATCH_SIZE]
        texts = [
            ((row["title"] or "") + " " + (row["snippet"] or "")).strip()
            for row in batch
        ]
        article_ids = [row["id"] for row in batch]

        embeddings, batch_tokens, batch_cost = _embed_texts(
            texts,
            openai_client,
            stage="embed",
            article_ids=article_ids,
        )
        total_tokens += batch_tokens
        total_cost += batch_cost

        with psycopg.connect(db_url) as conn:
            register_vector(conn)
            with conn.cursor() as cur:
                for row, emb in zip(batch, embeddings):
                    cur.execute(
                        "UPDATE articles SET embedding = %s WHERE id = %s",
                        (emb, row["id"]),
                    )
            conn.commit()

        embedded_count += len(batch)
        batch_num = batch_start // _BATCH_SIZE + 1
        total_batches = (len(needs_embedding) + _BATCH_SIZE - 1) // _BATCH_SIZE
        context.log.info(
            f"Embedded batch {batch_num}/{total_batches} ({embedded_count} articles so far)"
        )

    # ── Pass 3: clustering ────────────────────────────────────────────────────
    # Process in ascending id order so earlier articles' clusters are visible
    # to later ones within the same run.
    with psycopg.connect(db_url) as conn:
        register_vector(conn)
        with conn.cursor(row_factory=psycopg.rows.dict_row) as cur:
            cur.execute(
                """
                SELECT id, published_at, simhash, embedding
                FROM articles
                WHERE dedup_cluster_id IS NULL
                  AND simhash IS NOT NULL
                  AND embedding IS NOT NULL
                ORDER BY id
                """
            )
            unclustered: list[dict[str, Any]] = cur.fetchall()

    context.log.info(f"Clustering: {len(unclustered)} unclustered articles")

    clusters_created = 0
    clusters_joined = 0

    for article in unclustered:
        art_id: int = article["id"]
        art_simhash: int | None = article["simhash"]
        art_embedding: Any = article["embedding"]
        pub_date = article["published_at"]

        with psycopg.connect(db_url) as conn:
            register_vector(conn)

            # Fetch candidates: SimHash same-day + cosine ±3-day window
            candidates: list[dict[str, Any]] = []

            if art_simhash is not None and pub_date is not None:
                with conn.cursor(row_factory=psycopg.rows.dict_row) as cur:
                    cur.execute(
                        """
                        SELECT id, dedup_cluster_id, simhash, embedding, published_at
                        FROM articles
                        WHERE published_at::date = %s::date
                          AND simhash IS NOT NULL
                          AND id != %s
                          AND dedup_cluster_id IS NOT NULL
                        """,
                        (pub_date, art_id),
                    )
                    candidates.extend(cur.fetchall())

            # For cosine candidates, query pgvector within ±3 days
            if art_embedding is not None and pub_date is not None:
                with conn.cursor(row_factory=psycopg.rows.dict_row) as cur:
                    cur.execute(
                        """
                        SELECT a.id,
                               a.dedup_cluster_id,
                               a.simhash,
                               a.embedding,
                               a.published_at
                        FROM articles a
                        WHERE a.embedding IS NOT NULL
                          AND a.id != %s
                          AND a.dedup_cluster_id IS NOT NULL
                          AND a.published_at BETWEEN %s::date - INTERVAL '3 days'
                                                 AND %s::date + INTERVAL '3 days'
                          AND (1 - (a.embedding <=> %s)) >= %s
                        ORDER BY a.embedding <=> %s
                        LIMIT 10
                        """,
                        (art_id, pub_date, pub_date, art_embedding,
                         EMBEDDING_COSINE_THRESHOLD, art_embedding),
                    )
                    for row in cur.fetchall():
                        # Avoid duplicates if already added by SimHash pass
                        if not any(c["id"] == row["id"] for c in candidates):
                            candidates.append(row)

            best_cluster_id = select_best_cluster(
                art_simhash,
                list(art_embedding) if art_embedding is not None else None,
                pub_date,
                candidates,
            )

            with conn.cursor() as cur:
                if best_cluster_id is not None:
                    cur.execute(
                        "UPDATE articles SET dedup_cluster_id = %s WHERE id = %s",
                        (best_cluster_id, art_id),
                    )
                    cur.execute(
                        """
                        UPDATE article_dedup_clusters
                        SET member_count = member_count + 1
                        WHERE id = %s
                        """,
                        (best_cluster_id,),
                    )
                    clusters_joined += 1
                else:
                    cur.execute(
                        """
                        INSERT INTO article_dedup_clusters
                            (canonical_article_id, member_count)
                        VALUES (%s, 1)
                        RETURNING id
                        """,
                        (art_id,),
                    )
                    new_cluster_id: int = cur.fetchone()[0]  # type: ignore[index]
                    cur.execute(
                        "UPDATE articles SET dedup_cluster_id = %s WHERE id = %s",
                        (new_cluster_id, art_id),
                    )
                    clusters_created += 1

            conn.commit()

    context.log.info(
        f"Clustering done: {clusters_created} new clusters, "
        f"{clusters_joined} articles joined existing clusters"
    )

    return Output(
        value=None,
        metadata={
            "simhash_computed": MetadataValue.int(len(needs_simhash)),
            "embeddings_computed": MetadataValue.int(embedded_count),
            "embedding_tokens": MetadataValue.int(total_tokens),
            "embedding_cost_usd": MetadataValue.float(round(total_cost, 6)),
            "clusters_created": MetadataValue.int(clusters_created),
            "clusters_joined": MetadataValue.int(clusters_joined),
            "simhash_hamming_threshold": MetadataValue.int(SIMHASH_HAMMING_THRESHOLD),
            "cosine_threshold": MetadataValue.float(EMBEDDING_COSINE_THRESHOLD),
        },
    )
