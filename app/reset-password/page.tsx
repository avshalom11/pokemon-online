import Link from "next/link";

import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";
import { GameScreen } from "@/components/layout/GameScreen";

interface ResetPasswordPageProps {
  // Reached two ways: directly with ?token=... (a caller building the link
  // itself), or via Better Auth's own GET /api/auth/reset-password/:token
  // redirect (lib/auth/actions.ts's requestPasswordResetAction passes this
  // page as `redirectTo`) — that redirect either appends ?token=VALID_TOKEN
  // after confirming the token isn't already expired, or ?error=INVALID_TOKEN
  // if it was. Either way this page only ever reads the query string, never
  // the token's own value server-side (only resetPasswordAction, invoked
  // from the client form, ever sends it back to Better Auth).
  searchParams: Promise<{ token?: string; error?: string }>;
}

// Public route, deliberately outside the (game) route group — reachable
// while signed out (the whole point of "forgot password"), so it gets no
// session guard and no game layout, same precedent as app/page.tsx itself.
export default async function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  const { token, error } = await searchParams;

  return (
    <GameScreen>
      <div
        dir="rtl"
        className="relative flex h-full w-full items-center justify-center overflow-y-auto bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 p-4"
      >
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background: "radial-gradient(ellipse 60% 50% at 50% 20%, rgba(251,191,36,0.12), transparent 60%)",
          }}
        />

        <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-slate-900/70 p-6 shadow-2xl backdrop-blur-md sm:p-8">
          <h1 className="font-fantasy mb-1 text-center text-2xl font-semibold tracking-wide text-slate-50">
            איפוס סיסמה
          </h1>

          {error === "INVALID_TOKEN" || !token ? (
            <div className="mt-6 flex flex-col gap-4">
              <p className="text-center text-sm text-slate-400">
                קישור האיפוס אינו תקין או שפג תוקפו. יש לבקש קישור חדש.
              </p>
              <Link
                href="/"
                className="rounded-lg bg-amber-400 px-4 py-2.5 text-center text-sm font-semibold text-slate-950 transition-opacity hover:opacity-90"
              >
                חזרה למסך ההתחברות
              </Link>
            </div>
          ) : (
            <div className="mt-6">
              <ResetPasswordForm token={token} />
            </div>
          )}
        </div>
      </div>
    </GameScreen>
  );
}
