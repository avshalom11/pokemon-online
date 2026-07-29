import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import {
  buildBoostedCandidates,
  isLegendaryEncounterTestModeEnabled,
  resolveWildEncounter,
} from "./legendary-test-boost.ts";
import { ZONE_DATA } from "@/data/zones/zone-data";

const LEGENDARY_IDS = new Set(["articuno", "zapdos", "moltres", "mewtwo", "mew"]);

// @types/node types NODE_ENV as read-only (it's meant to be set once by the
// runtime), so mutating it for a test needs an escape hatch — this local
// mutable view is the only place that cast happens.
const mutableEnv = process.env as Record<string, string | undefined>;

// Every env-var-touching test restores both vars afterward so it can never
// leak state into an unrelated test file running later in the same process.
function withEnv(overrides: { NODE_ENV?: string; LEGENDARY_ENCOUNTER_TEST_MODE?: string }, run: () => void) {
  const original = {
    NODE_ENV: mutableEnv.NODE_ENV,
    LEGENDARY_ENCOUNTER_TEST_MODE: mutableEnv.LEGENDARY_ENCOUNTER_TEST_MODE,
  };
  try {
    if (overrides.NODE_ENV !== undefined) mutableEnv.NODE_ENV = overrides.NODE_ENV;
    if (overrides.LEGENDARY_ENCOUNTER_TEST_MODE !== undefined) {
      mutableEnv.LEGENDARY_ENCOUNTER_TEST_MODE = overrides.LEGENDARY_ENCOUNTER_TEST_MODE;
    }
    run();
  } finally {
    mutableEnv.NODE_ENV = original.NODE_ENV;
    if (original.LEGENDARY_ENCOUNTER_TEST_MODE === undefined) {
      delete mutableEnv.LEGENDARY_ENCOUNTER_TEST_MODE;
    } else {
      mutableEnv.LEGENDARY_ENCOUNTER_TEST_MODE = original.LEGENDARY_ENCOUNTER_TEST_MODE;
    }
  }
}

test("disabled by default: no env var set", () => {
  withEnv({ NODE_ENV: "development", LEGENDARY_ENCOUNTER_TEST_MODE: undefined }, () => {
    delete process.env.LEGENDARY_ENCOUNTER_TEST_MODE;
    assert.equal(isLegendaryEncounterTestModeEnabled(), false);
  });
});

test("disabled when the flag is any value other than the exact string \"true\"", () => {
  withEnv({ NODE_ENV: "development", LEGENDARY_ENCOUNTER_TEST_MODE: "1" }, () => {
    assert.equal(isLegendaryEncounterTestModeEnabled(), false);
  });
});

test("enabled only in development with the flag set to \"true\"", () => {
  withEnv({ NODE_ENV: "development", LEGENDARY_ENCOUNTER_TEST_MODE: "true" }, () => {
    assert.equal(isLegendaryEncounterTestModeEnabled(), true);
  });
});

test("never enabled in production, even if the flag is \"true\"", () => {
  withEnv({ NODE_ENV: "production", LEGENDARY_ENCOUNTER_TEST_MODE: "true" }, () => {
    assert.equal(isLegendaryEncounterTestModeEnabled(), false);
  });
});

test("zones with no legendary ZoneEncounter entry of their own (cave, beach) get no boosted candidate list", () => {
  assert.equal(buildBoostedCandidates("cave"), null);
  assert.equal(buildBoostedCandidates("beach"), null);
});

test("boosted candidates include every real production encounter for the zone; non-legendary weights stay unmodified, legendary weight is intentionally overridden", () => {
  const zone = ZONE_DATA.find((z) => z.id === "lava")!;
  const candidates = buildBoostedCandidates("lava")!;

  for (const encounter of zone.encounters) {
    const match = candidates.find((c) => c.pokemonId === encounter.pokemonId);
    assert.ok(match, `entry for ${encounter.pokemonId} must be present in the boosted candidate list`);

    if (LEGENDARY_IDS.has(encounter.pokemonId)) {
      // This is the whole point of the boost — its weight is deliberately
      // replaced to reach the ~20% legendary-tier share (see the dedicated
      // share-math test below), not preserved from ZONE_DATA.
      continue;
    }

    assert.equal(
      match!.weight,
      encounter.encounterWeight,
      `non-legendary entry for ${encounter.pokemonId} must keep its real, unmodified weight`
    );
  }
});

test("legendary tier weight is boosted on top of the zone's own non-legendary total, totaling ~20% combined probability (exact by construction)", () => {
  for (const zoneId of ["lava", "grassland", "water", "haunted-house"] as const) {
    const zone = ZONE_DATA.find((z) => z.id === zoneId)!;
    const nonLegendaryTotalWeight = zone.encounters
      .filter((e) => !LEGENDARY_IDS.has(e.pokemonId))
      .reduce((sum, e) => sum + e.encounterWeight, 0);

    const candidates = buildBoostedCandidates(zoneId)!;
    const legendaryWeight = candidates
      .filter((c) => LEGENDARY_IDS.has(c.pokemonId))
      .reduce((sum, c) => sum + c.weight, 0);
    const totalWeight = candidates.reduce((sum, c) => sum + c.weight, 0);

    assert.equal(totalWeight, nonLegendaryTotalWeight + legendaryWeight);
    const legendaryShare = legendaryWeight / totalWeight;
    assert.ok(
      Math.abs(legendaryShare - 0.2) < 1e-9,
      `${zoneId}: expected ~20% legendary share, got ${legendaryShare}`
    );
  }
});

test("boosting never offers a legendary that isn't already a real encounter entry in that zone", () => {
  // Grassland's only real legendary entry is Zapdos — Mew must never be a
  // candidate there, even though Mew is legendary-rarity and appears
  // elsewhere (haunted-house). Regression guard for the exact bug this
  // module used to have (a stale hardcoded zone->legendary table).
  const grasslandCandidates = buildBoostedCandidates("grassland")!;
  const grasslandLegendaryIds = grasslandCandidates
    .filter((c) => LEGENDARY_IDS.has(c.pokemonId))
    .map((c) => c.pokemonId);
  assert.deepEqual(grasslandLegendaryIds, ["zapdos"]);

  const hauntedHouseCandidates = buildBoostedCandidates("haunted-house")!;
  const hauntedHouseLegendaryIds = hauntedHouseCandidates
    .filter((c) => LEGENDARY_IDS.has(c.pokemonId))
    .map((c) => c.pokemonId)
    .sort();
  assert.deepEqual(hauntedHouseLegendaryIds, ["mew", "mewtwo"]);
});

test("no hardcoded zone->legendary table exists in this module (candidates are re-derived from ZONE_DATA every call)", () => {
  const source = readFileSync(new URL("./legendary-test-boost.ts", import.meta.url), "utf8");
  assert.ok(
    !/DEV_LEGENDARY_CANDIDATES_BY_ZONE/.test(source),
    "must never reintroduce a separate hardcoded zone->legendary id list"
  );
});

test("with test mode disabled, resolveWildEncounter's legendary rate is the real engine's own base rate, never the ~20% boost (weighting unchanged)", () => {
  // Since the encounter engine's own two-stage rarity architecture
  // (engine/encounter/pokemon-encounter-engine.ts) can legitimately draw a
  // legendary at whatever base rate data/encounter/rarity-config.ts
  // currently sets, "disabled" no longer means "never a legendary" — it
  // means "no extra boost on top of that base rate". A generous ceiling
  // well below the ~20% boosted target (asserted in the very next test)
  // is what actually distinguishes disabled from enabled, and stays true
  // regardless of how the base rarity config gets tuned later, as long as
  // legendary stays a genuinely rare tier.
  withEnv({ NODE_ENV: "development", LEGENDARY_ENCOUNTER_TEST_MODE: "false" }, () => {
    const trials = 1000;
    let legendaryCount = 0;
    for (let i = 0; i < trials; i++) {
      const result = resolveWildEncounter("lava");
      if (LEGENDARY_IDS.has(result.pokemon.id)) {
        assert.equal(result.pokemon.id, "moltres", "lava's only legendary entry is moltres");
        legendaryCount++;
      }
    }
    const observedRate = legendaryCount / trials;
    assert.ok(observedRate < 0.15, `disabled legendary rate ${observedRate} should stay well below the ~20% boost`);
  });
});

test("with test mode enabled in development, legendary probability is boosted to a reachable rate", () => {
  withEnv({ NODE_ENV: "development", LEGENDARY_ENCOUNTER_TEST_MODE: "true" }, () => {
    const trials = 2000;
    let legendaryCount = 0;
    for (let i = 0; i < trials; i++) {
      const result = resolveWildEncounter("lava");
      if (LEGENDARY_IDS.has(result.pokemon.id)) {
        assert.equal(result.pokemon.id, "moltres", "lava's only thematic legendary is moltres");
        legendaryCount++;
      }
    }
    const observedRate = legendaryCount / trials;
    // Statistical, not exact — generous band around the ~20% target so this
    // never flakes, while still catching a badly broken multiplier.
    assert.ok(observedRate > 0.1 && observedRate < 0.3, `observed legendary rate ${observedRate} not near 20%`);
  });
});

test("the boost's extra ~20% never activates in production even when explicitly enabled (only the engine's own base rate applies)", () => {
  withEnv({ NODE_ENV: "production", LEGENDARY_ENCOUNTER_TEST_MODE: "true" }, () => {
    const trials = 1000;
    let legendaryCount = 0;
    for (let i = 0; i < trials; i++) {
      const result = resolveWildEncounter("lava");
      if (LEGENDARY_IDS.has(result.pokemon.id)) {
        legendaryCount++;
      }
    }
    const observedRate = legendaryCount / trials;
    assert.ok(observedRate < 0.15, `production legendary rate ${observedRate} should stay well below the ~20% boost`);
  });
});

test("no Pokémon-specific legendary branching was introduced into the real encounter engine", () => {
  const engineSource = readFileSync(
    new URL("./pokemon-encounter-engine.ts", import.meta.url),
    "utf8"
  );
  for (const id of LEGENDARY_IDS) {
    assert.ok(!engineSource.includes(`"${id}"`), `pokemon-encounter-engine.ts must not reference "${id}"`);
  }
  assert.ok(
    !engineSource.includes("LEGENDARY_ENCOUNTER_TEST_MODE"),
    "the dev-only flag must never be read inside the real encounter engine"
  );
});
