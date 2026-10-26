/**
 * Fills a separate demo database (data/demo.db) with sample jobs so you can explore the app
 * without touching your real data:  pnpm run demo  then  pnpm run dev:demo
 */
import { mkdirSync, rmSync } from "node:fs";

mkdirSync("data", { recursive: true });
rmSync("data/demo.db", { force: true });
process.env.DATABASE_URL = "file:./data/demo.db";

const { migrate } = await import("drizzle-orm/libsql/migrator");
const { db } = await import("../src/lib/db");
const { profile, jobs } = await import("../src/lib/db/schema");
const { installFetchMock } = await import("../tests/fixtures");
const { syncSources } = await import("../src/lib/sync");
const { prepareApplication, setJobStatus, markApplied, logEvent } = await import("../src/lib/applications");
const { desc } = await import("drizzle-orm");

await migrate(db, { migrationsFolder: "./drizzle" });
await db.insert(profile).values({
  id: 1,
  fullName: "Demo Candidate",
  email: "demo@example.com",
  phone: "+971 50 000 0000",
  location: "Dubai, United Arab Emirates",
  countryCode: "AE",
  headline: "Frontend / Web3 Engineer",
  summary: "I build fast, accessible trading and wallet interfaces with React, Next.js and TypeScript.",
  yearsExperience: 4,
  targetRoles: ["Frontend Engineer", "Web3 Frontend Engineer"],
  skills: [
    { name: "React", level: 5 },
    { name: "Next.js", level: 5 },
    { name: "TypeScript", level: 4 },
    { name: "JavaScript", level: 5 },
    { name: "Tailwind CSS", level: 5 },
    { name: "Web3.js", level: 4 },
    { name: "Ethers.js", level: 4 },
    { name: "EVM", level: 3 },
  ],
  resumeText: "Built a real-time crypto trading dashboard in React and TypeScript serving 50k users.\nIntegrated Ethers.js wallet connection and token transfers for a DeFi DApp.\nLed migration of a payments dashboard to Next.js and Tailwind CSS.",
});

const restore = installFetchMock();
await syncSources({ force: true, log: console.log });
restore();

const top = await db.select().from(jobs).orderBy(desc(jobs.score)).limit(6);
await prepareApplication(top[0].id);
await prepareApplication(top[1].id);
await setJobStatus(top[2].id, "saved");
await markApplied(top[3].id, "on the company site");
await setJobStatus(top[4].id, "interview");
await logEvent(top[4].id, "note", "Phone screen with the hiring manager on Monday");
console.log("\nDemo data ready. Start it with: pnpm run dev:demo");
