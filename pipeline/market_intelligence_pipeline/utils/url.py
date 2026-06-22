"""URL canonicalization — shared by pipeline and (separately) by api/utils/url.py."""
from __future__ import annotations

from urllib.parse import parse_qsl, urlencode, urlparse, urlunparse

_STRIP_PARAMS: frozenset[str] = frozenset(
    {
        # UTM
        "utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term",
        "utm_id", "utm_source_platform", "utm_creative_format",
        # Click IDs
        "fbclid", "gclid", "dclid", "msclkid", "twclid",
        # Referral / tracking
        "ref", "source", "from", "share", "nc", "nr", "nr_ref", "referer",
        # Analytics
        "_ga", "_gl", "mc_cid", "mc_eid",
    }
)

# Naver serves the same article on two hosts; normalise to one.
_HOST_ALIASES: dict[str, str] = {
    "n.news.naver.com": "news.naver.com",
}


def canonicalize_url(url: str) -> str:
    """
    Return a canonical form of *url* suitable for deduplication.

    - Scheme forced to https
    - Host lowercased and normalised (n.news.naver.com → news.naver.com)
    - Tracking / analytics query params stripped
    - Remaining query params preserved in original order
    - Trailing path slash removed (root path kept as '/')
    - Fragment stripped
    """
    try:
        parsed = urlparse(url.strip())
        scheme = "https"
        netloc = parsed.netloc.lower()
        netloc = _HOST_ALIASES.get(netloc, netloc)
        path = parsed.path.rstrip("/") or "/"
        qs = [
            (k, v)
            for k, v in parse_qsl(parsed.query)
            if k.lower() not in _STRIP_PARAMS and not k.lower().startswith("utm_")
        ]
        return urlunparse((scheme, netloc, path, "", urlencode(qs), ""))
    except Exception:
        return url
