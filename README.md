# GCC Atlas

Evidence-backed research for multinationals planning their first Global Capability Centre (GCC) in India. MVP built for the Flexiple Product Intern assignment.

Discover existing GCCs, compare Bengaluru / Hyderabad / Pune / Chennai, and check the source behind every fact.

**Stack:** Next.js 16 (App Router, Cache Components), TypeScript, Tailwind CSS v4, Recharts, local JSON seed data. No database, no secrets required.

## Run locally

Requires Node.js 20.9+ (tested on 22).

```bash
npm install
npm run dev          # http://localhost:3000
```

Other scripts:

```bash
npm run validate:data  # referential-integrity check of the seed data (also runs before build)
npm run typecheck
npm run lint
npm run build && npm start   # production build on :3000
```

## What is in the app

| Page | Route | Notes |
|---|---|---|
| Dashboard | `/` | NASSCOM–Zinnov FY2026 metrics (each with source + seal), city leasing-share chart, maturity mix, recent company activity (source dates only), data coverage and known gaps |
| GCC Explorer | `/explorer`, `/explorer/[id]` | Search by name; filter by city, industry, function, stage; filters live in the URL. Profiles show parent, India locations, evidence, caveats |
| Location Compare | `/compare` | Pick cities and criteria. Missing data is shown as **Data unavailable** with what to validate. Shortlist saved in the browser (localStorage) |
| Evidence Inspector | `/evidence?id=EV-001` | Source title, clickable URL, publication date, last-verified date, supporting text, corroboration |
| AI Research Assistant | `/assistant` | Deterministic retrieval with `[n]` citations that open the real source, and an explicit **Missing evidence** block |

## Data rules and verification seals

Every record points to a source in `src/data/sources.json` (URL, title, publisher, publication date, last-verified date).

- **Verified**: checked against the cited page on the last-verified date, source is a primary publisher or established outlet. A "single source" flag shows when only one source backs it.
- **Estimated**: secondhand or derived figure, not traced to the original publication.
- **Unverified**: found in a credible-looking source but not validated against official text. A lead, not a fact.
- **Illustrative**: placeholder, not real data. None ship in the seed set; the schema and UI support it.

What is deliberately **not** in the data: operating costs (no comparable cited source), a city ranking, incentive amounts beyond what a source states, customer testimonials, traction, or live news. Incentive amounts for Karnataka, Telangana and Tamil Nadu are **unverified** because official policy text was not located (Tamil Nadu's state agency page confirms a payroll scheme exists but gives no amounts); Maharashtra's comes from the official Government Resolution (3 Nov 2025). The 11 company records are a curated sample, not a census of India's 2,117 GCCs. Data snapshot: **11 Oct 2026**; nothing updates automatically.

To add or change data, edit the JSON in `src/data/` and run `npm run validate:data`. UI components never import JSON directly; they use `src/lib/data.ts` and `src/lib/views.ts`.

## Architecture

```
src/data/            seed JSON: sources, evidence, companies, metrics, cities, gaps
src/lib/data.ts      typed accessors (the only reader of the JSON)
src/lib/views.ts     serializable view models for client components
src/lib/format.ts    pure formatters (safe in client bundles)
src/lib/assistant/   retrieval.ts, deterministic.ts, claude.ts (placeholder), index.ts
src/app/api/assistant/route.ts   POST { query } -> cited answer
src/components/      UI (AppShell, StatusSeal, charts, per-page clients)
scripts/validate-data.mjs
```

## The assistant, and adding the Claude API later

Today the assistant is **not a language model**. `retrieve()` scores evidence rows (TF-IDF-style keywords plus city/company/topic detection), and `composeDeterministic()` assembles an answer purely from stored claims, each with citations. It never states anything outside the retrieved records. Costs, unknown companies and cities outside the four return "no records" plus missing-evidence items instead of a guess. The UI labels this mode and does not claim Claude is connected.

To add Claude securely:

1. Add `ANTHROPIC_API_KEY` to the **server** environment only (Vercel project settings; never `NEXT_PUBLIC_*`).
2. Implement `ClaudeProvider.answer()` in `src/lib/assistant/claude.ts` with the Anthropic SDK. `buildGroundedPrompt()` already builds a prompt that confines the model to the retrieved records.
3. Return the same `AssistantAnswer` shape, reusing the retrieval's citations. Reject any citation not in the retrieved set.
4. Set `ASSISTANT_PROVIDER=claude`. Until step 2 is done, that setting returns a 501 "not connected" error rather than silently falling back.
5. Add rate limiting (for example Vercel WAF or Upstash) before exposing a paid model.

The browser only ever calls `/api/assistant`.

## Deploy to Vercel

1. Push the repo to GitHub.
2. In Vercel: **Add New > Project**, import the repo. Framework preset is detected as Next.js; no build settings to change.
3. Environment variables: none required. Optionally set `ASSISTANT_PROVIDER=deterministic`.
4. Deploy. `npm run build` runs the data validator first, so broken references fail the build.

CLI alternative: `npx vercel` then `npx vercel --prod`.

## Notes for this Next.js version

This project uses Next.js 16.4 with Cache Components and Partial Prefetching. Conventions differ from older versions (for example `error.tsx` receives `retry`, `params` and `searchParams` are promises, and `useSearchParams` needs a Suspense boundary). Docs ship in `node_modules/next/dist/docs/`.

## Known limitations

- Seed data is small and static by design; coverage and gaps are shown on the Dashboard.
- Several figures are relayed secondhand (CBRE, JLL, Colliers via news or an aggregator) and are labelled estimated.
- Shortlist is per-browser; there are no accounts.
- Retrieval is keyword-based and can miss paraphrases it has no vocabulary for.
