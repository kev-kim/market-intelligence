"""Create articles and article_dedup_clusters tables

Revision ID: 0003
Revises: 0002
Create Date: 2026-06-15

"""
from alembic import op

revision = "0003"
down_revision = "0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("""
        CREATE TABLE articles (
            id               BIGSERIAL PRIMARY KEY,
            source_id        BIGINT REFERENCES sources(id),
            url              TEXT NOT NULL,
            url_canonical    TEXT NOT NULL,
            title            TEXT NOT NULL,
            snippet          TEXT,
            body             TEXT,
            published_at     TIMESTAMPTZ,
            fetched_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
            language         TEXT NOT NULL DEFAULT 'ko',
            content_hash     TEXT NOT NULL,
            simhash          BIGINT,
            embedding        VECTOR(1536),
            dedup_cluster_id BIGINT,
            processing_status TEXT NOT NULL DEFAULT 'pending',
            created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
            UNIQUE (url_canonical)
        )
    """)

    op.execute("CREATE INDEX idx_articles_status  ON articles(processing_status)")
    op.execute("CREATE INDEX idx_articles_pubdate ON articles(published_at DESC)")
    op.execute("CREATE INDEX idx_articles_simhash ON articles(simhash)")
    op.execute(
        "CREATE INDEX idx_articles_embed ON articles USING hnsw (embedding vector_cosine_ops)"
    )

    op.execute("""
        CREATE TABLE article_dedup_clusters (
            id                   BIGSERIAL PRIMARY KEY,
            canonical_article_id BIGINT REFERENCES articles(id),
            member_count         INT NOT NULL DEFAULT 1,
            created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
        )
    """)


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS article_dedup_clusters")
    op.execute("DROP INDEX IF EXISTS idx_articles_embed")
    op.execute("DROP INDEX IF EXISTS idx_articles_simhash")
    op.execute("DROP INDEX IF EXISTS idx_articles_pubdate")
    op.execute("DROP INDEX IF EXISTS idx_articles_status")
    op.execute("DROP TABLE IF EXISTS articles")
