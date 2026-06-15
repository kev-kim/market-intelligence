"""Create resolution_queue table for entity resolution review

Revision ID: 0007
Revises: 0006
Create Date: 2026-06-15

"""
from alembic import op

revision = "0007"
down_revision = "0006"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("""
        CREATE TABLE resolution_queue (
            id                  BIGSERIAL PRIMARY KEY,
            company_mention_id  BIGINT NOT NULL REFERENCES company_mentions(id),
            candidates          JSONB NOT NULL,
            top_score           NUMERIC(4,3),
            status              TEXT NOT NULL DEFAULT 'open',
            resolved_company_id BIGINT REFERENCES companies(id),
            created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
        )
    """)


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS resolution_queue")
