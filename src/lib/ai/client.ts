import { createHash } from "node:crypto";
import { and, eq, gte, sql } from "drizzle-orm";
import { db } from "../db";
import { aiCache, aiUsage } from "../db/schema";
import { getSettings, MODEL_PRESETS, type AiProvider, type AiSettings, type AiTask } from "../settings";

export class AiUnavailable extends Error {}

type CallInput = {
  task: AiTask;
  /** Stable instructions and context, cached by the provider where possible. */
  system: string;
  user: string;
  maxTokens?: number;
  /** Skip the local cache (e.g. "regenerate"). */
  fresh?: boolean;
};

type CallResult = { text: string; model: string; provider: AiProvider; cached: boolean; costUsd: number };

export function priceFor(provider: AiProvider, model: string) {
  if (provider === "none") return { inPerM: 0, outPerM: 0 };
  return MODEL_PRESETS[provider].find((m) => m.id === model) ?? { inPerM: 0, outPerM: 0 };
}

export async function monthSpend(): Promise<number> {
  const start = new Date();
  start.setDate(1);
  start.setHours(0, 0, 0, 0);
  const [row] = await db
    .select({ total: sql<number>`coalesce(sum(${aiUsage.costUsd}), 0)` })
    .from(aiUsage)
    .where(gte(aiUsage.createdAt, start.getTime()));
  return Number(row?.total ?? 0);
}

export function aiReady(ai: AiSettings): { ok: boolean; reason?: string } {
  if (ai.provider === "none") return { ok: false, reason: "AI is off. Pick a provider in Settings." };
  if (ai.provider === "anthropic" && !ai.anthropicKey) return { ok: false, reason: "Add your Anthropic API key in Settings." };
  if (ai.provider === "openai" && !ai.openaiKey) return { ok: false, reason: "Add your OpenAI API key in Settings." };
  return { ok: true };
}

export async function callAi(input: CallInput): Promise<CallResult> {
  const { ai } = await getSettings();
  const ready = aiReady(ai);
  if (!ready.ok) throw new AiUnavailable(ready.reason);
  const model = ai.models[input.task];
  const key = createHash("sha256").update([input.task, ai.provider, model, input.system, input.user].join("\u0000")).digest("hex");

  if (!input.fresh) {
    const [hit] = await db.select().from(aiCache).where(eq(aiCache.key, key));
    if (hit) return { text: String((hit.value as { text: string }).text), model, provider: ai.provider, cached: true, costUsd: 0 };
  }

  const price = priceFor(ai.provider, model);
  if (price.inPerM > 0 && (await monthSpend()) >= ai.monthlyBudgetUsd) {
    throw new AiUnavailable(`Monthly AI budget of $${ai.monthlyBudgetUsd.toFixed(2)} reached. Raise it in Settings or wait until next month.`);
  }

  const maxTokens = input.maxTokens ?? 1200;
  let text = "";
  let inTok = 0;
  let outTok = 0;
  let cachedTok = 0;

  if (ai.provider === "anthropic") {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": ai.anthropicKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        system: [{ type: "text", text: input.system, cache_control: { type: "ephemeral" } }],
        messages: [{ role: "user", content: input.user }],
      }),
    });
    const data = (await res.json()) as {
      content?: { type: string; text?: string }[];
      usage?: { input_tokens?: number; output_tokens?: number; cache_read_input_tokens?: number; cache_creation_input_tokens?: number };
      error?: { message?: string };
    };
    if (!res.ok) throw new Error(`Anthropic: ${data.error?.message ?? res.statusText}`);
    text = (data.content ?? []).filter((c) => c.type === "text").map((c) => c.text ?? "").join("");
    cachedTok = data.usage?.cache_read_input_tokens ?? 0;
    const written = data.usage?.cache_creation_input_tokens ?? 0;
    inTok = (data.usage?.input_tokens ?? 0) + Math.round(written * 1.25) + Math.round(cachedTok * 0.1);
    outTok = data.usage?.output_tokens ?? 0;
  } else if (ai.provider === "openai") {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { authorization: `Bearer ${ai.openaiKey}`, "content-type": "application/json" },
      body: JSON.stringify({
        model,
        max_completion_tokens: maxTokens,
        messages: [
          { role: "system", content: input.system },
          { role: "user", content: input.user },
        ],
      }),
    });
    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
      usage?: { prompt_tokens?: number; completion_tokens?: number; prompt_tokens_details?: { cached_tokens?: number } };
      error?: { message?: string };
    };
    if (!res.ok) throw new Error(`OpenAI: ${data.error?.message ?? res.statusText}`);
    text = data.choices?.[0]?.message?.content ?? "";
    cachedTok = data.usage?.prompt_tokens_details?.cached_tokens ?? 0;
    inTok = (data.usage?.prompt_tokens ?? 0) - Math.round(cachedTok * 0.9);
    outTok = data.usage?.completion_tokens ?? 0;
  } else {
    const res = await fetch(`${ai.ollamaUrl.replace(/\/$/, "")}/api/chat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        model,
        stream: false,
        options: { num_predict: maxTokens },
        messages: [
          { role: "system", content: input.system },
          { role: "user", content: input.user },
        ],
      }),
    }).catch(() => {
      throw new AiUnavailable(`Can't reach Ollama at ${ai.ollamaUrl}. Is it running?`);
    });
    const data = (await res.json()) as { message?: { content?: string }; prompt_eval_count?: number; eval_count?: number; error?: string };
    if (!res.ok) throw new Error(`Ollama: ${data.error ?? res.statusText}`);
    text = data.message?.content ?? "";
    inTok = data.prompt_eval_count ?? 0;
    outTok = data.eval_count ?? 0;
  }

  const costUsd = (inTok * price.inPerM + outTok * price.outPerM) / 1_000_000;
  await db.insert(aiUsage).values({ task: input.task, provider: ai.provider, model, inputTokens: inTok, outputTokens: outTok, cachedTokens: cachedTok, costUsd });
  await db.insert(aiCache).values({ key, value: { text } }).onConflictDoUpdate({ target: aiCache.key, set: { value: { text } } });
  return { text, model, provider: ai.provider, cached: false, costUsd };
}

/** Pulls the first JSON object out of a model reply, tolerating code fences and stray prose. */
export function parseJson<T>(text: string): T {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const body = fenced ? fenced[1] : text;
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("The model did not return JSON");
  return JSON.parse(body.slice(start, end + 1)) as T;
}

export async function usageSummary() {
  const start = new Date();
  start.setDate(1);
  start.setHours(0, 0, 0, 0);
  const rows = await db
    .select({
      task: aiUsage.task,
      model: aiUsage.model,
      calls: sql<number>`count(*)`,
      cost: sql<number>`coalesce(sum(${aiUsage.costUsd}), 0)`,
      tokens: sql<number>`coalesce(sum(${aiUsage.inputTokens} + ${aiUsage.outputTokens}), 0)`,
    })
    .from(aiUsage)
    .where(and(gte(aiUsage.createdAt, start.getTime())))
    .groupBy(aiUsage.task, aiUsage.model);
  return rows.map((r) => ({ ...r, calls: Number(r.calls), cost: Number(r.cost), tokens: Number(r.tokens) }));
}
