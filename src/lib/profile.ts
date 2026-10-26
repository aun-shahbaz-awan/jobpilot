import { eq } from "drizzle-orm";
import { db } from "./db";
import { profile, type Profile } from "./db/schema";
import type { ScoringProfile } from "./match/score";
import type { AllSettings } from "./settings";

export async function getProfile(): Promise<Profile> {
  const [row] = await db.select().from(profile).where(eq(profile.id, 1));
  if (row) return row;
  await db.insert(profile).values({ id: 1 }).onConflictDoNothing();
  const [created] = await db.select().from(profile).where(eq(profile.id, 1));
  return created;
}

export function toScoringProfile(p: Profile, s: AllSettings): ScoringProfile {
  return {
    skills: p.skills,
    roleKeywords: [...new Set([...s.search.roleKeywords, ...p.targetRoles.map((r) => r.toLowerCase())])],
    yearsExperience: p.yearsExperience,
    candidateCountry: p.countryCode || s.search.candidateCountry,
    markets: s.search.markets,
    languages: s.search.languages,
    excludeTitle: s.search.excludeTitle,
    excludeCompanies: s.search.excludeCompanies,
    maxAgeDays: s.search.maxAgeDays,
  };
}

export function firstLastName(full: string): { first: string; last: string } {
  const parts = full.trim().split(/\s+/);
  if (parts.length <= 1) return { first: parts[0] ?? "", last: "" };
  return { first: parts.slice(0, -1).join(" "), last: parts[parts.length - 1] };
}
