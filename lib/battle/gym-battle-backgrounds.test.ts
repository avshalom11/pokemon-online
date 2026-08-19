// GYM BATTLE BACKGROUNDS — focused coverage for the new Gym/Regional
// Champion theme selection. Runs the REAL getGymBattleTheme unmodified,
// plus source-level checks (no React-render/DOM harness in this project)
// for GymBattleContent's own wiring and confirming Field Battle/League PvP
// backgrounds are untouched.
import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";

import { GYM_LEADER_THEME, GYM_THEME, getGymBattleTheme, getBattleTheme } from "./battleThemes.ts";

// 1/2. Exact filenames, exactly as they exist on disk under
// public/battle-backgrounds/ (NOT public/images/battle-backgrounds/ — the
// real folder, confirmed by directly inspecting it before this change).
test("the exact detected image files exist on disk at the referenced paths", () => {
  assert.ok(fs.existsSync("public" + GYM_THEME.backgroundImage), `${GYM_THEME.backgroundImage} must exist on disk`);
  assert.ok(fs.existsSync("public" + GYM_LEADER_THEME.backgroundImage), `${GYM_LEADER_THEME.backgroundImage} must exist on disk`);
  assert.equal(GYM_THEME.backgroundImage, "/battle-backgrounds/pokemon_gym.png");
  assert.equal(GYM_LEADER_THEME.backgroundImage, "/battle-backgrounds/pokemon_gym_leader.png");
});

// 3. Gym mapping: every battleSlot (easy/medium/leader) lives under ONE
// battleSource ("gym") — the ticket's own "Easy/Medium/Leader -> pokemon_gym"
// requirement is therefore fully covered by a single battleSource check,
// exactly as getGymBattleTheme itself is written (no battleSlot parameter
// at all — see its own doc comment for why one is never needed).
test("Gym battles (source: 'gym', covering every battleSlot — Easy/Medium/Leader) use GYM_THEME (pokemon_gym)", () => {
  assert.equal(getGymBattleTheme("gym"), GYM_THEME);
  assert.equal(getGymBattleTheme("gym").backgroundImage, "/battle-backgrounds/pokemon_gym.png");
});

// 4. Regional Champion mapping.
test("Regional Champion battles (source: 'regional-champion') use GYM_LEADER_THEME (pokemon_gym_leader)", () => {
  assert.equal(getGymBattleTheme("regional-champion"), GYM_LEADER_THEME);
  assert.equal(getGymBattleTheme("regional-champion").backgroundImage, "/battle-backgrounds/pokemon_gym_leader.png");
});

test("the two Gym themes are genuinely distinct theme objects, never the same background reused for both", () => {
  assert.notEqual(GYM_THEME.backgroundImage, GYM_LEADER_THEME.backgroundImage);
});

test("every Gym theme carries a complete, valid arena (both platform points present) — required for BattleScene's own Pokémon-anchoring math", () => {
  for (const theme of [GYM_THEME, GYM_LEADER_THEME]) {
    for (const point of [theme.arena.playerPlatform, theme.arena.wildPlatform]) {
      assert.ok(point.xPercent >= 0 && point.xPercent <= 100);
      assert.ok(point.yPercent >= 0 && point.yPercent <= 100);
    }
  }
});

// GymBattleContent wiring.
test("GymBattleContent selects its background via getGymBattleTheme(data.battleSource) — the one shared rule, not a duplicated per-screen lookup", () => {
  const src = fs.readFileSync("features/gyms/components/GymBattleContent.tsx", "utf8");
  assert.ok(src.includes('import { getGymBattleTheme } from "@/lib/battle/battleThemes";'));
  assert.ok(src.includes("const theme = getGymBattleTheme(data.battleSource);"));
  assert.ok(!src.includes("getBattleTheme("), "GymBattleContent must no longer call the zone-based getBattleTheme at all");
  // The theme still flows into the SAME shared <BattleScene theme={theme}>
  // prop — no second/duplicated battle-UI rendering path.
  assert.ok(src.includes("<BattleScene") && src.includes("theme={theme}"));
});

// 5. Field Battle / League PvP untouched.
test("Field Battle still resolves its background from the zone-based getBattleTheme(zoneId) — completely untouched by this task", () => {
  const src = fs.readFileSync("features/battle/components/BattleContent.tsx", "utf8");
  assert.ok(src.includes("getBattleTheme(zoneId)"));
});

test("League PvP still uses its own existing getBattleTheme() call — completely untouched by this task", () => {
  const src = fs.readFileSync("features/leagues/components/LeagueMatchContent.tsx", "utf8");
  assert.ok(src.includes("const theme = getBattleTheme();"));
  assert.ok(!src.includes("getGymBattleTheme"), "League PvP must never reference the Gym-only theme selector");
});

test("the Field Battle zone theme registry (grass/water/cave/lava/beach/haunted-house) is unchanged — getBattleTheme() with no zoneId still falls back to GRASS_THEME", () => {
  assert.equal(getBattleTheme().id, "grassland");
  assert.equal(getBattleTheme(null).id, "grassland");
});
