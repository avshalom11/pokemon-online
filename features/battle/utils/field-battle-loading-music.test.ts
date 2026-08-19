// FIELD BATTLE MUSIC — WRONG TRACK FLASH ON ENTRY — focused regression.
// Root cause: app/(game)/battle/loading.tsx (the Suspense fallback shown
// while the real page's server data streams in) mounts its OWN BattleWindow
// instance for its skeleton UX — a genuinely separate React mount from the
// real BattleContent.tsx that later replaces it — and used to omit
// musicTrack, defaulting to the shared Gym/League battle-theme.mp3 for
// however long the loading state was visible, before the real page's own
// BattleWindow mount (which DOES pass FIELD_BATTLE_MUSIC_PATH) took over.
// Source-level checks only — no React-render/DOM harness exists in this
// project (same established convention as every other *-boundary/*.test.ts
// file here).
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const fieldLoadingSrc = readFileSync("app/(game)/battle/loading.tsx", "utf8");
const gymBattleLoadingSrc = readFileSync("app/(game)/gyms/battle/loading.tsx", "utf8");
const leagueMatchLoadingSrc = readFileSync("app/(game)/leagues/match/[matchId]/loading.tsx", "utf8");
const battleContentSrc = readFileSync("features/battle/components/BattleContent.tsx", "utf8");
const musicSrc = readFileSync("features/battle/utils/battle-music.ts", "utf8");

// 1/2. Field Battle never initializes with the default battle-theme —
// it initializes directly with regular_battle, in BOTH the loading
// skeleton AND the real page, so there is no window at all where the
// wrong track could play.
test("1/2: Field Battle's loading skeleton (app/(game)/battle/loading.tsx) mounts BattleWindow with musicTrack={FIELD_BATTLE_MUSIC_PATH} — never the default", () => {
  assert.ok(fieldLoadingSrc.includes('import { FIELD_BATTLE_MUSIC_PATH } from "@/features/battle/utils/battle-music";'));
  assert.ok(fieldLoadingSrc.includes("<BattleWindow musicTrack={FIELD_BATTLE_MUSIC_PATH}>"), "the loading skeleton must pass the correct track explicitly, never rely on BattleWindow's own default");
});

test("1/2: the real Field Battle page (BattleContent.tsx) also passes musicTrack={FIELD_BATTLE_MUSIC_PATH} — both the loading and real mounts agree", () => {
  assert.ok(battleContentSrc.includes("musicTrack={FIELD_BATTLE_MUSIC_PATH}"));
});

test("there is no code path where Field Battle's own BattleWindow is mounted without an explicit musicTrack — grep-confirmed exactly 2 BattleWindow mounts for this route (loading + real), both explicit", () => {
  const loadingMountCount = (fieldLoadingSrc.match(/<BattleWindow\b/g) ?? []).length;
  const contentMountCount = (battleContentSrc.match(/<BattleWindow\b/g) ?? []).length;
  assert.equal(loadingMountCount, 1);
  assert.equal(contentMountCount, 1);
  assert.ok(!/<BattleWindow>/.test(fieldLoadingSrc), "the loading skeleton must never mount a bare, prop-less BattleWindow");
  assert.ok(!/<BattleWindow>/.test(battleContentSrc), "the real Field Battle content must never mount a bare, prop-less BattleWindow either");
});

// 3. Gym/Champion/League still use battle-theme — their OWN loading states
// deliberately never mount BattleWindow at all (a blank div), so they were
// never at risk of this bug and remain completely untouched; the real
// Gym/League content components still never pass musicTrack, correctly
// defaulting to the shared battle-theme.mp3.
test("3: Gym's own battle loading state never mounts BattleWindow at all — no premature audio of any kind, untouched by this fix", () => {
  assert.ok(!gymBattleLoadingSrc.includes("<BattleWindow"), "Gym's loading.tsx must stay a plain blank placeholder (mentions of BattleWindow in comments are fine)");
});

test("3: League's own match loading state never mounts BattleWindow at all either — untouched by this fix", () => {
  assert.ok(!leagueMatchLoadingSrc.includes("<BattleWindow"), "League's match loading.tsx must stay a plain blank placeholder (mentions of BattleWindow in comments are fine)");
});

test("3: Gym/League's real battle content still never passes musicTrack — both keep the default shared battle-theme.mp3, unaffected by this fix", () => {
  const gymBattleContentSrc = readFileSync("features/gyms/components/GymBattleContent.tsx", "utf8");
  const leagueMatchContentSrc = readFileSync("features/leagues/components/LeagueMatchContent.tsx", "utf8");
  assert.ok(!gymBattleContentSrc.includes("musicTrack"));
  assert.ok(!leagueMatchContentSrc.includes("musicTrack"));
});

// 4. No track restart on normal rerender — the fix only ever touched
// loading.tsx (a static prop on a JSX element); useBattleMusic's own
// mount-once creation effect (empty dependency array) is completely
// unmodified, so turns/Bag-open/Pokémon-switch re-renders still never
// recreate or restart the Audio element.
test("4: useBattleMusic's Audio-creation effect is unmodified — still created exactly once per mount ([] deps), never touched by this fix", () => {
  assert.ok(musicSrc.includes("const audio = new Audio(trackPath);"));
  const creationEffect = musicSrc.slice(musicSrc.indexOf("new Audio(trackPath)"), musicSrc.indexOf("new Audio(trackPath)") + 600);
  assert.ok(creationEffect.includes("}, []);"), "the creation effect must still only ever run once per mount");
});

test("no setTimeout/delay hack was introduced anywhere in the files this fix actually touched (loading.tsx, battle-music.ts)", () => {
  // battleContentSrc/BattleContent.tsx is deliberately excluded here — it
  // legitimately uses setTimeout elsewhere for unrelated pre-existing
  // cosmetic effects (hit-flash, XP toast) that predate and are untouched
  // by this fix; only the two files this task actually modified are
  // checked for a NEW timing workaround.
  for (const src of [fieldLoadingSrc, musicSrc]) {
    assert.ok(!src.includes("setTimeout"), "the fix must be structural (a correct prop), never a timing workaround");
  }
});
