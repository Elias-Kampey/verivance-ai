import os

from dotenv import load_dotenv
from pinecone import Pinecone

from rag.embeddings import embed_query


INDEX_NAME = "verivance-rag"
NAMESPACE = "sample"


def search(query: str, top_k: int = 5) -> list[dict]:
    load_dotenv()

    api_key = os.getenv("PINECONE_API_KEY")

    if not api_key:
        raise ValueError("PINECONE_API_KEY is missing from .env")

    pc = Pinecone(api_key=api_key)
    index = pc.Index(INDEX_NAME)

    query_vector = embed_query(query)

    results = index.query(
        namespace=NAMESPACE,
        vector=query_vector,
        top_k=top_k,
        include_metadata=True,
        include_values=False,
    )

    formatted_results = []

    for rank, match in enumerate(results.matches, start=1):
        metadata = match.metadata or {}

        formatted_results.append(
            {
                "rank": rank,
                "score": float(match.score),
                "title": metadata.get("title", ""),
                "source": metadata.get("source", ""),
                "chunk_id": metadata.get("chunk_id", ""),
                "text": metadata.get("text", ""),
            }
        )

    return formatted_results


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