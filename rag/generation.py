import os

from dotenv import load_dotenv
from google import genai


load_dotenv()


def generate_answer(
    question: str,
    results: list[dict],
) -> str:
    """Generate an answer using retrieved evidence only."""

    api_key = os.getenv("GEMINI_API_KEY")

    if not api_key:
        raise ValueError(
            "GEMINI_API_KEY is missing from .env"
        )

    client = genai.Client(api_key=api_key)

    evidence_parts = []

    for result in results:
        evidence_parts.append(
            f"""
SOURCE {result['rank']}
Title: {result['title']}
URL: {result['source']}
Chunk ID: {result['chunk_id']}

Evidence:
{result['text']}
"""
        )

    evidence = "\n".join(evidence_parts)

    prompt = f"""
You are Verivance, an evidence-grounded research assistant.

Answer the user's question ONLY using the retrieved evidence below.

Rules:
1. Do not use outside knowledge.
2. Do not invent facts.
3. Cite factual claims using [Source 1], [Source 2], etc.
4. If the retrieved evidence does not adequately answer the question, say exactly:
"I cannot answer this confidently from the available evidence."
5. Be concise and clear.
6. Do not claim certainty beyond the evidence.

USER QUESTION:
{question}

RETRIEVED EVIDENCE:
{evidence}
"""

    response = client.models.generate_content(
    model="gemini-3.6-flash",
    contents=prompt,
)

    return response.text