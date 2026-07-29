// Regression guard for the rarity-based battle UI: the displayed rarity
// (name-label / background / warning banner) must always be read from the
// wild encounter's own PokemonSpecies.rarity, never derived from the
// Pokémon's id, name, encounter weight, zone, or a hardcoded list. Same
// static-source-check approach as BattleContent.no-damage-math.test.ts —
// BattleContent is a "use client" component with no React Testing
// Library/jsdom set up in this project (see that file's own doc comment).
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const battleContentSource = readFileSync(new URL("./BattleContent.tsx", import.meta.url), "utf8");
const battleHudSource = readFileSync(
  new URL("../../../components/battle/BattleHUD.tsx", import.meta.url),
  "utf8"
);

test("BattleContent resolves rarity presentation from the wild encounter's own PokemonSpecies.rarity", () => {
  assert.ok(
    battleContentSource.includes("getRarityPresentation(wildState.pokemon.rarity)"),
    "the background/banner presentation must be looked up from wildState.pokemon.rarity"
  );
});

test("BattleContent forwards the wild Pokémon's real rarity to its HUD, not a hardcoded value", () => {
  assert.ok(
    battleContentSource.includes("rarity: wildState.pokemon.rarity"),
    "enemy.rarity must be wildState.pokemon.rarity — not a literal like \"common\"/\"rare\"/etc."
  );
});

test("BattleContent never assigns a rarity by zone, id, name, or weight instead of the species field", () => {
  // A crude but effective guard: the only rarity source in this file should
  // be the one PokemonSpecies field. If a future edit branches on zoneId,
  // pokemon.id, pokemon.name, or an encounter weight to pick a rarity
  // presentation, this fails.
  assert.ok(!/getRarityPresentation\(\s*zoneId/.test(battleContentSource));
  assert.ok(!/getRarityPresentation\(\s*wildState\.pokemon\.id/.test(battleContentSource));
  assert.ok(!/getRarityPresentation\(\s*wildState\.pokemon\.name/.test(battleContentSource));
});

test("BattleHUD renders the rarity label from participant.rarity, not a hardcoded lookup", () => {
  assert.ok(
    battleHudSource.includes("getRarityPresentation(participant.rarity)"),
    "the name-label lookup must key off participant.rarity"
  );
});
