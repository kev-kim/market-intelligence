"""Create derived tier: events, facts, and their assertion link tables

Revision ID: 0006
Revises: 0005
Create Date: 2026-06-15

"""
from alembic import op

revision = "0006"
down_revision = "0005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("""
        CREATE TABLE events (
            id                 BIGSERIAL PRIMARY KEY,
            company_id         BIGINT NOT NULL REFERENCES companies(id),
            event_type         TEXT NOT NULL,
            payload            JSONB NOT NULL,
            occurred_on        DATE,
            date_precision     TEXT NOT NULL DEFAULT 'unknown',
            event_status       TEXT NOT NULL DEFAULT 'announced',
            confidence         NUMERIC(4,3) NOT NULL,
            confidence_factors JSONB NOT NULL,
            summary            TEXT,
            is_published       BOOLEAN NOT NULL DEFAULT TRUE,
            first_seen_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
        )
    """)

    op.execute(
        "CREATE INDEX idx_events_company ON events(company_id, occurred_on DESC)"
    )

    op.execute("""
        CREATE TABLE event_assertion_links (
            event_id     BIGINT NOT NULL REFERENCES events(id),
            assertion_id BIGINT NOT NULL REFERENCES event_assertions(id),
            PRIMARY KEY (event_id, assertion_id)
        )
    """)

    op.execute("""
        CREATE TABLE facts (
            id                 BIGSERIAL PRIMARY KEY,
            company_id         BIGINT NOT NULL REFERENCES companies(id),
            fact_type          TEXT NOT NULL,
            value_numeric      NUMERIC,
            value_text         TEXT,
            unit               TEXT,
            as_of_date         DATE,
            confidence         NUMERIC(4,3) NOT NULL,
            confidence_factors JSONB NOT NULL,
            valid_from         DATE NOT NULL,
            valid_to           DATE,
            is_current         BOOLEAN NOT NULL DEFAULT TRUE,
            has_conflict       BOOLEAN NOT NULL DEFAULT FALSE,
            created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
        )
    """)

    op.execute(
        "CREATE INDEX idx_facts_current ON facts(company_id, fact_type) WHERE is_current"
    )

    op.execute("""
        CREATE TABLE fact_assertion_links (
            fact_id      BIGINT NOT NULL REFERENCES facts(id),
            assertion_id BIGINT NOT NULL REFERENCES fact_assertions(id),
            agrees       BOOLEAN NOT NULL,
            PRIMARY KEY (fact_id, assertion_id)
        )
    """)

    # Back-fill the FK from fact_assertions.event_id now that events exists
    op.execute("""
        ALTER TABLE fact_assertions
            ADD CONSTRAINT fk_fact_assertions_event_id
            FOREIGN KEY (event_id) REFERENCES events(id)
    """)


def downgrade() -> None:
    op.execute(
        "ALTER TABLE fact_assertions DROP CONSTRAINT IF EXISTS fk_fact_assertions_event_id"
    )
    op.execute("DROP TABLE IF EXISTS fact_assertion_links")
    op.execute("DROP INDEX IF EXISTS idx_facts_current")
    op.execute("DROP TABLE IF EXISTS facts")
    op.execute("DROP TABLE IF EXISTS event_assertion_links")
    op.execute("DROP INDEX IF EXISTS idx_events_company")
    op.execute("DROP TABLE IF EXISTS events")
