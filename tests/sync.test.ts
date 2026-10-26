import { test } from "node:test";
import assert from "node:assert/strict";
import { rmSync, mkdirSync } from "node:fs";

const DB = "data/test-sync.db";
mkdirSync("data", { recursive: true });
rmSync(DB, { force: true });
process.env.DATABASE_URL = `file:./${DB}`;

const { installFetchMock } = await import("./fixtures");
const { migrate } = await import("drizzle-orm/libsql/migrator");
const { db } = await import("../src/lib/db");
const { jobs, profile } = await import("../src/lib/db/schema");
const { syncSources, rescoreAll } = await import("../src/lib/sync");
const { computeInsights } = await import("../src/lib/insights");
const { prepareApplication } = await import("../src/lib/applications");

await migrate(db, { migrationsFolder: "./drizzle" });
await db.insert(profile).values({
  id: 1,
  fullName: "Test Person",
  countryCode: "AE",
  yearsExperience: 4,
  headline: "Frontend Engineer",
  skills: [
    { name: "React", level: 5 },
    { name: "Next.js", level: 5 },
    { name: "TypeScript", level: 4 },
    { name: "Tailwind CSS", level: 5 },
    { name: "Ethers.js", level: 4 },
  ],
});
const restore = installFetchMock();

test("sync pulls, normalises, scores and filters jobs from every source", async () => {
  const results = await syncSources({ force: true });
  const ok = results.filter((r) => r.status === "ok");
  assert.ok(ok.length >= 6, JSON.stringify(results));
  const rows = await db.select().from(jobs);
  const byTitle = Object.fromEntries(rows.map((r) => [r.title, r]));

  // Irrelevant jobs are never stored.
  assert.equal(byTitle["Nageldesigner*in"], undefined);
  assert.equal(byTitle["Content Marketing Manager"], undefined);

  const web3 = byTitle["Web3 Frontend Developer"];
  assert.ok(web3, "web3 job stored");
  assert.ok(web3.score >= 75, `web3 score ${web3.score}`);
  assert.ok(web3.skills.includes("Ethers.js"));

  const us = byTitle["React Developer"];
  assert.ok(us && us.score <= 35 && us.breakdown?.eligible === false, "US-only job capped");

  const german = byTitle["Frontend Entwickler (m/w/d) React"];
  assert.ok(german && german.score <= 45 && german.breakdown?.reasons.includes("Needs German"), "German job capped");

  const munich = byTitle["React Engineer"];
  assert.ok(munich && munich.breakdown?.eligible && munich.countries.includes("DE"), "Munich job is in the Germany market");

  const gh = byTitle["Senior Software Engineer, Frontend (Wallet)"];
  assert.ok(gh, "greenhouse job stored");
  assert.equal(gh.ats, "greenhouse");
  assert.match(gh.applyUrl, /job-boards\.greenhouse\.io\/coinbase\/jobs\/4100001/);
  assert.match(gh.description, /self-custody wallet/);

  const lever = byTitle["Frontend Developer - Trading Platform"];
  assert.ok(lever && lever.ats === "lever" && lever.breakdown?.eligible, "Dubai lever job eligible");

  const missingBoards = results.find((r) => r.source === "greenhouse")?.message ?? "";
  assert.match(missingBoards, /board not found/);
});

test("re-sync respects board polling limits and updates instead of duplicating", async () => {
  const before = (await db.select().from(jobs)).length;
  const results = await syncSources({ force: true });
  assert.equal(results.find((r) => r.source === "remotive")?.status, "skipped");
  assert.equal(results.find((r) => r.source === "greenhouse")?.status, "ok");
  assert.equal((await db.select().from(jobs)).length, before);
});

test("insights rank missing skills and rescoring works", async () => {
  await rescoreAll();
  const ins = await computeInsights();
  assert.ok(ins.relevantJobs >= 4, `relevant ${ins.relevantJobs}`);
  const names = ins.learnNext.map((r) => r.skill);
  assert.ok(names.length > 0);
  assert.ok(!names.includes("React"), "known skills are not suggested");
});

test("drafting an application works without AI", async () => {
  const [j] = await db.select().from(jobs).limit(1);
  const { application, note } = await prepareApplication(j.id);
  assert.equal(note, undefined);
  assert.equal(application.status, "draft");
  assert.match(application.coverLetter, new RegExp(j.company));
  assert.equal(application.generatedBy, "template");
  restore();
});
