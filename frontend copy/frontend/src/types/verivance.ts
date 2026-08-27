// Mirrors the Pydantic models in api/main.py. Change one, change the other
// in the same commit — this file does not exist in api/main.py yet, so
// these shapes are a proposal, not a confirmed contract.

export interface Evidence {
  rank: number;
  score: number;
  title: string;
  source: string;
  chunk_id: string;
  text: string;
}

export interface SearchResponse {
  question: string;
  answer: string;
  results: Evidence[];
  latency_ms: number;
  chunks_retrieved: number;
  refused: boolean;
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
