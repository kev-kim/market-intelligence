"""Create companies, company_aliases, and company_mentions tables

Revision ID: 0004
Revises: 0003
Create Date: 2026-06-15

"""
from alembic import op

revision = "0004"
down_revision = "0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("""
        CREATE TABLE companies (
            id                BIGSERIAL PRIMARY KEY,
            canonical_name_ko TEXT NOT NULL,
            canonical_name_en TEXT,
            dart_corp_code    TEXT UNIQUE,
            stock_code        TEXT,
            parent_company_id BIGINT REFERENCES companies(id),
            status            TEXT NOT NULL DEFAULT 'active',
            sector            TEXT,
            hq_region         TEXT,
            founded_year      INT,
            is_verified       BOOLEAN NOT NULL DEFAULT FALSE,
            created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
        )
    """)

    op.execute("""
        CREATE TABLE company_aliases (
            id          BIGSERIAL PRIMARY KEY,
            company_id  BIGINT NOT NULL REFERENCES companies(id),
            alias       TEXT NOT NULL,
            alias_norm  TEXT NOT NULL,
            alias_type  TEXT NOT NULL,
            source      TEXT NOT NULL DEFAULT 'manual',
            confidence  NUMERIC(3,2) NOT NULL DEFAULT 1.00,
            created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
            UNIQUE (company_id, alias_norm)
        )
    """)

    op.execute(
        "CREATE INDEX idx_alias_norm ON company_aliases USING gin (alias_norm gin_trgm_ops)"
    )

    op.execute("""
        CREATE TABLE company_mentions (
            id                    BIGSERIAL PRIMARY KEY,
            article_id            BIGINT NOT NULL REFERENCES articles(id),
            company_id            BIGINT REFERENCES companies(id),
            surface_form          TEXT NOT NULL,
            char_span_start       INT,
            char_span_end         INT,
            resolution_status     TEXT NOT NULL DEFAULT 'pending',
            resolution_confidence NUMERIC(4,3),
            resolved_by           TEXT,
            created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
        )
    """)


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS company_mentions")
    op.execute("DROP INDEX IF EXISTS idx_alias_norm")
    op.execute("DROP TABLE IF EXISTS company_aliases")
    op.execute("DROP TABLE IF EXISTS companies")
