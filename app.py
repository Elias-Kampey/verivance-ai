"""
Verivance API — FastAPI wrapper around the existing RAG pipeline.

This replaces app.py as the entry point. Your rag/ modules are
untouched: this file only exposes them over HTTP so the Next.js
frontend can call them.

Run from the project root:
    uvicorn api.main:app --reload --port 8000

Docs while developing: http://localhost:8000/docs
"""

from config.settings import WEB_FALLBACK_THRESHOLD
from rag.web_retrieval import search_web
from pathlib import Path
import sys
import time
from typing import Any

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# Make the project root importable so `from rag...` resolves the same
# way it did in app.py.
PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from rag.retrieval import search as rag_search
from rag.generation import (
    REFUSAL_MESSAGE,
    generate_answer as rag_generate_answer,
)

# Optional: if you add list_sources() to rag/retrieval.py later, the
# /api/sources endpoint starts returning real index data automatically.
try:
    from rag.retrieval import list_sources as rag_list_sources
except ImportError:
    rag_list_sources = None


app = FastAPI(title="Verivance API", version="1.0.0")

# The Next.js dev server runs on a different port, so the browser
# treats it as a different origin and blocks the request unless the
# API says otherwise. This is the #1 thing that breaks when people
# first wire a JS frontend to a Python backend.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# -----------------------------
# Schemas
# -----------------------------
class SearchRequest(BaseModel):
    question: str = Field(..., min_length=1)
    top_k: int = Field(default=5, ge=1, le=20)
    namespace: str = Field(default="web")


class Evidence(BaseModel):
    rank: int
    score: float
    title: str
    source: str
    chunk_id: str
    text: str


class SearchResponse(BaseModel):
    question: str
    answer: str
    results: list[Evidence]
    # Retrieval telemetry — this is what feeds the Analytics page and
    # is the whole point of the product, so it ships in the response
    # rather than being recomputed on the client.
    latency_ms: int
    chunks_retrieved: int
    refused: bool


class SourceSummary(BaseModel):
    title: str
    url: str
    chunks: int
    indexed: bool


def _normalize(raw: dict[str, Any], fallback_rank: int) -> Evidence:
    """Coerce a retrieval hit into a strict, frontend-safe shape.

    app.py did this defensively inline with .get() everywhere. Doing it
    once here means the TypeScript types on the other side can be
    non-optional, which is most of the benefit of moving to TS.
    """
    try:
        score = float(raw.get("score") or 0.0)
    except (TypeError, ValueError):
        score = 0.0

    return Evidence(
        rank=int(raw.get("rank") or fallback_rank),
        score=score,
        title=str(raw.get("title") or "Untitled source"),
        source=str(raw.get("source") or ""),
        chunk_id=str(raw.get("chunk_id") or "unknown"),
        text=str(raw.get("text") or ""),
    )


# -----------------------------
# Routes
# -----------------------------
@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/search", response_model=SearchResponse)
def search(payload: SearchRequest) -> SearchResponse:
    started = time.perf_counter()

    # First search the curated Pinecone corpus.
    try:
        local_results = rag_search(
            payload.question,
            top_k=payload.top_k,
            namespace=payload.namespace,
        )
    except Exception:
        local_results = []

    local_best_score = max(
        (
            float(item.get("score", 0.0))
            for item in (local_results or [])
        ),
        default=0.0,
    )

    # Strong local evidence -> stay with Pinecone.
    if local_results and local_best_score >= WEB_FALLBACK_THRESHOLD:
        raw_results = local_results

    else:
        # Weak or missing local evidence -> search the live web.
        try:
            raw_results = search_web(
                payload.question,
                max_results=payload.top_k,
            )
        except Exception as error:
            raise HTTPException(
                status_code=502,
                detail=f"Web retrieval failed: {error}",
            ) from error

    results = [
        _normalize(item, index + 1)
        for index, item in enumerate(raw_results or [])
    ]

    # No evidence -> refuse. The refusal is a first-class response, not
    # an error: the frontend renders it as a real answer state.
    if not results:
        return SearchResponse(
            question=payload.question,
            answer=(
                "Verivance could not find evidence for this question in "
                "its indexed sources, so it won't answer."
            ),
            results=[],
            latency_ms=int((time.perf_counter() - started) * 1000),
            chunks_retrieved=0,
            refused=True,
        )

    try:
        answer = rag_generate_answer(payload.question, raw_results)
    except Exception as error:
        raise HTTPException(
            status_code=502,
            detail=f"Answer generation failed: {error}",
        ) from error

    return SearchResponse(
        question=payload.question,
        answer=str(answer),
        results=results,
        latency_ms=int((time.perf_counter() - started) * 1000),
        chunks_retrieved=len(results),
        refused=(
            str(answer).strip() == REFUSAL_MESSAGE
        ),
    )


@app.get("/api/sources", response_model=list[SourceSummary])
def sources() -> list[SourceSummary]:
    """What Verivance currently has indexed.

    Returns [] until you implement list_sources() in rag/retrieval.py.
    The frontend renders an empty state for that, so this is safe to
    ship before the function exists.
    """
    if rag_list_sources is None:
        return []

    try:
        raw = rag_list_sources() or []
    except Exception as error:
        raise HTTPException(
            status_code=502,
            detail=f"Could not list sources: {error}",
        ) from error

    return [
        SourceSummary(
            title=str(item.get("title") or "Untitled source"),
            url=str(item.get("url") or item.get("source") or ""),
            chunks=int(item.get("chunks") or 0),
            indexed=bool(item.get("indexed", True)),
        )
        for item in raw
    ]