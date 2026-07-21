# Contributing Guide

## Before Starting

Before changing code:

1. Read `README.md`.
2. Read `PROJECT_RULES.md`.
3. Review the existing folder structure.
4. Check whether a similar system already exists.

---

## Development Workflow

For every new feature:

1. Plan the change.
2. Identify which folders and files should be affected.
3. Keep game logic separate from UI.
4. Reuse existing types and functions.
5. Run the project and check for errors.
6. Review all changed files before committing.

---

## Git Workflow

Before making a large change:

```bash
git status
git pull
```

After completing and testing the change:

```bash
git add .
git commit -m "Describe the completed change"
git push
```

Commit messages should clearly describe what changed.

Examples:

```text
Add inventory item types
Implement battle turn order
Fix random encounter selection
Update project documentation
```

---

## Code Quality Checklist

Before finishing a task, confirm that:

- TypeScript has no errors.
- Existing features still work.
- Business logic is outside UI components.
- No unnecessary duplicated code was added.
- New code is easy to expand.
- File and variable names are clear.
- Large files were split when appropriate.

---

## AI Contributor Instructions

AI coding tools must:

- Read `PROJECT_RULES.md` before editing.
- Inspect existing code before creating new systems.
- Avoid rewriting working code without a clear reason.
- Describe major architectural changes before applying them.
- Make focused changes instead of changing unrelated files.
- Run available checks after implementation.
- Report any unresolved errors honestly.

---

## Project Priority

Build a playable browser game quickly without sacrificing modularity and long-term maintainability.