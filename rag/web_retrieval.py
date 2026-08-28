from urllib.parse import urlparse

import requests

from config.settings import TAVILY_API_KEY


TAVILY_SEARCH_URL = "https://api.tavily.com/search"
DEFAULT_WEB_RESULTS = 5
WEB_TIMEOUT_SECONDS = 15

HIGH_AUTHORITY_DOMAINS = (
    ".gov",
    ".edu",
    "aws.amazon.com",
    "microsoft.com",
    "google.com",
    "openai.com",
    "ieee.org",
    "acm.org",
    "nature.com",
    "science.org",
    "mdpi.com",
)

LOW_AUTHORITY_DOMAINS = (
    "medium.com",
)

def _quality_adjusted_score(url: str, relevance_score: float) -> float:
    domain = _domain_from_url(url).lower()

    if any(domain.endswith(d) or d in domain for d in HIGH_AUTHORITY_DOMAINS):
        relevance_score += 0.05

    if any(domain.endswith(d) or d in domain for d in LOW_AUTHORITY_DOMAINS):
        relevance_score -= 0.10

    return max(0.0, min(1.0, relevance_score))


def _clean_text(text: str) -> str:
    return " ".join(str(text or "").split())


def _domain_from_url(url: str) -> str:
    try:
        return urlparse(url).netloc.replace("www.", "")
    except Exception:
        return "Web source"


def search_web(
    query: str,
    max_results: int = DEFAULT_WEB_RESULTS,
) -> list[dict]:
    """
    Search the live web with Tavily and return results in the same
    general structure used by Verivance's Pinecone retrieval layer.
    """

    query = query.strip()

    if not query:
        raise ValueError("Query cannot be empty.")

    if max_results < 1:
        raise ValueError("max_results must be at least 1.")

    if not TAVILY_API_KEY:
        raise ValueError("TAVILY_API_KEY is not configured.")

    response = requests.post(
        TAVILY_SEARCH_URL,
        headers={
            "Authorization": f"Bearer {TAVILY_API_KEY}",
            "Content-Type": "application/json",
        },
        json={
            "query": query,
            "search_depth": "basic",
            "topic": "general",
            "max_results": max_results,
            "chunks_per_source": 3,
            "include_answer": False,
            "include_raw_content": False,
            "include_images": False,
            "safe_search": True,
        },
        timeout=WEB_TIMEOUT_SECONDS,
    )

    response.raise_for_status()

    payload = response.json()
    results = payload.get("results", [])

    formatted_results = []
    seen_urls = set()

    for result in results:
        url = str(result.get("url") or "").strip()
        content = _clean_text(result.get("content"))

        if not url or not content:
            continue

        # Avoid returning the exact same page more than once.
        if url in seen_urls:
            continue

        seen_urls.add(url)

        title = _clean_text(result.get("title"))
        if not title:
            title = _domain_from_url(url)

        try:
            score = float(result.get("score", 0.0))
        except (TypeError, ValueError):
            score = 0.0

        score = _quality_adjusted_score(url, score)

        rank = len(formatted_results) + 1

        formatted_results.append(
            {
                "rank": rank,
                "score": score,
                "title": title,
                "source": url,
                "chunk_id": f"web-{rank:03d}",
                "text": content,
                "excerpt": content[:200],
                "retrieval_type": "web",
            }
        )

    formatted_results.sort(
        key=lambda item: item["score"],
        reverse=True,
    )

    for rank, item in enumerate(formatted_results, start=1):
        item["rank"] = rank
        item["chunk_id"] = f"web-{rank:03d}"

    return formatted_results