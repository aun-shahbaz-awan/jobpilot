"use client";

import { useState } from "react";
import { Bot, ExternalLink, FilePenLine, Star, Trash2 } from "lucide-react";
import type { Contact, JobStatus } from "@/lib/db/schema";
import { addContact, addEvent, deleteContact, markAppliedAction, queueJobs, reviewWithAi, saveNotes, setFollowUp, setStatus, toggleStar } from "@/app/actions";
import { useAction } from "./toast";

const STATUSES: { value: JobStatus; label: string }[] = [
  { value: "new", label: "New" },
  { value: "saved", label: "Saved" },
  { value: "queued", label: "In review" },
  { value: "applied", label: "Applied" },
  { value: "interview", label: "Interviewing" },
  { value: "offer", label: "Offer" },
  { value: "rejected", label: "Rejected" },
  { value: "archived", label: "Not interested" },
];

export function JobActions({ id, status, starred, applyUrl, hasDraft, aiOn }: { id: string; status: JobStatus; starred: boolean; applyUrl: string; hasDraft: boolean; aiOn: boolean }) {
  const { pending, act } = useAction();
  const applied = ["applied", "interview", "offer", "rejected"].includes(status);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <a href={applyUrl} target="_blank" rel="noreferrer" className="btn">
        <ExternalLink size={15} aria-hidden /> Open posting
      </a>
      {!applied && (
        <button className="btn btn-primary" disabled={pending} onClick={() => act(() => queueJobs([id]))}>
          <FilePenLine size={15} aria-hidden /> {hasDraft ? "Redraft application" : "Draft application"}
        </button>
      )}
      {!applied && (
        <button className="btn" disabled={pending} onClick={() => act(() => markAppliedAction(id))}>
          Mark applied
        </button>
      )}
      {aiOn && (
        <button className="btn" disabled={pending} onClick={() => act(() => reviewWithAi([id]))}>
          <Bot size={15} aria-hidden /> AI review
        </button>
      )}
      <button
        className="btn btn-ghost px-2"
        disabled={pending}
        aria-pressed={starred}
        aria-label={starred ? "Remove star" : "Star"}
        onClick={() => act(() => toggleStar(id, !starred))}
      >
        <Star size={17} fill={starred ? "var(--mid)" : "none"} className={starred ? "text-mid" : ""} aria-hidden />
      </button>
      <label className="sr-only" htmlFor="status">
        Status
      </label>
      <select id="status" className="field w-auto" value={status === "hidden" ? "new" : status} disabled={pending} onChange={(e) => act(() => setStatus(id, e.target.value as JobStatus))}>
        {STATUSES.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function Notes({ id, initial }: { id: string; initial: string }) {
  const [value, setValue] = useState(initial);
  const { pending, act } = useAction();
  const dirty = value !== initial;
  return (
    <div>
      <label htmlFor="notes" className="label">
        Notes
      </label>
      <textarea id="notes" className="field min-h-28" value={value} onChange={(e) => setValue(e.target.value)} placeholder="Recruiter name, salary range discussed, interview prep…" />
      <button className="btn mt-2" disabled={!dirty || pending} onClick={() => act(() => saveNotes(id, value), { success: "Notes saved" })}>
        Save notes
      </button>
    </div>
  );
}

export function FollowUp({ id, initial }: { id: string; initial: string }) {
  const { pending, act } = useAction();
  return (
    <div>
      <label htmlFor="followup" className="label">
        Follow up on
      </label>
      <div className="flex gap-2">
        <input id="followup" type="date" className="field" defaultValue={initial} disabled={pending} onChange={(e) => act(() => setFollowUp(id, e.target.value || null), { success: e.target.value ? "Follow-up set" : "Follow-up cleared" })} />
      </div>
    </div>
  );
}

export function Contacts({ jobId, people }: { jobId: string; people: Contact[] }) {
  const { pending, act } = useAction();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", role: "", email: "", linkedin: "" });
  return (
    <div>
      <h3 className="mb-2 text-base font-semibold">People</h3>
      {people.length > 0 && (
        <ul className="mb-3 space-y-2 text-sm">
          {people.map((c) => (
            <li key={c.id} className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="font-medium">{c.name}</div>
                <div className="text-ink-3">{[c.role, c.email].filter(Boolean).join(", ")}</div>
                {c.linkedin && (
                  <a href={c.linkedin} target="_blank" rel="noreferrer" className="text-cobalt hover:underline">
                    LinkedIn
                  </a>
                )}
              </div>
              <button className="btn btn-ghost px-1.5" aria-label={`Remove ${c.name}`} disabled={pending} onClick={() => act(() => deleteContact(c.id))}>
                <Trash2 size={15} aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
      {open ? (
        <form
          className="space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            act(() => addContact(jobId, form), { success: "Contact added", onDone: () => (setForm({ name: "", role: "", email: "", linkedin: "" }), setOpen(false)) });
          }}
        >
          <input className="field" placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required aria-label="Name" />
          <input className="field" placeholder="Role, e.g. Recruiter" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} aria-label="Role" />
          <input className="field" type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} aria-label="Email" />
          <input className="field" placeholder="LinkedIn URL" value={form.linkedin} onChange={(e) => setForm({ ...form, linkedin: e.target.value })} aria-label="LinkedIn URL" />
          <div className="flex gap-2">
            <button className="btn btn-primary" disabled={pending}>
              Add person
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button className="btn" onClick={() => setOpen(true)}>
          Add a person
        </button>
      )}
    </div>
  );
}

export function LogNote({ jobId }: { jobId: string }) {
  const [text, setText] = useState("");
  const { pending, act } = useAction();
  return (
    <form
      className="flex gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (text.trim()) act(() => addEvent(jobId, text.trim()), { success: "Logged", onDone: () => setText("") });
      }}
    >
      <input className="field" value={text} onChange={(e) => setText(e.target.value)} placeholder="Log an update, e.g. Phone screen booked for Monday" aria-label="Log an update" />
      <button className="btn" disabled={pending || !text.trim()}>
        Log
      </button>
    </form>
  );
}
