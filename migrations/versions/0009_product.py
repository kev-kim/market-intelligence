"""Create product layer: watchlists, watchlist_companies, alerts

Revision ID: 0009
Revises: 0008
Create Date: 2026-06-15

"""
from alembic import op

revision = "0009"
down_revision = "0008"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("""
        CREATE TABLE watchlists (
            id         BIGSERIAL PRIMARY KEY,
            user_id    UUID NOT NULL,
            name       TEXT NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
    """)

    op.execute("""
        CREATE TABLE watchlist_companies (
            watchlist_id BIGINT NOT NULL REFERENCES watchlists(id),
            company_id   BIGINT NOT NULL REFERENCES companies(id),
            added_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
            PRIMARY KEY (watchlist_id, company_id)
        )
    """)

    op.execute("""
        CREATE TABLE alerts (
            id          BIGSERIAL PRIMARY KEY,
            user_id     UUID NOT NULL,
            company_id  BIGINT NOT NULL REFERENCES companies(id),
            event_id    BIGINT REFERENCES events(id),
            alert_type  TEXT NOT NULL DEFAULT 'new_event',
            created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
            read_at     TIMESTAMPTZ
        )
    """)


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS alerts")
    op.execute("DROP TABLE IF EXISTS watchlist_companies")
    op.execute("DROP TABLE IF EXISTS watchlists")
