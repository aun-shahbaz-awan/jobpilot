import { countriesIn } from "../geo";
import { getJson, HttpError, sleep, toMs } from "./http";
import type { RawJob, Source, SourceContext } from "./types";

const REMOTE = /\bremote\b|anywhere|distributed|work from home/i;

async function eachBoard(slugs: string[], ctx: SourceContext, label: string, run: (slug: string) => Promise<RawJob[]>) {
  const out: RawJob[] = [];
  for (const raw of slugs) {
    const slug = raw.trim();
    if (!slug) continue;
    try {
      out.push(...(await run(slug)));
    } catch (e) {
      const msg = e instanceof HttpError && e.status === 404 ? "board not found; check the slug" : (e as Error).message;
      ctx.log(`${label} "${slug}": ${msg}`);
    }
    await sleep(250);
  }
  return out;
}

/* ---------- Greenhouse: boards-api.greenhouse.io ---------- */
type GreenhouseJob = {
  id: number;
  title: string;
  absolute_url: string;
  location?: { name?: string };
  updated_at?: string;
  first_published?: string;
  content?: string;
  company_name?: string;
  offices?: { name?: string; location?: string | null }[];
};

export const greenhouse: Source = {
  id: "greenhouse",
  label: "Greenhouse company boards",
  homepage: "https://www.greenhouse.com",
  minIntervalHours: 3,
  fetch: (ctx) =>
    eachBoard(ctx.watchlist.greenhouse, ctx, "Greenhouse", async (slug) => {
      const data = await getJson<{ jobs: GreenhouseJob[] }>(`https://boards-api.greenhouse.io/v1/boards/${slug}/jobs?content=true`);
      return data.jobs.map((j) => {
        const location = j.location?.name ?? "";
        const officeText = (j.offices ?? []).map((o) => `${o.name ?? ""} ${o.location ?? ""}`).join(" ");
        return {
          source: "greenhouse",
          externalId: `${slug}-${j.id}`,
          title: j.title,
          company: j.company_name || slug,
          location,
          remote: REMOTE.test(location),
          countries: countriesIn(`${location} ${officeText}`),
          url: j.absolute_url,
          // The hosted form is consistent across companies, which the apply runner relies on.
          applyUrl: `https://job-boards.greenhouse.io/${slug}/jobs/${j.id}`,
          description: j.content ?? "",
          postedAt: toMs(j.first_published ?? j.updated_at),
        } satisfies RawJob;
      });
    }),
};

/* ---------- Lever: api.lever.co ---------- */
type LeverJob = {
  id: string;
  text: string;
  categories?: { commitment?: string; location?: string; team?: string; allLocations?: string[] };
  country?: string;
  workplaceType?: string;
  hostedUrl: string;
  applyUrl?: string;
  descriptionPlain?: string;
  description?: string;
  lists?: { text: string; content: string }[];
  additionalPlain?: string;
  createdAt?: number;
  salaryRange?: { min?: number; max?: number; currency?: string; interval?: string };
};

export const lever: Source = {
  id: "lever",
  label: "Lever company boards",
  homepage: "https://www.lever.co",
  minIntervalHours: 3,
  fetch: (ctx) =>
    eachBoard(ctx.watchlist.lever, ctx, "Lever", async (slug) => {
      const data = await getJson<LeverJob[]>(`https://api.lever.co/v0/postings/${slug}?mode=json`);
      return data.map((j) => {
        const locs = j.categories?.allLocations?.length ? j.categories.allLocations : [j.categories?.location ?? ""];
        const location = locs.filter(Boolean).join(" / ");
        const lists = (j.lists ?? []).map((l) => `<h3>${l.text}</h3><ul>${l.content}</ul>`).join("");
        const found = countriesIn(location);
        return {
          source: "lever",
          externalId: `${slug}-${j.id}`,
          title: j.text,
          company: slug,
          location,
          remote: j.workplaceType === "remote" || REMOTE.test(location),
          countries: found.length ? found : j.country ? [j.country] : [],
          url: j.hostedUrl,
          applyUrl: j.applyUrl ?? `${j.hostedUrl}/apply`,
          description: `${j.description ?? j.descriptionPlain ?? ""}${lists}<p>${j.additionalPlain ?? ""}</p>`,
          employmentType: j.categories?.commitment ?? null,
          salaryMin: j.salaryRange?.min ?? null,
          salaryMax: j.salaryRange?.max ?? null,
          salaryCurrency: j.salaryRange?.currency ?? null,
          salaryPeriod: j.salaryRange?.interval ?? null,
          postedAt: toMs(j.createdAt),
        } satisfies RawJob;
      });
    }),
};

/* ---------- Ashby: api.ashbyhq.com/posting-api ---------- */
type AshbyJob = {
  id: string;
  title: string;
  location?: string;
  secondaryLocations?: { location?: string }[];
  isRemote?: boolean;
  workplaceType?: string;
  employmentType?: string;
  publishedAt?: string;
  jobUrl: string;
  applyUrl?: string;
  descriptionHtml?: string;
  descriptionPlain?: string;
  address?: { postalAddress?: { addressCountry?: string } };
  compensation?: { compensationTierSummary?: string };
};

export const ashby: Source = {
  id: "ashby",
  label: "Ashby company boards",
  homepage: "https://www.ashbyhq.com",
  minIntervalHours: 3,
  fetch: (ctx) =>
    eachBoard(ctx.watchlist.ashby, ctx, "Ashby", async (slug) => {
      const data = await getJson<{ jobs: AshbyJob[] }>(`https://api.ashbyhq.com/posting-api/job-board/${slug}?includeCompensation=true`);
      return data.jobs.map((j) => {
        const location = [j.location, ...(j.secondaryLocations ?? []).map((s) => s.location)].filter(Boolean).join(" / ");
        const country = j.address?.postalAddress?.addressCountry ?? "";
        return {
          source: "ashby",
          externalId: `${slug}-${j.id}`,
          title: j.title,
          company: slug,
          location,
          remote: Boolean(j.isRemote) || j.workplaceType === "Remote",
          countries: countriesIn(`${location} ${country}`),
          url: j.jobUrl,
          applyUrl: j.applyUrl ?? `${j.jobUrl}/application`,
          description: (j.descriptionHtml ?? j.descriptionPlain ?? "") + (j.compensation?.compensationTierSummary ? `<p>Compensation: ${j.compensation.compensationTierSummary}</p>` : ""),
          employmentType: j.employmentType ?? null,
          postedAt: toMs(j.publishedAt),
        } satisfies RawJob;
      });
    }),
};
