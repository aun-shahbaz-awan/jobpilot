import { connection } from "next/server";
import { COUNTRIES } from "@/lib/geo";
import { getSettings, keySource, MODEL_PRESETS } from "@/lib/settings";
import { SOURCES } from "@/lib/sources";
import { sourceStatus } from "@/lib/queries";
import { monthSpend, usageSummary } from "@/lib/ai/client";
import { timeAgo } from "@/lib/format";
import { AiForm, ApplyForm, SearchForm, SourcesForm, type SourceRow } from "@/components/settings-forms";

export default async function SettingsPage() {
  await connection();
  const [settings, status, usage, spend] = await Promise.all([getSettings(), sourceStatus(), usageSummary(), monthSpend()]);
  const countries = COUNTRIES.map((c) => ({ code: c.code, name: c.name })).sort((a, b) => a.name.localeCompare(b.name));
  const sources: SourceRow[] = SOURCES.map((s) => {
    const r = status.get(s.id);
    return {
      id: s.id,
      label: s.label,
      homepage: s.homepage,
      minIntervalHours: s.minIntervalHours,
      last: r ? { at: r.finishedAt, error: r.error, fetched: r.fetched, inserted: r.inserted, ago: timeAgo(r.finishedAt ?? r.startedAt) } : undefined,
    };
  });
  const safeAi = { ...settings.ai, anthropicKey: "", openaiKey: "" };
  const smtpReady = Boolean(process.env.SMTP_USER && process.env.SMTP_PASS);

  const sections = [
    { id: "search", title: "Search", hint: "Where you want to work and what counts as a match.", body: <SearchForm initial={settings.search} countries={countries} /> },
    { id: "sources", title: "Sources", hint: "Job boards and company career pages to pull from. Each board's polling limits are respected.", body: <SourcesForm initial={settings.sources} sources={sources} /> },
    { id: "ai", title: "AI", hint: "Optional. Everything works without it; AI adds second opinions, better letters and learning plans.", body: <AiForm initial={safeAi} presets={MODEL_PRESETS} keys={keySource(settings.ai)} usage={usage} spend={spend} /> },
    { id: "apply", title: "Applying", hint: "How the apply runner behaves on your computer.", body: <ApplyForm initial={settings.apply} smtpReady={smtpReady} /> },
  ];

  return (
    <div className="mx-auto max-w-4xl">
      <header className="mb-6">
        <h1 className="text-3xl font-bold">Settings</h1>
        <nav className="mt-3 flex flex-wrap gap-2" aria-label="Settings sections">
          {sections.map((s) => (
            <a key={s.id} href={`#${s.id}`} className="btn btn-ghost">
              {s.title}
            </a>
          ))}
        </nav>
      </header>
      <div className="space-y-8">
        {sections.map((s) => (
          <section key={s.id} id={s.id} className="panel scroll-mt-6 p-4 md:p-6" aria-labelledby={`${s.id}-h`}>
            <h2 id={`${s.id}-h`} className="text-xl font-semibold">
              {s.title}
            </h2>
            <p className="mb-5 text-sm text-ink-2">{s.hint}</p>
            {s.body}
          </section>
        ))}
      </div>
    </div>
  );
}
