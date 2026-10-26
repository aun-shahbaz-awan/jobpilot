import { SKILLS, type SkillDef } from "./taxonomy";

const ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&apos;": "'",
  "&nbsp;": " ",
  "&rsquo;": "'",
  "&lsquo;": "'",
  "&rdquo;": '"',
  "&ldquo;": '"',
  "&ndash;": "-",
  "&mdash;": "-",
  "&hellip;": "...",
  "&bull;": "-",
};

export function decodeEntities(s: string): string {
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&[a-z]+;/gi, (m) => ENTITIES[m.toLowerCase()] ?? m);
}

/** Converts job-board HTML (sometimes double-escaped) into readable plain text with line breaks. */
export function htmlToText(input: string): string {
  if (!input) return "";
  let s = input;
  if (/&lt;\/?[a-z]/i.test(s)) s = decodeEntities(s); // Greenhouse escapes its HTML
  s = s
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, "")
    .replace(/<\s*br\s*\/?>/gi, "\n")
    .replace(/<\s*li[^>]*>/gi, "\n- ")
    .replace(/<\/\s*li\s*>/gi, "")
    .replace(/<\/\s*(p|div|h[1-6]|ul|ol|tr|section)\s*>/gi, "\n")
    .replace(/<\s*(h[1-6])[^>]*>/gi, "\n\n")
    .replace(/<[^>]+>/g, "");
  s = decodeEntities(s);
  return s
    .replace(/\r/g, "")
    .replace(/[ \t ]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

type Matcher = { skill: SkillDef; re: RegExp };

const MATCHERS: Matcher[] = SKILLS.map((skill) => {
  // Only aliases are matched; display names like "Go" or "Payments" are too ambiguous in prose.
  const parts = [...new Set(skill.aliases)]
    .sort((a, b) => b.length - a.length)
    .map(escapeRegex);
  // Word-ish boundaries that also work for names like "c#", ".net", "next.js".
  return { skill, re: new RegExp(`(?<![a-z0-9])(?:${parts.join("|")})(?![a-z0-9#+])`, "i") };
});

const NICE_HEADING =
  /(nice[- ]to[- ]have|bonus|preferred|good[- ]to[- ]have|would be (great|a plus|nice)|plus points|extra credit|not required|pluses|desirable|optional)/i;
const REQUIRED_HEADING =
  /(requirement|qualifications|what you('ll)? (need|bring)|must[- ]have|you have|you bring|who you are|skills|experience|about you|tech stack|our stack|tools)/i;
const NICE_INLINE = /(is a (big )?plus|are a plus|a bonus|nice to have|is preferred|are preferred|would be a plus|bonus points|is an advantage|advantageous)/i;

export type ExtractedSkills = { required: string[]; nice: string[] };

/**
 * Finds known skills in a job's text. Skills that only appear in "nice to have" sections or
 * sentences are returned separately so they weigh less in the score.
 */
export function extractSkills(text: string, extraTags: string[] = []): ExtractedSkills {
  const required = new Set<string>();
  const nice = new Set<string>();
  const lines = text.split(/\n+/);
  let inNice = false;

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    const isHeading = line.length < 80 && !/^[-*•]/.test(line) && !/[.!?]$/.test(line);
    if (isHeading) {
      if (NICE_HEADING.test(line)) inNice = true;
      else if (REQUIRED_HEADING.test(line)) inNice = false;
    }
    const sentenceNice = NICE_INLINE.test(line);
    for (const { skill, re } of MATCHERS) {
      if (re.test(line)) {
        if (inNice || sentenceNice) nice.add(skill.name);
        else required.add(skill.name);
      }
    }
  }

  for (const tag of extraTags) {
    for (const { skill, re } of MATCHERS) if (re.test(tag)) required.add(skill.name);
  }

  // A skill listed both as required and as nice-to-have counts as required.
  for (const r of required) nice.delete(r);
  return { required: [...required], nice: [...nice] };
}
