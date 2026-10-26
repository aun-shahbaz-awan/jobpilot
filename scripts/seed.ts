import "dotenv/config";
import { eq } from "drizzle-orm";
import { db } from "../src/lib/db";
import { profile } from "../src/lib/db/schema";

const [existing] = await db.select().from(profile).where(eq(profile.id, 1));
if (existing && existing.fullName) {
  console.log("Profile already set up; leaving it unchanged.");
  process.exit(0);
}

// Starting profile from what you've shared. Edit everything in the Profile page.
const starter = {
    fullName: "Aun Shahbaz Awan",
    location: "Dubai, United Arab Emirates",
    countryCode: "AE",
    headline: "Frontend / Web3 Engineer",
    summary:
      "Frontend and Web3 engineer with 4+ years building fintech and crypto products: trading dashboards, payment-provider interfaces and DApps, mostly with React, Next.js and TypeScript.",
    yearsExperience: 4,
    targetRoles: ["Frontend Engineer", "React Developer", "Web3 Frontend Engineer", "Full Stack Engineer"],
    skills: [
      { name: "React", level: 5 },
      { name: "Next.js", level: 5 },
      { name: "TypeScript", level: 4 },
      { name: "JavaScript", level: 5 },
      { name: "Tailwind CSS", level: 5 },
      { name: "HTML", level: 5 },
      { name: "CSS", level: 4 },
      { name: "Web3.js", level: 4 },
      { name: "Ethers.js", level: 4 },
      { name: "EVM", level: 3 },
      { name: "Crypto trading", level: 3 },
      { name: "Payments", level: 3 },
      { name: "Fintech", level: 3 },
      { name: "Git", level: 4 },
    ],
    answers: [
      { question: "Are you legally authorized to work in this country?", answer: "" },
      { question: "Will you now or in the future require visa sponsorship?", answer: "" },
      { question: "What are your salary expectations?", answer: "" },
      { question: "What is your notice period?", answer: "" },
      { question: "Are you willing to relocate?", answer: "" },
      { question: "How did you hear about this job?", answer: "Company careers page" },
    ],
};

await db
  .insert(profile)
  .values({ id: 1, ...starter })
  .onConflictDoUpdate({ target: profile.id, set: starter });

console.log("Starter profile created. Add your email, phone, CV and links in the Profile page.");
