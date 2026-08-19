// LEAGUE REGISTRATION — ACTIVE-WEEK ONLY + CANCEL REGISTRATION — UI wiring.
// This project has no React-render/DOM test harness (every existing League/
// Gym/Profile task's own *-boundary.test.ts already establishes this
// convention), so the button-visibility truth table and the confirmation-
// dialog flow are verified by reading the actual source text.
import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";

const contentSrc = fs.readFileSync("features/leagues/components/LeaguesContent.tsx", "utf8");

test("the register button only ever shows for eligible + open + unregistered (canRegister), unchanged by this task", () => {
  assert.ok(contentSrc.includes("const canRegister = league.eligible && league.registrationOpen && !registered;"));
});

// LEAGUE LEGACY REGISTRATION — CANCEL BUTTON FIX (later task) — canCancel
// no longer depends on activeThisWeek/registrationOpen at all: an EXISTING
// registration for a League that is no longer this week's active one must
// still expose "ביטול הרשמה". It is driven by the server-computed
// league.canCancelRegistration (that specific tournament's own real
// deadline/status), falling back to the local optimistic `override` only
// right after this session's own register/cancel action completes.
test("the cancel button is driven by the server-computed canCancelRegistration (or the local optimistic override) — never by activeThisWeek/registrationOpen", () => {
  assert.ok(contentSrc.includes("const canCancel = override ? override.registered : league.canCancelRegistration;"));
  assert.ok(contentSrc.includes("canCancel ? ("), "the cancel button must be gated by canCancel");
  assert.ok(!/canCancel\s*=\s*registered\s*&&\s*league\.registrationOpen/.test(contentSrc), "canCancel must never be tied back to this week's active-League registrationOpen");
});

test("register and cancel are mutually exclusive in the same button slot — never both rendered at once", () => {
  const match = contentSrc.match(/\{canRegister \? \([\s\S]*?\) : canCancel \? \([\s\S]*?\) : null\}/);
  assert.ok(match, "canRegister/canCancel must be one single if/else-if chain sharing one button slot, never two independent conditionals");
});

test("clicking 'ביטול הרשמה' opens a confirmation dialog with the exact approved copy before cancelLeagueRegistrationAction is ever called", () => {
  assert.ok(contentSrc.includes("onClick={onRequestCancel}"), "the card's cancel button must only ever open the confirmation, never cancel directly");
  assert.ok(contentSrc.includes("האם אתה בטוח שברצונך לבטל את ההרשמה לליגה?"));
  assert.ok(contentSrc.includes("function confirmCancelRegistration()"));
  assert.ok(contentSrc.includes("cancelLeagueRegistrationAction(leagueId)"));
  // The action is called ONLY from confirmCancelRegistration — never
  // directly from the card's own onRequestCancel/button.
  const actionCallCount = contentSrc.split("cancelLeagueRegistrationAction(").length - 1;
  assert.equal(actionCallCount, 1, "cancelLeagueRegistrationAction must be called from exactly one place — the confirmed handler");
});

test("the confirmation dialog closing (backdrop or חזרה) never calls the cancel action — only the explicit red confirm button does", () => {
  const dialogMatch = contentSrc.match(/function CancelRegistrationConfirmDialog[\s\S]*?\n\}/);
  assert.ok(dialogMatch);
  const dialogBody = dialogMatch![0];
  assert.ok(!dialogBody.includes("cancelLeagueRegistrationAction"), "the dialog component itself must never call the action directly — only via the parent's onConfirm prop");
  assert.ok(dialogBody.includes("onClick={onCancel}"), "the backdrop and the חזרה button must both dismiss via onCancel");
  assert.ok(dialogBody.includes("event.stopPropagation()"), "clicking inside the dialog content must not close it");
});

test("Champions League card has no register/cancel button of any kind", () => {
  const champMatch = contentSrc.match(/function ChampionsLeagueCard[\s\S]*?\n\}/);
  assert.ok(champMatch);
  const champBody = champMatch![0];
  assert.ok(!champBody.includes("onRegister") && !champBody.includes("onRequestCancel") && !champBody.includes("הרשמה לליגה") && !champBody.includes("ביטול הרשמה"));
});
