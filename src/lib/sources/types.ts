import type { SourceId } from "../settings";

/** A job as returned by a source, before scoring and storage. */
export type RawJob = {
  source: SourceId;
  externalId: string;
  title: string;
  company: string;
  companyLogo?: string | null;
  location: string;
  remote: boolean;
  countries?: string[];
  url: string;
  applyUrl?: string;
  /** HTML or plain text; it is normalised to text later. */
  description: string;
  tags?: string[];
  salaryMin?: number | null;
  salaryMax?: number | null;
  salaryCurrency?: string | null;
  salaryPeriod?: string | null;
  seniority?: string | null;
  employmentType?: string | null;
  postedAt: number;
};

export type SourceContext = {
  queries: string[];
  watchlist: { greenhouse: string[]; lever: string[]; ashby: string[] };
  log: (msg: string) => void;
};

export type Source = {
  id: SourceId;
  label: string;
  homepage: string;
  /** Minimum hours between fetches, respecting each board's fair-use terms. */
  minIntervalHours: number;
  fetch: (ctx: SourceContext) => Promise<RawJob[]>;
};
