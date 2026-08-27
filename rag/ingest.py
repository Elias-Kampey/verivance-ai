import time
import os
import re
from pathlib import Path

from dotenv import load_dotenv
from pinecone import Pinecone

from rag.embeddings import embed_document


INDEX_NAME = "verivance-rag"
NAMESPACE = "sample"


def load_text_file(file_path: Path) -> str:
    """Read a text file and return its contents."""
    return file_path.read_text(encoding="utf-8")


def clean_text(text: str) -> str:
    """Normalize whitespace while preserving paragraph boundaries."""
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)

    return text.strip()


def split_long_paragraph(paragraph: str, max_chars: int) -> list[str]:
    """Split an oversized paragraph into word-based pieces."""
    words = paragraph.split()
    pieces = []
    current_piece = ""

    for word in words:
        candidate = f"{current_piece} {word}".strip()

        if len(candidate) <= max_chars:
            current_piece = candidate
        else:
            if current_piece:
                pieces.append(current_piece)
                current_piece = ""

            while len(word) > max_chars:
                pieces.append(word[:max_chars])
                word = word[max_chars:]

            current_piece = word

    if current_piece:
        pieces.append(current_piece)

    return pieces


def split_into_chunks(text: str, max_chars: int = 400) -> list[str]:
    """Create paragraph-based chunks that stay within max_chars."""
    paragraphs = [
        paragraph.strip()
        for paragraph in text.split("\n\n")
        if paragraph.strip()
    ]

    chunks = []
    current_chunk = ""

    for paragraph in paragraphs:
        paragraph_parts = (
            split_long_paragraph(paragraph, max_chars)
            if len(paragraph) > max_chars
            else [paragraph]
        )

        for part in paragraph_parts:
            if not current_chunk:
                current_chunk = part
                continue

            combined = f"{current_chunk}\n\n{part}"

            if len(combined) <= max_chars:
                current_chunk = combined
            else:
                chunks.append(current_chunk)
                current_chunk = part

    if current_chunk:
        chunks.append(current_chunk)

    return chunks


def process_document(file_path: Path) -> list[dict]:
    """Load one document, clean it, split it, and attach metadata."""
    raw_text = load_text_file(file_path)
    text = clean_text(raw_text)
    chunks = split_into_chunks(text)

    title = file_path.stem.replace("_", " ").title()

    processed_chunks = []

    for index, chunk in enumerate(chunks):
        chunk_id = f"{file_path.stem}-{index:03d}"

        processed_chunks.append(
            {
                "text": chunk,
                "source": file_path.name,
                "title": title,
                "chunk_id": chunk_id,
            }
        )

    return processed_chunks


def load_sample_documents(directory: str = "data/sample") -> list[dict]:
    """Process every .txt file in the sample directory."""
    data_path = Path(directory)
    all_chunks = []

    for file_path in sorted(data_path.glob("*.txt")):
        all_chunks.extend(process_document(file_path))

    return all_chunks


def upload_to_pinecone(
    chunks: list[dict],
    namespace: str = NAMESPACE
) -> None:
    """Embed all chunks and upload them to Pinecone."""
    load_dotenv()

    api_key = os.getenv("PINECONE_API_KEY")

    if not api_key:
        raise ValueError("PINECONE_API_KEY is missing from .env")

    pc = Pinecone(api_key=api_key)
    index = pc.Index(INDEX_NAME)

    vectors = []

    for chunk in chunks:
        print(f"Embedding {chunk['chunk_id']}...")

        embedding = embed_document(
            chunk["text"],
            title=chunk["title"],

        )

        time.sleep(1)
        vectors.append(
            {
                "id": chunk["chunk_id"],
                "values": embedding,
                "metadata": {
                    "text": chunk["text"],
                    "source": chunk["source"],
                    "title": chunk["title"],
                    "chunk_id": chunk["chunk_id"],
                },
            }
        )

    stats = index.describe_index_stats()

    if namespace in stats.namespaces:
        print(f"\nClearing namespace '{namespace}'...")
        index.delete(delete_all=True, namespace=namespace)
    else:
        print(f"\nNamespace '{namespace}' does not exist yet. Creating it...")

    response = index.upsert(
        vectors=vectors,
        namespace=namespace,
    )

    print("\nUpload complete!")
    print(response)

if __name__ == "__main__":
    chunks = load_sample_documents()

    print(f"Loaded {len(chunks)} chunks.\n")

    upload_to_pinecone(chunks)
