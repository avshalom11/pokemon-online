import Link from "next/link";

import { GameScreen } from "@/components/layout/GameScreen";
import { DeleteAccountConfirmForm } from "@/features/account-deletion/components/DeleteAccountConfirmForm";
import { checkDeletionToken } from "@/features/account-deletion/services/account-deletion.service";

interface DeleteAccountConfirmPageProps {
  searchParams: Promise<{ token?: string }>;
}

const CHECK_MESSAGES: Record<"invalid" | "expired" | "used", string> = {
  invalid: "קישור המחיקה אינו תקין.",
  expired: "קישור המחיקה פג תוקף. יש לבקש מחיקת חשבון מחדש מהפרופיל שלך.",
  used: "קישור המחיקה כבר נוצל.",
};

// Public route, deliberately outside the (game) route group — same
// precedent as app/reset-password/page.tsx: reachable without an active
// session, since the confirming device may not be the one still logged in
// (section 4/6). This page's own GET render only ever READS the token's
// validity (checkDeletionToken) — merely loading, scanning, or prefetching
// this URL can never delete anything; the actual deletion only happens
// through DeleteAccountConfirmForm's explicit POST.
export default async function DeleteAccountConfirmPage({ searchParams }: DeleteAccountConfirmPageProps) {
  const { token } = await searchParams;
  const check = token ? await checkDeletionToken(token) : "invalid";

  return (
    <GameScreen>
      <div
        dir="rtl"
        className="relative flex h-full w-full items-center justify-center overflow-y-auto bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 p-4"
      >
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background: "radial-gradient(ellipse 60% 50% at 50% 20%, rgba(244,63,94,0.12), transparent 60%)",
          }}
        />

        <div className="relative w-full max-w-md rounded-2xl border border-rose-500/30 bg-slate-900/70 p-6 shadow-2xl backdrop-blur-md sm:p-8">
          <h1 className="font-fantasy mb-1 text-center text-2xl font-semibold tracking-wide text-rose-300">
            מחיקת חשבון
          </h1>

          {check !== "valid" || !token ? (
            <div className="mt-6 flex flex-col gap-4">
              <p className="text-center text-sm text-slate-400">
                {CHECK_MESSAGES[check === "valid" ? "invalid" : check]}
              </p>
              <Link
                href="/"
                className="rounded-lg bg-amber-400 px-4 py-2.5 text-center text-sm font-semibold text-slate-950 transition-opacity hover:opacity-90"
              >
                חזרה למסך ההתחברות
              </Link>
            </div>
          ) : (
            <div className="mt-6 flex flex-col gap-4">
              <p className="text-center text-sm leading-relaxed text-slate-300">
                זהו שלב המחיקה הסופי. לחיצה על הכפתור למטה תמחק את החשבון שלך — כל הפוקימונים, ההתקדמות, הפריטים
                והמידע המשויך אליו — לצמיתות ולא ניתן יהיה לשחזר זאת.
              </p>
              <DeleteAccountConfirmForm token={token} />
            </div>
          )}
        </div>
      </div>
    </GameScreen>
  );
}
