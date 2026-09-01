"use client";

import { createContext, useContext, type ReactNode } from "react";

import type { StaffRole } from "@/features/moderation/types";

// STAFF / MODERATION — PHASE 5. Mounted once by app/(game)/layout.tsx,
// seeded server-side with the CURRENT VIEWER's own resolved StaffRole
// (null for a plain player) — same "cross-cutting client state seeded
// once at the layout level" shape this codebase already establishes
// repeatedly (SoundSettingsProvider, PlayerProgressionProvider,
// DailyBattleCountProvider, ActiveBattleProvider, FriendsDataProvider,
// TutorialProvider, ...), rather than threading a new prop through every
// page-specific data-fetch (Home's own page component, in particular,
// builds HomeChatPanel's props independently of this layout) down to
// wherever Global Chat happens to render.
//
// features/chat/components/GlobalChatWindow.tsx is the one consumer —
// reads this to decide, together with each message's own
// senderStaffRole (features/chat/types.ts), whether to render a ⋮
// moderation control on that row at all (features/moderation/
// permissions/chat-moderation-menu.ts's getAvailableChatModerationActions)
// — this context is never itself an authorization decision; every Server
// Action the menu can reach re-derives its own authorization from the
// database independently, exactly like every other client-side "what to
// show" hint in this feature.
const ViewerStaffRoleContext = createContext<StaffRole | null>(null);

export function ViewerStaffRoleProvider({ role, children }: { role: StaffRole | null; children: ReactNode }) {
  return <ViewerStaffRoleContext.Provider value={role}>{children}</ViewerStaffRoleContext.Provider>;
}

export function useViewerStaffRole(): StaffRole | null {
  return useContext(ViewerStaffRoleContext);
}
