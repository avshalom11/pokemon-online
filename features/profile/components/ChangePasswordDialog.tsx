"use client";

import { useState, useTransition } from "react";

import { changePasswordAction } from "@/features/profile/actions/change-password.action";

interface ChangePasswordDialogProps {
  onClose: () => void;
}

// A separate, small dialog stacked on top of EditProfileModal — password
// changes are deliberately never bundled into the profile-save action
// (they go through changePasswordAction, a thin wrapper around Better
// Auth's own official changePassword flow; see that action's own doc
// comment). Never touches PlayerProfile, never affects the profile view,
// so a successful change here needs no page refresh — just its own inline
// confirmation.
export function ChangePasswordDialog({ onClose }: ChangePasswordDialogProps) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit() {
    setErrorMessage(null);
    setSuccessMessage(null);
    startTransition(async () => {
      const result = await changePasswordAction({ currentPassword, newPassword, confirmNewPassword });

      if (result.status === "success") {
        setSuccessMessage("הסיסמה שונתה בהצלחה.");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmNewPassword("");
        return;
      }

      setErrorMessage(result.message);
    });
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
        className="w-full max-w-sm rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl"
      >
        <h2 className="text-center text-lg font-bold text-slate-100">שינוי סיסמה</h2>

        <div className="mt-4 flex flex-col gap-3">
          <input
            type="password"
            placeholder="סיסמה נוכחית"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            className="w-full rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 focus:border-indigo-400/50 focus:outline-none"
          />
          <input
            type="password"
            placeholder="סיסמה חדשה"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            className="w-full rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 focus:border-indigo-400/50 focus:outline-none"
          />
          <input
            type="password"
            placeholder="אימות סיסמה חדשה"
            value={confirmNewPassword}
            onChange={(event) => setConfirmNewPassword(event.target.value)}
            className="w-full rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 focus:border-indigo-400/50 focus:outline-none"
          />
        </div>

        {errorMessage ? <p className="mt-3 text-center text-xs font-semibold text-rose-400">{errorMessage}</p> : null}
        {successMessage ? <p className="mt-3 text-center text-xs font-semibold text-emerald-400">{successMessage}</p> : null}

        <div className="mt-5 flex justify-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-white/20 px-4 py-2 text-sm text-slate-200"
          >
            סגור
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isPending}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors enabled:hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending ? "משנה..." : "שנה סיסמה"}
          </button>
        </div>
      </div>
    </div>
  );
}
