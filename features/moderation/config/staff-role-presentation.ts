import type { StaffRole } from "@/features/moderation/types";

// STAFF / MODERATION — ROLE PRESENTATION. The ONE canonical "how does a
// staff role look/read to a player" mapping — Global Chat (GlobalChatWindow.
// tsx) and the public profile header (ProfileHeader.tsx) both render a
// staff member's name through this, so the name color + parenthetical
// label never drifts out of sync between the two surfaces (the same
// "one centralized matrix" rule staff-permissions.ts's own
// getStaffPermissions already establishes for authorization — this is the
// presentation-only counterpart, carries zero permission/hierarchy logic,
// and is never itself an authorization decision).
//
// Deliberately keyed by the PERSISTED StaffRole only (whatever
// getStaffRole/PublicProfileView.targetStaffRole/GlobalChatMessageView.
// senderStaffRole resolved from the StaffMember table) — never derived from
// a username, a permission flag, or which moderation buttons a viewer
// happens to see. A player with no StaffMember row (role === null) gets no
// entry here at all, which is what makes "PLAYER: keep current normal name
// styling, no label" true by construction rather than an explicit branch a
// caller could get wrong.
export interface StaffRolePresentation {
  // The plain Hebrew role label, WITHOUT surrounding parentheses — callers
  // wrap it in "(...)" themselves at the render site (see
  // StaffRoleLabel.tsx), since the parentheses are punctuation around the
  // label, not part of the canonical label text itself.
  label: string;
  // A Tailwind text-color utility class, reusing this codebase's own
  // existing color-name conventions rather than inventing new shades:
  // amber-400 is already this project's established "gold" (currency/
  // reward amounts throughout, e.g. ChangeUsernameDialog.tsx), emerald-400
  // is already its established "green" (success/price text throughout,
  // e.g. SecurityAccountSection.tsx), and blue-400 is Tailwind's own
  // literal "blue" — deliberately distinct from this feature's own
  // violet/indigo moderation-dialog accents so a staff name never reads as
  // "just another purple UI element."
  nameClassName: string;
}

const STAFF_ROLE_PRESENTATION: Record<StaffRole, StaffRolePresentation> = {
  OWNER: { label: "מנהל האתר", nameClassName: "text-amber-400" },
  DEPUTY: { label: "סגן מנהל אתר", nameClassName: "text-blue-400" },
  SUPPORT: { label: "תמיכה", nameClassName: "text-emerald-400" },
};

// Returns null for a plain player (role === null) — every call site treats
// that as "render nothing extra, keep the caller's own default name
// styling" rather than special-casing null itself.
export function getStaffRolePresentation(role: StaffRole | null): StaffRolePresentation | null {
  if (role === null) return null;
  return STAFF_ROLE_PRESENTATION[role];
}
