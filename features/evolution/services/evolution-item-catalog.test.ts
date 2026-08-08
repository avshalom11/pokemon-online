// Focused regression tests for the Shop/Inventory "Evolves:" derivation —
// pure, no DB, no React. Must always match data/pokemon/pokemon-evolutions.ts
// live, never a hardcoded per-item list (see this module's own doc comment).
import assert from "node:assert/strict";
import { test } from "node:test";

import { getEvolutionItemDisplayLabels, getEvolutionItemMappings } from "./evolution-item-catalog.ts";
import { getSpeciesById } from "@/features/pokemon/services/species-catalog";
import { SHOP_ITEMS } from "@/features/shop/data/shop-items";

test("a single-target item lists each eligible species by its plain name", () => {
  const labels = getEvolutionItemDisplayLabels("fire-stone");

  // Unova Phase 2 adds Pansear -> Simisear (Fire Stone) alongside the
  // pre-existing Kanto/Sinnoh fire-stone species.
  assert.deepEqual([...labels].sort(), ["Eevee", "Growlithe", "Magmar", "Pansear", "Vulpix"].sort());
});

test("Clamperl's Water Stone branch is shown as two disambiguated 'Species → Target' entries, never one ambiguous 'Clamperl'", () => {
  const labels = getEvolutionItemDisplayLabels("water-stone");

  assert.ok(labels.includes("Clamperl → Huntail"), "must list the Huntail branch explicitly");
  assert.ok(labels.includes("Clamperl → Gorebyss"), "must list the Gorebyss branch explicitly");
  assert.ok(!labels.includes("Clamperl"), "must never list Clamperl alone once it has two branches for this item");
});

test("an item nothing evolves with returns an empty list", () => {
  assert.deepEqual(getEvolutionItemDisplayLabels("poke-ball"), []);
});

test("Moon Stone lists every remapped/original species sharing it, including Happiny (Evolution Item Cleanup remap)", () => {
  const labels = getEvolutionItemDisplayLabels("moon-stone");

  for (const name of ["Nidorina", "Nidorino", "Clefairy", "Jigglypuff", "Skitty", "Happiny"]) {
    assert.ok(labels.includes(name), `${name} must be listed under Moon Stone`);
  }
});

// ============================================================================
// getEvolutionItemMappings — Shop UI Redesign phase: the uncollapsed
// source->target rows the question-mark info dialog renders. Never
// collapsed (unlike getEvolutionItemDisplayLabels above), so every branch
// always gets its own explicit row.
// ============================================================================

test("Water Stone's mappings include both Clamperl branches as two separate, unambiguous rows", () => {
  const mappings = getEvolutionItemMappings("water-stone");
  const clamperlRows = mappings.filter((mapping) => mapping.sourceSpeciesId === "clamperl");

  assert.equal(clamperlRows.length, 2, "Clamperl must appear as two separate rows, never collapsed into one");
  assert.deepEqual(
    clamperlRows.map((row) => row.targetSpeciesId).sort(),
    ["gorebyss", "huntail"]
  );
  assert.ok(clamperlRows.some((row) => row.sourceName === "Clamperl" && row.targetName === "Huntail"));
  assert.ok(clamperlRows.some((row) => row.sourceName === "Clamperl" && row.targetName === "Gorebyss"));
});

test("Thunder Stone's mappings include Electabuzz -> Electivire and the Kalos evolution correction Helioptile -> Heliolisk", () => {
  const mappings = getEvolutionItemMappings("thunder-stone");
  assert.ok(mappings.some((row) => row.sourceName === "Electabuzz" && row.targetName === "Electivire"));
  assert.ok(mappings.some((row) => row.sourceName === "Helioptile" && row.targetName === "Heliolisk"));
});

test("Fire Stone's mappings include Magmar -> Magmortar", () => {
  const mappings = getEvolutionItemMappings("fire-stone");
  assert.ok(mappings.some((row) => row.sourceName === "Magmar" && row.targetName === "Magmortar"));
});

test("Upgrade's mappings show both Porygon stages as distinct rows: Porygon -> Porygon2 and Porygon2 -> Porygon-Z", () => {
  const mappings = getEvolutionItemMappings("upgrade");

  assert.ok(mappings.some((row) => row.sourceName === "Porygon" && row.targetName === "Porygon2"));
  assert.ok(mappings.some((row) => row.sourceName === "Porygon2" && row.targetName === "Porygon-Z"));
  assert.equal(mappings.length, 2, "Upgrade must have exactly these two mappings, no more");
});

test("mappings are sorted by the source species' own dexNumber, for a stable Pokédex-familiar reading order", () => {
  const mappings = getEvolutionItemMappings("water-stone");
  const dexNumbers = mappings.map((row) => getSpeciesById(row.sourceSpeciesId)?.dexNumber ?? Number.POSITIVE_INFINITY);

  for (let i = 1; i < dexNumbers.length; i++) {
    assert.ok(dexNumbers[i - 1] <= dexNumbers[i], `mappings must be non-decreasing by source dexNumber, got ${dexNumbers}`);
  }
});

test("an item nothing evolves with returns an empty mapping list", () => {
  assert.deepEqual(getEvolutionItemMappings("poke-ball"), []);
});

test("Shiny Stone's mappings auto-pick up all three Kalos Phase 2 additions (Eevee -> Sylveon, Spritzee -> Aromatisse, Swirlix -> Slurpuff) alongside pre-existing species, with no hardcoded Kalos-specific code", () => {
  const labels = getEvolutionItemDisplayLabels("shiny-stone");

  for (const name of ["Roselia", "Togetic", "Minccino", "Eevee", "Spritzee", "Swirlix"]) {
    assert.ok(labels.includes(name), `${name} must be listed under Shiny Stone`);
  }

  const mappings = getEvolutionItemMappings("shiny-stone");
  assert.ok(mappings.some((row) => row.sourceName === "Eevee" && row.targetName === "Sylveon"));
  assert.ok(mappings.some((row) => row.sourceName === "Spritzee" && row.targetName === "Aromatisse"));
  assert.ok(mappings.some((row) => row.sourceName === "Swirlix" && row.targetName === "Slurpuff"));
});

test("Dusk Stone's mappings auto-pick up the Kalos Phase 2 addition (Doublade -> Aegislash) alongside pre-existing species", () => {
  const labels = getEvolutionItemDisplayLabels("dusk-stone");

  for (const name of ["Misdreavus", "Murkrow", "Gligar", "Lampent", "Doublade"]) {
    assert.ok(labels.includes(name), `${name} must be listed under Dusk Stone`);
  }

  const mappings = getEvolutionItemMappings("dusk-stone");
  assert.ok(mappings.some((row) => row.sourceName === "Doublade" && row.targetName === "Aegislash"));
});

test("Sun Stone's mappings are unaffected by Kalos — still only the pre-existing species; Helioptile was corrected onto Thunder Stone, never Sun Stone", () => {
  const labels = getEvolutionItemDisplayLabels("sun-stone");

  for (const name of ["Sunkern", "Gloom", "Cottonee", "Petilil"]) {
    assert.ok(labels.includes(name), `${name} must be listed under Sun Stone`);
  }
  assert.ok(!labels.includes("Helioptile"), "Helioptile must no longer be listed under Sun Stone after the evolution correction");

  const mappings = getEvolutionItemMappings("sun-stone");
  assert.ok(!mappings.some((row) => row.sourceName === "Helioptile"), "Sun Stone must have no Helioptile mapping");
});

test("every one of the Shop's 16 evolution products has at least one mapping row", () => {
  const evolutionProductIds = SHOP_ITEMS.filter((item) => item.categoryId === "stones").map((item) => item.id);
  assert.equal(evolutionProductIds.length, 16);

  for (const itemId of evolutionProductIds) {
    const mappings = getEvolutionItemMappings(itemId);
    assert.ok(mappings.length > 0, `${itemId} must have at least one evolution mapping`);
  }
});
