from dagster import Definitions

from market_intelligence_pipeline.assets import placeholder_asset

defs = Definitions(
    assets=[placeholder_asset],
)
