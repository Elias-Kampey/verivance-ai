"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useHistory } from "@/lib/history";

const NAV_ITEMS = [
  { href: "/", label: "Search" },
  { href: "/sources", label: "Sources" },
  { href: "/analytics", label: "Analytics" },
];

function timeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function Sidebar() {
  const pathname = usePathname();
  const { entries } = useHistory();

  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col border-r border-white/[0.06] bg-surface">
      <div className="border-b border-white/[0.06] px-5 py-5">
        <Link href="/" className="text-sm font-semibold tracking-wide text-white">
          Verivance<span className="text-brand">.ai</span>
        </Link>
      </div>

      <nav className="flex flex-col gap-1 px-3 py-4">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-md px-3 py-2 text-sm transition-colors ${
                active
                  ? "bg-surface-raised text-white"
                  : "text-white/60 hover:bg-surface-raised hover:text-white"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="flex min-h-0 flex-1 flex-col border-t border-white/[0.06]">
        <div className="px-5 pt-4 pb-2 text-xs font-medium uppercase tracking-wide text-white/40">
          History
        </div>
        <div className="flex-1 overflow-y-auto px-3 pb-4">
          {entries.length === 0 ? (
            <p className="px-2 py-1 text-sm text-white/40">
              Your searches will show up here.
            </p>
          ) : (
            <ul className="flex flex-col gap-1">
              {entries.map((entry) => (
                <li key={entry.id}>
                  <div className="rounded-md px-3 py-2 hover:bg-surface-raised">
                    <p className="truncate text-sm text-white/80">{entry.query}</p>
                    <div className="mt-0.5 flex items-center gap-2 text-xs text-white/40">
                      <span>{timeAgo(entry.timestamp)}</span>
                      {entry.refused && (
                        <span className="text-amber-400/80">refused</span>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </aside>
  );
}
