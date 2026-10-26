"use client";

import Link from "next/link";
import { useState } from "react";
import { Bookmark, BookmarkCheck, FilePenLine, X, Bot } from "lucide-react";
import type { Job } from "@/lib/db/schema";
import { salary, sourceLabel, timeAgo, whereLabel } from "@/lib/format";
import { bulkStatus, queueJobs, reviewWithAi, setStatus } from "@/app/actions";
import { ScoreRing, SkillMeter } from "./score";
import { useAction } from "./toast";

export type JobRowData = Pick<
  Job,
  "id" | "title" | "company" | "location" | "remote" | "source" | "postedAt" | "score" | "breakdown" | "skills" | "niceSkills" | "status" | "salaryMin" | "salaryMax" | "salaryCurrency" | "salaryPeriod" | "ai" | "ats"
>;

export function JobList({ jobs, minScore, selectable = true, empty }: { jobs: JobRowData[]; minScore: number; selectable?: boolean; empty?: React.ReactNode }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const { pending, act } = useAction();
  const ids = [...selected];
  const toggle = (id: string) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  if (!jobs.length) return <>{empty}</>;

  return (
    <div>
      {selectable && (
        <div className="mb-2 flex min-h-9 flex-wrap items-center gap-2 text-sm">
          <label className="flex items-center gap-2 px-1 text-ink-2">
            <input
              type="checkbox"
              className="h-4 w-4 accent-[var(--cobalt)]"
              checked={selected.size > 0 && selected.size === jobs.length}
              onChange={(e) => setSelected(e.target.checked ? new Set(jobs.map((j) => j.id)) : new Set())}
              aria-label="Select all on this page"
            />
            {selected.size ? `${selected.size} selected` : "Select"}
          </label>
          {selected.size > 0 && (
            <>
              <button className="btn btn-primary" disabled={pending} onClick={() => act(() => queueJobs(ids), { onDone: () => setSelected(new Set()) })}>
                <FilePenLine size={15} aria-hidden /> Draft applications
              </button>
              <button className="btn" disabled={pending} onClick={() => act(() => bulkStatus(ids, "saved"), { onDone: () => setSelected(new Set()) })}>
                Save
              </button>
              <button className="btn" disabled={pending} onClick={() => act(() => reviewWithAi(ids))}>
                <Bot size={15} aria-hidden /> AI review
              </button>
              <button className="btn" disabled={pending} onClick={() => act(() => bulkStatus(ids, "archived"), { onDone: () => setSelected(new Set()) })}>
                Not interested
              </button>
            </>
          )}
        </div>
      )}
      <ul className="panel divide-y divide-line overflow-hidden">
        {jobs.map((j) => (
          <JobRow key={j.id} job={j} minScore={minScore} selected={selected.has(j.id)} onSelect={selectable ? () => toggle(j.id) : undefined} />
        ))}
      </ul>
    </div>
  );
}

function JobRow({ job, minScore, selected, onSelect }: { job: JobRowData; minScore: number; selected: boolean; onSelect?: () => void }) {
  const { pending, act } = useAction();
  const b = job.breakdown;
  const pay = salary(job);
  const saved = job.status === "saved";
  return (
    <li className={`flex gap-3 px-3 py-3 sm:px-4 ${selected ? "bg-cobalt-soft" : ""}`}>
      {onSelect && (
        <input type="checkbox" className="mt-3 h-4 w-4 shrink-0 accent-[var(--cobalt)]" checked={selected} onChange={onSelect} aria-label={`Select ${job.title} at ${job.company}`} />
      )}
      <ScoreRing score={job.score} minScore={minScore} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <Link href={`/jobs/${encodeURIComponent(job.id)}`} className="font-semibold leading-snug hover:text-cobalt hover:underline">
            {job.title}
          </Link>
          {job.ai && (
            <span className="chip bg-cobalt-soft text-cobalt" title={job.ai.verdict}>
              AI {job.ai.score}
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-x-3 text-sm text-ink-3">
          <span className="font-medium text-ink-2">{job.company}</span>
          <span>{whereLabel(job)}</span>
          {pay && <span>{pay}</span>}
          <span>{timeAgo(job.postedAt)}</span>
          <span>via {sourceLabel(job.source)}</span>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <SkillMeter matched={b?.matched ?? []} missing={b?.missing ?? []} required={job.skills} nice={job.niceSkills} bonus={b?.bonus ?? []} />
          {b && b.missing.length > 0 && <span className="text-xs text-ink-3">Missing: {b.missing.slice(0, 3).join(", ")}{b.missing.length > 3 ? ` +${b.missing.length - 3}` : ""}</span>}
          {b && !b.eligible && <span className="chip bg-danger-soft text-danger">{b.reasons[0]}</span>}
          {b?.reasons.includes("Needs German") && <span className="chip bg-mid-soft text-mid">Needs German</span>}
        </div>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1 sm:flex-row sm:items-start">
        <button className="btn btn-ghost px-2" disabled={pending} title="Draft an application" aria-label="Draft an application" onClick={() => act(() => queueJobs([job.id]))}>
          <FilePenLine size={17} aria-hidden />
        </button>
        <button
          className="btn btn-ghost px-2"
          disabled={pending}
          title={saved ? "Saved" : "Save"}
          aria-label={saved ? "Unsave" : "Save"}
          onClick={() => act(() => setStatus(job.id, saved ? "new" : "saved"))}
        >
          {saved ? <BookmarkCheck size={17} className="text-cobalt" aria-hidden /> : <Bookmark size={17} aria-hidden />}
        </button>
        <button className="btn btn-ghost px-2" disabled={pending} title="Not interested" aria-label="Not interested" onClick={() => act(() => setStatus(job.id, "archived"))}>
          <X size={17} aria-hidden />
        </button>
      </div>
    </li>
  );
}
