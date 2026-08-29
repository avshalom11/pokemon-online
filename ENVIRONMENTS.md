# DEV vs. PLAY environments

Two separate databases AND two separate working directories (Git worktrees),
selected explicitly by which env file is loaded — never by relying on
Next.js's implicit `.env.development` auto-loading.

- **PLAY** — `C:\Users\avshl\Desktop\monster-browser-game`, `main` branch,
  `.env`, port 3000. The permanent player-progression database: account,
  level, Pokémon, party/storage, inventory, currencies, Pokédex, marketplace
  data. Treat it like production. Never destructive.
- **DEV** (this directory) — `C:\Users\avshl\Desktop\monster-browser-game-dev`,
  `develop` branch, `.env.development` (gitignored — copy it from
  `.env.development.example`), port 3001. A separate database and separate
  working tree for developing and testing new features. Safe to break,
  reset, or fill with test data — Claude's default working directory.

Each directory only ever has the one env file it needs — this worktree has
`.env.development` but no `.env`, and PLAY's directory has `.env` but no
`.env.development`. That, plus the `require-env-file.mjs` guard below, is
what makes cross-environment fallback structurally impossible rather than
just conventionally avoided.

## Running the app

| Command                             | Loads              | Points at | Port |
|--------------------------------------|--------------------|-----------|------|
| `npm run dev:play`                   | `.env`             | PLAY      | 3000 |
| `npm run dev` / `npm run dev:dev`    | `.env.development` | DEV       | 3001 |

Both use [`dotenv-cli`](https://www.npmjs.com/package/dotenv-cli) to load the
named file explicitly, and pass `--port` explicitly to `next dev`, so neither
the active database nor the port depends on ambient `NODE_ENV` behavior or
Next's automatic "port already in use" fallback.

Every script above also runs `scripts/require-env-file.mjs` first, which
hard-fails if its target env file doesn't exist in the current directory.
Without this, `dotenv-cli` would silently skip a missing file and Next/Prisma
would fall back to auto-loading whichever env file *does* exist here — e.g.
running `dev:play` in this DEV worktree (which has no `.env`) would otherwise
silently run against DEV while labeled "play". The guard turns that into a
loud, explicit error instead, in both directions.

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

1. Develop and test entirely in this DEV worktree/branch (`npm run dev:dev`,
   `npm run prisma:dev:migrate`) — this is where Claude works by default.
2. Once a feature is approved, review the migration file(s) it generated
   under `prisma/migrations/`.
3. Merge `develop` into `main` (in the PLAY directory) — a normal Git merge,
   never a database action by itself.
4. From the PLAY directory, run `npm run prisma:play:deploy` to apply those
   same migration files to PLAY — additive only, existing PLAY data (rows)
   is never touched by this step; only the schema advances.
5. Run/restart PLAY (`npm run dev:play` in the PLAY directory) with the
   merged code.

This worktree's own `develop` branch and this directory's `.env.development`
are never merged or copied into PLAY — only reviewed migration files and
application code move from `develop` to `main`.
