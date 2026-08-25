import type { Evidence } from "@/types/verivance";

interface EvidenceListProps {
  evidence: Evidence[];
}

function scoreColor(score: number): string {
  if (score >= 0.75) return "text-emerald-400";
  if (score >= 0.5) return "text-amber-400";
  return "text-white/50";
}

function scoreBarColor(score: number): string {
  if (score >= 0.75) return "bg-emerald-400";
  if (score >= 0.5) return "bg-amber-400";
  return "bg-white/30";
}

export default function EvidenceList({ evidence }: EvidenceListProps) {
  if (evidence.length === 0) {
    return <p className="text-sm text-white/40">No evidence retrieved.</p>;
  }

  return (
    <ol className="flex flex-col gap-3">
      {evidence.map((item, index) => (
        <li
          key={item.chunk_id}
          className="rounded-lg border border-white/[0.06] bg-surface-raised p-4"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs text-white/40">#{index + 1}</p>
              <a
                href={item.source_url}
                target="_blank"
                rel="noreferrer"
                className="block truncate text-sm font-medium text-white hover:text-brand"
              >
                {item.source_title}
              </a>
            </div>
            <span className={`shrink-0 text-sm font-mono ${scoreColor(item.relevance_score)}`}>
              {item.relevance_score.toFixed(2)}
            </span>
          </div>
          <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-white/[0.06]">
            <div
              className={`h-full rounded-full ${scoreBarColor(item.relevance_score)}`}
              style={{ width: `${Math.min(100, Math.max(0, item.relevance_score * 100))}%` }}
            />
          </div>
          <p className="mt-2 text-sm leading-relaxed text-white/70">{item.text}</p>
          <p className="mt-2 truncate text-xs text-white/30">{item.chunk_id}</p>
        </li>
      ))}
    </ol>
  );
}
