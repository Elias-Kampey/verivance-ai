import type { HealthResponse, SearchResponse, SourceSummary } from "@/types/verivance";

// The only place that calls fetch(). Base URL comes from env so nothing
// hardcodes localhost:8000 outside this file.
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      headers: { "Content-Type": "application/json" },
      ...init,
    });
  } catch {
    // fetch() throws a raw TypeError ("Failed to fetch") when the backend
    // is unreachable — surface something a non-developer can act on.
    throw new Error("Can't reach the Verivance API. Is the backend running?");
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Verivance API error (${res.status}): ${body || res.statusText}`);
  }

  return res.json() as Promise<T>;
}

export function checkHealth(): Promise<HealthResponse> {
  return request<HealthResponse>("/api/health");
}

export function search(query: string): Promise<SearchResponse> {
  return request<SearchResponse>("/api/search", {
    method: "POST",
    body: JSON.stringify({ question: query }),
  });
}

export function listSources(): Promise<SourceSummary[]> {
  return request<SourceSummary[]>("/api/sources");
}
