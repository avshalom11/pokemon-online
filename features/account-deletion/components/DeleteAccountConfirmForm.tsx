"use client";

import { useActionState } from "react";

import { AuthMessage } from "@/components/auth/AuthMessage";
import { confirmAccountDeletionAction } from "@/features/account-deletion/actions/confirm-account-deletion.action";
import { initialConfirmAccountDeletionState } from "@/features/account-deletion/actions/confirm-account-deletion.state";

interface DeleteAccountConfirmFormProps {
  token: string;
}

// The FINAL, explicit destructive step (section 6) — a plain POST via
// useActionState's own form action, never a GET/navigation. The token
// travels as a hidden field, same convention as ResetPasswordForm. On
// success the Server Action itself redirects (auth.api.signOut then
// redirect("/")) — there is no client-visible success state to render here,
// only the error branch ever actually shows.
export function DeleteAccountConfirmForm({ token }: DeleteAccountConfirmFormProps) {
  const [state, formAction, pending] = useActionState(
    confirmAccountDeletionAction,
    initialConfirmAccountDeletionState
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="token" value={token} />

      {state.status === "error" && state.message ? <AuthMessage tone="error" message={state.message} /> : null}

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors enabled:hover:bg-rose-500 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? "מוחק..." : "מחק את החשבון לצמיתות"}
      </button>
    </form>
  );
}
