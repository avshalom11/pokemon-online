// POKÉDEX — LOCATION HINTS FOR UNSEEN POKÉMON. No React-render/DOM harness
// exists in this project (see PokedexCard.test.ts's own doc comment) — this
// checks the same invariants via a static source read instead of rendering.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const panelSrc = readFileSync(new URL("./PokedexUnseenPanel.tsx", import.meta.url), "utf8");

// POKÉDEX — FORM VISIBILITY + ACQUISITION HINT FIX — the actual hint
// derivation (zone/encounter data vs. the Mega-specific hint vs. the
// "not yet known" fallback) now lives in the single shared
// getPokedexUnseenFormHint helper (features/pokedex/utils/pokedex-form-hints.ts,
// covered by its own dedicated test file) so PokedexDetailPanel and this
// panel can never drift on the rule — this panel just calls it per the
// currently selected form.
test("the location hint is derived from the shared getPokedexUnseenFormHint helper — never a hardcoded per-species string, never duplicated logic", () => {
  assert.ok(panelSrc.includes('import { getPokedexUnseenFormHint } from "../utils/pokedex-form-hints";'));
  assert.ok(panelSrc.includes("getPokedexUnseenFormHint(species)"));
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

// ============================================================================
// POKÉDEX + INVENTORY UI IMPROVEMENTS — form navigation arrows, reusing
// entry.forms directly (never a second/hardcoded form list).
// ============================================================================

test("form navigation is driven by entry.forms, never a second/hardcoded list", () => {
  assert.ok(panelSrc.includes("entry.forms[selectedFormIndex]"), "the displayed species must come from entry.forms by index");
  assert.ok(panelSrc.includes("entry.forms.findIndex"), "the current index must be derived from entry.forms, not a separate list");
});

test("arrows only render when the entry has more than one form", () => {
  assert.ok(/entry\.forms\.length > 1\s*\?\s*\(/.test(panelSrc), "the arrow row must be conditionally rendered behind forms.length > 1");
});

test("goToForm wraps around in both directions (modulo arithmetic over entry.forms.length)", () => {
  assert.ok(
    /const nextIndex = \(selectedFormIndex \+ offset \+ entry\.forms\.length\) % entry\.forms\.length;/.test(panelSrc),
    "navigation must wrap using modulo arithmetic, not clamp at the ends"
  );
  assert.ok(panelSrc.includes("goToForm(-1)"), "a previous-form control must exist");
  assert.ok(panelSrc.includes("goToForm(1)"), "a next-form control must exist");
});

test("every form shown here still gets the same silhouette treatment — no per-form isFormUnseen branch (every form is unseen when this panel is reached)", () => {
  assert.ok(!panelSrc.includes("isFormUnseen"), "PokedexUnseenPanel must never need a per-form unseen check — the whole entry is already unseen");
});
