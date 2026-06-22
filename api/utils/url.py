"""URL canonicalization for the API layer (e.g., normalising user-supplied URLs)."""
from __future__ import annotations

from urllib.parse import parse_qsl, urlencode, urlparse, urlunparse

_STRIP_PARAMS: frozenset[str] = frozenset(
    {
        "utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term",
        "utm_id", "utm_source_platform", "utm_creative_format",
        "fbclid", "gclid", "dclid", "msclkid", "twclid",
        "ref", "source", "from", "share", "nc", "nr", "nr_ref", "referer",
        "_ga", "_gl", "mc_cid", "mc_eid",
    }
)

_HOST_ALIASES: dict[str, str] = {
    "n.news.naver.com": "news.naver.com",
}


def canonicalize_url(url: str) -> str:
    """Return a dedup-safe canonical form of *url* (https, lowercase host, no tracking params)."""
    try:
        parsed = urlparse(url.strip())
        netloc = parsed.netloc.lower()
        netloc = _HOST_ALIASES.get(netloc, netloc)
        path = parsed.path.rstrip("/") or "/"
        qs = [
            (k, v)
            for k, v in parse_qsl(parsed.query)
            if k.lower() not in _STRIP_PARAMS and not k.lower().startswith("utm_")
        ]
        return urlunparse(("https", netloc, path, "", urlencode(qs), ""))
    except Exception:
        return url
