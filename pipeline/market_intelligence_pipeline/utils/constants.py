"""
Re-export every confidence constant from the canonical config/confidence.py.

All pipeline code should import from here, not from config/ directly, so that
the sys.path manipulation stays in one place and all other modules stay clean.
"""
from __future__ import annotations

import os
import sys

_REPO_ROOT = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "../../../")
)
if _REPO_ROOT not in sys.path:
    sys.path.insert(0, _REPO_ROOT)

from config.confidence import (  # noqa: E402
    CONFIDENCE_CAP,
    EMBEDDING_COSINE_THRESHOLD,
    EXTRACTION_QUALITY,
    HALF_LIVES,
    K_CORROB,
    OFFICIAL_BOOST,
    RESOLUTION_AUTO_MERGE_THRESHOLD,
    RESOLUTION_REVIEW_THRESHOLD,
    SIMHASH_HAMMING_THRESHOLD,
    TIER_WEIGHTS,
)

__all__ = [
    "CONFIDENCE_CAP",
    "EMBEDDING_COSINE_THRESHOLD",
    "EXTRACTION_QUALITY",
    "HALF_LIVES",
    "K_CORROB",
    "OFFICIAL_BOOST",
    "RESOLUTION_AUTO_MERGE_THRESHOLD",
    "RESOLUTION_REVIEW_THRESHOLD",
    "SIMHASH_HAMMING_THRESHOLD",
    "TIER_WEIGHTS",
]
