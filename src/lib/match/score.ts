import type { ProfileSkill, ScoreBreakdown } from "../db/schema";
import { locationFit, needsGerman, type Market } from "../geo";
import { findSkill } from "../skills/taxonomy";

export type ScoringProfile = {
  skills: ProfileSkill[];
  roleKeywords: string[];
  yearsExperience: number;
  candidateCountry: string;
  markets: Market[];
  languages: string[];
  excludeTitle: string[];
  excludeCompanies: string[];
  maxAgeDays: number;
};

export type ScoringJob = {
  title: string;
  company: string;
  location: string;
  remote: boolean;
  countries: string[];
  description: string;
  skills: string[];
  niceSkills: string[];
  postedAt: number;
};

const NICE_WEIGHT = 0.35;

/** How well you cover one skill, 0..1, using your level and related skills you know. */
export function coverage(skillName: string, mine: Map<string, number>): number {
  const level = mine.get(skillName.toLowerCase());
  if (level !== undefined) return Math.min(1, 0.55 + 0.15 * level);
  const def = findSkill(skillName);
  let best = 0;
  for (const [name, lvl] of mine) {
    const own = Math.min(1, 0.55 + 0.15 * lvl);
    const fromJob = def?.related?.[findSkill(name)?.name ?? name] ?? 0;
    const fromMine = findSkill(name)?.related?.[skillName] ?? 0;
    best = Math.max(best, Math.max(fromJob, fromMine) * own);
  }
  return best;
}

export function skillMap(skills: ProfileSkill[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const s of skills) map.set((findSkill(s.name)?.name ?? s.name).toLowerCase(), Math.max(1, Math.min(5, s.level)));
  return map;
}

function weightOf(name: string) {
  return findSkill(name)?.weight ?? 1;
}

export function skillsScore(required: string[], nice: string[], mine: Map<string, number>) {
  let got = 0;
  let total = 0;
  const matched: string[] = [];
  const missing: string[] = [];
  const bonus: string[] = [];
  for (const s of required) {
    const w = weightOf(s);
    const c = coverage(s, mine);
    got += w * c;
    total += w;
    if (c >= 0.6) matched.push(s);
    else if (c < 0.4) missing.push(s);
  }
  for (const s of nice) {
    const w = weightOf(s) * NICE_WEIGHT;
    const c = coverage(s, mine);
    got += w * c;
    total += w;
    if (c >= 0.6) bonus.push(s);
  }
  return { value: total === 0 ? 0.3 : got / total, matched, missing, bonus };
}

function includesWord(haystack: string, needle: string) {
  const n = needle.toLowerCase().trim();
  if (!n) return false;
  if (n.endsWith(" ")) return haystack.includes(n) || haystack.endsWith(n.trim());
  return new RegExp(`(?<![a-z0-9])${n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![a-z0-9])`, "i").test(haystack);
}

export function titleScore(title: string, roleKeywords: string[]) {
  const t = title.toLowerCase();
  const strong = roleKeywords.filter((k) => !/^software (engineer|developer)$|^product engineer$/.test(k));
  if (strong.some((k) => includesWord(t, k))) return 1;
  if (roleKeywords.some((k) => includesWord(t, k))) return 0.7;
  if (/\b(engineer|developer|programmer)\b/.test(t)) return 0.45;
  return 0.1;
}

export function seniorityFit(title: string, years: number) {
  const t = title.toLowerCase();
  if (/\b(intern|internship|trainee|working student|werkstudent)\b/.test(t)) return { fit: 0.2, label: "Internship" };
  if (/\b(junior|jr\.?|entry[- ]level|graduate)\b/.test(t)) return { fit: years > 3 ? 0.55 : 1, label: "Junior" };
  if (/\b(principal|distinguished|director|head of|vp|vice president|cto)\b/.test(t)) return { fit: years >= 10 ? 0.9 : 0.25, label: "Principal+" };
  if (/\b(staff|lead|architect)\b/.test(t)) return { fit: years >= 7 ? 1 : years >= 4 ? 0.7 : 0.4, label: "Lead/Staff" };
  if (/\b(senior|sr\.?)\b/.test(t)) return { fit: years >= 5 ? 1 : years >= 3 ? 0.85 : 0.5, label: "Senior" };
  if (/\b(mid|intermediate)\b/.test(t)) return { fit: 1, label: "Mid" };
  return { fit: 0.95, label: "Not stated" };
}

export function freshness(postedAt: number, maxAgeDays: number, now = Date.now()) {
  const days = Math.max(0, (now - postedAt) / 86_400_000);
  if (days <= 3) return 1;
  if (days >= maxAgeDays) return 0;
  return Math.max(0.3, 1 - (days - 3) / Math.max(1, maxAgeDays - 3));
}

export type ScoreResult = { score: number; breakdown: ScoreBreakdown; hidden: boolean };

/** Free, offline match score from 0 to 100 with an explanation of every part. */
export function scoreJob(job: ScoringJob, p: ScoringProfile, now = Date.now()): ScoreResult {
  const mine = skillMap(p.skills);
  const titleLower = job.title.toLowerCase();
  const reasons: string[] = [];

  const excludedBy = p.excludeTitle.find((k) => includesWord(titleLower, k));
  const companyExcluded = p.excludeCompanies.some((c) => c.trim() && job.company.toLowerCase().includes(c.toLowerCase().trim()));

  const sk = skillsScore(job.skills, job.niceSkills, mine);
  const title = titleScore(job.title, p.roleKeywords);
  const sen = seniorityFit(job.title, p.yearsExperience);
  const loc = locationFit(job, p.candidateCountry, p.markets);
  const fresh = freshness(job.postedAt, p.maxAgeDays, now);

  let score = 100 * (0.55 * sk.value + 0.17 * title + 0.15 * loc.fit + 0.08 * sen.fit + 0.05 * fresh);

  reasons.push(loc.reason);
  if (sk.matched.length) reasons.push(`You have ${sk.matched.length} of ${job.skills.length} listed skills`);
  if (job.skills.length === 0) reasons.push("No recognised skills in the posting; read it yourself");
  if (sen.fit < 0.7) reasons.push(`Seniority looks off (${sen.label})`);

  const speaksGerman = p.languages.some((l) => /german|deutsch/i.test(l));
  if (!speaksGerman && needsGerman(`${job.title}\n${job.description}`)) {
    score = Math.min(score, 45);
    reasons.push("Needs German");
  }
  if (!loc.eligible) score = Math.min(score, 35);
  // Not a developer role and little skill overlap: keep it out of the way.
  if (title <= 0.1 && (sk.value < 0.5 || job.skills.length === 0)) score = Math.min(score, 15);
  if (fresh === 0) reasons.push("Older than your age limit");

  const hidden = Boolean(excludedBy) || companyExcluded;
  if (excludedBy) reasons.push(`Title contains "${excludedBy.trim()}"`);
  if (companyExcluded) reasons.push("Company is on your exclude list");

  return {
    score: Math.round(Math.max(0, Math.min(100, score))),
    hidden,
    breakdown: {
      skills: Math.round(sk.value * 100),
      title: Math.round(title * 100),
      location: Math.round(loc.fit * 100),
      seniority: Math.round(sen.fit * 100),
      freshness: Math.round(fresh * 100),
      matched: sk.matched,
      missing: sk.missing,
      bonus: sk.bonus,
      eligible: loc.eligible,
      reasons,
    },
  };
}

