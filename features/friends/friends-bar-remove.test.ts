// FRIENDS BAR POSITION + REMOVE FRIEND FLOW — focused coverage for this
// task's own 19 requirements. Behavioral checks run the real friendship/
// private-chat services against the in-memory fake DB; UI-wiring facts
// (positioning, click-doesn't-immediately-remove, confirmation ownership)
// are checked at the source level — this project's established convention
// (see e.g. features/friends/friends-quick-actions.test.ts).
import assert from "node:assert/strict";
import fs from "node:fs";
import { test, beforeEach } from "node:test";

import { getFriendshipRelation, removeFriend } from "@/features/friends/services/friendship.service";
import { getConversationMessages, getOrCreateConversation, sendPrivateMessage } from "@/features/friends/services/private-chat.service";
import {
  getFriendshipRow,
  getFriendshipRowsForPlayer,
  getPrivateMessageRows,
  resetFakeDb,
  seedFriendship,
  seedPlayerProfile,
} from "../../test/support/fakes/prisma.fake.ts";

beforeEach(() => {
  resetFakeDb();
  seedPlayerProfile({ id: "player-a", displayName: "אביב", username: "aviv" });
  seedPlayerProfile({ id: "player-b", displayName: "נועה", username: "noa" });
  seedPlayerProfile({ id: "player-c", displayName: "דני", username: "dani" });
});

const friendsBarSrc = fs.readFileSync("features/friends/components/FriendsBar.tsx", "utf8");
const floatingWindowSrc = fs.readFileSync("features/friends/components/FloatingPrivateChatWindow.tsx", "utf8");
// Strips `//` line-comments before a substring check runs, so a doc comment
// legitimately describing an OLD/forbidden pattern in prose (e.g. this
// file's own comments naming the exact past bug) never false-positives a
// check meant to catch that pattern in real, executable code.
const stripLineComments = (src: string) =>
  src
    .split("\n")
    .filter((line) => !line.trim().startsWith("//"))
    .join("\n");
const confirmationSrc = fs.readFileSync("features/friends/components/RemoveFriendConfirmation.tsx", "utf8");
const useRemoveFriendSrc = fs.readFileSync("features/friends/hooks/use-remove-friend.ts", "utf8");
const friendsDataContextSrc = fs.readFileSync("features/friends/context/friends-data-context.tsx", "utf8");
const addFriendButtonSrc = fs.readFileSync("features/friends/components/AddFriendButton.tsx", "utf8");
const globalChatBarSrc = fs.readFileSync("features/chat/components/GlobalChatBar.tsx", "utf8");
const globalChatServiceSrc = fs.readFileSync("features/chat/services/global-chat.service.ts", "utf8");

// 1 — Friends bar is positioned at the far right. As of FRIENDS UI —
// MINIMIZED CHAT POSITION + LIVE FRIEND REMOVAL SYNC, FriendsBar no longer
// self-positions — it's the LAST child of the shared SocialDock flex
// container, which (via dir="ltr" + plain flex-row) is what makes it the
// right-most social element, for any collapsed/expanded combination.
test("1: (source) FriendsBar never self-positions and is the LAST child of SocialDock (the right-most slot)", () => {
  assert.ok(!friendsBarSrc.includes("fixed bottom-"), "FriendsBar itself must never carry its own fixed bottom-right positioning");
  assert.ok(!friendsBarSrc.includes("right-4"), "FriendsBar itself must never carry its own right offset");
  const layoutSrc = fs.readFileSync("app/(game)/layout.tsx", "utf8");
  const floatingIndex = layoutSrc.indexOf("<FloatingPrivateChatWindow");
  const barIndex = layoutSrc.indexOf("<FriendsBar");
  const dockCloseIndex = layoutSrc.indexOf("</SocialDock>");
  assert.ok(floatingIndex >= 0 && barIndex > floatingIndex && barIndex < dockCloseIndex, "FriendsBar must be rendered after FloatingPrivateChatWindow inside SocialDock, so it lands right-most");
});

// 2 — Private Chat is positioned to its left. As of the same task, this is
// now a pure DOM-order/flex fact (SocialDock's dir="ltr" + gap), never a
// hardcoded per-state rem offset — see SocialDock.tsx's own doc comment
// for why a hardcoded sm:right-[22rem] (sized only for Friends Bar's
// EXPANDED width) was the actual bug this replaced.
test("2: (source) the private-chat window is the FIRST child of SocialDock, so it always sits immediately LEFT of the Friends bar", () => {
  const floatingWindowCode = stripLineComments(floatingWindowSrc);
  assert.ok(!floatingWindowCode.includes("fixed bottom-"), "the floating window itself must never carry its own fixed bottom-right positioning");
  assert.ok(!floatingWindowCode.includes("sm:right-["), "must not reintroduce a hardcoded viewport-specific offset sized for one particular state");
  const dockSrc = fs.readFileSync("features/friends/components/SocialDock.tsx", "utf8");
  assert.match(dockSrc, /flex-row/, "SocialDock must use plain flex-row so DOM order determines left/right");
  assert.match(dockSrc, /\bgap-/, "SocialDock must use a flex gap, not per-child hardcoded offsets, for the clean gap between panels");
});

// 3 — accepted friend row contains a red remove X.
test("3: (source) each friend row renders a red-styled remove ✕ button with an accessible label", () => {
  assert.ok(friendsBarSrc.includes("text-rose-400"), "the remove control must use danger/red styling");
  assert.match(friendsBarSrc, /aria-label=\{`הפסק חברות עם \$\{friend\.displayName\}`\}/);
  assert.match(friendsBarSrc, /title=\{`הפסק חברות עם \$\{friend\.displayName\}`\}/);
});

// 4 — clicking X does not immediately remove the friendship.
test("4: (source) clicking the ✕ only opens the confirmation dialog — it never calls the removal hook directly", () => {
  assert.match(friendsBarSrc, /onClick=\{\(\) => setPendingRemoval\(\{ playerId: friend\.playerId, displayName: friend\.displayName \}\)\}/);
  assert.ok(!/onClick=\{[^}]*removeFriendAndCloseChatIfOpen/.test(friendsBarSrc), "the ✕ button itself must never call the removal function directly");
});

// 5 — confirmation displays the correct friend's name.
test("5: (source) RemoveFriendConfirmation renders the exact required Hebrew message with the friend's own name", () => {
  assert.match(confirmationSrc, /האם אתה בטוח שברצונך להפסיק את החברות עם \{friendName\}\?/);
  assert.ok(confirmationSrc.includes("אישור"));
  assert.ok(confirmationSrc.includes("ביטול"));
  // Checks actual USAGE (a real window.confirm( call), not a blanket
  // substring ban — this file's own doc comment legitimately says "never
  // window.confirm()" in prose.
  assert.ok(!confirmationSrc.includes("window.confirm("), "must never call the native browser confirm()");
});

// 6 — Cancel makes no friendship change.
test("6: (source) cancelling only closes the dialog — it never touches friendship state", () => {
  assert.match(friendsBarSrc, /onCancel=\{\(\) => setPendingRemoval\(null\)\}/);
});

// 7 — Confirm removes an accepted friendship (real service-level proof).
test("7: removeFriend deletes an accepted friendship, from either side", async () => {
  seedFriendship({ requesterId: "player-a", addresseeId: "player-b", status: "accepted" });
  const result = await removeFriend("player-a", "player-b");
  assert.deepEqual(result, { ok: true });
  assert.equal(getFriendshipRowsForPlayer("player-a").length, 0, "the row must be gone entirely, not merely marked removed");

  seedFriendship({ requesterId: "player-b", addresseeId: "player-a", status: "accepted" });
  const resultFromOtherSide = await removeFriend("player-b", "player-a");
  assert.deepEqual(resultFromOtherSide, { ok: true }, "either friend must be able to remove the friendship, regardless of who originally sent the request");
});

test("7b: removing a pending (not yet accepted) request is rejected — a genuinely different operation from decline", async () => {
  seedFriendship({ requesterId: "player-a", addresseeId: "player-b", status: "pending" });
  const result = await removeFriend("player-a", "player-b");
  assert.deepEqual(result, { ok: false, error: "not-found" });
  assert.equal(getFriendshipRowsForPlayer("player-a").length, 1, "a pending request must be untouched by removeFriend");
});

// 8 — unrelated third player cannot remove friendship.
test("8: an unrelated third player cannot remove someone else's friendship", async () => {
  seedFriendship({ requesterId: "player-a", addresseeId: "player-b", status: "accepted" });
  const result = await removeFriend("player-c", "player-a");
  assert.deepEqual(result, { ok: false, error: "not-found" });
  assert.equal((await getFriendshipRelation("player-a", "player-b")).status, "friends", "the real friendship must be completely untouched");
});

// 9 — FriendsDataProvider updates immediately (optimistic, before the
// server round trip resolves).
test("9: (source) the shared context removes the friend from local state optimistically, before awaiting the server action", () => {
  const removeFnBody = friendsDataContextSrc.slice(friendsDataContextSrc.indexOf("const removeFriend = useCallback"));
  const optimisticIndex = removeFnBody.indexOf("setFriends((current) => current.filter");
  const awaitIndex = removeFnBody.indexOf("await removeFriendAction");
  assert.ok(optimisticIndex >= 0 && awaitIndex > optimisticIndex, "local state must update BEFORE the server round trip, not after");
});

// 10 — removed friend disappears from the Friends bar (follows directly
// from FriendsBar reading only `friends` from the shared context — already
// proven by friends-quick-actions.test.ts's own test 7/9; this confirms
// the removal path feeding that same list).
test("10: (source) FriendsBar's friend list is the SAME `friends` array the shared context's removeFriend mutates — no separate copy", () => {
  assert.match(friendsBarSrc, /const \{ friends \} = useFriendsData\(\)/);
});

// 11 — open private chat with the removed friend closes immediately.
test("11: (source) removeFriendAndCloseChatIfOpen closes the chat window when it's open with the friend being removed", () => {
  assert.match(useRemoveFriendSrc, /activeConversation\?\.friendPlayerId === friendPlayerId/);
  assert.ok(useRemoveFriendSrc.includes("closeChat()"));
});

// 12 + 13 — public profile shows "הפסק חברות" for an existing friend, using
// the same shared confirmation flow (data correctness for the friends
// status itself is already proven by public-profile-view.test.ts).
test("12+13: (source) AddFriendButton's friends branch uses the SAME RemoveFriendConfirmation + useRemoveFriend as the Friends bar", () => {
  assert.ok(addFriendButtonSrc.includes("RemoveFriendConfirmation"));
  assert.ok(addFriendButtonSrc.includes("useRemoveFriend"));
  const friendsBranchIndex = addFriendButtonSrc.indexOf('status === "friends"');
  const removeLabelIndex = addFriendButtonSrc.indexOf("הפסק חברות");
  assert.ok(friendsBranchIndex >= 0 && removeLabelIndex > friendsBranchIndex);
});

// 14 — profile changes back to "הוסף כחבר" after removal.
test("14: (source) a successful removal sets AddFriendButton's own status back to none, which renders הוסף כחבר", () => {
  assert.match(addFriendButtonSrc, /if \(ok\) setStatus\("none"\)/);
  const noneRenderIndex = addFriendButtonSrc.lastIndexOf("הוסף כחבר");
  assert.ok(noneRenderIndex > 0);
});

// 15 — removed friends cannot send private messages.
test("15: after a friendship is removed, neither side can send a new private message into the old conversation", async () => {
  seedFriendship({ requesterId: "player-a", addresseeId: "player-b", status: "accepted" });
  const opened = await getOrCreateConversation("player-a", "player-b");
  assert.equal(opened.ok, true);
  const conversationId = opened.ok ? opened.conversation.conversationId : "";

  await removeFriend("player-a", "player-b");

  const fromA = await sendPrivateMessage("player-a", conversationId, "עדיין אפשר?");
  assert.deepEqual(fromA, { ok: false, error: "not-friends" });
  const fromB = await sendPrivateMessage("player-b", conversationId, "גם לא לי?");
  assert.deepEqual(fromB, { ok: false, error: "not-friends" });
});

// 16 — removed friends cannot reopen private chat.
test("16: after a friendship is removed, neither side can reopen/recreate the conversation", async () => {
  seedFriendship({ requesterId: "player-a", addresseeId: "player-b", status: "accepted" });
  await getOrCreateConversation("player-a", "player-b");
  await removeFriend("player-a", "player-b");

  const reopenedByA = await getOrCreateConversation("player-a", "player-b");
  assert.deepEqual(reopenedByA, { ok: false, error: "not-friends" });
  const reopenedByB = await getOrCreateConversation("player-b", "player-a");
  assert.deepEqual(reopenedByB, { ok: false, error: "not-friends" });
});

// 16b — a guessed real conversation id must not bypass this either.
test("16b: an unrelated third player still cannot use a real (former-friends) conversation id after removal", async () => {
  seedFriendship({ requesterId: "player-a", addresseeId: "player-b", status: "accepted" });
  const opened = await getOrCreateConversation("player-a", "player-b");
  const conversationId = opened.ok ? opened.conversation.conversationId : "";
  await removeFriend("player-a", "player-b");

  const result = await sendPrivateMessage("player-c", conversationId, "אני לא שייך לשיחה");
  assert.deepEqual(result, { ok: false, error: "not-a-participant" }, "an outsider is still rejected at the participancy check, before friendship is even considered");
});

// 17 — historical private messages are NOT deleted.
test("17: removing the friendship preserves all historical messages — never deleted, still readable by a real participant", async () => {
  seedFriendship({ requesterId: "player-a", addresseeId: "player-b", status: "accepted" });
  const opened = await getOrCreateConversation("player-a", "player-b");
  const conversationId = opened.ok ? opened.conversation.conversationId : "";
  await sendPrivateMessage("player-a", conversationId, "היי נועה");
  await sendPrivateMessage("player-b", conversationId, "היי אביב");

  const beforeRemoval = getPrivateMessageRows(conversationId);
  assert.equal(beforeRemoval.length, 2);

  await removeFriend("player-a", "player-b");

  const afterRemoval = getPrivateMessageRows(conversationId);
  assert.deepEqual(afterRemoval, beforeRemoval, "no message row may be touched by friendship removal");

  // Reading (not sending) history through an already-known conversation id
  // is still governed by participancy alone, exactly as before this
  // feature — the ticket's own explicit rule is "preserve history",
  // consistent with never gating reads on current friendship status.
  const stillReadable = await getConversationMessages("player-a", conversationId);
  assert.equal(stillReadable?.length, 2, "a real participant must still be able to see preserved history");
});

// 18 — Global Chat remains untouched.
test("18: (source) Global Chat has no dependency on the remove-friend feature", () => {
  for (const src of [globalChatBarSrc, globalChatServiceSrc]) {
    assert.ok(!src.includes("RemoveFriendConfirmation"));
    assert.ok(!src.includes("removeFriend"));
    assert.ok(!src.includes("useRemoveFriend"));
  }
});

// 19 — battle-lock behavior remains untouched.
test("19: (source) the new remove-friend surfaces never read or modify ActiveBattleProvider/battle-lock state", () => {
  for (const src of [friendsBarSrc, confirmationSrc, useRemoveFriendSrc, addFriendButtonSrc]) {
    assert.ok(!src.includes("useActiveBattle("), "must never call useActiveBattle");
    assert.ok(!src.includes("setActiveBattle("), "must never call setActiveBattle");
    assert.ok(!src.includes("active-battle-context"), "must never import the battle-lock context module");
  }
});
