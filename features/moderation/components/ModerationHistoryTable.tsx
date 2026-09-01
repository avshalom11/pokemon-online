"use client";

import { useState } from "react";

import { revokeBanAction } from "@/features/moderation/actions/global-chat-moderation.actions";
import { getModerationHistoryAction } from "@/features/moderation/actions/moderation-history.actions";
import { getModerationErrorLabel } from "@/features/moderation/config/moderation-error-labels";
import type { ModerationHistoryEntryView, ModerationHistoryStatus } from "@/features/moderation/services/moderation-history-view.service";
import type { ModerationActionType, StaffRole } from "@/features/moderation/types";

interface ModerationHistoryTableProps {
  initialHistory: ModerationHistoryEntryView[];
}

const ACTION_TYPE_LABELS: Record<ModerationActionType, string> = {
  chat_ban: "הרחקה מהצ׳אט",
  site_ban: "הרחקה מהאתר",
  permanent_site_ban: "חסימה לצמיתות",
  message_delete: "מחיקת הודעה",
  role_grant: "מינוי לתפקיד",
  role_revoke: "הסרה מתפקיד",
};

const ROLE_LABELS: Record<StaffRole, string> = { OWNER: "בעלים", DEPUTY: "סגן", SUPPORT: "תמיכה" };

const STATUS_BADGES: Record<ModerationHistoryStatus, { label: string; className: string }> = {
  active: { label: "פעיל", className: "border-emerald-500/40 bg-emerald-950/40 text-emerald-300" },
  expired: { label: "פג תוקף", className: "border-white/15 bg-slate-800/60 text-slate-400" },
  revoked: { label: "בוטל", className: "border-white/15 bg-slate-800/60 text-slate-400 line-through" },
  "permanent-active": { label: "חסימה קבועה פעילה", className: "border-rose-500/40 bg-rose-950/40 text-rose-300" },
};

// STAFF / MODERATION — PHASE 6 — the OWNER-only moderation-history table.
// REVOCATION REUSE — the "revoke" control here calls the EXACT SAME
// revokeBanAction Phase 5's Global Chat ⋮ menu already uses
// (features/moderation/actions/global-chat-moderation.actions.ts) — never
// a second revocation implementation (explicit spec: "Do not duplicate
// revocation logic"). Only rendered for rows whose own status is
// "active" or "permanent-active" (an already-expired/revoked/non-ban row
// has nothing left to revoke, mirroring revokeBanAction's own
// already-expired/already-revoked/not-a-ban server-side rejections).
export function ModerationHistoryTable({ initialHistory }: ModerationHistoryTableProps) {
  const [history, setHistory] = useState(initialHistory);
  const [revokeTarget, setRevokeTarget] = useState<ModerationHistoryEntryView | null>(null);
  const [revokeReason, setRevokeReason] = useState("");
  const [pending, setPending] = useState(false);
  const [revokeError, setRevokeError] = useState<string | null>(null);

  async function refreshHistory() {
    const result = await getModerationHistoryAction();
    if (result.ok) setHistory(result.history);
  }

  async function handleRevoke() {
    if (!revokeTarget) return;
    setPending(true);
    setRevokeError(null);
    const result = await revokeBanAction({ actionId: revokeTarget.id, reason: revokeReason });
    setPending(false);

    if (!result.ok) {
      setRevokeError(getModerationErrorLabel(result.error));
      return;
    }
    setRevokeTarget(null);
    setRevokeReason("");
    await refreshHistory();
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-x-auto rounded-xl border border-white/10 bg-slate-900/60">
        <table className="w-full min-w-[52rem] text-right text-sm">
          <thead className="bg-slate-950/60 text-xs text-slate-400">
            <tr>
              <th className="px-3 py-2 font-medium">תאריך</th>
              <th className="px-3 py-2 font-medium">פעולה</th>
              <th className="px-3 py-2 font-medium">מבצע</th>
              <th className="px-3 py-2 font-medium">מטרה</th>
              <th className="px-3 py-2 font-medium">נימוק</th>
              <th className="px-3 py-2 font-medium">משך / תפוגה</th>
              <th className="px-3 py-2 font-medium">סטטוס</th>
              <th className="px-3 py-2 font-medium">ביטול</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {history.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-3 py-6 text-center text-slate-500">
                  אין רשומות היסטוריה
                </td>
              </tr>
            ) : (
              history.map((entry) => (
                <tr key={entry.id} className="text-slate-200">
                  <td className="px-3 py-2 whitespace-nowrap text-xs text-slate-400">{entry.createdAtLabel}</td>
                  <td className="px-3 py-2">
                    {ACTION_TYPE_LABELS[entry.actionType]}
                    {entry.grantedRole ? <span className="text-xs text-slate-400"> — {ROLE_LABELS[entry.grantedRole]}</span> : null}
                  </td>
                  <td className="px-3 py-2">{entry.actorDisplayName}</td>
                  <td className="px-3 py-2">{entry.targetDisplayName}</td>
                  <td className="max-w-[14rem] px-3 py-2 text-xs text-slate-400">{entry.reason ?? "—"}</td>
                  <td className="px-3 py-2 text-xs text-slate-400">
                    {entry.durationMinutes ? `${entry.expiresAtLabel ?? ""}` : entry.actionType === "permanent_site_ban" ? "ללא תפוגה" : "—"}
                    {entry.revokedAtLabel ? (
                      <div className="mt-0.5 text-rose-400">
                        בוטל ב-{entry.revokedAtLabel}
                        {entry.revokedByDisplayName ? ` ע״י ${entry.revokedByDisplayName}` : ""}
                      </div>
                    ) : null}
                  </td>
                  <td className="px-3 py-2">
                    {entry.status ? (
                      <span className={`rounded-full border px-2 py-0.5 text-xs ${STATUS_BADGES[entry.status].className}`}>
                        {STATUS_BADGES[entry.status].label}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-500">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {entry.status === "active" || entry.status === "permanent-active" ? (
                      <button
                        type="button"
                        onClick={() => {
                          setRevokeTarget(entry);
                          setRevokeReason("");
                          setRevokeError(null);
                        }}
                        className="rounded-lg border border-white/20 px-3 py-1 text-xs text-slate-200 hover:bg-white/10"
                      >
                        בטל
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {revokeTarget ? (
        <div
          dir="rtl"
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={() => setRevokeTarget(null)}
        >
          <div
            onClick={(event) => event.stopPropagation()}
            className="w-full max-w-sm rounded-2xl border border-indigo-400/25 bg-slate-900 p-6 shadow-2xl"
          >
            <h2 className="text-lg font-bold text-slate-100">ביטול {ACTION_TYPE_LABELS[revokeTarget.actionType]}</h2>
            <p className="mt-1 text-sm text-slate-300">
              כלפי <span className="font-semibold text-slate-100">{revokeTarget.targetDisplayName}</span>
            </p>

            <label className="mt-4 block text-xs font-semibold text-slate-400">
              נימוק לביטול (חובה)
              <textarea
                dir="rtl"
                value={revokeReason}
                onChange={(event) => setRevokeReason(event.target.value)}
                rows={2}
                maxLength={500}
                className="mt-1 w-full resize-none rounded-lg border border-white/15 bg-slate-950/70 px-3 py-1.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-violet-400/60 focus:outline-none"
                placeholder="נמקו את הביטול..."
              />
            </label>

            {revokeError ? <p className="mt-2 text-sm text-rose-400">{revokeError}</p> : null}

            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setRevokeTarget(null)}
                disabled={pending}
                className="rounded-lg border border-white/20 px-4 py-2 text-sm text-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                ביטול
              </button>
              <button
                type="button"
                onClick={handleRevoke}
                disabled={pending || revokeReason.trim().length === 0}
                className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white enabled:hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {pending ? "מבצע..." : "אשר ביטול"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
