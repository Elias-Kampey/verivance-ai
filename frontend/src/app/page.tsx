
"use client";
import {
  ArrowUp,
  BarChart3,
  BookOpen,
  ChevronDown,
  CirclePlus,
  Database,
  Globe2,
  History,
  Link2,
  Loader2,
  MessageSquareText,
  PanelLeft,
  Search,
  Share2,
  CheckCircle2,
  ShieldCheck,
  Sparkles,
  XCircle,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import {
  FormEvent,
  KeyboardEvent,
  ReactNode,
  useEffect,
  useMemo,
  useState,
} from "react";

type Evidence = {
  rank: number;
  score: number;
  title: string;
  source: string;
  chunk_id: string;
  text: string;
};

type SearchResponse = {
  question: string;
  answer: string;
  results: Evidence[];
  latency_ms: number;
  chunks_retrieved: number;
  refused: boolean;
};

type SavedSession = {
  id: string;
  question: string;
  result: SearchResponse;
  createdAt: number;
};

type View = "answer" | "sources" | "retrieval";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const HERO_LINES = [
  "What do you want to know?",
  "What evidence supports this?",
  "Where did this answer come from?",
  "Which source should we trust?",
];

const SMART_PROMPTS = [
  {
    label: "Explain semantic search",
    query: "How does semantic search work?",
  },
  {
    label: "Explain hybrid search",
    query: "What is hybrid search?",
  }
]


function formatScore(score: number): string {
  if (!Number.isFinite(score)) {
    return "—";
  }

  return `${(score * 100).toFixed(1)}%`;
}

function linkifyCitations(answer: string, results: Evidence[]): string {
  const sourceMap = new Map(
    results
      .filter((result) => Boolean(result.source))
      .map((result) => [result.chunk_id, result.source])
  );

  return answer.replace(/\[([^\]]+)\]/g, (full, contents: string) => {
    const ids = contents
      .split(",")
      .map((item) => item.replace(/SOURCE_ID:\s*/gi, "").trim())
      .filter(Boolean);

    if (ids.length === 0 || !ids.every((id) => sourceMap.has(id))) {
      return full;
    }

    return ids
      .map((id) => {
        const url = sourceMap.get(id)!.replace(/\)/g, "%29");
        return `[${id}](${url})`;
      })
      .join(" ");
  });
}

export default function Home() {
  const [query, setQuery] = useState("");
  const [activeQuestion, setActiveQuestion] = useState("");
  const [sessions, setSessions] = useState<SavedSession[]>([]);
  const [sessionsLoaded, setSessionsLoaded] = useState(false);
  const [view, setView] = useState<View>("answer");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [confirmClearHistory, setConfirmClearHistory] = useState(false);

  const [result, setResult] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("verivance:sessions");

      if (saved) {
        setSessions(JSON.parse(saved));
      }

      const params = new URLSearchParams(window.location.search);
      const sharedQuery = params.get("q");

      if (sharedQuery) {
        setQuery(sharedQuery);
        runSearch(sharedQuery);
      }
    } catch {
      localStorage.removeItem("verivance:sessions");
    } finally {
      setSessionsLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!sessionsLoaded) return;

    try {
      localStorage.setItem(
        "verivance:sessions",
        JSON.stringify(sessions)
      );
    } catch {
      // Local storage may be unavailable in private/restricted browsing.
    }
  }, [sessions, sessionsLoaded]);

  useEffect(() => {
    fetch(`${API_URL}/api/health`).catch(() => {
      // Wake Render silently.
    });
  }, []);

  async function runSearch(raw: string) {
    const question = raw.trim();

    if (!question) {
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);
    setActiveQuestion(question);
    setView("answer");

    try {
      const controller = new AbortController();

      const timeout = window.setTimeout(() => {
        controller.abort();
      }, 60000);

      const response = await fetch(`${API_URL}/api/search`, {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question,
          top_k: 5,
          namespace: "web",
        }),
      });

      window.clearTimeout(timeout);

      const body = await response.json();

      if (!response.ok) {
        throw new Error(body.detail || "Search failed.");
      }

      const searchResult = body as SearchResponse;

      setResult(searchResult);

      setSessions((current) => {
        const filtered = current.filter(
          (session) =>
            session.question.toLowerCase() !== question.toLowerCase()
        );

        const newSession: SavedSession = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          question,
          result: searchResult,
          createdAt: Date.now(),
        };

        return [newSession, ...filtered].slice(0, 20);
      });
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        setError(
          "Verivance is taking longer than expected. The search service may still be starting up — please try again in a moment."
        );
      } else {
        setError(
          err instanceof Error
            ? err.message
            : "Could not connect to the local Verivance backend."
        );
      }
    } finally {
      setLoading(false);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!query.trim()) {
      return;
    }

    runSearch(query);
    setQuery("");
  }

  function keyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();

      if (!query.trim()) {
        return;
      }

      runSearch(query);
      setQuery("");
    }
  }

  function newSearch() {
    setQuery("");
    setActiveQuestion("");
    setResult(null);
    setError("");
    setLoading(false);
    setView("answer");
  }

  function openSession(session: SavedSession) {
    setQuery("");
    setActiveQuestion(session.question);
    setResult(session.result);
    setError("");
    setLoading(false);
    setView("answer");
  }

  function removeSession(sessionId: string) {
    setSessions((current) =>
      current.filter((session) => session.id !== sessionId)
    );
  }

  function clearHistory() {
    setSessions([]);
    localStorage.removeItem("verivance:sessions");
    setConfirmClearHistory(false);
  }

  const bestScore = useMemo(() => {
    if (!result?.results?.length) {
      return "—";
    }

    return formatScore(result.results[0].score);
  }, [result]);

  return (
    <main className="min-h-screen bg-[#111110] text-[#e9e5dc]">
      <StyleLayer />
      <Background />

      <AnimatePresence>
        {sidebarOpen && (
          <motion.aside
            initial={{ x: -260 }}
            animate={{ x: 0 }}
            exit={{ x: -260 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="fixed inset-y-0 left-0 z-30 w-[260px] border-r border-white/[0.08] bg-[#181816]/95 backdrop-blur-xl"
          >
            <div className="flex h-full flex-col">
          <div className="flex h-16 items-center justify-between px-5">
            <div className="flex items-center gap-3">
              <img
                src="/Logo.png"
                alt="Verivance logo"
                className="h-12 w-12 object-contain"
              />

              <div>
                <div className="text-[18px] font-semibold tracking-[-0.04em]">
                  Verivance AI
                </div>


              </div>
            </div>

            <button
              onClick={() => setSidebarOpen(false)}
              aria-label="Close sidebar"
              className="rounded-lg p-2 text-[#858078] transition hover:bg-white/[0.06]"
            >
              <PanelLeft size={18} />
            </button>
          </div>

          <div className="px-3">
            <button
              onClick={newSearch}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-[15px] text-[#d8d2c8] transition hover:bg-white/[0.06]"
            >
              <CirclePlus size={19} />
              New Search
            </button>


            <SidebarButton
              active={view === "sources"}
              icon={<Link2 size={18} />}
              label="Sources"
              onClick={() => setView("sources")}
            />

            <SidebarButton
              active={view === "retrieval"}
              icon={<BarChart3 size={18} />}
              label="Retrieval"
              onClick={() => setView("retrieval")}
            />

          </div>

          <div className="mt-7 px-5">
            <div className="mb-3 flex items-center justify-between text-[13px] text-[#7b756d]">
              <span>Sessions</span>

              <div className="flex items-center gap-2">
                {sessions.length > 0 &&
                  (confirmClearHistory ? (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setConfirmClearHistory(false)}
                        className="rounded-md px-1.5 py-1 text-[11px] text-[#7f776e] transition hover:bg-white/[0.05] hover:text-[#d8d2c8]"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={clearHistory}
                        className="rounded-md px-1.5 py-1 text-[11px] text-[#ff737b] transition hover:bg-[#ef1b24]/10 hover:text-[#ff9298]"
                      >
                        Confirm
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmClearHistory(true)}
                      className="rounded-md px-1.5 py-1 text-[11px] text-[#7f776e] transition hover:bg-white/[0.05] hover:text-[#d8d2c8]"
                      aria-label="Clear all search history"
                      title="Clear all search history"
                    >
                      Clear all
                    </button>
                  ))}
                <ChevronDown size={15} />
              </div>
            </div>

            <div className="space-y-1">
              {sessions.length === 0 ? (
                <p className="rounded-lg py-2 text-sm text-[#5d574f]">
                  No searches yet.
                </p>
              ) : (
                sessions.map((session) => (
                  <div
                    key={session.id}
                    className="group flex items-center rounded-lg transition hover:bg-white/[0.055]"
                  >
                    <button
                      type="button"
                      onClick={() => openSession(session)}
                      className="flex min-w-0 flex-1 items-center gap-2 px-2 py-2 text-left text-sm text-[#b9b2a8] transition group-hover:text-white"
                    >
                      <History
                        size={14}
                        className="shrink-0 text-[#706a62] transition group-hover:text-[#ef1b24]"
                      />

                      <span className="truncate">{session.question}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => removeSession(session.id)}
                      aria-label={`Remove "${session.question}" from history`}
                      title="Remove session"
                      className="mr-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[#625c55] opacity-0 transition hover:bg-[#ef1b24]/10 hover:text-[#ff737b] group-hover:opacity-100 focus:opacity-100"
                    >
                      <XCircle size={13} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="mt-auto border-t border-white/[0.08] p-4">
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.025] px-4 py-3">
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-[#766f66]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#ef1b24]" />
                Local RAG Engine
              </div>

              <div className="mt-2 text-sm text-[#b9b2a8]">
                Search • Retrieve • Rank
              </div>
            </div>
          </div>
        </div>
      </motion.aside>
    )}
  </AnimatePresence>

      <section
        className={`relative z-10 min-h-screen transition-[margin] duration-200 ${
          sidebarOpen ? "ml-[260px]" : "ml-0"
        }`}
      >
        {!sidebarOpen && (
          <button
            onClick={() => setSidebarOpen(true)}
            aria-label="Open sidebar"
            className="fixed left-4 top-4 z-40 rounded-lg border border-white/[0.08] bg-[#181816]/90 p-2 text-[#aaa298] backdrop-blur-xl transition hover:bg-white/[0.07] hover:text-white"
          >
            <PanelLeft size={18} />
          </button>
        )}
        <TopBar view={view} setView={setView} result={result} />

        <div className="mx-auto max-w-[880px] px-8 pb-36">
          {!activeQuestion && view === "answer" && (
            <EmptyState
              query={query}
              setQuery={setQuery}
              submit={submit}
              keyDown={keyDown}
              loading={loading}
              runSearch={runSearch}
            />
          )}

          {!activeQuestion && view !== "answer" && (
            <PreSearchPage view={view} runSearch={runSearch} />
          )}

          {activeQuestion && (
            <ResultShell
              query={query}
              setQuery={setQuery}
              submit={submit}
              keyDown={keyDown}
              loading={loading}
              error={error}
              activeQuestion={activeQuestion}
              result={result}
              view={view}
              bestScore={bestScore}
              sidebarOpen={sidebarOpen}
            />
          )}
        </div>
      </section>
    </main>
  );
}

function EmptyState({
  query,
  setQuery,
  submit,
  keyDown,
  loading,
  runSearch,
}: {
  query: string;
  setQuery: (value: string) => void;
  submit: (event: FormEvent<HTMLFormElement>) => void;
  keyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
  loading: boolean;
  runSearch: (question: string) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex min-h-[calc(100vh-80px)] flex-col justify-center pb-28"
    >

      <RotatingHeadline />

      <p className="mx-auto mt-4 max-w-[610px] text-center text-[15px] leading-7 text-[#898177]">
        Ask anything. Verivance searches trusted indexed knowledge and the web when needed,
        ranks the evidence, and shows exactly where the answer came from.
      </p>

      <Composer
        query={query}
        setQuery={setQuery}
        submit={submit}
        keyDown={keyDown}
        loading={loading}
        large
      />

      <div className="mt-5 flex justify-center gap-2">
        <MiniChip icon={<ShieldCheck size={14} />} text="Grounded" />
        <MiniChip icon={<BookOpen size={14} />} text="Source-first" />
        <MiniChip icon={<BarChart3 size={14} />} text="Ranked evidence" />
      </div>

      <PromptDeck runSearch={runSearch} />

    </motion.div>
  );
}

function ResultShell({
  query,
  setQuery,
  submit,
  keyDown,
  loading,
  error,
  activeQuestion,
  result,
  view,
  bestScore,
  sidebarOpen,
}: {
  query: string;
  setQuery: (value: string) => void;
  submit: (event: FormEvent<HTMLFormElement>) => void;
  keyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
  loading: boolean;
  error: string;
  activeQuestion: string;
  result: SearchResponse | null;
  view: View;
  bestScore: string;
  sidebarOpen: boolean;
}) {
  return (
    <div className="pt-10">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="mb-5 flex items-center gap-2 text-sm text-[#827a70]">
          <Globe2 size={16} />
          Searching evidence
          <ChevronDown size={15} />
        </div>

        <h1 className="max-w-[780px] text-[32px] font-normal leading-tight tracking-[-0.045em] text-[#f3efe8]">
          {activeQuestion}
        </h1>
      </motion.div>

      <div className="mt-9">
        <AnimatePresence mode="wait">
          {loading && (
            <motion.div
              key="loading"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
            >
              <LoadingAnswer />
            </motion.div>
          )}

          {error && !loading && (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="rounded-2xl border border-[#ef1b24]/25 bg-[#ef1b24]/10 p-5 text-[#ff9ba1]"
            >
              <div className="mb-2 flex items-center gap-2 font-medium">
                <XCircle size={18} />
                Connection problem
              </div>

              {error}
            </motion.div>
          )}

          {result && !loading && view === "answer" && (
            <motion.div
              key="answer"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
            >
              <AnswerView result={result} bestScore={bestScore} />
            </motion.div>
          )}

          {result && !loading && view === "sources" && (
            <motion.div
              key="sources"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
            >
              <SourcesView result={result} />
            </motion.div>
          )}

          {result && !loading && view === "retrieval" && (
            <motion.div
              key="retrieval"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
            >
              <RetrievalView result={result} bestScore={bestScore} />
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {!loading && result && (
        <div
          className={`fixed bottom-5 right-0 z-20 flex justify-center px-8 transition-[left] duration-200 ${
            sidebarOpen ? "left-[260px]" : "left-0"
          }`}
        >
          <div className="w-full max-w-[760px]">
            <Composer
              query={query}
              setQuery={setQuery}
              submit={submit}
              keyDown={keyDown}
              loading={loading}
              compact
            />
          </div>
        </div>
      )}
    </div>
  );
}

function AnswerView({
  result,
  bestScore,
}: {
  result: SearchResponse;
  bestScore: string;
}) {
  const topSources = result.results.slice(0, 3);
  const [selectedEvidence, setSelectedEvidence] = useState<Evidence | null>(null);
  const [shared, setShared] = useState(false);

  const confidence = getEvidenceConfidence(result.results);

  async function shareSearch() {
    const url = new URL(window.location.href);
    url.search = "";
    url.searchParams.set("q", result.question);

    try {
      if (navigator.share) {
        await navigator.share({
          title: `Verivance: ${result.question}`,
          text: "View this Verivance search",
          url: url.toString(),
        });
      } else {
        await navigator.clipboard.writeText(url.toString());
        setShared(true);
        window.setTimeout(() => setShared(false), 1800);
      }
    } catch {
      // User cancelled share sheet or clipboard was unavailable.
    }
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center gap-2">
        {topSources.map((source) => (
          <SourcePill key={source.chunk_id} source={source} />
        ))}

        <button
          onClick={shareSearch}
          className="ml-auto inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-xs text-[#aaa298] transition hover:bg-white/[0.07] hover:text-white"
        >
          {shared ? <CheckCircle2 size={13} /> : <Share2 size={13} />}
          {shared ? "Link copied" : "Share"}
        </button>
      </div>

      <article className="prose-answer">
        <ReactMarkdown
          components={{
            a: ({ href, children }) => (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
              >
                {children}
              </a>
            ),
          }}
        >
          {linkifyCitations(result.answer, result.results)}
        </ReactMarkdown>
      </article>

      <div className="mt-6">
        <ConfidenceCard confidence={confidence} />
      </div>

      <div className="mt-8 grid grid-cols-3 gap-3">
        <Metric label="Sources" value={String(result.chunks_retrieved)} />
        <Metric label="Best match" value={bestScore} />
        <Metric label="Response" value={`${result.latency_ms} ms`} />
      </div>

      <div className="mt-8">
        <h2 className="mb-3 text-[20px] font-medium tracking-[-0.03em]">
          Evidence
        </h2>

        <div className="space-y-3">
          {result.results.slice(0, 3).map((source) => (
            <EvidencePreview key={source.chunk_id} source={source} />
          ))}
        </div>
      </div>

      <AnimatePresence>
        {selectedEvidence && (
          <EvidenceInspector
            source={selectedEvidence}
            onClose={() => setSelectedEvidence(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function CitedAnswer({
  answer,
  results,
  onCitationClick,
}: {
  answer: string;
  results: Evidence[];
  onCitationClick: (source: Evidence) => void;
}) {
  const parts = answer.split(/(\[\d+\])/g);

  return (
    <p>
      {parts.map((part, index) => {
        const match = part.match(/^\[(\d+)\]$/);

        if (!match) {
          return <span key={`${part}-${index}`}>{part}</span>;
        }

        const citationNumber = Number(match[1]);
        const source =
          results.find((item) => item.rank === citationNumber) ??
          results[citationNumber - 1];

        if (!source) {
          return <span key={`${part}-${index}`}>{part}</span>;
        }

        return (
          <button
            key={`${part}-${index}`}
            onClick={() => onCitationClick(source)}
            className="mx-0.5 inline-flex translate-y-[-1px] items-center rounded-md border border-[#ef1b24]/20 bg-[#ef1b24]/10 px-1.5 py-0.5 text-[12px] font-semibold leading-none text-[#ff737b] transition hover:bg-[#ef1b24]/20"
            title={`Open evidence ${citationNumber}`}
          >
            {citationNumber}
          </button>
        );
      })}
    </p>
  );
}

function EvidenceInspector({
  source,
  onClose,
}: {
  source: Evidence;
  onClose: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/55 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.aside
        initial={{ x: 40, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 40, opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={(event) => event.stopPropagation()}
        className="absolute bottom-0 right-0 top-0 w-full max-w-[460px] overflow-y-auto border-l border-white/[0.09] bg-[#161513] p-6 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-5">
          <div>
            <div className="text-xs uppercase tracking-[0.22em] text-[#ef1b24]">
              Evidence #{source.rank}
            </div>
            <h3 className="mt-2 text-[22px] font-medium tracking-[-0.035em] text-[#f2ece3]">
              {source.title}
            </h3>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg border border-white/[0.08] p-2 text-[#9b9389] transition hover:bg-white/[0.06] hover:text-white"
          >
            <XCircle size={18} />
          </button>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <Metric label="Rank" value={`#${source.rank}`} />
          <Metric label="Score" value={source.score.toFixed(3)} />
        </div>

        <div className="mt-6 rounded-2xl border border-white/[0.08] bg-white/[0.035] p-5">
          <div className="mb-3 text-xs uppercase tracking-[0.18em] text-[#81796f]">
            Retrieved passage
          </div>
          <p className="text-sm leading-7 text-[#c2bbb0]">{source.text}</p>
        </div>

        <div className="mt-5 text-xs text-[#6f685f]">{source.chunk_id}</div>

        {source.source && (
          <a
            href={source.source}
            target="_blank"
            rel="noreferrer"
            className="mt-5 inline-flex items-center gap-2 rounded-xl border border-white/[0.09] bg-white/[0.04] px-4 py-2.5 text-sm text-[#e8e2d8] transition hover:bg-white/[0.07]"
          >
            Open original source <Link2 size={14} />
          </a>
        )}
      </motion.aside>
    </motion.div>
  );
}

function getEvidenceConfidence(results: Evidence[]) {
  if (!results.length) {
    return {
      label: "No evidence",
      detail: "No retrieved evidence was available for this answer.",
    };
  }

  const scores = results.slice(0, 3).map((item) => item.score);
  const average = scores.reduce((sum, score) => sum + score, 0) / scores.length;
  const best = Math.max(...scores);

  if (best >= 0.82 && average >= 0.72) {
    return {
      label: "Strong evidence",
      detail: "Top retrieved sources closely match the question.",
    };
  }

  if (best >= 0.65 && average >= 0.52) {
    return {
      label: "Moderate evidence",
      detail: "Useful evidence was found, but some claims may need verification.",
    };
  }

  return {
    label: "Limited evidence",
    detail: "Retrieval confidence is low. Review the sources before relying on the answer.",
  };
}

function ConfidenceCard({
  confidence,
}: {
  confidence: { label: string; detail: string };
}) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
      <ShieldCheck size={18} className="mt-0.5 shrink-0 text-[#ef1b24]" />
      <div>
        <div className="text-sm font-medium text-[#e8e2d8]">
          {confidence.label}
        </div>
        <div className="mt-1 text-sm leading-6 text-[#8b8378]">
          {confidence.detail}
        </div>
      </div>
    </div>
  );
}

function SourcesView({ result }: { result: SearchResponse }) {
  return (
    <div>
      <h2 className="mb-4 text-[22px] font-medium tracking-[-0.035em]">
        Sources used
      </h2>

      <div className="space-y-3">
        {result.results.map((source) => (
          <EvidencePreview key={source.chunk_id} source={source} expanded />
        ))}
      </div>
    </div>
  );
}

function RetrievalView({
  result,
  bestScore,
}: {
  result: SearchResponse;
  bestScore: string;
}) {
  return (
    <div>
      <h2 className="mb-4 text-[22px] font-medium tracking-[-0.035em]">
        Retrieval analytics
      </h2>

      <RetrievalFlow result={result} />

      <div className="mt-7 grid grid-cols-3 gap-3">
        <Metric label="Chunks" value={String(result.chunks_retrieved)} />
        <Metric label="Best match" value={bestScore} />
        <Metric label="Latency" value={`${result.latency_ms} ms`} />
      </div>

      <div className="mt-7 space-y-4">
        {result.results.map((source) => (
          <div key={source.chunk_id}>
            <div className="mb-1 flex justify-between text-xs text-[#8b8278]">
              <span>
                #{source.rank} {source.title}
              </span>

              <span>{formatScore(source.score)}</span>
            </div>

            <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
              <div
                className="h-full rounded-full bg-[#ef1b24]"
                style={{
                  width: `${Math.max(0, Math.min(source.score * 100, 100))}%`,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RetrievalFlow({ result }: { result: SearchResponse }) {
  const steps = [
    ["Question", "Captured"],
    ["Embedding", "Vectorized"],
    ["Search", `${result.chunks_retrieved} chunks`],
    ["Rank", "Similarity"],
    ["Evidence", `${Math.min(result.results.length, 5)} selected`],
    ["Answer", "Grounded"],
  ];

  return (
    <div className="rounded-[24px] border border-white/[0.08] bg-white/[0.025] p-5">
      <div className="mb-4 text-xs uppercase tracking-[0.2em] text-[#7f776e]">
        Retrieval pipeline
      </div>

      <div className="grid grid-cols-6 gap-2">
        {steps.map(([title, text], index) => (
          <motion.div
            key={title}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.08 }}
            className="relative rounded-2xl border border-white/[0.07] bg-black/10 p-3"
          >
            <div className="mb-3 flex h-7 w-7 items-center justify-center rounded-full bg-[#ef1b24]/10 text-xs font-semibold text-[#ff737b]">
              {index + 1}
            </div>
            <div className="text-xs font-medium text-[#e5ded4]">{title}</div>
            <div className="mt-1 text-[11px] text-[#746d64]">{text}</div>

            {index < steps.length - 1 && (
              <motion.div
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: 0.15 + index * 0.08, duration: 0.3 }}
                className="absolute -right-2 top-1/2 h-px w-2 origin-left bg-[#ef1b24]/50"
              />
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function PreSearchPage({
  view,
  runSearch,
}: {
  view: View;
  runSearch: (question: string) => void;
}) {
  const isSources = view === "sources";
  const isRetrieval = view === "retrieval";

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto max-w-[850px] pb-28 pt-16"
    >
      {isSources && (
        <SmartPageShell
          eyebrow="Source intelligence"
          title="Sources are not just links."
          subtitle="Verivance treats every retrieved chunk as inspectable evidence with title, source URL, rank, score, and chunk identity."
          icon={<Database size={22} />}
        >
          <div className="grid grid-cols-2 gap-3">
            <SmartCard
              icon={<Link2 size={18} />}
              title="Source cards"
              text="Every answer can expose the exact documents that supported it."
            />

            <SmartCard
              icon={<ShieldCheck size={18} />}
              title="Evidence boundary"
              text="If sources do not support the answer, Verivance refuses instead of guessing."
            />

            <SmartCard
              icon={<BookOpen size={18} />}
              title="Chunk inspection"
              text="Open retrieved passages and see what the model actually saw."
            />

            <SmartCard
              icon={<Globe2 size={18} />}
              title="Original URL"
              text="Each evidence block can link back to the original indexed source."
            />
          </div>
        </SmartPageShell>
      )}

      {isRetrieval && (
        <SmartPageShell
          eyebrow="Retrieval engine"
          title="Before it answers, it ranks."
          subtitle="The retrieval page shows how many chunks were found, which source matched best, and how strong each relevance match was."
          icon={<BarChart3 size={22} />}
        >
          <div className="space-y-3">
            {[
              ["Query embedding", "The user question becomes a dense vector."],
              ["Vector search", "Pinecone finds nearby evidence chunks."],
              ["Ranking", "Chunks are sorted by similarity score."],
              ["Grounded generation", "The answer is generated from retrieved evidence."],
            ].map(([title, text], index) => (
              <div
                key={title}
                className="flex items-center gap-4 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#ef1b24]/10 text-sm text-[#ff7c84]">
                  {index + 1}
                </div>

                <div>
                  <div className="text-sm font-medium text-[#e8e2d8]">
                    {title}
                  </div>

                  <div className="mt-1 text-sm text-[#8b8378]">
                    {text}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </SmartPageShell>
      )}



      <div className="mt-8 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5">
        <div className="mb-3 text-sm font-medium text-[#e8e2d8]">
          Try it with a real query
        </div>

        <div className="flex flex-wrap gap-2">
          {SMART_PROMPTS.map((prompt) => (
            <button
              key={prompt.query}
              onClick={() => runSearch(prompt.query)}
              className="rounded-full border border-white/[0.08] bg-white/[0.035] px-3 py-2 text-sm text-[#9b9389] transition hover:bg-white/[0.07] hover:text-white"
            >
              {prompt.label}
            </button>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

function RotatingHeadline() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % HERO_LINES.length);
    }, 2200);

    return () => window.clearInterval(timer);
  }, []);

  return (
    <h1 className="min-h-[58px] text-center text-[44px] font-normal tracking-[-0.065em] text-[#f3efe8]">
      <AnimatePresence mode="wait">
        <motion.span
          key={HERO_LINES[index]}
          initial={{
            opacity: 0,
            y: 18,
            filter: "blur(10px)",
          }}
          animate={{
            opacity: 1,
            y: 0,
            filter: "blur(0px)",
          }}
          exit={{
            opacity: 0,
            y: -18,
            filter: "blur(10px)",
          }}
          transition={{
            duration: 0.42,
            ease: "easeOut",
          }}
          className="inline-block"
        >
          {HERO_LINES[index]}
        </motion.span>
      </AnimatePresence>
    </h1>
  );
}

function PromptDeck({
  runSearch,
}: {
  runSearch: (question: string) => void;
}) {
  return (
    <div className="mx-auto mt-8 grid max-w-[760px] grid-cols-2 gap-3">
      {SMART_PROMPTS.map((prompt, index) => (
        <motion.button
          key={prompt.query}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            delay: 0.05 * index,
          }}
          onClick={() => runSearch(prompt.query)}
          className="group rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 text-left transition hover:border-white/[0.16] hover:bg-white/[0.055]"
        >
          <div className="mb-2 flex items-center gap-2 text-xs text-[#81796f]">
            <Sparkles size={13} className="text-[#ef1b24]" />
            Suggested query
          </div>

          <div className="text-sm text-[#d9d3c8] transition group-hover:text-white">
            {prompt.label}
          </div>
        </motion.button>
      ))}
    </div>
  );
}

function RagIntelligenceStrip() {
  const items = [
    {
      icon: <MessageSquareText size={16} />,
      title: "Question",
      text: "User asks",
    },
    {
      icon: <Database size={16} />,
      title: "Retrieve",
      text: "Indexed + web evidence",
    },
    {
      icon: <BarChart3 size={16} />,
      title: "Rank",
      text: "Relevance match",
    },
    {
      icon: <ShieldCheck size={16} />,
      title: "Ground",
      text: "Evidence only",
    },
  ];

  return (
    <div className="mx-auto mt-8 grid max-w-[820px] grid-cols-4 gap-2">
      {items.map((item, index) => (
        <motion.div
          key={item.title}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            delay: 0.1 + index * 0.06,
          }}
          className="relative overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4"
        >
          <div className="mb-4 text-[#ef1b24]">{item.icon}</div>

          <div className="text-sm font-medium text-[#e8e2d8]">
            {item.title}
          </div>

          <div className="mt-1 text-xs text-[#777066]">{item.text}</div>

          {index < items.length - 1 && (
            <div className="absolute right-[-10px] top-1/2 hidden h-px w-5 bg-[#ef1b24]/40 lg:block" />
          )}
        </motion.div>
      ))}
    </div>
  );
}

function SmartPageShell({
  eyebrow,
  title,
  subtitle,
  icon,
  children,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <div>
      <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl border border-[#ef1b24]/20 bg-[#ef1b24]/10 text-[#ff6670]">
        {icon}
      </div>

      <div className="text-[12px] font-semibold uppercase tracking-[0.34em] text-[#ef1b24]">
        {eyebrow}
      </div>

      <h1 className="mt-4 max-w-[720px] text-[42px] font-normal leading-tight tracking-[-0.065em] text-[#f3efe8]">
        {title}
      </h1>

      <p className="mt-4 max-w-[660px] text-[16px] leading-7 text-[#8b8378]">
        {subtitle}
      </p>

      <div className="mt-9">{children}</div>
    </div>
  );
}

function SmartCard({
  icon,
  title,
  text,
}: {
  icon: ReactNode;
  title: string;
  text: string;
}) {
  return (
    <motion.div
      whileHover={{
        y: -3,
      }}
      className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5"
    >
      <div className="mb-5 text-[#ef1b24]">{icon}</div>

      <div className="text-sm font-medium text-[#e8e2d8]">{title}</div>

      <div className="mt-2 text-sm leading-6 text-[#8b8378]">{text}</div>
    </motion.div>
  );
}

function Composer({
  query,
  setQuery,
  submit,
  keyDown,
  loading,
  large = false,
  compact = false,
}: {
  query: string;
  setQuery: (value: string) => void;
  submit: (event: FormEvent<HTMLFormElement>) => void;
  keyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
  loading: boolean;
  large?: boolean;
  compact?: boolean;
}) {
  return (
    <form
      onSubmit={submit}
      className={`composer overflow-hidden rounded-[22px] border border-white/[0.11] bg-[#1c1b19]/95 shadow-2xl backdrop-blur-xl transition focus-within:border-white/[0.22] ${
        large ? "mt-8" : ""
      }`}
    >
      <textarea
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        onKeyDown={keyDown}
        placeholder={compact ? "Ask a follow-up" : "Ask anything..."}
        rows={compact ? 1 : large ? 3 : 2}
        className={`w-full resize-none bg-transparent px-5 pt-4 text-[16px] text-[#f3eee7] outline-none placeholder:text-[#746d64] ${
          compact ? "min-h-[52px]" : "min-h-[104px]"
        }`}
      />

      <div className="flex items-center justify-between px-4 pb-4">
        <div className="flex items-center gap-2">
          <ComposerTool icon={<Search size={15} />} label="Search" />
          <ComposerTool icon={<Database size={15} />} label="Evidence" />
        </div>

        <button
          disabled={loading || !query.trim()}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-[#d9d6d0] text-black transition hover:scale-[1.03] disabled:opacity-40"
        >
          {loading ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <ArrowUp size={18} />
          )}
        </button>
      </div>
    </form>
  );
}

function TopBar({
  view,
  setView,
  result,
}: {
  view: View;
  setView: (value: View) => void;
  result: SearchResponse | null;
}) {
  return (
    <header className="sticky top-0 z-20 border-b border-white/[0.08] bg-[#111110]/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[1060px] items-center justify-between px-8">
        <nav className="flex h-full items-center gap-8">
          <Tab
            active={view === "answer"}
            onClick={() => setView("answer")}
            icon={<Sparkles size={18} />}
            label="Answer"
          />

          <Tab
            active={view === "sources"}
            onClick={() => setView("sources")}
            icon={<Link2 size={18} />}
            label="Sources"
          />

          <Tab
            active={view === "retrieval"}
            onClick={() => setView("retrieval")}
            icon={<BarChart3 size={18} />}
            label="Retrieval"
          />

          
        </nav>

        <div className="flex items-center gap-2">
          {result && (
            <div className="hidden rounded-full border border-white/[0.09] px-3 py-1.5 text-xs text-[#8b8378] md:block">
              {result.chunks_retrieved} sources
            </div>
          )}

        </div>
      </div>
    </header>
  );
}

function Tab({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`relative flex h-full items-center gap-2 text-[15px] transition ${
        active ? "text-[#e8e2d8]" : "text-[#8a8278] hover:text-[#e8e2d8]"
      }`}
    >
      {icon}
      {label}

      {active && (
        <motion.div
          layoutId="active-tab"
          className="absolute bottom-0 left-0 right-0 h-[2px] rounded-full bg-[#e8e2d8]"
        />
      )}
    </button>
  );
}

function SidebarButton({
  active = false,
  icon,
  label,
  onClick,
}: {
  active?: boolean;
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-[15px] transition ${
        active
          ? "bg-white/[0.07] text-white"
          : "text-[#aaa298] hover:bg-white/[0.05] hover:text-white"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function SourcePill({ source }: { source: Evidence }) {
  return (
    <a
      href={source.source || "#"}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-xs text-[#aaa298] transition hover:bg-white/[0.07] hover:text-white"
    >
      <ShieldCheck size={13} />
      {source.title}
      <span className="text-[#6f685f]">+{source.rank}</span>
    </a>
  );
}

function EvidencePreview({
  source,
  expanded = false,
}: {
  source: Evidence;
  expanded?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.035] p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="font-medium text-[#ebe5da]">{source.title}</div>

          <div className="mt-1 text-xs text-[#766f66]">
            {source.chunk_id}
          </div>
        </div>

        <div className="rounded-full bg-white/[0.06] px-2 py-1 text-xs text-[#a59d92]">
          {formatScore(source.score)}
        </div>
      </div>

      <p
        className={`mt-3 text-sm leading-6 text-[#aaa298] ${
          expanded ? "" : "max-h-[72px] overflow-hidden"
        }`}
      >
        {source.text}
      </p>

      {source.source && (
        <a
          href={source.source}
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-flex items-center gap-1 text-sm text-[#d9d6d0] hover:underline"
        >
          Open source <Link2 size={13} />
        </a>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.035] p-4">
      <div className="text-sm text-[#81796f]">{label}</div>

      <div className="mt-2 text-[24px] tracking-[-0.04em] text-[#f0eadf]">
        {value}
      </div>
    </div>
  );
}

function ComposerTool({
  icon,
  label,
}: {
  icon: ReactNode;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.035] px-3 py-1.5 text-sm text-[#9b9389]">
      {icon}
      {label}
    </div>
  );
}

function MiniChip({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.035] px-3 py-1.5 text-xs text-[#8e857b]">
      {icon}
      {text}
    </span>
  );
}

function LoadingAnswer() {
  const stages = [
    {
      title: "Understanding question",
      text: "Preparing the query for retrieval.",
      icon: <MessageSquareText size={18} />,
    },
    {
      title: "Searching evidence",
      text: "Searching indexed knowledge and live web evidence when needed.",
      icon: <Database size={18} />,
    },
    {
      title: "Ranking sources",
      text: "Sorting results by semantic similarity.",
      icon: <BarChart3 size={18} />,
    },
    {
      title: "Grounding answer",
      text: "Generating only from retrieved evidence.",
      icon: <ShieldCheck size={18} />,
    },
  ];

  return (
    <div className="rounded-[26px] border border-white/[0.08] bg-white/[0.035] p-6">
      <div className="mb-6 flex items-center gap-3">
        <Loader2 size={18} className="animate-spin text-[#ef1b24]" />

        <div>
          <div className="text-sm font-medium text-[#e8e2d8]">
            Verivance is building an evidence trail
          </div>

          <div className="mt-1 text-sm text-[#81796f]">
            Retrieval first. Answer second.
          </div>
        </div>
      </div>

      <div className="grid gap-3">
        {stages.map((stage, index) => (
          <motion.div
            key={stage.title}
            initial={{ opacity: 0.35, x: -8 }}
            animate={{
              opacity: [0.35, 1, 0.55],
              x: 0,
            }}
            transition={{
              duration: 1.8,
              delay: index * 0.25,
              repeat: Infinity,
              repeatType: "reverse",
            }}
            className="flex items-center gap-4 rounded-2xl border border-white/[0.06] bg-black/10 px-4 py-3"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#ef1b24]/10 text-[#ff6872]">
              {stage.icon}
            </div>

            <div>
              <div className="text-sm font-medium text-[#ded8ce]">
                {stage.title}
              </div>

              <div className="mt-0.5 text-xs text-[#7d756c]">
                {stage.text}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function Background() {
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden">
      <div className="absolute left-[42%] top-[18%] h-[520px] w-[520px] rounded-full bg-[#ef1b24]/[0.035] blur-[130px]" />

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.035)_1px,transparent_1px)] [background-size:42px_42px] opacity-[0.08]" />
    </div>
  );
}

function StyleLayer() {
  return (
    <style>{`
      .composer {
        box-shadow:
          0 30px 90px rgba(0, 0, 0, 0.3),
          inset 0 1px 0 rgba(255, 255, 255, 0.05);
      }

      .composer:focus-within {
        box-shadow:
          0 34px 100px rgba(239, 27, 36, 0.075),
          inset 0 1px 0 rgba(255, 255, 255, 0.08);
      }

      .prose-answer {
        font-size: 18px;
        line-height: 1.9;
        color: #d8d1c6;
      }

      .prose-answer p {
        margin: 0 0 1rem;
      }

      .prose-answer p:last-child {
        margin-bottom: 0;
      }

      .prose-answer strong {
        color: #f3efe8;
        font-weight: 600;
      }

      .prose-answer a {
        color: #f3efe8;
        text-decoration: underline;
        text-decoration-color: #ef1b24;
        text-underline-offset: 3px;
        transition: color 0.15s ease;
      }

      .prose-answer a:hover {
        color: #ff7c84;
      }

      .prose-answer ul,
      .prose-answer ol {
        margin: 0.8rem 0;
        padding-left: 1.5rem;
      }

      .prose-answer li {
        margin: 0.3rem 0;
      }

      .prose-answer code {
        border-radius: 0.35rem;
        background: rgba(255, 255, 255, 0.06);
        padding: 0.1rem 0.3rem;
        font-size: 0.92em;
      }

      ::selection {
        background: rgba(239, 27, 36, 0.35);
      }

      textarea::-webkit-scrollbar {
        width: 0;
      }
    `}</style>
  );
}