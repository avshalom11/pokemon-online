// Split out from lib/auth/actions.ts: a "use server" file may only export
// async functions (Next.js build-enforced), so this plain object/type — used
// by both the Server Actions and the client forms as the initial useActionState
// value — has to live in its own file.
export interface AuthActionState {
  status: "idle" | "error";
  message?: string;
  fieldErrors?: Record<string, string[]>;
  // FAILED LOGIN LOCKOUT — set only on the exact response that reports the
  // account is currently locked (lib/auth/login-lockout.ts). LoginForm uses
  // this purely to decide whether to draw extra attention to the existing
  // "שכחתי סיסמה" link, never to change what message is shown (`message`
  // above already carries the full Hebrew lockout text).
  locked?: boolean;
  // LOCKOUT COUNTDOWN — the account's real User.lockedUntil (ISO string —
  // Server Action return values must be plain serializable data, never a
  // Date), set on the exact same responses `locked` is. This is the ONLY
  // lockout-timing information ever sent to the client: LoginForm derives
  // its live MM:SS countdown purely from this authoritative timestamp
  // (and persists just this string across a refresh — see LoginForm's own
  // doc comment) rather than ever starting its own independent 15-minute
  // timer. No other account/security detail is exposed alongside it.
  lockedUntil?: string;
}

export const initialAuthActionState: AuthActionState = { status: "idle" };

// Shared by the forgot-password and reset-password forms — unlike
// AuthActionState above (login/register always redirect on success, so
// they never need a "success" status), both of these show their success
// state inline instead of navigating away.
export interface PasswordResetActionState {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: Record<string, string[]>;
}

export const initialPasswordResetActionState: PasswordResetActionState = { status: "idle" };
