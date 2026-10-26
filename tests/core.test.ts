import { test } from "node:test";
import assert from "node:assert/strict";
import { extractSkills, htmlToText } from "../src/lib/skills/extract";
import { locationFit, needsGerman, countriesIn, type Market } from "../src/lib/geo";
import { scoreJob, type ScoringProfile } from "../src/lib/match/score";
import { detectAts, findApplyEmail } from "../src/lib/ats";
import { parseSalaryText } from "../src/lib/sources/boards";
import { DEFAULT_SETTINGS } from "../src/lib/settings";

const markets: Market[] = DEFAULT_SETTINGS.search.markets;

const me: ScoringProfile = {
  skills: [
    { name: "React", level: 5 },
    { name: "Next.js", level: 5 },
    { name: "TypeScript", level: 4 },
    { name: "Tailwind CSS", level: 5 },
    { name: "Ethers.js", level: 4 },
  ],
  roleKeywords: DEFAULT_SETTINGS.search.roleKeywords,
  yearsExperience: 4,
  candidateCountry: "AE",
  markets,
  languages: ["English"],
  excludeTitle: DEFAULT_SETTINGS.search.excludeTitle,
  excludeCompanies: [],
  maxAgeDays: 30,
};

test("htmlToText handles Greenhouse's escaped HTML", () => {
  const t = htmlToText("&lt;h2&gt;About&lt;/h2&gt;&lt;ul&gt;&lt;li&gt;React &amp;amp; TypeScript&lt;/li&gt;&lt;/ul&gt;");
  assert.match(t, /About/);
  assert.match(t, /- React & TypeScript/);
});

test("extractSkills separates required and nice-to-have", () => {
  const text = htmlToText(`
    <h3>Requirements</h3><ul><li>4+ years with React and TypeScript</li><li>Experience with REST APIs</li></ul>
    <h3>Nice to have</h3><ul><li>Solidity, wagmi or viem</li></ul>
    <p>Knowledge of GraphQL is a plus.</p>`);
  const { required, nice } = extractSkills(text);
  assert.ok(required.includes("React"));
  assert.ok(required.includes("TypeScript"));
  assert.ok(required.includes("REST APIs"));
  assert.ok(nice.includes("Solidity"));
  assert.ok(nice.includes("wagmi"));
  assert.ok(nice.includes("GraphQL"));
  assert.ok(!required.includes("Solidity"));
});

test("extractSkills avoids common false positives", () => {
  const { required } = extractSkills("We go the extra mile. The rest of the team will react quickly. Java and JavaScript.");
  assert.ok(!required.includes("Go"));
  assert.ok(!required.includes("REST APIs"));
  assert.ok(required.includes("Java"));
  assert.ok(required.includes("JavaScript"));
});

test("location: worldwide remote and region rules for a UAE candidate", () => {
  assert.equal(locationFit({ location: "Worldwide", remote: true, countries: [] }, "AE", markets).eligible, true);
  assert.equal(locationFit({ location: "EMEA", remote: true, countries: [] }, "AE", markets).fit, 0.95);
  assert.equal(locationFit({ location: "USA only", remote: true, countries: ["US"] }, "AE", markets).eligible, false);
  const berlin = locationFit({ location: "Berlin", remote: false, countries: countriesIn("Berlin") }, "AE", markets);
  assert.equal(berlin.eligible, true);
  assert.equal(berlin.market, "de");
  assert.equal(locationFit({ location: "Paris", remote: false, countries: ["FR"] }, "AE", markets).eligible, false);
  assert.equal(locationFit({ location: "Remote (UTC+3 to UTC+5)", remote: true, countries: [] }, "AE", markets).eligible, true);
});

test("German detection", () => {
  assert.equal(needsGerman("Fließende Deutschkenntnisse in Wort und Schrift"), true);
  assert.equal(needsGerman("Fluent German (C1) required"), true);
  assert.equal(needsGerman("We are a Berlin startup. English is our working language."), false);
});

test("a strong frontend match outranks a backend Java role", () => {
  const base = { company: "Acme", location: "Worldwide", remote: true, countries: [], description: "", postedAt: Date.now() };
  const fe = scoreJob({ ...base, title: "Senior Frontend Engineer", skills: ["React", "TypeScript", "Next.js"], niceSkills: ["Solidity"] }, me);
  const be = scoreJob({ ...base, title: "Backend Engineer", skills: ["Java", "Kubernetes", "PostgreSQL"], niceSkills: [] }, me);
  assert.ok(fe.score >= 80, `frontend score ${fe.score}`);
  assert.ok(be.score < 50, `backend score ${be.score}`);
  assert.deepEqual(fe.breakdown.missing, []);
  assert.ok(be.breakdown.missing.includes("Java"));
});

test("related skills give partial credit (Vue vs React)", () => {
  const base = { company: "Acme", location: "Worldwide", remote: true, countries: [], description: "", postedAt: Date.now() };
  const vue = scoreJob({ ...base, title: "Frontend Engineer", skills: ["Vue"], niceSkills: [] }, me);
  assert.ok(vue.breakdown.skills > 20 && vue.breakdown.skills < 80, `vue skills ${vue.breakdown.skills}`);
});

test("excluded titles are hidden; ineligible locations are capped", () => {
  const base = { company: "Acme", location: "Worldwide", remote: true, countries: [], description: "", postedAt: Date.now(), skills: ["React"], niceSkills: [] };
  assert.equal(scoreJob({ ...base, title: "Frontend Intern" }, me).hidden, true);
  const us = scoreJob({ ...base, title: "React Developer", location: "US only", countries: ["US"] }, me);
  assert.ok(us.score <= 35);
});

test("ATS detection and apply email", () => {
  assert.equal(detectAts("https://job-boards.greenhouse.io/acme/jobs/1"), "greenhouse");
  assert.equal(detectAts("https://jobs.lever.co/acme/123/apply"), "lever");
  assert.equal(detectAts("https://jobs.ashbyhq.com/acme/x/application"), "ashby");
  assert.equal(detectAts("https://himalayas.app/companies/x/jobs/y"), "board");
  assert.equal(findApplyEmail("To apply, send your CV to jobs@acme.io"), "jobs@acme.io");
  assert.equal(findApplyEmail("Questions? privacy@acme.io"), null);
});

test("salary text parsing", () => {
  assert.deepEqual(parseSalaryText("$80k - $100k"), { salaryMin: 80000, salaryMax: 100000, salaryCurrency: "USD", salaryPeriod: "annual" });
  assert.equal(parseSalaryText("€60,000–75,000 per year").salaryCurrency, "EUR");
});
