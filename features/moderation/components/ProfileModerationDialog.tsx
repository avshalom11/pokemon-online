"use client";

import { useEffect, useState } from "react";

import { revokeBanAction } from "@/features/moderation/actions/global-chat-moderation.actions";
import {
  issueProfilePermanentSiteBanAction,
  issueProfileTemporarySiteBanAction,
  previewProfileSiteBanDurationAction,
} from "@/features/moderation/actions/profile-moderation.actions";
import { formatDurationMinutes } from "@/features/moderation/config/format-duration";
import { getModerationErrorLabel } from "@/features/moderation/config/moderation-error-labels";
import { OWNER_SITE_BAN_DURATION_OPTIONS_MINUTES } from "@/features/moderation/config/site-ban-progression.config";
import type { ProfileModerationActionKind } from "@/features/moderation/permissions/profile-moderation-menu";
import type { StaffRole } from "@/features/moderation/types";

interface ProfileModerationDialogProps {
  kind: ProfileModerationActionKind;
  targetUsername: string;
  targetDisplayName: string;
  viewerRole: StaffRole;
  onClose: () => void;
}

const ACTION_TITLES: Record<ProfileModerationActionKind, string> = {
  temporary_site_ban: "הרחקה מהאתר",
  permanent_site_ban: "חסימה לצמיתות",
};

type Result = { type: "success" } | { type: "error"; message: string; existingActionId?: string };

// STAFF / MODERATION — PROFILE SITE-BAN ENTRY POINT. The public-profile
// counterpart to ChatModerationDialog.tsx, reusing that same confirmation
// UX shape wholesale (target name, a required reason field, the same
// duration-picker/progressive-preview split, the same "clearly stronger"
// permanent-ban acknowledgement, the same confirm/cancel/success/error
// states) — just scoped to the two kinds a profile page can ever trigger
// (no delete_message/chat_ban) and targeted by targetUsername instead of
// messageId (see profile-moderation.actions.ts's own doc comment for why:
// this action never originates from a chat message, so there is no
// messageId to resolve a target from). A separate component rather than
// teaching ChatModerationDialog a second target-resolution mode, so the
// existing Global Chat moderation flow this task must leave unchanged
// (spec) is never at risk of a regression from this new entry point.
export function ProfileModerationDialog({ kind, targetUsername, targetDisplayName, viewerRole, onClose }: ProfileModerationDialogProps) {
  const [reason, setReason] = useState("");
  const [selectedDuration, setSelectedDuration] = useState<number | null>(null);
  const [previewDuration, setPreviewDuration] = useState<number | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [permanentAcknowledged, setPermanentAcknowledged] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  const isOwnerDurationPicker = kind === "temporary_site_ban" && viewerRole === "OWNER";

  // Fetch the authoritative progressive-duration preview for a DEPUTY
  // viewer — never computed client-side (same rule ChatModerationDialog's
  // own doc comment establishes).
  useEffect(() => {
    if (kind !== "temporary_site_ban" || viewerRole === "OWNER") return;
    let cancelled = false;
    (async () => {
      const previewResult = await previewProfileSiteBanDurationAction({ targetUsername });
      if (cancelled) return;
      if (previewResult.ok) {
        setPreviewDuration(previewResult.durationMinutes);
      } else {
        setPreviewError(getModerationErrorLabel(previewResult.error));
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, targetUsername, viewerRole]);

  const canSubmit =
    reason.trim().length > 0 &&
    !submitting &&
    (!isOwnerDurationPicker || selectedDuration !== null) &&
    (kind !== "permanent_site_ban" || permanentAcknowledged) &&
    (kind === "permanent_site_ban" || viewerRole === "OWNER" ? true : previewDuration !== null);

  async function handleConfirm() {
    setSubmitting(true);
    setResult(null);

    const durationMinutes = isOwnerDurationPicker ? (selectedDuration ?? undefined) : undefined;

    const actionResult =
      kind === "temporary_site_ban"
        ? await issueProfileTemporarySiteBanAction({ targetUsername, reason, durationMinutes })
        : await issueProfilePermanentSiteBanAction({ targetUsername, reason });

    setSubmitting(false);

    if (actionResult.ok) {
      setResult({ type: "success" });
      return;
    }

    setResult({
      type: "error",
      message: getModerationErrorLabel(actionResult.error),
      existingActionId: actionResult.error === "already-banned" ? actionResult.existingActionId : undefined,
    });
  }

  async function handleRevokeExistingAndRetry(existingActionId: string) {
    setSubmitting(true);
    const revokeResult = await revokeBanAction({ actionId: existingActionId, reason: "בוטל אוטומטית כדי לאפשר הרחקה חדשה" });
    setSubmitting(false);
    setResult(
      revokeResult.ok
        ? null // clears the error — the staff member can press confirm again
        : { type: "error", message: getModerationErrorLabel(revokeResult.error) }
    );
  }

  return (
    <div
      dir="rtl"
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        className={`w-full max-w-sm rounded-2xl border ${kind === "permanent_site_ban" ? "border-rose-500/40" : "border-indigo-400/25"} bg-slate-900 p-6 shadow-2xl`}
      >
        <h2 className="text-lg font-bold text-slate-100">{ACTION_TITLES[kind]}</h2>
        <p className="mt-1 text-sm text-slate-300">
          כלפי <span className="font-semibold text-slate-100">{targetDisplayName}</span>
        </p>

        {result?.type === "success" ? (
          <>
            <p className="mt-4 rounded-lg border border-emerald-500/30 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-300">הפעולה בוצעה בהצלחה</p>
            <div className="mt-4 flex justify-end">
              <button type="button" onClick={onClose} className="rounded-lg border border-white/20 px-4 py-2 text-sm text-slate-200">
                סגור
              </button>
            </div>
          </>
        ) : (
          <>
            {kind === "temporary_site_ban" ? (
              isOwnerDurationPicker ? (
                <fieldset className="mt-4">
                  <legend className="mb-1.5 text-xs font-semibold text-slate-400">משך זמן</legend>
                  <div className="flex flex-wrap gap-2">
                    {OWNER_SITE_BAN_DURATION_OPTIONS_MINUTES.map((minutes) => (
                      <button
                        key={minutes}
                        type="button"
                        onClick={() => setSelectedDuration(minutes)}
                        className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                          selectedDuration === minutes
                            ? "border-violet-400 bg-violet-600 text-white"
                            : "border-white/15 bg-slate-800/60 text-slate-200 hover:bg-slate-800"
                        }`}
                      >
                        {formatDurationMinutes(minutes)}
                      </button>
                    ))}
                  </div>
                </fieldset>
              ) : (
                <p className="mt-4 text-sm text-slate-200">
                  {previewError ? (
                    <span className="text-rose-400">{previewError}</span>
                  ) : previewDuration === null ? (
                    "טוען משך זמן..."
                  ) : (
                    <>
                      {ACTION_TITLES[kind]} — <span className="font-semibold">{formatDurationMinutes(previewDuration)}</span>
                    </>
                  )}
                </p>
              )
            ) : null}

            {kind === "permanent_site_ban" ? (
              <div className="mt-4 rounded-lg border border-rose-500/40 bg-rose-950/30 p-3">
                <p className="text-sm font-semibold text-rose-300">פעולה זו חוסמת את הגישה לחשבון לצמיתות.</p>
                <label className="mt-2 flex items-start gap-2 text-xs text-rose-200">
                  <input
                    type="checkbox"
                    checked={permanentAcknowledged}
                    onChange={(event) => setPermanentAcknowledged(event.target.checked)}
                    className="mt-0.5"
                  />
                  אני מבין/ה שמדובר בחסימה לצמיתות וברצוני להמשיך
                </label>
              </div>
            ) : null}

            <label className="mt-4 block text-xs font-semibold text-slate-400">
              נימוק (חובה)
              <textarea
                dir="rtl"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                rows={2}
                maxLength={500}
                className="mt-1 w-full resize-none rounded-lg border border-white/15 bg-slate-950/70 px-3 py-1.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-violet-400/60 focus:outline-none"
                placeholder="נמקו את הפעולה..."
              />
            </label>

            {result?.type === "error" ? (
              <div className="mt-3 rounded-lg border border-rose-500/30 bg-rose-950/30 px-3 py-2 text-sm text-rose-300">
                <p>{result.message}</p>
                {result.existingActionId ? (
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => handleRevokeExistingAndRetry(result.existingActionId!)}
                    className="mt-2 rounded-lg border border-rose-400/40 px-3 py-1 text-xs font-semibold text-rose-200 hover:bg-rose-900/40 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    בטל את ההרחקה הקיימת ונסה שוב
                  </button>
                ) : null}
              </div>
            ) : null}

            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="rounded-lg border border-white/20 px-4 py-2 text-sm text-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                ביטול
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={!canSubmit}
                className={`rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                  kind === "permanent_site_ban" ? "bg-rose-600 enabled:hover:bg-rose-500" : "bg-violet-600 enabled:hover:bg-violet-500"
                }`}
              >
                {submitting ? "מבצע..." : "אישור"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
