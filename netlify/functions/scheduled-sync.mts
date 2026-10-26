/**
 * Netlify scheduled function: every 30 minutes, sync the most overdue job source.
 * Needs URL (set by Netlify) and CRON_SECRET in the site's environment variables.
 */
export default async () => {
  const base = process.env.URL;
  if (!base || !process.env.CRON_SECRET) return new Response("Missing URL or CRON_SECRET", { status: 500 });
  const res = await fetch(`${base}/api/sync`, { method: "POST", headers: { authorization: `Bearer ${process.env.CRON_SECRET}` } });
  return new Response(await res.text(), { status: res.status });
};

export const config = { schedule: "*/30 * * * *" };
