// Split out from confirm-account-deletion.action.ts: a "use server" file
// may only export async functions (Next.js build-enforced) — this plain
// object/type, used by both the Server Action and the client form as the
// initial useActionState value, has to live in its own file. Same fix as
// lib/auth/auth-action-state.ts's own split from lib/auth/actions.ts;
// bundling this const into the "use server" file is exactly what produced
// a real "A 'use server' file can only export async functions, found
// object" crash the first time this feature shipped.
export interface ConfirmAccountDeletionActionState {
  status: "idle" | "error";
  message?: string;
}

export const initialConfirmAccountDeletionState: ConfirmAccountDeletionActionState = { status: "idle" };
