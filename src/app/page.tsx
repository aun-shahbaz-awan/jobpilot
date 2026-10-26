import Link from "next/link";
import { connection } from "next/server";
import { dashboard } from "@/lib/queries";
import { getProfile } from "@/lib/profile";
import { getSettings } from "@/lib/settings";
import { computeInsights } from "@/lib/insights";
import { monthSpend } from "@/lib/ai/client";
import { dateLabel, plural, timeAgo } from "@/lib/format";
import { JobList } from "@/components/job-list";
import { SyncButton } from "@/components/sync-button";

export default async function Today() {
  await connection();
  const settings = await getSettings();
  const [d, profile, insights, spend] = await Promise.all([dashboard(settings.search.minScore), getProfile(), computeInsights(), monthSpend()]);
  const firstName = profile.fullName.split(" ")[0] || "there";
  const profileGaps = [!profile.email && "email", !profile.phone && "phone", !profile.resumeText && "CV"].filter(Boolean) as string[];

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold md:text-4xl">Hi {firstName}.</h1>
          <p className="mt-1 text-ink-2">
            {d.neverSynced
              ? "Start by finding jobs. It takes about a minute."
              : d.drafts
                ? `${plural(d.drafts, "application")} ${d.drafts === 1 ? "is" : "are"} waiting for your review.`
                : d.strongNew
                  ? `${plural(d.strongNew, "strong match", "strong matches")} to look at.`
                  : "Nothing urgent. New jobs arrive with each sync."}
          </p>
        </div>
        {d.neverSynced && (
          <div className="w-56">
            <SyncButton lastSync={null} compact />
          </div>
        )}
      </header>

      {profileGaps.length > 0 && (
        <div className="panel flex flex-wrap items-center justify-between gap-3 border-mid bg-mid-soft px-4 py-3 text-sm">
          <span>Applications need your {profileGaps.join(", ")}. Add {profileGaps.length > 1 ? "them" : "it"} before approving anything.</span>
          <Link href="/profile" className="btn">
            Complete profile
          </Link>
        </div>
      )}

      <section aria-label="This week" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat href="/queue" value={d.drafts} label="Drafts to review" accent={d.drafts > 0} />
        <Stat href={`/jobs?min=${settings.search.minScore}`} value={d.strongNew} label={`New matches ≥ ${settings.search.minScore}`} />
        <Stat href="/pipeline" value={d.appliedWeek} label="Applied in 7 days" />
        <Stat href="/queue" value={d.approved} label="Approved, not yet sent" />
      </section>

      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <section aria-labelledby="top-h" className="min-w-0">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 id="top-h" className="text-xl font-semibold">
              Best new matches
            </h2>
            <Link href="/jobs" className="text-sm font-medium text-cobalt hover:underline">
              All matches
            </Link>
          </div>
          <JobList
            jobs={d.top}
            minScore={settings.search.minScore}
            selectable={false}
            empty={<p className="panel px-4 py-8 text-center text-ink-2">No new jobs yet. Use “Find new jobs” to pull the latest listings.</p>}
          />
        </section>

        <div className="space-y-6">
          <section className="panel p-4" aria-labelledby="funnel-h">
            <h2 id="funnel-h" className="mb-3 text-base font-semibold">
              Your funnel
            </h2>
            <Funnel applied={d.funnel.applied} interview={d.funnel.interview} offer={d.funnel.offer} />
          </section>

          <section className="panel p-4" aria-labelledby="fu-h">
            <h2 id="fu-h" className="mb-2 text-base font-semibold">
              Follow-ups due
            </h2>
            {d.followUps.length ? (
              <ul className="space-y-2 text-sm">
                {d.followUps.map((f) => (
                  <li key={f.id} className="flex justify-between gap-2">
                    <Link href={`/jobs/${encodeURIComponent(f.id)}`} className="min-w-0 truncate hover:text-cobalt">
                      {f.company}: {f.title}
                    </Link>
                    <span className={`shrink-0 ${f.followUpAt! < Date.now() ? "text-danger" : "text-ink-3"}`}>{dateLabel(f.followUpAt!)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-ink-3">None due. Applied jobs get a follow-up date automatically.</p>
            )}
          </section>

          <section className="panel p-4" aria-labelledby="learn-h">
            <div className="mb-2 flex items-baseline justify-between">
              <h2 id="learn-h" className="text-base font-semibold">
                Learn next
              </h2>
              <Link href="/skills" className="text-sm text-cobalt hover:underline">
                Details
              </Link>
            </div>
            {insights.learnNext.length ? (
              <>
                <ol className="space-y-1.5 text-sm">
                  {insights.learnNext.slice(0, 3).map((s) => (
                    <li key={s.skill} className="flex justify-between gap-2">
                      <span className="font-medium">{s.skill}</span>
                      <span className="text-ink-3">{s.unlocks ? `+${s.unlocks} jobs` : `${s.demand}% of jobs`}</span>
                    </li>
                  ))}
                </ol>
                <p className="mt-3 text-xs text-ink-3">
                  {insights.overall.readyNow} of {insights.relevantJobs} relevant jobs fit you now
                  {insights.overall.afterTop3 > insights.overall.readyNow ? `; ${insights.overall.afterTop3} would after these three.` : "."}
                </p>
              </>
            ) : (
              <p className="text-sm text-ink-3">Skill advice appears after the first sync.</p>
            )}
          </section>

          <section className="panel p-4" aria-labelledby="act-h">
            <h2 id="act-h" className="mb-2 text-base font-semibold">
              Recent activity
            </h2>
            {d.recent.length ? (
              <ul className="space-y-2 text-sm">
                {d.recent.map((e) => (
                  <li key={e.id}>
                    <span className="text-ink-2">{e.message}</span>
                    {e.title && (
                      <Link href={`/jobs/${encodeURIComponent(e.jobId!)}`} className="block truncate text-ink-3 hover:text-cobalt">
                        {e.company}: {e.title}
                      </Link>
                    )}
                    <span className="block text-xs text-ink-3">{timeAgo(e.createdAt)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-ink-3">Nothing yet.</p>
            )}
          </section>

          {d.failingSources.length > 0 && (
            <p className="text-xs text-danger">
              Some sources failed last time: {d.failingSources.map((s) => s.source).join(", ")}. See Settings → Sources.
            </p>
          )}
          {settings.ai.provider !== "none" && (
            <p className="text-xs text-ink-3">
              AI spend this month: ${spend.toFixed(2)} of ${settings.ai.monthlyBudgetUsd.toFixed(2)}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ href, value, label, accent }: { href: string; value: number; label: string; accent?: boolean }) {
  return (
    <Link href={href} className={`panel block p-4 transition-colors hover:border-cobalt ${accent ? "border-cobalt" : ""}`}>
      <div className={`font-display text-4xl font-semibold tabular-nums ${accent ? "text-cobalt" : ""}`}>{value}</div>
      <div className="mt-1 text-sm text-ink-2">{label}</div>
    </Link>
  );
}

function Funnel({ applied, interview, offer }: { applied: number; interview: number; offer: number }) {
  const max = Math.max(applied, 1);
  const rows = [
    { label: "Applied", n: applied },
    { label: "Interviews", n: interview },
    { label: "Offers", n: offer },
  ];
  return (
    <div className="space-y-2">
      {rows.map((r, i) => (
        <div key={r.label}>
          <div className="mb-0.5 flex justify-between text-sm">
            <span className="text-ink-2">{r.label}</span>
            <span className="font-medium tabular-nums">
              {r.n}
              {i > 0 && applied > 0 && <span className="ml-1 text-ink-3">({Math.round((r.n / applied) * 100)}%)</span>}
            </span>
          </div>
          <div className="h-2 rounded-full bg-sunken">
            <div className="h-2 rounded-full bg-cobalt" style={{ width: `${(r.n / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}
