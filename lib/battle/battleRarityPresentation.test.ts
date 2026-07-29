import assert from "node:assert/strict";
import { test } from "node:test";

import { getRarityPresentation, RARITY_PRESENTATION } from "./battleRarityPresentation.ts";
import { POKEMON_RARITY_LABELS } from "@/shared/types/pokemon-labels";
import type { PokemonRarity } from "@/shared/types/pokemon";

const DEFAULT_BATTLE_BACKGROUND = "bg-slate-950";

test("every PokemonRarity maps to the correct Hebrew label", () => {
  const rarities: PokemonRarity[] = ["common", "rare", "very-rare", "legendary"];
  for (const rarity of rarities) {
    assert.equal(getRarityPresentation(rarity).label, POKEMON_RARITY_LABELS[rarity]);
  }
  // Pin the exact strings the task specifies, independent of whatever
  // POKEMON_RARITY_LABELS happens to contain, so a future edit to that map
  // can't silently drift these away from the required labels.
  assert.equal(RARITY_PRESENTATION.common.label, "נפוץ");
  assert.equal(RARITY_PRESENTATION.rare.label, "נדיר");
  assert.equal(RARITY_PRESENTATION["very-rare"].label, "נדיר מאוד");
  assert.equal(RARITY_PRESENTATION.legendary.label, "אגדי");
});

test("common uses the normal battle background and has no warning", () => {
  const presentation = getRarityPresentation("common");
  assert.equal(presentation.windowBackgroundClass, DEFAULT_BATTLE_BACKGROUND);
  assert.equal(presentation.sceneOverlayClassName, "");
  assert.equal(presentation.warning, undefined);
});

test("rare uses the normal battle background and has no warning", () => {
  const presentation = getRarityPresentation("rare");
  assert.equal(presentation.windowBackgroundClass, DEFAULT_BATTLE_BACKGROUND);
  assert.equal(presentation.sceneOverlayClassName, "");
  assert.equal(presentation.warning, undefined);
});

test("very-rare uses the red/crimson battle theme and the correct Hebrew warning", () => {
  const presentation = getRarityPresentation("very-rare");

  assert.notEqual(presentation.windowBackgroundClass, DEFAULT_BATTLE_BACKGROUND);
  assert.match(presentation.windowBackgroundClass, /red/);
  assert.notEqual(presentation.sceneOverlayClassName, "");
  assert.match(presentation.sceneOverlayClassName, /red/);

  assert.ok(presentation.warning, "very-rare must have a warning banner");
  assert.equal(presentation.warning?.title, "שים לב — פגשת פוקימון נדיר מאוד!");
  assert.equal(presentation.warning?.message, "הופעה כזו אינה שכיחה. מומלץ מאוד לנסות לתפוס אותו.");
  // Styling must stay untouched by the text-only update.
  assert.equal(
    presentation.warning?.className,
    "border-2 border-red-500/70 bg-red-950/90 text-red-50 shadow-[0_0_25px_-6px_rgba(220,38,38,0.65)]"
  );
});

test("legendary uses the golden-yellow battle theme and the correct Hebrew warning", () => {
  const presentation = getRarityPresentation("legendary");

  assert.notEqual(presentation.windowBackgroundClass, DEFAULT_BATTLE_BACKGROUND);
  assert.match(presentation.windowBackgroundClass, /(amber|yellow)/);
  assert.notEqual(presentation.sceneOverlayClassName, "");
  assert.match(presentation.sceneOverlayClassName, /(amber|yellow)/);
  // Task requirement: dark text on the bright gold background.
  assert.match(presentation.warning?.className ?? "", /text-amber-950/);

  assert.ok(presentation.warning, "legendary must have a warning banner");
  assert.equal(presentation.warning?.title, "אירוע אגדי!");
  assert.equal(
    presentation.warning?.message,
    "פוקימונים אגדיים מופיעים לעיתים נדירות ביותר. נצל את ההזדמנות ונסה לתפוס אותו."
  );
  // Styling must stay untouched by the text-only update.
  assert.equal(
    presentation.warning?.className,
    "border-2 border-amber-300 bg-gradient-to-b from-yellow-300 to-amber-400 text-amber-950 shadow-[0_0_30px_-4px_rgba(251,191,36,0.85)]"
  );
});

test("every rarity is present in the presentation map (Record<PokemonRarity, ...> stays exhaustive)", () => {
  const keys = Object.keys(RARITY_PRESENTATION).sort();
  assert.deepEqual(keys, ["common", "legendary", "rare", "very-rare"]);
});
