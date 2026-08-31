// POKÉDEX — FORM VISIBILITY + ACQUISITION HINT FIX. Focused coverage for
// the shared "what do we tell the player about an unseen form" rule, pure
// and framework-free — no DB, no React. Real species/zone/registry data
// throughout, same convention features/pokedex/utils/pokedex-filters.test.ts
// already establishes.
import assert from "node:assert/strict";
import { test } from "node:test";

import { getPokedexUnseenFormHint } from "./pokedex-form-hints.ts";
import { POKEMON_DATA } from "@/data/pokemon/pokemon-data";
import { getSpeciesEncounterLocations } from "@/data/zones/zone-data";
import { isMegaEvolutionTarget } from "@/features/evolution/services/evolution-item-catalog";
import { getSpeciesById } from "@/features/pokemon/services/species-catalog";
import { pokedexLocationHint, pokedexMegaAcquisitionHint, pokedexNoKnownLocationMessage } from "../messages/pokedex-location-messages";

test("a Mega-form species always gets the Mega acquisition hint, never a wild-location hint — real registry-derived Charizard X example", () => {
  const megaCharizardX = getSpeciesById("charizard-mega-x");
  if (!megaCharizardX) throw new Error("fixture species not found: charizard-mega-x");

  assert.equal(getPokedexUnseenFormHint(megaCharizardX), pokedexMegaAcquisitionHint);
});

test("a Mega-form species check is registry-derived (isMegaEvolutionTarget), not name/spriteId-based — confirmed on a second, unrelated Mega species", () => {
  const megaGengar = getSpeciesById("gengar-mega");
  if (!megaGengar) throw new Error("fixture species not found: gengar-mega");

  assert.ok(isMegaEvolutionTarget("gengar-mega"));
  assert.equal(getPokedexUnseenFormHint(megaGengar), pokedexMegaAcquisitionHint);
});

test("a normal wild-obtainable species gets its real zone/encounter location hint — the exact approved Charizard copy", () => {
  const charizard = getSpeciesById("charizard");
  if (!charizard) throw new Error("fixture species not found: charizard");

  assert.equal(isMegaEvolutionTarget("charizard"), false, "the base species itself must never be treated as a Mega target");
  assert.equal(getPokedexUnseenFormHint(charizard), "מאמנים מדווחים שהפוקימון הזה נצפה באזורי הלבה במחוז קאנטו.");
});

test("the wild-location branch is never duplicated/hardcoded — matches the real getSpeciesEncounterLocations + pokedexLocationHint output exactly, for any non-Mega species that has real location data", () => {
  const charizard = getSpeciesById("charizard");
  if (!charizard) throw new Error("fixture species not found: charizard");

  const expected = pokedexLocationHint(charizard.rarity, getSpeciesEncounterLocations(charizard.id));
  assert.equal(getPokedexUnseenFormHint(charizard), expected);
});

test("sanity check: every non-Mega species in today's real catalog does have zone-encounter data (the 'not yet known' fallback below is exercised via a synthetic fixture, not because it's unreachable in principle)", () => {
  const withoutLocations = POKEMON_DATA.filter(
    (species) => !isMegaEvolutionTarget(species.id) && getSpeciesEncounterLocations(species.id).length === 0
  );
  assert.equal(withoutLocations.length, 0);
});

test("a species with no real zone-encounter entry falls back to the existing 'not yet known' message — never a fabricated location", () => {
  // No real catalog species is currently missing zone-encounter data (see
  // the sanity check above), so this exercises the fallback branch with a
  // minimal fixture object — genuinely a non-Mega species id with no entry
  // in any zone table, same "unseen fallback" precedent
  // PokedexUnseenPanel already relied on before this fix.
  const noLocationSpecies = { ...getSpeciesById("bulbasaur")!, id: "test-fixture-species-with-no-zone-data" };
  assert.equal(isMegaEvolutionTarget(noLocationSpecies.id), false);
  assert.deepEqual(getSpeciesEncounterLocations(noLocationSpecies.id), []);

  assert.equal(getPokedexUnseenFormHint(noLocationSpecies), pokedexNoKnownLocationMessage);
});
