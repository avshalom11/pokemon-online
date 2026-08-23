"use client";

import { useState, useTransition } from "react";

import { requestAccountDeletionAction } from "@/features/account-deletion/actions/request-account-deletion.action";

interface DeleteAccountDialogProps {
  onClose: () => void;
}

// Opened from SecurityAccountSection's "מחק משתמש" row (together with
// שינוי שם משתמש/שינוי סיסמה — deliberately NOT a separate "danger zone"
// section, per this feature's own UI spec). Clicking "מחק משתמש" only ever
// opens this dialog; no server call happens until the user explicitly
// presses "אישור ושליחת מייל" here, and even that call only issues a token
// + sends an email (features/account-deletion/actions/
// request-account-deletion.action.ts) — it never deletes anything itself.
// The account is only ever actually deleted later, through the emailed
// link's own confirmation page (app/delete-account/confirm).
export function DeleteAccountDialog({ onClose }: DeleteAccountDialogProps) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleConfirm() {
    setErrorMessage(null);
    startTransition(async () => {
      const result = await requestAccountDeletionAction();
      if (result.status === "success") {
        setSuccessMessage(result.message);
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
        className="w-full max-w-sm rounded-2xl border border-rose-500/30 bg-slate-900 p-6 shadow-2xl"
      >
        <h2 className="text-center text-lg font-bold text-rose-300">מחיקת חשבון</h2>

        {successMessage ? (
          <>
            <p className="mt-4 text-center text-sm leading-relaxed text-emerald-300">{successMessage}</p>
            <div className="mt-5 flex justify-center">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-white/20 px-4 py-2 text-sm text-slate-200"
              >
                סגור
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="mt-4 text-center text-sm leading-relaxed text-slate-300">
              מחיקת החשבון היא פעולה בלתי הפיכה. כל נתוני המשתמש, הפוקימונים, ההתקדמות, הפריטים והמידע המשויך לחשבון
              יימחקו לצמיתות. האם אתה בטוח שברצונך להמשיך?
            </p>

            {errorMessage ? <p className="mt-3 text-center text-xs font-semibold text-rose-400">{errorMessage}</p> : null}

            <div className="mt-5 flex justify-center gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isPending}
                className="rounded-lg border border-white/20 px-4 py-2 text-sm text-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                ביטול
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={isPending}
                className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition-colors enabled:hover:bg-rose-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isPending ? "שולח..." : "אישור ושליחת מייל"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
