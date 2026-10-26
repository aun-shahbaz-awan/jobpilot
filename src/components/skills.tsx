"use client";

import { useState } from "react";
import { BookOpen, Sparkles } from "lucide-react";
import type { LearningPlan } from "@/lib/ai/tasks";
import { addSkillLevel, generatePlan, markLearning } from "@/app/actions";
import { useAction } from "./toast";

export function SkillActions({ skill, learning, learn }: { skill: string; learning: boolean; learn?: string }) {
  const { pending, act } = useAction();
  return (
    <div className="flex flex-wrap items-center justify-end gap-1.5">
      {learn && (
        <a href={learn} target="_blank" rel="noreferrer" className="btn btn-ghost px-2 text-xs" title={`Learning resources for ${skill}`}>
          <BookOpen size={14} aria-hidden /> Learn
        </a>
      )}
      <button className={`btn px-2 text-xs ${learning ? "border-cobalt text-cobalt" : ""}`} aria-pressed={learning} disabled={pending} onClick={() => act(() => markLearning(skill, !learning))}>
        {learning ? "Learning" : "Start learning"}
      </button>
      <label className="sr-only" htmlFor={`know-${skill}`}>
        I already know {skill}
      </label>
      <select
        id={`know-${skill}`}
        className="rounded-lg border border-line bg-surface px-1.5 py-1 text-xs"
        value=""
        disabled={pending}
        onChange={(e) => e.target.value && act(() => addSkillLevel(skill, Number(e.target.value)))}
      >
        <option value="">I know it…</option>
        <option value="2">Basics (2/5)</option>
        <option value="3">Solid (3/5)</option>
        <option value="4">Strong (4/5)</option>
      </select>
    </div>
  );
}

export function PlanPanel({ initial, aiOn }: { initial: (LearningPlan & { createdAt?: number }) | null; aiOn: boolean }) {
  const [plan, setPlan] = useState(initial);
  const { pending, act } = useAction();
  return (
    <section className="panel p-4 md:p-6" aria-labelledby="plan-h">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="plan-h" className="text-xl font-semibold">
          Learning plan
        </h2>
        {aiOn && (
          <button className="btn" disabled={pending} onClick={() => act(() => generatePlan(), { success: "Plan ready", onDone: (p) => p && setPlan(p) })}>
            <Sparkles size={15} aria-hidden /> {pending ? "Planning…" : plan ? "Make a new plan" : "Make a plan with AI"}
          </button>
        )}
      </div>
      {!aiOn && <p className="mt-2 text-sm text-ink-2">Turn on an AI provider in Settings to get a week-by-week plan with portfolio projects. The ranking above works without it.</p>}
      {plan && (
        <div className="mt-3">
          <p className="max-w-[70ch] text-ink-2">{plan.summary}</p>
          <ol className="mt-4 space-y-4">
            {plan.steps.map((s, i) => (
              <li key={s.skill} className="grid gap-1 sm:grid-cols-[2rem_1fr]">
                <span className="font-display text-2xl font-semibold text-cobalt tabular-nums">{i + 1}</span>
                <div>
                  <div className="flex flex-wrap items-baseline gap-x-3">
                    <h3 className="font-semibold">{s.skill}</h3>
                    <span className="text-sm text-ink-3">{s.weeks} week{s.weeks === 1 ? "" : "s"}</span>
                  </div>
                  <p className="text-sm text-ink-2">{s.why}</p>
                  <p className="mt-1 text-sm">
                    <span className="font-medium">Build: </span>
                    {s.project}
                  </p>
                  {s.resources?.length > 0 && <p className="mt-1 text-xs text-ink-3">{s.resources.join("; ")}</p>}
                </div>
              </li>
            ))}
          </ol>
          <p className="mt-4 text-xs text-ink-3">Planned by {plan.model}</p>
        </div>
      )}
    </section>
  );
}
