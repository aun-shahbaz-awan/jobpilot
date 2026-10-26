import { and, asc, desc, eq, gte, inArray, isNotNull, like, lte, or, sql, type SQL } from "drizzle-orm";
import { db } from "./db";
import { applications, contacts, events, jobs, syncRuns, type JobStatus } from "./db/schema";

export type JobFilters = {
  q?: string;
  min?: number;
  status?: "open" | "new" | "saved" | "all";
  source?: string;
  where?: "any" | "remote" | "onsite";
  sort?: "score" | "newest" | "salary";
  page?: number;
  starred?: boolean;
};

export const PAGE_SIZE = 40;

export async function listJobs(f: JobFilters) {
  const conds: SQL[] = [];
  const status = f.status ?? "open";
  if (status === "open") conds.push(inArray(jobs.status, ["new", "saved"]));
  else if (status === "new") conds.push(eq(jobs.status, "new"));
  else if (status === "saved") conds.push(eq(jobs.status, "saved"));
  else conds.push(sql`${jobs.status} != 'hidden'`);
  if (f.min) conds.push(gte(jobs.score, f.min));
  if (f.source) conds.push(eq(jobs.source, f.source));
  if (f.where === "remote") conds.push(eq(jobs.remote, true));
  if (f.where === "onsite") conds.push(eq(jobs.remote, false));
  if (f.starred) conds.push(eq(jobs.starred, true));
  if (f.q?.trim()) {
    const q = `%${f.q.trim()}%`;
    conds.push(or(like(jobs.title, q), like(jobs.company, q), like(jobs.location, q), like(jobs.skills, q))!);
  }
  const order =
    f.sort === "newest" ? [desc(jobs.postedAt)] : f.sort === "salary" ? [sql`coalesce(${jobs.salaryMax}, ${jobs.salaryMin}, 0) desc`, desc(jobs.score)] : [desc(jobs.score), desc(jobs.postedAt)];
  const page = Math.max(1, f.page ?? 1);
  const where = and(...conds);
  const [rows, total] = await Promise.all([
    db
      .select()
      .from(jobs)
      .where(where)
      .orderBy(...order)
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
    db.$count(jobs, where),
  ]);
  return { rows, total, page, pages: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

export async function sourceCounts() {
  return db
    .select({ source: jobs.source, n: sql<number>`count(*)` })
    .from(jobs)
    .where(sql`${jobs.status} != 'hidden'`)
    .groupBy(jobs.source);
}

export async function jobDetail(id: string) {
  const [job] = await db.select().from(jobs).where(eq(jobs.id, id));
  if (!job) return null;
  const [app] = await db.select().from(applications).where(eq(applications.jobId, id)).orderBy(desc(applications.id)).limit(1);
  const [timeline, people, similar] = await Promise.all([
    db.select().from(events).where(eq(events.jobId, id)).orderBy(desc(events.createdAt)).limit(50),
    db.select().from(contacts).where(eq(contacts.jobId, id)).orderBy(asc(contacts.createdAt)),
    db
      .select({ id: jobs.id, title: jobs.title, status: jobs.status })
      .from(jobs)
      .where(and(eq(jobs.company, job.company), sql`${jobs.id} != ${id}`))
      .limit(5),
  ]);
  return { job, app: app ?? null, timeline, people, similar };
}

const PIPELINE: JobStatus[] = ["saved", "queued", "applied", "interview", "offer", "rejected"];

export async function pipelineJobs() {
  return db
    .select({
      id: jobs.id,
      title: jobs.title,
      company: jobs.company,
      score: jobs.score,
      status: jobs.status,
      statusChangedAt: jobs.statusChangedAt,
      followUpAt: jobs.followUpAt,
      starred: jobs.starred,
      location: jobs.location,
      remote: jobs.remote,
    })
    .from(jobs)
    .where(inArray(jobs.status, PIPELINE))
    .orderBy(desc(jobs.starred), desc(jobs.statusChangedAt));
}

export async function queueItems() {
  const rows = await db
    .select({ app: applications, job: jobs })
    .from(applications)
    .innerJoin(jobs, eq(applications.jobId, jobs.id))
    .where(inArray(applications.status, ["draft", "approved", "submitting", "needs_you", "failed"]))
    .orderBy(desc(jobs.score));
  return rows;
}

export async function dashboard(minScore: number) {
  const now = Date.now();
  const weekAgo = now - 7 * 86_400_000;
  const [strongNew, drafts, approved, appliedWeek, followUps, recent, top, funnelRows, lastRuns] = await Promise.all([
    db.$count(jobs, and(eq(jobs.status, "new"), gte(jobs.score, minScore))),
    db.$count(applications, eq(applications.status, "draft")),
    db.$count(applications, inArray(applications.status, ["approved", "needs_you"])),
    db.$count(jobs, and(isNotNull(jobs.appliedAt), gte(jobs.appliedAt, weekAgo))),
    db
      .select({ id: jobs.id, title: jobs.title, company: jobs.company, followUpAt: jobs.followUpAt, status: jobs.status })
      .from(jobs)
      .where(and(isNotNull(jobs.followUpAt), lte(jobs.followUpAt, now + 86_400_000), inArray(jobs.status, ["applied", "interview"])))
      .orderBy(asc(jobs.followUpAt))
      .limit(6),
    db
      .select({ id: events.id, jobId: events.jobId, message: events.message, createdAt: events.createdAt, title: jobs.title, company: jobs.company })
      .from(events)
      .leftJoin(jobs, eq(events.jobId, jobs.id))
      .orderBy(desc(events.createdAt))
      .limit(8),
    db.select().from(jobs).where(eq(jobs.status, "new")).orderBy(desc(jobs.score), desc(jobs.postedAt)).limit(6),
    db.select({ status: jobs.status, n: sql<number>`count(*)` }).from(jobs).groupBy(jobs.status),
    db
      .select({ source: syncRuns.source, finishedAt: syncRuns.finishedAt, error: syncRuns.error, inserted: syncRuns.inserted })
      .from(syncRuns)
      .orderBy(desc(syncRuns.startedAt))
      .limit(30),
  ]);
  const count = Object.fromEntries(funnelRows.map((r) => [r.status, Number(r.n)])) as Record<string, number>;
  const everApplied = (count.applied ?? 0) + (count.interview ?? 0) + (count.offer ?? 0) + (count.rejected ?? 0);
  return {
    strongNew,
    drafts,
    approved,
    appliedWeek,
    followUps,
    recent,
    top,
    funnel: { applied: everApplied, interview: (count.interview ?? 0) + (count.offer ?? 0), offer: count.offer ?? 0 },
    totalJobs: Object.values(count).reduce((a, b) => a + b, 0),
    neverSynced: lastRuns.length === 0,
    failingSources: [...new Map(lastRuns.map((r) => [r.source, r])).values()].filter((r) => r.error),
  };
}

export async function sourceStatus() {
  const rows = await db.select().from(syncRuns).orderBy(desc(syncRuns.startedAt)).limit(200);
  const latest = new Map<string, (typeof rows)[number]>();
  for (const r of rows) if (!latest.has(r.source)) latest.set(r.source, r);
  return latest;
}
