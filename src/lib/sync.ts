import { and, desc, eq, gte, inArray, isNull, notInArray } from "drizzle-orm";
import { aiReady } from "./ai/client";
import { aiReview } from "./applications";
import { detectAts, findApplyEmail } from "./ats";
import { db } from "./db";
import { events, jobs, syncRuns, type NewJob } from "./db/schema";
import { scoreJob } from "./match/score";
import { getProfile, toScoringProfile } from "./profile";
import { getSettings, type SourceId } from "./settings";
import { extractSkills, htmlToText } from "./skills/extract";
import { SOURCES, type RawJob } from "./sources";

/** New jobs scoring below this are not stored, which keeps the database focused on relevant roles. */
const STORE_THRESHOLD = 20;

export type SyncSummary = {
  source: SourceId;
  status: "ok" | "skipped" | "error";
  fetched: number;
  inserted: number;
  updated: number;
  message?: string;
};

function norm(s: string) {
  return s
    .toLowerCase()
    .replace(/\(.*?\)/g, "")
    .replace(/\b(inc|llc|ltd|gmbh|ag|bv|co|corp|labs?)\b\.?/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function prettyCompany(name: string) {
  if (name && name === name.toLowerCase() && !name.includes(" ")) {
    return name.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  }
  return name;
}

export function normalise(raw: RawJob): Omit<NewJob, "score" | "breakdown" | "status"> {
  const description = htmlToText(raw.description);
  const { required, nice } = extractSkills(`${raw.title}\n${description}`, raw.tags ?? []);
  const applyUrl = raw.applyUrl || raw.url;
  const applyEmail = findApplyEmail(description);
  const company = prettyCompany(raw.company.trim());
  return {
    id: `${raw.source}:${raw.externalId}`,
    source: raw.source,
    externalId: raw.externalId,
    dedupeKey: `${norm(company)}|${norm(raw.title)}`,
    title: raw.title.trim(),
    company,
    companyLogo: raw.companyLogo || null,
    location: raw.location?.trim() ?? "",
    remote: raw.remote,
    countries: raw.countries ?? [],
    url: raw.url,
    applyUrl,
    ats: applyEmail && detectAts(applyUrl) === "board" ? "email" : detectAts(applyUrl),
    applyEmail,
    description,
    tags: raw.tags ?? [],
    salaryMin: raw.salaryMin ?? null,
    salaryMax: raw.salaryMax ?? null,
    salaryCurrency: raw.salaryCurrency ?? null,
    salaryPeriod: raw.salaryPeriod ?? null,
    seniority: raw.seniority ?? null,
    employmentType: raw.employmentType ?? null,
    postedAt: raw.postedAt,
    skills: required,
    niceSkills: nice,
  };
}

async function lastSuccess(source: SourceId): Promise<number | null> {
  const [row] = await db
    .select({ at: syncRuns.finishedAt })
    .from(syncRuns)
    .where(and(eq(syncRuns.source, source), isNull(syncRuns.error)))
    .orderBy(desc(syncRuns.startedAt))
    .limit(1);
  return row?.at ?? null;
}

export async function syncSources(opts: { only?: SourceId[]; force?: boolean; log?: (m: string) => void } = {}): Promise<SyncSummary[]> {
  const log = opts.log ?? (() => {});
  const settings = await getSettings();
  const scoring = toScoringProfile(await getProfile(), settings);
  const cutoff = Date.now() - settings.search.maxAgeDays * 86_400_000;
  const results: SyncSummary[] = [];

  for (const source of SOURCES) {
    if (opts.only && !opts.only.includes(source.id)) continue;
    if (!settings.sources.enabled[source.id]) continue;

    const last = await lastSuccess(source.id);
    const minGap = source.minIntervalHours * 3_600_000;
    // Board APIs ask for limited polling, so their minimum gap applies even to manual syncs.
    const boardLimit = ["remotive", "remoteok", "himalayas"].includes(source.id);
    if (last && Date.now() - last < minGap && (!opts.force || boardLimit)) {
      const mins = Math.ceil((minGap - (Date.now() - last)) / 60_000);
      results.push({ source: source.id, status: "skipped", fetched: 0, inserted: 0, updated: 0, message: `Next fetch allowed in ${mins} min` });
      continue;
    }

    const startedAt = Date.now();
    const [run] = await db.insert(syncRuns).values({ source: source.id, startedAt }).returning({ id: syncRuns.id });
    const notes: string[] = [];
    try {
      log(`Fetching ${source.label}…`);
      const raw = await source.fetch({
        queries: settings.sources.queries,
        watchlist: settings.sources.watchlist,
        log: (m) => {
          notes.push(m);
          log(m);
        },
      });
      const fresh = raw.filter((r) => r.title && r.url && r.postedAt >= cutoff);
      const ids = fresh.map((r) => `${r.source}:${r.externalId}`);
      const existing = new Map<string, { id: string; status: string }>();
      for (let i = 0; i < ids.length; i += 400) {
        const chunk = ids.slice(i, i + 400);
        const rows = await db.select({ id: jobs.id, status: jobs.status }).from(jobs).where(inArray(jobs.id, chunk));
        rows.forEach((r) => existing.set(r.id, r));
      }

      let inserted = 0;
      let updated = 0;
      for (const r of fresh) {
        const n = normalise(r);
        const scored = scoreJob({ ...n, location: n.location ?? "", remote: n.remote ?? false, countries: n.countries ?? [], description: n.description ?? "", skills: n.skills ?? [], niceSkills: n.niceSkills ?? [] }, scoring);
        if (existing.has(n.id)) {
          await db.update(jobs).set({ ...n, score: scored.score, breakdown: scored.breakdown }).where(eq(jobs.id, n.id));
          updated++;
          continue;
        }
        if (scored.hidden || scored.score < STORE_THRESHOLD) continue;
        const [dupe] = await db.select({ id: jobs.id }).from(jobs).where(eq(jobs.dedupeKey, n.dedupeKey)).limit(1);
        if (dupe) continue;
        await db.insert(jobs).values({ ...n, score: scored.score, breakdown: scored.breakdown, status: "new" }).onConflictDoNothing();
        inserted++;
      }

      await db
        .update(syncRuns)
        .set({ finishedAt: Date.now(), fetched: raw.length, inserted, updated, error: null })
        .where(eq(syncRuns.id, run.id));
      results.push({ source: source.id, status: "ok", fetched: raw.length, inserted, updated, message: notes.length ? notes.join("; ") : undefined });
      log(`${source.label}: ${raw.length} fetched, ${inserted} new, ${updated} updated`);
    } catch (e) {
      const message = (e as Error).message || String(e);
      await db.update(syncRuns).set({ finishedAt: Date.now(), error: message }).where(eq(syncRuns.id, run.id));
      results.push({ source: source.id, status: "error", fetched: 0, inserted: 0, updated: 0, message });
      log(`${source.label} failed: ${message}`);
    }
  }

  const added = results.reduce((a, r) => a + r.inserted, 0);
  if (added) await db.insert(events).values({ type: "sync", message: `Found ${added} new matching job${added === 1 ? "" : "s"}` });

  // Optional: get an AI second opinion on the best new matches.
  if (settings.ai.autoReviewTop > 0 && aiReady(settings.ai).ok) {
    const top = await db
      .select({ id: jobs.id })
      .from(jobs)
      .where(and(eq(jobs.status, "new"), isNull(jobs.ai), gte(jobs.score, settings.search.minScore)))
      .orderBy(desc(jobs.score))
      .limit(settings.ai.autoReviewTop);
    for (const j of top) {
      try {
        await aiReview(j.id);
      } catch (e) {
        log(`AI review stopped: ${(e as Error).message}`);
        break;
      }
    }
  }
  return results;
}

/** Re-scores every stored job, e.g. after you change your skills or markets. */
export async function rescoreAll(): Promise<number> {
  const settings = await getSettings();
  const scoring = toScoringProfile(await getProfile(), settings);
  const rows = await db.select().from(jobs).where(notInArray(jobs.status, ["archived"]));
  for (const j of rows) {
    const s = scoreJob(j, scoring);
    const status = s.hidden && j.status === "new" ? "hidden" : !s.hidden && j.status === "hidden" ? "new" : j.status;
    if (s.score !== j.score || status !== j.status || JSON.stringify(s.breakdown) !== JSON.stringify(j.breakdown)) {
      await db.update(jobs).set({ score: s.score, breakdown: s.breakdown, status }).where(eq(jobs.id, j.id));
    }
  }
  return rows.length;
}

/** Re-extracts skills from stored descriptions, e.g. after editing the skill dictionary. */
export async function reextractAll(): Promise<void> {
  const rows = await db.select({ id: jobs.id, title: jobs.title, description: jobs.description, tags: jobs.tags }).from(jobs);
  for (const j of rows) {
    const { required, nice } = extractSkills(`${j.title}\n${j.description}`, j.tags);
    await db.update(jobs).set({ skills: required, niceSkills: nice }).where(eq(jobs.id, j.id));
  }
  await rescoreAll();
}

/**
 * Syncs only the single most overdue source. Serverless hosts cap function run time,
 * so a scheduler calls this every 30 minutes instead of syncing everything at once.
 */
export async function syncNextDue(): Promise<SyncSummary[]> {
  const settings = await getSettings();
  const due: { id: SourceId; overdue: number }[] = [];
  for (const s of SOURCES) {
    if (!settings.sources.enabled[s.id]) continue;
    const last = (await lastSuccess(s.id)) ?? 0;
    const gap = Math.max(s.minIntervalHours, settings.sources.intervalHours) * 3_600_000;
    due.push({ id: s.id, overdue: Date.now() - last - gap });
  }
  const next = due.filter((d) => d.overdue >= 0).sort((a, b) => b.overdue - a.overdue)[0];
  if (!next) return [];
  return syncSources({ only: [next.id] });
}
