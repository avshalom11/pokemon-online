import assert from "node:assert/strict";
import { test } from "node:test";

import { POKEMON_DATA } from "@/data/pokemon/pokemon-data";
import type { PokemonRarity, PokemonSpecies } from "@/shared/types/pokemon";

// Generation 1 (Kanto, #0001-#0151) + Generation 2 (Johto, #0152-#0251) +
// Generation 3 (Hoenn, #0252-#0386) + Generation 4 (Sinnoh, #0387-#0493) +
// Generation 5 (Unova, #0494-#0649) + Generation 6 (Kalos, #0650-#0721) —
// 721 official National Dex entries (one base/headline species row per dex
// number). Victini (#494) IS part of Unova and IS present (Unova Phase 1's
// own explicit scope). See engine/learnsets/data/generation-1/
// generation-1.completeness.test.ts for the same invariant applied to the
// (still Generation-1-only) learnset database.
//
// PLUS alternate FORM rows that intentionally share their base's dex
// number rather than getting their own (see features/pokemon/forms/
// pokemon-forms.ts's own doc comment): 3 Deoxys forms (dex #386), 5 Rotom
// forms (dex #479: Heat/Wash/Frost/Fan/Mow), 1 Giratina form (dex #487:
// Origin), 1 Tornadus form (dex #641: Therian), 1 Thundurus form (dex
// #642: Therian), 1 Landorus form (dex #645: Therian), 2 Kyurem forms
// (dex #646: Black/White), 1 Keldeo form (dex #647: Resolute — added in
// the Unova Update phase), 1 Meloetta form (dex #648: Pirouette), and 1
// Hoopa form (dex #720: Unbound — added in the Kalos Phase 1 species
// catalog). That makes two different, both-correct counts:
//   - EXPECTED_BASE_DEX_COUNT (721): distinct dex numbers / Pokédex rows —
//     what "dex numbers cover 1..N with no gaps" and the Pokédex service's
//     own row count are checked against.
//   - EXPECTED_TOTAL_SPECIES_COUNT (738): every PokemonSpecies row in
//     POKEMON_DATA, including all 17 alternate forms — what "every id is
//     present exactly once" is checked against.
const EXPECTED_BASE_DEX_COUNT = 721;
const EXPECTED_TOTAL_SPECIES_COUNT = 738;

const VALID_RARITIES: PokemonRarity[] = ["common", "rare", "very-rare", "legendary"];

// Rarity classification as assigned by design decision (2026-07-29,
// extended 2026-08-04 for Generation 2, extended 2026-08-05 for Generation
// 3/Hoenn, extended 2026-08-05 for Generation 4/Sinnoh, revised again for
// the Sinnoh Rarity Audit approved-design-change pass, extended again for
// Generation 5/Unova, revised again for the Unova Update rarity pass,
// extended again for Generation 6/Kalos Phase 1): every species keyed by
// dexNumber -> its intended rarity tier, so a test failure points at
// exactly which Pokémon regressed rather than just a wrong total. Includes
// the 3 Deoxys forms (all "legendary"), the 1 Giratina-Origin form
// ("legendary", matching base Giratina), base Rotom and all 5 Rotom
// alternate forms ("legendary", per the Rarity Audit change),
// Porygon-Z/Magmortar/Electivire/Rhyperior/Magnezone ("very-rare", also
// per the Rarity Audit change), every Unova legendary/mythical (Victini,
// Cobalion/Terrakion/Virizion, Tornadus/Thundurus/Landorus incl. their
// Therian forms, Reshiram/Zekrom, Kyurem incl. Black/White, Keldeo incl.
// Resolute Form, Meloetta incl. Pirouette, Genesect — 20 rows total, all
// "legendary"), Unova's starter trio, pseudo-legendary line, and the
// Unova Update's four reclassified species (Snivy/Servine/Serperior,
// Tepig/Pignite/Emboar, Oshawott/Dewott/Samurott, Deino/Zweilous/
// Hydreigon, Zorua, Zoroark, Larvesta, Volcarona — 16 rows total, all
// "very-rare"; the Unova Update four are a direct rarity reassignment, not
// an evolution-item override, same as the Sinnoh Rarity Audit precedent),
// every Kalos legendary/mythical (Xerneas, Yveltal, Zygarde, Diancie,
// Hoopa incl. Unbound Form, Volcanion — 7 rows total, all "legendary"),
// and Kalos's starter trio and pseudo-legendary line (Chespin/Quilladin/
// Chesnaught, Fennekin/Braixen/Delphox, Froakie/Frogadier/Greninja,
// Goomy/Sliggoo/Goodra — 12 rows total, all "very-rare"). See
// generation-5-pokemon-data.ts's and generation-6-pokemon-data.ts's own
// per-species rarity fields for the single source of truth.
const EXPECTED_RARITY_COUNTS: Record<PokemonRarity, number> = {
  common: 295,
  rare: 281,
  "very-rare": 90,
  legendary: 72,
};

test("exactly 738 Pokémon species rows are loaded (721 base Dex entries + 17 alternate forms)", () => {
  assert.equal(POKEMON_DATA.length, EXPECTED_TOTAL_SPECIES_COUNT);
});

test("nothing is missing: every species id is present exactly once", () => {
  const uniqueIds = new Set(POKEMON_DATA.map((species) => species.id));
  assert.equal(uniqueIds.size, EXPECTED_TOTAL_SPECIES_COUNT);
});

// A dex number may legitimately repeat across species that are alternate
// FORMS of the same Pokémon (see features/pokemon/forms's own module doc
// comment) — but only in a specific shape: every species sharing a
// dexNumber with another must have `formOf` pointing at exactly one other
// species in that same group (the base/headline form), and that one base
// species must be the only member of the group WITHOUT formOf. No species
// uses `formOf` yet (Hoenn/Deoxys hasn't been added), so this resolves to
// "every dex number appears exactly once" today — the same invariant the
// old flat "no dex number is duplicated" test asserted — just expressed so
// a future Forms addition doesn't require rewriting this test again.
test("every dex number that repeats belongs to a valid Forms group (exactly one base form + N formOf siblings pointing at it)", () => {
  const speciesByDexNumber = new Map<number, PokemonSpecies[]>();
  for (const species of POKEMON_DATA) {
    const group = speciesByDexNumber.get(species.dexNumber) ?? [];
    group.push(species);
    speciesByDexNumber.set(species.dexNumber, group);
  }

  for (const [dexNumber, group] of speciesByDexNumber) {
    if (group.length === 1) continue;

    const baseForms = group.filter((species) => species.formOf === undefined);
    assert.equal(baseForms.length, 1, `dex #${dexNumber} has ${group.length} entries but not exactly one base form`);

    const baseId = baseForms[0]!.id;
    for (const species of group) {
      if (species.id === baseId) continue;
      assert.equal(species.formOf, baseId, `${species.id} shares dex #${dexNumber} with base "${baseId}" but its formOf doesn't point at it`);
    }
  }
});

test("every formOf reference resolves to a real species sharing the exact same dexNumber", () => {
  const speciesById = new Map(POKEMON_DATA.map((species) => [species.id, species]));

  for (const species of POKEMON_DATA) {
    if (species.formOf === undefined) continue;

    const base = speciesById.get(species.formOf);
    assert.ok(base, `${species.id}'s formOf "${species.formOf}" does not resolve to a real species`);
    assert.equal(
      species.dexNumber,
      base!.dexNumber,
      `${species.id} (dex #${species.dexNumber}) and its base form "${species.formOf}" (dex #${base!.dexNumber}) must share the same dexNumber`
    );
  }
});

// Forms may never chain — a formOf target must itself be a true base (no
// formOf of its own). features/pokemon/forms/pokemon-forms.ts has no
// concept of a form-of-a-form (getFormEntries only ever looks one hop up),
// so this keeps that assumption true at the data level rather than only by
// convention/documentation.
test("no alternate form points at another alternate form (every formOf target is itself a true base)", () => {
  const speciesById = new Map(POKEMON_DATA.map((species) => [species.id, species]));

  for (const species of POKEMON_DATA) {
    if (species.formOf === undefined) continue;

    const base = speciesById.get(species.formOf)!;
    assert.equal(
      base.formOf,
      undefined,
      `${species.id}'s formOf "${species.formOf}" is itself an alternate form — forms may not chain`
    );
  }
});

test("dex numbers, deduped by base form, cover exactly 1 through 721 with no gaps", () => {
  const dexNumbers = POKEMON_DATA.filter((species) => species.formOf === undefined)
    .map((species) => species.dexNumber)
    .sort((a, b) => a - b);
  const expected = Array.from({ length: EXPECTED_BASE_DEX_COUNT }, (_, i) => i + 1);
  assert.deepEqual(dexNumbers, expected);
});

test("no species uses dexNumber 722 or higher (Kalos Phase 1 stops at Volcanion, #721)", () => {
  const maxDexNumber = Math.max(...POKEMON_DATA.map((species) => species.dexNumber));
  assert.equal(maxDexNumber, 721);
});

test("Victini (#494) IS present in the catalog and is rarity legendary (Unova Phase 1's own explicit scope)", () => {
  const victini = POKEMON_DATA.find((species) => species.id === "victini");
  assert.ok(victini, "Victini must be part of the Unova catalog");
  assert.equal(victini!.dexNumber, 494);
  assert.equal(victini!.rarity, "legendary");
  assert.equal(victini!.formOf, undefined, "Victini is a single-form species, not an alternate form");
});

test("Deoxys and its alternate forms never use the old temporary sprite filenames (669/670/671) as a dexNumber", () => {
  // 669/670/671 were only ever a TEMPORARY Deoxys-form sprite-filename bug,
  // long before Kalos existed — that assumption predates Generation 6 and
  // no longer holds project-wide: #669 (Flabébé), #670 (Floette), and #671
  // (Florges) are now legitimate real Kalos dex numbers (Kalos Phase 1).
  // The real invariant was always scoped to Deoxys specifically: its own
  // dexNumber and every one of its alternate forms' dexNumbers must be 386,
  // never one of the three temporary sprite-filename values.
  const forbidden = [669, 670, 671];
  const deoxysGroup = POKEMON_DATA.filter((species) => species.id === "deoxys" || species.formOf === "deoxys");

  assert.ok(deoxysGroup.length > 0, "test assumption: the Deoxys form group must exist");
  for (const species of deoxysGroup) {
    assert.ok(
      !forbidden.includes(species.dexNumber),
      `${species.id} must never use ${species.dexNumber} as dexNumber — that was only ever a temporary sprite filename`
    );
    assert.equal(species.dexNumber, 386, `${species.id} must use dexNumber 386`);
  }
});

test("exactly 135 official Hoenn base species exist for #252-386", () => {
  const hoennBase = POKEMON_DATA.filter(
    (species) => species.formOf === undefined && species.dexNumber >= 252 && species.dexNumber <= 386
  );
  assert.equal(hoennBase.length, 135);
});

test("exactly 107 official Sinnoh base species exist for #387-493", () => {
  const sinnohBase = POKEMON_DATA.filter(
    (species) => species.formOf === undefined && species.dexNumber >= 387 && species.dexNumber <= 493
  );
  assert.equal(sinnohBase.length, 107);
});

test("exactly 156 official Unova base species exist for #494-649", () => {
  const unovaBase = POKEMON_DATA.filter(
    (species) => species.formOf === undefined && species.dexNumber >= 494 && species.dexNumber <= 649
  );
  assert.equal(unovaBase.length, 156);
});

test("exactly 72 official Kalos base species exist for #650-721", () => {
  const kalosBase = POKEMON_DATA.filter(
    (species) => species.formOf === undefined && species.dexNumber >= 650 && species.dexNumber <= 721
  );
  assert.equal(kalosBase.length, 72);
});

test("Chespin is #650 and Volcanion is #721 (the Kalos base dex range's own endpoints)", () => {
  const chespin = POKEMON_DATA.find((species) => species.id === "chespin");
  assert.ok(chespin, "Chespin must exist in the catalog");
  assert.equal(chespin!.dexNumber, 650);

  const volcanion = POKEMON_DATA.find((species) => species.id === "volcanion");
  assert.ok(volcanion, "Volcanion must exist in the catalog");
  assert.equal(volcanion!.dexNumber, 721);
  assert.equal(volcanion!.rarity, "legendary");
});

test("Deoxys has exactly four internal form entries, all sharing dexNumber 386", () => {
  const deoxysGroup = POKEMON_DATA.filter((species) => species.id === "deoxys" || species.formOf === "deoxys");

  assert.deepEqual(
    deoxysGroup.map((species) => species.id).sort(),
    ["deoxys", "deoxys-attack", "deoxys-defense", "deoxys-speed"]
  );
  for (const species of deoxysGroup) {
    assert.equal(species.dexNumber, 386, `${species.id} must share dexNumber 386`);
    assert.equal(species.rarity, "legendary", `${species.id} must be rarity "legendary"`);
  }
});

test("Deoxys form sprite ids resolve to the real on-disk sprite filenames (0386/0386A/0386D/0386S)", () => {
  const byId = new Map(POKEMON_DATA.map((species) => [species.id, species]));

  assert.equal(byId.get("deoxys")!.spriteId, undefined, "deoxys (Normal Form) has no override — resolves via dexNumber to 0386");
  assert.equal(byId.get("deoxys-attack")!.spriteId, "0386A");
  assert.equal(byId.get("deoxys-defense")!.spriteId, "0386D");
  assert.equal(byId.get("deoxys-speed")!.spriteId, "0386S");
});

test("Castform has no alternate-form entries yet (no form-specific sprite assets exist on disk)", () => {
  const castformGroup = POKEMON_DATA.filter((species) => species.id === "castform" || species.formOf === "castform");
  assert.deepEqual(castformGroup.map((species) => species.id), ["castform"]);
});

test("Rotom has exactly six internal form entries (base + 5 alternates), all sharing dexNumber 479", () => {
  const rotomGroup = POKEMON_DATA.filter((species) => species.id === "rotom" || species.formOf === "rotom");

  assert.deepEqual(
    rotomGroup.map((species) => species.id).sort(),
    ["rotom", "rotom-fan", "rotom-frost", "rotom-heat", "rotom-mow", "rotom-wash"]
  );
  for (const species of rotomGroup) {
    assert.equal(species.dexNumber, 479, `${species.id} must share dexNumber 479`);
    // Sinnoh Rarity Audit approved-design-change: Rotom (and all five
    // alternate forms) moved from "rare" to "legendary".
    assert.equal(species.rarity, "legendary", `${species.id} must be rarity "legendary"`);
  }
});

test("Rotom form sprite ids resolve to the real on-disk sprite filenames (0479/0479H/0479W/0479F/0479N/0479M)", () => {
  const byId = new Map(POKEMON_DATA.map((species) => [species.id, species]));

  assert.equal(byId.get("rotom")!.spriteId, undefined, "rotom (base form) has no override — resolves via dexNumber to 0479");
  assert.equal(byId.get("rotom-heat")!.spriteId, "0479H");
  assert.equal(byId.get("rotom-wash")!.spriteId, "0479W");
  assert.equal(byId.get("rotom-frost")!.spriteId, "0479F");
  assert.equal(byId.get("rotom-fan")!.spriteId, "0479N");
  assert.equal(byId.get("rotom-mow")!.spriteId, "0479M");
});

test("Giratina has exactly two internal form entries (Altered + Origin), both sharing dexNumber 487", () => {
  const giratinaGroup = POKEMON_DATA.filter((species) => species.id === "giratina" || species.formOf === "giratina");

  assert.deepEqual(
    giratinaGroup.map((species) => species.id).sort(),
    ["giratina", "giratina-origin"]
  );
  for (const species of giratinaGroup) {
    assert.equal(species.dexNumber, 487, `${species.id} must share dexNumber 487`);
    assert.equal(species.rarity, "legendary", `${species.id} must be rarity "legendary"`);
  }
});

test("Giratina form sprite ids resolve to the real on-disk sprite filenames (0487/0487O)", () => {
  const byId = new Map(POKEMON_DATA.map((species) => [species.id, species]));

  assert.equal(byId.get("giratina")!.spriteId, undefined, "giratina (Altered Form) has no override — resolves via dexNumber to 0487");
  assert.equal(byId.get("giratina-origin")!.spriteId, "0487O");
});

test("Tornadus has exactly two internal form entries (Incarnate + Therian), both sharing dexNumber 641", () => {
  const tornadusGroup = POKEMON_DATA.filter((species) => species.id === "tornadus" || species.formOf === "tornadus");

  assert.deepEqual(
    tornadusGroup.map((species) => species.id).sort(),
    ["tornadus", "tornadus-therian"]
  );
  for (const species of tornadusGroup) {
    assert.equal(species.dexNumber, 641, `${species.id} must share dexNumber 641`);
    assert.equal(species.rarity, "legendary", `${species.id} must be rarity "legendary"`);
    assert.equal(species.types.includes("flying"), true, `${species.id} must keep the Flying type`);
  }
});

test("Tornadus form sprite ids resolve to the real on-disk sprite filenames (0641/0641T)", () => {
  const byId = new Map(POKEMON_DATA.map((species) => [species.id, species]));

  assert.equal(byId.get("tornadus")!.spriteId, undefined, "tornadus (Incarnate Forme) has no override — resolves via dexNumber to 0641");
  assert.equal(byId.get("tornadus-therian")!.spriteId, "0641T");
});

test("Thundurus has exactly two internal form entries (Incarnate + Therian), both sharing dexNumber 642", () => {
  const thundurusGroup = POKEMON_DATA.filter((species) => species.id === "thundurus" || species.formOf === "thundurus");

  assert.deepEqual(
    thundurusGroup.map((species) => species.id).sort(),
    ["thundurus", "thundurus-therian"]
  );
  for (const species of thundurusGroup) {
    assert.equal(species.dexNumber, 642, `${species.id} must share dexNumber 642`);
    assert.equal(species.rarity, "legendary", `${species.id} must be rarity "legendary"`);
  }
});

test("Thundurus form sprite ids resolve to the real on-disk sprite filenames (0642/0642T)", () => {
  const byId = new Map(POKEMON_DATA.map((species) => [species.id, species]));

  assert.equal(byId.get("thundurus")!.spriteId, undefined, "thundurus (Incarnate Forme) has no override — resolves via dexNumber to 0642");
  assert.equal(byId.get("thundurus-therian")!.spriteId, "0642T");
});

test("Landorus has exactly two internal form entries (Incarnate + Therian), both sharing dexNumber 645", () => {
  const landorusGroup = POKEMON_DATA.filter((species) => species.id === "landorus" || species.formOf === "landorus");

  assert.deepEqual(
    landorusGroup.map((species) => species.id).sort(),
    ["landorus", "landorus-therian"]
  );
  for (const species of landorusGroup) {
    assert.equal(species.dexNumber, 645, `${species.id} must share dexNumber 645`);
    assert.equal(species.rarity, "legendary", `${species.id} must be rarity "legendary"`);
  }
});

test("Landorus form sprite ids resolve to the real on-disk sprite filenames (0645/0645T)", () => {
  const byId = new Map(POKEMON_DATA.map((species) => [species.id, species]));

  assert.equal(byId.get("landorus")!.spriteId, undefined, "landorus (Incarnate Forme) has no override — resolves via dexNumber to 0645");
  assert.equal(byId.get("landorus-therian")!.spriteId, "0645T");
});

test("Kyurem has exactly three internal form entries (base + Black + White), all sharing dexNumber 646", () => {
  const kyuremGroup = POKEMON_DATA.filter((species) => species.id === "kyurem" || species.formOf === "kyurem");

  assert.deepEqual(
    kyuremGroup.map((species) => species.id).sort(),
    ["kyurem", "kyurem-black", "kyurem-white"]
  );
  for (const species of kyuremGroup) {
    assert.equal(species.dexNumber, 646, `${species.id} must share dexNumber 646`);
    assert.equal(species.rarity, "legendary", `${species.id} must be rarity "legendary"`);
  }
});

test("Kyurem form sprite ids resolve to the real on-disk sprite filenames (0646/0646B/0646W)", () => {
  const byId = new Map(POKEMON_DATA.map((species) => [species.id, species]));

  assert.equal(byId.get("kyurem")!.spriteId, undefined, "kyurem (base form) has no override — resolves via dexNumber to 0646");
  assert.equal(byId.get("kyurem-black")!.spriteId, "0646B");
  assert.equal(byId.get("kyurem-white")!.spriteId, "0646W");
});

test("Meloetta has exactly two internal form entries (Aria + Pirouette), both sharing dexNumber 648", () => {
  const meloettaGroup = POKEMON_DATA.filter((species) => species.id === "meloetta" || species.formOf === "meloetta");

  assert.deepEqual(
    meloettaGroup.map((species) => species.id).sort(),
    ["meloetta", "meloetta-pirouette"]
  );
  for (const species of meloettaGroup) {
    assert.equal(species.dexNumber, 648, `${species.id} must share dexNumber 648`);
    assert.equal(species.rarity, "legendary", `${species.id} must be rarity "legendary"`);
  }
});

test("Meloetta form sprite ids resolve to the real on-disk sprite filenames (0648/0648P)", () => {
  const byId = new Map(POKEMON_DATA.map((species) => [species.id, species]));

  assert.equal(byId.get("meloetta")!.spriteId, undefined, "meloetta (Aria Forme) has no override — resolves via dexNumber to 0648");
  assert.equal(byId.get("meloetta-pirouette")!.spriteId, "0648P");
});

test("Genesect, Reshiram, Zekrom, and the three Swords of Justice are single-entry (no alternate forms implemented for them)", () => {
  for (const id of ["genesect", "reshiram", "zekrom", "cobalion", "terrakion", "virizion", "victini"]) {
    const group = POKEMON_DATA.filter((species) => species.id === id || species.formOf === id);
    assert.deepEqual(group.map((species) => species.id), [id], `${id} must have no alternate-form entries`);
  }
});

test("Keldeo has exactly two internal form entries (Ordinary + Resolute), both sharing dexNumber 647", () => {
  const keldeoGroup = POKEMON_DATA.filter((species) => species.id === "keldeo" || species.formOf === "keldeo");

  assert.deepEqual(
    keldeoGroup.map((species) => species.id).sort(),
    ["keldeo", "keldeo-resolute"]
  );
  for (const species of keldeoGroup) {
    assert.equal(species.dexNumber, 647, `${species.id} must share dexNumber 647`);
    assert.equal(species.rarity, "legendary", `${species.id} must be rarity "legendary"`);
  }
});

test("Keldeo Resolute Form has the required fields (dexNumber 647, formOf keldeo, formLabel Resolute Form, rarity legendary)", () => {
  const resolute = POKEMON_DATA.find((species) => species.id === "keldeo-resolute");
  assert.ok(resolute, "keldeo-resolute must exist in the catalog");
  assert.equal(resolute!.dexNumber, 647);
  assert.equal(resolute!.formOf, "keldeo");
  assert.equal(resolute!.formLabel, "Resolute Form");
  assert.equal(resolute!.rarity, "legendary");
});

test("Keldeo form sprite ids resolve to the real on-disk sprite filenames (0647/0647R)", () => {
  const byId = new Map(POKEMON_DATA.map((species) => [species.id, species]));

  assert.equal(byId.get("keldeo")!.spriteId, undefined, "keldeo (Ordinary Form) has no override — resolves via dexNumber to 0647");
  assert.equal(byId.get("keldeo-resolute")!.spriteId, "0647R");
});

test("Hoopa has exactly two internal form entries (Confined + Unbound), both sharing dexNumber 720", () => {
  const hoopaGroup = POKEMON_DATA.filter((species) => species.id === "hoopa" || species.formOf === "hoopa");

  assert.deepEqual(
    hoopaGroup.map((species) => species.id).sort(),
    ["hoopa", "hoopa-unbound"]
  );
  for (const species of hoopaGroup) {
    assert.equal(species.dexNumber, 720, `${species.id} must share dexNumber 720`);
    assert.equal(species.rarity, "legendary", `${species.id} must be rarity "legendary"`);
  }
});

test("Hoopa Unbound Form has the required fields (dexNumber 720, formOf hoopa, formLabel Unbound Form, rarity legendary)", () => {
  const unbound = POKEMON_DATA.find((species) => species.id === "hoopa-unbound");
  assert.ok(unbound, "hoopa-unbound must exist in the catalog");
  assert.equal(unbound!.dexNumber, 720);
  assert.equal(unbound!.formOf, "hoopa");
  assert.equal(unbound!.formLabel, "Unbound Form");
  assert.equal(unbound!.rarity, "legendary");
});

test("Hoopa Confined is Psychic/Ghost and Hoopa Unbound is Psychic/Dark (distinct typing per form)", () => {
  const confined = POKEMON_DATA.find((species) => species.id === "hoopa")!;
  const unbound = POKEMON_DATA.find((species) => species.id === "hoopa-unbound")!;

  assert.deepEqual(confined.types, ["psychic", "ghost"]);
  assert.deepEqual(unbound.types, ["psychic", "dark"]);
});

test("Hoopa Unbound uses distinct base stats from Hoopa Confined (never a blind copy)", () => {
  const confined = POKEMON_DATA.find((species) => species.id === "hoopa")!;
  const unbound = POKEMON_DATA.find((species) => species.id === "hoopa-unbound")!;

  assert.notDeepEqual(unbound.baseStats, confined.baseStats);
});

test("Hoopa form sprite ids resolve to the real on-disk sprite filenames (0720/0720U)", () => {
  const byId = new Map(POKEMON_DATA.map((species) => [species.id, species]));

  assert.equal(byId.get("hoopa")!.spriteId, undefined, "hoopa (Confined Form) has no override — resolves via dexNumber to 0720");
  assert.equal(byId.get("hoopa-unbound")!.spriteId, "0720U");
});

test("Xerneas, Yveltal, Zygarde, Diancie, and Volcanion are single-entry (no alternate forms implemented for them in this phase)", () => {
  for (const id of ["xerneas", "yveltal", "zygarde", "diancie", "volcanion"]) {
    const group = POKEMON_DATA.filter((species) => species.id === id || species.formOf === id);
    assert.deepEqual(group.map((species) => species.id), [id], `${id} must have no alternate-form entries`);
  }
});

test("no unapproved Kalos form groups exist (Aegislash, Pumpkaboo, Gourgeist, Vivillon, Flabébé/Floette/Florges, and Xerneas Active Mode are all deliberately single-entry)", () => {
  for (const id of ["aegislash", "pumpkaboo", "gourgeist", "vivillon", "flabebe", "floette", "florges"]) {
    const group = POKEMON_DATA.filter((species) => species.id === id || species.formOf === id);
    assert.deepEqual(group.map((species) => species.id), [id], `${id} must have no alternate-form entries`);
  }
});

test("Basculin, Deerling, Sawsbuck, Darmanitan, and Genesect have no alternate-form entries (their real forms are explicitly out of this phase's scope)", () => {
  for (const id of ["basculin", "deerling", "sawsbuck", "darmanitan"]) {
    const group = POKEMON_DATA.filter((species) => species.id === id || species.formOf === id);
    assert.deepEqual(group.map((species) => species.id), [id], `${id} must have no alternate-form entries`);
  }
});

test("no unexpected alternate forms exist beyond Deoxys, Rotom, Giratina, Tornadus, Thundurus, Landorus, Kyurem, Keldeo, Meloetta, and Hoopa", () => {
  const formGroupBases = new Set(
    POKEMON_DATA.filter((species) => species.formOf !== undefined).map((species) => species.formOf)
  );
  assert.deepEqual(
    [...formGroupBases].sort(),
    ["deoxys", "giratina", "hoopa", "keldeo", "kyurem", "landorus", "meloetta", "rotom", "thundurus", "tornadus"]
  );
});

test("exactly 17 alternate-form rows exist in total (3 Deoxys + 5 Rotom + 1 Giratina + 1 Tornadus + 1 Thundurus + 1 Landorus + 2 Kyurem + 1 Keldeo + 1 Meloetta + 1 Hoopa)", () => {
  const formRows = POKEMON_DATA.filter((species) => species.formOf !== undefined);
  assert.equal(formRows.length, 17);
});

test("no Hoenn starter-line species (Treecko/Torchic/Mudkip lines) is marked isStarter", () => {
  const hoennStarterLineIds = [
    "treecko", "grovyle", "sceptile",
    "torchic", "combusken", "blaziken",
    "mudkip", "marshtomp", "swampert",
  ];
  const byId = new Map(POKEMON_DATA.map((species) => [species.id, species]));

  for (const id of hoennStarterLineIds) {
    const species = byId.get(id);
    assert.ok(species, `expected ${id} to exist in the catalog`);
    assert.notEqual(species!.isStarter, true, `${id} must not be an onboarding starter`);
  }
});

test("no Sinnoh starter-line species (Turtwig/Chimchar/Piplup lines) is marked isStarter", () => {
  const sinnohStarterLineIds = [
    "turtwig", "grotle", "torterra",
    "chimchar", "monferno", "infernape",
    "piplup", "prinplup", "empoleon",
  ];
  const byId = new Map(POKEMON_DATA.map((species) => [species.id, species]));

  for (const id of sinnohStarterLineIds) {
    const species = byId.get(id);
    assert.ok(species, `expected ${id} to exist in the catalog`);
    assert.notEqual(species!.isStarter, true, `${id} must not be an onboarding starter`);
  }
});

test("no Unova starter-line species (Snivy/Tepig/Oshawott lines) is marked isStarter", () => {
  const unovaStarterLineIds = [
    "snivy", "servine", "serperior",
    "tepig", "pignite", "emboar",
    "oshawott", "dewott", "samurott",
  ];
  const byId = new Map(POKEMON_DATA.map((species) => [species.id, species]));

  for (const id of unovaStarterLineIds) {
    const species = byId.get(id);
    assert.ok(species, `expected ${id} to exist in the catalog`);
    assert.notEqual(species!.isStarter, true, `${id} must not be an onboarding starter`);
  }
});

test("no Kalos starter-line species (Chespin/Fennekin/Froakie lines) is marked isStarter", () => {
  const kalosStarterLineIds = [
    "chespin", "quilladin", "chesnaught",
    "fennekin", "braixen", "delphox",
    "froakie", "frogadier", "greninja",
  ];
  const byId = new Map(POKEMON_DATA.map((species) => [species.id, species]));

  for (const id of kalosStarterLineIds) {
    const species = byId.get(id);
    assert.ok(species, `expected ${id} to exist in the catalog`);
    assert.notEqual(species!.isStarter, true, `${id} must not be an onboarding starter`);
  }
});

test("onboarding starters remain exactly Bulbasaur/Charmander/Squirtle", () => {
  const starterIds = POKEMON_DATA.filter((species) => species.isStarter)
    .map((species) => species.id)
    .sort();
  assert.deepEqual(starterIds, ["bulbasaur", "charmander", "squirtle"]);
});

test("Unova's starter trio and pseudo-legendary line are all very-rare at every evolution stage", () => {
  const veryRareLineIds = [
    "snivy", "servine", "serperior",
    "tepig", "pignite", "emboar",
    "oshawott", "dewott", "samurott",
    "deino", "zweilous", "hydreigon",
  ];
  const byId = new Map(POKEMON_DATA.map((species) => [species.id, species]));

  for (const id of veryRareLineIds) {
    const species = byId.get(id);
    assert.ok(species, `expected ${id} to exist in the catalog`);
    assert.equal(species!.rarity, "very-rare", `${id} must be rarity "very-rare"`);
  }
});

test("Unova Update rarity pass: Zorua, Zoroark, Larvesta, and Volcarona are now real very-rare (a direct rarity reassignment, not an evolution-item override)", () => {
  const byId = new Map(POKEMON_DATA.map((species) => [species.id, species]));

  for (const id of ["zorua", "zoroark", "larvesta", "volcarona"]) {
    const species = byId.get(id);
    assert.ok(species, `expected ${id} to exist in the catalog`);
    assert.equal(species!.rarity, "very-rare", `${id} must be rarity "very-rare"`);
  }
});

test("Kalos's starter trio and pseudo-legendary line are all very-rare at every evolution stage", () => {
  const veryRareLineIds = [
    "chespin", "quilladin", "chesnaught",
    "fennekin", "braixen", "delphox",
    "froakie", "frogadier", "greninja",
    "goomy", "sliggoo", "goodra",
  ];
  const byId = new Map(POKEMON_DATA.map((species) => [species.id, species]));

  for (const id of veryRareLineIds) {
    const species = byId.get(id);
    assert.ok(species, `expected ${id} to exist in the catalog`);
    assert.equal(species!.rarity, "very-rare", `${id} must be rarity "very-rare"`);
  }
});

test("Kalos's legendary/mythical species (Xerneas, Yveltal, Zygarde, Diancie, Hoopa incl. Unbound, Volcanion) are all real legendary", () => {
  const byId = new Map(POKEMON_DATA.map((species) => [species.id, species]));

  for (const id of ["xerneas", "yveltal", "zygarde", "diancie", "hoopa", "hoopa-unbound", "volcanion"]) {
    const species = byId.get(id);
    assert.ok(species, `expected ${id} to exist in the catalog`);
    assert.equal(species!.rarity, "legendary", `${id} must be rarity "legendary"`);
  }
});

test("every species has one valid rarity value", () => {
  for (const species of POKEMON_DATA) {
    assert.ok(
      VALID_RARITIES.includes(species.rarity),
      `${species.id} has invalid rarity "${species.rarity}"`
    );
  }
});

test("rarity tier counts match the assigned classification exactly", () => {
  const actualCounts: Record<PokemonRarity, number> = {
    common: 0,
    rare: 0,
    "very-rare": 0,
    legendary: 0,
  };
  for (const species of POKEMON_DATA) {
    actualCounts[species.rarity] += 1;
  }
  assert.deepEqual(actualCounts, EXPECTED_RARITY_COUNTS);
});
