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


def format_matches(matches, top_k: int) -> list[dict]:
    """Convert Pinecone matches into clean, deduplicated dictionaries."""
    formatted_results = []
    seen_chunks = set()

    for match in matches:
        metadata = match.metadata or {}

        chunk_id = str(metadata.get("chunk_id") or "")
        text = str(metadata.get("text") or "").strip()
        source = str(metadata.get("source") or "")
        title = str(metadata.get("title") or "")

        # Prefer chunk_id for deduplication. Fall back to normalized text.
        duplicate_key = chunk_id or " ".join(text.lower().split())
        if duplicate_key and duplicate_key in seen_chunks:
            continue
        if duplicate_key:
            seen_chunks.add(duplicate_key)

        formatted_results.append(
            {
                "rank": len(formatted_results) + 1,
                "score": float(match.score or 0.0),
                "title": title,
                "source": source,
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
    namespace: str = NAMESPACE,
) -> list[dict]:
    """Retrieve the most relevant indexed chunks for a user query."""
    query = query.strip()

    if not query:
        raise ValueError("Query cannot be empty.")
    if top_k < 1:
        raise ValueError("top_k must be at least 1.")

    index = get_index()
    query_vector = embed_query(query)

    # Pull extra candidates so duplicate removal can still return top_k results.
    fetch_k = max(top_k * 2, top_k)

    results = index.query(
        namespace=namespace,
        vector=query_vector,
        top_k=fetch_k,
        include_metadata=True,
        include_values=False,
    )

    return format_matches(results.matches, top_k=top_k)


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
