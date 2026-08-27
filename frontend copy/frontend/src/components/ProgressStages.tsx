"use client";

import { useEffect, useState } from "react";

const STAGES = [
  "Understanding query",
  "Searching sources",
  "Ranking results",
  "Verifying evidence",
  "Generating response",
];

// There's no real progress stream from the backend yet — this advances on
// a timer to give the user something to read while the request is in
// flight, and holds on the last stage until the response actually arrives.
const STAGE_INTERVAL_MS = 700;

interface ProgressStagesProps {
  active: boolean;
}

export default function ProgressStages({ active }: ProgressStagesProps) {
  const [stageIndex, setStageIndex] = useState(0);

  useEffect(() => {
    if (!active) {
      setStageIndex(0);
      return;
    }
    const timer = setInterval(() => {
      setStageIndex((prev) => Math.min(prev + 1, STAGES.length - 1));
    }, STAGE_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [active]);

  if (!active) return null;

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-white/[0.06] bg-surface-raised px-4 py-3">
      {STAGES.map((stage, index) => {
        const isDone = index < stageIndex;
        const isCurrent = index === stageIndex;
        return (
          <div key={stage} className="flex items-center gap-2 text-sm">
            <span
              className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                isDone
                  ? "bg-emerald-400"
                  : isCurrent
                    ? "animate-pulse bg-brand"
                    : "bg-white/15"
              }`}
            />
            <span className={isDone || isCurrent ? "text-white/80" : "text-white/30"}>
              {stage}
            </span>
          </div>
        );
      })}
    </div>
  );
}
