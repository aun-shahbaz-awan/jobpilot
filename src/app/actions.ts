"use server";

import { eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { AiUnavailable } from "@/lib/ai/client";
import { learningPlan, parseResumeWithAi, type LearningPlan, type ParsedResume } from "@/lib/ai/tasks";
import {
  aiReview,
  approveApplication,
  logEvent,
  markApplied,
  prepareApplication,
  setJobStatus,
  updateDraft,
} from "@/lib/applications";
import { db } from "@/lib/db";
import { applications, contacts, jobs, profile, settings as settingsTable, type JobStatus, type ProfileSkill } from "@/lib/db/schema";
import { computeInsights } from "@/lib/insights";
import { getProfile } from "@/lib/profile";
import { extractText, saveResumeFile } from "@/lib/resume";
import { getSettings, saveSettings, type AllSettings } from "@/lib/settings";
import { canonicalSkill } from "@/lib/skills/taxonomy";
import { rescoreAll, syncSources, type SyncSummary } from "@/lib/sync";
import { parseResumeLocally } from "@/lib/templates";

export type ActionResult<T = undefined> = { ok: true; data?: T; message?: string } | { ok: false; error: string };

function refresh() {
  revalidatePath("/", "layout");
}

async function run<T>(fn: () => Promise<{ data?: T; message?: string } | void>): Promise<ActionResult<T>> {
  try {
    const r = (await fn()) ?? {};
    refresh();
    return { ok: true, ...r };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/* ---------- Sync ---------- */
export async function syncNow(force = true) {
  return run<SyncSummary[]>(async () => {
    const data = await syncSources({ force });
    const added = data.reduce((a, r) => a + r.inserted, 0);
    const errors = data.filter((r) => r.status === "error").length;
    return { data, message: `${added} new job${added === 1 ? "" : "s"}${errors ? `, ${errors} source${errors === 1 ? "" : "s"} failed` : ""}` };
  });
}

/* ---------- Jobs ---------- */
export async function setStatus(jobId: string, status: JobStatus) {
  return run(() => setJobStatus(jobId, status));
}

export async function bulkStatus(ids: string[], status: JobStatus) {
  return run(async () => {
    for (const id of ids) await setJobStatus(id, status);
    return { message: `Updated ${ids.length} job${ids.length === 1 ? "" : "s"}` };
  });
}

export async function toggleStar(jobId: string, starred: boolean) {
  return run(async () => {
    await db.update(jobs).set({ starred }).where(eq(jobs.id, jobId));
  });
}

export async function saveNotes(jobId: string, notes: string) {
  return run(async () => {
    await db.update(jobs).set({ notes }).where(eq(jobs.id, jobId));
  });
}

export async function setFollowUp(jobId: string, date: string | null) {
  return run(async () => {
    const at = date ? new Date(`${date}T09:00:00`).getTime() : null;
    await db.update(jobs).set({ followUpAt: at }).where(eq(jobs.id, jobId));
    if (at) await logEvent(jobId, "follow-up", `Follow-up set for ${date}`);
  });
}

export async function addEvent(jobId: string, message: string) {
  return run(() => logEvent(jobId, "note", message));
}

export async function addContact(jobId: string, input: { name: string; role?: string; email?: string; linkedin?: string; notes?: string }) {
  return run(async () => {
    if (!input.name.trim()) throw new Error("Add a name");
    const [job] = await db.select({ company: jobs.company }).from(jobs).where(eq(jobs.id, jobId));
    await db.insert(contacts).values({ jobId, company: job?.company ?? "", name: input.name.trim(), role: input.role ?? "", email: input.email ?? "", linkedin: input.linkedin ?? "", notes: input.notes ?? "" });
  });
}

export async function deleteContact(id: number) {
  return run(async () => {
    await db.delete(contacts).where(eq(contacts.id, id));
  });
}

/* ---------- Applications ---------- */
export async function queueJobs(ids: string[], useAi = true) {
  return run(async () => {
    const notes = new Set<string>();
    for (const id of ids) {
      const r = await prepareApplication(id, { useAi });
      if (r.note) notes.add(r.note);
    }
    return { message: [`Drafted ${ids.length} application${ids.length === 1 ? "" : "s"} for review`, ...notes].join(". ") };
  });
}

export async function regenerateDraft(jobId: string, useAi: boolean) {
  return run(async () => {
    const r = await prepareApplication(jobId, { useAi, fresh: true });
    return { message: r.note ?? "Draft rewritten" };
  });
}

export async function saveDraft(id: number, data: { coverLetter: string; highlights: string[]; answers: Record<string, string> }) {
  return run(async () => {
    await updateDraft(id, data);
    return { message: "Draft saved" };
  });
}

export async function approve(ids: number[]) {
  return run(async () => {
    for (const id of ids) await approveApplication(id);
    return { message: `Approved ${ids.length}` };
  });
}

export async function unapprove(id: number) {
  return run(async () => {
    await db.update(applications).set({ status: "draft" }).where(eq(applications.id, id));
  });
}

export async function markAppliedAction(jobId: string) {
  return run(() => markApplied(jobId, "manually"));
}

export async function discardDraft(jobId: string) {
  return run(async () => {
    await db.delete(applications).where(eq(applications.jobId, jobId));
    await setJobStatus(jobId, "saved");
  });
}

export async function reviewWithAi(jobIds: string[]) {
  return run(async () => {
    let done = 0;
    for (const id of jobIds) {
      try {
        await aiReview(id, jobIds.length === 1);
        done++;
      } catch (e) {
        if (e instanceof AiUnavailable) throw e;
        throw new Error(`AI review failed: ${(e as Error).message}`);
      }
    }
    return { message: `Reviewed ${done} job${done === 1 ? "" : "s"}` };
  });
}

/* ---------- Profile ---------- */
export type ProfileInput = {
  fullName: string;
  email: string;
  phone: string;
  location: string;
  countryCode: string;
  headline: string;
  summary: string;
  linkedin: string;
  github: string;
  portfolio: string;
  yearsExperience: number;
  targetRoles: string[];
  skills: ProfileSkill[];
  learning: string[];
  resumeText: string;
  workAuthorization: string;
  noticePeriod: string;
  salaryExpectation: string;
  answers: { question: string; answer: string }[];
};

export async function saveProfile(input: ProfileInput) {
  return run(async () => {
    const skills = dedupeSkills(input.skills);
    await db
      .update(profile)
      .set({ ...input, skills, countryCode: input.countryCode.toUpperCase(), updatedAt: Date.now() })
      .where(eq(profile.id, 1));
    const n = await rescoreAll();
    return { message: `Profile saved and ${n} jobs re-scored` };
  });
}

function dedupeSkills(skills: ProfileSkill[]): ProfileSkill[] {
  const map = new Map<string, ProfileSkill>();
  for (const s of skills) {
    const name = canonicalSkill(s.name);
    if (!name) continue;
    const prev = map.get(name.toLowerCase());
    if (!prev || prev.level < s.level) map.set(name.toLowerCase(), { ...s, name });
  }
  return [...map.values()];
}

export async function uploadResume(form: FormData) {
  return run<{ added: string[]; filled: string[]; usedAi: boolean }>(async () => {
    const file = form.get("file");
    if (!(file instanceof File) || file.size === 0) throw new Error("Choose a file first");
    if (file.size > 5_000_000) throw new Error("The file is over 5 MB");
    const buffer = Buffer.from(await file.arrayBuffer());
    const text = await extractText(buffer, file.name);
    if (text.length < 100) throw new Error("Couldn't read text from that file. If it's a scanned PDF, export it as a text PDF.");
    await saveResumeFile(file.name, file.type || "application/pdf", buffer);

    const current = await getProfile();
    let parsed: ParsedResume = parseResumeLocally(text);
    let usedAi = false;
    const { ai } = await getSettings();
    if (ai.provider !== "none") {
      try {
        parsed = await parseResumeWithAi(text);
        usedAi = true;
      } catch {
        /* fall back to the local parser */
      }
    }

    const filled: string[] = [];
    const patch: Partial<typeof current> = { resumeText: text, resumePath: file.name };
    const fields = ["fullName", "email", "phone", "location", "headline", "summary", "linkedin", "github", "portfolio"] as const;
    for (const f of fields) {
      const v = parsed[f];
      if (v && !current[f]) {
        (patch as Record<string, unknown>)[f] = v;
        filled.push(f);
      }
    }
    if (parsed.yearsExperience && !current.yearsExperience) patch.yearsExperience = parsed.yearsExperience;
    const have = new Set(current.skills.map((s) => canonicalSkill(s.name).toLowerCase()));
    const added = (parsed.skills ?? []).map((s) => ({ ...s, name: canonicalSkill(s.name), level: Math.max(1, Math.min(5, Math.round(s.level || 3))) })).filter((s) => s.name && !have.has(s.name.toLowerCase()));
    patch.skills = dedupeSkills([...current.skills, ...added]);
    if (!current.targetRoles.length && parsed.targetRoles?.length) patch.targetRoles = parsed.targetRoles;

    await db.update(profile).set({ ...patch, updatedAt: Date.now() }).where(eq(profile.id, 1));
    await rescoreAll();
    return {
      data: { added: added.map((s) => s.name), filled, usedAi },
      message: `CV saved. ${added.length ? `Added ${added.length} skill${added.length === 1 ? "" : "s"}; check their levels.` : "No new skills found."}`,
    };
  });
}

/* ---------- Settings ---------- */
export async function saveSettingsAction<K extends keyof AllSettings>(key: K, value: AllSettings[K]) {
  return run(async () => {
    if (key === "ai") {
      // Keys are never sent to the browser; "__keep__" means leave the stored key as it is.
      const ai = value as AllSettings["ai"];
      const [row] = await db.select().from(settingsTable).where(eq(settingsTable.key, "ai"));
      const stored = (row?.value ?? {}) as Partial<AllSettings["ai"]>;
      if (ai.anthropicKey === "__keep__") ai.anthropicKey = stored.anthropicKey ?? "";
      if (ai.openaiKey === "__keep__") ai.openaiKey = stored.openaiKey ?? "";
    }
    await saveSettings(key, value);
    if (key === "search") {
      const n = await rescoreAll();
      return { message: `Saved and ${n} jobs re-scored` };
    }
    return { message: "Saved" };
  });
}

/* ---------- Skills ---------- */
export async function generatePlan() {
  return run<LearningPlan>(async () => {
    const insights = await computeInsights();
    if (!insights.learnNext.length) throw new Error("Sync some jobs first so there is demand data to plan from");
    const plan = await learningPlan(
      await getProfile(),
      insights.learnNext.slice(0, 8).map((r) => ({ skill: r.skill, demand: r.demand, unlocks: r.unlocks })),
    );
    await db
      .insert(settingsTable)
      .values({ key: "learningPlan", value: { ...plan, createdAt: Date.now() } })
      .onConflictDoUpdate({ target: settingsTable.key, set: { value: { ...plan, createdAt: Date.now() } } });
    return { data: plan };
  });
}

export async function markLearning(skill: string, learning: boolean) {
  return run(async () => {
    const p = await getProfile();
    const next = learning ? [...new Set([...p.learning, skill])] : p.learning.filter((s) => s !== skill);
    await db.update(profile).set({ learning: next }).where(eq(profile.id, 1));
  });
}

export async function addSkillLevel(skill: string, level: number) {
  return run(async () => {
    const p = await getProfile();
    const skills = dedupeSkills([...p.skills.filter((s) => s.name !== skill), { name: skill, level }]);
    await db.update(profile).set({ skills, learning: p.learning.filter((s) => s !== skill) }).where(eq(profile.id, 1));
    await rescoreAll();
    return { message: `${skill} added at level ${level}` };
  });
}

export async function deleteJobs(ids: string[]) {
  return run(async () => {
    if (ids.length) await db.delete(jobs).where(inArray(jobs.id, ids));
  });
}
