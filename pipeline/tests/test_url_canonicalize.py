"""
Tests for URL canonicalization (§3 pipeline spec).

Covers: UTM stripping, scheme normalization, host case, trailing slash,
fragment removal, Naver n.news host normalization, query param order
preservation, and idempotence.
"""
import pytest

from market_intelligence_pipeline.utils.url import canonicalize_url


# ─── Scheme and host normalization ───────────────────────────────────────────

def test_http_upgraded_to_https():
    assert canonicalize_url("http://example.com/article") == "https://example.com/article"


def test_host_lowercased():
    assert canonicalize_url("https://News.Naver.Com/article/1") == "https://news.naver.com/article/1"


# ─── Tracking param stripping ─────────────────────────────────────────────────

def test_utm_params_stripped():
    url = "https://example.com/article?utm_source=twitter&utm_medium=social&id=42"
    result = canonicalize_url(url)
    assert "utm_source" not in result
    assert "utm_medium" not in result
    assert "id=42" in result


def test_fbclid_stripped():
    url = "https://example.com/article?fbclid=IwAR0abc123&page=1"
    result = canonicalize_url(url)
    assert "fbclid" not in result
    assert "page=1" in result


def test_gclid_and_msclkid_stripped():
    url = "https://example.com/article?gclid=Cj0abc&msclkid=xyz&q=test"
    result = canonicalize_url(url)
    assert "gclid" not in result
    assert "msclkid" not in result
    assert "q=test" in result


def test_ref_stripped():
    url = "https://example.com/article?ref=homepage&id=99"
    result = canonicalize_url(url)
    assert "ref=" not in result
    assert "id=99" in result


def test_ga_analytics_stripped():
    url = "https://example.com/path?_ga=2.123456.0.0&section=biz"
    result = canonicalize_url(url)
    assert "_ga" not in result
    assert "section=biz" in result


# ─── Path normalization ───────────────────────────────────────────────────────

def test_trailing_slash_removed():
    assert canonicalize_url("https://example.com/article/") == "https://example.com/article"


def test_root_path_preserved():
    assert canonicalize_url("https://example.com/") == "https://example.com/"


def test_fragment_stripped():
    assert canonicalize_url("https://example.com/article#comments") == "https://example.com/article"


# ─── Naver-specific: n.news.naver.com → news.naver.com ───────────────────────

def test_naver_mobile_host_normalized():
    mobile = "https://n.news.naver.com/article/092/0002343073"
    desktop = "https://news.naver.com/article/092/0002343073"
    assert canonicalize_url(mobile) == canonicalize_url(desktop)


def test_naver_mobile_host_maps_to_canonical():
    result = canonicalize_url("https://n.news.naver.com/article/001/0014567890")
    assert result.startswith("https://news.naver.com/")


# ─── Query param order preservation ──────────────────────────────────────────

def test_non_tracking_params_preserved_in_order():
    url = "https://example.com/search?q=토스&page=2&sort=date"
    result = canonicalize_url(url)
    assert result.endswith("q=%ED%86%A0%EC%8A%A4&page=2&sort=date")


def test_mixed_tracking_and_real_params_preserves_order():
    url = "https://example.com/article?utm_source=naver&id=42&utm_medium=cpc&category=biz"
    result = canonicalize_url(url)
    # Real params in original relative order; tracking params gone
    assert "id=42" in result
    assert "category=biz" in result
    assert result.index("id=42") < result.index("category=biz")
    assert "utm_source" not in result


# ─── Idempotence ─────────────────────────────────────────────────────────────

def test_idempotent_plain_url():
    url = "https://example.com/article"
    assert canonicalize_url(url) == canonicalize_url(canonicalize_url(url))


def test_idempotent_url_with_params():
    url = "https://news.naver.com/main/read.naver?oid=001&aid=0014567890"
    once = canonicalize_url(url)
    twice = canonicalize_url(once)
    assert once == twice


def test_idempotent_after_utm_strip():
    url = "https://example.com/story?utm_campaign=x&id=7"
    once = canonicalize_url(url)
    twice = canonicalize_url(once)
    assert once == twice
