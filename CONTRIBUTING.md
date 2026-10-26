# Contributing to JobPilot

Thanks for helping. Small, focused pull requests are easiest to review.

## Getting set up

```bash
pnpm install
cp .env.example .env
pnpm run setup
pnpm run dev
```

Before opening a pull request, run:

```bash
pnpm run typecheck
pnpm test
pnpm run build
```

## Good first contributions

- **Skills**: add a skill or alias in `src/lib/skills/taxonomy.ts`. Aliases are matched on word boundaries, so avoid everyday words ("express", "go", "rest") as aliases. Add a test in `tests/core.test.ts` if an alias could be ambiguous.
- **Job sources**: add an adapter in `src/lib/sources/`, register it in `src/lib/sources/index.ts`, and add a recorded response in `tests/fixtures.ts`. Only use public APIs or feeds, respect each source's polling limits and attribution terms, and never scrape sites whose terms forbid it.
- **Applicant tracking systems**: improve form filling in `runner/fill.ts`. The runner must never solve CAPTCHAs, tick consent boxes, or invent answers.
- **Countries**: extend `src/lib/geo.ts` so location rules work for more places.

## Guidelines

- TypeScript strict mode, no `any` in app code.
- Keep the free (no-AI) path working for every feature.
- UI copy is plain and in sentence case; buttons say exactly what they do.
