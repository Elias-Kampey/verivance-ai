import os

from dotenv import load_dotenv
from pinecone import Pinecone

from rag.embeddings import embed_query


INDEX_NAME = "verivance-rag"
NAMESPACE = "sample"
DEFAULT_TOP_K = 5


def get_index():
    """Connect to and return the configured Pinecone index."""
    load_dotenv()

    api_key = os.getenv("PINECONE_API_KEY")

    if not api_key:
        raise ValueError("PINECONE_API_KEY is missing from .env")

    pc = Pinecone(api_key=api_key)

    return pc.Index(INDEX_NAME)


def format_matches(matches) -> list[dict]:
    """Convert Pinecone matches into clean, deduplicated UI-friendly dictionaries."""
    formatted_results = []
    seen_chunk_ids = set()

    for match in matches:
        metadata = match.metadata or {}

        chunk_id = metadata.get("chunk_id") or getattr(match, "id", "")

        if not chunk_id or chunk_id in seen_chunk_ids:
            continue

        text = metadata.get("text", "")

        if not isinstance(text, str) or not text.strip():
            continue

        seen_chunk_ids.add(chunk_id)

        try:
            score = float(match.score)
        except (TypeError, ValueError):
            score = 0.0

        formatted_results.append(
            {
                "rank": len(formatted_results) + 1,
                "score": score,
                "title": metadata.get("title") or "Untitled",
                "source": metadata.get("source") or "Unknown source",
                "chunk_id": chunk_id,
                "text": text.strip(),
                "excerpt": text.strip()[:200],
            }
        )

    return formatted_results


def search(query: str, top_k: int = DEFAULT_TOP_K) -> list[dict]:
    """Retrieve the most relevant indexed chunks for a user query."""
    query = query.strip()

    if not query:
        raise ValueError("Query cannot be empty.")

    if top_k < 1:
        raise ValueError("top_k must be at least 1.")

    index = get_index()
    query_vector = embed_query(query)

    results = index.query(
        namespace=NAMESPACE,
        vector=query_vector,
        top_k=top_k,
        include_metadata=True,
        include_values=False,
    )

    return format_matches(results.matches)


if __name__ == "__main__":
    question = input("Ask a question: ")

    matches = search(question)

    print("\nTop matches:\n")

    for match in matches:
        print(f"{match['rank']}. Score: {match['score']:.4f}")
        print(f"   Title: {match['title']}")
        print(f"   Source: {match['source']}")
        print(f"   Chunk ID: {match['chunk_id']}")
        print(f"   Text: {match['text']}")
        print()