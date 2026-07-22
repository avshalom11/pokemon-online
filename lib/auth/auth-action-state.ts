// Split out from lib/auth/actions.ts: a "use server" file may only export
// async functions (Next.js build-enforced), so this plain object/type — used
// by both the Server Actions and the client forms as the initial useActionState
// value — has to live in its own file.
export interface AuthActionState {
  status: "idle" | "error";
  message?: string;
  fieldErrors?: Record<string, string[]>;
}

export const initialAuthActionState: AuthActionState = { status: "idle" };
