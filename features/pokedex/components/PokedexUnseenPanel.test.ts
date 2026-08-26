// POKÉDEX — LOCATION HINTS FOR UNSEEN POKÉMON. No React-render/DOM harness
// exists in this project (see PokedexCard.test.ts's own doc comment) — this
// checks the same invariants via a static source read instead of rendering.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const panelSrc = readFileSync(new URL("./PokedexUnseenPanel.tsx", import.meta.url), "utf8");

test("the location hint is derived from the real zone/encounter data — never a hardcoded per-species string", () => {
  assert.ok(panelSrc.includes('import { getSpeciesEncounterLocations } from "@/data/zones/zone-data";'));
  assert.ok(panelSrc.includes("getSpeciesEncounterLocations(species.id)"));
});

test("the rarity-specific copy comes from pokedex-location-messages.ts — no inline/duplicated Hebrew wording", () => {
  assert.ok(
    panelSrc.includes(
      'import { pokedexLocationHint, pokedexNoKnownLocationMessage } from "../messages/pokedex-location-messages";'
    )
  );
  assert.ok(panelSrc.includes("pokedexLocationHint(species.rarity, locations)"));
  assert.ok(panelSrc.includes("pokedexNoKnownLocationMessage"), "a species with no real zone match must fall back, never show a broken/empty hint");
});

test("the species' real name is never rendered — always the \"???\" placeholder", () => {
  assert.ok(panelSrc.includes(">???<"));
  assert.ok(!/\{species\.name\}/.test(panelSrc), "species.name must never be interpolated directly");
});

test("the sprite stays silhouetted (brightness-0), same as the card — no separate/revealing asset", () => {
  assert.ok(panelSrc.includes("brightness-0"));
});

test("no stats, moves, description, or evolution info is ever rendered here — those stay exclusive to PokedexDetailPanel", () => {
  assert.ok(!panelSrc.includes("species.description"));
  assert.ok(!panelSrc.includes("baseStats"));
  assert.ok(!panelSrc.includes("Evolution"));
  assert.ok(!panelSrc.includes("species.types"));
});
