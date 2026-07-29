import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { startPokemonEncounter } from "./pokemon-encounter-engine.ts";
import { RARITY_ENCOUNTER_PROBABILITIES } from "@/data/encounter/rarity-config";
import { POKEMON_DATA } from "@/data/pokemon/pokemon-data";
import { ZONE_DATA } from "@/data/zones/zone-data";
import type { PokemonRarity } from "@/shared/types/pokemon";
import type { ZoneId } from "@/shared/types/zone";

const RARITY_BY_ID: Map<string, PokemonRarity> = new Map(
  POKEMON_DATA.map((species) => [species.id, species.rarity])
);

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
  assert.throws(() => startPokemonEncounter("not-a-real-zone" as ZoneId));
});

test("the returned level always falls within the picked encounter's own min/max range for that zone", () => {
  for (let i = 0; i < 300; i++) {
    const result = startPokemonEncounter("lava");
    const ownEntry = ZONE_DATA.find((z) => z.id === "lava")!.encounters.find(
      (e) => e.pokemonId === result.pokemon.id
    )!;
    assert.ok(result.level >= ownEntry.minimumLevel && result.level <= ownEntry.maximumLevel);
    assert.equal(result.zoneId, "lava");
  }
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
      const result = startPokemonEncounter("haunted-house");
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

test("encounterWeight only decides odds within the same rarity: grassland's very-rare tier (ivysaur weight 10 vs bulbasaur/venusaur/raichu/jolteon weight 5 each) splits proportionally", () => {
  withRarityProbabilities({ common: 0, rare: 0, "very-rare": 1, legendary: 0 }, () => {
    const counts: Record<string, number> = {};
    const trials = 4000;
    for (let i = 0; i < trials; i++) {
      const result = startPokemonEncounter("grassland");
      assert.equal(RARITY_BY_ID.get(result.pokemon.id), "very-rare");
      counts[result.pokemon.id] = (counts[result.pokemon.id] ?? 0) + 1;
    }
    // Total very-rare weight in grassland is 5+10+5+5+5 = 30, so ivysaur
    // (weight 10) should land close to double any of the weight-5 entries.
    const ivysaurShare = (counts.ivysaur ?? 0) / trials;
    const bulbasaurShare = (counts.bulbasaur ?? 0) / trials;
    assert.ok(ivysaurShare > 0.2 && ivysaurShare < 0.45, `ivysaur share ${ivysaurShare} not near 1/3`);
    assert.ok(bulbasaurShare > 0.08 && bulbasaurShare < 0.25, `bulbasaur share ${bulbasaurShare} not near 1/6`);
    assert.ok(ivysaurShare > bulbasaurShare * 1.3, "ivysaur (weight 10) should clearly outpace bulbasaur (weight 5)");
  });
});

test("forcing a rarity to zero probability means it is never selected, even when the zone has entries for it", () => {
  withRarityProbabilities({ common: 1, rare: 0, "very-rare": 0, legendary: 0 }, () => {
    for (let i = 0; i < 300; i++) {
      const result = startPokemonEncounter("grassland");
      assert.equal(RARITY_BY_ID.get(result.pokemon.id), "common");
    }
  });
});

test("haunted-house's two equal-weight legendary entries (Mew, Mewtwo) split roughly evenly when legendary is forced", () => {
  withRarityProbabilities({ common: 0, rare: 0, "very-rare": 0, legendary: 1 }, () => {
    const counts: Record<string, number> = { mew: 0, mewtwo: 0 };
    const trials = 2000;
    for (let i = 0; i < trials; i++) {
      const result = startPokemonEncounter("haunted-house");
      assert.ok(result.pokemon.id === "mew" || result.pokemon.id === "mewtwo");
      counts[result.pokemon.id]++;
    }
    const mewShare = counts.mew / trials;
    assert.ok(mewShare > 0.35 && mewShare < 0.65, `expected a roughly even split, got mew share ${mewShare}`);
  });
});

test("fallback retry: a zone with no legendary or very-rare entries (cave) never crashes and never returns those tiers, even when they're forced heavily favored", () => {
  const zoneHasNoLegendaryOrVeryRare = !ZONE_DATA.find((z) => z.id === "cave")!.encounters.some((e) =>
    ["very-rare", "legendary"].includes(RARITY_BY_ID.get(e.pokemonId) ?? "")
  );
  assert.ok(zoneHasNoLegendaryOrVeryRare, "test assumption: cave has no very-rare/legendary entries today");

  withRarityProbabilities({ common: 1, rare: 1, "very-rare": 1000, legendary: 1000 }, () => {
    for (let i = 0; i < 300; i++) {
      const result = startPokemonEncounter("cave");
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
