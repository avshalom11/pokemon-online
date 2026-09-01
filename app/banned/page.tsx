import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { GameScreen } from "@/components/layout/GameScreen";
import { getBannedExperienceView } from "@/features/moderation/services/banned-experience.service";
import { auth } from "@/lib/auth/auth";
import { logoutAction } from "@/lib/auth/actions";
import { prisma } from "@/lib/db/prisma";
import { formatChatMessageTimestamp } from "@/lib/chat/format-message-timestamp";

// STAFF / MODERATION — PHASE 4 — BANNED USER EXPERIENCE. The redirect
// target of lib/auth/auth-session.ts's own getCurrentSession site-ban
// check. Deliberately outside the (game) route group (proxy.ts's own
// matcher config doesn't even list "/banned", so this route never goes
// through that optimistic cookie check either) and deliberately never
// calls getCurrentSession() itself — it resolves its own session via a
// raw auth.api.getSession() call instead, which is what makes it
// IMPOSSIBLE for this page to redirect back to itself: getCurrentSession
// is the only function that ever redirects to "/banned", and this page
// never calls it. See lib/auth/stale-session-redirect-loop.test.ts's own
// doc comment for the identical technique this project already
// established for a different redirect-loop risk.
//
// Deliberately minimal: no moderation UI, no staff identity, no internal
// ids, no audit reason — getBannedExperienceView's own doc comment
// explains why that's the ENTIRE shape this page is even able to render.
export default async function BannedPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/");

  const profile = await prisma.playerProfile.findUnique({ where: { userId: session.user.id }, select: { id: true } });
  if (!profile) redirect("/");

  const banInfo = await getBannedExperienceView(profile.id);
  // Not actually (or no longer) banned — e.g. the ban was lifted, or this
  // URL was reached directly without ever being banned. Nothing to show;
  // send them back into the normal game-session flow, which will now
  // resolve fully normally.
  if (!banInfo) redirect("/home");

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

        <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-slate-900/70 p-6 text-center shadow-2xl backdrop-blur-md sm:p-8">
          <h1 className="font-fantasy mb-3 text-2xl font-semibold tracking-wide text-slate-50">
            הגישה לחשבון הושעתה
          </h1>

          {banInfo.type === "permanent" ? (
            <p className="text-sm leading-relaxed text-slate-300">
              הגישה לחשבון שלך נחסמה לצמיתות בעקבות הפרת כללי המשחק.
            </p>
          ) : (
            <p className="text-sm leading-relaxed text-slate-300">
              הגישה לחשבון שלך הושעתה זמנית בעקבות הפרת כללי המשחק.
              <br />
              הגישה תשוחזר אוטומטית ב-{formatChatMessageTimestamp(new Date(banInfo.expiresAt))}.
            </p>
          )}

          <form action={logoutAction} className="mt-6">
            <button
              type="submit"
              className="w-full rounded-lg border border-white/10 bg-slate-800 px-4 py-2.5 text-sm font-semibold text-slate-100 transition-colors hover:bg-slate-700"
            >
              התנתק
            </button>
          </form>
        </div>
      </div>
    </GameScreen>
  );
}
