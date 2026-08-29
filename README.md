# Verivance.ai

**Source-first AI search with inspectable evidence.**

Verivance is a full-stack retrieval-augmented search engine that retrieves and ranks evidence before generating an answer.

Instead of treating the language model as the source of truth, Verivance searches a curated vector index first, falls back to live web retrieval when indexed evidence is weak, and exposes the sources, passages, relevance scores, and retrieval telemetry behind each response.

### [Try Verivance Live →](https://verivance-ai-web.vercel.app)

**GitHub:** https://github.com/Elias-Kampey/verivance-ai

---

## Why Verivance?

Large language models can produce convincing answers even when the underlying evidence is weak.

Verivance was built around a different workflow:

**question → retrieval → evidence → answer**

Before generating a response, Verivance:

1. Searches a curated Pinecone vector index.
2. Measures the relevance of the retrieved evidence.
3. Falls back to live Tavily web search when indexed evidence is insufficient.
4. Ranks and normalizes the retrieved sources.
5. Sends only the retrieved evidence to Gemini for grounded generation.
6. Returns the answer alongside citations and inspectable source passages.
7. Refuses to answer when sufficient evidence cannot be found.

The goal is not simply to produce an answer. It is to make the path from the user's question to that answer visible.

---

## Live Demo

### https://verivance-ai-web.vercel.app

The production application consists of:

- **Frontend:** Next.js + TypeScript on Vercel
- **Backend:** FastAPI on Render
- **Vector search:** Pinecone
- **Live web retrieval:** Tavily
- **Grounded generation:** Google Gemini

> The backend currently runs on Render's free tier. After a period of inactivity, the first request may take longer while the service wakes up.

---

## Features

- Semantic retrieval from a Pinecone vector index
- Live web fallback when indexed evidence is weak
- Grounded answer generation with Gemini
- Source-linked citations
- Ranked evidence and relevance percentages
- Retrieved passage inspection
- Evidence-strength indicators
- Retrieval latency and source analytics
- Explicit refusal behavior when no usable evidence is available
- Persistent browser search sessions
- Individual and bulk session deletion
- Shareable searches
- Responsive Next.js interface
- FastAPI REST API
- Production deployment with Vercel and Render

---

## Architecture

```mermaid
flowchart LR
    A[User Question] --> B[Next.js Frontend]
    B --> C[FastAPI API]

    C --> D[Pinecone Vector Search]
    D --> E{Evidence strong enough?}

    E -->|Yes| G[Ranked Evidence]
    E -->|No| F[Tavily Live Web Search]

    F --> G
    G --> H[Gemini Grounded Generation]

    H --> I[Answer]
    H --> J[Citations]
    H --> K[Evidence + Retrieval Telemetry]

    I --> B
    J --> B
    K --> B
```

---

## Retrieval Pipeline

### 1. Indexed retrieval

The user query is embedded and searched against the curated Pinecone corpus.

The system retrieves the top matching chunks and evaluates the strongest relevance score.

### 2. Evidence threshold

If the indexed evidence meets the configured relevance threshold, Verivance stays within the curated corpus.

If the evidence is missing or too weak, the system automatically switches to live web retrieval.

```text
Indexed evidence strong enough
        │
        ├── Yes → use Pinecone results
        │
        └── No  → search the live web with Tavily
```

### 3. Live web fallback

Tavily retrieves current web sources.

The results are normalized into the same evidence structure used by the local RAG pipeline so the generation layer does not need separate logic for indexed and web retrieval.

Each evidence item contains:

```json
{
  "rank": 1,
  "score": 0.918,
  "title": "Example source",
  "source": "https://example.com",
  "chunk_id": "web-001",
  "text": "Retrieved evidence..."
}
```

### 4. Grounded generation

Gemini receives the user question and the retrieved evidence.

The generation prompt instructs the model to:

- answer only from the supplied evidence
- cite the supplied source IDs
- treat retrieved text as untrusted data
- ignore instructions contained inside retrieved documents
- refuse when the evidence does not support an answer

### 5. Evidence-first response

The frontend displays:

- generated answer
- clickable citations
- source cards
- retrieved passages
- source rankings
- relevance percentages
- evidence-strength assessment
- retrieval latency

---

## Reliability Design

Verivance does not treat language-model output as inherently reliable.

Several design decisions are used to reduce unsupported generation:

- Generation is restricted to retrieved evidence.
- Weak indexed retrieval triggers live web search.
- Retrieved documents are treated as untrusted data.
- Source IDs are explicitly supplied to the model.
- Citations link back to the retrieved sources.
- No-evidence cases return a refusal instead of a fabricated response.
- Users can inspect the passages supplied to the model.
- Retrieval metrics are exposed rather than hidden.

### About the relevance percentage

Values such as:

```text
91.8% relevance
```

represent the retrieval system's relevance score for a source.

They are **not** a calibrated probability that the generated answer is 91.8% correct.

---

## Retrieval Evaluation

A small curated retrieval benchmark was used during development to verify whether the expected source appeared in the results for known queries.

Final benchmark results:

| Metric | Result |
|---|---:|
| Expected source in Top 5 | 10 / 10 |
| Expected source at Rank 1 | 10 / 10 |

These results apply only to the project's curated development evaluation set and should not be interpreted as general-purpose search accuracy.

The evaluation was used primarily to validate retrieval behavior while iterating on chunking, ingestion, embeddings, and ranking.

---

## Tech Stack

### Backend

- Python
- FastAPI
- Pydantic
- Pinecone
- Google GenAI
- Gemini
- Tavily Search API
- Requests
- Beautiful Soup

### Frontend

- Next.js
- React
- TypeScript
- Tailwind CSS
- Framer Motion
- React Markdown
- Lucide React

### Infrastructure

- Vercel
- Render
- Pinecone
- GitHub

---

## API

The production backend exposes a small FastAPI interface.

### Health Check

```http
GET /api/health
```

Response:

```json
{
  "status": "ok"
}
```

---

### Search

```http
POST /api/search
```

Example request:

```json
{
  "question": "What is hybrid search?",
  "top_k": 5,
  "namespace": "web"
}
```

Example response:

```json
{
  "question": "What is hybrid search?",
  "answer": "Hybrid search combines multiple retrieval approaches...",
  "results": [
    {
      "rank": 1,
      "score": 0.91,
      "title": "Example source",
      "source": "https://example.com",
      "chunk_id": "source-001",
      "text": "Retrieved evidence..."
    }
  ],
  "latency_ms": 4200,
  "chunks_retrieved": 5,
  "refused": false
}
```

---

### Sources

```http
GET /api/sources
```

The endpoint is designed to expose indexed-source summaries when source enumeration is available in the retrieval layer.

---

## Project Structure

```text
verivance-ai/
│
├── app.py
│   └── FastAPI application and API routes
│
├── config/
│   └── Environment and runtime configuration
│
├── data/
│   └── Corpus manifests and ingestion data
│
├── rag/
│   ├── retrieval.py
│   │   └── Pinecone semantic retrieval
│   │
│   ├── generation.py
│   │   └── Grounded Gemini generation
│   │
│   └── web_retrieval.py
│       └── Tavily live-web fallback
│
├── scripts/
│   └── Corpus, ingestion, and evaluation utilities
│
├── src/
│   └── Supporting ingestion and corpus utilities
│
├── tests/
│   └── Retrieval and backend tests
│
├── utils/
│   └── Shared utilities
│
├── frontend/
│   ├── public/
│   ├── src/
│   │   └── app/
│   ├── package.json
│   └── next.config.ts
│
├── .env.example
├── .gitignore
├── .python-version
├── requirements.txt
└── README.md
```

---

## Local Development

### Prerequisites

You will need:

- Python 3.12+
- Node.js
- npm
- Pinecone account
- Google Gemini API key
- Tavily API key

---

### 1. Clone the repository

```bash
git clone https://github.com/Elias-Kampey/verivance-ai.git
cd verivance-ai
```

---

### 2. Create the Python environment

Windows PowerShell:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

---

### 3. Configure environment variables

Create a `.env` file in the repository root.

You can use `.env.example` as the template.

```env
PINECONE_API_KEY=
PINECONE_INDEX_NAME=verivance-rag
PINECONE_NAMESPACE=web

GEMINI_API_KEY=
GEMINI_MODEL=gemini-3.6-flash

TAVILY_API_KEY=

WEB_FALLBACK_THRESHOLD=0.72
```

Never commit your real `.env` file or API keys.

---

### 4. Start the FastAPI backend

From the repository root:

```powershell
python -m uvicorn app:app --reload --port 8000
```

API:

```text
http://localhost:8000
```

Interactive API documentation:

```text
http://localhost:8000/docs
```

Health check:

```text
http://localhost:8000/api/health
```

---

### 5. Start the frontend

Open another terminal:

```powershell
cd frontend
npm install
npm run dev
```

Open:

```text
http://localhost:3000
```

By default, the frontend connects to:

```text
http://localhost:8000
```

You can override this with:

```env
NEXT_PUBLIC_API_URL=
```

---

## Testing

## Evaluation

Verivance includes retrieval and end-to-end evaluation scripts for testing
retrieval quality, refusal behavior, latency, and adversarial prompts.

The evaluation harness was used throughout development while the corpus and
retrieval architecture evolved.

Because the production system now combines a curated Pinecone corpus with
live-web fallback, historical benchmark results are not presented as a
general-purpose accuracy score.

### Retrieval benchmark

From the repository root:

```powershell
python -m tests.evaluate_retrieval

### Frontend production build

```powershell
cd frontend
npm run build
```

A successful production build should complete TypeScript validation and generate the Next.js application without errors.

---

## Deployment

### Backend — Render

The FastAPI backend is deployed from the repository root.

Build command:

```bash
pip install -r requirements.txt
```

Start command:

```bash
uvicorn app:app --host 0.0.0.0 --port $PORT
```

Production environment variables include:

```text
PINECONE_API_KEY
PINECONE_INDEX_NAME
PINECONE_NAMESPACE
GEMINI_API_KEY
GEMINI_MODEL
TAVILY_API_KEY
WEB_FALLBACK_THRESHOLD
```

---

### Frontend — Vercel

The Vercel project uses:

```text
Root Directory: frontend
Framework: Next.js
```

Production frontend environment variable:

```text
NEXT_PUBLIC_API_URL=https://verivance-ai.onrender.com
```

No Pinecone, Gemini, or Tavily secrets are exposed to the frontend.

---

## Corpus

Verivance supports a curated indexed corpus in addition to live web retrieval.

During development, source ingestion was cleaned to remove navigation, scripts, headers, footers, SVG content, and large example-code blocks that could introduce irrelevant text into retrieval.

This significantly reduced noisy chunks and improved the quality of semantic retrieval.

---

## Search Sessions

Search results are stored locally in the browser so previous sessions can be reopened without making another API request.

Current session features include:

- persistent browser history
- reopening previous answers without rerunning retrieval
- individual session deletion
- confirmed clear-all behavior
- duplicate-question replacement
- capped local session history

Session data is browser-local and is not synchronized between devices.

---

## Security and Grounding

Retrieved web content is treated as **untrusted input**.

The generation layer explicitly separates retrieved evidence from model instructions and instructs the model not to follow commands that appear inside retrieved documents.

Secrets such as:

- Pinecone API keys
- Gemini API keys
- Tavily API keys

remain server-side and are never included in the public Next.js bundle.

---

## Current Limitations

Verivance is a portfolio and research project rather than a production search platform.

Current limitations include:

- relevance scores are not calibrated confidence probabilities
- the evaluation dataset is intentionally small
- source quality scoring is still heuristic
- the live web path depends on third-party search availability
- answer quality is bounded by the retrieved evidence
- browser sessions are stored locally rather than in a user account
- Render's free hosting tier may introduce cold-start latency
- the system does not currently perform a separate learned reranking stage

---

## Future Improvements

Planned or potential improvements include:

- learned or cross-encoder reranking
- larger retrieval evaluation datasets
- automated RAG evaluation
- source-authority modeling
- query rewriting
- result caching
- streaming generation
- conversation-aware follow-up retrieval
- authentication
- cloud-synchronized search history
- document uploads
- additional vector namespaces
- observability and production tracing
- automated regression tests for retrieval quality

---

## What I Learned

Building Verivance reinforced that RAG is not simply a matter of connecting an LLM to a vector database.

The harder engineering questions are often:

- How should documents be chunked?
- When is retrieved evidence actually strong enough?
- When should the system search somewhere else?
- How should multiple retrieval paths share a common interface?
- How should unsupported questions fail?
- How much of the retrieval process should be visible to the user?
- How do you evaluate retrieval independently from generation?

Verivance was built as an exploration of those questions.

---

## Contributors

**Elias Kampey**
Backend, retrieval architecture, RAG pipeline, API integration, and deployment.

**MK**
Frontend and UI development, and deployment.

---

## Links

**Live Application**
https://verivance-ai-web.vercel.app

**Repository**
https://github.com/Elias-Kampey/verivance-ai

---

## Disclaimer

Verivance is a portfolio and research project.

Generated answers and retrieved sources should be independently verified before being used for medical, legal, financial, safety-critical, or other high-stakes decisions.
