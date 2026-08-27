"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { SearchResponse } from "@/types/verivance";

const STORAGE_KEY = "verivance:history";
const MAX_ENTRIES = 50;

export interface HistoryEntry {
  id: string;
  query: string;
  timestamp: number;
  refused: boolean;
  evidenceCount: number;
  latencyMs: number;
  topScore: number | null;
  sourcesTouched: string[];
}

interface HistoryContextValue {
  entries: HistoryEntry[];
  addEntry: (query: string, response: SearchResponse) => void;
  clear: () => void;
}

const HistoryContext = createContext<HistoryContextValue | null>(null);

function toEntry(query: string, response: SearchResponse): HistoryEntry {
  const scores = response.results.map((e) => e.score);
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    query,
    timestamp: Date.now(),
    refused: response.refused,
    evidenceCount: response.results.length,
    latencyMs: response.latency_ms,
    topScore: scores.length > 0 ? Math.max(...scores) : null,
    sourcesTouched: Array.from(
      new Set(response.results.map((e) => e.title))
    ),
  };
}

export function HistoryProvider({ children }: { children: ReactNode }) {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // Read localStorage in an effect, not during initial render, so the
  // server-rendered markup and the first client render match — reading it
  // eagerly in useState would desync SSR output from what's on disk and
  // trigger a hydration mismatch.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setEntries(JSON.parse(raw) as HistoryEntry[]);
    } catch {
      // Corrupt or inaccessible storage — start fresh rather than crash.
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    } catch {
      // Storage full or unavailable (private browsing) — history just
      // won't persist across reloads.
    }
  }, [entries, hydrated]);

  function addEntry(query: string, response: SearchResponse) {
    setEntries((prev) => [toEntry(query, response), ...prev].slice(0, MAX_ENTRIES));
  }

  function clear() {
    setEntries([]);
  }

  return (
    <HistoryContext.Provider value={{ entries, addEntry, clear }}>
      {children}
    </HistoryContext.Provider>
  );
}

export function useHistory(): HistoryContextValue {
  const ctx = useContext(HistoryContext);
  if (!ctx) throw new Error("useHistory must be used within a HistoryProvider");
  return ctx;
}
