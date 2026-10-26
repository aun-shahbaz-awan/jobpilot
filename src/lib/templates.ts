import type { Job, Profile } from "./db/schema";
import { coverage, skillMap } from "./match/score";
import { extractSkills } from "./skills/extract";
import type { ParsedResume } from "./ai/tasks";

function list(items: string[]) {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

/** A free cover letter built from your profile and the skills this job shares with you. */
export function templateCoverLetter(job: Job, p: Profile): string {
  const mine = skillMap(p.skills);
  const shared = [...job.skills, ...job.niceSkills].filter((s) => coverage(s, mine) >= 0.7).slice(0, 4);
  const top = p.skills
    .slice()
    .sort((a, b) => b.level - a.level)
    .slice(0, 3)
    .map((s) => s.name);
  const stack = shared.length ? shared : top;
  const years = p.yearsExperience ? `${Math.round(p.yearsExperience)}+ years` : "several years";
  const first = p.fullName.split(" ")[0] || p.fullName;

  return [
    `Hello ${job.company} team,`,
    `I'm applying for the ${job.title} role. I'm a ${p.headline || "software engineer"} with ${years} of experience, and my day-to-day work maps closely to what you describe: ${list(stack)}.`,
    p.summary
      ? p.summary.trim()
      : `I care about shipping interfaces that are fast, accessible and easy to maintain, and I'm comfortable owning features from design hand-off to production.`,
    `I'd welcome the chance to talk about how I can help ${job.company}. My CV is attached${p.portfolio ? ` and recent work is at ${p.portfolio}` : ""}.`,
    `Best regards,\n${p.fullName || first}`,
  ].join("\n\n");
}

/** Resume lines that mention the job's skills, used as highlights when AI is off. */
export function templateHighlights(job: Job, p: Profile): string[] {
  const wanted = new Set([...job.skills, ...job.niceSkills]);
  const lines = p.resumeText
    .split(/\n+/)
    .map((l) => l.replace(/^[-*•\s]+/, "").trim())
    .filter((l) => l.length > 30 && l.length < 260);
  const scored = lines
    .map((line) => {
      const { required } = extractSkills(line);
      return { line, hits: required.filter((s) => wanted.has(s)).length };
    })
    .filter((x) => x.hits > 0)
    .sort((a, b) => b.hits - a.hits);
  return scored.slice(0, 5).map((x) => x.line);
}

/** Answers screening questions from your answer bank by keyword overlap. */
export function answerFromBank(question: string, p: Profile): string {
  const q = question.toLowerCase();
  const tokens = new Set(q.split(/[^a-z0-9]+/).filter((t) => t.length > 3));
  let best = { score: 0, answer: "" };
  for (const a of p.answers) {
    const words = a.question.toLowerCase().split(/[^a-z0-9]+/).filter((t) => t.length > 3);
    const score = words.filter((w) => tokens.has(w)).length / Math.max(1, words.length);
    if (score > best.score) best = { score, answer: a.answer };
  }
  if (best.score >= 0.5) return best.answer;
  if (/salary|compensation|expect/.test(q)) return p.salaryExpectation;
  if (/notice|start date|available|availability/.test(q)) return p.noticePeriod;
  if (/authori[sz]|visa|sponsor|right to work|permit/.test(q)) return p.workAuthorization;
  if (/years.*experience|experience.*years/.test(q)) return String(Math.round(p.yearsExperience));
  if (/linkedin/.test(q)) return p.linkedin;
  if (/github/.test(q)) return p.github;
  if (/portfolio|website/.test(q)) return p.portfolio;
  if (/location|where.*based|city/.test(q)) return p.location;
  return "";
}

/** Rough resume parsing without AI: contact details, links and known skills. */
export function parseResumeLocally(text: string): ParsedResume {
  const email = text.match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i)?.[0] ?? "";
  const phone = text.match(/\+?\d[\d\s().-]{8,}\d/)?.[0]?.trim() ?? "";
  const linkedin = text.match(/(https?:\/\/)?(www\.)?linkedin\.com\/in\/[\w-]+/i)?.[0] ?? "";
  const github = text.match(/(https?:\/\/)?(www\.)?github\.com\/[\w-]+/i)?.[0] ?? "";
  const { required, nice } = extractSkills(text);
  const firstLine = text.split(/\n/).map((l) => l.trim()).find((l) => l.length > 2 && l.length < 60) ?? "";
  return {
    fullName: /@|\d/.test(firstLine) ? "" : firstLine,
    email,
    phone,
    linkedin,
    github,
    skills: [...new Set([...required, ...nice])].map((name) => ({ name, level: 3 })),
  };
}
