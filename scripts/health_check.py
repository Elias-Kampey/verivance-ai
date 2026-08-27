from config.settings import (
    GEMINI_API_KEY,
    GEMINI_MODEL,
    PINECONE_API_KEY,
    PINECONE_INDEX_NAME,
    PINECONE_NAMESPACE,
)
from rag.retrieval import search


def main():
    print("=== Verivance Health Check ===")

    print("\n[1] Configuration")

    print(
        "PINECONE_API_KEY:",
        "OK" if PINECONE_API_KEY else "MISSING",
    )

    print(
        "GEMINI_API_KEY:",
        "OK" if GEMINI_API_KEY else "MISSING",
    )

    print(
        "Pinecone index:",
        PINECONE_INDEX_NAME,
    )

    print(
        "Pinecone namespace:",
        PINECONE_NAMESPACE,
    )

    print(
        "Gemini model:",
        GEMINI_MODEL,
    )

    print("\n[2] Retrieval")

    try:
        results = search(
            "How does semantic search work?"
        )

        if results:
            print("Retrieval: OK")
            print(
                "Results returned:",
                len(results),
            )
            print(
                "Top source:",
                results[0].get("title"),
            )
            print(
                "Top score:",
                results[0].get("score"),
            )
        else:
            print("Retrieval: NO RESULTS")

    except Exception as error:
        print(
            "Retrieval: FAILED"
        )
        print(
            "Error:",
            error,
        )

    print("\nHealth check complete.")


if __name__ == "__main__":
    main()