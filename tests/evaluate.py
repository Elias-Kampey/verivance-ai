import argparse
import csv
import json
import time

from pathlib import Path
from urllib.parse import urlparse

from rag.generation import (
    GENERATION_ERROR_MESSAGE,
    QUOTA_MESSAGE,
    REFUSAL_MESSAGE,
    generate_answer,
)
from rag.retrieval import search


DEFAULT_CASES = Path("tests/evaluation_cases.json")
RESULTS_DIR = Path("tests/results")


def domain_from_url(url: str) -> str:
    if not url:
        return ""

    try:
        return (
            urlparse(url)
            .netloc
            .lower()
            .removeprefix("www.")
        )
    except Exception:
        return ""


def classify_generation_status(answer: str) -> str:
    """
    Classify the generation result separately from RAG quality.
    """

    cleaned = answer.strip()

    if cleaned == REFUSAL_MESSAGE:
        return "refusal"

    if cleaned == QUOTA_MESSAGE:
        return "quota_error"

    if cleaned == GENERATION_ERROR_MESSAGE:
        return "provider_error"

    return "ok"


def evaluate_case(
    case: dict,
    namespace: str,
    top_k: int,
) -> dict:

    question = case["question"]

    started = time.perf_counter()

    # -----------------------------
    # Retrieval
    # -----------------------------
    retrieval_started = time.perf_counter()

    results = search(
        question,
        top_k=top_k,
        namespace=namespace,
    )

    retrieval_ms = (
        time.perf_counter()
        - retrieval_started
    ) * 1000

    # -----------------------------
    # Generation
    # -----------------------------
    generation_started = time.perf_counter()

    answer = generate_answer(
        question,
        results,
    )

    generation_ms = (
        time.perf_counter()
        - generation_started
    ) * 1000

    total_ms = (
        time.perf_counter()
        - started
    ) * 1000

    # -----------------------------
    # Retrieval scoring
    # -----------------------------
    top = results[0] if results else {}

    top_source = str(
        top.get("source")
        or ""
    )

    top_domain = domain_from_url(
        top_source
    )

    expected_source = case.get(
        "expected_source"
    )

    source_match = None

    if expected_source:
        source_match = (
            expected_source.lower()
            in top_domain
        )

    # -----------------------------
    # Generation classification
    # -----------------------------
    generation_status = (
        classify_generation_status(answer)
    )

    refused = (
        generation_status == "refusal"
    )

    provider_failure = (
        generation_status
        in {
            "quota_error",
            "provider_error",
        }
    )

    return {
        "id": case.get("id", ""),
        "category": case.get(
            "category",
            "",
        ),
        "question": question,

        "expected_source": (
            expected_source
            or ""
        ),

        "top_source": top_source,
        "top_domain": top_domain,

        "top_score": float(
            top.get(
                "score",
                0.0,
            )
            or 0.0
        ),

        "source_match": source_match,

        "generation_status": (
            generation_status
        ),

        "refused": refused,

        "provider_failure": (
            provider_failure
        ),

        "retrieval_ms": round(
            retrieval_ms,
            1,
        ),

        "generation_ms": round(
            generation_ms,
            1,
        ),

        "total_ms": round(
            total_ms,
            1,
        ),

        "answer": answer,
    }


def print_summary(
    rows: list[dict],
) -> None:

    if not rows:
        print(
            "No evaluation rows were produced."
        )
        return

    # -----------------------------
    # Retrieval quality
    # -----------------------------
    matched = [
        row
        for row in rows
        if row["source_match"] is not None
    ]

    correct_sources = sum(
        bool(row["source_match"])
        for row in matched
    )

    # -----------------------------
    # Provider failures
    # -----------------------------
    provider_failures = [
        row
        for row in rows
        if row.get(
            "provider_failure",
            False,
        )
    ]

    valid_generation_rows = [
        row
        for row in rows
        if not row.get(
            "provider_failure",
            False,
        )
    ]

    quota_failures = [
        row
        for row in rows
        if row.get(
            "generation_status"
        )
        == "quota_error"
    ]

    other_provider_failures = [
        row
        for row in rows
        if row.get(
            "generation_status"
        )
        == "provider_error"
    ]

    # -----------------------------
    # Refusal quality
    # -----------------------------
    unsupported = [
        row
        for row in valid_generation_rows
        if row["category"]
        in {
            "unanswerable",
            "prompt_injection",
        }
    ]

    refusals = sum(
        bool(row["refused"])
        for row in unsupported
    )

    # -----------------------------
    # Latency
    # -----------------------------
    avg_retrieval = (
        sum(
            row["retrieval_ms"]
            for row in rows
        )
        / len(rows)
    )

    if valid_generation_rows:
        avg_generation = (
            sum(
                row["generation_ms"]
                for row
                in valid_generation_rows
            )
            / len(valid_generation_rows)
        )

        avg_total = (
            sum(
                row["total_ms"]
                for row
                in valid_generation_rows
            )
            / len(valid_generation_rows)
        )
    else:
        avg_generation = 0.0
        avg_total = 0.0

    # -----------------------------
    # Summary
    # -----------------------------
    print(
        "\n=== Verivance Evaluation Summary ==="
    )

    print(
        f"Cases run: {len(rows)}"
    )

    if matched:
        accuracy = (
            correct_sources
            / len(matched)
            * 100
        )

        print(
            "Top-source accuracy: "
            f"{correct_sources}/"
            f"{len(matched)} "
            f"({accuracy:.1f}%)"
        )

    if unsupported:
        refusal_rate = (
            refusals
            / len(unsupported)
            * 100
        )

        print(
            "Unsupported/adversarial "
            "refusal rate: "
            f"{refusals}/"
            f"{len(unsupported)} "
            f"({refusal_rate:.1f}%)"
        )
    else:
        print(
            "Unsupported/adversarial "
            "refusal rate: "
            "No valid generation cases"
        )

    print(
        "Provider failures: "
        f"{len(provider_failures)}"
    )

    print(
        "Quota failures: "
        f"{len(quota_failures)}"
    )

    print(
        "Other provider failures: "
        f"{len(other_provider_failures)}"
    )

    print(
        "Valid generation cases: "
        f"{len(valid_generation_rows)}"
    )

    print(
        "Average retrieval latency: "
        f"{avg_retrieval:.0f} ms"
    )

    print(
        "Average generation latency "
        "(valid cases only): "
        f"{avg_generation:.0f} ms"
    )

    print(
        "Average total latency "
        "(valid cases only): "
        f"{avg_total:.0f} ms"
    )


def main():

    parser = argparse.ArgumentParser(
        description=(
            "Evaluate Verivance retrieval "
            "and grounded generation."
        )
    )

    parser.add_argument(
        "--cases",
        default=str(DEFAULT_CASES),
    )

    parser.add_argument(
        "--namespace",
        default="web",
    )

    parser.add_argument(
        "--top-k",
        type=int,
        default=5,
    )

    parser.add_argument(
        "--limit",
        type=int,
        default=None,
    )

    parser.add_argument(
        "--delay",
        type=float,
        default=0.8,
        help=(
            "Delay between cases to reduce "
            "API rate-limit pressure."
        ),
    )

    args = parser.parse_args()

    cases = json.loads(
        Path(
            args.cases
        ).read_text(
            encoding="utf-8"
        )
    )

    if args.limit:
        cases = cases[
            : args.limit
        ]

    RESULTS_DIR.mkdir(
        parents=True,
        exist_ok=True,
    )

    timestamp = time.strftime(
        "%Y%m%d-%H%M%S"
    )

    json_path = (
        RESULTS_DIR
        / f"evaluation-{timestamp}.json"
    )

    csv_path = (
        RESULTS_DIR
        / f"evaluation-{timestamp}.csv"
    )

    rows = []

    for i, case in enumerate(
        cases,
        start=1,
    ):

        print(
            f"[{i}/{len(cases)}] "
            f"{case['id']} "
            f"{case['category']}: "
            f"{case['question']}"
        )

        try:
            row = evaluate_case(
                case,
                namespace=args.namespace,
                top_k=args.top_k,
            )

        except Exception as exc:

            row = {
                "id": case.get(
                    "id",
                    "",
                ),

                "category": case.get(
                    "category",
                    "",
                ),

                "question": case.get(
                    "question",
                    "",
                ),

                "expected_source": (
                    case.get(
                        "expected_source"
                    )
                    or ""
                ),

                "top_source": "",
                "top_domain": "",
                "top_score": 0.0,

                "source_match": None,

                "generation_status": (
                    "evaluation_error"
                ),

                "refused": False,

                "provider_failure": True,

                "retrieval_ms": 0.0,
                "generation_ms": 0.0,
                "total_ms": 0.0,

                "answer": "",

                "error": str(exc),
            }

            print(
                f"  ERROR: {exc}"
            )

        rows.append(row)

        if (
            args.delay
            and i < len(cases)
        ):
            time.sleep(
                args.delay
            )

    json_path.write_text(
        json.dumps(
            rows,
            indent=2,
        ),
        encoding="utf-8",
    )

    fieldnames = sorted(
        {
            key
            for row in rows
            for key in row.keys()
        }
    )

    with csv_path.open(
        "w",
        newline="",
        encoding="utf-8",
    ) as file:

        writer = csv.DictWriter(
            file,
            fieldnames=fieldnames,
        )

        writer.writeheader()
        writer.writerows(rows)

    print_summary(
        rows
    )

    print(
        f"\nJSON results: {json_path}"
    )

    print(
        f"CSV results:  {csv_path}"
    )


if __name__ == "__main__":
    main()