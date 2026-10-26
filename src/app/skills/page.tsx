import { connection } from "next/server";
import { eq } from "drizzle-orm";
import { TrendingDown, TrendingUp } from "lucide-react";
import { db } from "@/lib/db";
import { settings as settingsTable } from "@/lib/db/schema";
import { computeInsights } from "@/lib/insights";
import { getProfile } from "@/lib/profile";
import { getSettings } from "@/lib/settings";
import type { LearningPlan } from "@/lib/ai/tasks";
import { PlanPanel, SkillActions } from "@/components/skills";

export default async function Skills() {
  await connection();
  const [insights, profile, settings, [planRow]] = await Promise.all([
    computeInsights(),
    getProfile(),
    getSettings(),
    db.select().from(settingsTable).where(eq(settingsTable.key, "learningPlan")),
  ]);
  const plan = (planRow?.value as (LearningPlan & { createdAt?: number }) | undefined) ?? null;
  const maxDemand = Math.max(1, ...insights.learnNext.map((r) => r.demand), ...insights.strengths.map((r) => r.demand));
  const gain = insights.overall.afterTop3 - insights.overall.readyNow;

  if (insights.relevantJobs === 0) {
    return (
      <div className="mx-auto max-w-4xl">
        <h1 className="text-3xl font-bold">Skills</h1>
        <p className="panel mt-6 px-6 py-12 text-center text-ink-2">Find jobs first. Skill advice is calculated from the roles you match.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <header>
        <h1 className="text-3xl font-bold">Skills</h1>
        <p className="mt-1 max-w-[70ch] text-ink-2">
          Based on {insights.relevantJobs} {profile.headline ? `${profile.headline.toLowerCase()} ` : ""}roles you could apply for. Ranked by how many jobs each skill would push over your {insights.minScore}-point threshold, then by demand.
        </p>
      </header>

      <section className="grid gap-3 sm:grid-cols-3" aria-label="Summary">
        <div className="panel p-4">
          <div className="font-display text-4xl font-semibold tabular-nums">{insights.overall.readyNow}</div>
          <div className="text-sm text-ink-2">jobs you fit today</div>
        </div>
        <div className="panel border-cobalt p-4">
          <div className="font-display text-4xl font-semibold text-cobalt tabular-nums">{gain > 0 ? `+${gain}` : gain}</div>
          <div className="text-sm text-ink-2">more after the top three skills</div>
        </div>
        <div className="panel p-4">
          <div className="font-display text-4xl font-semibold tabular-nums">{insights.relevantJobs}</div>
          <div className="text-sm text-ink-2">relevant jobs analysed</div>
        </div>
      </section>

      <section aria-labelledby="next-h">
        <h2 id="next-h" className="mb-3 text-xl font-semibold">
          Learn next
        </h2>
        <div className="panel overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="text-left text-ink-3">
              <tr className="border-b border-line">
                <th className="px-4 py-2 font-medium">Skill</th>
                <th className="px-2 py-2 font-medium">Asked for in</th>
                <th className="px-2 py-2 text-right font-medium">Unlocks</th>
                <th className="px-2 py-2 text-right font-medium">Avg. gain</th>
                <th className="px-2 py-2 text-right font-medium">You</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {insights.learnNext.map((r) => (
                <tr key={r.skill}>
                  <td className="px-4 py-2.5">
                    <div className="font-medium">{r.skill}</div>
                    <div className="text-xs text-ink-3">{r.category}</div>
                  </td>
                  <td className="px-2 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-28 rounded-full bg-sunken">
                        <div className="h-2 rounded-full bg-cobalt" style={{ width: `${(r.demand / maxDemand) * 100}%` }} />
                      </div>
                      <span className="tabular-nums">{r.demand}%</span>
                      {r.trend > 2 && <TrendingUp size={14} className="text-good" aria-label={`Up ${r.trend} points this week`} />}
                      {r.trend < -2 && <TrendingDown size={14} className="text-ink-3" aria-label={`Down ${-r.trend} points this week`} />}
                    </div>
                    {r.niceDemand > 0 && <div className="text-xs text-ink-3">+{r.niceDemand}% as nice to have</div>}
                  </td>
                  <td className="px-2 py-2.5 text-right font-semibold tabular-nums">{r.unlocks || "–"}</td>
                  <td className="px-2 py-2.5 text-right tabular-nums">{r.avgGain > 0 ? `+${r.avgGain}` : "–"}</td>
                  <td className="px-2 py-2.5 text-right tabular-nums text-ink-2">{r.yours ? `${r.yours}%` : "None"}</td>
                  <td className="px-4 py-2.5">
                    <SkillActions skill={r.skill} learning={profile.learning.includes(r.skill)} learn={r.learn} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-ink-3">“You” counts related experience: knowing Vue earns some credit for React. “Unlocks” assumes a solid (3/5) level.</p>
      </section>

      <PlanPanel initial={plan} aiOn={settings.ai.provider !== "none"} />

      <div className="grid gap-6 lg:grid-cols-2">
        <section aria-labelledby="str-h">
          <h2 id="str-h" className="mb-3 text-xl font-semibold">
            Your strengths in demand
          </h2>
          <ul className="panel divide-y divide-line">
            {insights.strengths.map((r) => (
              <li key={r.skill} className="flex items-center justify-between gap-3 px-4 py-2 text-sm">
                <span className="font-medium">{r.skill}</span>
                <span className="flex items-center gap-2 text-ink-2">
                  <span className="h-2 w-24 rounded-full bg-sunken">
                    <span className="block h-2 rounded-full bg-good" style={{ width: `${(r.demand / maxDemand) * 100}%` }} />
                  </span>
                  <span className="w-10 text-right tabular-nums">{r.demand}%</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
        <section aria-labelledby="cat-h">
          <h2 id="cat-h" className="mb-3 text-xl font-semibold">
            Coverage by area
          </h2>
          <ul className="panel space-y-3 p-4">
            {insights.categories.map((c) => (
              <li key={c.category} className="text-sm">
                <div className="mb-1 flex justify-between">
                  <span>{c.category}</span>
                  <span className="text-ink-3 tabular-nums">{c.yours}% covered</span>
                </div>
                <div className="h-2 rounded-full bg-sunken">
                  <div className="h-2 rounded-full bg-good" style={{ width: `${c.yours}%` }} />
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-ink-3">Weighted by how often each skill in the area appears in your matches.</p>
        </section>
      </div>
    </div>
  );
}
