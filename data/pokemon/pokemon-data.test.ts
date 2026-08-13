import assert from "node:assert/strict";
import { test } from "node:test";

import { POKEMON_DATA } from "@/data/pokemon/pokemon-data";
import { getBackSpritePath, getFrontSpritePath } from "@/features/pokemon/media/pokemon-media-paths";
import type { PokemonRarity, PokemonSpecies } from "@/shared/types/pokemon";

// Generation 1 (Kanto, #0001-#0151) + Generation 2 (Johto, #0152-#0251) +
// Generation 3 (Hoenn, #0252-#0386) + Generation 4 (Sinnoh, #0387-#0493) +
// Generation 5 (Unova, #0494-#0649) + Generation 6 (Kalos, #0650-#0721) +
// Generation 7 (Alola, #0722-#0809) + Generation 8 (Galar, #0810-#0898) —
// 898 official National Dex entries (one base/headline species row per dex
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
// the Unova Update phase), 1 Meloetta form (dex #648: Pirouette), 1
// Hoopa form (dex #720: Unbound — added in the Kalos Phase 1 species
// catalog), 2 Lycanroc forms (dex #745: Midnight/Dusk — added in the
// Alola Phase 1 species catalog), 18 Alolan Forms (regional variants
// of 18 Kanto species, sharing THEIR bases' dex numbers — #19/#20/#26/
// #27/#28/#37/#38/#50/#51/#52/#53/#74/#75/#76/#88/#89/#103/#105 — also
// added in the Alola Phase 1 species catalog), and 19 Galarian Forms
// (regional variants of 19 Kanto/Johto/Hoenn/Unova species, sharing THEIR
// bases' dex numbers — #52/#77/#78/#79/#80/#83/#110/#122/#144/#145/#146/
// #199/#222/#263/#264/#554/#555/#562/#618 — added in the Galar Phase 1
// species catalog), and 17 Hisuian Forms (regional variants of 17 species
// spanning Kanto/Johto/Unova/Kalos/Alola, sharing THEIR bases' dex
// numbers — #58/#59/#100/#101/#157/#211/#215/#503/#549/#550/#570/#571/
// #628/#705/#706/#713/#724 — added by the Pre-Paldea 17 Hisuian Forms
// step, Sinnoh-owned per generation-4-pokemon-data.ts's own top-of-file
// note despite their bases living in other generations' files). That
// makes two different, both-correct counts:
//   - EXPECTED_BASE_DEX_COUNT (905): distinct dex numbers / Pokédex rows —
//     what "dex numbers cover 1..N with no gaps" and the Pokédex service's
//     own row count are checked against. Extended from 898 to 905 by the
//     Pre-Paldea step (7 Sinnoh-owned species appended to
//     generation-4-pokemon-data.ts — #899-905: Wyrdeer, Kleavor, Ursaluna,
//     Basculegion, Sneasler, Overqwil, Enamorus; none are Paldea species).
//     The 17 Hisuian Forms add zero new dex numbers (each shares its own
//     ordinary counterpart's existing dex number via formOf), so this
//     count is unaffected by them.
//   - EXPECTED_TOTAL_SPECIES_COUNT (978): every PokemonSpecies row in
//     POKEMON_DATA, including all 73 alternate forms — what "every id is
//     present exactly once" is checked against. 954 + 7 Pre-Paldea species
//     (none are alternate forms) + 17 Pre-Paldea Hisuian Forms (all 17 are
//     alternate forms) = 978.
const EXPECTED_BASE_DEX_COUNT = 905;
const EXPECTED_TOTAL_SPECIES_COUNT = 978;

const VALID_RARITIES: PokemonRarity[] = ["common", "rare", "very-rare", "legendary"];

// Rarity classification as assigned by design decision (2026-07-29,
// extended 2026-08-04 for Generation 2, extended 2026-08-05 for Generation
// 3/Hoenn, extended 2026-08-05 for Generation 4/Sinnoh, revised again for
// the Sinnoh Rarity Audit approved-design-change pass, extended again for
// Generation 5/Unova, revised again for the Unova Update rarity pass,
// extended again for Generation 6/Kalos Phase 1, extended again for
// Generation 7/Alola Phase 1, extended again for Generation 8/Galar Phase
// 1 — see generation-7-pokemon-data.ts's own header comment for the full
// rarity philosophy, including the explicit Type: Null/Silvally judgment
// call, and generation-8-pokemon-data.ts's own header comment for the
// Galar-specific philosophy (no rarity audit performed yet — deferred to
// the future GALAR PHASE 7 — Rarity Audit): every species keyed by
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
// Kalos's starter trio and pseudo-legendary line (Chespin/Quilladin/
// Chesnaught, Fennekin/Braixen/Delphox, Froakie/Frogadier/Greninja,
// Goomy/Sliggoo/Goodra — 12 rows total, all "very-rare"), Alola's starter
// trio and pseudo-legendary line (Rowlet/Dartrix/Decidueye, Litten/
// Torracat/Incineroar, Popplio/Brionne/Primarina, Jangmo-o/Hakamo-o/
// Kommo-o — 12 rows total, all "very-rare"), every Alola legendary/
// mythical/Ultra Beast (the 4 Tapu, Cosmog/Cosmoem/Solgaleo/Lunala, the 11
// Ultra Beasts incl. Poipole/Naganadel, Necrozma, Magearna, Marshadow,
// Zeraora, Meltan/Melmetal — 25 rows total, all "legendary" — this
// project's four-tier model has no separate mythical/ultra-beast tier),
// the 18 Alolan Forms plus 2 Lycanroc alternate forms (each inheriting
// its own base species' exact rarity tier, per this project's established
// "a form always shares its base's rarity" rule) — EXCEPT the four Alolan
// Forms the approved Alola Rarity Audit explicitly retuned away from their
// Kanto base's rarity (raticate-alola, golem-alola, muk-alola,
// marowak-alola; see generation-7-pokemon-data.ts's own "ALOLA RARITY
// AUDIT" comment and ALOLAN_FORM_EXPECTATIONS below for the exact
// approved values), Galar's starter trio and pseudo-legendary line
// (Grookey/Thwackey/Rillaboom, Scorbunny/Raboot/Cinderace, Sobble/
// Drizzile/Inteleon, Dreepy/Drakloak/Dragapult — 12 rows total, all
// "very-rare"), every Galar legendary/mythical (Zacian, Zamazenta,
// Eternatus, Kubfu, Urshifu, Zarude, Regieleki, Regidrago, Glastrier,
// Spectrier, Calyrex — 11 rows total, all "legendary" — Zarude is a
// Mythical in the source games, mapped to "legendary" the same way
// Meltan/Melmetal/Magearna/Marshadow/Zeraora were in Alola), and the 19
// Galarian Forms (each inheriting its own base species' exact rarity tier
// verbatim, including the 3 Legendary-bird forms — Articuno/Zapdos/
// Moltres-Galar all stay "legendary" — no rarity audit was performed this
// phase; see GALARIAN_FORM_EXPECTATIONS below), and the Pre-Paldea step's 7
// new species (#899-905): Wyrdeer/Ursaluna/Basculegion/Sneasler/Overqwil
// are "rare" (this project's standard "ordinary fully-evolved species are
// rare" rule, same tier as Weavile — another fully-evolved former-item
// evolution), Enamorus is "legendary" (matching the Tornadus/Thundurus/
// Landorus family it shares a Forme shape with), and Kleavor is
// "very-rare" (revised from its initial "rare" assignment during the
// user-approved Sinnoh encounter-zone placement step — see
// data/zones/sinnoh-zone-data.ts), and the 17 Pre-Paldea Hisuian Forms
// (user-approved rule: each copies its ordinary counterpart's exact live
// rarity — see HISUIAN_FORM_EXPECTATIONS below for the full per-species
// mapping): 4 common (growlithe-hisui, voltorb-hisui, electrode-hisui,
// sneasel-hisui), 6 rare (arcanine-hisui, qwilfish-hisui, lilligant-hisui,
// basculin-hisui, braviary-hisui, avalugg-hisui), 7 very-rare
// (typhlosion-hisui, samurott-hisui, zorua-hisui, zoroark-hisui,
// sliggoo-hisui, goodra-hisui, decidueye-hisui). See
// generation-5/6/7/8-pokemon-data.ts's own per-species rarity fields for
// the single source of truth.
const EXPECTED_RARITY_COUNTS: Record<PokemonRarity, number> = {
  common: 369,
  rare: 372,
  "very-rare": 125,
  legendary: 112,
};

test("exactly 846 Pokémon species rows are loaded (809 base Dex entries + 37 alternate forms)", () => {
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

test("dex numbers, deduped by base form, cover exactly 1 through 905 with no gaps", () => {
  const dexNumbers = POKEMON_DATA.filter((species) => species.formOf === undefined)
    .map((species) => species.dexNumber)
    .sort((a, b) => a - b);
  const expected = Array.from({ length: EXPECTED_BASE_DEX_COUNT }, (_, i) => i + 1);
  assert.deepEqual(dexNumbers, expected);
});

// Galar Phase 1 stopped at Calyrex (#898); the Pre-Paldea step extended the
// base-dex sequence through Enamorus (#905) — 7 Sinnoh-owned species, never
// Paldea (Paldea itself still has zero species in this catalog).
test("no species uses dexNumber 906 or higher (the Pre-Paldea step stops at Enamorus, #905; Paldea has not started)", () => {
  const maxDexNumber = Math.max(...POKEMON_DATA.map((species) => species.dexNumber));
  assert.equal(maxDexNumber, 905);
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

test("Deerling and Sawsbuck have no alternate-form entries (their real forms are explicitly out of this phase's scope)", () => {
  for (const id of ["deerling", "sawsbuck"]) {
    const group = POKEMON_DATA.filter((species) => species.id === id || species.formOf === id);
    assert.deepEqual(group.map((species) => species.id), [id], `${id} must have no alternate-form entries`);
  }
});

// Basculin is deliberately excluded from the "no alternate-form entries"
// rule above as of the Pre-Paldea 17 Hisuian Forms step — it now legitimately
// has exactly one alternate form (basculin-hisui, its real White-Striped
// Hisuian counterpart) — see HISUIAN_FORM_EXPECTATIONS further down.
test("Basculin has exactly one alternate-form entry (basculin-hisui), sharing its own dexNumber 550", () => {
  const group = POKEMON_DATA.filter((species) => species.id === "basculin" || species.formOf === "basculin");
  assert.deepEqual(
    group.map((species) => species.id).sort(),
    ["basculin", "basculin-hisui"]
  );
  for (const species of group) {
    assert.equal(species.dexNumber, 550, `${species.id} must share dexNumber 550`);
  }
});

// Darmanitan's real Zen Mode / Galarian Zen Mode battle-state forms remain
// explicitly out of scope (see generation-8-pokemon-data.ts's own header
// comment) — but Darmanitan now legitimately has exactly ONE alternate
// form as of Galar Phase 1: the Galarian Standard Mode regional form
// (darmanitan-galar). This test replaces Darmanitan's old membership in
// the Kalos-era "no alternate-form entries" list above, which is now
// stale rather than a real invariant.
test("Darmanitan has exactly two internal form entries (Kanto/base + Galarian), both sharing dexNumber 555", () => {
  const darmanitanGroup = POKEMON_DATA.filter((species) => species.id === "darmanitan" || species.formOf === "darmanitan");

  assert.deepEqual(
    darmanitanGroup.map((species) => species.id).sort(),
    ["darmanitan", "darmanitan-galar"]
  );
  for (const species of darmanitanGroup) {
    assert.equal(species.dexNumber, 555, `${species.id} must share dexNumber 555`);
  }
});

test("no unexpected alternate forms exist beyond Deoxys, Rotom, Giratina, Tornadus, Thundurus, Landorus, Kyurem, Keldeo, Meloetta, Hoopa, Lycanroc, the 18 Alolan Form base species, the 19 Galarian Form base species, and the 17 Pre-Paldea Hisuian Form base species", () => {
  const formGroupBases = new Set(
    POKEMON_DATA.filter((species) => species.formOf !== undefined).map((species) => species.formOf)
  );
  assert.deepEqual(
    [...formGroupBases].sort(),
    [
      "arcanine", "articuno", "avalugg", "basculin", "braviary", "corsola", "darmanitan", "darumaka",
      "decidueye", "deoxys", "diglett", "dugtrio", "electrode", "exeggutor",
      "farfetchd", "geodude", "giratina", "golem", "goodra", "graveler", "grimer", "growlithe", "hoopa",
      "keldeo", "kyurem", "landorus", "lilligant", "linoone", "lycanroc", "marowak", "meloetta", "meowth",
      "moltres", "mr-mime", "muk", "ninetales", "persian", "ponyta", "qwilfish",
      "raichu", "rapidash", "raticate", "rattata", "rotom",
      "samurott", "sandshrew", "sandslash", "sliggoo", "slowbro", "slowking", "slowpoke", "sneasel", "stunfisk",
      "thundurus", "tornadus", "typhlosion", "voltorb", "vulpix", "weezing", "yamask", "zapdos", "zigzagoon",
      "zoroark", "zorua",
    ].sort()
  );
});

test("exactly 73 alternate-form rows exist in total (3 Deoxys + 5 Rotom + 1 Giratina + 1 Tornadus + 1 Thundurus + 1 Landorus + 2 Kyurem + 1 Keldeo + 1 Meloetta + 1 Hoopa + 2 Lycanroc + 18 Alolan Forms + 19 Galarian Forms + 17 Pre-Paldea Hisuian Forms)", () => {
  const formRows = POKEMON_DATA.filter((species) => species.formOf !== undefined);
  assert.equal(formRows.length, 73);
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

test("exactly 88 official Alola base species exist for #722-809", () => {
  const alolaBase = POKEMON_DATA.filter(
    (species) => species.formOf === undefined && species.dexNumber >= 722 && species.dexNumber <= 809
  );
  assert.equal(alolaBase.length, 88);
});

test("Rowlet is #722 and Melmetal is #809 (the Alola base dex range's own endpoints)", () => {
  const rowlet = POKEMON_DATA.find((species) => species.id === "rowlet");
  assert.ok(rowlet, "Rowlet must exist in the catalog");
  assert.equal(rowlet!.dexNumber, 722);

  const melmetal = POKEMON_DATA.find((species) => species.id === "melmetal");
  assert.ok(melmetal, "Melmetal must exist in the catalog");
  assert.equal(melmetal!.dexNumber, 809);
  assert.equal(melmetal!.rarity, "legendary");
});

test("Alola's starter trio and pseudo-legendary line are all very-rare at every evolution stage", () => {
  const veryRareLineIds = [
    "rowlet", "dartrix", "decidueye",
    "litten", "torracat", "incineroar",
    "popplio", "brionne", "primarina",
    "jangmo-o", "hakamo-o", "kommo-o",
  ];
  const byId = new Map(POKEMON_DATA.map((species) => [species.id, species]));

  for (const id of veryRareLineIds) {
    const species = byId.get(id);
    assert.ok(species, `expected ${id} to exist in the catalog`);
    assert.equal(species!.rarity, "very-rare", `${id} must be rarity "very-rare"`);
  }
});

test("Alola's legendary/mythical/Ultra Beast species are all real legendary (this project's four-tier model has no separate mythical/ultra-beast tier)", () => {
  const legendaryIds = [
    "tapu-koko", "tapu-lele", "tapu-bulu", "tapu-fini",
    "cosmog", "cosmoem", "solgaleo", "lunala",
    "nihilego", "buzzwole", "pheromosa", "xurkitree", "celesteela", "kartana", "guzzlord",
    "necrozma", "magearna", "marshadow",
    "poipole", "naganadel", "stakataka", "blacephalon",
    "zeraora", "meltan", "melmetal",
  ];
  const byId = new Map(POKEMON_DATA.map((species) => [species.id, species]));

  for (const id of legendaryIds) {
    const species = byId.get(id);
    assert.ok(species, `expected ${id} to exist in the catalog`);
    assert.equal(species!.rarity, "legendary", `${id} must be rarity "legendary"`);
  }
});

test("Type: Null and Silvally are deliberately NOT legendary (explicit judgment call: neither is officially flagged Legendary/Mythical/Ultra Beast in the source games, so they use the ordinary two-stage common/rare rule instead)", () => {
  const typeNull = POKEMON_DATA.find((species) => species.id === "type-null");
  assert.ok(typeNull, "type-null must exist in the catalog");
  assert.equal(typeNull!.dexNumber, 772);
  assert.equal(typeNull!.rarity, "common");
  assert.equal(typeNull!.formOf, undefined);

  const silvally = POKEMON_DATA.find((species) => species.id === "silvally");
  assert.ok(silvally, "silvally must exist in the catalog");
  assert.equal(silvally!.dexNumber, 773);
  assert.equal(silvally!.rarity, "rare");
  assert.equal(silvally!.formOf, undefined);
});

test("Lycanroc has exactly three internal form entries (Midday/base + Midnight + Dusk), all sharing dexNumber 745", () => {
  const lycanrocGroup = POKEMON_DATA.filter((species) => species.id === "lycanroc" || species.formOf === "lycanroc");

  assert.deepEqual(
    lycanrocGroup.map((species) => species.id).sort(),
    ["lycanroc", "lycanroc-dusk", "lycanroc-midnight"]
  );
  for (const species of lycanrocGroup) {
    assert.equal(species.dexNumber, 745, `${species.id} must share dexNumber 745`);
    assert.equal(species.rarity, "rare", `${species.id} must be rarity "rare" (matches base Lycanroc)`);
    assert.deepEqual(species.types, ["rock"], `${species.id} must keep the Rock type`);
  }
});

test("Lycanroc form sprite ids resolve to the real on-disk sprite filenames (0745/0745M/0745D)", () => {
  const byId = new Map(POKEMON_DATA.map((species) => [species.id, species]));

  assert.equal(byId.get("lycanroc")!.spriteId, undefined, "lycanroc (Midday Form) has no override — resolves via dexNumber to 0745");
  assert.equal(byId.get("lycanroc-midnight")!.spriteId, "0745M");
  assert.equal(byId.get("lycanroc-dusk")!.spriteId, "0745D");
});

test("Lycanroc's three forms use genuinely distinct base stats (never a blind copy across forms)", () => {
  const midday = POKEMON_DATA.find((species) => species.id === "lycanroc")!;
  const midnight = POKEMON_DATA.find((species) => species.id === "lycanroc-midnight")!;
  const dusk = POKEMON_DATA.find((species) => species.id === "lycanroc-dusk")!;

  assert.notDeepEqual(midnight.baseStats, midday.baseStats);
  assert.notDeepEqual(dusk.baseStats, midday.baseStats);
  assert.notDeepEqual(dusk.baseStats, midnight.baseStats);
});

// The 18 Alolan Forms — regional variants of 18 Kanto species (bases live
// in generation-1-pokemon-data.ts). See generation-7-pokemon-data.ts's own
// header comment for the full rationale. `expectedRarity`, when set,
// overrides the default "inherits its base's exact rarity" check — used
// only for the four forms the approved Alola Rarity Audit explicitly
// retuned away from their Kanto base's rarity (raticate-alola, golem-alola,
// muk-alola, marowak-alola); every other form still must equal its base's
// rarity exactly.
const ALOLAN_FORM_EXPECTATIONS: Array<{
  formId: string;
  baseId: string;
  kantoDexNumber: number;
  spriteId: string;
  expectedRarity?: PokemonRarity;
}> = [
  { formId: "rattata-alola", baseId: "rattata", kantoDexNumber: 19, spriteId: "0019A" },
  { formId: "raticate-alola", baseId: "raticate", kantoDexNumber: 20, spriteId: "0020A", expectedRarity: "rare" },
  { formId: "raichu-alola", baseId: "raichu", kantoDexNumber: 26, spriteId: "0026A" },
  { formId: "sandshrew-alola", baseId: "sandshrew", kantoDexNumber: 27, spriteId: "0027A" },
  { formId: "sandslash-alola", baseId: "sandslash", kantoDexNumber: 28, spriteId: "0028A" },
  { formId: "vulpix-alola", baseId: "vulpix", kantoDexNumber: 37, spriteId: "0037A" },
  { formId: "ninetales-alola", baseId: "ninetales", kantoDexNumber: 38, spriteId: "0038A" },
  { formId: "diglett-alola", baseId: "diglett", kantoDexNumber: 50, spriteId: "0050A" },
  { formId: "dugtrio-alola", baseId: "dugtrio", kantoDexNumber: 51, spriteId: "0051A" },
  { formId: "meowth-alola", baseId: "meowth", kantoDexNumber: 52, spriteId: "0052A" },
  { formId: "persian-alola", baseId: "persian", kantoDexNumber: 53, spriteId: "0053A" },
  { formId: "geodude-alola", baseId: "geodude", kantoDexNumber: 74, spriteId: "0074A" },
  { formId: "graveler-alola", baseId: "graveler", kantoDexNumber: 75, spriteId: "0075A" },
  { formId: "golem-alola", baseId: "golem", kantoDexNumber: 76, spriteId: "0076A", expectedRarity: "very-rare" },
  { formId: "grimer-alola", baseId: "grimer", kantoDexNumber: 88, spriteId: "0088A" },
  { formId: "muk-alola", baseId: "muk", kantoDexNumber: 89, spriteId: "0089A", expectedRarity: "rare" },
  { formId: "exeggutor-alola", baseId: "exeggutor", kantoDexNumber: 103, spriteId: "0103A" },
  { formId: "marowak-alola", baseId: "marowak", kantoDexNumber: 105, spriteId: "0105A", expectedRarity: "very-rare" },
];

test("exactly 18 Alolan Forms exist in the catalog", () => {
  const alolanFormIds = POKEMON_DATA.filter((species) => species.formLabel === "Alolan Form").map((species) => species.id);
  assert.equal(alolanFormIds.length, 18);
  assert.deepEqual(
    alolanFormIds.sort(),
    ALOLAN_FORM_EXPECTATIONS.map((expectation) => expectation.formId).sort()
  );
});

for (const { formId, baseId, kantoDexNumber, spriteId, expectedRarity } of ALOLAN_FORM_EXPECTATIONS) {
  const rarityExpectation = expectedRarity
    ? `is real rarity "${expectedRarity}" per the approved Alola Rarity Audit (an explicit exception to base-rarity inheritance)`
    : "inherits its base's exact rarity";

  test(`${formId}: formOf "${baseId}", shares its Kanto base's dexNumber #${kantoDexNumber}, uses the verified sprite id "${spriteId}", and ${rarityExpectation}`, () => {
    const byId = new Map(POKEMON_DATA.map((species) => [species.id, species]));
    const base = byId.get(baseId);
    const form = byId.get(formId);

    assert.ok(base, `expected base species "${baseId}" to exist in the catalog`);
    assert.ok(form, `expected Alolan Form "${formId}" to exist in the catalog`);

    assert.equal(form!.formOf, baseId);
    assert.equal(form!.dexNumber, kantoDexNumber);
    assert.equal(base!.dexNumber, kantoDexNumber);
    assert.equal(form!.spriteId, spriteId);

    if (expectedRarity) {
      assert.equal(form!.rarity, expectedRarity, `${formId} must be real rarity "${expectedRarity}" per the approved Alola Rarity Audit`);
    } else {
      assert.equal(form!.rarity, base!.rarity, `${formId} must inherit its base's exact rarity ("${base!.rarity}")`);
    }
  });
}

test("exactly 89 official Galar base species exist for #810-898", () => {
  const galarBase = POKEMON_DATA.filter(
    (species) => species.formOf === undefined && species.dexNumber >= 810 && species.dexNumber <= 898
  );
  assert.equal(galarBase.length, 89);
});

test("Grookey is #810 and Calyrex is #898 (the Galar base dex range's own endpoints)", () => {
  const grookey = POKEMON_DATA.find((species) => species.id === "grookey");
  assert.ok(grookey, "Grookey must exist in the catalog");
  assert.equal(grookey!.dexNumber, 810);

  const calyrex = POKEMON_DATA.find((species) => species.id === "calyrex");
  assert.ok(calyrex, "Calyrex must exist in the catalog");
  assert.equal(calyrex!.dexNumber, 898);
  assert.equal(calyrex!.rarity, "legendary");
});

test("Galar's starter trio and pseudo-legendary line are all very-rare at every evolution stage", () => {
  const veryRareLineIds = [
    "grookey", "thwackey", "rillaboom",
    "scorbunny", "raboot", "cinderace",
    "sobble", "drizzile", "inteleon",
    "dreepy", "drakloak", "dragapult",
  ];
  const byId = new Map(POKEMON_DATA.map((species) => [species.id, species]));

  for (const id of veryRareLineIds) {
    const species = byId.get(id);
    assert.ok(species, `expected ${id} to exist in the catalog`);
    assert.equal(species!.rarity, "very-rare", `${id} must be rarity "very-rare"`);
  }
});

test("Galar's legendary/mythical species are all real legendary (this project's four-tier model has no separate mythical tier)", () => {
  const legendaryIds = [
    "zacian", "zamazenta", "eternatus", "kubfu", "urshifu", "zarude",
    "regieleki", "regidrago", "glastrier", "spectrier", "calyrex",
  ];
  const byId = new Map(POKEMON_DATA.map((species) => [species.id, species]));

  for (const id of legendaryIds) {
    const species = byId.get(id);
    assert.ok(species, `expected ${id} to exist in the catalog`);
    assert.equal(species!.rarity, "legendary", `${id} must be rarity "legendary"`);
  }
});

test("Obstagoon, Perrserker, Cursola, Sirfetch'd, Mr. Rime, and Runerigus are ordinary Generation 8 base species (evolutions of Galarian Forms), not additional form rows", () => {
  const ids = ["obstagoon", "perrserker", "cursola", "sirfetchd", "mr-rime", "runerigus"];
  const byId = new Map(POKEMON_DATA.map((species) => [species.id, species]));

  for (const id of ids) {
    const species = byId.get(id);
    assert.ok(species, `expected ${id} to exist in the catalog`);
    assert.equal(species!.formOf, undefined, `${id} must be a base species, not a form`);
    assert.ok(species!.dexNumber >= 810 && species!.dexNumber <= 898, `${id} must be in the Galar dex range`);
  }
});

// The 19 Galarian Forms — regional variants of 19 Kanto/Johto/Hoenn/Unova
// species (bases live in generation-1/2/3/5-pokemon-data.ts). See
// generation-8-pokemon-data.ts's own header comment for the full
// rationale. Every Galarian Form inherits its base's exact rarity tier —
// this phase performed no rarity audit (unlike Alola's own Alola Rarity
// Audit), so unlike ALOLAN_FORM_EXPECTATIONS there is no `expectedRarity`
// override field here.
const GALARIAN_FORM_EXPECTATIONS: Array<{
  formId: string;
  baseId: string;
  baseDexNumber: number;
  spriteId: string;
}> = [
  { formId: "meowth-galar", baseId: "meowth", baseDexNumber: 52, spriteId: "0052G" },
  { formId: "ponyta-galar", baseId: "ponyta", baseDexNumber: 77, spriteId: "0077G" },
  { formId: "rapidash-galar", baseId: "rapidash", baseDexNumber: 78, spriteId: "0078G" },
  { formId: "slowpoke-galar", baseId: "slowpoke", baseDexNumber: 79, spriteId: "0079G" },
  { formId: "slowbro-galar", baseId: "slowbro", baseDexNumber: 80, spriteId: "0080G" },
  { formId: "farfetchd-galar", baseId: "farfetchd", baseDexNumber: 83, spriteId: "0083G" },
  { formId: "weezing-galar", baseId: "weezing", baseDexNumber: 110, spriteId: "0110G" },
  { formId: "mr-mime-galar", baseId: "mr-mime", baseDexNumber: 122, spriteId: "0122G" },
  { formId: "articuno-galar", baseId: "articuno", baseDexNumber: 144, spriteId: "0144G" },
  { formId: "zapdos-galar", baseId: "zapdos", baseDexNumber: 145, spriteId: "0145G" },
  { formId: "moltres-galar", baseId: "moltres", baseDexNumber: 146, spriteId: "0146G" },
  { formId: "slowking-galar", baseId: "slowking", baseDexNumber: 199, spriteId: "0199G" },
  { formId: "corsola-galar", baseId: "corsola", baseDexNumber: 222, spriteId: "0222G" },
  { formId: "zigzagoon-galar", baseId: "zigzagoon", baseDexNumber: 263, spriteId: "0263G" },
  { formId: "linoone-galar", baseId: "linoone", baseDexNumber: 264, spriteId: "0264G" },
  { formId: "darumaka-galar", baseId: "darumaka", baseDexNumber: 554, spriteId: "0554G" },
  { formId: "darmanitan-galar", baseId: "darmanitan", baseDexNumber: 555, spriteId: "0555G" },
  { formId: "yamask-galar", baseId: "yamask", baseDexNumber: 562, spriteId: "0562G" },
  { formId: "stunfisk-galar", baseId: "stunfisk", baseDexNumber: 618, spriteId: "0618G" },
];

test("exactly 19 Galarian Forms exist in the catalog", () => {
  const galarianFormIds = POKEMON_DATA.filter((species) => species.formLabel === "Galarian Form").map(
    (species) => species.id
  );
  assert.equal(galarianFormIds.length, 19);
  assert.deepEqual(
    galarianFormIds.sort(),
    GALARIAN_FORM_EXPECTATIONS.map((expectation) => expectation.formId).sort()
  );
});

for (const { formId, baseId, baseDexNumber, spriteId } of GALARIAN_FORM_EXPECTATIONS) {
  test(`${formId}: formOf "${baseId}", shares its base's dexNumber #${baseDexNumber}, uses the verified sprite id "${spriteId}", and inherits its base's exact rarity`, () => {
    const byId = new Map(POKEMON_DATA.map((species) => [species.id, species]));
    const base = byId.get(baseId);
    const form = byId.get(formId);

    assert.ok(base, `expected base species "${baseId}" to exist in the catalog`);
    assert.ok(form, `expected Galarian Form "${formId}" to exist in the catalog`);

    assert.equal(form!.formOf, baseId);
    assert.equal(form!.dexNumber, baseDexNumber);
    assert.equal(base!.dexNumber, baseDexNumber);
    assert.equal(form!.spriteId, spriteId);
    assert.equal(form!.rarity, base!.rarity, `${formId} must inherit its base's exact rarity ("${base!.rarity}")`);
  });
}

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

// ============================================================================
// PRE-PALDEA STEP — #899-905, Sinnoh-owned (not Paldea)
// ============================================================================

const PRE_PALDEA_EXPECTATIONS: Array<{
  id: string;
  dexNumber: number;
  types: PokemonSpecies["types"];
  rarity: PokemonRarity;
}> = [
  { id: "wyrdeer", dexNumber: 899, types: ["normal", "psychic"], rarity: "rare" },
  { id: "kleavor", dexNumber: 900, types: ["bug", "rock"], rarity: "very-rare" },
  { id: "ursaluna", dexNumber: 901, types: ["ground", "normal"], rarity: "rare" },
  { id: "basculegion", dexNumber: 902, types: ["water", "ghost"], rarity: "rare" },
  { id: "sneasler", dexNumber: 903, types: ["fighting", "poison"], rarity: "rare" },
  { id: "overqwil", dexNumber: 904, types: ["dark", "poison"], rarity: "rare" },
  { id: "enamorus", dexNumber: 905, types: ["fairy", "flying"], rarity: "legendary" },
];

test("exactly 7 Pre-Paldea species were added (#899-905), each a plain base species (no formOf) with the assigned dexNumber, types, and rarity", () => {
  const byId = new Map(POKEMON_DATA.map((species) => [species.id, species]));

  assert.equal(PRE_PALDEA_EXPECTATIONS.length, 7);
  for (const expectation of PRE_PALDEA_EXPECTATIONS) {
    const species = byId.get(expectation.id);
    assert.ok(species, `expected ${expectation.id} to exist in the catalog`);
    assert.equal(species!.dexNumber, expectation.dexNumber);
    assert.deepEqual(species!.types, expectation.types);
    assert.equal(species!.rarity, expectation.rarity);
    assert.equal(species!.formOf, undefined, `${expectation.id} must be a plain base species, not an alternate form`);
  }
});

test("Pre-Paldea species' front and back sprites resolve to the real on-disk filenames (0899-0905.gif), no spriteId override needed", () => {
  const byId = new Map(POKEMON_DATA.map((species) => [species.id, species]));

  for (const expectation of PRE_PALDEA_EXPECTATIONS) {
    const species = byId.get(expectation.id)!;
    assert.equal(species.spriteId, undefined, `${expectation.id} resolves its sprite from dexNumber alone`);
    assert.equal(getFrontSpritePath(species), `/assets/pokemon/sprites/front/0${expectation.dexNumber}.gif`);
    assert.equal(getBackSpritePath(species), `/assets/pokemon/sprites/back/0${expectation.dexNumber}.gif`);
  }
});

test("no Pre-Paldea species is marked isStarter, and no existing #001-898 species or its rarity/types were disturbed by this addition", () => {
  const byId = new Map(POKEMON_DATA.map((species) => [species.id, species]));

  for (const expectation of PRE_PALDEA_EXPECTATIONS) {
    assert.notEqual(byId.get(expectation.id)!.isStarter, true);
  }

  // Spot-check a handful of pre-existing pre-evolutions this step's new
  // evolutions point away FROM — untouched by this addition.
  const untouched: [string, number, PokemonRarity][] = [
    ["stantler", 234, "common"],
    ["scyther", 123, "rare"],
    ["ursaring", 217, "rare"],
    ["basculin", 550, "rare"],
    ["sneasel", 215, "common"],
    ["qwilfish", 211, "rare"],
    ["calyrex", 898, "legendary"],
  ];
  for (const [id, dexNumber, rarity] of untouched) {
    const species = byId.get(id);
    assert.ok(species, `expected ${id} to still exist in the catalog`);
    assert.equal(species!.dexNumber, dexNumber, `${id}'s dexNumber must be unchanged`);
    assert.equal(species!.rarity, rarity, `${id}'s rarity must be unchanged`);
  }
});

// ============================================================================
// PRE-PALDEA — 17 HISUIAN FORMS
// ============================================================================
//
// User-approved rule: every Hisuian Form's REAL rarity exactly equals its
// ordinary counterpart's live PokemonSpecies.rarity — `rarity` below is the
// live value read from generation-1/2/5/6/7-pokemon-data.ts at the time
// this step was implemented, and this locking test re-derives it from the
// live catalog rather than hardcoding a duplicate assumption, so a future
// unrelated rarity change to any of the 17 ordinary counterparts would
// correctly fail this test rather than silently drifting.
const HISUIAN_FORM_EXPECTATIONS: Array<{
  formId: string;
  baseId: string;
  baseDexNumber: number;
  spriteId: string;
}> = [
  { formId: "growlithe-hisui", baseId: "growlithe", baseDexNumber: 58, spriteId: "0058H" },
  { formId: "arcanine-hisui", baseId: "arcanine", baseDexNumber: 59, spriteId: "0059H" },
  { formId: "voltorb-hisui", baseId: "voltorb", baseDexNumber: 100, spriteId: "0100H" },
  { formId: "electrode-hisui", baseId: "electrode", baseDexNumber: 101, spriteId: "0101H" },
  { formId: "typhlosion-hisui", baseId: "typhlosion", baseDexNumber: 157, spriteId: "0157H" },
  { formId: "qwilfish-hisui", baseId: "qwilfish", baseDexNumber: 211, spriteId: "0211H" },
  { formId: "sneasel-hisui", baseId: "sneasel", baseDexNumber: 215, spriteId: "0215H" },
  { formId: "samurott-hisui", baseId: "samurott", baseDexNumber: 503, spriteId: "0503H" },
  { formId: "lilligant-hisui", baseId: "lilligant", baseDexNumber: 549, spriteId: "0549H" },
  { formId: "basculin-hisui", baseId: "basculin", baseDexNumber: 550, spriteId: "0550H" },
  { formId: "zorua-hisui", baseId: "zorua", baseDexNumber: 570, spriteId: "0570H" },
  { formId: "zoroark-hisui", baseId: "zoroark", baseDexNumber: 571, spriteId: "0571H" },
  { formId: "braviary-hisui", baseId: "braviary", baseDexNumber: 628, spriteId: "0628H" },
  // Hisuian Sliggoo/Goodra/Avalugg use a sprite id one dex-slot ahead of
  // their own dex number (0706H/0707H/0714H, not the naive 0705H/0706H/
  // 0713H) — verified against the real on-disk files before being
  // referenced here; see generation-4-pokemon-data.ts's own note.
  { formId: "sliggoo-hisui", baseId: "sliggoo", baseDexNumber: 705, spriteId: "0706H" },
  { formId: "goodra-hisui", baseId: "goodra", baseDexNumber: 706, spriteId: "0707H" },
  { formId: "avalugg-hisui", baseId: "avalugg", baseDexNumber: 713, spriteId: "0714H" },
  { formId: "decidueye-hisui", baseId: "decidueye", baseDexNumber: 724, spriteId: "0724H" },
];

test("exactly 17 Hisuian Forms exist in the catalog", () => {
  const hisuianFormIds = POKEMON_DATA.filter((species) => species.formLabel === "Hisuian Form").map(
    (species) => species.id
  );
  assert.equal(hisuianFormIds.length, 17);
  assert.deepEqual(
    hisuianFormIds.sort(),
    HISUIAN_FORM_EXPECTATIONS.map((expectation) => expectation.formId).sort()
  );
});

for (const { formId, baseId, baseDexNumber, spriteId } of HISUIAN_FORM_EXPECTATIONS) {
  test(`${formId}: formOf "${baseId}", shares its base's dexNumber #${baseDexNumber}, uses the verified sprite id "${spriteId}", is a plain base row itself (no formOf chaining), and copies its base's exact LIVE rarity`, () => {
    const byId = new Map(POKEMON_DATA.map((species) => [species.id, species]));
    const base = byId.get(baseId);
    const form = byId.get(formId);

    assert.ok(base, `expected base species "${baseId}" to exist in the catalog`);
    assert.ok(form, `expected Hisuian Form "${formId}" to exist in the catalog`);

    assert.equal(form!.formOf, baseId);
    assert.equal(form!.dexNumber, baseDexNumber);
    assert.equal(base!.dexNumber, baseDexNumber);
    assert.equal(form!.spriteId, spriteId);
    assert.equal(base!.formOf, undefined, `${baseId} must itself be a plain base species, not a nested form`);

    // User-approved rarity rule: copy the ordinary counterpart's LIVE
    // rarity exactly, never a canonical Hisui-availability judgment call.
    assert.equal(form!.rarity, base!.rarity, `${formId} must copy its ordinary counterpart's exact live rarity ("${base!.rarity}")`);

    // Valid types/base stats — non-empty typing, every stat a positive integer.
    assert.ok(form!.types.length >= 1 && form!.types.length <= 2, `${formId} must have 1-2 types`);
    for (const stat of Object.values(form!.baseStats)) {
      assert.ok(Number.isInteger(stat) && stat > 0, `${formId}'s base stats must all be positive integers`);
    }

    assert.equal(getFrontSpritePath(form!), `/assets/pokemon/sprites/front/${spriteId}.gif`);
    assert.equal(getBackSpritePath(form!), `/assets/pokemon/sprites/back/${spriteId}.gif`);
  });
}

test("Hisuian Growlithe/Arcanine and Hisuian Voltorb/Electrode use real Hisuian typings, not their ordinary counterpart's typing", () => {
  const byId = new Map(POKEMON_DATA.map((species) => [species.id, species]));

  assert.deepEqual(byId.get("growlithe-hisui")!.types, ["fire", "rock"]);
  assert.deepEqual(byId.get("arcanine-hisui")!.types, ["fire", "rock"]);
  assert.deepEqual(byId.get("voltorb-hisui")!.types, ["electric", "grass"]);
  assert.deepEqual(byId.get("electrode-hisui")!.types, ["electric", "grass"]);

  // Never a blind copy of the ordinary counterpart's own typing.
  assert.notDeepEqual(byId.get("growlithe-hisui")!.types, byId.get("growlithe")!.types);
  assert.notDeepEqual(byId.get("voltorb-hisui")!.types, byId.get("voltorb")!.types);
});

test("existing 18 Alolan Forms and 19 Galarian Forms remain completely unaffected by the 17 Hisuian Forms addition", () => {
  const alolanFormIds = POKEMON_DATA.filter((species) => species.formLabel === "Alolan Form").map((species) => species.id);
  const galarianFormIds = POKEMON_DATA.filter((species) => species.formLabel === "Galarian Form").map((species) => species.id);
  assert.equal(alolanFormIds.length, 18);
  assert.equal(galarianFormIds.length, 19);
});
