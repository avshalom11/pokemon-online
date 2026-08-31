// POKÉDEX + INVENTORY UI IMPROVEMENTS — form navigation arrows in the
// detail view. No React-render/DOM harness exists in this project (see
// PokedexCard.test.ts's own doc comment) — this checks the same invariants
// via a static source read instead of rendering.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const panelSrc = readFileSync(new URL("./PokedexDetailPanel.tsx", import.meta.url), "utf8");

test("form navigation is driven by entry.forms, never a second/hardcoded form registry", () => {
  assert.ok(panelSrc.includes("entry.forms[selectedFormIndex]"), "the displayed form must come from entry.forms by index");
  assert.ok(panelSrc.includes("entry.forms.findIndex"), "the current index must be derived from entry.forms, not a separate list");
});

test("arrows only render when the entry has more than one form", () => {
  const arrowBlockMatches = panelSrc.match(/entry\.forms\.length > 1\s*\?\s*\(/g) ?? [];
  assert.ok(arrowBlockMatches.length >= 2, "both the existing tab switcher and the new arrow row must be gated on forms.length > 1");
});

test("goToForm wraps around in both directions (modulo arithmetic over entry.forms.length)", () => {
  assert.ok(
    /const nextIndex = \(selectedFormIndex \+ offset \+ entry\.forms\.length\) % entry\.forms\.length;/.test(panelSrc),
    "navigation must wrap using modulo arithmetic, not clamp at the ends"
  );
  assert.ok(panelSrc.includes("goToForm(-1)"), "a previous-form control must exist");
  assert.ok(panelSrc.includes("goToForm(1)"), "a next-form control must exist");
});

test("the pre-existing pill-tab form switcher (PokedexFormSwitcher) is untouched by adding arrows", () => {
  assert.ok(panelSrc.includes("<PokedexFormSwitcher forms={entry.forms}"), "the existing tab switcher must remain, not be replaced by the arrows");
});

test("per-form unseen gating (isFormUnseen) is untouched — a form the player hasn't personally seen still stays locked, even mid-navigation", () => {
  assert.ok(panelSrc.includes('const isFormUnseen = status === "unseen";'));
  assert.ok(panelSrc.includes("isFormUnseen ? undefined : getLevelEvolution(species.id)"));
  assert.ok(panelSrc.includes("isFormUnseen ? [] : getEvolutionItemEvolutions(species.id)"));
});

test("this panel is only ever reached for a seen/caught entry, per its own doc comment — untouched by this feature", () => {
  assert.ok(/Only ever\r?\n\/\/ rendered for a "seen" or "caught" entry/.test(panelSrc));
});

// ============================================================================
// POKÉDEX — FORM VISIBILITY + ACQUISITION HINT FIX. An unseen SIBLING form
// (e.g. owning Mega Charizard X without ever having seen normal Charizard)
// must show its own real acquisition hint, never a generic "not seen"
// placeholder — same shared getPokedexUnseenFormHint helper
// PokedexUnseenPanel now also uses (see that file's own test coverage), so
// the two panels can never drift on the rule.
// ============================================================================

test("an unseen sibling form's placeholder text ('טרם נצפתה צורה זו') is gone — replaced by the real, per-form acquisition hint", () => {
  assert.ok(!panelSrc.includes("טרם נצפתה צורה זו"), "the old generic 'form not seen' placeholder must be removed");
});

test("the unseen-form hint comes from the shared getPokedexUnseenFormHint helper, never duplicated/hardcoded logic", () => {
  assert.ok(panelSrc.includes('import { getPokedexUnseenFormHint } from "../utils/pokedex-form-hints";'));
  assert.ok(panelSrc.includes("getPokedexUnseenFormHint(species)"), "the hint must be derived for the currently selected form's own species");
});
