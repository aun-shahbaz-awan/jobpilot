"use client";

import Link from "next/link";
import { useState } from "react";
import { Check, ExternalLink, RotateCcw, Sparkles, Trash2 } from "lucide-react";
import type { Application, Job } from "@/lib/db/schema";
import { approve, discardDraft, markAppliedAction, regenerateDraft, saveDraft, unapprove } from "@/app/actions";
import { ScoreRing } from "./score";
import { useAction } from "./toast";

type Item = { app: Application; job: Pick<Job, "id" | "title" | "company" | "score" | "applyUrl" | "ats" | "applyEmail" | "location" | "remote"> };

const METHOD: Record<Application["method"], string> = {
  form: "Runner fills the form",
  email: "Sent by email",
  manual: "You apply on the site",
};

export function DraftCard({ item, minScore, aiOn }: { item: Item; minScore: number; aiOn: boolean }) {
  const { app, job } = item;
  const [cover, setCover] = useState(app.coverLetter);
  const [highlights, setHighlights] = useState(app.highlights.join("\n"));
  const [answers, setAnswers] = useState<Record<string, string>>(app.answers);
  const [open, setOpen] = useState(false);
  const { pending, act } = useAction();
  const dirty = cover !== app.coverLetter || highlights !== app.highlights.join("\n") || JSON.stringify(answers) !== JSON.stringify(app.answers);
  const payload = () => ({ coverLetter: cover, highlights: highlights.split("\n").map((s) => s.trim()).filter(Boolean), answers });
  const words = cover.trim().split(/\s+/).filter(Boolean).length;

  return (
    <article id={`app-${app.id}`} className="panel scroll-mt-6 overflow-hidden">
      <header className="flex flex-wrap items-center gap-3 p-4">
        <ScoreRing score={job.score} minScore={minScore} size={40} />
        <div className="min-w-0 flex-1">
          <Link href={`/jobs/${encodeURIComponent(job.id)}`} className="font-semibold hover:text-cobalt hover:underline">
            {job.title}
          </Link>
          <div className="flex flex-wrap gap-x-3 text-sm text-ink-3">
            <span className="font-medium text-ink-2">{job.company}</span>
            <span>{METHOD[app.method]}</span>
            <span>Written by {app.generatedBy === "template" ? "template" : app.generatedBy}</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="btn" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
            {open ? "Close" : "Edit"}
          </button>
          <button
            className="btn btn-primary"
            disabled={pending}
            onClick={() =>
              act(async () => {
                if (dirty) {
                  const r = await saveDraft(app.id, payload());
                  if (!r.ok) return r;
                }
                return approve([app.id]);
              })
            }
          >
            <Check size={15} aria-hidden /> Approve
          </button>
        </div>
      </header>

      {!open && (
        <div className="border-t border-line px-4 py-3">
          <p className="line-clamp-2 text-sm text-ink-2">{cover}</p>
        </div>
      )}

      {open && (
        <div className="space-y-4 border-t border-line p-4">
          <div>
            <div className="mb-1 flex items-baseline justify-between">
              <label className="label mb-0" htmlFor={`cl-${app.id}`}>
                Cover letter
              </label>
              <span className="text-xs text-ink-3">{words} words</span>
            </div>
            <textarea id={`cl-${app.id}`} className="field min-h-64 leading-relaxed" value={cover} onChange={(e) => setCover(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor={`hl-${app.id}`}>
              Highlights to stress (one per line)
            </label>
            <textarea id={`hl-${app.id}`} className="field min-h-24" value={highlights} onChange={(e) => setHighlights(e.target.value)} placeholder="Upload your CV in Profile to get these filled in" />
          </div>
          {Object.keys(answers).length > 0 && (
            <div className="space-y-2">
              <h3 className="label">Screening answers</h3>
              {Object.entries(answers).map(([q, a]) => (
                <div key={q}>
                  <label className="mb-0.5 block text-sm" htmlFor={`a-${app.id}-${q}`}>
                    {q}
                  </label>
                  <input id={`a-${app.id}-${q}`} className="field" value={a} onChange={(e) => setAnswers({ ...answers, [q]: e.target.value })} />
                </div>
              ))}
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <button className="btn" disabled={!dirty || pending} onClick={() => act(() => saveDraft(app.id, payload()))}>
              Save changes
            </button>
            {aiOn && (
              <button className="btn" disabled={pending} onClick={() => act(() => regenerateDraft(job.id, true))}>
                <Sparkles size={15} aria-hidden /> Rewrite with AI
              </button>
            )}
            <button className="btn" disabled={pending} onClick={() => act(() => regenerateDraft(job.id, false))}>
              <RotateCcw size={15} aria-hidden /> Use template
            </button>
            <button className="btn btn-danger" disabled={pending} onClick={() => act(() => discardDraft(job.id), { success: "Draft discarded; job moved to Saved" })}>
              <Trash2 size={15} aria-hidden /> Discard
            </button>
          </div>
        </div>
      )}
    </article>
  );
}

export function ApprovedRow({ item }: { item: Item }) {
  const { app, job } = item;
  const { pending, act } = useAction();
  const [copied, setCopied] = useState(false);
  return (
    <li className="flex flex-wrap items-center gap-3 px-4 py-3">
      <div className="min-w-0 flex-1">
        <Link href={`/jobs/${encodeURIComponent(job.id)}`} className="font-medium hover:text-cobalt">
          {job.title}
        </Link>
        <div className="text-sm text-ink-3">
          {job.company}: {app.status === "needs_you" ? "the runner filled what it could and needs you to finish" : app.status === "failed" ? `failed: ${app.error ?? "unknown error"}` : METHOD[app.method]}
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {app.method !== "email" && (
          <button
            className="btn"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(app.coverLetter);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              } catch {}
            }}
          >
            {copied ? "Copied" : "Copy cover letter"}
          </button>
        )}
        <a href={job.applyUrl} target="_blank" rel="noreferrer" className="btn">
          <ExternalLink size={15} aria-hidden /> Open form
        </a>
        <button className="btn btn-primary" disabled={pending} onClick={() => act(() => markAppliedAction(job.id))}>
          Mark applied
        </button>
        {app.status === "approved" && (
          <button className="btn btn-ghost" disabled={pending} onClick={() => act(() => unapprove(app.id), { success: "Moved back to drafts" })}>
            Undo approval
          </button>
        )}
      </div>
    </li>
  );
}

export function ApproveAll({ ids }: { ids: number[] }) {
  const { pending, act } = useAction();
  if (ids.length < 2) return null;
  return (
    <button className="btn" disabled={pending} onClick={() => act(() => approve(ids))}>
      Approve all {ids.length}
    </button>
  );
}
