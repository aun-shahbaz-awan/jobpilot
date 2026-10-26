# JobPilot

A personal job-hunting CRM. It pulls jobs from free job-board APIs and company career pages, scores each one against your skills and markets, drafts tailored applications for you to approve, sends the approved ones from your computer, tracks everything in a pipeline, and tells you which skills to learn next to qualify for more of the jobs you want.

Built with Next.js 16, React 19, TypeScript, Tailwind CSS 4, Drizzle ORM and libSQL (SQLite locally, Turso when deployed).

## Quick start (local)

```bash
npm install
cp .env.example .env        # optional: add API keys, SMTP for email applications
npm run setup               # creates the database and a starter profile
npm run dev                 # http://localhost:3000
```

Then:

1. **Profile**: upload your CV (PDF or DOCX), add email and phone, and check your skill levels. Levels drive the match score.
2. Click **Find new jobs** in the sidebar.
3. **Matches**: select good jobs and choose **Draft applications**.
4. **Review**: read and edit each draft, then **Approve**.
5. In a terminal: `npm run apply:install` once, then `npm run apply` whenever you have approved applications.

Want to look around first without touching real data? `npm run demo` then `npm run dev:demo` (port 3001, sample jobs).

## How it works

### Where jobs come from

| Source | What it adds | Limits respected |
| --- | --- | --- |
| Remotive | Remote software jobs | Max one fetch per 6 h, as Remotive asks |
| Remote OK | Remote dev jobs | Every 6 h |
| Himalayas | Remote jobs, searched with your terms | Every 12 h (data refreshes daily); apply links go through Himalayas as its terms require |
| Jobicy | Remote engineering jobs, last 7 days | Every 4 h |
| Arbeitnow | Germany and Europe, including visa-sponsored roles | Every 4 h |
| Greenhouse, Lever, Ashby | Direct company career pages you add to a watchlist | Every 3 h |

Add companies in **Settings → Sources** by slug: `boards.greenhouse.io/<slug>`, `jobs.lever.co/<slug>`, `jobs.ashbyhq.com/<slug>`. A wrong slug shows as "board not found" next to the source. LinkedIn and Indeed aren't scraped: both forbid it and suspend accounts that automate them.

Jobs are de-duplicated across sources, and new jobs scoring under 20 aren't stored, so the database stays focused.

### The match score (free, no AI)

Every job gets a 0 to 100 score with a visible breakdown:

- **Skills (55%)**: about 120 skills are recognised from the posting, split into required and nice-to-have. Your level counts, and related skills give partial credit (Vue counts a little toward React, Ethers.js toward viem).
- **Role (17%)**: title words from Settings → Search.
- **Location (15%)**: can you actually apply? Remote-worldwide and roles open to the UAE score full; Europe-only remote roles score lower (often need EU residency); jobs in a country you added as a market (Germany by default) score well; US-only roles are capped at 35.
- **Seniority (8%)** and **freshness (5%)**.
- Postings that need German (stated, or written in German) are capped at 45 until you add German to your languages.

Edit `src/lib/skills/taxonomy.ts` to add skills or aliases.

### Skill advice

The Skills page looks at every role you could realistically apply for and ranks missing skills by how many jobs each one would push over your threshold (re-scoring them with that skill at a solid level), then by demand and trend. It also shows your strengths that are in demand and coverage by area. With AI on, it can write a learning plan with a portfolio project per skill.

### Applying

Nothing is sent without your approval.

- **Drafts** use AI if it's on and within budget, otherwise a template built from your profile and the skills you share with the job. Every draft is editable.
- **Form applications** (Greenhouse, Lever, Ashby, Workable): `npm run apply` opens a real browser, fills your details, uploads your CV, pastes the cover letter and answers questions from your answer bank. By default it stops so you can check and click Submit; turn on **Let the runner click Submit** in Settings to have it submit forms that are complete and have no CAPTCHA. It never solves CAPTCHAs, never ticks consent boxes, and never makes up answers.
- **Email applications** (when a posting asks you to email a CV) are sent through your SMTP account with your CV attached.
- **Everything else** (job-board pages, unknown sites) lands in "Finish these yourself" with a copy button for the cover letter.

`npm run apply -- --dry` fills forms without submitting or changing anything.

### AI (optional, switchable)

Settings → AI lets you pick **Off**, **Claude**, **OpenAI** or **Ollama** (free, local), and choose a model per task. Defaults are set for the lowest cost:

| Task | Default | Rough cost |
| --- | --- | --- |
| Job review | Claude Haiku 5.5 | ~$0.0005 per job |
| Application writing | Claude Haiku 5.5 (switch to Sonnet 5.5 for better letters) | ~$0.001 (Sonnet ~$0.02) |
| Learning plan, CV reading | Claude Haiku 5.5 | under a cent |

Results are cached, so you never pay twice for the same request, and a monthly budget cap stops paid calls (templates take over). A Claude Pro subscription doesn't include API usage; get an API key at console.anthropic.com.

## Deploying to Netlify (free)

1. Create a free database at [turso.tech](https://turso.tech) and note its URL and token.
2. Point your local `.env` at it (`DATABASE_URL`, `DATABASE_AUTH_TOKEN`) and run `npm run setup` once to create the tables. To keep your local data, export and import it with the Turso CLI.
3. Push the project to GitHub and import it in Netlify. Set environment variables: `DATABASE_URL`, `DATABASE_AUTH_TOKEN`, `APP_PASSWORD` (locks the site), `CRON_SECRET`, plus any AI keys.
4. The included scheduled function (`netlify/functions/scheduled-sync.mts`) syncs the most overdue source every 30 minutes, staying inside Netlify's function time limits.
5. Keep running `npm run apply` on your Mac. With `.env` pointing at Turso, it sends what you approve on the deployed site.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Run the app (creates or updates the database first) |
| `npm run setup` | Create tables and the starter profile |
| `npm run sync` | Fetch jobs from the terminal (add `-- --force` to ignore company-board intervals) |
| `npm run apply` | Send approved applications |
| `npm run apply:install` | Download the browser the runner uses (once) |
| `npm test` | Unit and end-to-end tests with recorded API responses |
| `npm run demo` / `npm run dev:demo` | Explore with sample data on port 3001 |

## Project layout

```
src/app/            pages and server actions
src/components/     UI
src/lib/sources/    one adapter per job source
src/lib/match/      scoring
src/lib/skills/     skill dictionary and extraction
src/lib/ai/         provider-agnostic AI client and prompts
src/lib/insights.ts skill-gap analysis
runner/             the apply runner (Playwright + email)
tests/              tests and recorded API fixtures
```

Job data belongs to each source; listings link back to the original posting as their terms require.
