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
  // A Tailwind text-color utility class. Each role uses an explicit
  // arbitrary hex value (text-[#RRGGBB]) rather than a named Tailwind
  // shade, so the exact on-brand tone is pinned precisely: #C99700 is a
  // dark/rich metallic gold for OWNER (deliberately not a plain yellow),
  // #38D9FF is a bright glowing light-cyan/light-blue for DEPUTY, and
  // #39FF88 is a bright glowing green for SUPPORT — each visually distinct
  // from the others and from this feature's own violet/indigo
  // moderation-dialog accents so a staff name never reads as "just another
  // purple UI element."
  nameClassName: string;
}

const STAFF_ROLE_PRESENTATION: Record<StaffRole, StaffRolePresentation> = {
  OWNER: { label: "מנהל האתר", nameClassName: "text-[#C99700]" },
  DEPUTY: { label: "סגן מנהל אתר", nameClassName: "text-[#38D9FF]" },
  SUPPORT: { label: "תמיכה", nameClassName: "text-[#39FF88]" },
};

// Returns null for a plain player (role === null) — every call site treats
// that as "render nothing extra, keep the caller's own default name
// styling" rather than special-casing null itself.
export function getStaffRolePresentation(role: StaffRole | null): StaffRolePresentation | null {
  if (role === null) return null;
  return STAFF_ROLE_PRESENTATION[role];
}
