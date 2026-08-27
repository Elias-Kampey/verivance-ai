"use client";

import {
  ArrowUp,
  BarChart3,
  BookOpen,
  ChevronDown,
  CirclePlus,
  Database,
  FileText,
  Globe2,
  History,
  Link2,
  Loader2,
  Menu,
  MessageSquareText,
  PanelLeft,
  Search,
  ShieldCheck,
  Sparkles,
  XCircle,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
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

type View = "answer" | "sources" | "retrieval" ;

const API_URL = "http://localhost:8000";

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

export default function Home() {
  const [query, setQuery] = useState("");
  const [activeQuestion, setActiveQuestion] = useState("");
  const [recent, setRecent] = useState<string[]>([]);
  const [view, setView] = useState<View>("answer");

  const [result, setResult] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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

    setRecent((current) => {
      const filtered = current.filter(
        (item) => item.toLowerCase() !== question.toLowerCase()
      );

      return [question, ...filtered].slice(0, 8);
    });

    try {
      const controller = new AbortController();

      const timeout = window.setTimeout(() => {
        controller.abort();
      }, 25000);

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

      setResult(body);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        setError(
          "Verivance took too long to generate an answer. Retrieval may be working, but the AI provider is slow or quota-limited."
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

  const bestScore = useMemo(() => {
    if (!result?.results?.length) {
      return "—";
    }

    return result.results[0].score.toFixed(3);
  }, [result]);

  return (
    <main className="min-h-screen bg-[#111110] text-[#e9e5dc]">
      <StyleLayer />
      <Background />

      <aside className="fixed inset-y-0 left-0 z-30 w-[260px] border-r border-white/[0.08] bg-[#181816]/95 backdrop-blur-xl">
        <div className="flex h-full flex-col">
          <div className="flex h-16 items-center justify-between px-5">
            <div className="flex items-center gap-3">
              <Mark />

              <div>
                <div className="text-[18px] font-semibold tracking-[-0.04em]">
                  Verivance
                </div>

                <div className="text-[11px] uppercase tracking-[0.16em] text-[#766f66]">
                  AI Search Engine
                </div>
              </div>
            </div>

            <button className="rounded-lg p-2 text-[#858078] transition hover:bg-white/[0.06]">
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
              active={view === "answer"}
              icon={<Sparkles size={18} />}
              label="Answer"
              onClick={() => setView("answer")}
            />

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

            <SidebarButton
              active={view === "trace"}
              icon={<FileText size={18} />}
              label="Trace"
              onClick={() => setView("trace")}
            />
          </div>

          <div className="mt-7 px-5">
            <div className="mb-3 flex items-center justify-between text-[13px] text-[#7b756d]">
              <span>Sessions</span>
              <ChevronDown size={15} />
            </div>

            <div className="space-y-1">
              {recent.length === 0 ? (
                <p className="rounded-lg py-2 text-sm text-[#5d574f]">
                  No searches yet.
                </p>
              ) : (
                recent.map((item) => (
                  <button
                    key={item}
                    onClick={() => runSearch(item)}
                    className="group flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm text-[#b9b2a8] transition hover:bg-white/[0.055] hover:text-white"
                  >
                    <History
                      size={14}
                      className="shrink-0 text-[#706a62] transition group-hover:text-[#ef1b24]"
                    />

                    <span className="truncate">{item}</span>
                  </button>
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
                Search • Retrieve • Rank • Trace
              </div>
            </div>
          </div>
        </div>
      </aside>

      <section className="relative z-10 ml-[260px] min-h-screen">
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
        Ask anything. Verivance searches your indexed knowledge base, ranks the
        evidence, and shows exactly where the answer came from.
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
}) {
  return (
    <div className="pt-10">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="mb-5 flex items-center gap-2 text-sm text-[#827a70]">
          <Globe2 size={16} />
          Searching indexed evidence
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

          {result && !loading && view === "trace" && (
            <motion.div
              key="trace"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
            >
              <TraceView result={result} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {!loading && result && (
        <div className="fixed bottom-5 left-[260px] right-0 z-20 flex justify-center px-8">
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

  return (
    <div>
      <div className="mb-5 flex flex-wrap gap-2">
        {topSources.map((source) => (
          <SourcePill key={source.chunk_id} source={source} />
        ))}
      </div>

      <article className="prose-answer">
        <p>{result.answer}</p>
      </article>

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

      <div className="grid grid-cols-3 gap-3">
        <Metric label="Chunks" value={String(result.chunks_retrieved)} />
        <Metric label="Best score" value={bestScore} />
        <Metric label="Latency" value={`${result.latency_ms} ms`} />
      </div>

      <div className="mt-7 space-y-4">
        {result.results.map((source) => (
          <div key={source.chunk_id}>
            <div className="mb-1 flex justify-between text-xs text-[#8b8278]">
              <span>
                #{source.rank} {source.title}
              </span>

              <span>{source.score.toFixed(3)}</span>
            </div>

            <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
              <div
                className="h-full rounded-full bg-[#ef1b24]"
                style={{
                  width: `${Math.min(source.score * 100, 100)}%`,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TraceView({ result }: { result: SearchResponse }) {
  return (
    <div>
      <h2 className="mb-4 text-[22px] font-medium tracking-[-0.035em]">
        Trace
      </h2>

      <div className="space-y-3">
        <TraceStep
          icon={<MessageSquareText size={18} />}
          title="Question received"
          text={result.question}
        />

        <TraceStep
          icon={<Search size={18} />}
          title="Semantic retrieval"
          text={`${result.chunks_retrieved} evidence chunks retrieved from namespace web.`}
        />

        <TraceStep
          icon={<BarChart3 size={18} />}
          title="Ranking"
          text="Chunks were ordered by vector similarity score."
        />

        <TraceStep
          icon={<ShieldCheck size={18} />}
          title="Grounded generation"
          text={
            result.refused
              ? "Verivance refused because evidence was insufficient."
              : "Answer generated from retrieved evidence."
          }
        />
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
  const isTrace = view === "trace";

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
          subtitle="The retrieval page shows how many chunks were found, which source matched best, and how strong the similarity score was."
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

      {isTrace && (
        <SmartPageShell
          eyebrow="Answer trace"
          title="A RAG answer should leave footprints."
          subtitle="Trace mode turns every answer into a transparent path: question, retrieval, ranking, generation, and cited evidence."
          icon={<FileText size={22} />}
        >
          <div className="relative space-y-4">
            <TracePreview
              icon={<MessageSquareText size={18} />}
              title="Question captured"
              text="Verivance records the user question as the retrieval anchor."
            />

            <TracePreview
              icon={<Search size={18} />}
              title="Evidence retrieved"
              text="The system pulls top matching chunks from the indexed namespace."
            />

            <TracePreview
              icon={<ShieldCheck size={18} />}
              title="Grounding check"
              text="The model must answer using retrieved evidence or refuse."
            />

            <TracePreview
              icon={<FileText size={18} />}
              title="Source trail"
              text="The final answer connects back to source IDs and evidence blocks."
            />
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
      text: "Pinecone chunks",
    },
    {
      icon: <BarChart3 size={16} />,
      title: "Rank",
      text: "Similarity score",
    },
    {
      icon: <ShieldCheck size={16} />,
      title: "Ground",
      text: "Evidence only",
    },
    {
      icon: <FileText size={16} />,
      title: "Trace",
      text: "Source IDs",
    },
  ];

  return (
    <div className="mx-auto mt-8 grid max-w-[820px] grid-cols-5 gap-2">
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

function TracePreview({
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
        x: 4,
      }}
      className="flex gap-4 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5"
    >
      <div className="mt-1 text-[#ef1b24]">{icon}</div>

      <div>
        <div className="font-medium text-[#e8e2d8]">{title}</div>

        <div className="mt-1 text-sm leading-6 text-[#8b8378]">{text}</div>
      </div>
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

          <button className="rounded-lg p-2 text-[#9a9288] transition hover:bg-white/[0.06]">
            <Menu size={18} />
          </button>
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
          {source.score.toFixed(3)}
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

function TraceStep({
  icon,
  title,
  text,
}: {
  icon: ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="flex gap-4 rounded-2xl border border-white/[0.08] bg-white/[0.035] p-4">
      <div className="mt-1 text-[#d9d6d0]">{icon}</div>

      <div>
        <div className="font-medium">{title}</div>

        <div className="mt-1 text-sm leading-6 text-[#91897e]">{text}</div>
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

function Mark() {
  return (
    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#ef1b24] shadow-[0_10px_35px_rgba(239,27,36,0.26)]">
      <svg viewBox="0 0 64 64" className="h-5 w-5" fill="none">
        <circle cx="15" cy="15" r="5" fill="white" />
        <circle cx="15" cy="49" r="5" fill="white" />
        <circle cx="49" cy="15" r="5" fill="white" />
        <circle cx="49" cy="49" r="5" fill="white" />

        <path
          d="M20 18L32 32L44 18M20 46L32 32L44 46"
          stroke="white"
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
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
      text: "Looking through indexed Pinecone chunks.",
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
        margin: 0;
        white-space: pre-wrap;
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