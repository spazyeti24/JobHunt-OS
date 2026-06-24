# Job Hunt Automation Dashboard

A personal job hunting cockpit that automatically searches job boards daily, scores each listing against your resume using Claude AI, and generates tailored resumes and cover letters for the best matches.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/job-hunt run dev` — run the frontend (port 25452)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite + Tailwind CSS + shadcn/ui
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)
- AI: Anthropic Claude (claude-haiku-4-5 for scoring, claude-sonnet-4-5 for tailoring)
- Job sources: JSearch (via RapidAPI) + Adzuna

## Where things live

- `lib/api-spec/openapi.yaml` — single source of truth for API contract
- `lib/db/src/schema/` — Drizzle ORM table definitions (jobs, settings, resume, runs)
- `artifacts/api-server/src/routes/` — Express route handlers
- `artifacts/api-server/src/lib/` — scoring, tailoring, job fetching, runner engine
- `artifacts/job-hunt/src/pages/` — React pages (dashboard, resume, runs, settings)

## Architecture decisions

- No Google Sheets/Docs — everything stored in built-in Postgres DB, shown in the web dashboard
- Date serialization: DB returns `Date` objects, must call `.toISOString()` before Zod parsing in routes
- Job fetch pipeline runs in a background thread (no blocking) — triggered via POST /api/runs
- JSearch + Adzuna both queried per search query × location combination
- All Claude calls use explicit temperature (0 for scoring, 0.4 for tailoring) and retry with backoff

## Product

- Dashboard: stats cards + filterable/searchable job table with color-coded fit scores
- Job detail: click any row to see AI scoring rationale, tailored resume, and cover letter
- Resume editor: edit your master resume markdown (applies to future runs)
- Settings: score threshold, employment types, remote toggle, search queries, locations
- Run history: trigger manual runs, view logs and stats for each past run

## User preferences

- No Google integration — all data stored locally in the built-in database

## Secrets required

- `RAPIDAPI_KEY` — JSearch API via RapidAPI
- `ADZUNA_APP_ID` + `ADZUNA_APP_KEY` — Adzuna job board API
- `ANTHROPIC_API_KEY` — Claude AI for scoring and tailoring
- `DASHBOARD_PASSWORD` — password to protect the dashboard (reserved for future auth)
- `SESSION_SECRET` — session secret (already set)

## Gotchas

- Always run `pnpm --filter @workspace/api-spec run codegen` after changing `openapi.yaml`
- Always run `pnpm --filter @workspace/db run push` after changing DB schema files
- Dates from Drizzle are `Date` objects — serialize with `.toISOString()` before Zod parsing
- The `ListJobsResponse` Zod parse must use `serializeJobs()` from `lib/serialize.ts`

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
