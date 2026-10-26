import { sqliteTable, text, integer, real, index } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

const now = sql`(unixepoch() * 1000)`;

export type ProfileSkill = { name: string; level: number; years?: number };
export type AnswerEntry = { question: string; answer: string };

/** Single-row table (id = 1) holding everything about the candidate. */
export const profile = sqliteTable("profile", {
  id: integer("id").primaryKey(),
  fullName: text("full_name").notNull().default(""),
  email: text("email").notNull().default(""),
  phone: text("phone").notNull().default(""),
  location: text("location").notNull().default(""),
  countryCode: text("country_code").notNull().default(""),
  headline: text("headline").notNull().default(""),
  summary: text("summary").notNull().default(""),
  linkedin: text("linkedin").notNull().default(""),
  github: text("github").notNull().default(""),
  portfolio: text("portfolio").notNull().default(""),
  yearsExperience: real("years_experience").notNull().default(0),
  targetRoles: text("target_roles", { mode: "json" }).$type<string[]>().notNull().default(sql`'[]'`),
  skills: text("skills", { mode: "json" }).$type<ProfileSkill[]>().notNull().default(sql`'[]'`),
  learning: text("learning", { mode: "json" }).$type<string[]>().notNull().default(sql`'[]'`),
  resumeText: text("resume_text").notNull().default(""),
  resumePath: text("resume_path").notNull().default(""),
  workAuthorization: text("work_authorization").notNull().default(""),
  noticePeriod: text("notice_period").notNull().default(""),
  salaryExpectation: text("salary_expectation").notNull().default(""),
  answers: text("answers", { mode: "json" }).$type<AnswerEntry[]>().notNull().default(sql`'[]'`),
  updatedAt: integer("updated_at").notNull().default(now),
});

/** Key/value settings stored as JSON. */
export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value", { mode: "json" }).notNull(),
});

export type JobStatus =
  | "new"
  | "saved"
  | "queued"
  | "applied"
  | "interview"
  | "offer"
  | "rejected"
  | "archived"
  | "hidden";

export type ScoreBreakdown = {
  skills: number;
  title: number;
  location: number;
  seniority: number;
  freshness: number;
  matched: string[];
  missing: string[];
  bonus: string[];
  eligible: boolean;
  reasons: string[];
};

export type AiReview = {
  score: number;
  verdict: string;
  strengths: string[];
  gaps: string[];
  redFlags: string[];
  model: string;
};

export const jobs = sqliteTable(
  "jobs",
  {
    id: text("id").primaryKey(), // `${source}:${externalId}`
    source: text("source").notNull(),
    externalId: text("external_id").notNull(),
    dedupeKey: text("dedupe_key").notNull(),
    title: text("title").notNull(),
    company: text("company").notNull(),
    companyLogo: text("company_logo"),
    location: text("location").notNull().default(""),
    remote: integer("remote", { mode: "boolean" }).notNull().default(false),
    countries: text("countries", { mode: "json" }).$type<string[]>().notNull().default(sql`'[]'`),
    url: text("url").notNull(),
    applyUrl: text("apply_url").notNull(),
    ats: text("ats").notNull().default("unknown"),
    applyEmail: text("apply_email"),
    description: text("description").notNull().default(""),
    tags: text("tags", { mode: "json" }).$type<string[]>().notNull().default(sql`'[]'`),
    salaryMin: real("salary_min"),
    salaryMax: real("salary_max"),
    salaryCurrency: text("salary_currency"),
    salaryPeriod: text("salary_period"),
    seniority: text("seniority"),
    employmentType: text("employment_type"),
    postedAt: integer("posted_at").notNull(),
    fetchedAt: integer("fetched_at").notNull().default(now),
    skills: text("skills", { mode: "json" }).$type<string[]>().notNull().default(sql`'[]'`),
    niceSkills: text("nice_skills", { mode: "json" }).$type<string[]>().notNull().default(sql`'[]'`),
    score: integer("score").notNull().default(0),
    breakdown: text("breakdown", { mode: "json" }).$type<ScoreBreakdown | null>(),
    ai: text("ai", { mode: "json" }).$type<AiReview | null>(),
    status: text("status").$type<JobStatus>().notNull().default("new"),
    statusChangedAt: integer("status_changed_at").notNull().default(now),
    appliedAt: integer("applied_at"),
    followUpAt: integer("follow_up_at"),
    starred: integer("starred", { mode: "boolean" }).notNull().default(false),
    notes: text("notes").notNull().default(""),
  },
  (t) => [
    index("jobs_score_idx").on(t.score),
    index("jobs_status_idx").on(t.status),
    index("jobs_posted_idx").on(t.postedAt),
    index("jobs_dedupe_idx").on(t.dedupeKey),
  ],
);

export type ApplicationStatus =
  | "draft"
  | "approved"
  | "submitting"
  | "needs_you"
  | "submitted"
  | "failed";

export const applications = sqliteTable(
  "applications",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    jobId: text("job_id")
      .notNull()
      .references(() => jobs.id, { onDelete: "cascade" }),
    method: text("method").$type<"form" | "email" | "manual">().notNull().default("form"),
    coverLetter: text("cover_letter").notNull().default(""),
    highlights: text("highlights", { mode: "json" }).$type<string[]>().notNull().default(sql`'[]'`),
    answers: text("answers", { mode: "json" }).$type<Record<string, string>>().notNull().default(sql`'{}'`),
    generatedBy: text("generated_by").notNull().default("template"),
    status: text("status").$type<ApplicationStatus>().notNull().default("draft"),
    error: text("error"),
    log: text("log", { mode: "json" }).$type<string[]>().notNull().default(sql`'[]'`),
    createdAt: integer("created_at").notNull().default(now),
    approvedAt: integer("approved_at"),
    submittedAt: integer("submitted_at"),
  },
  (t) => [index("applications_job_idx").on(t.jobId), index("applications_status_idx").on(t.status)],
);

export const events = sqliteTable(
  "events",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    jobId: text("job_id").references(() => jobs.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    message: text("message").notNull(),
    createdAt: integer("created_at").notNull().default(now),
  },
  (t) => [index("events_job_idx").on(t.jobId), index("events_created_idx").on(t.createdAt)],
);

export const contacts = sqliteTable("contacts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  jobId: text("job_id").references(() => jobs.id, { onDelete: "cascade" }),
  company: text("company").notNull().default(""),
  name: text("name").notNull(),
  role: text("role").notNull().default(""),
  email: text("email").notNull().default(""),
  linkedin: text("linkedin").notNull().default(""),
  notes: text("notes").notNull().default(""),
  createdAt: integer("created_at").notNull().default(now),
});

export const aiUsage = sqliteTable("ai_usage", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  task: text("task").notNull(),
  provider: text("provider").notNull(),
  model: text("model").notNull(),
  inputTokens: integer("input_tokens").notNull().default(0),
  outputTokens: integer("output_tokens").notNull().default(0),
  cachedTokens: integer("cached_tokens").notNull().default(0),
  costUsd: real("cost_usd").notNull().default(0),
  createdAt: integer("created_at").notNull().default(now),
});

export const aiCache = sqliteTable("ai_cache", {
  key: text("key").primaryKey(),
  value: text("value", { mode: "json" }).notNull(),
  createdAt: integer("created_at").notNull().default(now),
});

export const syncRuns = sqliteTable("sync_runs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  source: text("source").notNull(),
  startedAt: integer("started_at").notNull(),
  finishedAt: integer("finished_at"),
  fetched: integer("fetched").notNull().default(0),
  inserted: integer("inserted").notNull().default(0),
  updated: integer("updated").notNull().default(0),
  error: text("error"),
});

export type Job = typeof jobs.$inferSelect;
export type NewJob = typeof jobs.$inferInsert;
export type Profile = typeof profile.$inferSelect;
export type Application = typeof applications.$inferSelect;
export type JobEvent = typeof events.$inferSelect;
export type Contact = typeof contacts.$inferSelect;

/** Stored uploads (your CV), kept in the database so the app and the apply runner work anywhere. */
export const files = sqliteTable("files", {
  id: text("id").primaryKey(), // "resume"
  name: text("name").notNull(),
  mime: text("mime").notNull(),
  data: text("data").notNull(), // base64
  size: integer("size").notNull(),
  createdAt: integer("created_at").notNull().default(now),
});
