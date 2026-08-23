// Centralized battle-screen timing. Gameplay speed is a core project
// priority (players may run hundreds of wild battles hunting rare
// encounters), so every constant here EXCEPT the two CAPTURE_* ones below
// is purely cosmetic and non-blocking — neither ever gates a phase
// transition or delays revealing a battle outcome; every message/state
// update is applied the instant its data is available, never held back by
// an artificial timer. The Medicine flow's own "show the heal before the
// wild responds" requirement (features/battle/components/BattleContent.tsx's
// handleSelectMedicineTarget) is satisfied by an explicit player-clicked
// confirm button instead of a timer, so it needs no constant here.
//
// CAPTURE_SHAKE_DURATION_MS/CAPTURE_SUCCESS_HOLD_MS are the one deliberate,
// explicitly-requested exception — see their own doc comments below for
// why a capture throw specifically gets a brief presentational reveal
// delay that no other battle action has.

// Pure sprite-flash animation — not a "reading" pause at all.
export const HIT_FLASH_DURATION_MS = 400;

// The universal player-attack lunge + sound (see battle-attack-effect.ts) —
// deliberately short and non-blocking, same "cosmetic only" rule as every
// other constant here. Target: ~250-350ms total felt time.
export const ATTACK_EFFECT_DURATION_MS = 300;

// How long the brief, non-blocking XP toast stays visible before
// auto-dismissing on its own — no user interaction, never blocks input.
export const XP_TOAST_DURATION_MS = 1800;

// CAPTURE SHAKE ANIMATION — the one deliberate exception to this file's own
// "no reading pause anywhere in the battle loop" rule above, explicitly
// requested for the Poké Ball throw specifically (never any other battle
// action). It never touches the authoritative result itself: the real
// capture RNG/roll happens exactly as before, in the same unmodified
// Server Action/service call, the instant it's requested — this constant
// only delays how long the ALREADY-DECIDED result stays hidden behind the
// ball animation before BattleContent reveals it. See proceedCapture
// (BattleContent.tsx), which runs this timer in parallel with (never
// after) the real server round trip via Promise.all, so a slow network
// response is never made to feel slower than it already is.
export const CAPTURE_SHAKE_DURATION_MS = 2000;

// Brief "it worked" hold on the ball (a small glow/pop, see app/globals.css's
// capture-ball-success) after the shake finishes and a capture SUCCEEDED,
// before handing off into the existing captured/result flow. Never applied
// on a failed capture, which reveals immediately once the shake ends.
export const CAPTURE_SUCCESS_HOLD_MS = 500;
