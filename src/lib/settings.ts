import { eq } from "drizzle-orm";
import { db } from "./db";
import { settings } from "./db/schema";
import type { Market } from "./geo";

export type SearchSettings = {
  candidateCountry: string;
  markets: Market[];
  /** Languages you can work in. Postings that need another language are scored down. */
  languages: string[];
  /** Title words that make a job relevant. */
  roleKeywords: string[];
  /** Jobs whose title contains any of these are hidden. */
  excludeTitle: string[];
  excludeCompanies: string[];
  /** Jobs at or above this score show in Matches and can be queued. */
  minScore: number;
  /** Ignore postings older than this. */
  maxAgeDays: number;
};

export type SourceId = "remotive" | "remoteok" | "himalayas" | "jobicy" | "arbeitnow" | "greenhouse" | "lever" | "ashby";

export type SourceSettings = {
  enabled: Record<SourceId, boolean>;
  /** Search terms sent to boards that support search. */
  queries: string[];
  /** Company job boards to watch, by slug: boards.greenhouse.io/<slug>, jobs.lever.co/<slug>, jobs.ashbyhq.com/<slug>. */
  watchlist: { greenhouse: string[]; lever: string[]; ashby: string[] };
  /** Hours between automatic syncs. */
  intervalHours: number;
};

export type AiProvider = "none" | "anthropic" | "openai" | "ollama";
export type AiTask = "review" | "tailor" | "plan" | "resume";

export type AiSettings = {
  provider: AiProvider;
  models: Record<AiTask, string>;
  anthropicKey: string;
  openaiKey: string;
  ollamaUrl: string;
  /** Hard stop for paid providers in a calendar month. */
  monthlyBudgetUsd: number;
  /** After each sync, AI-review this many of the best new matches. 0 = only when you ask. */
  autoReviewTop: number;
};

export type ApplySettings = {
  /** Runner clicks Submit by itself when the form is complete and there is no CAPTCHA. */
  autoSubmit: boolean;
  /** Most applications the runner sends per day. */
  dailyLimit: number;
  /** Suggest a follow-up this many days after applying. */
  followUpDays: number;
  emailSubject: string;
};

export type AllSettings = {
  search: SearchSettings;
  sources: SourceSettings;
  ai: AiSettings;
  apply: ApplySettings;
};

export const MODEL_PRESETS: Record<Exclude<AiProvider, "none">, { id: string; label: string; inPerM: number; outPerM: number }[]> = {
  anthropic: [
    { id: "claude-haiku-5-5", label: "Claude Haiku 5.5 (cheapest)", inPerM: 0.1, outPerM: 0.5 },
    { id: "claude-sonnet-5-5", label: "Claude Sonnet 5.5 (best writing)", inPerM: 2, outPerM: 10 },
    { id: "claude-opus-5-5", label: "Claude Opus 5.5", inPerM: 4, outPerM: 20 },
  ],
  openai: [
    { id: "gpt-5-mini", label: "GPT-5 mini", inPerM: 0.25, outPerM: 2 },
    { id: "gpt-5", label: "GPT-5", inPerM: 1.25, outPerM: 10 },
  ],
  ollama: [
    { id: "llama3.1", label: "Llama 3.1 (local, free)", inPerM: 0, outPerM: 0 },
    { id: "qwen2.5", label: "Qwen 2.5 (local, free)", inPerM: 0, outPerM: 0 },
  ],
};

export const DEFAULT_SETTINGS: AllSettings = {
  search: {
    candidateCountry: "AE",
    markets: [
      { id: "remote", label: "Remote (worldwide)", kind: "remote", enabled: true },
      { id: "de", label: "Germany", kind: "country", countryCode: "DE", enabled: true },
    ],
    languages: ["English"],
    roleKeywords: [
      "frontend",
      "front-end",
      "front end",
      "react",
      "next.js",
      "web3",
      "blockchain",
      "dapp",
      "full stack",
      "full-stack",
      "fullstack",
      "javascript",
      "typescript",
      "web developer",
      "web engineer",
      "ui engineer",
      "software engineer",
      "software developer",
      "product engineer",
    ],
    excludeTitle: [
      "intern",
      "internship",
      "werkstudent",
      "working student",
      "praktikum",
      "account executive",
      "sales",
      "recruiter",
      "principal",
      "director",
      "vp",
      "head of",
    ],
    excludeCompanies: [],
    minScore: 60,
    maxAgeDays: 30,
  },
  sources: {
    enabled: {
      remotive: true,
      remoteok: true,
      himalayas: true,
      jobicy: true,
      arbeitnow: true,
      greenhouse: true,
      lever: true,
      ashby: true,
    },
    queries: ["react", "frontend", "web3", "next.js", "typescript"],
    watchlist: {
      greenhouse: ["coinbase", "consensys", "kraken", "chainalysis", "n26", "gitlab"],
      lever: ["ledger", "binance"],
      ashby: ["linear", "vercel", "uniswap", "alchemy", "phantom", "raycast"],
    },
    intervalHours: 6,
  },
  ai: {
    provider: "none",
    models: {
      review: "claude-haiku-5-5",
      tailor: "claude-haiku-5-5",
      plan: "claude-haiku-5-5",
      resume: "claude-haiku-5-5",
    },
    anthropicKey: "",
    openaiKey: "",
    ollamaUrl: "http://localhost:11434",
    monthlyBudgetUsd: 3,
    autoReviewTop: 0,
  },
  apply: {
    autoSubmit: false,
    dailyLimit: 15,
    followUpDays: 7,
    emailSubject: "Application: {title} at {company}",
  },
};

function merge<T>(base: T, value: unknown): T {
  if (value === null || value === undefined) return base;
  if (Array.isArray(base) || typeof base !== "object" || base === null) return value as T;
  const out: Record<string, unknown> = { ...(base as Record<string, unknown>) };
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    out[k] = k in out ? merge(out[k], v) : v;
  }
  return out as T;
}

export async function getSettings(): Promise<AllSettings> {
  const rows = await db.select().from(settings);
  const stored = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  const result = merge(DEFAULT_SETTINGS, stored);
  // Environment keys win, so you never have to store secrets in the database.
  if (process.env.ANTHROPIC_API_KEY) result.ai.anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (process.env.OPENAI_API_KEY) result.ai.openaiKey = process.env.OPENAI_API_KEY;
  if (process.env.OLLAMA_URL) result.ai.ollamaUrl = process.env.OLLAMA_URL;
  return result;
}

export async function saveSettings<K extends keyof AllSettings>(key: K, value: AllSettings[K]) {
  await db
    .insert(settings)
    .values({ key, value })
    .onConflictDoUpdate({ target: settings.key, set: { value } });
}

export async function getSetting<K extends keyof AllSettings>(key: K): Promise<AllSettings[K]> {
  const [row] = await db.select().from(settings).where(eq(settings.key, key));
  return merge(DEFAULT_SETTINGS[key], row?.value);
}

export function keySource(ai: AiSettings): { anthropic: "env" | "saved" | "missing"; openai: "env" | "saved" | "missing" } {
  return {
    anthropic: process.env.ANTHROPIC_API_KEY ? "env" : ai.anthropicKey ? "saved" : "missing",
    openai: process.env.OPENAI_API_KEY ? "env" : ai.openaiKey ? "saved" : "missing",
  };
}
