"use client";

import { useState } from "react";

import { ProfileModerationDialog } from "@/features/moderation/components/ProfileModerationDialog";
import { useViewerStaffRole } from "@/features/moderation/context/viewer-staff-role-context";
import { getAvailableProfileModerationActions, type ProfileModerationActionKind } from "@/features/moderation/permissions/profile-moderation-menu";
import type { StaffRole } from "@/features/moderation/types";

interface ProfileModerationControlProps {
  targetUsername: string;
  targetDisplayName: string;
  // This profile's own PLAYER's resolved StaffRole (null for a plain
  // player) — PublicProfileView.targetStaffRole, see that field's own doc
  // comment (features/profile/types/profile.types.ts).
  targetStaffRole: StaffRole | null;
}

const ACTION_LABELS: Record<ProfileModerationActionKind, string> = {
  temporary_site_ban: "הרחק מהאתר",
  permanent_site_ban: "חסום לצמיתות",
};

// STAFF / MODERATION — PROFILE SITE-BAN ENTRY POINT. The public-profile
// counterpart to ChatModerationMenu.tsx — shown ONLY when the CURRENT
// VIEWER is staff AND is allowed to moderate this specific profile's owner,
// both conditions collapsing into a single call to
// getAvailableProfileModerationActions (features/moderation/permissions/
// profile-moderation-menu.ts), which already returns an empty list for a
// plain viewer or for ANY viewer against an OWNER's own profile — no
// separate OWNER-specific branch needed here. The caller
// (ProfileContent.tsx) additionally never even mounts this component at
// all for the viewer's OWN profile (`view.isOwner`), a stronger, simpler
// exclusion than hierarchy alone would produce.
//
// Purely a client-side SHOW/HIDE decision, exactly like ChatModerationMenu
// — every action it can open still re-derives its own authorization from
// the database independently (authorize-moderation-action.ts), so a
// tampered client can never use this component's own logic as the real
// gate.
export function ProfileModerationControl({ targetUsername, targetDisplayName, targetStaffRole }: ProfileModerationControlProps) {
  const viewerRole = useViewerStaffRole();
  const [activeAction, setActiveAction] = useState<ProfileModerationActionKind | null>(null);

  if (viewerRole === null) return null;
  const availableActions = getAvailableProfileModerationActions(viewerRole, targetStaffRole);
  if (availableActions.length === 0) return null;

  return (
    <div dir="rtl" className="flex flex-wrap items-center gap-2 rounded-xl border border-rose-500/20 bg-rose-950/10 p-3">
      <span className="text-xs font-semibold tracking-wide text-rose-300 uppercase">כלי ניהול</span>
      {availableActions.map((action) => (
        <button
          key={action}
          type="button"
          onClick={() => setActiveAction(action)}
          className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
            action === "permanent_site_ban"
              ? "border-rose-500/40 text-rose-300 hover:bg-rose-950/40"
              : "border-white/15 text-slate-200 hover:bg-white/10"
          }`}
        >
          {ACTION_LABELS[action]}
        </button>
      ))}

      {activeAction ? (
        <ProfileModerationDialog
          kind={activeAction}
          targetUsername={targetUsername}
          targetDisplayName={targetDisplayName}
          viewerRole={viewerRole}
          onClose={() => setActiveAction(null)}
        />
      ) : null}
    </div>
  );
}
