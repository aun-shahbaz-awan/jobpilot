"use client";

import { useRef, useState } from "react";
import { Plus, Trash2, Upload, X } from "lucide-react";
import type { Profile } from "@/lib/db/schema";
import { saveProfile, uploadResume, type ProfileInput } from "@/app/actions";
import { useAction } from "./toast";

const LEVELS = ["", "Basics", "Working", "Solid", "Strong", "Expert"];

export function ProfileForm({ profile, countries, skillNames, resume }: { profile: Profile; countries: { code: string; name: string }[]; skillNames: string[]; resume: { name: string; size: number } | null }) {
  const [p, setP] = useState<ProfileInput>({
    fullName: profile.fullName,
    email: profile.email,
    phone: profile.phone,
    location: profile.location,
    countryCode: profile.countryCode,
    headline: profile.headline,
    summary: profile.summary,
    linkedin: profile.linkedin,
    github: profile.github,
    portfolio: profile.portfolio,
    yearsExperience: profile.yearsExperience,
    targetRoles: profile.targetRoles,
    skills: profile.skills,
    learning: profile.learning,
    resumeText: profile.resumeText,
    workAuthorization: profile.workAuthorization,
    noticePeriod: profile.noticePeriod,
    salaryExpectation: profile.salaryExpectation,
    answers: profile.answers,
  });
  const [newSkill, setNewSkill] = useState("");
  const { pending, act } = useAction();
  const fileRef = useRef<HTMLInputElement>(null);
  const set = <K extends keyof ProfileInput>(k: K, v: ProfileInput[K]) => setP((x) => ({ ...x, [k]: v }));

  function addSkill() {
    const name = newSkill.trim();
    if (!name || p.skills.some((s) => s.name.toLowerCase() === name.toLowerCase())) return setNewSkill("");
    set("skills", [...p.skills, { name, level: 3 }]);
    setNewSkill("");
  }

  const text = (k: keyof ProfileInput, label: string, opts: { type?: string; placeholder?: string; autoComplete?: string } = {}) => (
    <div>
      <label className="label" htmlFor={`p-${k}`}>
        {label}
      </label>
      <input id={`p-${k}`} className="field" type={opts.type ?? "text"} autoComplete={opts.autoComplete} placeholder={opts.placeholder} value={String(p[k] ?? "")} onChange={(e) => set(k, e.target.value as never)} />
    </div>
  );

  return (
    <form
      className="space-y-8"
      onSubmit={(e) => {
        e.preventDefault();
        act(() => saveProfile(p));
      }}
    >
      <section className="panel p-4 md:p-6" aria-labelledby="cv-h">
        <h2 id="cv-h" className="text-lg font-semibold">
          CV
        </h2>
        <p className="mb-3 text-sm text-ink-2">
          Upload a PDF or Word file. It fills empty fields, adds skills it finds, and is attached to applications.
          {resume && (
            <>
              {" "}
              Current file:{" "}
              <a href="/api/resume" target="_blank" className="text-cobalt hover:underline">
                {resume.name}
              </a>{" "}
              ({Math.round(resume.size / 1024)} KB).
            </>
          )}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <input ref={fileRef} type="file" accept=".pdf,.docx,.txt" className="text-sm file:mr-3 file:rounded-lg file:border file:border-line file:bg-surface file:px-3 file:py-1.5 file:text-sm" aria-label="CV file" />
          <button
            type="button"
            className="btn"
            disabled={pending}
            onClick={() => {
              const f = fileRef.current?.files?.[0];
              if (!f) return;
              const fd = new FormData();
              fd.set("file", f);
              act(() => uploadResume(fd), { onDone: () => window.location.reload() });
            }}
          >
            <Upload size={15} aria-hidden /> {pending ? "Reading…" : "Upload CV"}
          </button>
        </div>
      </section>

      <section className="panel grid gap-4 p-4 sm:grid-cols-2 md:p-6" aria-labelledby="basic-h">
        <h2 id="basic-h" className="text-lg font-semibold sm:col-span-2">
          Contact details
        </h2>
        {text("fullName", "Full name", { autoComplete: "name" })}
        {text("headline", "Headline", { placeholder: "Frontend / Web3 Engineer" })}
        {text("email", "Email", { type: "email", autoComplete: "email" })}
        {text("phone", "Phone", { type: "tel", autoComplete: "tel", placeholder: "+971 …" })}
        {text("location", "City", { placeholder: "Dubai, United Arab Emirates" })}
        <div>
          <label className="label" htmlFor="p-country">
            Country you live in
          </label>
          <select id="p-country" className="field" value={p.countryCode} onChange={(e) => set("countryCode", e.target.value)}>
            {countries.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        {text("linkedin", "LinkedIn URL", { type: "url" })}
        {text("github", "GitHub URL", { type: "url" })}
        {text("portfolio", "Portfolio or website", { type: "url" })}
        <div>
          <label className="label" htmlFor="p-years">
            Years of experience
          </label>
          <input id="p-years" className="field" type="number" min={0} max={50} step={0.5} value={p.yearsExperience} onChange={(e) => set("yearsExperience", Number(e.target.value))} />
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="p-summary">
            Summary
          </label>
          <textarea id="p-summary" className="field min-h-24" value={p.summary} onChange={(e) => set("summary", e.target.value)} />
          <p className="mt-1 text-xs text-ink-3">Used in template cover letters, so write it in the first person.</p>
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="p-roles">
            Roles you want (comma separated)
          </label>
          <input id="p-roles" className="field" value={p.targetRoles.join(", ")} onChange={(e) => set("targetRoles", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))} />
        </div>
      </section>

      <section className="panel p-4 md:p-6" aria-labelledby="skills-h">
        <h2 id="skills-h" className="text-lg font-semibold">
          Skills ({p.skills.length})
        </h2>
        <p className="mb-4 text-sm text-ink-2">Levels drive the match score. Be honest: 3 means you&apos;d be comfortable using it in production next week.</p>
        <ul className="divide-y divide-line">
          {p.skills
            .map((s, i) => ({ s, i }))
            .sort((a, b) => b.s.level - a.s.level || a.s.name.localeCompare(b.s.name))
            .map(({ s, i }) => (
              <li key={s.name} className="flex flex-wrap items-center gap-3 py-2">
                <span className="w-44 font-medium">{s.name}</span>
                <div className="flex gap-1" role="radiogroup" aria-label={`${s.name} level`}>
                  {[1, 2, 3, 4, 5].map((lvl) => (
                    <button
                      type="button"
                      key={lvl}
                      role="radio"
                      aria-checked={s.level === lvl}
                      title={LEVELS[lvl]}
                      onClick={() => set("skills", p.skills.map((x, j) => (j === i ? { ...x, level: lvl } : x)))}
                      className={`h-7 w-7 rounded-md border text-xs font-semibold tabular-nums ${lvl <= s.level ? "border-cobalt bg-cobalt text-cobalt-ink" : "border-line text-ink-3 hover:border-cobalt"}`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
                <span className="text-xs text-ink-3">{LEVELS[s.level]}</span>
                <button type="button" className="btn btn-ghost ml-auto px-1.5" aria-label={`Remove ${s.name}`} onClick={() => set("skills", p.skills.filter((_, j) => j !== i))}>
                  <X size={15} aria-hidden />
                </button>
              </li>
            ))}
        </ul>
        <div className="mt-3 flex gap-2">
          <input
            list="skill-names"
            className="field max-w-xs"
            placeholder="Add a skill"
            value={newSkill}
            onChange={(e) => setNewSkill(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addSkill();
              }
            }}
            aria-label="Skill name"
          />
          <datalist id="skill-names">
            {skillNames.map((n) => (
              <option key={n} value={n} />
            ))}
          </datalist>
          <button type="button" className="btn" onClick={addSkill}>
            <Plus size={15} aria-hidden /> Add
          </button>
        </div>
      </section>

      <section className="panel grid gap-4 p-4 sm:grid-cols-3 md:p-6" aria-labelledby="facts-h">
        <h2 id="facts-h" className="text-lg font-semibold sm:col-span-3">
          Answers forms always ask
        </h2>
        {text("workAuthorization", "Work authorization", { placeholder: "e.g. UAE residence; need sponsorship for EU" })}
        {text("noticePeriod", "Notice period", { placeholder: "e.g. 1 month" })}
        {text("salaryExpectation", "Salary expectation", { placeholder: "e.g. USD 60,000–75,000" })}
        <div className="sm:col-span-3">
          <h3 className="label">Other screening questions</h3>
          <ul className="space-y-3">
            {p.answers.map((a, i) => (
              <li key={i} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                <input className="field" value={a.question} placeholder="Question" aria-label={`Question ${i + 1}`} onChange={(e) => set("answers", p.answers.map((x, j) => (j === i ? { ...x, question: e.target.value } : x)))} />
                <input className="field" value={a.answer} placeholder="Your answer" aria-label={`Answer ${i + 1}`} onChange={(e) => set("answers", p.answers.map((x, j) => (j === i ? { ...x, answer: e.target.value } : x)))} />
                <button type="button" className="btn btn-ghost px-2" aria-label={`Remove question ${i + 1}`} onClick={() => set("answers", p.answers.filter((_, j) => j !== i))}>
                  <Trash2 size={15} aria-hidden />
                </button>
              </li>
            ))}
          </ul>
          <button type="button" className="btn mt-3" onClick={() => set("answers", [...p.answers, { question: "", answer: "" }])}>
            <Plus size={15} aria-hidden /> Add question
          </button>
        </div>
      </section>

      <section className="panel p-4 md:p-6" aria-labelledby="text-h">
        <h2 id="text-h" className="text-lg font-semibold">
          CV text
        </h2>
        <p className="mb-2 text-sm text-ink-2">What the AI and the highlight picker read. Fix anything the upload garbled.</p>
        <textarea className="field min-h-64 font-mono text-[13px]" value={p.resumeText} onChange={(e) => set("resumeText", e.target.value)} aria-labelledby="text-h" />
      </section>

      <div className="sticky bottom-20 z-10 flex justify-end md:bottom-4">
        <button className="btn btn-primary px-5 py-2 shadow-lg" disabled={pending}>
          {pending ? "Saving…" : "Save profile"}
        </button>
      </div>
    </form>
  );
}
