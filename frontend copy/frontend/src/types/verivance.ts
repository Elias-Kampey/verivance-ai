// Mirrors the Pydantic models in api/main.py. Change one, change the other
// in the same commit — this file does not exist in api/main.py yet, so
// these shapes are a proposal, not a confirmed contract.

export interface Evidence {
  chunk_id: string;
  source_title: string;
  source_url: string;
  relevance_score: number;
  text: string;
}

export interface SearchResponse {
  query: string;
  answer: string | null;
  refused: boolean;
  evidence: Evidence[];
  latency_ms: number;
}

export interface SourceSummary {
  title: string;
  url: string;
  chunk_count: number;
  indexed: boolean;
}

export interface HealthResponse {
  status: string;
}
