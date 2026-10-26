import Link from "next/link";
import { connection } from "next/server";
import { listJobs, sourceCounts, type JobFilters } from "@/lib/queries";
import { getSettings } from "@/lib/settings";
import { JobList } from "@/components/job-list";
import { sourceLabel } from "@/lib/format";

type Search = Record<string, string | string[] | undefined>;

function one(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v;
}

export default async function Matches({ searchParams }: { searchParams: Promise<Search> }) {
  await connection();
  const sp = await searchParams;
  const settings = await getSettings();
  const filters: JobFilters = {
    q: one(sp.q),
    min: one(sp.min) !== undefined ? Number(one(sp.min)) : 0,
    status: (one(sp.status) as JobFilters["status"]) ?? "open",
    source: one(sp.source) || undefined,
    where: (one(sp.where) as JobFilters["where"]) ?? "any",
    sort: (one(sp.sort) as JobFilters["sort"]) ?? "score",
    page: Number(one(sp.page) ?? 1),
  };
  const [{ rows, total, page, pages }, sources] = await Promise.all([listJobs(filters), sourceCounts()]);
  const qs = (patch: Record<string, string | number | undefined>) => {
    const p = new URLSearchParams();
    const merged = { ...Object.fromEntries(Object.entries(sp).map(([k, v]) => [k, one(v)])), ...patch };
    for (const [k, v] of Object.entries(merged)) if (v !== undefined && v !== "") p.set(k, String(v));
    return `/jobs?${p.toString()}`;
  };

  return (
    <div className="mx-auto max-w-6xl">
      <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Matches</h1>
          <p className="text-ink-2">
            {total} job{total === 1 ? "" : "s"}, best fit first. Select several to draft applications in one go.
          </p>
        </div>
      </header>

      <form className="panel mb-4 grid grid-cols-2 gap-3 p-3 sm:grid-cols-3 lg:grid-cols-6" action="/jobs">
        <div className="col-span-2 sm:col-span-3 lg:col-span-2">
          <label className="label" htmlFor="q">
            Search
          </label>
          <input id="q" name="q" defaultValue={filters.q} placeholder="Title, company, skill" className="field" />
        </div>
        <div>
          <label className="label" htmlFor="min">
            Minimum score
          </label>
          <select id="min" name="min" defaultValue={String(filters.min ?? 0)} className="field">
            {[0, 40, 50, 60, 70, 80].map((n) => (
              <option key={n} value={n}>
                {n === 0 ? "Any" : `${n}+`}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="status">
            Show
          </label>
          <select id="status" name="status" defaultValue={filters.status} className="field">
            <option value="open">New and saved</option>
            <option value="new">New only</option>
            <option value="saved">Saved only</option>
            <option value="all">Everything</option>
          </select>
        </div>
        <div>
          <label className="label" htmlFor="where">
            Where
          </label>
          <select id="where" name="where" defaultValue={filters.where} className="field">
            <option value="any">Remote or on-site</option>
            <option value="remote">Remote only</option>
            <option value="onsite">On-site / hybrid</option>
          </select>
        </div>
        <div>
          <label className="label" htmlFor="sort">
            Sort by
          </label>
          <select id="sort" name="sort" defaultValue={filters.sort} className="field">
            <option value="score">Best match</option>
            <option value="newest">Newest</option>
            <option value="salary">Salary</option>
          </select>
        </div>
        <div className="col-span-2 flex flex-wrap items-end gap-2 sm:col-span-3 lg:col-span-6">
          <select name="source" defaultValue={filters.source ?? ""} className="field w-auto" aria-label="Source">
            <option value="">All sources</option>
            {sources.map((s) => (
              <option key={s.source} value={s.source}>
                {sourceLabel(s.source)} ({Number(s.n)})
              </option>
            ))}
          </select>
          <button className="btn btn-primary">Apply filters</button>
          <Link href="/jobs" className="btn btn-ghost">
            Reset
          </Link>
        </div>
      </form>

      <JobList
        key={`${page}-${JSON.stringify(filters)}`}
        jobs={rows}
        minScore={settings.search.minScore}
        empty={
          <div className="panel px-6 py-12 text-center">
            <p className="font-medium">No jobs match these filters.</p>
            <p className="mt-1 text-sm text-ink-2">Lower the minimum score, switch “Show” to Everything, or find new jobs from the sidebar.</p>
          </div>
        }
      />

      {pages > 1 && (
        <nav className="mt-4 flex items-center justify-center gap-2 text-sm" aria-label="Pages">
          {page > 1 && (
            <Link className="btn" href={qs({ page: page - 1 })}>
              Previous
            </Link>
          )}
          <span className="px-2 text-ink-2">
            Page {page} of {pages}
          </span>
          {page < pages && (
            <Link className="btn" href={qs({ page: page + 1 })}>
              Next
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}
