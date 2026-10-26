"use client";

import Link from "next/link";
import { useOptimistic, useState } from "react";
import { Star } from "lucide-react";
import type { JobStatus } from "@/lib/db/schema";
import { dateLabel } from "@/lib/format";
import { setStatus } from "@/app/actions";
import { useAction } from "./toast";

export type Card = {
  id: string;
  title: string;
  company: string;
  score: number;
  status: JobStatus;
  statusChangedAt: number;
  followUpAt: number | null;
  starred: boolean;
};

const COLUMNS: { status: JobStatus; label: string; hint: string }[] = [
  { status: "saved", label: "Saved", hint: "Shortlisted" },
  { status: "queued", label: "In review", hint: "Draft waiting" },
  { status: "applied", label: "Applied", hint: "Waiting to hear" },
  { status: "interview", label: "Interviewing", hint: "In process" },
  { status: "offer", label: "Offer", hint: "Decide" },
  { status: "rejected", label: "Rejected", hint: "Closed" },
];

export function Kanban({ cards, now }: { cards: Card[]; now: number }) {
  const [items, move] = useOptimistic(cards, (state, { id, status }: { id: string; status: JobStatus }) =>
    state.map((c) => (c.id === id ? { ...c, status, statusChangedAt: now } : c)),
  );
  const [dragOver, setDragOver] = useState<JobStatus | null>(null);
  const { act } = useAction();

  function moveTo(id: string, status: JobStatus) {
    act(async () => {
      move({ id, status });
      return setStatus(id, status);
    });
  }

  return (
    <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-4 md:mx-0 md:px-0">
      {COLUMNS.map((col) => {
        const list = items.filter((c) => c.status === col.status);
        return (
          <section
            key={col.status}
            aria-label={col.label}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(col.status);
            }}
            onDragLeave={() => setDragOver(null)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(null);
              const id = e.dataTransfer.getData("text/plain");
              if (id) moveTo(id, col.status);
            }}
            className={`flex w-72 shrink-0 snap-start flex-col rounded-2xl border p-2 transition-colors ${dragOver === col.status ? "border-cobalt bg-cobalt-soft" : "border-line bg-sunken"}`}
          >
            <header className="flex items-baseline justify-between px-2 pb-2 pt-1">
              <h2 className="text-sm font-semibold">{col.label}</h2>
              <span className="text-xs text-ink-3 tabular-nums">{list.length}</span>
            </header>
            <ul className="flex min-h-24 flex-col gap-2">
              {list.map((c) => {
                const days = Math.floor((now - c.statusChangedAt) / 86_400_000);
                const due = c.followUpAt && c.followUpAt <= now + 86_400_000;
                return (
                  <li
                    key={c.id}
                    draggable
                    onDragStart={(e) => e.dataTransfer.setData("text/plain", c.id)}
                    className="cursor-grab rounded-xl border border-line bg-surface p-3 active:cursor-grabbing"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <Link href={`/jobs/${encodeURIComponent(c.id)}`} className="text-sm font-medium leading-snug hover:text-cobalt">
                        {c.title}
                      </Link>
                      {c.starred && <Star size={14} className="mt-0.5 shrink-0 text-mid" fill="var(--mid)" aria-label="Starred" />}
                    </div>
                    <div className="mt-0.5 text-sm text-ink-2">{c.company}</div>
                    <div className="mt-2 flex items-center justify-between gap-2 text-xs text-ink-3">
                      <span>
                        {c.score} match, {days === 0 ? "today" : `${days} d here`}
                      </span>
                      {due && c.followUpAt && <span className="chip bg-mid-soft text-mid">Follow up {dateLabel(c.followUpAt)}</span>}
                    </div>
                    <label className="sr-only" htmlFor={`mv-${c.id}`}>
                      Move {c.title}
                    </label>
                    <select id={`mv-${c.id}`} className="mt-2 w-full rounded-md border border-line bg-surface px-2 py-1 text-xs text-ink-2" value={c.status} onChange={(e) => moveTo(c.id, e.target.value as JobStatus)}>
                      {COLUMNS.map((o) => (
                        <option key={o.status} value={o.status}>
                          Move to {o.label}
                        </option>
                      ))}
                      <option value="archived">Not interested</option>
                    </select>
                  </li>
                );
              })}
              {list.length === 0 && <li className="px-2 py-4 text-center text-xs text-ink-3">{col.hint}</li>}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
