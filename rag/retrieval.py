import os

from dotenv import load_dotenv
from pinecone import Pinecone

from rag.embeddings import embed_query


INDEX_NAME = "verivance-rag"
NAMESPACE = "sample"


def search(query: str, top_k: int = 5):
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

    return results.matches


if __name__ == "__main__":
    question = input("Ask a question: ")

    matches = search(question)

    print("\nTop matches:\n")

    for number, match in enumerate(matches, start=1):
        print(f"{number}. Score: {match.score:.4f}")
        print(f"   Title: {match.metadata['title']}")
        print(f"   Source: {match.metadata['source']}")
        print(f"   Chunk ID: {match.metadata['chunk_id']}")
        print(f"   Text: {match.metadata['text']}")
        print()