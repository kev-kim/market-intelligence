"""Create sources table and seed with Appendix C reputation registry

Revision ID: 0002
Revises: 0001
Create Date: 2026-06-15

"""
from alembic import op

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("""
        CREATE TABLE sources (
            id               BIGSERIAL PRIMARY KEY,
            name             TEXT NOT NULL,
            domain           TEXT UNIQUE NOT NULL,
            reputation_tier  SMALLINT NOT NULL,
            reputation_weight NUMERIC(3,2) NOT NULL,
            is_official      BOOLEAN NOT NULL DEFAULT FALSE,
            created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
        )
    """)

    # Seed from Appendix C — source reputation registry
    op.execute("""
        INSERT INTO sources (name, domain, reputation_tier, reputation_weight, is_official) VALUES
            ('DART 전자공시',   'dart.fss.or.kr',       0, 1.00, TRUE),
            ('KRX 공시',        'kind.krx.co.kr',       0, 1.00, TRUE),
            ('더벨',            'thebell.co.kr',        1, 0.85, FALSE),
            ('한국경제',        'hankyung.com',         1, 0.85, FALSE),
            ('매일경제',        'mk.co.kr',             1, 0.85, FALSE),
            ('전자신문',        'etnews.com',           1, 0.85, FALSE),
            ('머니투데이',      'mt.co.kr',             1, 0.85, FALSE),
            ('이데일리',        'edaily.co.kr',         1, 0.80, FALSE),
            ('ZDNet Korea',     'zdnet.co.kr',          1, 0.80, FALSE),
            ('블로터',          'bloter.net',           2, 0.65, FALSE),
            ('플래텀',          'platum.kr',            2, 0.60, FALSE),
            ('벤처스퀘어',      'venturesquare.net',    2, 0.60, FALSE),
            ('아웃스탠딩',      'outstanding.kr',       2, 0.60, FALSE),
            ('스타트업레시피',  'startuprecipe.co.kr',  2, 0.55, FALSE)
    """)


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS sources")
