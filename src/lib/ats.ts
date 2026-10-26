export type Ats =
  | "greenhouse"
  | "lever"
  | "ashby"
  | "workable"
  | "smartrecruiters"
  | "personio"
  | "recruitee"
  | "teamtailor"
  | "bamboohr"
  | "linkedin"
  | "board"
  | "email"
  | "unknown";

export const ATS_LABEL: Record<Ats, string> = {
  greenhouse: "Greenhouse",
  lever: "Lever",
  ashby: "Ashby",
  workable: "Workable",
  smartrecruiters: "SmartRecruiters",
  personio: "Personio",
  recruitee: "Recruitee",
  teamtailor: "Teamtailor",
  bamboohr: "BambooHR",
  linkedin: "LinkedIn",
  board: "Job board page",
  email: "Email",
  unknown: "Company site",
};

/** Forms the apply runner can fill on its own. Everything else opens for you to finish. */
export const AUTOFILL_ATS: Ats[] = ["greenhouse", "lever", "ashby", "workable"];

export function detectAts(url: string): Ats {
  const u = url.toLowerCase();
  if (u.startsWith("mailto:")) return "email";
  if (u.includes("greenhouse.io") || u.includes("gh_jid=")) return "greenhouse";
  if (u.includes("jobs.lever.co")) return "lever";
  if (u.includes("ashbyhq.com")) return "ashby";
  if (u.includes("workable.com")) return "workable";
  if (u.includes("smartrecruiters.com")) return "smartrecruiters";
  if (u.includes("jobs.personio")) return "personio";
  if (u.includes("recruitee.com")) return "recruitee";
  if (u.includes("teamtailor.com")) return "teamtailor";
  if (u.includes("bamboohr.com")) return "bamboohr";
  if (u.includes("linkedin.com")) return "linkedin";
  if (/remotive\.com|remoteok\.com|himalayas\.app|jobicy\.com|arbeitnow\.com/.test(u)) return "board";
  return "unknown";
}

const EMAIL = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi;
const APPLY_HINT = /(apply|application|send (us )?your (cv|resume)|cv to|resume to|bewerbung)/i;

/** Finds an application email in a job description, if the posting asks for one. */
export function findApplyEmail(text: string): string | null {
  for (const line of text.split(/\n+/)) {
    if (!APPLY_HINT.test(line)) continue;
    const m = line.match(EMAIL);
    if (m) {
      const email = m.find((e) => !/^(no-?reply|privacy|gdpr|dpo|legal)@/i.test(e));
      if (email) return email.toLowerCase();
    }
  }
  return null;
}
