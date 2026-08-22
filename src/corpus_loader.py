from rag.ingest import clean_text, split_into_chunks
from pathlib import Path
import json
import re

import requests
from bs4 import BeautifulSoup


SOURCES_FILE = Path("data/sources.txt")
OUTPUT_DIR = Path("data/corpus")


def load_source_urls() -> list[str]:
    """Read all URLs from data/sources.txt."""
    return [
        line.strip()
        for line in SOURCES_FILE.read_text(encoding="utf-8").splitlines()
        if line.strip()
    ]


def fetch_page(url: str) -> dict:
    """Download a webpage and extract its readable text."""

    headers = {
        "User-Agent": "Mozilla/5.0 Verivance.ai Corpus Loader"
    }

    response = requests.get(
        url,
        headers=headers,
        timeout=20
    )

    response.raise_for_status()

    soup = BeautifulSoup(response.text, "html.parser")

    # Remove things we don't want in the RAG database
    for tag in soup([
        "script",
        "style",
        "nav",
        "footer",
        "header",
        "noscript",
        "svg"
    ]):
        tag.decompose()

    if soup.title:
        title = soup.title.get_text(" ", strip=True)
    else:
        title = url

    # Prefer the main article/content area
    content = (
        soup.find("main")
        or soup.find("article")
        or soup.body
    )

    if content:
        text = content.get_text("\n", strip=True)
    else:
        text = soup.get_text("\n", strip=True)

    # Clean excessive blank lines
    text = re.sub(r"\n{3,}", "\n\n", text)

    return {
        "title": title,
        "source": url,
        "text": text.strip()
    }


def save_documents(documents: list[dict]) -> None:
    """Save downloaded pages as text files plus metadata."""

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    manifest = []

    for number, document in enumerate(documents, start=1):

        filename = f"source_{number:02d}.txt"

        file_path = OUTPUT_DIR / filename

        file_path.write_text(
            document["text"],
            encoding="utf-8"
        )

        manifest.append({
            "file": filename,
            "title": document["title"],
            "source": document["source"]
        })

        print(f"Saved: {filename}")
        print(f"Title: {document['title']}")
        print(f"Source: {document['source']}")
        print()


    manifest_path = OUTPUT_DIR / "manifest.json"

    manifest_path.write_text(
        json.dumps(manifest, indent=2),
        encoding="utf-8"
    )


def load_corpus() -> None:
    """Load all URLs and create the local Verivance corpus."""

    urls = load_source_urls()

    documents = []

    for url in urls:

        print(f"Fetching: {url}")

        try:
            document = fetch_page(url)
            documents.append(document)

        except Exception as error:
            print(f"FAILED: {url}")
            print(f"Reason: {error}")
            print()

    save_documents(documents)

    print(f"Corpus complete: {len(documents)} documents loaded.")

def build_corpus_chunks() -> list[dict]:
    """Convert downloaded corpus files into chunks with real source metadata."""

    manifest_path = OUTPUT_DIR / "manifest.json"

    manifest = json.loads(
        manifest_path.read_text(encoding="utf-8")
    )

    all_chunks = []

    for document in manifest:
        file_path = OUTPUT_DIR / document["file"]

        raw_text = file_path.read_text(encoding="utf-8")
        text = clean_text(raw_text)
        chunks = split_into_chunks(text)

        stem = file_path.stem

        for index, chunk in enumerate(chunks):
            all_chunks.append({
                "text": chunk,
                "source": document["source"],
                "title": document["title"],
                "chunk_id": f"{stem}-{index:03d}",
            })

    return all_chunks
if __name__ == "__main__":
    load_corpus()