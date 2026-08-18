// GYMS — SIMPLE CHARACTER IMAGE ARCHITECTURE — focused coverage for the
// deterministic image-path derivation (section 7, items 6-16).
import assert from "node:assert/strict";
import { test } from "node:test";

import { getGymCharacterImageUrl, getRegionalChampionCharacterImageUrl } from "./gym-trainer-images.ts";
import { REGION_GYM_SEQUENCE } from "./region-gym-sequence.ts";

test("Kanto Gym 1/2/3 map to 1.png/2.png/3.png", () => {
  assert.equal(getGymCharacterImageUrl("kanto", 1), "/images/gyms/trainers/1.png");
  assert.equal(getGymCharacterImageUrl("kanto", 2), "/images/gyms/trainers/2.png");
  assert.equal(getGymCharacterImageUrl("kanto", 3), "/images/gyms/trainers/3.png");
});

test("Kanto Champion maps to 4.png", () => {
  assert.equal(getRegionalChampionCharacterImageUrl("kanto"), "/images/gyms/trainers/4.png");
});

test("Johto Gym 1 maps to 5.png", () => {
  assert.equal(getGymCharacterImageUrl("johto", 1), "/images/gyms/trainers/5.png");
});

test("Paldea Champion maps to 36.png", () => {
  assert.equal(getRegionalChampionCharacterImageUrl("paldea"), "/images/gyms/trainers/36.png");
});

test("all 9 regions produce the exact expected 4-image block, in REGION_GYM_SEQUENCE order", () => {
  REGION_GYM_SEQUENCE.forEach((regionId, index) => {
    const base = index * 4;
    assert.equal(getGymCharacterImageUrl(regionId, 1), `/images/gyms/trainers/${base + 1}.png`);
    assert.equal(getGymCharacterImageUrl(regionId, 2), `/images/gyms/trainers/${base + 2}.png`);
    assert.equal(getGymCharacterImageUrl(regionId, 3), `/images/gyms/trainers/${base + 3}.png`);
    assert.equal(getRegionalChampionCharacterImageUrl(regionId), `/images/gyms/trainers/${base + 4}.png`);
  });
});

test("exactly 27 Gym image slots, 9 Regional Champion image slots, 36 total, no duplicates, numbered 1-36", () => {
  const gymImages = REGION_GYM_SEQUENCE.flatMap((regionId) => [1, 2, 3].map((gymNumber) => getGymCharacterImageUrl(regionId, gymNumber as 1 | 2 | 3)));
  const championImages = REGION_GYM_SEQUENCE.map((regionId) => getRegionalChampionCharacterImageUrl(regionId));

  assert.equal(gymImages.length, 27);
  assert.equal(championImages.length, 9);

  const all = [...gymImages, ...championImages];
  assert.equal(all.length, 36);
  assert.equal(new Set(all).size, 36, "no duplicate image paths");

  const numbers = all.map((url) => Number(url.match(/\/(\d+)\.png$/)![1])).sort((a, b) => a - b);
  assert.deepEqual(numbers, Array.from({ length: 36 }, (_, i) => i + 1));
});

test("an unknown region id throws rather than silently returning a wrong image", () => {
  assert.throws(() => getGymCharacterImageUrl("atlantis" as never, 1));
  assert.throws(() => getRegionalChampionCharacterImageUrl("atlantis" as never));
});
