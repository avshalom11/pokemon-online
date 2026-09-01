import { getStaffRolePresentation } from "@/features/moderation/config/staff-role-presentation";
import type { StaffRole } from "@/features/moderation/types";

interface StaffRoleLabelProps {
  role: StaffRole | null;
  className?: string;
}

// STAFF / MODERATION — ROLE PRESENTATION. The one shared "(role label)"
// suffix rendered immediately next to a staff member's name — GlobalChatWindow.tsx
// (Global Chat) and ProfileHeader.tsx (public profile) both mount this
// rather than each formatting their own copy of the label, so the exact
// text/parentheses/color styling never drifts out of sync between the two
// surfaces (see staff-role-presentation.ts's own doc comment for the
// underlying canonical mapping this reads through). Renders nothing at all
// for a plain player (role === null) — "PLAYER: no label" is therefore
// true by construction here too, not a separate branch each caller must
// remember.
export function StaffRoleLabel({ role, className }: StaffRoleLabelProps) {
  const presentation = getStaffRolePresentation(role);
  if (!presentation) return null;

  return (
    <span className={`text-xs font-semibold ${presentation.nameClassName} ${className ?? ""}`.trim()}>
      ({presentation.label})
    </span>
  );
}
