import assert from "node:assert/strict";
import { test } from "node:test";

import { GENERATION_7_MOVES } from "./index.ts";
import { moveSchema } from "../../schemas/move-schema.ts";
import { getMoveById, getAllMoves } from "../../registry/move-registry.ts";

// Generation 7 (Alola Moves & Learnsets Phase 3) introduces 54 new moves —
// the task's own explicit 49-move example list (Accelerock through Zing
// Zap, plus the Ultra Sun/Ultra Moon-era Mind Blown/Photon Geyser/Plasma
// Fists) plus the remaining 5 genuine Generation 7 moves needed for full
// Sun/Moon and Ultra Sun/Ultra Moon coverage (Solar Blade, Psychic
// Terrain, Fleur Cannon, Stomping Tantrum, Prismatic Laser). None of them
// collide with an existing Generation 1-6 move id, so this file's own
// total is the full 54, not a reduced count.
//
// Deliberately EXCLUDED (verified against research before this file was
// written, never added anywhere in this project): every Z-Move (the 18
// generic type Z-Moves — Breakneck Blitz, Corkscrew Crash, Bloom Doom,
// etc. — and the 17 signature Z-Moves — Sinister Arrow Raid, Guardian of
// Alola, Let's Snuggle Forever, Clangorous Soulblaze, Stoked Sparksurfer,
// Catastropika, 10,000,000 Volt Thunderbolt, and the rest), since Z-Moves
// are never ordinary learnable moves in the real games — they're a
// held-item-triggered upgrade of an existing move, not a species'
// level-up/TM/tutor movepool entry, and this phase explicitly excludes the
// entire Z-Move subsystem. Also excluded: the 13 Let's Go Pikachu/Eevee
// "Partner Power" moves (Pika Papow, Zippy Zap, Veevee Volley, etc.) and
// Double Iron Bash — genuine Generation 7 move ids, but they debuted in
// Let's Go Pikachu!/Let's Go Eevee!, never in Sun/Moon or Ultra Sun/Ultra
// Moon, and are outside this phase's Sun/Moon-and-USUM scope.
const EXPECTED_GENERATION_7_MOVE_COUNT = 54;

test("exactly 54 Generation 7 moves are loaded", () => {
  assert.equal(GENERATION_7_MOVES.length, EXPECTED_GENERATION_7_MOVE_COUNT);
});

test("there are no duplicate move ids", () => {
  const ids = GENERATION_7_MOVES.map((move) => move.id);
  const uniqueIds = new Set(ids);
  const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
  assert.equal(uniqueIds.size, ids.length, `duplicate ids found: ${[...new Set(duplicates)].join(", ")}`);
});

test("every move passes Zod validation", () => {
  const failures: string[] = [];
  for (const move of GENERATION_7_MOVES) {
    const result = moveSchema.safeParse(move);
    if (!result.success) {
      failures.push(`${move.id}: ${JSON.stringify(result.error.issues)}`);
    }
  }
  assert.deepEqual(failures, []);
});

test("every move has generation 7 and introducedGeneration 7", () => {
  assert.ok(GENERATION_7_MOVES.every((move) => move.generation === 7));
  assert.ok(GENERATION_7_MOVES.every((move) => move.introducedGeneration === 7));
});

test("every move is marked data-only (no mechanics are implemented yet)", () => {
  assert.ok(GENERATION_7_MOVES.every((move) => move.implementationStatus === "data-only"));
});

test("every Generation 7 move appears in the real registry by id", () => {
  for (const move of GENERATION_7_MOVES) {
    assert.equal(getMoveById(move.id)?.id, move.id);
  }
});

test("getAllMoves() includes the full Generation 7 set alongside Generation 1/2/3/4/5/6", () => {
  assert.equal(getAllMoves().filter((move) => move.generation === 7).length, GENERATION_7_MOVES.length);
});

test("no Generation 7 move id collides with an existing Generation 1/2/3/4/5/6 move id", () => {
  const gen7Ids = new Set(GENERATION_7_MOVES.map((move) => move.id));
  const olderIds = getAllMoves().filter((move) => move.generation !== 7).map((move) => move.id);
  const collisions = olderIds.filter((id) => gen7Ids.has(id));
  assert.deepEqual(collisions, []);
});

test("every Generation 7 move has a real, already-supported MoveType — no schema change was required", () => {
  const validTypes = new Set([
    "normal", "fire", "water", "electric", "grass", "ice", "fighting", "poison",
    "ground", "flying", "psychic", "bug", "rock", "ghost", "dragon", "dark", "steel", "fairy",
  ]);
  for (const move of GENERATION_7_MOVES) {
    assert.ok(validTypes.has(move.type), `${move.id} has unsupported type "${move.type}"`);
  }
});

test("no genuine Z-Move ever appears in the registry, under any id shape", () => {
  const zMoveIds = [
    "breakneck-blitz", "all-out-pummeling", "supersonic-skystrike", "acid-downpour", "tectonic-rage",
    "continental-crush", "savage-spin-out", "never-ending-nightmare", "corkscrew-crash", "inferno-overdrive",
    "hydro-vortex", "bloom-doom", "gigavolt-havoc", "shattered-psyche", "subzero-slammer", "devastating-drake",
    "black-hole-eclipse", "twinkle-tackle", "catastropika", "10000000-volt-thunderbolt", "stoked-sparksurfer",
    "sinister-arrow-raid", "malicious-moonsault", "oceanic-operetta", "splintered-stormshards",
    "lets-snuggle-forever", "clangorous-soulblaze", "guardian-of-alola", "searing-sunraze-smash",
    "menacing-moonraze-maelstrom", "light-that-burns-the-sky", "soul-stealing-7-star-strike",
    "extreme-evoboost", "genesis-supernova", "pulverizing-pancake",
  ];
  for (const id of zMoveIds) {
    assert.equal(getMoveById(id), undefined, `${id} is a Z-Move and must never be registered as an ordinary move`);
  }
});

test("no Let's Go Pikachu/Eevee-exclusive move (genuine Generation 7 ids, but out of this phase's Sun/Moon/USUM scope) is registered", () => {
  const letsGoIds = [
    "pika-papow", "zippy-zap", "splishy-splash", "floaty-fall",
    "veevee-volley", "buzzy-buzz", "bouncy-bubble", "sizzly-slide",
    "glitzy-glow", "baddy-bad", "sappy-seed", "freezy-frost", "sparkly-swirl",
    "double-iron-bash",
  ];
  for (const id of letsGoIds) {
    assert.equal(getMoveById(id), undefined, `${id} is a Let's Go-exclusive move, out of this phase's Sun/Moon/USUM scope`);
  }
});

// Spot checks against known canonical data, matching generation-6's own
// "sourced from known move data" precedent.
test("spot check: Baneful Bunker and Shell Trap reuse the existing protect/plain-damage effects respectively, same simplification family as prior generations' protect-family moves", () => {
  assert.equal(getMoveById("baneful-bunker")!.effect.kind, "protect");
  assert.equal(getMoveById("baneful-bunker")!.priority, 4);
  assert.equal(getMoveById("shell-trap")!.effect.kind, "damage");
  assert.equal(getMoveById("shell-trap")!.priority, -3);
});

test("spot check: Solar Blade reuses the existing charge-shaped two-turn effect, same as Solar Beam", () => {
  assert.deepEqual(getMoveById("solar-blade")!.effect, { kind: "charge", invulnerable: false });
});

test("spot check: unsupported-mechanic moves (terrain, redirection, stat-value-swap, move-repetition, ability-gated) are registered but data-only no-op", () => {
  for (const id of ["psychic-terrain", "spotlight", "speed-swap", "instruct", "gear-up"]) {
    const move = getMoveById(id)!;
    assert.equal(move.effect.kind, "no-effect");
    assert.equal(move.power, null);
  }
});

test("spot check: Mind Blown is a 50%-max-HP recoil move, matching this project's own recoilPercent-as-percent-of-max-HP semantics exactly", () => {
  assert.deepEqual(getMoveById("mind-blown")!.effect, { kind: "recoil", recoilPercent: 50 });
});

test("spot check: Fleur Cannon is a guaranteed (100%) self-Sp.-Atk-drawback move, matching the existing Overheat/Psycho Boost convention", () => {
  assert.deepEqual(getMoveById("fleur-cannon")!.effect, {
    kind: "damage-with-stat-change-chance",
    changes: [{ stat: "specialAttack", stages: -2 }],
    chancePercent: 100,
  });
});

test("spot check: Fire Lash/Lunge/Trop Kick/Ice Hammer are all guaranteed (100%) stat-change-on-damage moves", () => {
  assert.deepEqual(getMoveById("fire-lash")!.effect, {
    kind: "damage-with-stat-change-chance",
    changes: [{ stat: "defense", stages: -1 }],
    chancePercent: 100,
  });
  assert.deepEqual(getMoveById("lunge")!.effect, {
    kind: "damage-with-stat-change-chance",
    changes: [{ stat: "attack", stages: -1 }],
    chancePercent: 100,
  });
  assert.deepEqual(getMoveById("trop-kick")!.effect, {
    kind: "damage-with-stat-change-chance",
    changes: [{ stat: "attack", stages: -1 }],
    chancePercent: 100,
  });
  assert.deepEqual(getMoveById("ice-hammer")!.effect, {
    kind: "damage-with-stat-change-chance",
    changes: [{ stat: "speed", stages: -1 }],
    chancePercent: 100,
  });
});

test("spot check: Nature's Madness reuses the existing current-HP-percentage damage effect, same family as Super Fang", () => {
  assert.deepEqual(getMoveById("natures-madness")!.effect, { kind: "current-hp-percent-damage", percent: 50 });
});

test("spot check: Multi-Attack and Revelation Dance are registered with a fixed Normal type, their real per-user type-changing dropped", () => {
  assert.equal(getMoveById("multi-attack")!.type, "normal");
  assert.equal(getMoveById("multi-attack")!.power, 90, "Generation 7 base power, before a later generation's balance buff to 120");
  assert.equal(getMoveById("revelation-dance")!.type, "normal");
});

test("spot check: Smart Strike never misses (accuracy: null)", () => {
  assert.equal(getMoveById("smart-strike")!.accuracy, null);
});

test("priority moves carry their real priority value directly on the schema field, no special effect kind needed", () => {
  assert.equal(getMoveById("accelerock")!.priority, 1);
  assert.equal(getMoveById("first-impression")!.priority, 2);
  assert.equal(getMoveById("spotlight")!.priority, 3);
  assert.equal(getMoveById("baneful-bunker")!.priority, 4);
  assert.equal(getMoveById("beak-blast")!.priority, -3);
  assert.equal(getMoveById("shell-trap")!.priority, -3);
});
