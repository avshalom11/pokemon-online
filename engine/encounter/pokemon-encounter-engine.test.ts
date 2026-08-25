import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { startPokemonEncounter } from "./pokemon-encounter-engine.ts";
import { RARITY_ENCOUNTER_PROBABILITIES } from "@/data/encounter/rarity-config";
import { POKEMON_DATA } from "@/data/pokemon/pokemon-data";
import { KANTO_ZONE_DATA } from "@/data/zones/kanto-zone-data";
import { getEffectiveEncounterRarity } from "@/engine/encounter-rarity/get-effective-encounter-rarity";
import { isSpeciesEligibleForWildRange } from "@/engine/evolution-stage-scaling/species-eligibility";
import { getLegendaryWildLevelRangeForPlayerLevel } from "@/engine/player-level-scaling/legendary-wild-level-brackets.config";
import { getWildLevelRangeForPlayerLevel } from "@/engine/player-level-scaling/wild-level-bracket-lookup";
import type { PokemonRarity } from "@/shared/types/pokemon";
import type { ZoneId } from "@/shared/types/zone";

const RARITY_BY_ID: Map<string, PokemonRarity> = new Map(
  POKEMON_DATA.map((species) => [species.id, species.rarity])
);

// An arbitrary fixed player level used by every test below that doesn't
// itself care about level scaling (rarity/weight/fallback behavior) — only
// the dedicated level-range test cares about its exact value.
const TEST_PLAYER_LEVEL = 20;

// Mutates the live, shared RARITY_ENCOUNTER_PROBABILITIES object (the exact
// object the engine itself imports and reads) so a test can force Stage 1
// toward/away from a specific rarity without depending on whatever the
// project's current tunable placeholder numbers happen to be — future
// retuning of data/encounter/rarity-config.ts can never break these tests.
// Always restored in `finally` so no test leaks state into another.
function withRarityProbabilities(overrides: Partial<Record<PokemonRarity, number>>, run: () => void) {
  const original = { ...RARITY_ENCOUNTER_PROBABILITIES };
  try {
    Object.assign(RARITY_ENCOUNTER_PROBABILITIES, overrides);
    run();
  } finally {
    Object.assign(RARITY_ENCOUNTER_PROBABILITIES, original);
  }
}

test("throws for an unknown zone", () => {
  assert.throws(() => startPokemonEncounter("kanto", "not-a-real-zone" as ZoneId, TEST_PLAYER_LEVEL));
});

test("the returned level always falls within the player's own level bracket, never the picked encounter's stale zone min/max", () => {
  const { minimumLevel, maximumLevel } = getWildLevelRangeForPlayerLevel(TEST_PLAYER_LEVEL);

  // LEGENDARY ENCOUNTER LEVELS — lava has a legendary entry (moltres),
  // which now deliberately rolls from a SEPARATE table (see the dedicated
  // "LEGENDARY ENCOUNTER LEVELS" tests below) — excluded here (legendary
  // probability forced to 0, every other rarity left at its real default)
  // so this test keeps verifying exactly what it always has: the NORMAL
  // bracket path, untouched by that change.
  withRarityProbabilities({ legendary: 0 }, () => {
    for (let i = 0; i < 300; i++) {
      const result = startPokemonEncounter("kanto", "lava", TEST_PLAYER_LEVEL);
      assert.ok(
        result.level >= minimumLevel && result.level <= maximumLevel,
        `level ${result.level} outside player-level bracket [${minimumLevel}, ${maximumLevel}]`
      );
      assert.equal(result.zoneId, "lava");
    }
  });
});

test("a different player level produces levels from that level's own bracket, not the previous one", () => {
  const lowLevelRange = getWildLevelRangeForPlayerLevel(3);
  const highLevelRange = getWildLevelRangeForPlayerLevel(56);
  assert.notDeepEqual(lowLevelRange, highLevelRange, "test assumption: brackets differ");

  // LEGENDARY ENCOUNTER LEVELS — see the test above for why legendary is
  // excluded here.
  withRarityProbabilities({ legendary: 0 }, () => {
    for (let i = 0; i < 100; i++) {
      const result = startPokemonEncounter("kanto", "lava", 56);
      assert.ok(result.level >= highLevelRange.minimumLevel && result.level <= highLevelRange.maximumLevel);
    }
  });
});

// MAP — SELECTABLE WILD LEVEL RANGE
test("an explicit selectedWildLevelRange override is used in place of the player-level-derived bracket, but never bypasses evolution-stage eligibility", () => {
  // A deliberately low override range, independent of TEST_PLAYER_LEVEL's
  // own bracket (see getWildLevelRangeForPlayerLevel(TEST_PLAYER_LEVEL) in
  // the tests above) — proves the override, not the player level, drives
  // the roll whenever it's provided.
  const override = { minimumLevel: 2, maximumLevel: 4 };

  // LEGENDARY ENCOUNTER LEVELS — a legendary pick deliberately ignores
  // selectedWildLevelRange entirely (see the dedicated tests below) —
  // excluded here so this test keeps verifying the override's effect on
  // every OTHER rarity, unchanged.
  withRarityProbabilities({ legendary: 0 }, () => {
    for (let i = 0; i < 200; i++) {
      const result = startPokemonEncounter("kanto", "lava", TEST_PLAYER_LEVEL, override);
      assert.ok(
        result.level >= override.minimumLevel && result.level <= override.maximumLevel,
        `level ${result.level} outside the explicit override range [${override.minimumLevel}, ${override.maximumLevel}]`
      );
      // The final level must still respect this species' own evolution-stage
      // eligibility at the override range — never a species illegal there.
      assert.ok(isSpeciesEligibleForWildRange(result.pokemon.id, override));
    }
  });
});

test("omitting selectedWildLevelRange keeps the exact same behavior as before this feature existed", () => {
  const { minimumLevel, maximumLevel } = getWildLevelRangeForPlayerLevel(TEST_PLAYER_LEVEL);

  // LEGENDARY ENCOUNTER LEVELS — see the first test above for why legendary
  // is excluded here.
  withRarityProbabilities({ legendary: 0 }, () => {
    for (let i = 0; i < 100; i++) {
      const result = startPokemonEncounter("kanto", "lava", TEST_PLAYER_LEVEL);
      assert.ok(result.level >= minimumLevel && result.level <= maximumLevel);
    }
  });
});

test("Stage 1 reads probabilities from data/encounter/rarity-config.ts, never a literal object defined inline", () => {
  const engineSource = readFileSync(new URL("./pokemon-encounter-engine.ts", import.meta.url), "utf8");
  assert.ok(
    engineSource.includes('from "@/data/encounter/rarity-config"'),
    "the engine must import its rarity probabilities rather than define them"
  );
  assert.ok(
    !/RARITY_ENCOUNTER_PROBABILITIES\s*[:=]\s*\{/.test(engineSource),
    "the engine must not redefine/shadow the rarity probability config"
  );
});

test("no pity/streak mechanism: the legendary rate does not drift between an early run of calls and a later run", () => {
  // Behavioral check rather than a source-text keyword scan — a lexical
  // ban on words like "pity"/"streak" would also flag legitimate comments
  // that explain their absence. This instead directly demonstrates
  // statelessness: force a moderate, non-trivial legendary probability,
  // split a long run of calls into an early half and a late half, and
  // confirm both halves land near the SAME rate. A pity/streak/guarantee
  // mechanism would instead show the rate rising over time (or a hard
  // jump once some call-count threshold is crossed) — every call here
  // must draw from the exact same fixed distribution regardless of how
  // many calls came before it.
  withRarityProbabilities({ common: 80, rare: 0, "very-rare": 0, legendary: 20 }, () => {
    const trials = 6000;
    const half = trials / 2;
    let earlyLegendary = 0;
    let lateLegendary = 0;
    for (let i = 0; i < trials; i++) {
      const result = startPokemonEncounter("kanto", "haunted-house", TEST_PLAYER_LEVEL);
      const isLegendary = result.pokemon.id === "mew" || result.pokemon.id === "mewtwo";
      if (i < half) {
        if (isLegendary) earlyLegendary++;
      } else if (isLegendary) {
        lateLegendary++;
      }
    }
    const earlyRate = earlyLegendary / half;
    const lateRate = lateLegendary / half;
    // ~20% expected in both halves; a generous band avoids flakiness while
    // still catching any call-count-dependent (pity-style) skew.
    assert.ok(earlyRate > 0.12 && earlyRate < 0.28, `early-half rate ${earlyRate} not near 20%`);
    assert.ok(lateRate > 0.12 && lateRate < 0.28, `late-half rate ${lateRate} not near 20%`);
  });
});

test("encounterWeight only decides odds among species that are ALSO evolution-stage-eligible at the player's level: grassland's EFFECTIVE very-rare tier excludes Venusaur (legal range 32+, not reachable at this player level) and splits proportionally among the rest", () => {
  // Before Phase 2, grassland's very-rare tier was assumed to always offer
  // all five of Bulbasaur/Ivysaur/Venusaur/Raichu/Jolteon — no longer true:
  // Bulbasaur (1-15) and Venusaur (32+) can never be simultaneously legal
  // for any single player-level bracket, so "all five always eligible" is
  // not just wrong at TEST_PLAYER_LEVEL, it's structurally impossible at
  // ANY player level.
  //
  // Phase 3 additionally means this tier is no longer just "every real
  // PokemonSpecies.rarity: very-rare entry" — grassland also has stone-
  // evolved forms (Vileplume, Victreebel, Exeggutor) whose OWN
  // PokemonSpecies.rarity is "rare"/"common" but whose EFFECTIVE encounter
  // rarity is "very-rare" (getEffectiveEncounterRarity). This test derives
  // tier membership the same way the real engine's own Stage 2 grouping
  // does — by effective rarity, never real rarity — and asserts
  // encounterWeight still controls relative odds among exactly those.
  const playerRange = getWildLevelRangeForPlayerLevel(TEST_PLAYER_LEVEL);
  const grassland = KANTO_ZONE_DATA.find((zone) => zone.id === "grassland")!;
  const veryRareEncounters = grassland.encounters.filter(
    (encounter) => getEffectiveEncounterRarity(encounter.pokemonId) === "very-rare"
  );
  const eligibleEncounters = veryRareEncounters.filter((encounter) => isSpeciesEligibleForWildRange(encounter.pokemonId, playerRange));

  assert.ok(
    veryRareEncounters.some((encounter) => encounter.pokemonId === "venusaur"),
    "test assumption: grassland's effective very-rare tier includes venusaur"
  );
  assert.ok(
    !eligibleEncounters.some((encounter) => encounter.pokemonId === "venusaur"),
    "venusaur (legal range 32+) must not be eligible at this player level"
  );
  assert.ok(
    eligibleEncounters.some((encounter) => encounter.pokemonId === "ivysaur") &&
      eligibleEncounters.some((encounter) => encounter.pokemonId === "bulbasaur"),
    "test assumption: ivysaur and bulbasaur are both eligible at this player level"
  );
  // Regression guard for Phase 3 itself: a stone-evolved form whose OWN
  // species rarity is NOT "very-rare" (Exeggutor is real-rarity "common")
  // must still be grouped into this effective tier — otherwise this test
  // would keep passing even if getEffectiveEncounterRarity were never
  // actually wired into the engine's Stage 2 grouping.
  assert.ok(
    eligibleEncounters.some((encounter) => encounter.pokemonId === "exeggutor"),
    "test assumption: exeggutor (stone-evolved, real rarity common) is in the effective very-rare tier"
  );
  assert.equal(RARITY_BY_ID.get("exeggutor"), "common", "test assumption: exeggutor's OWN species rarity is unaffected");

  const totalEligibleWeight = eligibleEncounters.reduce((sum, encounter) => sum + encounter.encounterWeight, 0);

  withRarityProbabilities({ common: 0, rare: 0, "very-rare": 1, legendary: 0 }, () => {
    const counts: Record<string, number> = {};
    const trials = 4000;
    for (let i = 0; i < trials; i++) {
      const result = startPokemonEncounter("kanto", "grassland", TEST_PLAYER_LEVEL);
      // The TIER Stage 1 drew from is always effectively very-rare — but
      // the returned species' own PokemonSpecies.rarity (what battle UI/
      // capture actually read) is deliberately left untouched by Phase 3,
      // so it must never be asserted here.
      assert.equal(getEffectiveEncounterRarity(result.pokemon.id), "very-rare");
      assert.ok(
        eligibleEncounters.some((encounter) => encounter.pokemonId === result.pokemon.id),
        `${result.pokemon.id} is not evolution-stage-eligible at this player level and must never be returned`
      );
      counts[result.pokemon.id] = (counts[result.pokemon.id] ?? 0) + 1;
    }

    // At least one stone-evolved, non-"very-rare"-species result must
    // actually occur across 4000 trials — proving the effective-rarity
    // tier is genuinely reachable, not just theoretically eligible.
    assert.ok((counts.exeggutor ?? 0) > 0, "exeggutor must be reachable from the effective very-rare tier");

    // Ivysaur (weight 10) vs Bulbasaur (weight 5) — the same 2x-weight
    // relationship the original, pre-Phase-2 version of this test asserted,
    // still true among whichever species are currently eligible; expected
    // shares are derived from the real, currently-eligible total weight
    // rather than a hardcoded assumption, so future data changes can't make
    // this pass or fail for the wrong reason.
    const ivysaurShare = (counts.ivysaur ?? 0) / trials;
    const bulbasaurShare = (counts.bulbasaur ?? 0) / trials;
    const expectedIvysaurShare = (veryRareEncounters.find((e) => e.pokemonId === "ivysaur")!.encounterWeight) / totalEligibleWeight;
    const expectedBulbasaurShare = (veryRareEncounters.find((e) => e.pokemonId === "bulbasaur")!.encounterWeight) / totalEligibleWeight;

    assert.ok(
      Math.abs(ivysaurShare - expectedIvysaurShare) < 0.12,
      `ivysaur share ${ivysaurShare} not near expected ${expectedIvysaurShare}`
    );
    assert.ok(
      Math.abs(bulbasaurShare - expectedBulbasaurShare) < 0.12,
      `bulbasaur share ${bulbasaurShare} not near expected ${expectedBulbasaurShare}`
    );
    assert.ok(ivysaurShare > bulbasaurShare * 1.3, "ivysaur (weight 10) should clearly outpace bulbasaur (weight 5)");
  });
});

test("forcing a rarity to zero probability means it is never selected, even when the zone has entries for it", () => {
  withRarityProbabilities({ common: 1, rare: 0, "very-rare": 0, legendary: 0 }, () => {
    for (let i = 0; i < 300; i++) {
      const result = startPokemonEncounter("kanto", "grassland", TEST_PLAYER_LEVEL);
      assert.equal(RARITY_BY_ID.get(result.pokemon.id), "common");
    }
  });
});

test("haunted-house's two equal-weight legendary entries (Mew, Mewtwo) split roughly evenly when legendary is forced", () => {
  withRarityProbabilities({ common: 0, rare: 0, "very-rare": 0, legendary: 1 }, () => {
    const counts: Record<string, number> = { mew: 0, mewtwo: 0 };
    const trials = 2000;
    for (let i = 0; i < trials; i++) {
      const result = startPokemonEncounter("kanto", "haunted-house", TEST_PLAYER_LEVEL);
      assert.ok(result.pokemon.id === "mew" || result.pokemon.id === "mewtwo");
      counts[result.pokemon.id]++;
    }
    const mewShare = counts.mew / trials;
    assert.ok(mewShare > 0.35 && mewShare < 0.65, `expected a roughly even split, got mew share ${mewShare}`);
  });
});

test("fallback retry: a zone with no legendary or very-rare entries (cave) never crashes and never returns those tiers, even when they're forced heavily favored", () => {
  const zoneHasNoLegendaryOrVeryRare = !KANTO_ZONE_DATA.find((z) => z.id === "cave")!.encounters.some((e) =>
    ["very-rare", "legendary"].includes(RARITY_BY_ID.get(e.pokemonId) ?? "")
  );
  assert.ok(zoneHasNoLegendaryOrVeryRare, "test assumption: cave has no very-rare/legendary entries today");

  withRarityProbabilities({ common: 1, rare: 1, "very-rare": 1000, legendary: 1000 }, () => {
    for (let i = 0; i < 300; i++) {
      const result = startPokemonEncounter("kanto", "cave", TEST_PLAYER_LEVEL);
      const rarity = RARITY_BY_ID.get(result.pokemon.id);
      assert.ok(rarity === "common" || rarity === "rare", `cave must never yield ${rarity}`);
    }
  });
});

test("every PokemonRarity has a probability entry in the config", () => {
  const rarities: PokemonRarity[] = ["common", "rare", "very-rare", "legendary"];
  for (const rarity of rarities) {
    assert.equal(typeof RARITY_ENCOUNTER_PROBABILITIES[rarity], "number");
  }
});

// ===========================================================================
// LEGENDARY ENCOUNTER LEVELS — post-selection level range only. Rarity
// chance, rarity weights, zone encounter weights, and species selection
// itself are proven unaffected by the pre-existing legendary-focused tests
// above (e.g. "haunted-house's two equal-weight legendary entries...split
// roughly evenly when legendary is forced" — still passing unmodified);
// these tests cover only the new, separate level range.
// ===========================================================================

test("a forced legendary pick rolls its level from LEGENDARY_WILD_LEVEL_BRACKETS, not the normal player-level bracket", () => {
  const normalRange = getWildLevelRangeForPlayerLevel(TEST_PLAYER_LEVEL);
  const legendaryRange = getLegendaryWildLevelRangeForPlayerLevel(TEST_PLAYER_LEVEL);
  assert.notDeepEqual(legendaryRange, normalRange, "test assumption: the two tables differ at this player level");

  withRarityProbabilities({ common: 0, rare: 0, "very-rare": 0, legendary: 1 }, () => {
    for (let i = 0; i < 300; i++) {
      const result = startPokemonEncounter("kanto", "haunted-house", TEST_PLAYER_LEVEL);
      assert.equal(RARITY_BY_ID.get(result.pokemon.id), "legendary");
      assert.ok(
        result.level >= legendaryRange.minimumLevel && result.level <= legendaryRange.maximumLevel,
        `legendary level ${result.level} outside its own bracket [${legendaryRange.minimumLevel}, ${legendaryRange.maximumLevel}]`
      );
    }
  });
});

test("a different player level produces legendary levels from THAT level's own legendary bracket, converging toward the normal table's own top bracket by player 56+", () => {
  const lowRange = getLegendaryWildLevelRangeForPlayerLevel(3);
  const highRange = getLegendaryWildLevelRangeForPlayerLevel(56);
  assert.deepEqual(lowRange, { minimumLevel: 15, maximumLevel: 20 });
  assert.deepEqual(highRange, { minimumLevel: 53, maximumLevel: 60 });
  // Converges into the SAME range as the normal table's own top bracket —
  // never a separate, ever-diverging endpoint.
  assert.deepEqual(highRange, getWildLevelRangeForPlayerLevel(56));

  withRarityProbabilities({ common: 0, rare: 0, "very-rare": 0, legendary: 1 }, () => {
    for (let i = 0; i < 100; i++) {
      const result = startPokemonEncounter("kanto", "haunted-house", 56);
      assert.ok(result.level >= highRange.minimumLevel && result.level <= highRange.maximumLevel);
    }
  });
});

test("a legendary pick completely ignores selectedWildLevelRange — it is never scaled by the player's manually-selected normal bracket, only their real playerLevel", () => {
  const lowOverride = { minimumLevel: 2, maximumLevel: 4 };
  const legendaryRange = getLegendaryWildLevelRangeForPlayerLevel(TEST_PLAYER_LEVEL);

  withRarityProbabilities({ common: 0, rare: 0, "very-rare": 0, legendary: 1 }, () => {
    for (let i = 0; i < 100; i++) {
      const result = startPokemonEncounter("kanto", "haunted-house", TEST_PLAYER_LEVEL, lowOverride);
      assert.ok(
        result.level >= legendaryRange.minimumLevel && result.level <= legendaryRange.maximumLevel,
        `legendary level ${result.level} must stay within its own bracket [${legendaryRange.minimumLevel}, ${legendaryRange.maximumLevel}], never the override [${lowOverride.minimumLevel}, ${lowOverride.maximumLevel}]`
      );
    }
  });
});

test("LEGENDARY_WILD_LEVEL_BRACKETS matches this task's own required table exactly", () => {
  const expected: Array<[number, { minimumLevel: number; maximumLevel: number }]> = [
    [1, { minimumLevel: 15, maximumLevel: 20 }],
    [6, { minimumLevel: 15, maximumLevel: 22 }],
    [11, { minimumLevel: 17, maximumLevel: 25 }],
    [16, { minimumLevel: 20, maximumLevel: 28 }],
    [21, { minimumLevel: 23, maximumLevel: 31 }],
    [26, { minimumLevel: 27, maximumLevel: 35 }],
    [31, { minimumLevel: 31, maximumLevel: 39 }],
    [36, { minimumLevel: 35, maximumLevel: 43 }],
    [41, { minimumLevel: 40, maximumLevel: 48 }],
    [46, { minimumLevel: 44, maximumLevel: 53 }],
    [51, { minimumLevel: 49, maximumLevel: 58 }],
    [56, { minimumLevel: 53, maximumLevel: 60 }],
  ];
  for (const [playerLevel, range] of expected) {
    assert.deepEqual(getLegendaryWildLevelRangeForPlayerLevel(playerLevel), range, `player level ${playerLevel}`);
  }
});
