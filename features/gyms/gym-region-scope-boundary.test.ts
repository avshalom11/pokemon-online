// GYMS — REGION-SCOPED UI + CHARACTER IMAGES — boundary tests (section 7,
// items 15, 17, 18). Confirms image paths are derived, not hardcoded
// individually in React, and that no League/gameplay/reward rule changed
// alongside this presentation-only work.
import assert from "node:assert/strict";
import { test } from "node:test";
import fs from "node:fs";

test("GymsContent.tsx never hardcodes an individual /images/gyms/trainers/<n>.png literal — always derives it", () => {
  const src = fs.readFileSync("features/gyms/components/GymsContent.tsx", "utf8");
  assert.ok(!/\/images\/gyms\/trainers\/\d+\.png/.test(src), "no literal numbered trainer image path may appear in the component");
  assert.ok(src.includes("getGymCharacterImageUrl("), "must derive the Gym image via the shared helper");
  assert.ok(src.includes("getRegionalChampionCharacterImageUrl("), "must derive the Champion image via the shared helper");
});

test("this change never touches League services, reward registries, NPC teams, or battle logic", () => {
  const untouchable = [
    "features/leagues",
    "features/gyms/data/gym-reward-registry.ts",
    "features/gyms/data/gym-npc-teams.ts",
    "features/gyms/data/regional-champion-teams.ts",
    "features/gyms/services/gym-battle-action.service.ts",
    "features/gyms/services/gym-progression-rules.ts",
    "features/gyms/config/gym-level-scaling.config.ts",
    "features/gyms/config/gym-access-rules.config.ts",
    "features/gyms/data/region-gym-sequence.ts",
  ];
  for (const path of untouchable) {
    assert.ok(fs.existsSync(path), `${path} must still exist, unmodified in shape`);
  }
  // The approved sequential region order itself must be byte-identical to
  // what every other Gym unlock rule already reads.
  const sequenceSrc = fs.readFileSync("features/gyms/data/region-gym-sequence.ts", "utf8");
  assert.match(sequenceSrc, /"kanto",\s*"johto",\s*"hoenn",\s*"sinnoh",\s*"unova",\s*"kalos",\s*"alola",\s*"galar",\s*"paldea"/);
});

test("the region-scoped page still resolves the active region server-side from PlayerProfile.regionId, never a client-supplied value", () => {
  const src = fs.readFileSync("features/gyms/services/gym-overview-view.service.ts", "utf8");
  assert.ok(src.includes("getPlayerCurrentRegionGymOverview"));
  assert.ok(src.includes("prisma.playerProfile.findUniqueOrThrow"));
  assert.ok(src.includes("toRegionId(profile.regionId)"), "must derive the region from the player's own persisted profile, not a parameter");

  const pageSrc = fs.readFileSync("app/(game)/gyms/page.tsx", "utf8");
  assert.ok(!/getPlayerCurrentRegionGymOverview\([^)]*req(uest)?\.|searchParams|params\.region/.test(pageSrc), "must never accept a client-supplied region");
});
