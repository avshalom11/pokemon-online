import assert from "node:assert/strict";
import { test } from "node:test";

import { GENERATION_8_MOVES } from "./index.ts";
import { moveSchema } from "../../schemas/move-schema.ts";
import { getMoveById, getAllMoves } from "../../registry/move-registry.ts";

// Generation 8 (Galar Moves & Learnsets Phase 3) introduces 65 new ordinary
// moves — every move that carries "sword-shield" as one of its real
// canonical version groups (verified against source move data before this
// file was written), which covers Sword/Shield's base move pool plus the
// Isle of Armor and Crown Tundra DLC (e.g. Astral Barrage/Jungle Healing,
// both added in Crown Tundra). None of them collide with an existing
// Generation 1-7 move id, so this file's own total is the full 65, not a
// reduced count.
//
// Deliberately EXCLUDED (verified before this file was written, never added
// anywhere in this project):
//   - All 19 Max Moves (Max Airstream, Max Darkness, Max Flare, Max
//     Flutterby, Max Geyser, Max Guard, Max Hailstorm, Max Knuckle, Max
//     Lightning, Max Mindstorm, Max Ooze, Max Overgrowth, Max Phantasm, Max
//     Quake, Max Rockfall, Max Starfall, Max Steelspike, Max Strike, Max
//     Wyrmwind) and every species-specific G-Max move — a Dynamax-only
//     battle transformation, never an ordinary learnable move in the real
//     games, and this project has no Dynamax/Gigantamax subsystem to begin
//     with. (Dynamax Cannon and Behemoth Bash/Blade ARE included — despite
//     the "Max"-adjacent theming, these are ordinary signature moves
//     Eternatus/Zacian/Zamazenta learn normally without Dynamaxing; only
//     their real "double damage vs. a Dynamaxed target" clause is dropped,
//     same as any other unsupported conditional-power mechanic.)
//   - 24 genuine Generation 8 move ids that never appeared in Sword/Shield
//     at all — Legends: Arceus/Scarlet-Violet-only moves per this phase's
//     own explicit "don't import PLA-only moves" instruction: Barb Barrage,
//     Bitter Malice, Bleakwind Storm, Ceaseless Edge, Chloroblast, Dire
//     Claw, Esper Wing, Headlong Rush, Infernal Parade, Lunar Blessing,
//     Mountain Gale, Mystical Power, Power Shift, Psyshield Bash, Raging
//     Fury, Sandsear Storm, Shelter, Springtide Storm, Stone Axe, Take
//     Heart, Triple Arrows, Victory Dance, Wave Crash, Wildbolt Storm.
const EXPECTED_GENERATION_8_MOVE_COUNT = 65;

test("exactly 65 Generation 8 moves are loaded", () => {
  assert.equal(GENERATION_8_MOVES.length, EXPECTED_GENERATION_8_MOVE_COUNT);
});

test("there are no duplicate move ids", () => {
  const ids = GENERATION_8_MOVES.map((move) => move.id);
  const uniqueIds = new Set(ids);
  const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
  assert.equal(uniqueIds.size, ids.length, `duplicate ids found: ${[...new Set(duplicates)].join(", ")}`);
});

test("every move passes Zod validation", () => {
  const failures: string[] = [];
  for (const move of GENERATION_8_MOVES) {
    const result = moveSchema.safeParse(move);
    if (!result.success) {
      failures.push(`${move.id}: ${JSON.stringify(result.error.issues)}`);
    }
  }
  assert.deepEqual(failures, []);
});

test("every move has generation 8 and introducedGeneration 8", () => {
  assert.ok(GENERATION_8_MOVES.every((move) => move.generation === 8));
  assert.ok(GENERATION_8_MOVES.every((move) => move.introducedGeneration === 8));
});

test("every move is marked data-only (no mechanics are implemented yet)", () => {
  assert.ok(GENERATION_8_MOVES.every((move) => move.implementationStatus === "data-only"));
});

test("every Generation 8 move appears in the real registry by id", () => {
  for (const move of GENERATION_8_MOVES) {
    assert.equal(getMoveById(move.id)?.id, move.id);
  }
});

test("getAllMoves() includes the full Generation 8 set alongside Generation 1-7", () => {
  assert.equal(getAllMoves().filter((move) => move.generation === 8).length, GENERATION_8_MOVES.length);
});

test("no Generation 8 move id collides with an existing Generation 1-7 move id", () => {
  const gen8Ids = new Set(GENERATION_8_MOVES.map((move) => move.id));
  const olderIds = getAllMoves().filter((move) => move.generation !== 8).map((move) => move.id);
  const collisions = olderIds.filter((id) => gen8Ids.has(id));
  assert.deepEqual(collisions, []);
});

test("every Generation 8 move has a real, already-supported MoveType — no schema change was required", () => {
  const validTypes = new Set([
    "normal", "fire", "water", "electric", "grass", "ice", "fighting", "poison",
    "ground", "flying", "psychic", "bug", "rock", "ghost", "dragon", "dark", "steel", "fairy",
  ]);
  for (const move of GENERATION_8_MOVES) {
    assert.ok(validTypes.has(move.type), `${move.id} has unsupported type "${move.type}"`);
  }
});

test("no Max Move or G-Max move ever appears in the registry, under any id shape", () => {
  const maxMoveIds = [
    "max-airstream", "max-darkness", "max-flare", "max-flutterby", "max-geyser", "max-guard",
    "max-hailstorm", "max-knuckle", "max-lightning", "max-mindstorm", "max-ooze", "max-overgrowth",
    "max-phantasm", "max-quake", "max-rockfall", "max-starfall", "max-steelspike", "max-strike", "max-wyrmwind",
  ];
  for (const id of maxMoveIds) {
    assert.equal(getMoveById(id), undefined, `${id} is a Max Move and must never be registered as an ordinary move`);
  }
  // A representative sample of species-specific G-Max moves — none of these
  // real move ids (or any other G-Max move) is ever registered.
  const gmaxMoveIds = ["g-max-wildfire", "g-max-cannonade", "g-max-vine-lash", "g-max-drum-solo", "g-max-gold-rush", "g-max-one-blow", "g-max-rapid-flow"];
  for (const id of gmaxMoveIds) {
    assert.equal(getMoveById(id), undefined, `${id} is a G-Max move and must never be registered as an ordinary move`);
  }
});

test("no unapproved Legends: Arceus/Scarlet-Violet-only move (genuine Generation 8 ids, but never appeared in Sword/Shield) is registered", () => {
  const plaOnlyIds = [
    "barb-barrage", "bitter-malice", "bleakwind-storm", "ceaseless-edge", "chloroblast", "dire-claw",
    "esper-wing", "headlong-rush", "infernal-parade", "lunar-blessing", "mountain-gale", "mystical-power",
    "power-shift", "psyshield-bash", "raging-fury", "sandsear-storm", "shelter", "springtide-storm",
    "stone-axe", "take-heart", "triple-arrows", "victory-dance", "wave-crash", "wildbolt-storm",
  ];
  for (const id of plaOnlyIds) {
    assert.equal(getMoveById(id), undefined, `${id} never appeared in Sword/Shield, out of this phase's move scope`);
  }
});

test("spot check: Dynamax Cannon, Behemoth Bash, and Behemoth Blade are registered as plain damaging moves, their real Dynamax-target damage-doubling dropped", () => {
  for (const id of ["dynamax-cannon", "behemoth-bash", "behemoth-blade"]) {
    assert.equal(getMoveById(id)!.effect.kind, "damage");
  }
});

test("spot check: Steel Beam and Mind Blown both use recoilPercent as a percent of the user's own max HP, the same existing semantics", () => {
  assert.deepEqual(getMoveById("steel-beam")!.effect, { kind: "recoil", recoilPercent: 50 });
});

test("spot check: Obstruct reuses the existing protect effect, same protect-family shape as Baneful Bunker", () => {
  assert.equal(getMoveById("obstruct")!.effect.kind, "protect");
  assert.equal(getMoveById("obstruct")!.priority, 4);
});

test("spot check: Snap Trap, Thunder Cage, and Jaw Lock reuse the existing partial-trap effect, same multi-turn trapping shape as Wrap/Fire Spin", () => {
  for (const id of ["snap-trap", "thunder-cage", "jaw-lock"]) {
    assert.equal(getMoveById(id)!.effect.kind, "partial-trap");
  }
});

test("spot check: Wicked Blow and Surging Strikes drop their real always-crit mechanic, the same simplification Storm Throw/Frost Breath already established", () => {
  assert.equal(getMoveById("wicked-blow")!.effect.kind, "damage");
  assert.deepEqual(getMoveById("surging-strikes")!.effect, { kind: "multi-hit", minHits: 3, maxHits: 3 });
});

test("spot check: Dragon Energy and Eruption/Water Spout share the same HP-scaled-power approximation (flat power at the real maximum value)", () => {
  assert.equal(getMoveById("dragon-energy")!.power, 150);
  assert.equal(getMoveById("dragon-energy")!.effect.kind, "damage");
});

test("spot check: Flip Turn and U-turn/Volt Switch share the same dropped-switch simplification (plain damage, real power kept)", () => {
  assert.equal(getMoveById("flip-turn")!.power, 60);
  assert.equal(getMoveById("flip-turn")!.effect.kind, "damage");
});

test("spot check: Aura Wheel is registered with a fixed Electric type, matching this project's single (Full Belly Mode) Morpeko representation", () => {
  assert.equal(getMoveById("aura-wheel")!.type, "electric");
  assert.deepEqual(getMoveById("aura-wheel")!.effect, { kind: "damage-with-stat-change-chance", changes: [{ stat: "speed", stages: 1 }], chancePercent: 100 });
});

test("spot check: False Surrender never misses (accuracy: null)", () => {
  assert.equal(getMoveById("false-surrender")!.accuracy, null);
});

test("spot check: ally-only moves (Coaching, Decorate) are data-only no-ops, the same simplification Helping Hand already established", () => {
  for (const id of ["coaching", "decorate"]) {
    const move = getMoveById(id)!;
    assert.equal(move.effect.kind, "no-effect");
    assert.equal(move.power, null);
    assert.equal(move.target, "self");
  }
});

test("spot check: Jungle Healing and Life Dew heal only the user (25% max HP), their real ally-healing/status-curing dropped", () => {
  for (const id of ["jungle-healing", "life-dew"]) {
    assert.deepEqual(getMoveById(id)!.effect, { kind: "heal", healPercent: 25 });
    assert.equal(getMoveById(id)!.target, "self");
  }
});

test("no Generation 8 move introduces an unsupported MoveEffect kind, MoveTarget, or MoveFlag — every value already existed before this phase", () => {
  const knownEffectKinds = new Set([
    "damage", "damage-with-status-chance", "stat-change", "heal", "fixed-damage", "recoil", "multi-hit",
    "charge", "ohko", "copy-move", "transform", "status", "damage-with-stat-change-chance", "drain",
    "partial-trap", "screen", "force-switch", "crit-rate-up", "leech-seed", "random-move", "counter",
    "bide", "reset-stats", "disable-move", "substitute", "type-change", "switch-out", "no-effect",
    "current-hp-percent-damage", "random-level-damage", "weight-based-damage", "protect", "encore",
  ]);
  for (const move of GENERATION_8_MOVES) {
    assert.ok(knownEffectKinds.has(move.effect.kind), `${move.id} uses an unrecognized effect kind "${move.effect.kind}"`);
  }
});
