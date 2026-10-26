/**
 * Fake API payloads in each source's real response shape. Companies and text are invented.
 * Used by tests and by `npm run demo` to try the app without network access.
 */
const day = 86_400_000;
const now = Date.now();
const iso = (daysAgo: number) => new Date(now - daysAgo * day).toISOString();
const unix = (daysAgo: number) => Math.floor((now - daysAgo * day) / 1000);

const fe = (extra = "") => `<h3>About the role</h3><p>You'll own our trading web app end to end.</p>
<h3>Requirements</h3><ul><li>4+ years building production apps with React and TypeScript</li><li>Experience with Next.js and Tailwind CSS</li><li>Comfortable with REST APIs and WebSockets for real-time market data</li>${extra}</ul>
<h3>Nice to have</h3><ul><li>wagmi or viem</li><li>Playwright or Cypress</li></ul>`;

export const FIXTURES: Record<string, unknown> = {
  "https://remotive.com/api/remote-jobs?category=software-dev": {
    jobs: [
      { id: 9001, url: "https://remotive.com/remote-jobs/software-dev/senior-frontend-engineer-9001", title: "Senior Frontend Engineer (React)", company_name: "Orbit Exchange", category: "Software Development", tags: ["react", "typescript"], job_type: "full_time", publication_date: iso(1), candidate_required_location: "Worldwide", salary: "$70k - $95k", description: fe() },
      { id: 9002, url: "https://remotive.com/remote-jobs/software-dev/backend-engineer-go-9002", title: "Backend Engineer (Go)", company_name: "Ledgerline", category: "Software Development", tags: ["golang", "kubernetes"], job_type: "full_time", publication_date: iso(2), candidate_required_location: "Europe", description: "<h3>Requirements</h3><ul><li>Golang in production</li><li>Kubernetes, PostgreSQL, Kafka</li></ul>" },
      { id: 9003, url: "https://remotive.com/remote-jobs/software-dev/react-developer-us-9003", title: "React Developer", company_name: "Brightpath Health", category: "Software Development", tags: ["react"], job_type: "full_time", publication_date: iso(3), candidate_required_location: "USA Only", description: fe() },
    ],
  },
  "https://remoteok.com/api": [
    { last_updated: unix(0), legal: "Remote OK terms" },
    { id: "77001", epoch: unix(0.5), company: "Nodewave", position: "Web3 Frontend Developer", tags: ["dev", "web3", "react", "typescript"], description: fe("<li>Ethers.js or viem, wallet integration with WalletConnect</li><li>Solidity basics</li>"), location: "Worldwide", salary_min: 80000, salary_max: 110000, apply_url: "https://remoteok.com/remote-jobs/77001", url: "https://remoteok.com/remote-jobs/77001" },
    { id: "77002", epoch: unix(4), company: "Copyhouse", position: "Content Marketing Manager", tags: ["marketing"], description: "<p>SEO and content.</p>", location: "Worldwide", url: "https://remoteok.com/remote-jobs/77002" },
  ],
  "https://jobicy.com/api/jobs?count=200&industry=engineering": {
    jobs: [
      { id: 55001, url: "https://jobicy.com/jobs/55001-full-stack", jobTitle: "Full Stack Engineer (Next.js / Node.js)", companyName: "Quanta Pay", jobIndustry: ["Software Engineering"], jobType: ["Full-Time"], jobGeo: "EMEA", jobLevel: "Midweight", jobDescription: "<h3>What you'll need</h3><ul><li>Next.js, React, TypeScript</li><li>Node.js and PostgreSQL with Prisma</li><li>Docker, AWS</li><li>Payment gateway integrations (Stripe)</li></ul>", pubDate: iso(1), salaryMin: 60000, salaryMax: 80000, salaryCurrency: "EUR", salaryPeriod: "yearly" },
      { id: 55002, url: "https://jobicy.com/jobs/55002-lead", jobTitle: "Lead Frontend Engineer", companyName: "Fable Analytics", jobIndustry: ["Software Engineering"], jobType: ["Full-Time"], jobGeo: "Anywhere", jobLevel: "Senior", jobDescription: fe("<li>Data visualization with D3.js</li><li>GraphQL with Apollo</li><li>Design systems and Storybook</li>"), pubDate: iso(6) },
    ],
    nextCursor: null,
  },
  "https://www.arbeitnow.com/api/job-board-api?page=1": {
    data: [
      { slug: "frontend-entwickler-berlin-1", company_name: "Spreetech GmbH", title: "Frontend Entwickler (m/w/d) React", description: "<p>Wir suchen dich! Du hast Erfahrung mit React und TypeScript. Fließende Deutschkenntnisse sind für die Zusammenarbeit mit unseren Kunden wichtig und wir bieten eine tolle Arbeit für dich.</p>", remote: false, url: "https://www.arbeitnow.com/jobs/1", tags: ["IT"], job_types: ["full time"], location: "Berlin", created_at: unix(2) },
      { slug: "react-engineer-munich-2", company_name: "Alpenstack", title: "React Engineer", description: "<h3>Your profile</h3><ul><li>3+ years React, TypeScript, Redux</li><li>Testing with Jest and React Testing Library</li><li>English is our working language; German is not required</li></ul><p>We sponsor visas and support relocation to Munich.</p>", remote: false, url: "https://www.arbeitnow.com/jobs/2", tags: ["IT", "visa sponsorship"], job_types: ["full time"], location: "München", created_at: unix(1) },
      { slug: "nageldesigner-3", company_name: "Studio Nord", title: "Nageldesigner*in", description: "<p>Kosmetik</p>", remote: false, url: "https://www.arbeitnow.com/jobs/3", tags: ["Beauty"], job_types: ["part time"], location: "Hamburg", created_at: unix(1) },
    ],
  },
  "https://www.arbeitnow.com/api/job-board-api?page=2": { data: [] },
  "https://boards-api.greenhouse.io/v1/boards/coinbase/jobs?content=true": {
    jobs: [
      { id: 4100001, title: "Senior Software Engineer, Frontend (Wallet)", absolute_url: "https://www.coinbase.com/careers/positions/4100001", location: { name: "Remote - EMEA" }, first_published: iso(2), content: "&lt;h3&gt;What you'll be doing&lt;/h3&gt;&lt;ul&gt;&lt;li&gt;Build our self-custody wallet in React and TypeScript&lt;/li&gt;&lt;li&gt;Work with EVM chains, ethers.js and account abstraction&lt;/li&gt;&lt;/ul&gt;&lt;h3&gt;Nice to haves&lt;/h3&gt;&lt;ul&gt;&lt;li&gt;React Native&lt;/li&gt;&lt;/ul&gt;", company_name: "Coinbase" },
      { id: 4100002, title: "Staff Data Engineer", absolute_url: "https://www.coinbase.com/careers/positions/4100002", location: { name: "Remote - USA" }, first_published: iso(3), content: "&lt;p&gt;Spark, Airflow, Snowflake&lt;/p&gt;", company_name: "Coinbase" },
    ],
  },
  "https://api.lever.co/v0/postings/binance?mode=json": [
    { id: "a1b2c3", text: "Frontend Developer - Trading Platform", categories: { commitment: "Full-time", location: "Dubai", allLocations: ["Dubai", "Remote"] }, country: "AE", workplaceType: "hybrid", hostedUrl: "https://jobs.lever.co/binance/a1b2c3", applyUrl: "https://jobs.lever.co/binance/a1b2c3/apply", description: "<p>Build the trading UI used by millions.</p>", lists: [{ text: "Requirements", content: "<li>React, TypeScript, Redux</li><li>WebSockets, TradingView charts</li><li>Web performance optimization</li>" }], additionalPlain: "", createdAt: now - 1 * day },
  ],
  "https://api.ashbyhq.com/posting-api/job-board/linear?includeCompensation=true": {
    jobs: [
      { id: "lin-1", title: "Senior Product Engineer, Web", location: "Europe", secondaryLocations: [], isRemote: true, workplaceType: "Remote", employmentType: "FullTime", publishedAt: iso(5), jobUrl: "https://jobs.ashbyhq.com/linear/lin-1", applyUrl: "https://jobs.ashbyhq.com/linear/lin-1/application", descriptionHtml: "<h3>You have</h3><ul><li>Deep React and TypeScript experience</li><li>Performance and real-time sync</li><li>GraphQL</li></ul>", address: { postalAddress: { addressCountry: "European Union" } } },
    ],
  },
};

/** Mocks global fetch with the fixtures above. Unknown URLs return an empty list. */
export function installFetchMock() {
  const original = globalThis.fetch;
  globalThis.fetch = (async (input: string | URL | Request) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    const body = FIXTURES[url];
    if (body === undefined) {
      if (url.includes("himalayas.app")) return new Response(JSON.stringify({ jobs: [] }), { status: 200 });
      if (url.includes("arbeitnow")) return new Response(JSON.stringify({ data: [] }), { status: 200 });
      if (/greenhouse|lever|ashby/.test(url)) return new Response("Not found", { status: 404 });
      return new Response(JSON.stringify({ jobs: [] }), { status: 200 });
    }
    return new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } });
  }) as typeof fetch;
  return () => {
    globalThis.fetch = original;
  };
}
