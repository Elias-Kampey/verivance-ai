from pinecone import Pinecone

from config.settings import (
    DEFAULT_TOP_K,
    PINECONE_API_KEY,
    PINECONE_INDEX_NAME,
    PINECONE_NAMESPACE,
)
from rag.embeddings import embed_query


def get_index():
    """Connect to and return the configured Pinecone index."""
    if not PINECONE_API_KEY:
        raise ValueError(
            "PINECONE_API_KEY is missing from .env"
        )

    pc = Pinecone(api_key=PINECONE_API_KEY)

    return pc.Index(PINECONE_INDEX_NAME)


def format_matches(
    matches,
    top_k: int = DEFAULT_TOP_K,
) -> list[dict]:
    """Convert Pinecone matches into clean, deduplicated results."""
    formatted_results = []
    seen_chunks = set()

    for match in matches:
        metadata = match.metadata or {}

        chunk_id = (
            metadata.get("chunk_id")
            or getattr(match, "id", "")
        )

        text = metadata.get("text", "")

        if not isinstance(text, str):
            continue

        text = text.strip()

        if not text:
            continue

        duplicate_key = chunk_id or text

        if duplicate_key in seen_chunks:
            continue

        seen_chunks.add(duplicate_key)

        try:
            score = float(match.score)
        except (TypeError, ValueError):
            score = 0.0

        formatted_results.append(
            {
                "rank": len(formatted_results) + 1,
                "score": score,
                "title": (
                    metadata.get("title")
                    or "Untitled"
                ),
                "source": (
                    metadata.get("source")
                    or "Unknown source"
                ),
                "chunk_id": chunk_id,
                "text": text,
                "excerpt": text[:200],
            }
        )

        if len(formatted_results) >= top_k:
            break

    return formatted_results


def search(
    query: str,
    top_k: int = DEFAULT_TOP_K,
    namespace: str = PINECONE_NAMESPACE,
) -> list[dict]:
    """Retrieve the most relevant indexed chunks."""
    query = query.strip()

    if not query:
        raise ValueError("Query cannot be empty.")

    if top_k < 1:
        raise ValueError("top_k must be at least 1.")

    index = get_index()
    query_vector = embed_query(query)

    # Fetch extra candidates so deduplication can still
    # return up to top_k unique chunks.
    candidate_count = max(top_k * 2, top_k)

    results = index.query(
        namespace=namespace,
        vector=query_vector,
        top_k=candidate_count,
        include_metadata=True,
        include_values=False,
    )

    return format_matches(
        results.matches,
        top_k=top_k,
    )


if __name__ == "__main__":
    question = input("Ask a question: ")

    matches = search(question)

    print("\nTop matches:\n")

    for match in matches:
        print(
            f"{match['rank']}. "
            f"Score: {match['score']:.4f}"
        )
        print(f"   Title: {match['title']}")
        print(f"   Source: {match['source']}")
        print(f"   Chunk ID: {match['chunk_id']}")
        print(f"   Text: {match['text']}")
        print()