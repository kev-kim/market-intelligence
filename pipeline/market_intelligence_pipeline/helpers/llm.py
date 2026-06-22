"""
LLM cost accounting helper. Every LLM call in the pipeline must call log_llm_call()
before returning — never bypass it. This is the cost-tracking spine of the system.
"""
from __future__ import annotations

import os
import time
from contextlib import contextmanager
from typing import Generator

import psycopg
from dotenv import load_dotenv

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "../../../.env"))


def _db_url() -> str:
    url = os.environ.get("DATABASE_URL", "postgresql://postgres:password@localhost:5432/postgres")
    return url


def log_llm_call(
    stage: str,
    model_name: str,
    input_tokens: int,
    output_tokens: int,
    cost_usd: float,
    status: str,
    *,
    article_id: int | None = None,
    model_version: str | None = None,
    error: str | None = None,
    duration_ms: int | None = None,
) -> int:
    """
    Persist one LLM call record to pipeline_runs.

    Returns the inserted row id so callers can reference it (e.g. as
    event_assertions.extraction_run_id).

    status must be one of: 'ok' | 'retry' | 'failed'
    """
    with psycopg.connect(_db_url()) as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO pipeline_runs
                    (stage, article_id, model_name, input_tokens, output_tokens,
                     cost_usd, status, error, duration_ms)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id
                """,
                (
                    stage,
                    article_id,
                    model_name,
                    input_tokens,
                    output_tokens,
                    cost_usd,
                    status,
                    error,
                    duration_ms,
                ),
            )
            row_id: int = cur.fetchone()[0]  # type: ignore[index]
        conn.commit()
    return row_id


@contextmanager
def timed_llm_call(
    stage: str,
    model_name: str,
    *,
    article_id: int | None = None,
) -> Generator[dict, None, None]:
    """
    Context manager that times an LLM call and auto-logs it.

    Usage::

        with timed_llm_call("triage", "claude-haiku-4-5", article_id=42) as ctx:
            result = call_llm(...)
            ctx["input_tokens"] = result.usage.input_tokens
            ctx["output_tokens"] = result.usage.output_tokens
            ctx["cost_usd"] = compute_cost(result.usage)

    The manager writes status='ok' on normal exit, status='failed' on exception.
    """
    ctx: dict = {
        "input_tokens": 0,
        "output_tokens": 0,
        "cost_usd": 0.0,
        "error": None,
    }
    start = time.monotonic()
    try:
        yield ctx
        status = "ok"
    except Exception as exc:
        status = "failed"
        ctx["error"] = str(exc)
        raise
    finally:
        duration_ms = int((time.monotonic() - start) * 1000)
        log_llm_call(
            stage=stage,
            model_name=model_name,
            input_tokens=ctx["input_tokens"],
            output_tokens=ctx["output_tokens"],
            cost_usd=ctx["cost_usd"],
            status=status,
            article_id=article_id,
            error=ctx.get("error"),
            duration_ms=duration_ms,
        )
