/**
 * Small geography table used to decide whether a job's location restrictions include you.
 * Regions are deliberately broad because job boards use loose labels ("EMEA", "Europe", "GMT+4").
 */
export type Country = {
  code: string;
  name: string;
  aliases: string[];
  cities: string[];
  regions: string[];
  utcOffset: number;
};

export const COUNTRIES: Country[] = [
  { code: "AE", name: "United Arab Emirates", aliases: ["uae", "u.a.e", "emirates"], cities: ["dubai", "abu dhabi", "sharjah"], regions: ["middle east", "mena", "gcc", "emea", "asia", "gulf"], utcOffset: 4 },
  { code: "SA", name: "Saudi Arabia", aliases: ["ksa", "saudi"], cities: ["riyadh", "jeddah"], regions: ["middle east", "mena", "gcc", "emea", "asia", "gulf"], utcOffset: 3 },
  { code: "QA", name: "Qatar", aliases: [], cities: ["doha"], regions: ["middle east", "mena", "gcc", "emea", "asia", "gulf"], utcOffset: 3 },
  { code: "PK", name: "Pakistan", aliases: [], cities: ["karachi", "lahore", "islamabad"], regions: ["asia", "south asia", "apac"], utcOffset: 5 },
  { code: "IN", name: "India", aliases: [], cities: ["bangalore", "bengaluru", "mumbai", "delhi", "hyderabad", "pune"], regions: ["asia", "south asia", "apac"], utcOffset: 5.5 },
  { code: "DE", name: "Germany", aliases: ["deutschland"], cities: ["berlin", "munich", "münchen", "hamburg", "frankfurt", "cologne", "köln", "stuttgart", "düsseldorf", "dusseldorf", "leipzig", "dresden", "hannover", "nuremberg", "nürnberg", "bonn", "karlsruhe"], regions: ["europe", "eu", "european union", "emea", "dach", "cet"], utcOffset: 1 },
  { code: "HU", name: "Hungary", aliases: ["magyarország"], cities: ["budapest", "debrecen"], regions: ["europe", "eu", "european union", "emea", "cet"], utcOffset: 1 },
  { code: "NL", name: "Netherlands", aliases: ["holland", "the netherlands"], cities: ["amsterdam", "rotterdam", "utrecht", "the hague", "eindhoven"], regions: ["europe", "eu", "european union", "emea", "cet", "benelux"], utcOffset: 1 },
  { code: "AT", name: "Austria", aliases: ["österreich"], cities: ["vienna", "wien", "graz"], regions: ["europe", "eu", "european union", "emea", "dach", "cet"], utcOffset: 1 },
  { code: "CH", name: "Switzerland", aliases: ["schweiz"], cities: ["zurich", "zürich", "geneva", "basel", "zug"], regions: ["europe", "emea", "dach", "cet"], utcOffset: 1 },
  { code: "GB", name: "United Kingdom", aliases: ["uk", "u.k.", "england", "great britain", "scotland"], cities: ["london", "manchester", "edinburgh", "bristol"], regions: ["europe", "emea"], utcOffset: 0 },
  { code: "IE", name: "Ireland", aliases: [], cities: ["dublin", "cork"], regions: ["europe", "eu", "european union", "emea"], utcOffset: 0 },
  { code: "FR", name: "France", aliases: [], cities: ["paris", "lyon"], regions: ["europe", "eu", "european union", "emea", "cet"], utcOffset: 1 },
  { code: "ES", name: "Spain", aliases: ["españa"], cities: ["madrid", "barcelona", "valencia"], regions: ["europe", "eu", "european union", "emea", "cet"], utcOffset: 1 },
  { code: "PT", name: "Portugal", aliases: [], cities: ["lisbon", "porto"], regions: ["europe", "eu", "european union", "emea"], utcOffset: 0 },
  { code: "PL", name: "Poland", aliases: ["polska"], cities: ["warsaw", "krakow", "kraków", "wroclaw", "wrocław"], regions: ["europe", "eu", "european union", "emea", "cet"], utcOffset: 1 },
  { code: "CZ", name: "Czechia", aliases: ["czech republic"], cities: ["prague", "brno"], regions: ["europe", "eu", "european union", "emea", "cet"], utcOffset: 1 },
  { code: "SE", name: "Sweden", aliases: [], cities: ["stockholm", "gothenburg"], regions: ["europe", "eu", "european union", "emea", "cet", "nordics"], utcOffset: 1 },
  { code: "DK", name: "Denmark", aliases: [], cities: ["copenhagen"], regions: ["europe", "eu", "european union", "emea", "cet", "nordics"], utcOffset: 1 },
  { code: "FI", name: "Finland", aliases: [], cities: ["helsinki"], regions: ["europe", "eu", "european union", "emea", "nordics"], utcOffset: 2 },
  { code: "NO", name: "Norway", aliases: [], cities: ["oslo"], regions: ["europe", "emea", "nordics", "cet"], utcOffset: 1 },
  { code: "EE", name: "Estonia", aliases: [], cities: ["tallinn"], regions: ["europe", "eu", "european union", "emea"], utcOffset: 2 },
  { code: "LT", name: "Lithuania", aliases: [], cities: ["vilnius"], regions: ["europe", "eu", "european union", "emea"], utcOffset: 2 },
  { code: "RO", name: "Romania", aliases: [], cities: ["bucharest", "cluj"], regions: ["europe", "eu", "european union", "emea"], utcOffset: 2 },
  { code: "CY", name: "Cyprus", aliases: [], cities: ["limassol", "nicosia"], regions: ["europe", "eu", "european union", "emea"], utcOffset: 2 },
  { code: "MT", name: "Malta", aliases: [], cities: ["valletta"], regions: ["europe", "eu", "european union", "emea"], utcOffset: 1 },
  { code: "TR", name: "Türkiye", aliases: ["turkey", "turkiye"], cities: ["istanbul", "ankara"], regions: ["europe", "emea", "asia"], utcOffset: 3 },
  { code: "SG", name: "Singapore", aliases: [], cities: [], regions: ["asia", "apac", "southeast asia"], utcOffset: 8 },
  { code: "US", name: "United States", aliases: ["usa", "u.s.", "u.s.a", "united states of america", "us only", "us-only", "us based", "us-based"], cities: ["new york", "san francisco", "seattle", "austin", "boston", "los angeles", "chicago"], regions: ["americas", "north america", "na"], utcOffset: -5 },
  { code: "CA", name: "Canada", aliases: [], cities: ["toronto", "vancouver", "montreal"], regions: ["americas", "north america", "na"], utcOffset: -5 },
  { code: "BR", name: "Brazil", aliases: ["brasil"], cities: ["são paulo", "sao paulo"], regions: ["americas", "latam", "south america"], utcOffset: -3 },
  { code: "MX", name: "Mexico", aliases: ["méxico"], cities: ["mexico city"], regions: ["americas", "latam", "north america"], utcOffset: -6 },
  { code: "AU", name: "Australia", aliases: [], cities: ["sydney", "melbourne"], regions: ["apac", "oceania"], utcOffset: 10 },
];

export const COUNTRY_BY_CODE = new Map(COUNTRIES.map((c) => [c.code, c]));

const WORLDWIDE = /\b(worldwide|anywhere|global(ly)?|international|all countries|any location|remote[- ]first|work from anywhere)\b/i;

function words(country: Country) {
  return [country.name.toLowerCase(), ...country.aliases, ...country.cities, country.code.toLowerCase()];
}

function mentions(text: string, token: string) {
  if (token.length <= 2) return new RegExp(`(^|[^a-z])${token}([^a-z]|$)`).test(text);
  return text.includes(token);
}

/** Country codes a free-text location mentions ("Berlin, Germany" -> ["DE"]). */
export function countriesIn(location: string): string[] {
  const text = ` ${location.toLowerCase()} `;
  const found: string[] = [];
  for (const c of COUNTRIES) {
    const tokens = [c.name.toLowerCase(), ...c.aliases, ...c.cities];
    if (tokens.some((t) => mentions(text, t))) found.push(c.code);
  }
  return found;
}

export type Market = {
  id: string;
  label: string;
  /** "remote" = remote jobs open to you; "country" = jobs located in that country (on-site, hybrid or remote). */
  kind: "remote" | "country";
  countryCode?: string;
  enabled: boolean;
};

export type LocationFit = {
  /** 0..1 */
  fit: number;
  eligible: boolean;
  reason: string;
  market?: string;
};

type JobLocation = { location: string; remote: boolean; countries: string[] };

/**
 * Decides whether a job's location works for you.
 * - Remote and open worldwide, or open to your country or region: full fit.
 * - Remote but limited to a broad region you are outside of (e.g. "Europe"): partial fit.
 * - Located in a country you added as a market (e.g. Germany): good fit, since you plan to relocate.
 * - Anything else: not eligible.
 */
export function locationFit(job: JobLocation, candidateCountry: string, markets: Market[]): LocationFit {
  const active = markets.filter((m) => m.enabled);
  const home = COUNTRY_BY_CODE.get(candidateCountry);
  const loc = job.location.toLowerCase().trim();
  const listed = new Set(job.countries.length ? job.countries : countriesIn(loc));

  // Country markets: jobs physically in a country you want to work in.
  for (const m of active) {
    if (m.kind !== "country" || !m.countryCode) continue;
    if (listed.has(m.countryCode)) {
      return { fit: m.countryCode === candidateCountry ? 1 : 0.85, eligible: true, reason: `In ${m.label}`, market: m.id };
    }
  }

  const remoteMarket = active.find((m) => m.kind === "remote");
  if (!job.remote || !remoteMarket) {
    if (home && listed.has(home.code)) return { fit: 1, eligible: true, reason: `In ${home.name}` };
    return { fit: 0.1, eligible: false, reason: job.remote ? "Remote jobs are turned off in your markets" : "On-site outside your markets" };
  }

  // Remote job: who can apply?
  if (listed.size === 0 && (!loc || loc === "remote" || WORLDWIDE.test(loc))) {
    return { fit: 1, eligible: true, reason: "Remote, open worldwide", market: remoteMarket.id };
  }
  if (home && listed.has(home.code)) return { fit: 1, eligible: true, reason: `Remote, open to ${home.name}`, market: remoteMarket.id };
  if (home && home.regions.some((r) => mentions(` ${loc} `, r))) {
    return { fit: 0.95, eligible: true, reason: "Remote, your region is included", market: remoteMarket.id };
  }
  const offset = loc.match(/(?:gmt|utc)\s*([+-]\s*\d{1,2})/);
  if (home && offset && Math.abs(Number(offset[1].replace(/\s/g, "")) - home.utcOffset) <= 2) {
    return { fit: 0.9, eligible: true, reason: "Remote, time zone fits", market: remoteMarket.id };
  }
  if (/\b(europe|eu|emea|cet)\b/.test(loc) || [...listed].some((c) => COUNTRY_BY_CODE.get(c)?.regions.includes("europe"))) {
    return { fit: 0.45, eligible: true, reason: "Remote within Europe; may need EU residency", market: remoteMarket.id };
  }
  if (listed.size === 0 && !/\b(us|usa|united states|americas|north america|canada|latam|uk|australia|apac|asia)\b/.test(loc)) {
    return { fit: 0.7, eligible: true, reason: `Remote (${job.location || "location unclear"})`, market: remoteMarket.id };
  }
  return { fit: 0.1, eligible: false, reason: `Remote, limited to ${job.location || [...listed].join(", ")}` };
}

const GERMAN_REQUIRED =
  /(fließend(e)? deutsch|deutschkenntnisse|sehr gute deutsch|verhandlungssicher(e)? deutsch|fluent (in )?german|german (is )?(required|mandatory)|business[- ]level german|german \(c1|german \(b2|german c1|german b2|native german)/i;
const GERMAN_STOPWORDS = /\b(und|wir|sie|für|mit|eine|der|die|das|ist|nicht|auf|bei|unsere?|deine?|ihre?)\b/gi;

/** Detects postings that need German, either stated or because the ad itself is written in German. */
export function needsGerman(text: string): boolean {
  if (GERMAN_REQUIRED.test(text)) return true;
  const sample = text.slice(0, 3000);
  const hits = sample.match(GERMAN_STOPWORDS)?.length ?? 0;
  const wordsCount = sample.split(/\s+/).length || 1;
  return hits / wordsCount > 0.06;
}

export function wordsForCountry(code: string): string[] {
  const c = COUNTRY_BY_CODE.get(code);
  return c ? words(c) : [];
}
