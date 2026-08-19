// HOME — SIGNIFICANT CAPTURES TODAY — focused coverage for the 12 required
// cases. The service (significant-captures.service.ts) is exercised
// behaviorally against the real fake DB; the UI-side field allowlist is
// checked at the source level (this project's established convention —
// no React-render/DOM harness, see any *-boundary.test.ts file).
import assert from "node:assert/strict";
import fs from "node:fs";
import { test, beforeEach } from "node:test";

import { POKEMON_DATA } from "@/data/pokemon/pokemon-data";
import { getSignificantCapturesToday } from "@/features/home/services/significant-captures.service";
import { getFrontSpritePath } from "@/features/pokemon/media/pokemon-media-paths";
import { resetFakeDb, seedPlayerPokemon, seedPlayerProfile } from "../../test/support/fakes/prisma.fake.ts";

const veryRareSpecies = POKEMON_DATA.find((species) => species.rarity === "very-rare");
const secondVeryRareSpecies = POKEMON_DATA.filter((species) => species.rarity === "very-rare")[1];
const legendarySpecies = POKEMON_DATA.find((species) => species.rarity === "legendary");
if (!veryRareSpecies || !secondVeryRareSpecies || !legendarySpecies) {
  throw new Error("test setup: the catalog must contain at least two very-rare species and one legendary species");
}

// A fixed reference instant: 2026-08-19T12:00:00Z is 2026-08-19 15:00 in
// Asia/Jerusalem (UTC+3 — daylight saving in August). Every test reasons
// relative to THIS instant, never the real wall clock, so the suite is
// deterministic no matter when it actually runs.
const NOW = new Date("2026-08-19T12:00:00.000Z");
const YESTERDAY_MIDDAY = new Date("2026-08-18T12:00:00.000Z"); // clearly the previous Jerusalem calendar day

let nextPokemonId = 1;
function seedCapture(row: { speciesId: string; playerId: string; createdAt: Date; source?: string | null }) {
  seedPlayerPokemon({
    id: `poke-${nextPokemonId++}`,
    playerId: row.playerId,
    speciesId: row.speciesId,
    createdAt: row.createdAt,
    source: row.source === undefined ? "capture" : row.source,
  });
}

beforeEach(() => {
  resetFakeDb();
  nextPokemonId = 1;
  seedPlayerProfile({ id: "player-1", displayName: "אביב" });
  seedPlayerProfile({ id: "player-2", displayName: "נועה" });
});

// 1
test("1: latest Very Rare capture today is returned", async () => {
  seedCapture({ speciesId: veryRareSpecies.id, playerId: "player-1", createdAt: NOW });
  const result = await getSignificantCapturesToday(NOW);
  assert.ok(result.veryRare);
  assert.equal(result.veryRare?.speciesName, veryRareSpecies.name);
  assert.equal(result.veryRare?.playerDisplayName, "אביב");
});

// 2
test("2: latest Legendary capture today is returned", async () => {
  seedCapture({ speciesId: legendarySpecies.id, playerId: "player-2", createdAt: NOW });
  const result = await getSignificantCapturesToday(NOW);
  assert.ok(result.legendary);
  assert.equal(result.legendary?.speciesName, legendarySpecies.name);
  assert.equal(result.legendary?.playerDisplayName, "נועה");
});

// 3
test("3: yesterday's captures are excluded (never fall back to yesterday)", async () => {
  seedCapture({ speciesId: veryRareSpecies.id, playerId: "player-1", createdAt: YESTERDAY_MIDDAY });
  const result = await getSignificantCapturesToday(NOW);
  assert.equal(result.veryRare, null);
});

// 4
test("4: Egg Pokémon (source === 'egg') are excluded even though rarity/date qualify", async () => {
  seedCapture({ speciesId: legendarySpecies.id, playerId: "player-1", createdAt: NOW, source: "egg" });
  const result = await getSignificantCapturesToday(NOW);
  assert.equal(result.legendary, null);
});

// 5
test("5: reward/non-capture Pokémon are excluded — starter selection and unknown/null source alike", async () => {
  seedCapture({ speciesId: veryRareSpecies.id, playerId: "player-1", createdAt: NOW, source: "starter" });
  seedCapture({ speciesId: legendarySpecies.id, playerId: "player-1", createdAt: NOW, source: null });
  const result = await getSignificantCapturesToday(NOW);
  assert.equal(result.veryRare, null);
  assert.equal(result.legendary, null);
});

// 6
test("6: the latest qualifying capture wins when multiple exist for the same rarity", async () => {
  const earlier = new Date(NOW.getTime() - 60 * 60 * 1000);
  seedCapture({ speciesId: veryRareSpecies.id, playerId: "player-1", createdAt: earlier });
  seedCapture({ speciesId: secondVeryRareSpecies.id, playerId: "player-2", createdAt: NOW });
  const result = await getSignificantCapturesToday(NOW);
  assert.equal(result.veryRare?.speciesName, secondVeryRareSpecies.name);
  assert.equal(result.veryRare?.playerDisplayName, "נועה");
});

// 7
test("7: the Asia/Jerusalem day boundary is respected, not the UTC or server-local day", async () => {
  // Still Aug 18 in UTC, but Asia/Jerusalem is UTC+3 in August, so locally
  // this is already 2026-08-19T01:00 — the SAME Jerusalem calendar day as
  // NOW (2026-08-19). A naive UTC-calendar-date comparison would wrongly
  // exclude this as "yesterday".
  const utcYesterdayButJerusalemToday = new Date("2026-08-18T22:00:00.000Z");
  seedCapture({ speciesId: veryRareSpecies.id, playerId: "player-1", createdAt: utcYesterdayButJerusalemToday });
  const result = await getSignificantCapturesToday(NOW);
  assert.ok(result.veryRare, "a capture that is 'yesterday' in UTC but 'today' in Asia/Jerusalem must still count as today");
  assert.equal(result.veryRare?.speciesName, veryRareSpecies.name);
});

// 8
test("8: the safe public display name is used — never the raw playerId or any internal id", async () => {
  seedPlayerProfile({ id: "player-3", displayName: "מאמן_חשאי" });
  seedCapture({ speciesId: veryRareSpecies.id, playerId: "player-3", createdAt: NOW });
  const result = await getSignificantCapturesToday(NOW);
  assert.equal(result.veryRare?.playerDisplayName, "מאמן_חשאי");
  assert.ok(!JSON.stringify(result.veryRare).includes("player-3"), "the raw playerId must never leak into the view");
});

// 9
test("9: the correct GIF/sprite URL is used, reused from the existing sprite-path helper (no second mapping)", async () => {
  seedCapture({ speciesId: legendarySpecies.id, playerId: "player-1", createdAt: NOW });
  const result = await getSignificantCapturesToday(NOW);
  assert.equal(result.legendary?.spriteUrl, getFrontSpritePath(legendarySpecies));
});

// 10
test("10: empty Very Rare state — no qualifying capture today", async () => {
  const result = await getSignificantCapturesToday(NOW);
  assert.equal(result.veryRare, null);
});

// 11
test("11: empty Legendary state — no qualifying capture today", async () => {
  const result = await getSignificantCapturesToday(NOW);
  assert.equal(result.legendary, null);
});

// 12 (source) — the UI must render ONLY the four requested fields.
const cardSrc = fs.readFileSync("features/home/components/SignificantCapturesCard.tsx", "utf8");

test("12: (source) Home UI displays only the four requested fields — species name, display name, capture date/time, sprite", () => {
  assert.ok(cardSrc.includes("capture.speciesName"));
  assert.ok(cardSrc.includes("capture.playerDisplayName"));
  assert.ok(cardSrc.includes("capture.capturedAtLabel"));
  assert.ok(cardSrc.includes("capture.spriteUrl"));

  const forbiddenAccessors = [
    "capture.level",
    "capture.stats",
    "capture.baseStats",
    "capture.type",
    "capture.types",
    "capture.rarity",
    "capture.description",
    "capture.iv",
    "capture.ev",
  ];
  for (const accessor of forbiddenAccessors) {
    assert.ok(!cardSrc.includes(accessor), `must not reference ${accessor}`);
  }
});

test("12b: (source) the exact required title and both required empty-state strings are present", () => {
  assert.ok(cardSrc.includes('title="תפיסות משמעותיות היום:"'));
  assert.ok(cardSrc.includes('"עדיין לא נתפס היום פוקימון נדיר מאוד"'));
  assert.ok(cardSrc.includes('"עדיין לא נתפס היום פוקימון אגדי"'));
});

test("12c: (source) the view model itself (SignificantCaptureView) exposes only the four allowed fields — no accidental extra data to leak", () => {
  const serviceSrc = fs.readFileSync("features/home/services/significant-captures.service.ts", "utf8");
  const viewInterface = serviceSrc.slice(
    serviceSrc.indexOf("interface SignificantCaptureView"),
    serviceSrc.indexOf("interface SignificantCapturesToday")
  );
  const fieldNames = [...viewInterface.matchAll(/^\s{2}(\w+)[?:]/gm)].map((match) => match[1]);
  assert.deepEqual(fieldNames.sort(), ["capturedAtLabel", "playerDisplayName", "speciesName", "spriteUrl"].sort());
});
