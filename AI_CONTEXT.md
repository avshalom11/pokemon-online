# AI_CONTEXT.md

# Pokemon Online

## Purpose

This document explains the current state of the project.

Every AI assistant working on this repository should read this file before making any changes.

---

# Current Development Status

_Last updated: end of Phase 5A._

**Most recently completed: Phase 5A — Battle Move Selection.**

What Phase 5A delivered:

- The battle screen's single generic "Attack" button was replaced with the
  active Pokémon's real Known Moves (up to four slots, always rendered, empty
  slots disabled).
- Known Moves now power the battle UI end-to-end: `PlayerPokemon` → Known
  Moves (`features/known-moves`) → Move Registry (`engine/moves`) → battle
  view (`features/battle/services/battle-view.service.ts`) → UI.
- Selecting a move now sends its real `moveId` through the Battle Action
  Pipeline (Server Action → Battle Action Service → validation → result),
  instead of a moveId-less generic "attack".
- Damage is still **Temporary Fixed Damage** (`engine/battle/battle-config.ts`
  — a flat constant, no formula, no accuracy/crit/type-effectiveness yet).
  Move selection is purely an architecture change so far; every legal move
  currently deals identical damage.

## Phase history (move & battle systems)

Completed, in order:

1. Move Registry — static move data + typed lookups (`engine/moves`)
2. Learnsets — per-species learnable moves (`engine/learnsets`)
3. Known Moves (Phase 4C) — persisted, 4-slot known-move sets per owned
   Pokémon (`engine/known-moves`, `features/known-moves`)
4. Starting Move calculation — a newly obtained Pokémon's initial known moves
5. Level-up Move Learning (Phase 4D) — automatic learning when a slot is
   free, Pending Move Learning created when it isn't
6. Pending Move Resolution (Phase 4E) — player-facing Learn/Decline UI for
   pending move-learning decisions
7. Battle Action Pipeline (Phase 4F) — moved attack resolution out of React
   and behind a single server-side Battle Action Service
8. **Battle Move Selection (Phase 5A) — current** — Known Moves now drive the
   battle UI and flow through the Battle Action Pipeline as above

Also completed (broader game systems, from earlier development):
world map & zones, authentication & player profiles, onboarding, party
system, persisted battle sessions, capture, Pokémon release, player & Pokémon
XP/leveling (Phase 2 stats rebalance).

**Total completed phases so far: 8** in the move/battle-system sequence above
(Move Registry through Battle Move Selection), on top of the earlier
foundational systems (map, auth, onboarding, party, battle sessions,
capture, progression).

## Current architecture status

- `engine/` holds every pure, framework-free game system: the Move Registry,
  Learnsets, Known Moves rules, Move Learning planning, and the *unused,
  untouched* legacy move-based battle engine (`engine/battle/battle-engine.ts`
  and its siblings — deliberately left disconnected; do not revive or
  partially integrate it without an explicit instruction to do so).
- `features/` holds the Prisma-backed persistence + orchestration layer,
  organized by feature (`features/battle`, `features/battle-session`,
  `features/known-moves`, `features/move-learning`, `features/pokemon-progression`,
  ...), each exposing Server Actions on top of a service layer.
- The live battle loop follows the **Battle Action Pipeline**: Battle UI →
  Server Action → Battle Action Service → validation → (currently) Temporary
  Fixed Damage → structured `BattleActionResult`. React (`BattleContent.tsx`)
  is orchestration-only — it never computes damage or HP itself.
- Known Moves are real and persisted, and now visibly drive the battle UI,
  but they do **not** yet affect damage, accuracy, or move behavior — that is
  explicitly deferred to the next phase.

## Next phase

**Phase 5B — Physical/Special Damage Formula.** Replaces Temporary Fixed
Damage with a real damage calculation (attacker/defender stats, physical vs.
special category) inside the existing Battle Action Service — the pipeline
and move-selection UI built in 4F/5A are not expected to need architectural
changes for this, only the internal damage step.

---

# Vision

Pokemon Online is a browser-based monster collection RPG.

The long-term goal is to build a game that can continue growing for years without requiring major rewrites.

Fast development is important.

Long-term maintainability is even more important.

---

# Main Development Philosophy

The project follows one core rule:

> Every feature should be easy to expand later.

Avoid temporary solutions that make future development harder.

When several solutions exist, always prefer the one that keeps the architecture modular.

---

# Technology Stack

Framework:
- Next.js

Language:
- TypeScript

UI:
- React

Routing:
- App Router

Version Control:
- Git
- GitHub

Development:
- VS Code
- Claude Code / Codex (AI-assisted)

---

# Current Folder Structure

app/
UI pages (Next.js App Router)

data/
Static game data

engine/
Pure, framework-free game systems and logic (no React, no Prisma)

features/
Prisma-backed persistence + orchestration, organized by feature, each
exposing Server Actions on top of a service layer (see PROJECT_RULES.md)

components/
Reusable, presentation-only UI components

lib/
Non-gameplay configuration/utilities: auth, database client, theming

shared/
Shared utilities and TypeScript types

prisma/
Database schema and migrations

public/
Images and static assets

See "Current Development Status" above for what's implemented in each.

---

# Existing Features

The project already contains:

- Home page
- Map page
- Battle page (Known-Move-driven attack selection, capture, escape, switch)
- Authentication & player profiles (Better Auth)
- Onboarding & starter Pokémon selection
- Party system (persisted)
- Persisted battle sessions (survive a page reload mid-battle)
- Capture system
- Player & Pokémon experience/leveling (Phase 2 stats)
- Move Registry & Learnsets
- Known Moves (persisted, 4-slot, per Pokémon)
- Level-up move learning (automatic + Pending Move Resolution)
- Battle Action Pipeline (centralized, server-side action resolution)
- Zone system
- Monster data
- Encounter engine
- Random encounter generation
- Weighted encounter probability
- Random level generation

---

# Existing Zones

Current zones:

- Grass
- Water
- Cave
- Lava
- Beach
- Ghost House

Each zone will eventually contain its own monster pool.

---

# Current Game Flow

Current flow:

Player

↓

Map

↓

Choose Zone

↓

Encounter Engine

↓

Random Monster

↓

Battle Screen

---

# Architecture Rules

Never place game logic inside React pages.

React pages should display data.

Game systems belong inside engine/.

Static data belongs inside data/.

Shared types belong inside shared/.

---

# Data Rules

Monsters

Items

Moves

Zones

NPCs

Shops

Quests

should all be data-driven.

Avoid hardcoding values inside components.

---

# Code Rules

Always use TypeScript.

Keep functions small.

Prefer composition over duplication.

Reuse existing code whenever possible.

Avoid giant files.

Split responsibilities clearly.

Write readable code before clever code.

---

# Systems Planned

Battle System

Player System

Inventory

Capture System

Monster Collection

Items

Experience

Leveling

Evolution

Moves

Status Effects

Quests

NPCs

Shop

Achievements

Authentication

Database

Saving

Friends

Trading

PvP

Guilds

Events

---

# MVP

The first playable version should contain:

✔ Map

✔ Random encounters

✔ Battle system (Known-Move selection; damage is still temporary/fixed —
  see Phase 5B below)

✔ Player monsters

✔ Capture monsters

⬜ Inventory

✔ Save progress

✔ Login system

---

# Battle System Goals

The battle engine should eventually support (✔ = done, ⬜ = not yet):

⬜ Turn order (currently a fixed player-hit-then-wild-counters sequence, not
   a real speed-based order)

✔ HP

✔ Attack (as a selectable action; see Moves below for the formula status)

⬜ Defense (not yet factored into damage — Phase 5B)

⬜ Speed (not yet factored into anything)

⬜ Critical hits

⬜ Status effects

✔ Moves — selectable, Known-Move-driven (Phase 5A); real move power/
   category/accuracy are NOT yet used for damage (Phase 5B is next)

⬜ Items

✔ Capture attempts

✔ Experience

✔ Level up

✔ Victory

✔ Defeat

✔ Escape

---

# Development Workflow

Before writing code:

1. Understand the existing architecture.
2. Check whether the functionality already exists.
3. Reuse existing code whenever possible.
4. Make the smallest safe change.
5. Test the result.
6. Explain large architectural changes before implementing them.

---

# AI Instructions

When working on this repository:

DO:

- Read README.md
- Read PROJECT_RULES.md
- Read CONTRIBUTING.md
- Read AI_CONTEXT.md

Understand the project before coding.

Keep changes modular.

Keep changes small.

Explain important decisions.

Avoid unnecessary rewrites.

If something is unclear, ask before changing architecture.

---

# Things AI Should Never Do

Do not rewrite working systems without a reason.

Do not duplicate existing functionality.

Do not mix UI and business logic.

Do not hardcode game data inside React components.

Do not create unnecessary dependencies between systems.

---

# Long-Term Goal

The codebase should still be understandable after several years of development.

Every new feature should make future development easier—not harder.