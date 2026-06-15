from dagster import asset


@asset(
    group_name="placeholder",
    description="Placeholder asset — replace with real ingestion assets in Step 3.",
)
def placeholder_asset() -> None:
    """Confirms Dagster can load and materialize a basic asset."""
    pass
