// Focused regression tests for the generic Pokémon Forms grouping logic —
// exercised against small fixture species for the grouping-mechanics tests
// (kept fixture-based rather than real-catalog so these never depend on
// which generations happen to exist), plus real-catalog checks for both
// the "no forms at all" default path (any single-form species, e.g.
// Bulbasaur) and every real multi-form species the catalog has grown since
// (Deoxys/Generation 3, Rotom and Giratina/Generation 4).
import assert from "node:assert/strict";
import { test } from "node:test";

import {
  buildAlternateFormsIndex,
  getFormEntries,
  getFormLabel,
  hasForms,
  isAlternateForm,
} from "./pokemon-forms.ts";
import { getSpeciesById } from "@/features/pokemon/services/species-catalog";
import type { PokemonSpecies } from "@/shared/types/pokemon";

function fixtureSpecies(overrides: Partial<PokemonSpecies> & { id: string; dexNumber: number }): PokemonSpecies {
  return {
    name: overrides.id,
    description: "",
    types: ["normal"],
    rarity: "common",
    baseStats: { health: 1, attack: 1, defense: 1, specialAttack: 1, specialDefense: 1, speed: 1 },
    imageUrl: "",
    ...overrides,
  };
}

test("buildAlternateFormsIndex groups every alternate form under its base species id", () => {
  const base = fixtureSpecies({ id: "test-base", dexNumber: 900 });
  const formA = fixtureSpecies({ id: "test-base-a", dexNumber: 900, formOf: "test-base", formLabel: "A Form" });
  const formB = fixtureSpecies({ id: "test-base-b", dexNumber: 900, formOf: "test-base", formLabel: "B Form" });
  const unrelated = fixtureSpecies({ id: "unrelated", dexNumber: 901 });

  const index = buildAlternateFormsIndex([base, formA, formB, unrelated]);

  assert.deepEqual(
    index.get("test-base")!.map((species) => species.id),
    ["test-base-a", "test-base-b"]
  );
  assert.equal(index.get("unrelated"), undefined, "a species with no siblings must never appear as an index key");
  assert.equal(index.get("test-base-a"), undefined, "an alternate form is never itself a group key");
});

test("buildAlternateFormsIndex produces an empty index for a list with no forms at all", () => {
  const index = buildAlternateFormsIndex([fixtureSpecies({ id: "solo", dexNumber: 902 })]);
  assert.equal(index.size, 0);
});

test("isAlternateForm is true only when formOf is set", () => {
  assert.equal(isAlternateForm(fixtureSpecies({ id: "base", dexNumber: 900 })), false);
  assert.equal(isAlternateForm(fixtureSpecies({ id: "form", dexNumber: 900, formOf: "base" })), true);
});

test("getFormLabel falls back to the species name when formLabel is unset", () => {
  const noLabel = fixtureSpecies({ id: "test", dexNumber: 900, name: "Test Species" });
  assert.equal(getFormLabel(noLabel), "Test Species");

  const withLabel = fixtureSpecies({ id: "test-a", dexNumber: 900, name: "Test Species A", formLabel: "A Form" });
  assert.equal(getFormLabel(withLabel), "A Form");
});

test("a real, single-form catalog species has no forms and is not itself an alternate form", () => {
  const bulbasaur = getSpeciesById("bulbasaur")!;
  assert.equal(hasForms(bulbasaur), false);
  assert.equal(isAlternateForm(bulbasaur), false);
});

test("getFormEntries on a species with no forms returns exactly that one species", () => {
  const bulbasaur = getSpeciesById("bulbasaur")!;
  const entries = getFormEntries(bulbasaur);
  assert.deepEqual(entries.map((species) => species.id), ["bulbasaur"]);
});

// Deoxys (Generation 3/Hoenn) is the first real multi-form species in the
// catalog — these exercise the exact same functions against real data
// instead of fixtures, so a regression in the real Deoxys catalog entries
// (a typo in formOf, a missing formLabel) fails here too, not only in the
// fixture-based tests above.
test("Deoxys (base) has forms; every Deoxys alternate form is recognized as an alternate form", () => {
  const deoxys = getSpeciesById("deoxys")!;
  assert.equal(hasForms(deoxys), true);
  assert.equal(isAlternateForm(deoxys), false);

  for (const id of ["deoxys-attack", "deoxys-defense", "deoxys-speed"]) {
    const form = getSpeciesById(id)!;
    assert.equal(isAlternateForm(form), true);
    assert.equal(hasForms(form), false, "an alternate form itself never reports hasForms — only the base does");
  }
});

test("getFormEntries returns all four Deoxys forms, base first, starting from either the base or any sibling", () => {
  const expectedIds = ["deoxys", "deoxys-attack", "deoxys-defense", "deoxys-speed"];

  const fromBase = getFormEntries(getSpeciesById("deoxys")!);
  assert.deepEqual(fromBase.map((species) => species.id), expectedIds);

  const fromSibling = getFormEntries(getSpeciesById("deoxys-speed")!);
  assert.deepEqual(fromSibling.map((species) => species.id), expectedIds);
});

test("getFormLabel resolves real Deoxys form labels", () => {
  assert.equal(getFormLabel(getSpeciesById("deoxys")!), "Deoxys", "the base form has no formLabel set — falls back to its name");
  assert.equal(getFormLabel(getSpeciesById("deoxys-attack")!), "Attack Form");
  assert.equal(getFormLabel(getSpeciesById("deoxys-defense")!), "Defense Form");
  assert.equal(getFormLabel(getSpeciesById("deoxys-speed")!), "Speed Form");
});

// Rotom (Generation 4/Sinnoh) is the second real multi-form species in the
// catalog, and the first with more than four total entries (base + 5
// alternates) — exercises the same functions at a different group size.
test("Rotom (base) has forms; every Rotom alternate form is recognized as an alternate form", () => {
  const rotom = getSpeciesById("rotom")!;
  assert.equal(hasForms(rotom), true);
  assert.equal(isAlternateForm(rotom), false);

  for (const id of ["rotom-heat", "rotom-wash", "rotom-frost", "rotom-fan", "rotom-mow"]) {
    const form = getSpeciesById(id)!;
    assert.equal(isAlternateForm(form), true);
    assert.equal(hasForms(form), false, "an alternate form itself never reports hasForms — only the base does");
  }
});

test("getFormEntries returns all six Rotom forms, base first, starting from either the base or any sibling", () => {
  const expectedIds = ["rotom", "rotom-heat", "rotom-wash", "rotom-frost", "rotom-fan", "rotom-mow"];

  const fromBase = getFormEntries(getSpeciesById("rotom")!);
  assert.deepEqual(fromBase.map((species) => species.id).sort(), [...expectedIds].sort());

  const fromSibling = getFormEntries(getSpeciesById("rotom-mow")!);
  assert.deepEqual(fromSibling.map((species) => species.id).sort(), [...expectedIds].sort());
});

test("getFormLabel resolves real Rotom form labels", () => {
  assert.equal(getFormLabel(getSpeciesById("rotom")!), "Rotom", "the base form has no formLabel set — falls back to its name");
  assert.equal(getFormLabel(getSpeciesById("rotom-heat")!), "Heat Rotom");
  assert.equal(getFormLabel(getSpeciesById("rotom-wash")!), "Wash Rotom");
  assert.equal(getFormLabel(getSpeciesById("rotom-frost")!), "Frost Rotom");
  assert.equal(getFormLabel(getSpeciesById("rotom-fan")!), "Fan Rotom");
  assert.equal(getFormLabel(getSpeciesById("rotom-mow")!), "Mow Rotom");
});

// Giratina (Generation 4/Sinnoh) is the third real multi-form species —
// a base + exactly one alternate, the smallest possible non-trivial group.
test("Giratina (base/Altered Form) has forms; its Origin Form is recognized as an alternate form", () => {
  const giratina = getSpeciesById("giratina")!;
  assert.equal(hasForms(giratina), true);
  assert.equal(isAlternateForm(giratina), false);

  const origin = getSpeciesById("giratina-origin")!;
  assert.equal(isAlternateForm(origin), true);
  assert.equal(hasForms(origin), false, "an alternate form itself never reports hasForms — only the base does");
});

test("getFormEntries returns both Giratina forms, base first, starting from either the base or the sibling", () => {
  const expectedIds = ["giratina", "giratina-origin"];

  const fromBase = getFormEntries(getSpeciesById("giratina")!);
  assert.deepEqual(fromBase.map((species) => species.id), expectedIds);

  const fromSibling = getFormEntries(getSpeciesById("giratina-origin")!);
  assert.deepEqual(fromSibling.map((species) => species.id), expectedIds);
});

test("getFormLabel resolves real Giratina form labels", () => {
  assert.equal(getFormLabel(getSpeciesById("giratina")!), "Giratina", "the base form has no formLabel set — falls back to its name");
  assert.equal(getFormLabel(getSpeciesById("giratina-origin")!), "Origin Form");
});

// Tornadus/Thundurus/Landorus (Generation 5/Unova) each get exactly one
// Therian alternate form — the smallest possible non-trivial group, same
// shape as Giratina above, exercised three times against three different
// real base species.
for (const baseId of ["tornadus", "thundurus", "landorus"]) {
  const formId = `${baseId}-therian`;

  test(`${baseId} (base/Incarnate Forme) has forms; its Therian Forme is recognized as an alternate form`, () => {
    const base = getSpeciesById(baseId)!;
    assert.equal(hasForms(base), true);
    assert.equal(isAlternateForm(base), false);

    const therian = getSpeciesById(formId)!;
    assert.equal(isAlternateForm(therian), true);
    assert.equal(hasForms(therian), false, "an alternate form itself never reports hasForms — only the base does");
  });

  test(`getFormEntries returns both ${baseId} forms, base first, starting from either the base or the sibling`, () => {
    const expectedIds = [baseId, formId];

    const fromBase = getFormEntries(getSpeciesById(baseId)!);
    assert.deepEqual(fromBase.map((species) => species.id), expectedIds);

    const fromSibling = getFormEntries(getSpeciesById(formId)!);
    assert.deepEqual(fromSibling.map((species) => species.id), expectedIds);
  });

  test(`getFormLabel resolves the real ${baseId} Therian Forme label, falling back to the base species name for the base form`, () => {
    const base = getSpeciesById(baseId)!;
    assert.equal(getFormLabel(base), base.name, "the base form has no formLabel set — falls back to its name");
    assert.equal(getFormLabel(getSpeciesById(formId)!), "Therian Forme");
  });
}

// Kyurem (Generation 5/Unova) gets two alternate forms (Black/White) — the
// same three-total-entries shape Deoxys's attack/defense/speed trio uses,
// just with two siblings instead of three.
test("Kyurem (base) has forms; Kyurem Black and White are each recognized as an alternate form", () => {
  const kyurem = getSpeciesById("kyurem")!;
  assert.equal(hasForms(kyurem), true);
  assert.equal(isAlternateForm(kyurem), false);

  for (const id of ["kyurem-black", "kyurem-white"]) {
    const form = getSpeciesById(id)!;
    assert.equal(isAlternateForm(form), true);
    assert.equal(hasForms(form), false, "an alternate form itself never reports hasForms — only the base does");
  }
});

test("getFormEntries returns all three Kyurem forms, base first, starting from either the base or any sibling", () => {
  const expectedIds = ["kyurem", "kyurem-black", "kyurem-white"];

  const fromBase = getFormEntries(getSpeciesById("kyurem")!);
  assert.deepEqual(fromBase.map((species) => species.id).sort(), [...expectedIds].sort());

  const fromSibling = getFormEntries(getSpeciesById("kyurem-white")!);
  assert.deepEqual(fromSibling.map((species) => species.id).sort(), [...expectedIds].sort());
});

test("getFormLabel resolves real Kyurem form labels", () => {
  assert.equal(getFormLabel(getSpeciesById("kyurem")!), "Kyurem", "the base form has no formLabel set — falls back to its name");
  assert.equal(getFormLabel(getSpeciesById("kyurem-black")!), "Black Kyurem");
  assert.equal(getFormLabel(getSpeciesById("kyurem-white")!), "White Kyurem");
});

// Meloetta (Generation 5/Unova) gets exactly one alternate form (Pirouette)
// — same shape as Giratina/Therian forms above.
test("Meloetta (base/Aria Forme) has forms; its Pirouette Forme is recognized as an alternate form", () => {
  const meloetta = getSpeciesById("meloetta")!;
  assert.equal(hasForms(meloetta), true);
  assert.equal(isAlternateForm(meloetta), false);

  const pirouette = getSpeciesById("meloetta-pirouette")!;
  assert.equal(isAlternateForm(pirouette), true);
  assert.equal(hasForms(pirouette), false, "an alternate form itself never reports hasForms — only the base does");
});

test("getFormEntries returns both Meloetta forms, base first, starting from either the base or the sibling", () => {
  const expectedIds = ["meloetta", "meloetta-pirouette"];

  const fromBase = getFormEntries(getSpeciesById("meloetta")!);
  assert.deepEqual(fromBase.map((species) => species.id), expectedIds);

  const fromSibling = getFormEntries(getSpeciesById("meloetta-pirouette")!);
  assert.deepEqual(fromSibling.map((species) => species.id), expectedIds);
});

test("getFormLabel resolves real Meloetta form labels", () => {
  assert.equal(getFormLabel(getSpeciesById("meloetta")!), "Meloetta", "the base form has no formLabel set — falls back to its name");
  assert.equal(getFormLabel(getSpeciesById("meloetta-pirouette")!), "Pirouette Forme");
});
