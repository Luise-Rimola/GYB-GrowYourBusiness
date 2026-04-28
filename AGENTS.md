# AGENTS.md

## Cursor Cloud specific instructions

### Product overview

BusinessDSS ("Grow Your Business") is a single Next.js 16 application (App Router) with API routes. It is an AI-powered business decision support system using PostgreSQL + pgvector, Prisma ORM, and user-configurable LLM backends. The UI is bilingual (German/English).

### Prerequisites

- **PostgreSQL 16** with the `pgvector` extension must be running on localhost:5432.
- A `.env` file is required. Copy from `.env.example` and set at minimum:
  - `DATABASE_URL` and `DIRECT_URL` pointing to the local PostgreSQL database
  - `AUTH_SECRET` (any string >= 16 chars)
  - `UNLOCK_ALL_WORKFLOWS=1` (dev convenience, unlocks all workflow gates)
- No `RESEND_API_KEY` is needed in dev — email verification codes are logged to the console instead.

### Database setup (after schema changes)

```bash
npx prisma generate
npx prisma db push
npm run db:vector:setup   # enables pgvector extension + embedding column
npm run db:seed           # upserts reference data (KPIs, workflows, prompts, etc.)
```

### Running the dev server

```bash
npm run dev          # uses webpack (port 3000)
npm run dev:turbo    # alternative with Turbopack
```

### Lint

`npm run lint` — ESLint 9 flat config. Note: there is a pre-existing `ajv` override in `package.json` that conflicts with `@eslint/eslintrc`'s internal ajv usage, causing a `TypeError: Cannot set properties of undefined (setting 'defaultMeta')` crash. This is a known issue in the repo and is not caused by environment setup.

### Build

`npm run build` — standard Next.js production build. Completes successfully.

### Testing a user flow (dev)

1. Start the dev server, then register via `POST /api/auth/register`.
2. The 6-digit verification code is printed to the server console (grep for `Bestätigungscode`).
3. Verify via `POST /api/auth/verify-email` with `{ email, code }`.
4. Log in via `POST /api/auth/login` — sets a session cookie and redirects to `/home`.

### Key gotchas

- The Prisma schema uses `prisma db push` (no migration history). Never use `prisma migrate dev` unless migrating to that workflow.
- The `KnowledgeChunk.embedding` column uses `Unsupported("vector(1536)")` which requires the pgvector extension. Run `npm run db:vector:setup` after `prisma db push`.
- The seed script (`prisma/seed.ts`) auto-adjusts Supabase connection strings (port 5432 → 6543); for local dev this is a no-op.
- LLM features require the user to configure an API endpoint in Settings (`/settings`). Without it, workflow AI generation calls will fail, but the rest of the app (dashboard, profile, decisions, etc.) works fine.
