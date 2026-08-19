// Owned-Pokémon (PlayerPokemon) progression tuning — deliberately separate
// from the player/account-level XP curve (features/player-progression),
// which has its own independent formula/config. Tune here only; every
// consumer reads through pokemon-progression-calculations.ts /
// pokemon-progression-service.ts rather than hardcoding these numbers.

// XP required to advance a Pokémon from level N to level N+1 is
// `N * XP_PER_POKEMON_LEVEL`.
export const XP_PER_POKEMON_LEVEL = 100;

// A Pokémon can never advance past this level. Total XP may still keep
// accumulating beyond the level-100 threshold (see
// getPokemonLevelProgress) — only the level itself is capped.
export const MAX_POKEMON_LEVEL = 100;

// Base battle-XP reward pool for defeating a wild Pokémon:
// defeatedWildPokemonLevel * BASE_POKEMON_XP_MULTIPLIER, then scaled by the
// level-difference multiplier below (see getLevelDifferenceXpMultiplier) —
// see calculateBaseBattlePokemonXp for how the two combine. This whole pool
// is then split among eligible participants — see
// POKEMON_XP_FINISHER_SHARE/POKEMON_XP_OTHER_PARTICIPANTS_SHARE below and
// distributeBattlePokemonXp — never granted per-participant on top of
// itself.
export const BASE_POKEMON_XP_MULTIPLIER = 10;

// Level-difference reward scaling (getLevelDifferenceXpMultiplier) —
// rewards a defeat against a *higher*-level wild Pokémon with more XP, and
// a defeat against a *lower*-level wild Pokémon with less, relative to the
// finisher's own level (the Pokémon that actually delivered the lethal
// hit — the reward pool is computed once, before distribution, so this is
// evaluated against a single Pokémon rather than every participant; see
// calculateBaseBattlePokemonXp's own doc comment).
//
// Multiplier = 1 + (wildLevel - finisherLevel) * LEVEL_DIFFERENCE_MULTIPLIER_STEP,
// clamped to [MIN_LEVEL_MULTIPLIER, MAX_LEVEL_MULTIPLIER]. 0.05 (5% per
// level of difference) keeps realistic gaps smooth and gradual:
// -5 levels -> ~75%, -10 levels -> ~50% — matching the intended "clearly
// less, never punishing" feel for a moderately under-leveled kill.
//
// XP BALANCE (2026-08-19) — MIN_LEVEL_MULTIPLIER was 0.5, which flattened
// every gap of -10 levels or more to the exact same 50% floor: a level-57
// Pokémon one-shotting a level-17 wild (a -40 gap, a completely trivial
// fight in practice) still earned half the nominal per-level pool, which
// played out as far too much XP for stomping something that far below it
// (real playtest: a level 57 Mewtwo got ~110 XP off a level ~17 wild).
// Lowered to 0.15 so a very large gap (roughly -20 and beyond) settles
// into a small-but-never-zero reward — a level 57 vs. level 17 fight
// (base 170) now lands at ~26 XP, not ~85-110 — while leaving the -5/-10
// gap behavior (still governed by the unchanged STEP below, not this
// floor) exactly as it already was. Still a real, nonzero floor per the
// project's own "never able to make farming trivially weak Pokémon
// efficient" rule above — just a smaller one. MAX_LEVEL_MULTIPLIER
// (fighting *above* your level) is untouched; nothing suggested that side
// needed retuning.
export const MIN_LEVEL_MULTIPLIER = 0.15;
export const MAX_LEVEL_MULTIPLIER = 2.0;
export const LEVEL_DIFFERENCE_MULTIPLIER_STEP = 0.05;

// Reward-pool split when 2+ eligible Pokémon participated in a battle.
// With exactly one eligible participant, that Pokémon simply receives 100%
// (there is no "other" to split with) — see distributeBattlePokemonXp.
// With 2 participants, the non-finisher receives
// POKEMON_XP_OTHER_PARTICIPANTS_SHARE outright; with 3+, that same share is
// divided equally among every non-finisher. Kept as two named constants
// (rather than deriving one from the other) so either can be retuned
// independently later without the other silently drifting.
export const POKEMON_XP_FINISHER_SHARE = 0.65;
export const POKEMON_XP_OTHER_PARTICIPANTS_SHARE = 0.35;
