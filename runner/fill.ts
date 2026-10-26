import type { Page } from "playwright";
import type { Application, Job, Profile } from "../src/lib/db/schema";
import { firstLastName } from "../src/lib/profile";
import { answerFromBank } from "../src/lib/templates";

export type Field = {
  idx: number;
  tag: "input" | "textarea" | "select";
  type: string;
  label: string;
  required: boolean;
  value: string;
  options: string[];
};

export type FillReport = {
  filled: string[];
  unanswered: string[];
  uncheckedRequired: string[];
  captcha: boolean;
  resumeUploaded: boolean;
};

const CAPTCHA = 'iframe[src*="recaptcha"], iframe[src*="hcaptcha"], iframe[src*="turnstile"], .g-recaptcha, .h-captcha, .cf-turnstile, iframe[title*="captcha" i]';

/**
 * Lists fillable fields with a readable label for each, tagging them so they can be targeted later.
 * Written as a plain string so the TypeScript runner doesn't inject helpers the page lacks.
 */
const SCAN_SCRIPT = `(() => {
  const out = [];
  const clean = (s) => (s || "").replace(/\\s+/g, " ").trim();
  const els = Array.from(document.querySelectorAll("input, textarea, select"));
  let i = 0;
  for (const el of els) {
    const type = (el.getAttribute("type") || el.tagName.toLowerCase()).toLowerCase();
    if (["hidden", "submit", "button", "reset", "image", "search"].includes(type)) continue;
    const style = window.getComputedStyle(el);
    const visible = el.offsetParent !== null || style.position === "fixed";
    if (!visible && type !== "file") continue;
    let label = "";
    if (el.labels && el.labels.length) label = clean(el.labels[0].innerText);
    if (!label) label = clean(el.getAttribute("aria-label"));
    if (!label && el.getAttribute("aria-labelledby")) {
      label = clean(el.getAttribute("aria-labelledby").split(" ").map((id) => (document.getElementById(id) || {}).innerText || "").join(" "));
    }
    if (!label) {
      const wrap = el.closest("label, fieldset, .field, .application-question, [class*='question'], [class*='Field'], li, .form-group");
      if (wrap) label = clean(wrap.innerText).slice(0, 200);
    }
    if (!label) label = clean(el.getAttribute("placeholder")) || clean(el.getAttribute("name"));
    const required = el.required || el.getAttribute("aria-required") === "true" || /[*✱]\\s*$/.test(label);
    el.setAttribute("data-jp-idx", String(i));
    out.push({
      idx: i,
      tag: el.tagName.toLowerCase(),
      type,
      label: label.replace(/[*✱]\\s*$/, "").trim(),
      required,
      value: type === "checkbox" || type === "radio" ? String(el.checked) : el.value,
      options: el.tagName === "SELECT" ? Array.from(el.options).map((o) => clean(o.textContent)) : [],
    });
    i++;
  }
  return out;
})()`;

export async function scanFields(page: Page): Promise<Field[]> {
  return (await page.evaluate(SCAN_SCRIPT)) as Field[];
}

function valueFor(label: string, job: Job, app: Application, p: Profile): string | null {
  const l = label.toLowerCase();
  const { first, last } = firstLastName(p.fullName);
  if (/first\s*name|given name|vorname/.test(l)) return first;
  if (/last\s*name|surname|family name|nachname/.test(l)) return last;
  if (/^(full\s*)?name\b|your name|legal name/.test(l) && !/company|preferred|pronoun/.test(l)) return p.fullName;
  if (/e-?mail/.test(l) && !/confirm/.test(l)) return p.email;
  if (/confirm.*e-?mail/.test(l)) return p.email;
  if (/phone|mobile|telefon/.test(l)) return p.phone;
  if (/linkedin/.test(l)) return p.linkedin || null;
  if (/github/.test(l)) return p.github || null;
  if (/portfolio|website|personal site|other website/.test(l)) return p.portfolio || p.github || null;
  if (/^(current )?location|city|where are you (located|based)|country of residence/.test(l)) return p.location || null;
  if (/cover letter|additional information|anything else|why .*(join|work|interested)|motivation/.test(l)) return app.coverLetter;
  // Answers written for this application, matched loosely by question text.
  for (const [q, a] of Object.entries(app.answers)) {
    if (a && (q.toLowerCase() === l || l.includes(q.toLowerCase()) || q.toLowerCase().includes(l))) return a;
  }
  const bank = answerFromBank(label, p);
  return bank || null;
}

function pickOption(options: string[], answer: string): string | null {
  const a = answer.toLowerCase().trim();
  if (!a) return null;
  const yes = /^(yes|y|true|i am|i do)\b/.test(a);
  const no = /^(no|n|false|i am not|i do not)\b/.test(a);
  for (const o of options) {
    const ol = o.toLowerCase();
    if (!ol || /select|choose|--/.test(ol)) continue;
    if (ol === a || ol.includes(a) || a.includes(ol)) return o;
    if (yes && /^yes\b/.test(ol)) return o;
    if (no && /^no\b/.test(ol)) return o;
  }
  return null;
}

/** Fills every field it can answer truthfully from your profile and the approved draft. */
export async function fillForm(page: Page, job: Job, app: Application, p: Profile, resumePath: string | null): Promise<FillReport> {
  const report: FillReport = { filled: [], unanswered: [], uncheckedRequired: [], captcha: false, resumeUploaded: false };

  // Some forms hide the cover-letter textarea behind an "Enter manually" toggle.
  const manual = page.getByRole("button", { name: /enter manually|paste|type it/i });
  if (await manual.count().catch(() => 0)) await manual.first().click().catch(() => {});

  const fields = await scanFields(page);
  for (const f of fields) {
    const loc = page.locator(`[data-jp-idx="${f.idx}"]`);
    try {
      if (f.type === "file") {
        if (!resumePath) continue;
        const isCover = /cover/i.test(f.label);
        const isResume = /resume|cv|lebenslauf/i.test(f.label) || (!report.resumeUploaded && !isCover);
        if (isResume && !report.resumeUploaded) {
          await loc.setInputFiles(resumePath);
          report.resumeUploaded = true;
          report.filled.push("Resume");
          await page.waitForTimeout(1500); // some forms parse the CV and prefill fields
        }
        continue;
      }
      if (f.type === "checkbox" || f.type === "radio") {
        if (f.required && f.value !== "true") report.uncheckedRequired.push(f.label || "A required checkbox");
        continue;
      }
      if (f.value && f.value.trim()) continue; // already filled, e.g. by CV parsing
      const v = valueFor(f.label, job, app, p);
      if (!v) {
        if (f.required) report.unanswered.push(f.label || "Unlabelled required field");
        continue;
      }
      if (f.tag === "select") {
        const opt = pickOption(f.options, v);
        if (opt) {
          await loc.selectOption({ label: opt });
          report.filled.push(f.label);
        } else if (f.required) report.unanswered.push(f.label);
        continue;
      }
      await loc.fill(v);
      report.filled.push(f.label);
    } catch {
      if (f.required) report.unanswered.push(f.label);
    }
  }

  // Required radio groups (e.g. sponsorship yes/no) that are still unanswered.
  const radioGroups = (await page.evaluate(`(() => {
    const names = new Set();
    document.querySelectorAll('input[type="radio"][required], [role="radiogroup"][aria-required="true"] input[type="radio"]').forEach((r) => names.add(r.name));
    return [...names].filter((n) => n && !document.querySelector('input[type="radio"][name="' + CSS.escape(n) + '"]:checked'));
  })()`)) as string[];
  report.unanswered.push(...radioGroups.map((n) => `Choice: ${n}`));
  report.uncheckedRequired = report.uncheckedRequired.filter((l, i, a) => a.indexOf(l) === i);
  report.captcha = (await page.locator(CAPTCHA).count().catch(() => 0)) > 0;
  return report;
}

export async function clickSubmit(page: Page): Promise<boolean> {
  const candidates = [
    page.getByRole("button", { name: /submit application|submit your application|send application|apply now|submit/i }),
    page.locator('button[type="submit"], input[type="submit"]'),
  ];
  for (const c of candidates) {
    if (await c.count().catch(() => 0)) {
      await c.first().click();
      return true;
    }
  }
  return false;
}

export async function looksSubmitted(page: Page): Promise<boolean> {
  const text = (await page.locator("body").innerText().catch(() => "")).toLowerCase();
  return /thank(s| you) for (applying|your application|your interest)|application (has been )?(received|submitted)|we('ve| have) received your application|successfully submitted/.test(text);
}
