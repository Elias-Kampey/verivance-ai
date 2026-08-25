"use client";

import { useState } from "react";
import Composer from "@/components/Composer";
import EvidenceList from "@/components/EvidenceList";
import ProgressStages from "@/components/ProgressStages";
import { search } from "@/lib/api";
import { useHistory } from "@/lib/history";
import type { SearchResponse } from "@/types/verivance";

export default function SearchPage() {
  const [result, setResult] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { addEntry } = useHistory();

  async function handleSearch(query: string) {
    setLoading(true);
    setError(null);
    try {
      const response = await search(query);
      setResult(response);
      addEntry(query, response);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed.");
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-6 py-10">
      <div>
        <h1 className="text-2xl font-semibold text-white">Search</h1>
        <p className="mt-1 text-sm text-white/50">
          Answers are grounded in retrieved evidence. No evidence, no answer.
        </p>
      </div>

      <Composer onSubmit={handleSearch} disabled={loading} />

      <ProgressStages active={loading} />

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {result && !loading && (
        <div className="flex flex-col gap-6">
          {result.refused ? (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
              Verivance couldn&apos;t find supporting evidence for this question, so it&apos;s
              refusing to answer rather than guess.
            </div>
          ) : (
            <div className="rounded-lg border border-white/[0.06] bg-surface-raised px-4 py-3 text-sm text-white/90">
              {result.answer}
            </div>
          )}

          <div>
            <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-white/40">
              Evidence
            </h2>
            <EvidenceList evidence={result.evidence} />
          </div>
        </div>
      )}
    </div>
  );
}
