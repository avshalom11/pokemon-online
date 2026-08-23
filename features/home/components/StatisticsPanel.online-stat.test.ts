// HOME STATISTICS — ONLINE PLAYERS. StatisticsPanel/HomeContent/
// OnlinePlayerCountStat are all client components with no React Testing
// Library/jsdom set up in this project, so this checks the invariant via a
// static source read — same approach as
// features/home/components/NavigationGrid.hatchery.test.ts.
import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";

const statisticsPanelSrc = fs.readFileSync(new URL("./StatisticsPanel.tsx", import.meta.url), "utf8");
const onlineStatSrc = fs.readFileSync(new URL("./OnlinePlayerCountStat.tsx", import.meta.url), "utf8");
const homeContentSrc = fs.readFileSync(new URL("./HomeContent.tsx", import.meta.url), "utf8");

// (10)
test("Home Statistics contains \"מחוברים עכשיו\" as one of its tiles", () => {
  assert.ok(statisticsPanelSrc.includes("<OnlinePlayerCountStat"), "StatisticsPanel must render the online-count tile");
  assert.ok(onlineStatSrc.includes("מחוברים עכשיו"));
});

// (11)
test('"זמן משחק" is no longer one of the rendered stat tiles', () => {
  assert.ok(
    !statisticsPanelSrc.includes('label: "זמן משחק"'),
    "the old play-time stat entry must be fully removed from the stats array, not left alongside the new online-count tile"
  );
});

test("the other two real stat tiles (caught count, dex completion) are untouched — only the play-time placeholder was replaced", () => {
  assert.ok(statisticsPanelSrc.includes('{ label: "פוקימונים שנתפסו", value: totalCaught.toString() }'));
  assert.ok(statisticsPanelSrc.includes('{ label: "השלמת פוקידקס", value: `${dexCompletionPercent}%` }'));
  assert.ok(statisticsPanelSrc.includes('{ label: "קרבות שנוצחו", value: "בקרוב" }'), "the other honest placeholder (battles won) is untouched by this task");
});

// (12)
test("the online-count tile reuses the EXISTING Presence source of truth (getOnlineCountAction / PRESENCE_READ_POLL_INTERVAL_MS) — never a second presence query or poll loop", () => {
  assert.ok(onlineStatSrc.includes('import { getOnlineCountAction } from "@/features/presence/actions/presence.actions";'));
  assert.ok(onlineStatSrc.includes('import { PRESENCE_READ_POLL_INTERVAL_MS } from "@/features/presence/config/presence.config";'));
  assert.ok(onlineStatSrc.includes("const fresh = await getOnlineCountAction();"));
  assert.ok(!onlineStatSrc.includes("setInterval") || onlineStatSrc.includes("PRESENCE_READ_POLL_INTERVAL_MS"), "any polling interval must use the shared presence constant, never a hardcoded literal");
});

test("StatisticsPanel seeds the online tile from the same server-fetched HomeViewData.onlinePlayerCount every other Home read already uses (no separate client-only fetch on mount)", () => {
  assert.ok(homeContentSrc.includes("onlinePlayerCount={data.onlinePlayerCount}"));
});

// (13)
test("the old standalone OnlinePlayersCounter card no longer exists — no duplicate online-count presentation remains on Home", () => {
  assert.ok(!homeContentSrc.includes("OnlinePlayersCounter"), "HomeContent must no longer import/render the old standalone card");
  assert.ok(!fs.existsSync(new URL("./OnlinePlayersCounter.tsx", import.meta.url)), "the old standalone component file must be deleted, not just unused");
  // Exactly one JSX element on Home is ever passed the online count — only
  // StatisticsPanel's own prop, never a second standalone card alongside it.
  const jsxPropOccurrences = (homeContentSrc.match(/onlinePlayerCount=\{data\.onlinePlayerCount\}/g) ?? []).length;
  assert.equal(jsxPropOccurrences, 1, "onlinePlayerCount must be passed to exactly one component (StatisticsPanel), not two");
});

test("DailyBattleCounter (a completely separate stat, unrelated to this task) is untouched and still rendered on Home", () => {
  assert.ok(homeContentSrc.includes("<DailyBattleCounter count={data.dailyBattleCount} />"));
});
