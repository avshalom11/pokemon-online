// STAFF / MODERATION — ROLE PRESENTATION — the canonical role -> (label,
// color) mapping (getStaffRolePresentation), plus source-level coverage
// proving Global Chat and the profile header both actually render THROUGH
// it (never a second, hand-duplicated copy of the same label/color pairs),
// and that the underlying data used is always the PERSISTED role (never a
// hardcoded username, never derived from permissions/buttons).
import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";

import { getStaffRolePresentation } from "@/features/moderation/config/staff-role-presentation";

function readSourceNormalized(path: string): string {
  return fs.readFileSync(path, "utf8").replace(/\r\n/g, "\n");
}

// 1 — OWNER: gold, exact label
test('1: OWNER presentation is exactly label "מנהל האתר" with a gold name color', () => {
  assert.deepEqual(getStaffRolePresentation("OWNER"), { label: "מנהל האתר", nameClassName: "text-[#C99700]" });
});

// 2 — DEPUTY: light-cyan/blue, exact label
test('2: DEPUTY presentation is exactly label "סגן מנהל אתר" with a light-cyan/blue name color', () => {
  assert.deepEqual(getStaffRolePresentation("DEPUTY"), { label: "סגן מנהל אתר", nameClassName: "text-[#38D9FF]" });
});

// 3 — SUPPORT: green, exact label
test('3: SUPPORT presentation is exactly label "תמיכה" with a green name color', () => {
  assert.deepEqual(getStaffRolePresentation("SUPPORT"), { label: "תמיכה", nameClassName: "text-[#39FF88]" });
});

// 4 — PLAYER (null role): no presentation at all
test("4: a plain player (null role) has no presentation — no label, no color override", () => {
  assert.equal(getStaffRolePresentation(null), null);
});

// 5 — every real StaffRole has a DISTINCT color, so no two roles are ever visually confusable
test("5: OWNER/DEPUTY/SUPPORT each get a distinct name color", () => {
  const colors = new Set(
    (["OWNER", "DEPUTY", "SUPPORT"] as const).map((role) => getStaffRolePresentation(role)?.nameClassName)
  );
  assert.equal(colors.size, 3);
});

// 6 — (source) Global Chat renders the name color + label through the SAME
// canonical helper/component — never a second, hand-written copy of the
// role -> color/label mapping.
test("6: (source) GlobalChatWindow.tsx colors the sender name and renders the role label through the canonical staff-role-presentation module", () => {
  const src = readSourceNormalized("features/chat/components/GlobalChatWindow.tsx");
  assert.match(src, /from "@\/features\/moderation\/config\/staff-role-presentation"/);
  assert.match(src, /getStaffRolePresentation\(message\.senderStaffRole\)/);
  assert.match(src, /<StaffRoleLabel role=\{message\.senderStaffRole\} \/>/);
  // DEV BUG FIX REGRESSION GUARD — staff identity is PUBLIC presentation:
  // the sender's own color/label must never be gated by the CURRENT
  // VIEWER's role. useViewerStaffRole is legitimately used elsewhere in
  // this file (ChatModerationMenu decides its OWN visibility from it), but
  // GlobalChatWindow.tsx itself must never call it directly for the
  // name/label decision.
  assert.ok(!/getStaffRolePresentation\([^)]*viewerRole/i.test(src));
  assert.ok(!/StaffRoleLabel role=\{[^}]*viewer/i.test(src));
});

// 7 — (source) the profile header renders through the SAME canonical
// helper/component — proving the mapping is not duplicated between the two
// surfaces — and uses the TARGET's own role, never the viewer's.
test("7: (source) ProfileHeader.tsx colors the player name and renders the role label through the canonical staff-role-presentation module, using the profile TARGET's own role", () => {
  const src = readSourceNormalized("features/profile/components/ProfileHeader.tsx");
  assert.match(src, /from "@\/features\/moderation\/config\/staff-role-presentation"/);
  assert.match(src, /getStaffRolePresentation\(view\.targetStaffRole\)/);
  assert.match(src, /<StaffRoleLabel role=\{view\.targetStaffRole\} \/>/);
  // Never the viewer's own role — this component has no access to
  // ViewerStaffRoleContext at all, and must never gain one for this purpose.
  assert.ok(!src.includes("useViewerStaffRole"));
});

// 8 — (source) neither surface ever hardcodes a username to grant styling —
// the whole point of using the persisted role is that it follows a
// username change automatically.
test('8: (source) neither GlobalChatWindow.tsx nor ProfileHeader.tsx ever hardcodes "avshalom" (or any literal username) to grant staff styling', () => {
  const chatSrc = readSourceNormalized("features/chat/components/GlobalChatWindow.tsx");
  const profileSrc = readSourceNormalized("features/profile/components/ProfileHeader.tsx");
  assert.ok(!chatSrc.toLowerCase().includes("avshalom"));
  assert.ok(!profileSrc.toLowerCase().includes("avshalom"));
});

// 9 — (source) StaffRoleLabel renders nothing for a plain player, and never
// itself carries a second copy of the label/color mapping.
test("9: (source) StaffRoleLabel.tsx reads its label/color from getStaffRolePresentation, and returns null when there is none", () => {
  const src = readSourceNormalized("features/moderation/components/StaffRoleLabel.tsx");
  assert.match(src, /getStaffRolePresentation\(role\)/);
  assert.match(src, /if \(!presentation\) return null;/);
  // No hand-written label text duplicated here.
  assert.ok(!src.includes("מנהל האתר"));
  assert.ok(!src.includes("סגן מנהל אתר"));
  assert.ok(!src.includes("תמיכה"));
});
