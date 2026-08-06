// Focused regression tests for getEffectiveEncounterRarity — deliberately
// small, one test per rule that would silently break the feature (same
// "essential tests only" convention as data/pokemon/pokemon-evolutions.test.ts).
//
// Evolution Item Encounter Rarity audit fix: the very-rare override must
// never apply to a species whose real PokemonSpecies.rarity is already
// "legendary" — a legendary must never be downgraded. No current species
// is both a legendary AND an evolution-item target (confirmed below), so
// that specific branch can't be exercised end-to-end through real data;
// see the dedicated source-level test further down for why that's checked
// structurally instead of behaviorally, same "no jsdom, verify via a
// static source read" precedent
// features/pokedex/components/PokedexCard.test.ts and
// features/battle/components/BattleContent.rarity-display.test.ts already
// establish for an equivalent "can't exercise this branch via real
// runtime state" situation.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { getEffectiveEncounterRarity } from "./get-effective-encounter-rarity.ts";
import { POKEMON_DATA } from "@/data/pokemon/pokemon-data";
import { getAllEvolutionItemEvolutionEntries } from "@/data/pokemon/pokemon-evolutions";

function realRarityOf(speciesId: string): string | undefined {
  return POKEMON_DATA.find((species) => species.id === speciesId)?.rarity;
}

test("a common evolution-item target resolves to effective very-rare", () => {
  // exeggutor (Exeggcute -> Exeggutor via leaf-stone) is real rarity common.
  assert.equal(realRarityOf("exeggutor"), "common", "test assumption: exeggutor's real rarity is common");
  assert.equal(getEffectiveEncounterRarity("exeggutor"), "very-rare");
});

test("a rare evolution-item target resolves to effective very-rare", () => {
  // ninetales (Vulpix -> Ninetales via fire-stone) is real rarity rare.
  assert.equal(realRarityOf("ninetales"), "rare", "test assumption: ninetales's real rarity is rare");
  assert.equal(getEffectiveEncounterRarity("ninetales"), "very-rare");
});

test("an already-very-rare evolution-item target stays effective very-rare", () => {
  // raichu (Pikachu -> Raichu via thunder-stone) is already real very-rare.
  assert.equal(realRarityOf("raichu"), "very-rare", "test assumption: raichu's real rarity is already very-rare");
  assert.equal(getEffectiveEncounterRarity("raichu"), "very-rare");
});

test("a non-item-evolution species always keeps its own real catalog rarity", () => {
  // rattata never evolves via any item — its own real rarity must pass
  // through untouched.
  const itemEvolvedIds = new Set(getAllEvolutionItemEvolutionEntries().map((entry) => entry.evolution.evolvesToSpeciesId));
  assert.ok(!itemEvolvedIds.has("rattata"), "test assumption: rattata is not an evolution-item target");
  assert.equal(realRarityOf("rattata"), "common", "test assumption: rattata's real rarity is common");
  assert.equal(getEffectiveEncounterRarity("rattata"), "common");
});

test("a real legendary species that is NOT an evolution-item target still resolves to effective legendary", () => {
  const itemEvolvedIds = new Set(getAllEvolutionItemEvolutionEntries().map((entry) => entry.evolution.evolvesToSpeciesId));
  for (const id of ["articuno", "zapdos", "moltres", "mewtwo"]) {
    assert.equal(realRarityOf(id), "legendary", `test assumption: ${id}'s real rarity is legendary`);
    assert.ok(!itemEvolvedIds.has(id), `test assumption: ${id} is not an evolution-item target`);
    assert.equal(getEffectiveEncounterRarity(id), "legendary");
  }
});

test("no current evolution-item target is legendary (documents why the legendary-exemption branch can't be exercised end-to-end today)", () => {
  const itemEvolvedIds = getAllEvolutionItemEvolutionEntries().map((entry) => entry.evolution.evolvesToSpeciesId);
  for (const speciesId of itemEvolvedIds) {
    assert.notEqual(
      realRarityOf(speciesId),
      "legendary",
      `${speciesId} is an evolution-item target with real rarity legendary — this branch is now behaviorally testable, add a live assertion here instead of relying on the source-level guard below`
    );
  }
});

test("the very-rare override is gated behind catalogRarity !== \"legendary\" (source-level guard for the branch no current species can exercise)", () => {
  const source = readFileSync(new URL("./get-effective-encounter-rarity.ts", import.meta.url), "utf8");
  assert.ok(
    /ITEM_EVOLVED_SPECIES_IDS\.has\(speciesId\)\s*&&\s*catalogRarity !== "legendary"\s*\?\s*"very-rare"\s*:\s*catalogRarity/.test(source),
    "a legendary evolution-item target must never be downgraded to very-rare — the ternary must check catalogRarity !== \"legendary\" before overriding"
  );
});

test("ITEM_EVOLVED_SPECIES_IDS is still derived directly from EVOLUTION_ITEM_EVOLUTIONS — no hardcoded species list", () => {
  const source = readFileSync(new URL("./get-effective-encounter-rarity.ts", import.meta.url), "utf8");
  assert.ok(
    source.includes("getAllEvolutionItemEvolutionEntries().map((entry) => entry.evolution.evolvesToSpeciesId)"),
    "ITEM_EVOLVED_SPECIES_IDS must be built from getAllEvolutionItemEvolutionEntries, never a separate/duplicated species array"
  );
  assert.ok(!/const ITEM_EVOLVED_SPECIES_IDS[\s\S]{0,20}=\s*new Set\(\[/.test(source), "must never be a literal hardcoded array of species ids");
});

test("an unknown speciesId returns undefined, never an invented rarity", () => {
  assert.equal(getEffectiveEncounterRarity("not-a-real-species"), undefined);
});
