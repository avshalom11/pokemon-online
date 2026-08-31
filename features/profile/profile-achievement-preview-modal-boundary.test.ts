// GYM BADGE/MEDAL IMAGE ORDER — PROFILE CLICK-TO-ENLARGE (later task) —
// source-level boundary coverage for the new achievement-preview modal, on
// the same "no React-render/DOM harness in this repo" convention every
// prior Profile Achievements task already established
// (profile-achievements-wiring-boundary.test.ts). Privacy behavior itself
// (items 24/25) is NOT re-tested here — it is already exhaustively covered,
// unmodified, by profile-achievements-view.service.test.ts's own "other
// viewer does NOT receive achievement data when visibility is OFF" /
// "the owner still sees their own real achievements even when visibility
// is OFF" tests; this file only proves the NEW click/modal wiring can never
// bypass that existing gate — it only ever operates on items already
// present in the (already privacy-filtered) achievements view.
import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";

const achievementsSectionSrc = fs.readFileSync("features/profile/components/ProfileAchievementsSection.tsx", "utf8");
const previewModalSrc = fs.readFileSync("features/profile/components/AchievementPreviewModal.tsx", "utf8");

test("19/20: every earned Badge AND every earned Medal item is rendered as a clickable <button>, both groups sharing the SAME AchievementGroup component/onSelect wiring", () => {
  assert.ok(achievementsSectionSrc.includes("<button"), "achievement items must be real, focusable, clickable buttons — never a plain <div> with only a CSS hover state");
  assert.ok(achievementsSectionSrc.includes("onClick={() => onSelect(item)}"), "each item's click must call the shared onSelect callback");
  assert.ok(
    achievementsSectionSrc.includes('<AchievementGroup title="תגי מכון" items={achievements.badges.map(badgeToDisplayItem)} onSelect={setPreviewItem} />'),
    "the Badge group must be wired to open the preview on click"
  );
  assert.ok(
    achievementsSectionSrc.includes('<AchievementGroup title="מדליות מחוז" items={achievements.regionalMedals.map(medalToDisplayItem)} onSelect={setPreviewItem} />'),
    "the Medal group must be wired to open the preview on click, through the exact same mechanism as Badges"
  );
});

test("21/22: clicking either a Badge or a Medal opens the SAME AchievementPreviewModal — never two different modal implementations", () => {
  assert.ok(achievementsSectionSrc.includes("import { AchievementPreviewModal }"), "the modal must be imported and used");
  assert.ok(
    achievementsSectionSrc.includes(
      "<AchievementPreviewModal imageUrl={previewItem.imageUrl} name={previewItem.name} kind={previewItem.kind} onClose={() => setPreviewItem(null)} />"
    ),
    "the modal must be gated by one shared previewItem state, populated by either group's onSelect"
  );
  // Only ONE piece of state gates the modal — proves a Badge click and a
  // Medal click can never somehow open two overlapping modals at once.
  const previewItemStateCount = achievementsSectionSrc.split("useState<AchievementDisplayItem | null>(null)").length - 1;
  assert.equal(previewItemStateCount, 1, "there must be exactly one previewItem state shared by both achievement groups");
});

test("23: the modal renders the EXACT imageUrl already present on the achievement view model — never a second image lookup/mapping", () => {
  assert.ok(!previewModalSrc.includes("getGymBadgeDefinition"), "the modal must never re-derive a Badge image itself");
  assert.ok(!previewModalSrc.includes("getRegionalMedalDefinition"), "the modal must never re-derive a Medal image itself");
  assert.ok(!previewModalSrc.includes("getGymBadgeImageUrl") && !previewModalSrc.includes("getRegionalMedalImageUrl"), "the modal must never recompute an image path itself");
  assert.ok(previewModalSrc.includes("src={imageUrl}"), "the modal must render exactly the imageUrl prop it was handed, unmodified");

  // badgeToDisplayItem/medalToDisplayItem (the only two places an
  // AchievementDisplayItem is ever built) read imageUrl straight off the
  // server view model's own badge.imageUrl/medal.imageUrl — never a second
  // computed value.
  assert.ok(achievementsSectionSrc.includes("imageUrl: badge.imageUrl"));
  assert.ok(achievementsSectionSrc.includes("imageUrl: medal.imageUrl"));
});

test("MEDAL IMAGE SIZE: the preview modal shows a Regional Medal image larger than a Gym Badge — Badge sizing (h-40 w-40) is untouched", () => {
  assert.ok(previewModalSrc.includes('isMedal ? "h-48 w-48 object-contain" : "h-40 w-40 object-contain"'), "only the Medal branch may be enlarged, Badge stays h-40 w-40");
  assert.ok(achievementsSectionSrc.includes('kind: "badge"'), "badge items must be tagged kind: 'badge'");
  assert.ok(achievementsSectionSrc.includes('kind: "medal"'), "medal items must be tagged kind: 'medal'");
});

test("the modal shows the achievement's name and a close control, matching the project's established EditProfileModal backdrop-click-to-close convention", () => {
  assert.ok(previewModalSrc.includes("{name}"), "the modal must display the achievement's name");
  assert.ok(previewModalSrc.includes('onClick={onClose}'), "clicking the backdrop must close the modal");
  assert.ok(previewModalSrc.includes("event.stopPropagation()"), "clicking inside the modal content itself must not close it");
  assert.ok(previewModalSrc.includes('aria-label="סגור"'), "an explicit close button must also exist");
});

test("24/25 (structural): the click-to-enlarge modal can only ever show an item already present in achievements.badges/achievements.regionalMedals/achievements.leagueAwards — it never fetches or holds a second, broader achievement list, so it structurally cannot expose a hidden achievement the server-side privacy gate already excluded", () => {
  assert.ok(
    !achievementsSectionSrc.includes("getOwnedGymBadges") && !achievementsSectionSrc.includes("getOwnedRegionalMedals") && !achievementsSectionSrc.includes("fetch("),
    "the component must never independently fetch achievement data — only the already-privacy-filtered `achievements` prop"
  );
  assert.ok(
    !achievementsSectionSrc.includes("getPlayerLeagueAchievements"),
    "the component must never independently fetch League award data either — only the already-privacy-filtered `achievements` prop"
  );
  // previewItem is only ever set from an item already mapped out of the
  // `achievements` prop (badgeToDisplayItem/medalToDisplayItem/
  // leagueAwardToDisplayItem over achievements.badges/.regionalMedals/
  // .leagueAwards) — for a non-owner viewer with visibility OFF, those
  // arrays are already genuinely empty (profile-achievements-view.service.ts),
  // so there is no item to click in the first place.
  assert.ok(achievementsSectionSrc.includes("setPreviewItem"), "previewItem must be settable only via the mapped achievement items");
});

// ============================================================================
// LEAGUE AWARDS — the "פרסי ליגה" group: reuses the same AchievementGroup/
// AchievementPreviewModal wiring as Badges/Medals, plus a quantity badge
// for a (leagueId, place) earned more than once.
// ============================================================================

test("the League Awards group is wired through the exact same AchievementGroup/onSelect mechanism as Badges and Medals", () => {
  assert.ok(
    achievementsSectionSrc.includes('<AchievementGroup title="פרסי ליגה" items={achievements.leagueAwards.map(leagueAwardToDisplayItem)} onSelect={setPreviewItem} />'),
    "the League Awards group must be wired to open the preview on click, through the exact same mechanism as Badges/Medals"
  );
});

test("League award items never re-derive their own image — imageUrl is read straight off the already-grouped view model", () => {
  assert.ok(achievementsSectionSrc.includes("imageUrl: award.imageUrl"));
  assert.ok(!achievementsSectionSrc.includes("leagueAwardImageUrl"), "the component must never call the image resolver itself — only the server-side view model does");
});

test("a League award earned more than once shows a '×N' quantity badge; a single win never shows a redundant '×1'", () => {
  assert.ok(achievementsSectionSrc.includes("item.quantity !== undefined && item.quantity > 1"), "the quantity badge must only render when earned more than once");
  assert.ok(/×\{item\.quantity\}/.test(achievementsSectionSrc), "the visible quantity badge must show the real count");
});

test("MEDAL IMAGE SIZE: a League award is shown at the same enlarged size as a Regional Medal in the preview modal", () => {
  assert.ok(previewModalSrc.includes('kind === "medal" || kind === "league-award"'), "league-award must share the Medal-sized branch, not the smaller Badge size");
});
