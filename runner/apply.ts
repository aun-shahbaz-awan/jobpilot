/**
 * Apply runner. Sends the applications you approved in the Review page.
 *
 *   pnpm run apply           fill each form, then wait for you to check and submit
 *   pnpm run apply --dry     fill forms but never submit, and change nothing in the database
 *
 * Form applications open in a real browser window on your computer. Email applications go out
 * through your SMTP account. It never bypasses CAPTCHAs, never ticks consent boxes for you,
 * and never invents answers: anything it can't fill is left for you.
 */
import "dotenv/config";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { createInterface } from "node:readline/promises";
import { and, eq, gte, inArray, sql } from "drizzle-orm";
import { db } from "../src/lib/db";
import { applications, jobs, type Application, type Job } from "../src/lib/db/schema";
import { getProfile } from "../src/lib/profile";
import { getResumeFile } from "../src/lib/resume";
import { getSettings } from "../src/lib/settings";
import { logEvent, markApplied } from "../src/lib/applications";
import { clickSubmit, fillForm, looksSubmitted } from "./fill";
import { sendEmailApplication, smtpReady } from "./email";

const DRY = process.argv.includes("--dry");
const interactive = Boolean(process.stdin.isTTY);
const rl = interactive ? createInterface({ input: process.stdin, output: process.stdout }) : null;

async function ask(q: string): Promise<string> {
  if (!rl) return "";
  return (await rl.question(q)).trim().toLowerCase();
}

async function setApp(id: number, patch: Partial<Application>, line?: string) {
  if (DRY) return;
  const [cur] = await db.select({ log: applications.log }).from(applications).where(eq(applications.id, id));
  const log = line ? [...(cur?.log ?? []), `${new Date().toISOString()} ${line}`] : cur?.log;
  await db.update(applications).set({ ...patch, log }).where(eq(applications.id, id));
}

async function main() {
  const settings = await getSettings();
  const profile = await getProfile();
  if (!profile.email || !profile.fullName) {
    console.error("Add your name and email in the Profile page first.");
    process.exit(1);
  }

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const sentToday = await db.$count(applications, and(eq(applications.status, "submitted"), gte(applications.submittedAt, startOfDay.getTime())));
  const allowance = Math.max(0, settings.apply.dailyLimit - sentToday);

  const queue = await db
    .select({ app: applications, job: jobs })
    .from(applications)
    .innerJoin(jobs, eq(applications.jobId, jobs.id))
    .where(and(eq(applications.status, "approved"), inArray(applications.method, ["form", "email"])))
    .orderBy(sql`${jobs.score} desc`);

  if (!queue.length) {
    console.log("Nothing approved to send. Approve drafts in the Review page first.");
    return;
  }
  if (!allowance) {
    console.log(`Daily limit of ${settings.apply.dailyLimit} reached. Change it in Settings → Applying.`);
    return;
  }
  const batch = queue.slice(0, allowance);
  console.log(`${batch.length} application${batch.length === 1 ? "" : "s"} to send${DRY ? " (dry run: nothing is submitted or saved)" : ""}.\n`);

  // Your CV is stored in the database; write it to a temporary file for upload.
  const resume = await getResumeFile();
  let resumePath: string | null = null;
  if (resume) {
    mkdirSync("data/tmp", { recursive: true });
    resumePath = resolve(join("data/tmp", resume.name.replace(/[^\w.-]+/g, "_")));
    writeFileSync(resumePath, resume.buffer);
  } else {
    console.warn("No CV uploaded. Forms that require one will be left for you.\n");
  }

  const emailJobs = batch.filter((b) => b.app.method === "email");
  const formJobs = batch.filter((b) => b.app.method === "form");

  for (const { app, job } of emailJobs) {
    if (!smtpReady()) {
      await setApp(app.id, { status: "needs_you", error: "Email isn't set up (SMTP_USER / SMTP_PASS)" }, "No SMTP credentials");
      console.log(`✗ ${job.company}: email not set up; moved to "Finish these yourself"`);
      continue;
    }
    if (DRY) {
      console.log(`• Would email ${job.applyEmail} for ${job.title} at ${job.company}`);
      continue;
    }
    try {
      await sendEmailApplication({ job, app, profile, settings, resume });
      await setApp(app.id, { status: "submitted", submittedAt: Date.now(), error: null }, `Emailed ${job.applyEmail}`);
      await markApplied(job.id, `by email to ${job.applyEmail}`);
      console.log(`✓ Emailed ${job.company} (${job.applyEmail})`);
    } catch (e) {
      await setApp(app.id, { status: "failed", error: (e as Error).message }, `Email failed: ${(e as Error).message}`);
      console.log(`✗ ${job.company}: ${(e as Error).message}`);
    }
  }

  if (formJobs.length) await runForms(formJobs, profile, resumePath, settings.apply.autoSubmit);
  rl?.close();
}

async function runForms(items: { app: Application; job: Job }[], profile: Awaited<ReturnType<typeof getProfile>>, resumePath: string | null, autoSubmit: boolean) {
  let chromium;
  try {
    ({ chromium } = await import("playwright"));
  } catch {
    console.error("Playwright isn't installed. Run: pnpm install && pnpm run apply:install");
    return;
  }
  // A persistent profile keeps cookies, so sites you sign in to once stay signed in.
  const context = await chromium
    .launchPersistentContext(resolve("data/browser"), { headless: false, viewport: { width: 1280, height: 900 } })
    .catch(async (e: Error) => {
      if (/Executable doesn't exist/i.test(e.message)) {
        console.error("The browser isn't installed yet. Run: pnpm run apply:install");
        process.exit(1);
      }
      throw e;
    });

  for (const { app, job } of items) {
    console.log(`\n→ ${job.title} at ${job.company}\n  ${job.applyUrl}`);
    await setApp(app.id, { status: "submitting" }, "Opening form");
    const page = await context.newPage();
    try {
      await page.goto(job.applyUrl, { waitUntil: "domcontentloaded", timeout: 45_000 });
      await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
      // Lever and some boards show the posting first, with an Apply button.
      const applyBtn = page.getByRole("link", { name: /^apply( for this job| now)?$/i });
      if ((await page.locator("input, textarea").count()) < 3 && (await applyBtn.count())) {
        await applyBtn.first().click();
        await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
      }

      const r = await fillForm(page, job, app, profile, resumePath);
      console.log(`  Filled: ${r.filled.length ? r.filled.join(", ") : "nothing"}`);
      if (r.unanswered.length) console.log(`  Needs you: ${r.unanswered.join("; ")}`);
      if (r.uncheckedRequired.length) console.log(`  Tick yourself: ${r.uncheckedRequired.join("; ")}`);
      if (r.captcha) console.log("  CAPTCHA on the page: complete it yourself.");

      const complete = !r.unanswered.length && !r.uncheckedRequired.length && !r.captcha && (r.resumeUploaded || !resumePath);

      if (DRY) {
        console.log(`  Dry run: ${complete ? "form looks complete" : "form needs you"}; not submitting.`);
        await ask("  Press Enter for the next one…");
        await page.close();
        continue;
      }

      let submitted = false;
      if (autoSubmit && complete) {
        await clickSubmit(page);
        await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});
        submitted = await looksSubmitted(page);
        console.log(submitted ? "  ✓ Submitted" : "  Clicked Submit but saw no confirmation; check the window.");
      }

      if (!submitted && interactive) {
        const answer = await ask("  Check the form, submit it in the browser, then press Enter. Type s to skip: ");
        if (answer === "s") {
          await setApp(app.id, { status: "needs_you", error: "Skipped in the runner" }, "Skipped");
          await page.close();
          continue;
        }
        submitted = (await looksSubmitted(page)) || (await ask("  I couldn't see a confirmation. Did it go through? (y/n) ")) === "y";
      }

      if (submitted) {
        await setApp(app.id, { status: "submitted", submittedAt: Date.now(), error: null }, "Submitted");
        await markApplied(job.id, "through the apply runner");
      } else {
        const why = [r.captcha && "CAPTCHA", r.unanswered.length && `${r.unanswered.length} unanswered`, r.uncheckedRequired.length && "consent boxes"].filter(Boolean).join(", ");
        await setApp(app.id, { status: "needs_you", error: why || "Not confirmed" }, `Needs you: ${why || "not confirmed"}`);
        await logEvent(job.id, "runner", `The runner filled the form; finish it yourself (${why || "not confirmed"})`);
      }
    } catch (e) {
      const msg = (e as Error).message.split("\n")[0];
      await setApp(app.id, { status: "failed", error: msg }, `Failed: ${msg}`);
      console.log(`  ✗ ${msg}`);
    }
    if (!interactive) await page.close().catch(() => {});
  }
  console.log("\nDone. Anything that needs you is listed in the Review page.");
  if (interactive) await ask("Press Enter to close the browser… ");
  await context.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
