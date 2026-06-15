"""Create event_assertions and fact_assertions tables (raw tier, immutable)

Revision ID: 0005
Revises: 0004
Create Date: 2026-06-15

"""
from alembic import op

revision = "0005"
down_revision = "0004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("""
        CREATE TABLE event_assertions (
            id                 BIGSERIAL PRIMARY KEY,
            article_id         BIGINT NOT NULL REFERENCES articles(id),
            company_mention_id BIGINT REFERENCES company_mentions(id),
            company_id         BIGINT REFERENCES companies(id),
            event_type         TEXT NOT NULL,
            payload            JSONB NOT NULL,
            occurred_on        DATE,
            date_precision     TEXT NOT NULL DEFAULT 'unknown',
            event_status       TEXT NOT NULL DEFAULT 'announced',
            evidence_quote     TEXT,
            model_name         TEXT NOT NULL,
            model_version      TEXT NOT NULL,
            prompt_version     TEXT NOT NULL,
            extraction_run_id  BIGINT,
            created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
        )
    """)

    op.execute(
        "CREATE INDEX idx_evassert_company ON event_assertions(company_id, event_type)"
    )

    op.execute("""
        CREATE TABLE fact_assertions (
            id                 BIGSERIAL PRIMARY KEY,
            article_id         BIGINT NOT NULL REFERENCES articles(id),
            company_id         BIGINT REFERENCES companies(id),
            event_id           BIGINT,
            fact_type          TEXT NOT NULL,
            raw_value          TEXT NOT NULL,
            value_numeric      NUMERIC,
            value_text         TEXT,
            unit               TEXT,
            as_of_date         DATE,
            extraction_quality NUMERIC(3,2) NOT NULL DEFAULT 1.00,
            evidence_quote     TEXT,
            model_name         TEXT NOT NULL,
            model_version      TEXT NOT NULL,
            prompt_version     TEXT NOT NULL,
            created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
        )
    """)

    op.execute(
        "CREATE INDEX idx_factassert_lookup ON fact_assertions(company_id, fact_type)"
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS idx_factassert_lookup")
    op.execute("DROP TABLE IF EXISTS fact_assertions")
    op.execute("DROP INDEX IF EXISTS idx_evassert_company")
    op.execute("DROP TABLE IF EXISTS event_assertions")
