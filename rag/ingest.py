import os
from pathlib import Path

from dotenv import load_dotenv
from pinecone import Pinecone

from rag.embeddings import embed_document


INDEX_NAME = "verivance-rag"
NAMESPACE = "sample"


def load_text_file(file_path: Path) -> str:
    """Read a text file and return its contents."""
    return file_path.read_text(encoding="utf-8")


def split_into_chunks(text: str) -> list[str]:
    """Split text into non-empty paragraphs."""
    paragraphs = text.split("\n\n")

    return [
        paragraph.strip()
        for paragraph in paragraphs
        if paragraph.strip()
    ]


def process_document(file_path: Path) -> list[dict]:
    """Load one document, split it, and attach metadata."""
    text = load_text_file(file_path)
    chunks = split_into_chunks(text)

    processed_chunks = []

    for index, chunk in enumerate(chunks):
        processed_chunks.append(
            {
                "text": chunk,
                "source": file_path.name,
                "chunk_id": f"{file_path.stem}-{index:03d}",
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


def upload_to_pinecone(chunks: list[dict]) -> None:
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
            title=chunk["source"],
        )

        vectors.append(
            {
                "id": chunk["chunk_id"],
                "values": embedding,
                "metadata": {
                    "text": chunk["text"],
                    "source": chunk["source"],
                },
            }
        )

    response = index.upsert(
        vectors=vectors,
        namespace=NAMESPACE,
    )

    print("\nUpload complete!")
    print(response)


if __name__ == "__main__":
    chunks = load_sample_documents()

    print(f"Loaded {len(chunks)} chunks.\n")

    upload_to_pinecone(chunks)