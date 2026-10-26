import Link from "next/link";
import { connection } from "next/server";
import { queueItems } from "@/lib/queries";
import { getSettings } from "@/lib/settings";
import { ApprovedRow, ApproveAll, DraftCard } from "@/components/draft-card";

export default async function Review() {
  await connection();
  const [items, settings] = await Promise.all([queueItems(), getSettings()]);
  const drafts = items.filter((i) => i.app.status === "draft");
  const waiting = items.filter((i) => ["approved", "submitting"].includes(i.app.status));
  const needsYou = items.filter((i) => ["needs_you", "failed"].includes(i.app.status) || (i.app.status === "approved" && i.app.method === "manual"));
  const runnerQueue = waiting.filter((i) => i.app.method !== "manual");
  const aiOn = settings.ai.provider !== "none";

  return (
    <div className="mx-auto max-w-4xl space-y-10">
      <header>
        <h1 className="text-3xl font-bold">Review</h1>
        <p className="mt-1 max-w-[65ch] text-ink-2">
          Nothing is sent until you approve it. Read each draft, edit anything that sounds off, then approve. Approved form and email applications are sent by the apply runner on your computer.
        </p>
      </header>

      <section aria-labelledby="drafts-h">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 id="drafts-h" className="text-xl font-semibold">
            Drafts ({drafts.length})
          </h2>
          <ApproveAll ids={drafts.map((d) => d.app.id)} />
        </div>
        {drafts.length ? (
          <div className="space-y-3">
            {drafts.map((i) => (
              <DraftCard key={i.app.id} item={i} minScore={settings.search.minScore} aiOn={aiOn} />
            ))}
          </div>
        ) : (
          <p className="panel px-4 py-8 text-center text-ink-2">
            No drafts. In <Link href="/jobs" className="text-cobalt hover:underline">Matches</Link>, select jobs and choose “Draft applications”.
          </p>
        )}
      </section>

      {needsYou.length > 0 && (
        <section aria-labelledby="needs-h">
          <h2 id="needs-h" className="mb-1 text-xl font-semibold">
            Finish these yourself ({needsYou.length})
          </h2>
          <p className="mb-3 text-sm text-ink-2">These sites can&apos;t be filled automatically, or the runner hit a CAPTCHA or an unknown question. Open the form, paste your cover letter, then mark it applied.</p>
          <ul className="panel divide-y divide-line">
            {needsYou.map((i) => (
              <ApprovedRow key={i.app.id} item={i} />
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="runner-h">
        <h2 id="runner-h" className="mb-1 text-xl font-semibold">
          Ready to send ({runnerQueue.length})
        </h2>
        {runnerQueue.length ? (
          <>
            <div className="panel mb-3 bg-sunken p-4 text-sm">
              <p className="font-medium">Send them from your computer:</p>
              <pre className="mt-2 overflow-x-auto rounded-lg bg-surface p-3 text-[13px]">npm run apply</pre>
              <p className="mt-2 text-ink-2">
                A browser opens, fills each form with your profile, CV and this draft, and {settings.apply.autoSubmit ? "submits when the form is complete and there's no CAPTCHA." : "stops before Submit so you can check and click it yourself."} You can change this in Settings → Applying.
              </p>
            </div>
            <ul className="panel divide-y divide-line">
              {runnerQueue.map((i) => (
                <ApprovedRow key={i.app.id} item={i} />
              ))}
            </ul>
          </>
        ) : (
          <p className="text-sm text-ink-3">Approved applications appear here until they are sent.</p>
        )}
      </section>
    </div>
  );
}
