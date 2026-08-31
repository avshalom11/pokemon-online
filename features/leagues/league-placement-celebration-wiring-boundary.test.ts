// LEAGUE — FINAL PLACEMENT CELEBRATION MODAL — source-level boundary
// coverage for the pieces this project's test harness genuinely cannot
// exercise directly: the Next.js page (no route-render harness exists) and
// the React component's queue-advancement wiring (no DOM/render harness
// exists anywhere in this repo). Same established technique every prior
// *-boundary.test.ts file in this project already uses — reading the
// actual source text of the files this task changed.
import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";

const pageSrc = fs.readFileSync("app/(game)/leagues/page.tsx", "utf8");
const contentSrc = fs.readFileSync("features/leagues/components/LeaguesContent.tsx", "utf8");
const actionSrc = fs.readFileSync("features/leagues/actions/acknowledge-league-placement-celebration.action.ts", "utf8");

test("the League page resolves pending celebrations read-only, server-side, and passes them into LeaguesContent", () => {
  assert.ok(pageSrc.includes("import { getPendingLeaguePlacementCelebrations }"));
  assert.ok(pageSrc.includes("const pendingCelebrations = await getPendingLeaguePlacementCelebrations(profile.id);"));
  assert.ok(pageSrc.includes("pendingCelebrations={pendingCelebrations}"));
});

test("LeaguesContent shows at most ONE celebration modal at a time (queue[0]), never the whole list at once", () => {
  assert.ok(contentSrc.includes("celebrationQueue.length > 0"), "the modal must be conditionally rendered only when the queue is non-empty");
  assert.ok(contentSrc.includes("celebration={celebrationQueue[0]!}"), "only the FIRST pending item is ever rendered");
  assert.ok(!/celebrationQueue\.map/.test(contentSrc), "the component must never map/render more than one celebration modal at once");
});

test("the queue only advances after the acknowledgement action resolves — never optimistically before it", () => {
  assert.ok(
    contentSrc.includes('onAcknowledged={() => setCelebrationQueue((current) => current.slice(1))}'),
    "advancing the queue must be the onAcknowledged callback, only ever invoked by the modal after its own server call resolves"
  );
});

test("acknowledging one placement never touches the others still in the queue — dequeue only removes the first entry", () => {
  assert.ok(contentSrc.includes("current.slice(1)"), "advancing must slice off only the first (already-acknowledged) entry, leaving the rest of the queue intact");
});

test("the acknowledge Server Action resolves playerId from the authenticated session only — the client never supplies one", () => {
  assert.ok(actionSrc.includes("const session = await getCurrentSession();"));
  assert.ok(actionSrc.includes("const profile = await getPlayerProfile(session.user.id);"));
  assert.ok(
    actionSrc.includes("acknowledgeLeaguePlacementCelebration(profile.id, tournamentId)"),
    "ownership must be resolved from the session-derived profile, never a client-supplied playerId parameter"
  );
  assert.ok(!/tournamentId,\s*playerId/.test(actionSrc), "the action's own signature must never accept a client-supplied playerId");
});

test("the acknowledge action never calls any reward-granting function — only the acknowledgement service", () => {
  assert.ok(!actionSrc.includes("grantCompletedLeagueTournamentRewards"));
  assert.ok(!actionSrc.includes("grantCurrencyRewards"));
});
