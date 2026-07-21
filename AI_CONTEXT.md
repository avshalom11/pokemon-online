# AI_CONTEXT.md

# Pokemon Online

## Purpose

This document explains the current state of the project.

Every AI assistant working on this repository should read this file before making any changes.

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
UI pages

data/
Static game data

engine/
Game systems and logic

shared/
Shared utilities and TypeScript types

public/
Images and static assets

---

# Existing Features

The project already contains:

- Home page
- Map page
- Battle page
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

⬜ Battle system

⬜ Player monsters

⬜ Capture monsters

⬜ Inventory

⬜ Save progress

⬜ Login system

---

# Battle System Goals

The battle engine should eventually support:

Turn order

HP

Attack

Defense

Speed

Critical hits

Status effects

Moves

Items

Capture attempts

Experience

Level up

Victory

Defeat

Escape

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