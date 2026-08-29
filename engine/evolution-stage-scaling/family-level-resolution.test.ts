// EGG HATCH REBALANCE — focused coverage for resolveSpeciesIdForLevel, the
// reverse-of-the-old-flow utility that turns an already-rolled level into
// the correct evolution stage of a family, using only the real canonical
// LEVEL_EVOLUTIONS data (data/pokemon/pokemon-evolutions.ts) — never a
// hardcoded per-family case.
import assert from "node:assert/strict";
import { test } from "node:test";

import { findFamilyRootSpeciesId, resolveSpeciesIdForLevel } from "./family-level-resolution.ts";

test("2-stage family: below the threshold stays at the base stage", () => {
  // pichu -> pikachu @16 (pikachu's own further Thunder-Stone evolution is
  // item-based, out of scope for this module).
  assert.equal(resolveSpeciesIdForLevel("pichu", 15), "pichu");
});

test("2-stage family: exactly at the threshold advances to the evolved stage", () => {
  assert.equal(resolveSpeciesIdForLevel("pichu", 16), "pikachu");
  assert.equal(resolveSpeciesIdForLevel("pichu", 40), "pikachu");
});

test("2-stage family: starting from the ALREADY-EVOLVED stage still resolves by level, never staying pinned to the drawn stage", () => {
  // Drawing "pikachu" itself (not pichu) from the pool must still walk back
  // to the family root and re-resolve purely from the rolled level.
  assert.equal(resolveSpeciesIdForLevel("pikachu", 10), "pichu");
  assert.equal(resolveSpeciesIdForLevel("pikachu", 16), "pikachu");
});

test("3-stage family (base -> middle): below the first threshold stays at the base stage", () => {
  // charmander -> charmeleon @16 -> charizard @36 (task's own worked example).
  assert.equal(resolveSpeciesIdForLevel("charmander", 14), "charmander");
});

test("3-stage family (middle stage reached, task's own worked example): rolled level 16 -> Charmeleon", () => {
  assert.equal(resolveSpeciesIdForLevel("charmander", 16), "charmeleon");
});

test("3-stage family: below the final threshold stays at the middle stage", () => {
  assert.equal(resolveSpeciesIdForLevel("charmander", 35), "charmeleon");
});

test("3-stage family (final stage): rolled level meets the final threshold", () => {
  assert.equal(resolveSpeciesIdForLevel("charmander", 36), "charizard");
  assert.equal(resolveSpeciesIdForLevel("charmander", 73), "charizard");
});

test("3-stage family: starting from the middle or final stage still resolves purely from the rolled level", () => {
  assert.equal(resolveSpeciesIdForLevel("charmeleon", 10), "charmander");
  // Level 20 already meets charmander's own level-16 threshold, so it
  // resolves to charmeleon — NOT charmander — even though the walk starts
  // from the root; it just hasn't reached charmeleon's own level-36
  // threshold yet, so it stops one stage short of charizard.
  assert.equal(resolveSpeciesIdForLevel("charizard", 20), "charmeleon");
  assert.equal(resolveSpeciesIdForLevel("charizard", 5), "charmander");
  assert.equal(resolveSpeciesIdForLevel("charizard", 16), "charmeleon");
  assert.equal(resolveSpeciesIdForLevel("charizard", 36), "charizard");
});

test("the rolled level is never increased to force a later evolution — one level below a threshold never advances", () => {
  assert.equal(resolveSpeciesIdForLevel("charmander", 15), "charmander");
  assert.equal(resolveSpeciesIdForLevel("charmander", 35), "charmeleon");
});

test("standalone Pokémon (no evolution relationship at all) is returned unchanged at any level", () => {
  assert.equal(resolveSpeciesIdForLevel("ditto", 1), "ditto");
  assert.equal(resolveSpeciesIdForLevel("ditto", 73), "ditto");
});

test("a species whose only real evolution is item/stone-based (no LEVEL_EVOLUTIONS entry) is never advanced by level", () => {
  // vulpix -> ninetales is Fire-Stone-only; no level-evolution relationship
  // exists in the canonical table, so this module must never invent one.
  assert.equal(resolveSpeciesIdForLevel("vulpix", 1), "vulpix");
  assert.equal(resolveSpeciesIdForLevel("vulpix", 73), "vulpix");
  assert.equal(resolveSpeciesIdForLevel("ninetales", 73), "ninetales");
});

test("a species whose only real evolution is a player-choice branch (Eevee) is never advanced by level", () => {
  assert.equal(resolveSpeciesIdForLevel("eevee", 73), "eevee");
});

test("findFamilyRootSpeciesId walks back to the true base for any stage, and standalone species are their own root", () => {
  assert.equal(findFamilyRootSpeciesId("charmander"), "charmander");
  assert.equal(findFamilyRootSpeciesId("charmeleon"), "charmander");
  assert.equal(findFamilyRootSpeciesId("charizard"), "charmander");
  assert.equal(findFamilyRootSpeciesId("ditto"), "ditto");
});
