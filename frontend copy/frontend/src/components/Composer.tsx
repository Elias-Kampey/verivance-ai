"use client";

import { useState, type FormEvent } from "react";

interface ComposerProps {
  onSubmit: (query: string) => void;
  disabled?: boolean;
}

export default function Composer({ onSubmit, disabled }: ComposerProps) {
  const [value, setValue] = useState("");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSubmit(trimmed);
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Ask something the corpus can answer..."
        disabled={disabled}
        className="flex-1 rounded-lg border border-white/[0.06] bg-surface-raised px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none focus:border-brand/50 disabled:opacity-50"
      />
      <button
        type="submit"
        disabled={disabled || value.trim().length === 0}
        className="rounded-lg bg-brand px-5 py-3 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40"
      >
        Search
      </button>
    </form>
  );
}
