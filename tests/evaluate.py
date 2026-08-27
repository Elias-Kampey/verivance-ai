import argparse
import csv
import json
import time
from pathlib import Path
from urllib.parse import urlparse

from rag.generation import REFUSAL_MESSAGE, generate_answer
from rag.retrieval import search


DEFAULT_CASES = Path("tests/evaluation_cases.json")
RESULTS_DIR = Path("tests/results")


def domain_from_url(url: str) -> str:
    if not url:
        return ""
    try:
        return urlparse(url).netloc.lower().removeprefix("www.")
    except Exception:
        return ""


def evaluate_case(case: dict, namespace: str, top_k: int) -> dict:
    question = case["question"]
    started = time.perf_counter()

    retrieval_started = time.perf_counter()
    results = search(question, top_k=top_k, namespace=namespace)
    retrieval_ms = (time.perf_counter() - retrieval_started) * 1000

    generation_started = time.perf_counter()
    answer = generate_answer(question, results)
    generation_ms = (time.perf_counter() - generation_started) * 1000

    total_ms = (time.perf_counter() - started) * 1000

    top = results[0] if results else {}
    top_source = str(top.get("source") or "")
    top_domain = domain_from_url(top_source)
    expected_source = case.get("expected_source")

    source_match = None
    if expected_source:
        source_match = expected_source.lower() in top_domain

    refused = answer.strip() == REFUSAL_MESSAGE

    return {
        "id": case.get("id", ""),
        "category": case.get("category", ""),
        "question": question,
        "expected_source": expected_source or "",
        "top_source": top_source,
        "top_domain": top_domain,
        "top_score": float(top.get("score", 0.0) or 0.0),
        "source_match": source_match,
        "refused": refused,
        "retrieval_ms": round(retrieval_ms, 1),
        "generation_ms": round(generation_ms, 1),
        "total_ms": round(total_ms, 1),
        "answer": answer,
    }


def print_summary(rows: list[dict]) -> None:
    if not rows:
        print("No evaluation rows were produced.")
        return

    matched = [r for r in rows if r["source_match"] is not None]
    correct_sources = sum(bool(r["source_match"]) for r in matched)
    avg_retrieval = sum(r["retrieval_ms"] for r in rows) / len(rows)
    avg_generation = sum(r["generation_ms"] for r in rows) / len(rows)
    avg_total = sum(r["total_ms"] for r in rows) / len(rows)

    unsupported = [r for r in rows if r["category"] in {"unanswerable", "prompt_injection"}]
    refusals = sum(bool(r["refused"]) for r in unsupported)

    print("\n=== Verivance Evaluation Summary ===")
    print(f"Cases run: {len(rows)}")
    if matched:
        print(f"Top-source accuracy: {correct_sources}/{len(matched)} ({correct_sources / len(matched) * 100:.1f}%)")
    if unsupported:
        print(f"Unsupported/adversarial refusal rate: {refusals}/{len(unsupported)} ({refusals / len(unsupported) * 100:.1f}%)")
    print(f"Average retrieval latency: {avg_retrieval:.0f} ms")
    print(f"Average generation latency: {avg_generation:.0f} ms")
    print(f"Average total latency: {avg_total:.0f} ms")


def main():
    parser = argparse.ArgumentParser(description="Evaluate Verivance retrieval and grounded generation.")
    parser.add_argument("--cases", default=str(DEFAULT_CASES))
    parser.add_argument("--namespace", default="web")
    parser.add_argument("--top-k", type=int, default=5)
    parser.add_argument("--limit", type=int, default=None)
    parser.add_argument("--delay", type=float, default=0.8, help="Delay between cases to reduce API rate-limit pressure.")
    args = parser.parse_args()

    cases = json.loads(Path(args.cases).read_text(encoding="utf-8"))
    if args.limit:
        cases = cases[: args.limit]

    RESULTS_DIR.mkdir(parents=True, exist_ok=True)
    timestamp = time.strftime("%Y%m%d-%H%M%S")
    json_path = RESULTS_DIR / f"evaluation-{timestamp}.json"
    csv_path = RESULTS_DIR / f"evaluation-{timestamp}.csv"

    rows = []
    for i, case in enumerate(cases, start=1):
        print(f"[{i}/{len(cases)}] {case['id']} {case['category']}: {case['question']}")
        try:
            row = evaluate_case(case, namespace=args.namespace, top_k=args.top_k)
        except Exception as exc:
            row = {
                "id": case.get("id", ""),
                "category": case.get("category", ""),
                "question": case.get("question", ""),
                "expected_source": case.get("expected_source") or "",
                "top_source": "",
                "top_domain": "",
                "top_score": 0.0,
                "source_match": None,
                "refused": False,
                "retrieval_ms": 0.0,
                "generation_ms": 0.0,
                "total_ms": 0.0,
                "answer": "",
                "error": str(exc),
            }
            print(f"  ERROR: {exc}")
        rows.append(row)
        if args.delay and i < len(cases):
            time.sleep(args.delay)

    json_path.write_text(json.dumps(rows, indent=2), encoding="utf-8")

    fieldnames = sorted({key for row in rows for key in row.keys()})
    with csv_path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)

    print_summary(rows)
    print(f"\nJSON results: {json_path}")
    print(f"CSV results:  {csv_path}")


if __name__ == "__main__":
    main()
