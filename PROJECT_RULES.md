# Project Rules

## 1. Core Principle

The project must remain modular, maintainable, and easy to extend.

Do not sacrifice long-term architecture for short-term convenience.

## 2. Folder Responsibilities

### app/

Contains Next.js pages, layouts, and UI components.

Rules:

- Do not place game logic directly inside pages.
- Pages should display data and call functions from the engine.
- Keep page components small and readable.

### engine/

Contains game logic.

Examples:

- Encounter generation
- Battle calculations
- Turn order
- Damage calculations
- Capture calculations
- Inventory operations

Rules:

- Engine functions should not depend on React.
- Engine functions should be reusable and testable.
- Prefer small functions with one clear responsibility.
- Engine functions must never import Prisma or any database client.
- `engine/battle/battle-engine.ts` and its siblings (`damage-calculation.ts`,
  `battle-ai.ts`, `accuracy.ts`, `turn-order.ts`) are an unfinished, parallel
  move-based battle engine that is currently **not connected to gameplay**.
  Do not revive, partially integrate, or delete it without an explicit
  instruction — see AI_CONTEXT.md's "Current architecture status".

### features/

Contains the Prisma-backed persistence and orchestration layer, organized by
feature (e.g. `features/battle`, `features/known-moves`,
`features/move-learning`, `features/pokemon-progression`).

Each feature typically has:

- `services/` — Prisma access + business orchestration (never imported by
  Client Components directly).
- `actions/` — `"use server"` Server Actions: session validation, ownership
  validation, schema validation, then delegate to a service.
- `validation/` — Zod schemas for that feature's Server Action inputs.
- `components/` (when the feature owns UI) — Client Components that call the
  feature's own Server Actions.

Rules:

- Only `features/` (and `lib/db`, `lib/auth`) may import Prisma — never
  `engine/`, `components/`, or `app/`.
- A service function should be the *one* place a given piece of game logic is
  resolved; Server Actions and React components should not duplicate it.
- The current live battle loop follows this pattern end to end — the
  **Battle Action Pipeline**: Battle UI → Server Action
  (`features/battle/actions/battle-action.action.ts`) → Battle Action Service
  (`features/battle/services/battle-action.service.ts`) → validation →
  engine logic → a structured result. New battle actions should follow the
  same shape rather than adding a new one-off pattern.

### data/

Contains static game data and configuration.

Examples:

- Monsters
- Zones
- Moves
- Items
- NPCs
- Quests

Rules:

- Avoid hardcoding game data inside UI files or engine files.
- Add new content through data files whenever possible.

### shared/types/

Contains shared TypeScript types and interfaces.

Rules:

- Reuse existing types before creating new ones.
- Avoid duplicate types.
- Keep types focused and descriptive.

### components/

Contains reusable, presentation-only React UI components shared across
pages (for example, the battle screen's building blocks in
`components/battle/`).

Rules:

- Components must not contain game logic or compute game state themselves.
- Components receive data and configuration via props.
- Keep components small and composable; extract a shared primitive instead
  of duplicating markup/styling across similar components.
- A component that varies by "which battle location" (e.g. `BattleBackground`)
  should read everything it needs from theme data (`lib/battle/battleThemes.ts`)
  rather than branching per zone in the component itself. Adding a new
  location should mean one new theme object (image path/colors/particles/
  lighting), never editing the component that renders it.
- `components/layout/` holds the shared page shell (currently `GameScreen`,
  `GameHeader`) reused by every major game surface (Battle; later Map,
  Inventory, Shop, Profile, ...). It owns viewport-level concerns — reserved
  header space, centered/max-width container sizing, rounded corners/shadow
  — so that individual screens (e.g. `BattleScene`) only ever need to fill
  whatever container they're given, never manage their own viewport sizing.
- `components/auth/` holds the login/registration UI only. These components
  read `useActionState`/props and render forms — they never import Prisma,
  the Better Auth server instance (`lib/auth/auth.ts`), or any server-only
  module directly. All real logic goes through the Server Actions in
  `lib/auth/actions.ts`.

### lib/

Contains non-gameplay configuration and utilities that support the UI layer
(for example, visual theme definitions and layout tokens in `lib/battle/`,
or shared page-shell sizing in `lib/layout/`), plus authentication and
database access.

Rules:

- Do not put gameplay rules or calculations here — that belongs in engine/.
- Keep files focused on one concern (e.g. themes vs. layout tokens).
- `lib/auth/` owns everything about *how authentication works* (Better Auth
  config, the client SDK, Zod validation, error-message mapping, and the
  Server Actions forms call). It must stay independent of game-domain data —
  the one bridge is `lib/auth/player-profile.ts`, which only creates/upserts
  the `PlayerProfile` row tied to a newly authenticated user; it does not
  contain progression logic.
- `lib/db/` is the only place a Prisma client is constructed. Everything
  else — including `lib/auth/` — imports the shared singleton from
  `lib/db/prisma.ts` rather than creating its own client.
- Never import anything under `lib/auth/` or `lib/db/` from a Client
  Component. Server Actions and server components are the boundary; forms
  in `components/auth/` call the Server Actions, they never call Prisma or
  `auth.api.*` themselves.

## 3. TypeScript Rules

- Use strong TypeScript typing.
- Avoid `any`.
- Handle `null` and `undefined` safely.
- Do not silence TypeScript errors without understanding the cause.
- Prefer explicit return types for important engine functions.

## 4. Architecture Rules

- Separate UI, game logic, data, and types.
- Do not duplicate existing logic.
- Do not create circular dependencies.
- Do not rewrite working systems without a clear reason.
- Explain major architectural changes before applying them.
- Prefer the smallest safe change.

## 5. Game Data Rules

All game content should be data-driven whenever possible.

Examples:

- Adding a new monster should usually require adding data, not changing UI logic.
- Adding a new zone should usually require adding zone data, not duplicating pages.
- Adding a new move should usually require adding move data and reusable behavior.

## 6. File Size and Responsibilities

- Avoid giant files.
- Split files when they contain unrelated responsibilities.
- Each function should have one clear purpose.
- Each module should represent one clear area of the game.

## 7. Next.js Rules

This project may use a non-standard or newer Next.js version.

Before making changes involving Next.js APIs, routing, server/client components, or framework conventions:

- Read the relevant documentation inside:
  `node_modules/next/dist/docs/`
- Do not rely only on general Next.js knowledge.

## 8. Change Process

Before modifying code:

1. Read the relevant existing files.
2. Understand the current architecture.
3. Reuse existing types and functions.
4. Describe the planned change.
5. Make the smallest safe implementation.

After modifying code:

1. Check for TypeScript errors.
2. Run the relevant development or build command.
3. Confirm existing functionality still works.
4. Summarize what changed.

## 9. Git Rules

- Check `git status` before large changes.
- Pull recent changes when appropriate.
- Keep commits small and focused.
- Use clear commit messages.
- Do not commit broken code knowingly.

## 10. AI Assistant Autonomy Policy

To keep development fast, AI assistants should move quickly and make
reasonable implementation decisions independently rather than pausing
for routine details.

Do NOT stop to ask about routine implementation details, such as:

- Exact file/folder names for new modules that fit existing conventions.
- Minor styling, UI copy, or layout choices in prototypes.
- Which existing helper/type to reuse when the choice is obvious.
- Small data shape decisions that don't affect other systems.

DO stop and ask before proceeding when a decision:

- Significantly affects the architecture (e.g. changing a core shared
  type used across systems, restructuring folders).
- Deletes or disables existing working functionality.
- Introduces a new major dependency (a new package, a backend, a
  database, a third-party service).
- Requires choosing between materially different game-design
  directions (e.g. simultaneous vs. strictly alternating turns,
  whether capture uses stat-based odds vs. a fixed rate).

When in doubt and the decision is reversible and low-risk: implement
the most modular reasonable option and summarize the decision and
reasoning afterward instead of asking first.

## 11. AI Assistant Rules

Before working on the project, read:

- `AGENTS.md`
- `README.md`
- `PROJECT_RULES.md`
- `CONTRIBUTING.md`
- `AI_CONTEXT.md`

AI assistants must:

- Follow the project architecture.
- Ask before making major structural changes.
- Not modify unrelated files.
- Not remove working features without permission.
- Explain new files and their responsibilities.
- Preserve modularity and extensibility.

## 12. Authentication & Database

- Auth tables (`User`, `Session`, `Account`, `Verification` in
  `prisma/schema.prisma`) are owned and regenerated by the Better Auth CLI
  (`npx auth@<version-matching-installed-better-auth> generate --config lib/auth/auth.ts`).
  Do not hand-edit their fields; re-run the CLI after changing `lib/auth/auth.ts`'s
  config (e.g. adding a plugin), then re-apply your own additions below the
  generated block (currently just the `playerProfile` relation on `User`).
- Game-domain models (currently `PlayerProfile`) live in the same
  `schema.prisma` file but are hand-written and hand-maintained — the CLI
  does not know about them and will not touch them.
- `proxy.ts` (this project's Next.js version renamed `middleware.ts` to
  `proxy.ts` — check `node_modules/next/dist/docs` before assuming otherwise
  on an upgrade) is an *optimistic* check only: cookie presence, no DB
  query. The real authorization check is `getCurrentSession()`
  (`lib/auth/auth-session.ts`), called server-side at the top of every
  protected page. Never rely on the proxy redirect alone.
- Never commit `.env`. `.env.example` (names only, no values) documents
  which variables are required; keep it in sync when adding new ones.