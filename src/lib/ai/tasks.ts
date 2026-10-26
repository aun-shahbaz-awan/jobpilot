import type { AiReview, Job, Profile, ProfileSkill } from "../db/schema";
import { callAi, parseJson } from "./client";

function profileBlock(p: Profile): string {
  const skills = p.skills
    .slice()
    .sort((a, b) => b.level - a.level)
    .map((s) => `${s.name} (${s.level}/5${s.years ? `, ${s.years}y` : ""})`)
    .join(", ");
  return [
    `Name: ${p.fullName}`,
    `Headline: ${p.headline}`,
    `Location: ${p.location}`,
    `Years of experience: ${p.yearsExperience}`,
    `Skills: ${skills}`,
    p.summary && `Summary: ${p.summary}`,
    p.workAuthorization && `Work authorization: ${p.workAuthorization}`,
    p.resumeText && `Resume:\n${p.resumeText.slice(0, 9000)}`,
  ]
    .filter(Boolean)
    .join("\n");
}

function jobBlock(j: Job): string {
  return [
    `Title: ${j.title}`,
    `Company: ${j.company}`,
    `Location: ${j.location}${j.remote ? " (remote)" : ""}`,
    j.salaryMin ? `Salary: ${j.salaryMin}-${j.salaryMax ?? ""} ${j.salaryCurrency ?? ""} ${j.salaryPeriod ?? ""}` : "",
    `Description:\n${j.description.slice(0, 7000)}`,
  ]
    .filter(Boolean)
    .join("\n");
}

const HONESTY =
  "Use only facts present in the candidate profile. Never invent employers, years, metrics, degrees or skills. If something the job asks for is missing, do not claim it.";

/* ---------- Review: a second opinion on fit ---------- */
export async function reviewJob(job: Job, p: Profile, fresh = false): Promise<AiReview> {
  const system = `You are a blunt, experienced tech recruiter screening jobs for one candidate.
${HONESTY}
Return JSON only:
{"score": 0-100 overall fit, "verdict": "one sentence: apply or skip and why", "strengths": ["up to 4 short points"], "gaps": ["up to 4 short points the candidate lacks"], "redFlags": ["visa, location, language, seniority or other blockers; empty if none"]}

CANDIDATE
${profileBlock(p)}`;
  const res = await callAi({ task: "review", system, user: `JOB\n${jobBlock(job)}`, maxTokens: 500, fresh });
  const data = parseJson<Omit<AiReview, "model">>(res.text);
  return {
    score: Math.max(0, Math.min(100, Math.round(Number(data.score) || 0))),
    verdict: String(data.verdict ?? ""),
    strengths: (data.strengths ?? []).slice(0, 4).map(String),
    gaps: (data.gaps ?? []).slice(0, 4).map(String),
    redFlags: (data.redFlags ?? []).slice(0, 4).map(String),
    model: res.model,
  };
}

/* ---------- Tailor: cover letter, highlights and screening answers ---------- */
export type Tailored = { coverLetter: string; highlights: string[]; answers: Record<string, string> };

export async function tailorWithAi(job: Job, p: Profile, questions: string[], fresh = false): Promise<Tailored & { model: string }> {
  const answerBank = p.answers.map((a) => `Q: ${a.question}\nA: ${a.answer}`).join("\n");
  const system = `You write job applications for one candidate. Write like a confident senior engineer: specific, plain, warm, no clichés ("I am thrilled", "passionate", "dynamic"), no buzzwords, no em dashes.
${HONESTY}
Return JSON only:
{"coverLetter": "150-220 words, 3 short paragraphs, addressed to the hiring team, ending with the candidate's name", "highlights": ["3-5 resume bullet points rewritten from the resume to fit this job, each under 25 words"], "answers": {"<question text>": "<answer, 1-3 sentences, based on the answer bank or profile; empty string if unknown>"}}

CANDIDATE
${profileBlock(p)}

ANSWER BANK
${answerBank || "(empty)"}`;
  const user = `JOB\n${jobBlock(job)}\n\nSCREENING QUESTIONS\n${questions.length ? questions.map((q) => `- ${q}`).join("\n") : "(none)"}`;
  const res = await callAi({ task: "tailor", system, user, maxTokens: 1400, fresh });
  const data = parseJson<Tailored>(res.text);
  return {
    coverLetter: String(data.coverLetter ?? "").trim(),
    highlights: (data.highlights ?? []).map(String).slice(0, 5),
    answers: Object.fromEntries(Object.entries(data.answers ?? {}).map(([k, v]) => [k, String(v)])),
    model: res.model,
  };
}

/* ---------- Learning plan ---------- */
export type PlanStep = { skill: string; why: string; project: string; weeks: number; resources: string[] };
export type LearningPlan = { summary: string; steps: PlanStep[]; model: string };

export async function learningPlan(p: Profile, gaps: { skill: string; demand: number; unlocks: number }[]): Promise<LearningPlan> {
  const system = `You are a pragmatic career coach for software engineers. Build a focused learning plan that maximises interview callbacks soon, favouring skills that build on what the candidate already knows. Each step needs a small portfolio project that proves the skill and that the candidate can link on a CV.
Return JSON only: {"summary": "2 sentences", "steps": [{"skill": "", "why": "1 sentence tied to the demand data", "project": "1-2 sentences", "weeks": 1-6, "resources": ["official docs or free course names"]}]}  (3-5 steps, in order)

CANDIDATE
${profileBlock(p)}`;
  const user = `Skill gaps from the candidate's own job matches (demand = % of matching jobs that list it; unlocks = jobs that would cross the match threshold if learned):\n${gaps
    .map((g) => `- ${g.skill}: demand ${g.demand}%, unlocks ${g.unlocks}`)
    .join("\n")}`;
  const res = await callAi({ task: "plan", system, user, maxTokens: 1500 });
  const data = parseJson<Omit<LearningPlan, "model">>(res.text);
  return { summary: String(data.summary ?? ""), steps: (data.steps ?? []).slice(0, 6), model: res.model };
}

/* ---------- Resume parsing ---------- */
export type ParsedResume = Partial<Pick<Profile, "fullName" | "email" | "phone" | "location" | "headline" | "summary" | "linkedin" | "github" | "portfolio" | "yearsExperience">> & {
  skills?: ProfileSkill[];
  targetRoles?: string[];
};

export async function parseResumeWithAi(text: string): Promise<ParsedResume> {
  const system = `Extract structured data from a resume. Rate each skill 1-5 from evidence in the resume (5 = led production work for years, 3 = solid professional use, 1 = mentioned once). Return JSON only:
{"fullName":"","email":"","phone":"","location":"","headline":"short professional title","summary":"2-3 sentences","linkedin":"","github":"","portfolio":"","yearsExperience":0,"targetRoles":["job titles this person should target"],"skills":[{"name":"","level":1,"years":0}]}`;
  const res = await callAi({ task: "resume", system, user: text.slice(0, 20000), maxTokens: 1500 });
  return parseJson<ParsedResume>(res.text);
}
