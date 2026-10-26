import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { ArrowLeft } from "lucide-react";
import { jobDetail } from "@/lib/queries";
import { getSettings } from "@/lib/settings";
import { ATS_LABEL, AUTOFILL_ATS, type Ats } from "@/lib/ats";
import { STATUS_LABEL } from "@/lib/applications";
import { isoDate, salary, sourceLabel, timeAgo, whereLabel } from "@/lib/format";
import { ScoreRing, SkillChips } from "@/components/score";
import { Contacts, FollowUp, JobActions, LogNote, Notes } from "@/components/job-detail";

export default async function JobPage({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const { id } = await params;
  const data = await jobDetail(decodeURIComponent(id));
  if (!data) notFound();
  const { job, app, timeline, people, similar } = data;
  const settings = await getSettings();
  const b = job.breakdown;
  const pay = salary(job);
  const partial = job.skills.filter((s) => !b?.matched.includes(s) && !b?.missing.includes(s));

  return (
    <div className="mx-auto max-w-6xl">
      <Link href="/jobs" className="mb-4 inline-flex items-center gap-1 text-sm text-ink-2 hover:text-cobalt">
        <ArrowLeft size={15} aria-hidden /> Matches
      </Link>

      <header className="mb-6 flex flex-wrap items-start gap-4">
        <ScoreRing score={job.score} minScore={settings.search.minScore} size={64} />
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold leading-tight md:text-3xl">{job.title}</h1>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-ink-2">
            <span className="font-medium text-ink">{job.company}</span>
            <span>{whereLabel(job)}</span>
            {pay && <span>{pay}</span>}
            <span>Posted {timeAgo(job.postedAt)}</span>
            <span>Status: {STATUS_LABEL[job.status]}</span>
          </div>
        </div>
      </header>

      <div className="mb-6">
        <JobActions id={job.id} status={job.status} starred={job.starred} applyUrl={job.applyUrl} hasDraft={Boolean(app)} aiOn={settings.ai.provider !== "none"} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="min-w-0 space-y-6">
          {app && (
            <section className="panel border-cobalt p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-base font-semibold">Application {app.status === "draft" ? "draft ready" : app.status.replace("_", " ")}</h2>
                  <p className="text-sm text-ink-2">
                    {app.method === "form" ? `The apply runner fills the ${ATS_LABEL[job.ats as Ats]} form after you approve.` : app.method === "email" ? `Sent by email to ${job.applyEmail} after you approve.` : "This site needs you to apply in the browser; the draft gives you text to paste."}
                  </p>
                </div>
                <Link href={`/queue#app-${app.id}`} className="btn btn-primary">
                  Review draft
                </Link>
              </div>
            </section>
          )}

          <section className="panel p-4" aria-labelledby="fit-h">
            <h2 id="fit-h" className="mb-3 text-base font-semibold">
              Why it scored {job.score}
            </h2>
            {b && (
              <>
                <div className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-5">
                  {(
                    [
                      ["Skills", b.skills, "55%"],
                      ["Role", b.title, "17%"],
                      ["Location", b.location, "15%"],
                      ["Seniority", b.seniority, "8%"],
                      ["Freshness", b.freshness, "5%"],
                    ] as const
                  ).map(([label, v, w]) => (
                    <div key={label}>
                      <div className="flex justify-between text-sm">
                        <span className="text-ink-2">{label}</span>
                        <span className="tabular-nums">{v}</span>
                      </div>
                      <div className="mt-1 h-1.5 rounded-full bg-sunken">
                        <div className="h-1.5 rounded-full bg-cobalt" style={{ width: `${v}%` }} />
                      </div>
                      <div className="mt-0.5 text-xs text-ink-3">weight {w}</div>
                    </div>
                  ))}
                </div>
                <ul className="mt-4 list-disc space-y-0.5 pl-5 text-sm text-ink-2">
                  {b.reasons.map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div>
                    <h3 className="mb-1.5 text-sm font-medium">You have</h3>
                    {b.matched.length || b.bonus.length ? <SkillChips skills={[...b.matched, ...b.bonus]} tone="good" /> : <p className="text-sm text-ink-3">None of the listed skills</p>}
                  </div>
                  <div>
                    <h3 className="mb-1.5 text-sm font-medium">Missing</h3>
                    {b.missing.length ? <SkillChips skills={b.missing} tone="missing" /> : <p className="text-sm text-ink-3">Nothing required is missing</p>}
                  </div>
                  {partial.length > 0 && (
                    <div>
                      <h3 className="mb-1.5 text-sm font-medium">Related experience</h3>
                      <SkillChips skills={partial} tone="neutral" />
                    </div>
                  )}
                  {job.niceSkills.length > 0 && (
                    <div>
                      <h3 className="mb-1.5 text-sm font-medium">Nice to have</h3>
                      <SkillChips skills={job.niceSkills} tone="neutral" />
                    </div>
                  )}
                </div>
              </>
            )}
          </section>

          {job.ai && (
            <section className="panel p-4" aria-labelledby="ai-h">
              <div className="flex items-baseline justify-between">
                <h2 id="ai-h" className="text-base font-semibold">
                  AI second opinion: {job.ai.score}
                </h2>
                <span className="text-xs text-ink-3">{job.ai.model}</span>
              </div>
              <p className="mt-1">{job.ai.verdict}</p>
              <div className="mt-3 grid gap-4 text-sm sm:grid-cols-3">
                <AiList title="Strengths" items={job.ai.strengths} />
                <AiList title="Gaps" items={job.ai.gaps} />
                <AiList title="Red flags" items={job.ai.redFlags} empty="None found" />
              </div>
            </section>
          )}

          <section className="panel p-4 md:p-6" aria-labelledby="desc-h">
            <h2 id="desc-h" className="mb-3 text-base font-semibold">
              Job description
            </h2>
            <div className="max-w-[72ch] whitespace-pre-line text-[15px] leading-relaxed text-ink">{job.description || "No description provided."}</div>
            <p className="mt-6 text-xs text-ink-3">
              Listing from{" "}
              <a href={job.url} target="_blank" rel="noreferrer" className="underline hover:text-cobalt">
                {sourceLabel(job.source)}
              </a>
              . Applications go through {AUTOFILL_ATS.includes(job.ats as Ats) ? `${ATS_LABEL[job.ats as Ats]} (auto-fill supported)` : ATS_LABEL[job.ats as Ats] ?? "the company site"}.
            </p>
          </section>
        </div>

        <aside className="space-y-6">
          <section className="panel space-y-4 p-4">
            <FollowUp id={job.id} initial={isoDate(job.followUpAt)} />
            <Notes id={job.id} initial={job.notes} />
          </section>
          <section className="panel p-4">
            <Contacts jobId={job.id} people={people} />
          </section>
          <section className="panel p-4" aria-labelledby="tl-h">
            <h3 id="tl-h" className="mb-2 text-base font-semibold">
              Timeline
            </h3>
            <LogNote jobId={job.id} />
            <ol className="mt-3 space-y-2 border-l border-line pl-3 text-sm">
              {timeline.map((e) => (
                <li key={e.id}>
                  <div>{e.message}</div>
                  <div className="text-xs text-ink-3">{timeAgo(e.createdAt)}</div>
                </li>
              ))}
              <li>
                <div>Found on {sourceLabel(job.source)}</div>
                <div className="text-xs text-ink-3">{timeAgo(job.fetchedAt)}</div>
              </li>
            </ol>
          </section>
          {similar.length > 0 && (
            <section className="panel p-4">
              <h3 className="mb-2 text-base font-semibold">More at {job.company}</h3>
              <ul className="space-y-1 text-sm">
                {similar.map((s) => (
                  <li key={s.id}>
                    <Link href={`/jobs/${encodeURIComponent(s.id)}`} className="hover:text-cobalt">
                      {s.title}
                    </Link>{" "}
                    <span className="text-ink-3">({STATUS_LABEL[s.status]})</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}

function AiList({ title, items, empty = "None" }: { title: string; items: string[]; empty?: string }) {
  return (
    <div>
      <h3 className="mb-1 font-medium">{title}</h3>
      {items.length ? (
        <ul className="list-disc space-y-0.5 pl-4 text-ink-2">
          {items.map((i) => (
            <li key={i}>{i}</li>
          ))}
        </ul>
      ) : (
        <p className="text-ink-3">{empty}</p>
      )}
    </div>
  );
}
