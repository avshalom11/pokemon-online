"use client";

import { useState, useTransition } from "react";

import { changeUsernameAction } from "@/features/profile/actions/change-username.action";
import { getChangeUsernameErrorMessage, USERNAME_CHANGE_COST_GOLD } from "@/features/profile/config/security-account.config";
import { USERNAME_MAX_LENGTH, USERNAME_MIN_LENGTH, USERNAME_PATTERN } from "@/lib/auth/validation";

interface ChangeUsernameDialogProps {
  currentUsername: string;
  onClose: () => void;
  onSuccess: (newUsername: string) => void;
}

// Two-step dialog (enter -> confirm) so the 100-Gold cost is always shown
// BEFORE the charge actually happens, per this feature's own spec — the
// server action (change-username.action.ts) is the real enforcement of
// everything checked client-side here (length/pattern, "not already your
// username"); this is purely a fast, friendly first pass so a doomed
// request never has to round-trip just to report a typo.
export function ChangeUsernameDialog({ currentUsername, onClose, onSuccess }: ChangeUsernameDialogProps) {
  const [step, setStep] = useState<"input" | "confirm">("input");
  const [newUsername, setNewUsername] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleContinue() {
    setErrorMessage(null);
    const trimmed = newUsername.trim();

    if (trimmed.length < USERNAME_MIN_LENGTH || trimmed.length > USERNAME_MAX_LENGTH || !USERNAME_PATTERN.test(trimmed)) {
      setErrorMessage(
        `שם המשתמש חייב להכיל ${USERNAME_MIN_LENGTH}-${USERNAME_MAX_LENGTH} תווים: אותיות באנגלית, ספרות וקו תחתון בלבד.`
      );
      return;
    }

    if (trimmed.toLowerCase() === currentUsername.toLowerCase()) {
      setErrorMessage("זהו כבר שם המשתמש הנוכחי שלך.");
      return;
    }

    setStep("confirm");
  }

  function handleConfirm() {
    setErrorMessage(null);
    startTransition(async () => {
      const result = await changeUsernameAction({ newUsername: newUsername.trim() });

      if (result.status === "success") {
        onSuccess(result.username);
        return;
      }

      setErrorMessage(getChangeUsernameErrorMessage(result.status));
      setStep("input");
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
        <h2 className="text-center text-lg font-bold text-slate-100">שינוי שם משתמש</h2>

        {step === "input" ? (
          <div className="mt-4 flex flex-col gap-3">
            <input
              type="text"
              dir="ltr"
              placeholder="שם משתמש חדש"
              value={newUsername}
              onChange={(event) => setNewUsername(event.target.value)}
              className="w-full rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 focus:border-indigo-400/50 focus:outline-none"
            />
            <p className="text-center text-xs text-slate-400">עלות שינוי שם משתמש: 100 זהב</p>
          </div>
        ) : (
          <div className="mt-4 flex flex-col gap-2 text-center">
            <p className="text-sm text-slate-200">
              שם המשתמש החדש:{" "}
              <span dir="ltr" className="font-semibold text-indigo-300">
                {newUsername.trim()}
              </span>
            </p>
            <p className="text-sm font-semibold text-amber-400">עלות שינוי שם משתמש: {USERNAME_CHANGE_COST_GOLD} זהב</p>
            <p className="text-xs text-slate-500">הפעולה תחייב אותך מיידית ואינה ניתנת לביטול.</p>
          </div>
        )}

        {errorMessage ? <p className="mt-3 text-center text-xs font-semibold text-rose-400">{errorMessage}</p> : null}

        <div className="mt-5 flex justify-center gap-3">
          <button
            type="button"
            onClick={step === "confirm" ? () => setStep("input") : onClose}
            disabled={isPending}
            className="rounded-lg border border-white/20 px-4 py-2 text-sm text-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {step === "confirm" ? "חזרה" : "ביטול"}
          </button>
          <button
            type="button"
            onClick={step === "input" ? handleContinue : handleConfirm}
            disabled={isPending || newUsername.trim().length === 0}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors enabled:hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending ? "מעדכן..." : step === "input" ? "המשך" : `אשר ושלם ${USERNAME_CHANGE_COST_GOLD} זהב`}
          </button>
        </div>
      </div>
    </div>
  );
}
