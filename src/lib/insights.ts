import { gte, notInArray, and } from "drizzle-orm";
import { db } from "./db";
import { jobs, type Job } from "./db/schema";
import { coverage, scoreJob, skillMap } from "./match/score";
import { getProfile, toScoringProfile } from "./profile";
import { getSettings } from "./settings";
import { CATEGORY_ORDER, findSkill, type SkillCategory } from "./skills/taxonomy";

export type SkillDemand = {
  skill: string;
  category: SkillCategory | "Other";
  /** % of relevant jobs that require it. */
  demand: number;
  /** % of relevant jobs that list it as nice to have. */
  niceDemand: number;
  jobs: number;
  /** Your coverage 0..100 (includes credit from related skills). */
  yours: number;
  /** Relevant jobs that would reach your match threshold if you learned it. */
  unlocks: number;
  /** Average score gain on jobs that list it. */
  avgGain: number;
  /** Change in demand between the last 7 days and the period before, in percentage points. */
  trend: number;
  learn?: string;
};

export type Insights = {
  relevantJobs: number;
  minScore: number;
  learnNext: SkillDemand[];
  strengths: SkillDemand[];
  categories: { category: string; demand: number; yours: number }[];
  overall: { readyNow: number; afterTop3: number };
};

/** Jobs that are the right kind of role and that you could apply for: the base for all demand numbers. */
function isRelevant(j: Job) {
  return Boolean(j.breakdown && j.breakdown.title >= 70 && j.breakdown.eligible);
}

export async function computeInsights(): Promise<Insights> {
  const settings = await getSettings();
  const profile = await getProfile();
  const scoring = toScoringProfile(profile, settings);
  const minScore = settings.search.minScore;
  const since = Date.now() - settings.search.maxAgeDays * 86_400_000;
  const all = await db
    .select()
    .from(jobs)
    .where(and(gte(jobs.postedAt, since), notInArray(jobs.status, ["hidden"])));
  const relevant = all.filter(isRelevant);
  const n = relevant.length || 1;
  // Score against your current profile, in case stored scores predate a profile edit.
  const baseline = new Map(relevant.map((j) => [j.id, scoreJob(j, scoring).score]));
  const mine = skillMap(profile.skills);
  const weekAgo = Date.now() - 7 * 86_400_000;
  const recent = relevant.filter((j) => j.postedAt >= weekAgo);
  const older = relevant.filter((j) => j.postedAt < weekAgo);

  const req = new Map<string, Job[]>();
  const nice = new Map<string, number>();
  for (const j of relevant) {
    for (const s of j.skills) req.set(s, [...(req.get(s) ?? []), j]);
    for (const s of j.niceSkills) nice.set(s, (nice.get(s) ?? 0) + 1);
  }
  const allSkills = new Set([...req.keys(), ...nice.keys()]);

  const rows: SkillDemand[] = [];
  for (const skill of allSkills) {
    const listing = req.get(skill) ?? [];
    const demand = (listing.length / n) * 100;
    const niceDemand = ((nice.get(skill) ?? 0) / n) * 100;
    const yours = coverage(skill, mine);
    let unlocks = 0;
    let gain = 0;

    if (yours < 0.85 && demand + niceDemand >= 1.5) {
      const boosted = { ...scoring, skills: [...profile.skills.filter((s) => s.name !== skill), { name: skill, level: 3 }] };
      const affected = [...listing, ...relevant.filter((j) => j.niceSkills.includes(skill))];
      for (const j of affected) {
        const before = baseline.get(j.id) ?? j.score;
        const after = scoreJob(j, boosted).score;
        gain += after - before;
        if (before < minScore && after >= minScore) unlocks++;
      }
      gain = affected.length ? gain / affected.length : 0;
    }

    const share = (list: Job[]) => (list.length ? (list.filter((j) => j.skills.includes(skill)).length / list.length) * 100 : 0);
    const def = findSkill(skill);
    rows.push({
      skill,
      category: def?.category ?? "Other",
      demand: Math.round(demand),
      niceDemand: Math.round(niceDemand),
      jobs: listing.length,
      yours: Math.round(yours * 100),
      unlocks,
      avgGain: Math.round(gain * 10) / 10,
      trend: recent.length >= 5 && older.length >= 5 ? Math.round(share(recent) - share(older)) : 0,
      learn: def?.learn,
    });
  }

  // Average gain only counts in proportion to demand, so a skill from one odd posting can't top the list.
  const priority = (r: SkillDemand) =>
    r.unlocks * 3 + r.demand + r.niceDemand * 0.4 + r.avgGain * 2 * Math.min(1, (r.demand + r.niceDemand) / 15) + Math.max(0, r.trend) * 0.5;
  const learnNext = rows
    .filter((r) => r.yours < 60 && (r.demand >= 2 || r.unlocks > 0) && (findSkill(r.skill)?.weight ?? 1) >= 0.5)
    .sort((a, b) => priority(b) - priority(a))
    .slice(0, 15);
  const strengths = rows.filter((r) => r.yours >= 60).sort((a, b) => b.demand - a.demand).slice(0, 12);

  const categories = CATEGORY_ORDER.map((category) => {
    const inCat = rows.filter((r) => r.category === category);
    const demand = inCat.reduce((a, r) => a + r.demand, 0);
    const yours = demand ? inCat.reduce((a, r) => a + r.demand * (r.yours / 100), 0) / demand : 0;
    return { category, demand: Math.round(demand), yours: Math.round(yours * 100) };
  }).filter((c) => c.demand > 0);

  // How many relevant jobs reach the threshold now, and after learning the top three suggestions.
  const readyNow = relevant.filter((j) => (baseline.get(j.id) ?? 0) >= minScore).length;
  const top3 = learnNext.slice(0, 3).map((r) => r.skill);
  const upskilled = { ...scoring, skills: [...profile.skills, ...top3.map((name) => ({ name, level: 3 }))] };
  const afterTop3 = relevant.filter((j) => scoreJob(j, upskilled).score >= minScore).length;

  return { relevantJobs: relevant.length, minScore, learnNext, strengths, categories, overall: { readyNow, afterTop3 } };
}
