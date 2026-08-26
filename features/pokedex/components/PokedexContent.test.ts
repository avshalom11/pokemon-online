// POKÉDEX — LOCATION HINTS FOR UNSEEN POKÉMON. No React-render/DOM harness
// exists in this project (see PokedexCard.test.ts's own doc comment) — this
// checks the routing invariant via a static source read instead of
// rendering.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const contentSrc = readFileSync(new URL("./PokedexContent.tsx", import.meta.url), "utf8");

test("selecting an entry no longer excludes unseen species — a card is now always selectable", () => {
  assert.ok(
    contentSrc.includes("entries.find((entry) => entry.species.id === selectedSpeciesId) ?? null"),
    "the unseen exclusion must be removed so an unseen card's click actually opens something"
  );
});

test("an unseen selection opens PokedexUnseenPanel, never the full PokedexDetailPanel", () => {
  assert.ok(contentSrc.includes('import { PokedexUnseenPanel } from "./PokedexUnseenPanel";'));
  assert.match(
    contentSrc,
    /selectedEntry\.status === "unseen"\s*\?\s*\(\s*<PokedexUnseenPanel entry=\{selectedEntry\} onClose=\{\(\) => setSelectedSpeciesId\(null\)\} \/>\s*\)\s*:\s*\(\s*<PokedexDetailPanel entry=\{selectedEntry\} onClose=\{\(\) => setSelectedSpeciesId\(null\)\} \/>\s*\)/
  );
});
