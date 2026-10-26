export function timeAgo(ms: number, now = Date.now()): string {
  const s = Math.round((now - ms) / 1000);
  if (s < 60) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24);
  if (d < 30) return `${d} d ago`;
  const mo = Math.round(d / 30);
  return `${mo} mo ago`;
}

export function dateLabel(ms: number): string {
  return new Date(ms).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export function isoDate(ms: number | null | undefined): string {
  if (!ms) return "";
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function salary(j: { salaryMin: number | null; salaryMax: number | null; salaryCurrency: string | null; salaryPeriod: string | null }): string | null {
  if (!j.salaryMin && !j.salaryMax) return null;
  const cur = j.salaryCurrency ?? "";
  const fmt = (n: number) => (n >= 1000 ? `${Math.round(n / 1000)}k` : String(Math.round(n)));
  const range = j.salaryMin && j.salaryMax && j.salaryMin !== j.salaryMax ? `${fmt(j.salaryMin)}–${fmt(j.salaryMax)}` : fmt((j.salaryMin ?? j.salaryMax)!);
  const per = j.salaryPeriod && !/annual|year/i.test(j.salaryPeriod) ? ` / ${j.salaryPeriod.replace(/ly$/, "")}` : "";
  return `${cur} ${range}${per}`.trim();
}

export type Tone = "good" | "mid" | "low";
export function scoreTone(score: number, minScore: number): Tone {
  if (score >= Math.max(minScore, 75)) return "good";
  if (score >= minScore - 10) return "mid";
  return "low";
}

export function plural(n: number, word: string, pluralWord = `${word}s`) {
  return `${n} ${n === 1 ? word : pluralWord}`;
}

const SOURCE_LABEL: Record<string, string> = {
  remotive: "Remotive",
  remoteok: "Remote OK",
  himalayas: "Himalayas",
  jobicy: "Jobicy",
  arbeitnow: "Arbeitnow",
  greenhouse: "Greenhouse",
  lever: "Lever",
  ashby: "Ashby",
};

export function sourceLabel(s: string) {
  return SOURCE_LABEL[s] ?? s;
}

/** "Remote", "Remote, EMEA" or the on-site location, without repeating the word Remote. */
export function whereLabel(j: { remote: boolean; location: string }): string {
  const loc = j.location.trim();
  if (!j.remote) return loc || "Location not given";
  if (!loc || /^remote$/i.test(loc)) return "Remote";
  return /remote/i.test(loc) ? loc : `Remote, ${loc}`;
}
