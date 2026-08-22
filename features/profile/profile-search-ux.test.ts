// PROFILE + PLAYER SEARCH UX — focused coverage for this task's own
// requirements: clickable usernames across every named social surface, the
// Add Friend button's per-state rendering on another player's profile, and
// the new sidebar search control's battle-lock behavior. Behavioral checks
// run the real services against the in-memory fake DB; UI-wiring facts
// with no natural service-level assertion are checked at the source level
// — this project's established convention (see e.g. features/chat/
// global-chat-presentation.test.ts).
import assert from "node:assert/strict";
import fs from "node:fs";
import { test, beforeEach } from "node:test";

import { getRecentGlobalChatMessages, sendGlobalChatMessage } from "@/features/chat/services/global-chat.service";
import { getFriendsAndRequests } from "@/features/friends/services/friendship.service";
import { getOrCreateConversation, sendPrivateMessage } from "@/features/friends/services/private-chat.service";
import { getSignificantCaptures } from "@/features/home/services/significant-captures.service";
import { POKEMON_DATA } from "@/data/pokemon/pokemon-data";
import { resetFakeDb, seedFriendship, seedPlayerPokemon, seedPlayerProfile } from "../../test/support/fakes/prisma.fake.ts";

beforeEach(() => {
  resetFakeDb();
});

// 7 — Global Chat username links to profile.
test("7: Global Chat messages carry the sender's real username end to end", async () => {
  seedPlayerProfile({ id: "player-1", displayName: "אביב", username: "aviv_the_trainer" });

  const sent = await sendGlobalChatMessage("player-1", "שלום לכולם");
  assert.equal(sent.ok, true);
  assert.equal(sent.ok && sent.message.playerUsername, "aviv_the_trainer");

  const recent = await getRecentGlobalChatMessages();
  assert.equal(recent[0]?.playerUsername, "aviv_the_trainer");
});

test("7b: (source) Global Chat renders sender names through the shared clickable-username component", () => {
  const src = fs.readFileSync("features/chat/components/GlobalChatWindow.tsx", "utf8");
  assert.ok(src.includes("PlayerNameLink"), "GlobalChatWindow must render names via PlayerNameLink");
  assert.ok(src.includes("message.playerUsername"), "must pass the resolved username through");
});

// 8 — Private Chat username links to profile where applicable.
test("8: Private Chat messages and the conversation header both carry real usernames", async () => {
  seedPlayerProfile({ id: "player-a", displayName: "אביב", username: "aviv_a" });
  seedPlayerProfile({ id: "player-b", displayName: "נועה", username: "noa_b" });
  seedFriendship({ requesterId: "player-a", addresseeId: "player-b", status: "accepted" });

  const opened = await getOrCreateConversation("player-a", "player-b");
  assert.equal(opened.ok, true);
  assert.equal(opened.ok && opened.conversation.friendUsername, "noa_b", "the conversation header's friend name must carry a real username");

  const conversationId = opened.ok ? opened.conversation.conversationId : "";
  const sent = await sendPrivateMessage("player-a", conversationId, "היי נועה");
  assert.equal(sent.ok, true);
  assert.equal(sent.ok && sent.message.playerUsername, "aviv_a");
});

test("8b: (source) the private chat window and floating header both render clickable usernames", () => {
  const windowSrc = fs.readFileSync("features/friends/components/PrivateChatWindow.tsx", "utf8");
  assert.ok(windowSrc.includes("PlayerNameLink"));
  assert.ok(windowSrc.includes("message.playerUsername"));

  const floatingSrc = fs.readFileSync("features/friends/components/FloatingPrivateChatWindow.tsx", "utf8");
  assert.ok(floatingSrc.includes("PlayerNameLink"), "the friend's name in the floating window's own header must be clickable too");
});

// 9 — Friends list / friend requests username links to profile.
test("9: getFriendsAndRequests resolves real usernames for both confirmed friends and incoming requesters", async () => {
  seedPlayerProfile({ id: "player-1", displayName: "אביב", username: "aviv1" });
  seedPlayerProfile({ id: "friend-1", displayName: "נועה", username: "noa1" });
  seedPlayerProfile({ id: "requester-1", displayName: "דני", username: "dani1" });
  seedFriendship({ requesterId: "player-1", addresseeId: "friend-1", status: "accepted" });
  seedFriendship({ requesterId: "requester-1", addresseeId: "player-1", status: "pending" });

  const view = await getFriendsAndRequests("player-1");
  assert.equal(view.friends[0]?.username, "noa1");
  assert.equal(view.incomingRequests[0]?.requesterUsername, "dani1");
});

test("9b: (source) the Profile Friends section renders both lists through the shared clickable-username component", () => {
  const src = fs.readFileSync("features/friends/components/ProfileFriendsSection.tsx", "utf8");
  const occurrences = (src.match(/<PlayerNameLink/g) ?? []).length;
  assert.ok(occurrences >= 2, "both the friends list and the incoming-requests list must use PlayerNameLink");
});

// 10 — Significant Capture username links to profile.
test("10: a significant capture carries the capturing player's real username", async () => {
  seedPlayerProfile({ id: "player-1", displayName: "אביב", username: "aviv_catcher" });
  const legendarySpecies = POKEMON_DATA.find((species) => species.rarity === "legendary");
  if (!legendarySpecies) throw new Error("test setup: catalog must contain a legendary species");
  seedPlayerPokemon({ id: "poke-1", playerId: "player-1", speciesId: legendarySpecies.id, source: "capture", createdAt: new Date() });

  const captures = await getSignificantCaptures();
  assert.equal(captures.legendary?.playerUsername, "aviv_catcher");
});

test("10b: (source) SignificantCapturesCard renders the capturing player's name through the shared clickable-username component", () => {
  const src = fs.readFileSync("features/home/components/SignificantCapturesCard.tsx", "utf8");
  assert.ok(src.includes("PlayerNameLink"));
  assert.ok(src.includes("capture.playerUsername"));
});

// 5 — Add Friend shown only when appropriate; 6 — already-friends/pending
// states render correctly. (Server-side friendship-status computation is
// already covered end to end by public-profile-view.test.ts; this checks
// the UI actually renders every one of the four required states plus the
// self case, using ONLY the existing friendship actions — never a
// duplicated friendship implementation in React.)
const addFriendButtonSrc = fs.readFileSync("features/friends/components/AddFriendButton.tsx", "utf8");

// UPDATED by FRIENDS QUICK ACTIONS: accept/decline now goes through the
// shared FriendsDataProvider's own respondToRequest (friends-data-
// context.tsx) rather than calling respondToFriendRequestAction directly —
// that context is itself the one place that action is ever called from,
// so routing through it is still "reuse the existing respond action,
// never a duplicated implementation," just one hop further removed.
test("5+6: (source) AddFriendButton renders the correct control/label for every friendship state", () => {
  assert.match(addFriendButtonSrc, /status === "self"\) return null/, "no Add Friend control on your own profile");
  assert.ok(addFriendButtonSrc.includes("הוסף כחבר"), "no-relationship state");
  assert.ok(addFriendButtonSrc.includes("בקשת חברות נשלחה"), "pending-outgoing state");
  assert.ok(addFriendButtonSrc.includes("חברים"), "already-friends state");
  assert.match(addFriendButtonSrc, /status === "pending-incoming"/, "pending-incoming gets its own accept/decline branch");
  assert.ok(addFriendButtonSrc.includes("אשר חברות") && addFriendButtonSrc.includes("לא מאשר"), "pending-incoming must show אשר חברות / לא מאשר");
  assert.ok(addFriendButtonSrc.includes("sendFriendRequestAction"), "must reuse the existing send action");
  assert.ok(
    addFriendButtonSrc.includes("useFriendsData") && addFriendButtonSrc.includes("respondToRequest"),
    "accept/decline must reuse the shared FriendsDataProvider's one respondToRequest call site, never a duplicated implementation"
  );
});

// 16 — search control respects the active-battle sidebar lock (no second
// lock system).
test("16: (source) the player-search sidebar control is gated by the exact same isBattleLocked check every other item uses", () => {
  const sidebarSrc = fs.readFileSync("components/layout/GameSidebar.tsx", "utf8");
  assert.match(
    sidebarSrc,
    /if \(item\.hasAction\) \{\s*if \(isBattleLocked\) \{/,
    "the action-item branch must check the SAME isBattleLocked prop as every real link, not a second flag"
  );
  assert.ok(sidebarSrc.includes("BATTLE_LOCKED_TITLE"), "a locked action item must show the same battle-locked tooltip as a locked link");

  const menuSrc = fs.readFileSync("features/navigation/data/sidebar-menu.ts", "utf8");
  assert.ok(menuSrc.includes('id: "player-search"') && menuSrc.includes("חיפוש שחקנים"));
});
