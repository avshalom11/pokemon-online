// Centralized battle-screen timing. Gameplay speed is a core project
// priority (players may run hundreds of wild battles hunting rare
// encounters), so every remaining constant here is purely cosmetic and
// non-blocking — neither ever gates a phase transition or delays revealing
// a battle outcome. There is no "reading pause" of any kind left anywhere
// in the battle loop: every message/state update is applied the instant
// its data is available, never held back by an artificial timer. The
// Medicine flow's own "show the heal before the wild responds" requirement
// (features/battle/components/BattleContent.tsx's handleSelectMedicineTarget)
// is satisfied by an explicit player-clicked confirm button instead of a
// timer, so it needs no constant here.

// Pure sprite-flash animation — not a "reading" pause at all.
export const HIT_FLASH_DURATION_MS = 400;

// How long the brief, non-blocking XP toast stays visible before
// auto-dismissing on its own — no user interaction, never blocks input.
export const XP_TOAST_DURATION_MS = 1800;
