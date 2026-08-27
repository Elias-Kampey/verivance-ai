import os

from dotenv import load_dotenv
from google import genai
from google.genai import types


load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

if not GEMINI_API_KEY:
    raise ValueError("GEMINI_API_KEY is missing from .env")

client = genai.Client(api_key=GEMINI_API_KEY)

MODEL_NAME = "gemini-embedding-2"
EMBEDDING_DIMENSION = 768


def embed_document(text: str, title: str | None = None) -> list[float]:
    """Create an embedding for a document chunk."""

    if title is None:
        title = "none"

    prepared_text = f"title: {title} | text: {text}"

    result = client.models.embed_content(
        model=MODEL_NAME,
        contents=prepared_text,
        config=types.EmbedContentConfig(
            output_dimensionality=EMBEDDING_DIMENSION
        ),
    )

    return result.embeddings[0].values


def embed_query(query: str) -> list[float]:
    """Create an embedding for a user's search query."""

    prepared_query = f"task: search result | query: {query}"

    result = client.models.embed_content(
        model=MODEL_NAME,
        contents=prepared_query,
        config=types.EmbedContentConfig(
            output_dimensionality=EMBEDDING_DIMENSION
        ),
    )

    return result.embeddings[0].values


if __name__ == "__main__":
    test_text = (
        "Retrieval-Augmented Generation reduces hallucinations "
        "by grounding answers in retrieved evidence."
    )

    vector = embed_document(test_text, title="RAG")

    print(f"Embedding dimension: {len(vector)}")
    print(f"First 5 values: {vector[:5]}")