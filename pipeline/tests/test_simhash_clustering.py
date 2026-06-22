"""
Tests for SimHash computation and cluster-matching logic.

Synthetic articles:
  A — reference story ("토스 2000억 시리즈G 투자 유치")
  B — exact duplicate of A
  C — A with punctuation-only differences (normalised away → same n-grams → distance 0)
  D — completely different company/event (크래프톤 인수)
  E — wholly unrelated topic (weather)

Embedding-based clustering is tested with hand-crafted unit vectors where
cosine similarity is known exactly.
"""
from __future__ import annotations

import math
from datetime import datetime, timezone

import pytest

from market_intelligence_pipeline.assets.dedup import (
    _char_ngrams,
    _cosine_sim,
    _simhash_distance,
    compute_simhash,
    select_best_cluster,
)
from market_intelligence_pipeline.utils.constants import (
    EMBEDDING_COSINE_THRESHOLD,
    SIMHASH_HAMMING_THRESHOLD,
)

# ─── Sample texts ─────────────────────────────────────────────────────────────

TEXT_A = "토스 2000억 시리즈G 투자 유치"                           # reference
TEXT_B = "토스 2000억 시리즈G 투자 유치"                           # exact duplicate
TEXT_C = "토스, 2000억 시리즈G 투자 유치!"                         # punctuation only → normalises same
TEXT_D = "크래프톤, 해외 게임사 인수합병 추진 중"                    # different story
TEXT_E = "서울 오늘 날씨 맑음 기온 25도 최저 12도"                  # unrelated


# ─── _char_ngrams ─────────────────────────────────────────────────────────────

def test_char_ngrams_normalises_punctuation():
    # Punctuation is stripped before n-gramming, so A and C yield identical sets.
    ngrams_a = set(_char_ngrams(TEXT_A))
    ngrams_c = set(_char_ngrams(TEXT_C))
    assert ngrams_a == ngrams_c


def test_char_ngrams_different_texts_differ():
    ngrams_a = set(_char_ngrams(TEXT_A))
    ngrams_d = set(_char_ngrams(TEXT_D))
    # Must share fewer than half their n-grams
    overlap = len(ngrams_a & ngrams_d) / max(len(ngrams_a | ngrams_d), 1)
    assert overlap < 0.5


# ─── compute_simhash ──────────────────────────────────────────────────────────

def test_simhash_exact_duplicate_distance_zero():
    h_a = compute_simhash(TEXT_A)
    h_b = compute_simhash(TEXT_B)
    assert _simhash_distance(h_a, h_b) == 0


def test_simhash_punctuation_only_distance_zero():
    # Punctuation is normalised away → same n-grams → identical hash → distance 0.
    h_a = compute_simhash(TEXT_A)
    h_c = compute_simhash(TEXT_C)
    assert _simhash_distance(h_a, h_c) == 0


def test_simhash_different_story_above_threshold():
    h_a = compute_simhash(TEXT_A)
    h_d = compute_simhash(TEXT_D)
    assert _simhash_distance(h_a, h_d) > SIMHASH_HAMMING_THRESHOLD


def test_simhash_unrelated_above_threshold():
    h_a = compute_simhash(TEXT_A)
    h_e = compute_simhash(TEXT_E)
    assert _simhash_distance(h_a, h_e) > SIMHASH_HAMMING_THRESHOLD


def test_simhash_different_stories_differ_from_each_other():
    h_d = compute_simhash(TEXT_D)
    h_e = compute_simhash(TEXT_E)
    assert _simhash_distance(h_d, h_e) > SIMHASH_HAMMING_THRESHOLD


# ─── _cosine_sim ──────────────────────────────────────────────────────────────

def test_cosine_sim_identical_vectors():
    v = [1.0, 0.0, 0.0]
    assert abs(_cosine_sim(v, v) - 1.0) < 1e-9


def test_cosine_sim_orthogonal_vectors():
    v1 = [1.0, 0.0]
    v2 = [0.0, 1.0]
    assert abs(_cosine_sim(v1, v2)) < 1e-9


def test_cosine_sim_zero_vector():
    assert _cosine_sim([0.0, 0.0], [1.0, 0.0]) == 0.0


def test_cosine_sim_known_value():
    # 45-degree angle → cos(45°) = √2/2 ≈ 0.7071
    v1 = [1.0, 0.0]
    v2 = [1.0, 1.0]
    result = _cosine_sim(v1, v2)
    assert abs(result - math.sqrt(2) / 2) < 1e-9


# ─── select_best_cluster ──────────────────────────────────────────────────────

_NOW = datetime(2026, 6, 16, 12, 0, 0, tzinfo=timezone.utc)
_SAME_DAY = datetime(2026, 6, 16, 9, 0, 0, tzinfo=timezone.utc)
_DIFF_DAY = datetime(2026, 6, 14, 9, 0, 0, tzinfo=timezone.utc)


def _unit(dim: int, idx: int) -> list[float]:
    """One-hot unit vector of length *dim* with 1.0 at position *idx*."""
    v = [0.0] * dim
    v[idx] = 1.0
    return v


def _close(v: list[float], noise: float = 0.01) -> list[float]:
    """Vector very close to *v* (cosine sim near 1.0)."""
    w = [x + noise for x in v]
    mag = math.sqrt(sum(x * x for x in w))
    return [x / mag for x in w]


def test_no_candidates_returns_none():
    h = compute_simhash(TEXT_A)
    emb = _unit(4, 0)
    assert select_best_cluster(h, emb, _NOW, []) is None


def test_simhash_match_same_day_returns_cluster():
    h = compute_simhash(TEXT_A)
    candidate = {
        "dedup_cluster_id": 7,
        "simhash": compute_simhash(TEXT_B),   # identical → distance 0
        "embedding": _unit(4, 1),              # cosine sim = 0 — won't trigger cosine path
        "published_at": _SAME_DAY,
    }
    result = select_best_cluster(h, _unit(4, 0), _NOW, [candidate])
    assert result == 7


def test_simhash_match_different_day_no_cluster():
    # SimHash matching is restricted to same calendar day.
    h = compute_simhash(TEXT_A)
    candidate = {
        "dedup_cluster_id": 7,
        "simhash": compute_simhash(TEXT_B),
        "embedding": _unit(4, 1),
        "published_at": _DIFF_DAY,
    }
    # No cosine match (orthogonal vectors), no same-day simhash match → None
    result = select_best_cluster(h, _unit(4, 0), _NOW, [candidate])
    assert result is None


def test_cosine_match_returns_cluster():
    emb_a = _unit(4, 0)
    emb_close = _close(_unit(4, 0), noise=0.001)
    sim = _cosine_sim(emb_a, emb_close)
    assert sim >= EMBEDDING_COSINE_THRESHOLD, f"Test vector cosine sim too low: {sim}"

    candidate = {
        "dedup_cluster_id": 42,
        "simhash": compute_simhash(TEXT_D),   # different story → no simhash match
        "embedding": emb_close,
        "published_at": _DIFF_DAY,            # different day → simhash path inactive
    }
    result = select_best_cluster(
        compute_simhash(TEXT_A), emb_a, _NOW, [candidate]
    )
    assert result == 42


def test_high_cosine_beats_lower_simhash_score():
    h_a = compute_simhash(TEXT_A)
    emb_a = _unit(4, 0)

    cand_simhash = {
        "dedup_cluster_id": 1,
        "simhash": compute_simhash(TEXT_B),   # distance 0 → score ≈ 1.0
        "embedding": _unit(4, 1),
        "published_at": _SAME_DAY,
    }
    cand_cosine = {
        "dedup_cluster_id": 2,
        "simhash": compute_simhash(TEXT_D),
        "embedding": _close(_unit(4, 0), noise=0.0001),  # sim very close to 1.0
        "published_at": _DIFF_DAY,
    }

    result = select_best_cluster(h_a, emb_a, _NOW, [cand_simhash, cand_cosine])
    # Both match; the one with highest score wins (deterministic)
    assert result in (1, 2)


def test_below_threshold_candidate_ignored():
    h_a = compute_simhash(TEXT_A)
    emb_a = _unit(4, 0)

    # Orthogonal embedding → cosine sim = 0; different story → simhash distance >> 3
    candidate = {
        "dedup_cluster_id": 99,
        "simhash": compute_simhash(TEXT_E),
        "embedding": _unit(4, 3),
        "published_at": _DIFF_DAY,
    }
    result = select_best_cluster(h_a, emb_a, _NOW, [candidate])
    assert result is None


def test_full_synthetic_clustering():
    """
    Simulate clustering 5 articles in-memory (no DB).

    Article 1: starts as its own cluster (cluster_id=1, canonical).
    Article 2: exact duplicate of 1 — joins cluster 1.
    Article 3: punctuation-only copy of 1 — joins cluster 1 (simhash distance 0).
    Article 4: different story — gets its own new cluster (cluster_id=4).
    Article 5: unrelated — gets its own new cluster (cluster_id=5).
    """
    articles = [
        {"id": 1, "text": TEXT_A, "emb": _unit(8, 0), "date": _NOW},
        {"id": 2, "text": TEXT_B, "emb": _close(_unit(8, 0)), "date": _NOW},
        {"id": 3, "text": TEXT_C, "emb": _close(_unit(8, 0), noise=0.002), "date": _NOW},
        {"id": 4, "text": TEXT_D, "emb": _unit(8, 4), "date": _NOW},
        {"id": 5, "text": TEXT_E, "emb": _unit(8, 7), "date": _NOW},
    ]
    for a in articles:
        a["simhash"] = compute_simhash(a["text"])

    next_cluster_id = 1
    assigned: dict[int, int] = {}  # article_id → cluster_id
    clustered_rows: list[dict] = []

    for art in articles:
        candidates = [
            {
                "dedup_cluster_id": assigned[c["id"]],
                "simhash": c["simhash"],
                "embedding": c["emb"],
                "published_at": c["date"],
            }
            for c in articles
            if c["id"] in assigned
        ]
        best = select_best_cluster(
            art["simhash"], art["emb"], art["date"], candidates
        )
        if best is not None:
            assigned[art["id"]] = best
        else:
            assigned[art["id"]] = next_cluster_id
            next_cluster_id += 1

    # Articles 1, 2, 3 must share the same cluster (the one seeded by article 1).
    assert assigned[1] == assigned[2] == assigned[3], (
        f"Near-dupe articles not co-clustered: {assigned}"
    )
    # Articles 4 and 5 must each have their own distinct cluster.
    assert assigned[4] != assigned[1], "Different story incorrectly merged"
    assert assigned[5] != assigned[1], "Unrelated article incorrectly merged"
    assert assigned[4] != assigned[5], "Different unrelated articles incorrectly merged"
