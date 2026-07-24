// Centralized battle-screen timing — every artificial delay in
// BattleContent.tsx reads from here rather than a scattered inline literal,
// so the "how fast does the battle loop feel" tuning knobs live in exactly
// one place. Gameplay speed is a core project priority (players may run
// hundreds of wild battles hunting rare encounters), so these are
// deliberately short — see each constant's own comment for what it's
// actually protecting.

// Pure sprite-flash animation — not a "reading" pause at all.
export const HIT_FLASH_DURATION_MS = 400;

// How long an attack/switch/failed-capture line holds before the next state
// change (the wild's counter-attack, etc.) replaces it — the one pause the
// task explicitly keeps: "attack animation readability." Reused across
// several single-step message sequences (was MESSAGE_STEP_DELAY_MS).
export const ATTACK_MESSAGE_DURATION_MS = 700;

// The gap between a wild Pokémon fainting and the next encounter loading —
// now the *only* delay in that path (see BattleContent's handleAttack: the
// lethal branch no longer schedules any separate "read the outcome" pause,
// since no fainted/XP/victory message is ever shown there to read). Kept as
// a small fixed delay, not zero, purely so the transition stays visually
// stable regardless of network latency — not for anyone to read anything.
export const NEXT_ENCOUNTER_DELAY_MS = 150;

// How long the brief, non-blocking XP toast stays visible before
// auto-dismissing on its own — no user interaction, never blocks input.
export const XP_TOAST_DURATION_MS = 1800;
