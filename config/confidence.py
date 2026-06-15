# Confidence formula constants — canonical source. When tuning calibration,
# change values here; recompute derived confidence rows from assertions.

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
