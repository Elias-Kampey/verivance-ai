import csv
from pathlib import Path
import time

RESULTS_PATH = Path("tests/retrieval_results.csv")

from rag.retrieval import search
from tests.evaluate import TEST_CASES


def main() -> None:
    test_cases = [
        case
        for case in TEST_CASES
        if case["expected_source"] is not None
    ]

    results = []

    for number, test_case in enumerate(test_cases, start=1):
        question = test_case["question"]
        expected_source = test_case["expected_source"]

        start = time.perf_counter()
        retrieved = search(question, top_k=5)
        latency = time.perf_counter() - start

        sources = [result["source"] for result in retrieved]

        top_source = sources[0] if sources else ""
        retrieval_hit = expected_source in sources
        top1_hit = top_source == expected_source

        results.append(
            {
                "question": question,
                "expected_source": expected_source,
                "top_source": top_source,
                "retrieval_hit": retrieval_hit,
                "top1_hit": top1_hit,
                "latency_seconds": round(latency, 3),
            }
        )

        print(
            f"[{number}/{len(test_cases)}] "
            f"{question}\n"
            f"Top source: {top_source} | "
            f"Expected: {expected_source} | "
            f"Top-5 hit: {retrieval_hit} | "
            f"Top-1 hit: {top1_hit} | "
            f"Latency: {latency:.3f}s\n"
        )

    top5_hits = sum(result["retrieval_hit"] for result in results)
    top1_hits = sum(result["top1_hit"] for result in results)

    average_latency = (
        sum(result["latency_seconds"] for result in results)
        / len(results)
    )

    RESULTS_PATH.parent.mkdir(parents=True, exist_ok=True)

    with RESULTS_PATH.open(
        "w",
        newline="",
        encoding="utf-8",
    ) as file:
        writer = csv.DictWriter(
            file,
            fieldnames=results[0].keys(),
        )
        writer.writeheader()
        writer.writerows(results)

    print("==============================")
    print("RETRIEVAL EVALUATION SUMMARY")
    print("==============================")
    print(
        f"Top-5 retrieval accuracy: "
        f"{top5_hits}/{len(results)} "
        f"({top5_hits / len(results) * 100:.1f}%)"
    )
    print(
        f"Top-1 retrieval accuracy: "
        f"{top1_hits}/{len(results)} "
        f"({top1_hits / len(results) * 100:.1f}%)"
    )
    print(f"Average retrieval latency: {average_latency:.3f}s")
    print(f"Results saved to: {RESULTS_PATH}")


if __name__ == "__main__":
    main()