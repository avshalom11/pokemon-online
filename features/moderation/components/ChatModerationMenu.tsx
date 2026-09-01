"use client";

import { useState } from "react";

import { ChatModerationDialog } from "@/features/moderation/components/ChatModerationDialog";
import { useViewerStaffRole } from "@/features/moderation/context/viewer-staff-role-context";
import { getAvailableChatModerationActions, type ChatModerationActionKind } from "@/features/moderation/permissions/chat-moderation-menu";
import type { StaffRole } from "@/features/moderation/types";

interface ChatModerationMenuProps {
  messageId: string;
  targetDisplayName: string;
  // The message SENDER's own resolved role (null for a plain player) —
  // features/chat/types.ts's GlobalChatMessageView.senderStaffRole.
  senderStaffRole: StaffRole | null;
  onMessageDeleted: (messageId: string) => void;
}

const ACTION_LABELS: Record<ChatModerationActionKind, string> = {
  delete_message: "מחק הודעה",
  chat_ban: "הרחק מהצ׳אט",
  temporary_site_ban: "הרחק מהאתר",
  permanent_site_ban: "חסום לצמיתות",
};

// STAFF / MODERATION — PHASE 5 — the ⋮ moderation control rendered next
// to a Global Chat message, shown ONLY when the CURRENT VIEWER is staff
// AND is allowed to moderate this specific message's sender — both
// conditions collapse into a single call to
// getAvailableChatModerationActions (features/moderation/permissions/
// chat-moderation-menu.ts), which already returns an empty list (and
// therefore renders nothing at all here) for a plain viewer, or for ANY
// viewer against an OWNER's own message. This is purely a client-side
// SHOW/HIDE decision — every action it can open still re-derives its own
// authorization from the database independently (see
// authorize-moderation-action.ts), so a tampered client can never use
// this component's own logic as the real gate.
export function ChatModerationMenu({ messageId, targetDisplayName, senderStaffRole, onMessageDeleted }: ChatModerationMenuProps) {
  const viewerRole = useViewerStaffRole();
  const [isOpen, setIsOpen] = useState(false);
  const [activeAction, setActiveAction] = useState<ChatModerationActionKind | null>(null);

  if (viewerRole === null) return null;
  const availableActions = getAvailableChatModerationActions(viewerRole, senderStaffRole);
  if (availableActions.length === 0) return null;

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        aria-label="אפשרויות ניהול"
        aria-expanded={isOpen}
        className="flex h-5 w-5 items-center justify-center rounded text-slate-400 transition-colors hover:bg-white/10 hover:text-slate-100"
      >
        <span aria-hidden="true">⋮</span>
      </button>

      {isOpen ? (
        <>
          {/* Click-outside-to-close backdrop — same "invisible full-screen
              catcher" idiom this codebase's other click-away menus use,
              placed below the menu itself via z-index. */}
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div
            dir="rtl"
            className="absolute left-0 z-50 mt-1 min-w-[9rem] rounded-lg border border-white/10 bg-slate-900 py-1 text-sm shadow-xl"
          >
            {availableActions.map((action) => (
              <button
                key={action}
                type="button"
                onClick={() => {
                  setActiveAction(action);
                  setIsOpen(false);
                }}
                className={`block w-full px-3 py-1.5 text-right transition-colors hover:bg-white/10 ${
                  action === "permanent_site_ban" ? "text-rose-400" : "text-slate-200"
                }`}
              >
                {ACTION_LABELS[action]}
              </button>
            ))}
          </div>
        </>
      ) : null}

      {activeAction && viewerRole ? (
        <ChatModerationDialog
          kind={activeAction}
          messageId={messageId}
          targetDisplayName={targetDisplayName}
          viewerRole={viewerRole}
          onClose={() => setActiveAction(null)}
          onMessageDeleted={onMessageDeleted}
        />
      ) : null}
    </div>
  );
}
