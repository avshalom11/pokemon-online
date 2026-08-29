# DEV vs. PLAY environments

Two separate databases, selected explicitly by which env file is loaded —
never by relying on Next.js's implicit `.env.development` auto-loading.

- **PLAY** (`.env`) — the permanent player-progression database: account,
  level, Pokémon, party/storage, inventory, currencies, Pokédex, marketplace
  data. Treat it like production. Never destructive.
- **DEV** (`.env.development`, gitignored — copy it from
  `.env.development.example`) — a separate database for developing and
  testing new features. Safe to break, reset, or fill with test data.

## Running the app

| Command              | Loads              | Points at |
|----------------------|--------------------|-----------|
| `npm run dev` / `npm run dev:play` | `.env`             | PLAY |
| `npm run dev:dev`    | `.env.development` | DEV  |

Both use [`dotenv-cli`](https://www.npmjs.com/package/dotenv-cli) to load the
named file explicitly before starting `next dev`, so the active database is
always determined by which script you ran — not by ambient `NODE_ENV`
behavior.

The `:dev` scripts also run `scripts/require-env-file.mjs` first, which hard-
fails if `.env.development` doesn't exist yet. Without this, `dotenv-cli`
would silently skip a missing file and Next/Prisma would fall back to
loading `.env` on their own — i.e. a "DEV" command would silently run
against PLAY. The guard turns that into a loud error instead.

## Prisma migrations

| Command                      | Loads              | Points at | Behavior |
|-------------------------------|--------------------|-----------|----------|
| `npm run prisma:dev:migrate`  | `.env.development` | DEV  | `prisma migrate dev` — creates and applies new migrations. May prompt to reset on drift. |
| `npm run prisma:play:deploy`  | `.env`             | PLAY | `prisma migrate deploy` — applies already-created, already-reviewed migration files in order. Never generates new migrations, never resets, never prompts. |

**Hard rule: only ever run `prisma migrate deploy` against PLAY.**
Never run `prisma migrate dev`, `prisma migrate reset`, or `prisma db push`
against PLAY — those are DEV-only commands. If you type a Prisma CLI command
by hand instead of using the npm scripts above, double-check which `.env`
file is actually loaded first.

## Feature workflow

1. Develop and test entirely against DEV (`npm run dev:dev`,
   `npm run prisma:dev:migrate`).
2. Once a feature is approved, review the migration file(s) it generated
   under `prisma/migrations/`.
3. Merge the code.
4. Run `npm run prisma:play:deploy` to apply those same migration files to
   PLAY — additive only, existing PLAY data is never touched.
5. Run PLAY (`npm run dev:play` / your production deploy) with the new code.

## Setup still needed (manual, not done by this change)

1. In the Neon console, create a `dev` branch off the current (PLAY)
   branch — this gives DEV a full copy of today's schema/data, isolated
   from PLAY.
2. Copy `.env.development.example` to `.env.development` and fill in the
   `dev` branch's pooled (`DATABASE_URL`) and direct (`DIRECT_URL`)
   connection strings.
3. From then on, use `npm run dev:dev` for feature work and
   `npm run dev:play` when you actually want to play.
