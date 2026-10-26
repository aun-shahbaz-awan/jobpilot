import { desc, eq } from "drizzle-orm";
import { AUTOFILL_ATS, type Ats } from "./ats";
import { AiUnavailable } from "./ai/client";
import { reviewJob, tailorWithAi } from "./ai/tasks";
import { db } from "./db";
import { applications, events, jobs, type Application, type Job, type JobStatus } from "./db/schema";
import { getProfile } from "./profile";
import { getSettings } from "./settings";
import { templateCoverLetter, templateHighlights } from "./templates";

export const STATUS_LABEL: Record<JobStatus, string> = {
  new: "New",
  saved: "Saved",
  queued: "In review",
  applied: "Applied",
  interview: "Interviewing",
  offer: "Offer",
  rejected: "Rejected",
  archived: "Not interested",
  hidden: "Filtered out",
};

export async function logEvent(jobId: string | null, type: string, message: string) {
  await db.insert(events).values({ jobId, type, message });
}

export async function getJob(id: string): Promise<Job | undefined> {
  const [j] = await db.select().from(jobs).where(eq(jobs.id, id));
  return j;
}

export async function latestApplication(jobId: string): Promise<Application | undefined> {
  const [a] = await db.select().from(applications).where(eq(applications.jobId, jobId)).orderBy(desc(applications.id)).limit(1);
  return a;
}

function methodFor(job: Job): Application["method"] {
  if (job.applyEmail) return "email";
  if (AUTOFILL_ATS.includes(job.ats as Ats)) return "form";
  return "manual";
}

export type PrepareResult = { application: Application; note?: string };

/**
 * Drafts an application for review: cover letter, resume highlights and answers.
 * Uses AI when it is set up and within budget, otherwise a free template, and says which.
 */
export async function prepareApplication(jobId: string, opts: { fresh?: boolean; useAi?: boolean } = {}): Promise<PrepareResult> {
  const job = await getJob(jobId);
  if (!job) throw new Error("Job not found");
  const profile = await getProfile();
  const { ai } = await getSettings();

  let coverLetter = templateCoverLetter(job, profile);
  let highlights = templateHighlights(job, profile);
  let answers: Record<string, string> = {};
  let generatedBy = "template";
  let note: string | undefined;

  if (opts.useAi !== false && ai.provider !== "none") {
    try {
      const questions = profile.answers.map((a) => a.question);
      const t = await tailorWithAi(job, profile, questions, opts.fresh);
      coverLetter = t.coverLetter || coverLetter;
      highlights = t.highlights.length ? t.highlights : highlights;
      answers = t.answers;
      generatedBy = t.model;
    } catch (e) {
      note = e instanceof AiUnavailable ? e.message : `AI writing failed, so a template was used: ${(e as Error).message}`;
    }
  }

  const existing = await latestApplication(jobId);
  const values = { coverLetter, highlights, answers, generatedBy, method: methodFor(job) };
  let application: Application;
  if (existing && ["draft", "failed", "needs_you"].includes(existing.status)) {
    [application] = await db.update(applications).set({ ...values, status: "draft", error: null }).where(eq(applications.id, existing.id)).returning();
  } else if (existing && existing.status !== "submitted") {
    application = existing;
  } else {
    [application] = await db.insert(applications).values({ jobId, ...values }).returning();
  }

  if (!["applied", "interview", "offer"].includes(job.status)) {
    await db.update(jobs).set({ status: "queued", statusChangedAt: Date.now() }).where(eq(jobs.id, jobId));
  }
  await logEvent(jobId, "draft", `Application drafted (${generatedBy === "template" ? "template" : generatedBy})`);
  return { application, note };
}

export async function updateDraft(id: number, data: { coverLetter?: string; highlights?: string[]; answers?: Record<string, string> }) {
  await db.update(applications).set(data).where(eq(applications.id, id));
}

export async function approveApplication(id: number) {
  const [a] = await db
    .update(applications)
    .set({ status: "approved", approvedAt: Date.now(), error: null })
    .where(eq(applications.id, id))
    .returning();
  if (a) await logEvent(a.jobId, "approved", a.method === "manual" ? "Approved; apply on the company site" : "Approved; the apply runner will send it");
  return a;
}

export async function markApplied(jobId: string, how = "manually") {
  const { apply } = await getSettings();
  const now = Date.now();
  await db
    .update(jobs)
    .set({ status: "applied", appliedAt: now, statusChangedAt: now, followUpAt: now + apply.followUpDays * 86_400_000 })
    .where(eq(jobs.id, jobId));
  const a = await latestApplication(jobId);
  if (a && a.status !== "submitted") await db.update(applications).set({ status: "submitted", submittedAt: now }).where(eq(applications.id, a.id));
  await logEvent(jobId, "applied", `Applied ${how}`);
}

export async function setJobStatus(jobId: string, status: JobStatus) {
  const job = await getJob(jobId);
  if (!job || job.status === status) return;
  if (status === "applied") return markApplied(jobId);
  await db.update(jobs).set({ status, statusChangedAt: Date.now() }).where(eq(jobs.id, jobId));
  await logEvent(jobId, "status", `Moved to ${STATUS_LABEL[status]}`);
}

export async function aiReview(jobId: string, fresh = false) {
  const job = await getJob(jobId);
  if (!job) throw new Error("Job not found");
  const review = await reviewJob(job, await getProfile(), fresh);
  await db.update(jobs).set({ ai: review }).where(eq(jobs.id, jobId));
  return review;
}
