import { countriesIn } from "../geo";
import { getJson, sleep, toMs } from "./http";
import type { RawJob, Source } from "./types";

/* ---------- Remotive: https://github.com/remotive-com/remote-jobs-api ---------- */
type RemotiveJob = {
  id: number;
  url: string;
  title: string;
  company_name: string;
  company_logo?: string;
  category?: string;
  tags?: string[];
  job_type?: string;
  publication_date: string;
  candidate_required_location?: string;
  salary?: string;
  description: string;
};

export const remotive: Source = {
  id: "remotive",
  label: "Remotive",
  homepage: "https://remotive.com",
  // Remotive asks integrators to fetch at most a few times a day.
  minIntervalHours: 6,
  async fetch() {
    const data = await getJson<{ jobs: RemotiveJob[] }>("https://remotive.com/api/remote-jobs?category=software-dev");
    return data.jobs.map(
      (j): RawJob => ({
        source: "remotive",
        externalId: String(j.id),
        title: j.title,
        company: j.company_name,
        companyLogo: j.company_logo,
        location: j.candidate_required_location || "Worldwide",
        remote: true,
        countries: countriesIn(j.candidate_required_location ?? ""),
        url: j.url,
        description: j.description,
        tags: j.tags ?? [],
        employmentType: j.job_type ?? null,
        postedAt: toMs(j.publication_date),
        ...parseSalaryText(j.salary),
      }),
    );
  },
};

/* ---------- Remote OK: https://remoteok.com/api ---------- */
type RemoteOkJob = {
  id: string;
  epoch?: number;
  date?: string;
  company: string;
  company_logo?: string;
  position: string;
  tags?: string[];
  description: string;
  location?: string;
  salary_min?: number;
  salary_max?: number;
  apply_url?: string;
  url: string;
};

const DEV_TAGS = /(dev|engineer|developer|frontend|front end|react|javascript|typescript|web3|blockchain|crypto|full stack|backend|software)/i;

export const remoteok: Source = {
  id: "remoteok",
  label: "Remote OK",
  homepage: "https://remoteok.com",
  minIntervalHours: 6,
  async fetch() {
    const data = await getJson<unknown[]>("https://remoteok.com/api");
    return (data.slice(1) as RemoteOkJob[])
      .filter((j) => j && j.position && (DEV_TAGS.test((j.tags ?? []).join(" ")) || DEV_TAGS.test(j.position)))
      .map(
        (j): RawJob => ({
          source: "remoteok",
          externalId: String(j.id),
          title: j.position,
          company: j.company,
          companyLogo: j.company_logo || null,
          location: j.location || "Worldwide",
          remote: true,
          countries: countriesIn(j.location ?? ""),
          url: j.url,
          applyUrl: j.apply_url || j.url,
          description: j.description,
          tags: j.tags ?? [],
          salaryMin: j.salary_min || null,
          salaryMax: j.salary_max || null,
          salaryCurrency: j.salary_min ? "USD" : null,
          salaryPeriod: j.salary_min ? "annual" : null,
          postedAt: j.epoch ? j.epoch * 1000 : toMs(j.date),
        }),
      );
  },
};

/* ---------- Himalayas: https://himalayas.app/docs/remote-jobs-api ---------- */
type HimalayasJob = {
  title: string;
  excerpt?: string;
  companyName: string;
  companyLogo?: string;
  employmentType?: string;
  minSalary?: number | null;
  maxSalary?: number | null;
  salaryPeriod?: string;
  currency?: string;
  seniority?: string[] | string;
  locationRestrictions?: ({ alpha2?: string; name?: string } | string)[];
  categories?: string[];
  description: string;
  pubDate: number;
  applicationLink: string;
  guid: string;
};

export const himalayas: Source = {
  id: "himalayas",
  label: "Himalayas",
  homepage: "https://himalayas.app",
  // Data refreshes daily; polling more often gains nothing.
  minIntervalHours: 12,
  async fetch(ctx) {
    const headers: Record<string, string> = {};
    if (process.env.HIMALAYAS_API_KEY) headers.Authorization = `Bearer ${process.env.HIMALAYAS_API_KEY}`;
    const seen = new Map<string, RawJob>();
    for (const q of ctx.queries.slice(0, 6)) {
      for (const page of [1, 2]) {
        const url = `https://himalayas.app/jobs/api/search?q=${encodeURIComponent(q)}&sort=recent&page=${page}`;
        let data: { jobs?: HimalayasJob[] };
        try {
          data = await getJson(url, { headers });
        } catch (e) {
          ctx.log(`Himalayas "${q}" page ${page}: ${(e as Error).message}`);
          break;
        }
        for (const j of data.jobs ?? []) {
          const restrictions = (j.locationRestrictions ?? []).map((r) => (typeof r === "string" ? { name: r } : r));
          seen.set(j.guid, {
            source: "himalayas",
            externalId: j.guid,
            title: j.title,
            company: j.companyName,
            companyLogo: j.companyLogo,
            location: restrictions.length ? restrictions.map((r) => r.name).join(", ") : "Worldwide",
            remote: true,
            countries: restrictions.map((r) => r.alpha2).filter((c): c is string => Boolean(c)),
            url: j.guid.startsWith("http") ? j.guid : j.applicationLink,
            // Himalayas requires apply actions to use applicationLink.
            applyUrl: j.applicationLink,
            description: j.description || j.excerpt || "",
            tags: j.categories ?? [],
            salaryMin: j.minSalary ?? null,
            salaryMax: j.maxSalary ?? null,
            salaryCurrency: j.currency ?? null,
            salaryPeriod: j.salaryPeriod ?? (j.minSalary ? "annual" : null),
            seniority: Array.isArray(j.seniority) ? j.seniority.join(", ") : (j.seniority ?? null),
            employmentType: j.employmentType ?? null,
            postedAt: toMs(j.pubDate),
          });
        }
        if ((data.jobs ?? []).length < 20) break;
        await sleep(400);
      }
    }
    return [...seen.values()];
  },
};

/* ---------- Jobicy: https://jobicy.com/jobs-rss-feed ---------- */
type JobicyJob = {
  id: number;
  url: string;
  jobTitle: string;
  companyName: string;
  companyLogo?: string;
  jobIndustry?: string[];
  jobType?: string[];
  jobGeo?: string;
  jobLevel?: string;
  jobExcerpt?: string;
  jobDescription?: string;
  pubDate: string;
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency?: string;
  salaryPeriod?: string;
};

export const jobicy: Source = {
  id: "jobicy",
  label: "Jobicy",
  homepage: "https://jobicy.com",
  minIntervalHours: 4,
  async fetch(ctx) {
    const out: RawJob[] = [];
    let cursor: string | null = null;
    for (let page = 0; page < 3; page++) {
      const url = new URL("https://jobicy.com/api/jobs");
      url.searchParams.set("count", "200");
      url.searchParams.set("industry", "engineering");
      if (cursor) url.searchParams.set("cursor", cursor);
      let data: { jobs?: JobicyJob[]; nextCursor?: string | null };
      try {
        data = await getJson(url.toString());
      } catch (e) {
        // Older public endpoint, kept as a fallback.
        if (page === 0) data = await getJson("https://jobicy.com/api/v2/remote-jobs?count=100&industry=engineering");
        else {
          ctx.log(`Jobicy page ${page + 1}: ${(e as Error).message}`);
          break;
        }
      }
      for (const j of data.jobs ?? []) {
        out.push({
          source: "jobicy",
          externalId: String(j.id),
          title: decode(j.jobTitle),
          company: decode(j.companyName),
          companyLogo: j.companyLogo,
          location: j.jobGeo || "Anywhere",
          remote: true,
          countries: countriesIn(j.jobGeo ?? ""),
          url: j.url,
          description: j.jobDescription || j.jobExcerpt || "",
          tags: j.jobIndustry ?? [],
          salaryMin: j.salaryMin ?? null,
          salaryMax: j.salaryMax ?? null,
          salaryCurrency: j.salaryCurrency ?? null,
          salaryPeriod: j.salaryPeriod ?? null,
          seniority: j.jobLevel ?? null,
          employmentType: j.jobType?.join(", ") ?? null,
          postedAt: toMs(j.pubDate),
        });
      }
      cursor = data.nextCursor ?? null;
      if (!cursor) break;
      await sleep(500);
    }
    return out;
  },
};

/* ---------- Arbeitnow (Germany and Europe): https://www.arbeitnow.com/blog/job-board-api ---------- */
type ArbeitnowJob = {
  slug: string;
  company_name: string;
  title: string;
  description: string;
  remote: boolean;
  url: string;
  tags?: string[];
  job_types?: string[];
  location: string;
  created_at: number;
};

export const arbeitnow: Source = {
  id: "arbeitnow",
  label: "Arbeitnow",
  homepage: "https://www.arbeitnow.com",
  minIntervalHours: 4,
  async fetch(ctx) {
    const out: RawJob[] = [];
    for (let page = 1; page <= 5; page++) {
      let data: { data?: ArbeitnowJob[] };
      try {
        data = await getJson(`https://www.arbeitnow.com/api/job-board-api?page=${page}`);
      } catch (e) {
        ctx.log(`Arbeitnow page ${page}: ${(e as Error).message}`);
        break;
      }
      const rows = data.data ?? [];
      for (const j of rows) {
        const found = countriesIn(j.location ?? "");
        out.push({
          source: "arbeitnow",
          externalId: j.slug,
          title: j.title,
          company: j.company_name,
          location: j.location || (j.remote ? "Remote" : "Germany"),
          remote: Boolean(j.remote),
          // Arbeitnow lists German cities without a country name.
          countries: found.length ? found : j.remote ? [] : ["DE"],
          url: j.url,
          description: j.description,
          tags: j.tags ?? [],
          employmentType: j.job_types?.join(", ") ?? null,
          postedAt: toMs(j.created_at),
        });
      }
      if (rows.length === 0) break;
      await sleep(400);
    }
    return out;
  },
};

/* ---------- helpers ---------- */
function decode(s: string) {
  return s.replace(/&amp;/g, "&").replace(/&#0?39;/g, "'").replace(/&quot;/g, '"');
}

/** Parses free-text salaries like "$80k - $100k" or "€60,000–75,000 per year". */
export function parseSalaryText(text?: string | null): Partial<RawJob> {
  if (!text) return {};
  const t = text.toLowerCase().replace(/,/g, "");
  const nums = [...t.matchAll(/(\d+(?:\.\d+)?)\s*(k)?/g)]
    .map((m) => Number(m[1]) * (m[2] ? 1000 : 1))
    .filter((n) => n >= 10);
  if (!nums.length) return {};
  const currency = /€|eur/.test(t) ? "EUR" : /£|gbp/.test(t) ? "GBP" : /aed/.test(t) ? "AED" : "USD";
  const period = /hour|\/h|hr/.test(t) ? "hourly" : /month|\/mo/.test(t) ? "monthly" : "annual";
  return { salaryMin: Math.min(...nums), salaryMax: Math.max(...nums), salaryCurrency: currency, salaryPeriod: period };
}
