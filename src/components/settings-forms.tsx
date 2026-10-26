"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import type { AllSettings, AiProvider, AiTask, SourceId } from "@/lib/settings";
import { saveSettingsAction, syncNow } from "@/app/actions";
import { useAction } from "./toast";

type Presets = Record<Exclude<AiProvider, "none">, { id: string; label: string; inPerM: number; outPerM: number }[]>;

function lines(v: string) {
  return v
    .split(/[\n,]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function SaveBar({ pending, onSave, dirty }: { pending: boolean; onSave: () => void; dirty: boolean }) {
  return (
    <div className="flex items-center justify-end gap-3 border-t border-line pt-4">
      {dirty && <span className="text-sm text-ink-3">Unsaved changes</span>}
      <button type="button" className="btn btn-primary" disabled={pending || !dirty} onClick={onSave}>
        {pending ? "Saving…" : "Save"}
      </button>
    </div>
  );
}

/* ---------------- Search ---------------- */
export function SearchForm({ initial, countries }: { initial: AllSettings["search"]; countries: { code: string; name: string }[] }) {
  const [s, setS] = useState(initial);
  const [roleText, setRoleText] = useState(initial.roleKeywords.join(", "));
  const [exclText, setExclText] = useState(initial.excludeTitle.join(", "));
  const [compText, setCompText] = useState(initial.excludeCompanies.join(", "));
  const [langText, setLangText] = useState(initial.languages.join(", "));
  const [addCountry, setAddCountry] = useState("");
  const { pending, act } = useAction();
  const value = { ...s, roleKeywords: lines(roleText), excludeTitle: lines(exclText), excludeCompanies: lines(compText), languages: lines(langText) };
  const baseline = {
    ...initial,
    roleKeywords: lines(initial.roleKeywords.join(", ")),
    excludeTitle: lines(initial.excludeTitle.join(", ")),
    excludeCompanies: lines(initial.excludeCompanies.join(", ")),
    languages: lines(initial.languages.join(", ")),
  };
  const dirty = JSON.stringify(value) !== JSON.stringify(baseline);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="label">Where you want to work</h3>
        <ul className="space-y-2">
          {s.markets.map((m, i) => (
            <li key={m.id} className="flex items-center gap-3">
              <label className="flex flex-1 items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-[var(--cobalt)]"
                  checked={m.enabled}
                  onChange={(e) => setS({ ...s, markets: s.markets.map((x, j) => (j === i ? { ...x, enabled: e.target.checked } : x)) })}
                />
                <span className="font-medium">{m.label}</span>
                <span className="text-ink-3">{m.kind === "remote" ? "Remote roles open to where you live" : "Jobs located there, on-site, hybrid or remote"}</span>
              </label>
              {m.kind === "country" && (
                <button type="button" className="btn btn-ghost px-1.5" aria-label={`Remove ${m.label}`} onClick={() => setS({ ...s, markets: s.markets.filter((_, j) => j !== i) })}>
                  <X size={15} aria-hidden />
                </button>
              )}
            </li>
          ))}
        </ul>
        <div className="mt-3 flex gap-2">
          <select className="field max-w-xs" value={addCountry} onChange={(e) => setAddCountry(e.target.value)} aria-label="Country to add">
            <option value="">Add a country…</option>
            {countries
              .filter((c) => !s.markets.some((m) => m.countryCode === c.code))
              .map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name}
                </option>
              ))}
          </select>
          <button
            type="button"
            className="btn"
            disabled={!addCountry}
            onClick={() => {
              const c = countries.find((x) => x.code === addCountry);
              if (!c) return;
              setS({ ...s, markets: [...s.markets, { id: c.code.toLowerCase(), label: c.name, kind: "country", countryCode: c.code, enabled: true }] });
              setAddCountry("");
            }}
          >
            <Plus size={15} aria-hidden /> Add
          </button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="minScore">
            Match threshold: {s.minScore}
          </label>
          <input id="minScore" type="range" min={30} max={90} step={5} value={s.minScore} onChange={(e) => setS({ ...s, minScore: Number(e.target.value) })} className="w-full accent-[var(--cobalt)]" />
          <p className="text-xs text-ink-3">Jobs at or above this count as strong matches and drive skill advice.</p>
        </div>
        <div>
          <label className="label" htmlFor="maxAge">
            Ignore jobs older than (days)
          </label>
          <input id="maxAge" type="number" min={3} max={90} className="field" value={s.maxAgeDays} onChange={(e) => setS({ ...s, maxAgeDays: Number(e.target.value) })} />
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="langs">
            Languages you can work in
          </label>
          <input id="langs" className="field" value={langText} onChange={(e) => setLangText(e.target.value)} />
          <p className="text-xs text-ink-3">Add German here once you can work in it; until then German-language roles score lower.</p>
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="roles">
            Title words that make a job relevant
          </label>
          <textarea id="roles" className="field min-h-20" value={roleText} onChange={(e) => setRoleText(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="excl">
            Hide titles containing
          </label>
          <textarea id="excl" className="field min-h-20" value={exclText} onChange={(e) => setExclText(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="comp">
            Hide companies
          </label>
          <textarea id="comp" className="field min-h-20" value={compText} onChange={(e) => setCompText(e.target.value)} placeholder="One per line or comma separated" />
        </div>
      </div>
      <SaveBar pending={pending} dirty={dirty} onSave={() => act(() => saveSettingsAction("search", value))} />
    </div>
  );
}

/* ---------------- Sources ---------------- */
export type SourceRow = { id: SourceId; label: string; homepage: string; minIntervalHours: number; last?: { at: number | null; error: string | null; fetched: number; inserted: number; ago: string } };

export function SourcesForm({ initial, sources }: { initial: AllSettings["sources"]; sources: SourceRow[] }) {
  const [s, setS] = useState(initial);
  const [queries, setQueries] = useState(initial.queries.join(", "));
  const [gh, setGh] = useState(initial.watchlist.greenhouse.join(", "));
  const [lv, setLv] = useState(initial.watchlist.lever.join(", "));
  const [ab, setAb] = useState(initial.watchlist.ashby.join(", "));
  const { pending, act } = useAction();
  const value = { ...s, queries: lines(queries), watchlist: { greenhouse: lines(gh), lever: lines(lv), ashby: lines(ab) } };
  const dirty = JSON.stringify(value) !== JSON.stringify(initial);

  return (
    <div className="space-y-6">
      <ul className="divide-y divide-line rounded-xl border border-line">
        {sources.map((src) => (
          <li key={src.id} className="flex flex-wrap items-center gap-3 px-3 py-2.5 text-sm">
            <label className="flex min-w-40 items-center gap-2 font-medium">
              <input type="checkbox" className="h-4 w-4 accent-[var(--cobalt)]" checked={s.enabled[src.id]} onChange={(e) => setS({ ...s, enabled: { ...s.enabled, [src.id]: e.target.checked } })} />
              {src.label}
            </label>
            <span className="flex-1 text-ink-3">
              {src.last
                ? src.last.error
                  ? <span className="text-danger">Failed {src.last.ago}: {src.last.error}</span>
                  : `${src.last.ago}: ${src.last.fetched} fetched, ${src.last.inserted} new`
                : "Never synced"}
            </span>
            <span className="text-xs text-ink-3">at most every {src.minIntervalHours} h</span>
          </li>
        ))}
      </ul>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="label" htmlFor="queries">
            Search terms (for boards that support search)
          </label>
          <input id="queries" className="field" value={queries} onChange={(e) => setQueries(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="gh">
            Greenhouse companies
          </label>
          <textarea id="gh" className="field min-h-20" value={gh} onChange={(e) => setGh(e.target.value)} />
          <p className="text-xs text-ink-3">The slug in boards.greenhouse.io/<b>slug</b></p>
        </div>
        <div>
          <label className="label" htmlFor="lv">
            Lever companies
          </label>
          <textarea id="lv" className="field min-h-20" value={lv} onChange={(e) => setLv(e.target.value)} />
          <p className="text-xs text-ink-3">The slug in jobs.lever.co/<b>slug</b></p>
        </div>
        <div>
          <label className="label" htmlFor="ab">
            Ashby companies
          </label>
          <textarea id="ab" className="field min-h-20" value={ab} onChange={(e) => setAb(e.target.value)} />
          <p className="text-xs text-ink-3">The slug in jobs.ashbyhq.com/<b>slug</b></p>
        </div>
        <div>
          <label className="label" htmlFor="interval">
            Auto-sync every (hours, when deployed)
          </label>
          <input id="interval" type="number" min={1} max={48} className="field" value={s.intervalHours} onChange={(e) => setS({ ...s, intervalHours: Number(e.target.value) })} />
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button type="button" className="btn" disabled={pending} onClick={() => act(() => syncNow(true))}>
          Sync now
        </button>
        <div className="flex-1">
          <SaveBar pending={pending} dirty={dirty} onSave={() => act(() => saveSettingsAction("sources", value))} />
        </div>
      </div>
    </div>
  );
}

/* ---------------- AI ---------------- */
const TASKS: { id: AiTask; label: string; hint: string }[] = [
  { id: "review", label: "Job review", hint: "A second opinion on fit. Short; the cheapest model is plenty." },
  { id: "tailor", label: "Application writing", hint: "Cover letters and answers. Sonnet writes noticeably better." },
  { id: "plan", label: "Learning plan", hint: "Occasional; any model works." },
  { id: "resume", label: "CV reading", hint: "Once per upload." },
];

export function AiForm({
  initial,
  presets,
  keys,
  usage,
  spend,
}: {
  initial: AllSettings["ai"];
  presets: Presets;
  keys: { anthropic: "env" | "saved" | "missing"; openai: "env" | "saved" | "missing" };
  usage: { task: string; model: string; calls: number; cost: number; tokens: number }[];
  spend: number;
}) {
  const [s, setS] = useState(initial);
  const [anthropicKey, setAnthropicKey] = useState("");
  const [openaiKey, setOpenaiKey] = useState("");
  const { pending, act } = useAction();
  const dirty = JSON.stringify(s) !== JSON.stringify(initial) || Boolean(anthropicKey || openaiKey);
  const models = s.provider === "none" ? [] : presets[s.provider];

  function changeProvider(provider: AiProvider) {
    const first = provider === "none" ? "" : presets[provider][0].id;
    setS({ ...s, provider, models: provider === "none" ? s.models : { review: first, tailor: first, plan: first, resume: first } });
  }

  const estimate = (() => {
    if (s.provider === "none") return null;
    const price = (id: string) => presets[s.provider as Exclude<AiProvider, "none">].find((m) => m.id === id) ?? { inPerM: 0, outPerM: 0 };
    const cost = (id: string, inTok: number, outTok: number) => (inTok * price(id).inPerM + outTok * price(id).outPerM) / 1e6;
    return { review: cost(s.models.review, 3500, 300), tailor: cost(s.models.tailor, 5000, 700) };
  })();

  return (
    <div className="space-y-6">
      <div>
        <h3 className="label">Provider</h3>
        <div className="grid gap-2 sm:grid-cols-4">
          {(
            [
              ["none", "Off", "Free matcher and templates only"],
              ["anthropic", "Claude", "Best writing; Haiku is very cheap"],
              ["openai", "OpenAI", "Your OpenAI key"],
              ["ollama", "Ollama", "Free, runs on your Mac"],
            ] as const
          ).map(([id, label, hint]) => (
            <label key={id} className={`cursor-pointer rounded-xl border p-3 text-sm ${s.provider === id ? "border-cobalt bg-cobalt-soft" : "border-line"}`}>
              <input type="radio" name="provider" className="sr-only" checked={s.provider === id} onChange={() => changeProvider(id)} />
              <span className="block font-semibold">{label}</span>
              <span className="text-ink-2">{hint}</span>
            </label>
          ))}
        </div>
        <p className="mt-2 text-xs text-ink-3">A Claude Pro subscription doesn&apos;t include API usage; the API is billed separately at console.anthropic.com. With Haiku, reviewing 100 jobs costs a few cents.</p>
      </div>

      {s.provider === "anthropic" && (
        <KeyField label="Anthropic API key" state={keys.anthropic} value={anthropicKey} onChange={setAnthropicKey} env="ANTHROPIC_API_KEY" />
      )}
      {s.provider === "openai" && <KeyField label="OpenAI API key" state={keys.openai} value={openaiKey} onChange={setOpenaiKey} env="OPENAI_API_KEY" />}
      {s.provider === "ollama" && (
        <div>
          <label className="label" htmlFor="ollama">
            Ollama address
          </label>
          <input id="ollama" className="field max-w-sm" value={s.ollamaUrl} onChange={(e) => setS({ ...s, ollamaUrl: e.target.value })} />
          <p className="mt-1 text-xs text-ink-3">Only works while the app runs on the same Mac as Ollama.</p>
        </div>
      )}

      {s.provider !== "none" && (
        <div className="grid gap-4 sm:grid-cols-2">
          {TASKS.map((t) => (
            <div key={t.id}>
              <label className="label" htmlFor={`m-${t.id}`}>
                {t.label}
              </label>
              <input
                id={`m-${t.id}`}
                list={`models-${s.provider}`}
                className="field"
                value={s.models[t.id]}
                onChange={(e) => setS({ ...s, models: { ...s.models, [t.id]: e.target.value } })}
              />
              <p className="mt-1 text-xs text-ink-3">{t.hint}</p>
            </div>
          ))}
          <datalist id={`models-${s.provider}`}>
            {models.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </datalist>
          <div>
            <label className="label" htmlFor="budget">
              Monthly budget (USD)
            </label>
            <input id="budget" type="number" min={0} step={0.5} className="field" value={s.monthlyBudgetUsd} onChange={(e) => setS({ ...s, monthlyBudgetUsd: Number(e.target.value) })} />
            <p className="mt-1 text-xs text-ink-3">
              Spent ${spend.toFixed(3)} this month. Paid calls stop at the budget and templates take over.
            </p>
          </div>
          <div>
            <label className="label" htmlFor="auto">
              Auto-review the best new jobs after each sync
            </label>
            <input id="auto" type="number" min={0} max={50} className="field" value={s.autoReviewTop} onChange={(e) => setS({ ...s, autoReviewTop: Number(e.target.value) })} />
            <p className="mt-1 text-xs text-ink-3">0 = only when you ask.{estimate && ` About $${estimate.review.toFixed(4)} per review, $${estimate.tailor.toFixed(4)} per application.`}</p>
          </div>
        </div>
      )}

      {usage.length > 0 && (
        <div>
          <h3 className="label">This month</h3>
          <table className="w-full text-sm">
            <thead className="text-left text-ink-3">
              <tr>
                <th className="py-1 font-medium">Task</th>
                <th className="py-1 font-medium">Model</th>
                <th className="py-1 text-right font-medium">Calls</th>
                <th className="py-1 text-right font-medium">Cost</th>
              </tr>
            </thead>
            <tbody>
              {usage.map((u) => (
                <tr key={`${u.task}-${u.model}`} className="border-t border-line">
                  <td className="py-1">{u.task}</td>
                  <td className="py-1 text-ink-2">{u.model}</td>
                  <td className="py-1 text-right tabular-nums">{u.calls}</td>
                  <td className="py-1 text-right tabular-nums">${u.cost.toFixed(4)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <SaveBar
        pending={pending}
        dirty={dirty}
        onSave={() =>
          act(() => saveSettingsAction("ai", { ...s, anthropicKey: anthropicKey || "__keep__", openaiKey: openaiKey || "__keep__" }), {
            onDone: () => {
              setAnthropicKey("");
              setOpenaiKey("");
            },
          })
        }
      />
    </div>
  );
}

function KeyField({ label, state, value, onChange, env }: { label: string; state: "env" | "saved" | "missing"; value: string; onChange: (v: string) => void; env: string }) {
  return (
    <div>
      <label className="label" htmlFor={env}>
        {label}
      </label>
      {state === "env" ? (
        <p className="text-sm text-good">Set from the {env} environment variable.</p>
      ) : (
        <>
          <input id={env} type="password" autoComplete="off" className="field max-w-md" value={value} onChange={(e) => onChange(e.target.value)} placeholder={state === "saved" ? "Saved. Paste a new key to replace it." : "Paste your key"} />
          <p className="mt-1 text-xs text-ink-3">Stored in your database and never sent to the browser. For a deployed app, prefer the {env} environment variable.</p>
        </>
      )}
    </div>
  );
}

/* ---------------- Applying ---------------- */
export function ApplyForm({ initial, smtpReady }: { initial: AllSettings["apply"]; smtpReady: boolean }) {
  const [s, setS] = useState(initial);
  const { pending, act } = useAction();
  const dirty = JSON.stringify(s) !== JSON.stringify(initial);
  return (
    <div className="space-y-5">
      <label className="flex items-start gap-3 text-sm">
        <input type="checkbox" className="mt-0.5 h-4 w-4 accent-[var(--cobalt)]" checked={s.autoSubmit} onChange={(e) => setS({ ...s, autoSubmit: e.target.checked })} />
        <span>
          <span className="block font-medium">Let the runner click Submit</span>
          <span className="text-ink-2">Only when every required field is filled and there is no CAPTCHA. When off, it fills the form and waits for you to submit.</span>
        </span>
      </label>
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="label" htmlFor="limit">
            Most applications per day
          </label>
          <input id="limit" type="number" min={1} max={100} className="field" value={s.dailyLimit} onChange={(e) => setS({ ...s, dailyLimit: Number(e.target.value) })} />
        </div>
        <div>
          <label className="label" htmlFor="fu">
            Follow up after (days)
          </label>
          <input id="fu" type="number" min={1} max={60} className="field" value={s.followUpDays} onChange={(e) => setS({ ...s, followUpDays: Number(e.target.value) })} />
        </div>
        <div>
          <label className="label" htmlFor="subj">
            Email subject
          </label>
          <input id="subj" className="field" value={s.emailSubject} onChange={(e) => setS({ ...s, emailSubject: e.target.value })} />
        </div>
      </div>
      <p className={`text-sm ${smtpReady ? "text-good" : "text-ink-2"}`}>
        {smtpReady ? "Email sending is set up." : "Email applications need SMTP_USER and SMTP_PASS in your .env file (for Gmail, an app password). Without them, email jobs go to “Finish these yourself”."}
      </p>
      <SaveBar pending={pending} dirty={dirty} onSave={() => act(() => saveSettingsAction("apply", s))} />
    </div>
  );
}
