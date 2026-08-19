// LEAGUE CYCLE ALIGNMENT + "HOW LEAGUES WORK" DIALOG — source-level
// boundary coverage for the new help dialog, on the same "no React-render/
// DOM harness in this repo" convention every Gym/Profile task's own
// *-boundary.test.ts already establishes.
import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";

const dialogSrc = fs.readFileSync("features/leagues/components/HowLeaguesWorkDialog.tsx", "utf8");
const contentSrc = fs.readFileSync("features/leagues/components/LeaguesContent.tsx", "utf8");

test("the /leagues page has a clear 'איך הליגות עובדות?' button that opens the dialog without navigating away", () => {
  assert.ok(contentSrc.includes("איך הליגות עובדות?"), "the button label must be exact");
  assert.ok(contentSrc.includes("onClick={() => setIsHelpOpen(true)}"));
  assert.ok(contentSrc.includes("<HowLeaguesWorkDialog"), "the dialog must actually be mounted, gated by isHelpOpen state");
  assert.ok(!contentSrc.includes('href="/leagues/how-it-works"') && !contentSrc.includes("router.push"), "opening the dialog must never navigate to a different route");
});

test("League purpose is explained", () => {
  assert.ok(dialogSrc.includes("מהי הליגה?"));
  assert.ok(dialogSrc.includes("טורניר שבועי מול שחקנים אמיתיים"));
});

test("cycle order is explained as League 1 -> 2 -> 3 -> Champions, restarting after Champions — never described as calendar weeks-of-month", () => {
  assert.ok(dialogSrc.includes("ליגה 1 ← ליגה 2 ← ליגה 3 ← ליגת האלופים"));
  assert.ok(dialogSrc.includes("מתחיל מחזור חדש מחדש מליגה 1"));
  assert.ok(!/שבוע (ראשון|שני|שלישי|רביעי) בחודש/.test(dialogSrc), "must never describe the cycle as weeks of a calendar month");
});

test("which League is active this week is shown, reusing the SAME cycle view-model/label source LeaguesContent's own top banner already uses — never a second lookup", () => {
  assert.ok(dialogSrc.includes("import { CYCLE_WEEK_LABELS }"));
  assert.ok(dialogSrc.includes("CYCLE_WEEK_LABELS[cycle.weekIndexInCycle]"));
  assert.ok(contentSrc.includes("CYCLE_WEEK_LABELS[overview.cycle.weekIndexInCycle]"), "LeaguesContent's own banner must use the same shared array");
  // Both files import the SAME shared module — the array is never
  // redeclared in either file.
  assert.ok(!dialogSrc.includes('const CYCLE_WEEK_LABELS ='));
  assert.ok(!contentSrc.includes('const CYCLE_WEEK_LABELS ='));
  assert.ok(contentSrc.includes("cycle={overview.cycle}"), "the dialog must receive the real, server-computed cycle view-model, never recompute it");
});

test("registration is explained, including the real eligibility numbers read from the League registry (never hand-typed)", () => {
  assert.ok(dialogSrc.includes("import { LEAGUE_I }"));
  assert.ok(dialogSrc.includes("LEAGUE_I.requiredBadgeCount"));
  assert.ok(dialogSrc.includes("LEAGUE_I.requiredRegionalChampionCount"));
  assert.ok(dialogSrc.includes("אין הרשמה ידנית — המשתתפים מעפילים מהליגות של אותו מחזור"), "Champions League's own no-manual-registration rule must be stated");
});

test("registration cutoff (18:30) and tournament start (19:00) are read from LEAGUE_SCHEDULE, never hardcoded literals", () => {
  assert.ok(dialogSrc.includes("import { LEAGUE_SCHEDULE }"));
  assert.ok(dialogSrc.includes("LEAGUE_SCHEDULE.registrationClosesTime"));
  assert.ok(dialogSrc.includes("LEAGUE_SCHEDULE.round1StartsTime"));
  assert.ok(!dialogSrc.includes('"18:30"') && !dialogSrc.includes('"19:00"'), "the times must never be hardcoded string literals in the dialog");
});

test("30-minute round spacing and 20-minute room window are read from LEAGUE_SCHEDULE, never hardcoded literals", () => {
  assert.ok(dialogSrc.includes("LEAGUE_SCHEDULE.minutesBetweenRounds"));
  assert.ok(dialogSrc.includes("LEAGUE_SCHEDULE.battleRoomActiveWindowMinutes"));
});

test("no-show rules are explained: neither enters -> random winner, one enters -> that player wins", () => {
  assert.ok(dialogSrc.includes("אי-הגעה"));
  assert.ok(dialogSrc.includes("הזוכה נבחר באקראי"));
  assert.ok(dialogSrc.includes("אותו שחקן מנצח אוטומטית"));
});

test("timeout tie-break order is explained in the approved 3-step order, WITHOUT exposing the internal technical fallback rule", () => {
  const order = ["יותר פוקימונים חיים", "Player Level גבוה יותר", "מי שנכנס ראשון לחדר הקרב"];
  let lastIndex = -1;
  for (const step of order) {
    const index = dialogSrc.indexOf(step);
    assert.ok(index > -1, `must mention "${step}"`);
    assert.ok(index > lastIndex, `"${step}" must appear in the correct order`);
    lastIndex = index;
  }
  // The internal-only 4th tie-break (a deterministic participant-id
  // comparison, league-tiebreak.ts's own "never a gameplay rule shown to
  // players") must never be exposed.
  assert.ok(!dialogSrc.includes("participantId") && !dialogSrc.includes("דטרמיניסטי") && !dialogSrc.includes("מזהה"), "the internal-only deterministic fallback must never be exposed to players");
});

test("Computer Filler is explained in friendly language", () => {
  assert.ok(dialogSrc.includes("שחקן מחשב"));
  assert.ok(dialogSrc.includes("מספר הנרשמים"));
});

test("advancing to the next round is explained", () => {
  assert.ok(dialogSrc.includes("עלייה לשלב הבא"));
});

test("Champions League qualification is explained: 4 qualifiers, all from the same completed cycle", () => {
  assert.ok(dialogSrc.includes("ליגת האלופים"));
  assert.ok(dialogSrc.includes("הזוכה בליגה 1"));
  assert.ok(dialogSrc.includes("הזוכה בליגה 2"));
  assert.ok(dialogSrc.includes("הזוכה בליגה 3"));
  assert.ok(dialogSrc.includes("המקום השני בליגה 3"));
  assert.ok(dialogSrc.includes("כולם מאותו מחזור שהסתיים"));
});

test("placement vs participation rewards are explained, including Top 3 mutual exclusivity — no reward AMOUNT is hardcoded in this dialog", () => {
  assert.ok(dialogSrc.includes("פרסים"));
  assert.ok(dialogSrc.includes("מקבלים את פרס המקום שלהם"));
  assert.ok(dialogSrc.includes("פרס השתתפות"));
  assert.ok(dialogSrc.includes("לעולם לא שניהם"));
  // No monetary/percentage figure — those live exclusively in
  // league-reward-registry.ts / RewardPreviewSection, never duplicated here.
  assert.ok(!/\d+%|\bכסף\b.*\d/.test(dialogSrc), "reward amounts must never be duplicated in this dialog");
});

test("the dialog is visually sectioned (not one wall of text) — every topic is its own bordered Section block", () => {
  const sectionCount = dialogSrc.split("<Section title=").length - 1;
  assert.ok(sectionCount >= 9, `expected at least 9 distinct sections, found ${sectionCount}`);
});

test("closing: backdrop click and an explicit close button both dismiss the dialog, matching the project's established modal convention", () => {
  assert.ok(dialogSrc.includes("onClick={onClose}"));
  assert.ok(dialogSrc.includes("event.stopPropagation()"));
  assert.ok(dialogSrc.includes('aria-label="סגור"'));
});
