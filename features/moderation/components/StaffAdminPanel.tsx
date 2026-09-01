"use client";

import { useState } from "react";

import { appointStaffMemberAction, getStaffRosterViewAction, removeStaffMemberAction } from "@/features/moderation/actions/manage-staff.actions";
import { getModerationErrorLabel } from "@/features/moderation/config/moderation-error-labels";
import type { StaffRosterMemberView, StaffRosterView } from "@/features/moderation/services/staff-roster-view.service";
import type { PlayerSearchResultView } from "@/features/player-search/types";
import { PlayerSearchModal } from "@/features/player-search/components/PlayerSearchModal";

interface StaffAdminPanelProps {
  initialRoster: StaffRosterView;
}

type AppointableRole = "DEPUTY" | "SUPPORT";

const ROLE_LABELS: Record<AppointableRole, string> = { DEPUTY: "סגן", SUPPORT: "תמיכה" };

// STAFF / MODERATION — PHASE 6. The OWNER staff-management panel — shows
// the current canonical roster (StaffMember data, via
// getStaffRosterView), lets OWNER appoint a searched player as DEPUTY/
// SUPPORT or remove an existing one. Every real decision (cap
// enforcement, hierarchy, self/OWNER protection) happens server-side in
// manage-staff.service.ts; this component only ever reflects the result —
// "After success, update the panel immediately" is satisfied by
// re-fetching the roster via getStaffRosterViewAction right after any
// successful change, rather than optimistically guessing the new state
// client-side (role changes must reflect persisted DB state, per this
// phase's own explicit rule).
export function StaffAdminPanel({ initialRoster }: StaffAdminPanelProps) {
  const [roster, setRoster] = useState(initialRoster);
  const [pickerRole, setPickerRole] = useState<AppointableRole | null>(null);
  const [removeTarget, setRemoveTarget] = useState<StaffRosterMemberView | null>(null);
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  async function refreshRoster() {
    const result = await getStaffRosterViewAction();
    if (result.ok) setRoster(result.roster);
  }

  async function handleAppoint(role: AppointableRole, player: PlayerSearchResultView) {
    setPending(true);
    setFeedback(null);
    const result = await appointStaffMemberAction({ targetUsername: player.username, role });
    setPending(false);

    if (!result.ok) {
      setFeedback({ type: "error", message: getModerationErrorLabel(result.error) });
      return;
    }
    setFeedback({ type: "success", message: `${player.displayName} מונה/תה בתפקיד ${ROLE_LABELS[role]}` });
    await refreshRoster();
  }

  async function handleRemove() {
    if (!removeTarget) return;
    setPending(true);
    setFeedback(null);
    const result = await removeStaffMemberAction({ targetUsername: removeTarget.username ?? "" });
    setPending(false);
    setRemoveTarget(null);

    if (!result.ok) {
      setFeedback({ type: "error", message: getModerationErrorLabel(result.error) });
      return;
    }
    setFeedback({ type: "success", message: `${removeTarget.displayName} הוסר/ה מהצוות` });
    await refreshRoster();
  }

  return (
    <div className="flex flex-col gap-4">
      {feedback ? (
        <p
          className={`rounded-lg border px-3 py-2 text-sm ${
            feedback.type === "success" ? "border-emerald-500/30 bg-emerald-950/40 text-emerald-300" : "border-rose-500/30 bg-rose-950/30 text-rose-300"
          }`}
        >
          {feedback.message}
        </p>
      ) : null}

      <section className="rounded-xl border border-white/10 bg-slate-900/60 p-4">
        <h2 className="text-sm font-semibold tracking-wide text-slate-400 uppercase">בעלים</h2>
        {roster.owner ? (
          <RosterRow member={roster.owner} />
        ) : (
          <p className="mt-2 text-sm text-slate-500">לא נמצא בעלים</p>
        )}
      </section>

      <section className="rounded-xl border border-white/10 bg-slate-900/60 p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold tracking-wide text-slate-400 uppercase">סגן (מקסימום 1)</h2>
          {roster.deputySlotsAvailable > 0 ? (
            <button
              type="button"
              disabled={pending}
              onClick={() => setPickerRole("DEPUTY")}
              className="rounded-lg bg-violet-600 px-3 py-1 text-xs font-semibold text-white hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              מנה סגן
            </button>
          ) : null}
        </div>
        {roster.deputy ? (
          <RosterRow member={roster.deputy} onRemove={() => setRemoveTarget(roster.deputy)} disabled={pending} />
        ) : (
          <p className="mt-2 text-sm text-slate-500">אין סגן ממונה כרגע</p>
        )}
      </section>

      <section className="rounded-xl border border-white/10 bg-slate-900/60 p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold tracking-wide text-slate-400 uppercase">תמיכה (מקסימום 3)</h2>
          {roster.supportSlotsAvailable > 0 ? (
            <button
              type="button"
              disabled={pending}
              onClick={() => setPickerRole("SUPPORT")}
              className="rounded-lg bg-violet-600 px-3 py-1 text-xs font-semibold text-white hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              מנה תמיכה ({roster.supportSlotsAvailable} מקומות פנויים)
            </button>
          ) : (
            <span className="text-xs text-slate-500">המכסה מלאה</span>
          )}
        </div>
        {roster.support.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">אין חברי תמיכה כרגע</p>
        ) : (
          <ul className="mt-2 flex flex-col gap-2">
            {roster.support.map((member) => (
              <RosterRow key={member.playerId} member={member} onRemove={() => setRemoveTarget(member)} disabled={pending} />
            ))}
          </ul>
        )}
      </section>

      {pickerRole ? (
        <PlayerSearchModal onClose={() => setPickerRole(null)} onSelectPlayer={(player) => handleAppoint(pickerRole, player)} />
      ) : null}

      {removeTarget ? (
        <div
          dir="rtl"
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={() => setRemoveTarget(null)}
        >
          <div
            onClick={(event) => event.stopPropagation()}
            className="w-full max-w-sm rounded-2xl border border-rose-500/30 bg-slate-900 p-6 text-center shadow-2xl"
          >
            <h2 className="text-lg font-bold text-slate-100">הסרת {removeTarget.displayName} מהצוות</h2>
            <p className="mt-2 text-sm text-slate-300">האם להסיר את {removeTarget.displayName} מתפקיד הצוות?</p>
            <div className="mt-6 flex justify-center gap-3">
              <button
                type="button"
                onClick={() => setRemoveTarget(null)}
                disabled={pending}
                className="rounded-lg border border-white/20 px-4 py-2 text-sm text-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                ביטול
              </button>
              <button
                type="button"
                onClick={handleRemove}
                disabled={pending}
                className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white enabled:hover:bg-rose-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {pending ? "מסיר..." : "הסר מהצוות"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function RosterRow({ member, onRemove, disabled }: { member: StaffRosterMemberView; onRemove?: () => void; disabled?: boolean }) {
  return (
    <div className="mt-2 flex items-center justify-between rounded-lg bg-slate-950/50 px-3 py-2">
      <div className="flex flex-col">
        <span className="text-sm font-semibold text-slate-100">{member.displayName}</span>
        {member.username ? <span dir="auto" className="text-xs text-slate-500">{`@${member.username}`}</span> : null}
      </div>
      {onRemove ? (
        <button
          type="button"
          disabled={disabled}
          onClick={onRemove}
          className="rounded-lg border border-rose-500/40 px-3 py-1 text-xs font-semibold text-rose-300 hover:bg-rose-950/40 disabled:cursor-not-allowed disabled:opacity-50"
        >
          הסר
        </button>
      ) : null}
    </div>
  );
}
