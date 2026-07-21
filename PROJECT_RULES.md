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

## 10. AI Assistant Rules

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