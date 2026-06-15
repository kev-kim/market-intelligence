"""Create pipeline_runs table for LLM cost accounting

Revision ID: 0008
Revises: 0007
Create Date: 2026-06-15

"""
from alembic import op

revision = "0008"
down_revision = "0007"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("""
        CREATE TABLE pipeline_runs (
            id            BIGSERIAL PRIMARY KEY,
            stage         TEXT NOT NULL,
            article_id    BIGINT,
            model_name    TEXT,
            input_tokens  INT,
            output_tokens INT,
            cost_usd      NUMERIC(10,6),
            status        TEXT NOT NULL,
            error         TEXT,
            duration_ms   INT,
            created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
        )
    """)


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS pipeline_runs")
