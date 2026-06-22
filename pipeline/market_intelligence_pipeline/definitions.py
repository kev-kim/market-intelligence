from dagster import Definitions

from market_intelligence_pipeline.assets import (
    dedup_articles,
    ingest_naver_news,
    placeholder_asset,
)

defs = Definitions(
    assets=[placeholder_asset, ingest_naver_news, dedup_articles],
)
