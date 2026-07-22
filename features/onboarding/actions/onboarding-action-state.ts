// Split out from select-starter.action.ts: a "use server" file may only
// export async functions (Next.js build-enforced), so this plain object/type
// — used by both the Server Action and the client form as the initial
// useActionState value — has to live in its own file (mirrors
// lib/auth/auth-action-state.ts's split for the same reason).
export interface SelectStarterActionState {
  status: "idle" | "error";
  message?: string;
}

export const initialSelectStarterActionState: SelectStarterActionState = { status: "idle" };
