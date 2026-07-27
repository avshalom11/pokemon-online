# Pokemon Online

Pokemon Online is a browser-based monster collection and battle game built with Next.js and TypeScript.

## Vision

The goal of this project is to create a modular browser game that can easily grow over time.

Planned features include:

- 🌍 World map with multiple zones
- 🎲 Random monster encounters
- ⚔️ Turn-based battle system
- 🎒 Inventory
- 👤 Player accounts
- 💾 Save progress
- 🛒 Shop
- 🎯 Quests
- 🏆 Achievements
- 🤝 Trading
- 👥 Multiplayer battles (future)

---

## Tech Stack

- Next.js
- React
- TypeScript
- Git & GitHub

Future:

- PostgreSQL
- Prisma
- Authentication
- WebSockets

---

## Project Structure

```
app/
data/
engine/
shared/
```

Each system should remain independent and easy to extend.

---

## Development Principles

- Modular architecture
- Strong TypeScript typing
- Keep business logic outside UI components
- Reusable code
- Easy to maintain
- Easy to expand

---

## Current Progress

✅ Map screen

✅ Zone system

✅ Random encounter engine

✅ Battle screen

✅ Authentication & player profiles

✅ Party system & persisted battle sessions

✅ Capture system

✅ Player & Pokémon experience/leveling

✅ Move Registry & Learnsets

✅ Known Moves (persisted, 4-slot, per Pokémon)

✅ Level-up move learning (automatic + pending resolution)

✅ Battle Action Pipeline (centralized, server-side action resolution)

✅ Battle Move Selection — battle attacks are now driven by a Pokémon's actual Known Moves

⬜ Physical/Special damage formula (still temporary fixed damage)

See `AI_CONTEXT.md` → "Current Development Status" for the full phase history and what's next.

---

This project is built as a long-term learning project while aiming to release a playable browser game as quickly as possible.