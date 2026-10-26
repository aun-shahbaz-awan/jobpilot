const UA = "JobPilot/1.0 (personal job-search tool; respects source terms)";

export async function getJson<T>(url: string, init: { headers?: Record<string, string>; timeoutMs?: number } = {}): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), init.timeoutMs ?? 20_000);
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA, Accept: "application/json", ...init.headers },
      signal: controller.signal,
      cache: "no-store",
    });
    if (!res.ok) throw new HttpError(res.status, `${res.status} ${res.statusText} from ${new URL(url).host}`);
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export function toMs(value: string | number | null | undefined): number {
  if (value === null || value === undefined || value === "") return Date.now();
  if (typeof value === "number") return value < 1e12 ? value * 1000 : value;
  const n = Date.parse(value);
  return Number.isNaN(n) ? Date.now() : n;
}

export function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
