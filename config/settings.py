import os

from dotenv import load_dotenv


load_dotenv()


# -----------------------------
# Pinecone
# -----------------------------

PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")

PINECONE_INDEX_NAME = os.getenv(
    "PINECONE_INDEX_NAME",
    "verivance-rag",
)

PINECONE_NAMESPACE = os.getenv(
    "PINECONE_NAMESPACE",
    "web",
)


# -----------------------------
# Gemini
# -----------------------------

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

GEMINI_MODEL = os.getenv(
    "GEMINI_MODEL",
    "gemini-3.6-flash",
)


# -----------------------------
# Retrieval
# -----------------------------

DEFAULT_TOP_K = int(
    os.getenv("DEFAULT_TOP_K", "5")
)


# -----------------------------
# Validation
# -----------------------------

def validate_settings() -> None:
    """Validate required environment variables."""

    missing = []

    if not PINECONE_API_KEY:
        missing.append("PINECONE_API_KEY")

    if not GEMINI_API_KEY:
        missing.append("GEMINI_API_KEY")

    if missing:
        raise RuntimeError(
            "Missing required environment variables: "
            + ", ".join(missing)
        )