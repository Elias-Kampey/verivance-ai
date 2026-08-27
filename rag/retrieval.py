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

        chunk_id = metadata.get("chunk_id", "")
        text = metadata.get("text", "").strip()

        duplicate_key = chunk_id or text

        if duplicate_key in seen_chunks:
            continue

        seen_chunks.add(duplicate_key)

        formatted_results.append(
            {
                "rank": len(formatted_results) + 1,
                "score": float(match.score),
                "title": metadata.get("title", ""),
                "source": metadata.get("source", ""),
                "chunk_id": chunk_id,
                "text": text,
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

    # Fetch extra candidates so deduplication
    # can still return up to top_k unique chunks.
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