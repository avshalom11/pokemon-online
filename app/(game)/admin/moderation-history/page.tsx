import { redirect } from "next/navigation";

import { GameScreen } from "@/components/layout/GameScreen";
import { ModerationHistoryTable } from "@/features/moderation/components/ModerationHistoryTable";
import { getAllModerationHistory } from "@/features/moderation/services/moderation-history-view.service";
import { isStaffAdminRole } from "@/features/moderation/services/staff-admin-access";
import { getStaffRole } from "@/features/moderation/services/staff-role.service";
import { getCurrentSession } from "@/lib/auth/auth-session";
import { getPlayerProfile } from "@/lib/auth/player-profile";

// STAFF / MODERATION — PHASE 6 — the OWNER-only moderation-history page.
// Same shape/redirect-safety reasoning as app/(game)/admin/staff/page.tsx
// (see that file's own doc comment) — DEPUTY/SUPPORT are deliberately NOT
// granted access here either, per this phase's own explicit "OWNER-only
// for now" instruction (isStaffAdminRole is the one place that would
// change if that policy is ever widened).
export default async function ModerationHistoryPage() {
  const session = await getCurrentSession();
  if (!session) {
    redirect("/api/clear-stale-session");
  }

  const profile = await getPlayerProfile(session.user.id);
  const role = await getStaffRole(profile.id);

  if (!isStaffAdminRole(role)) {
    redirect("/home");
  }

  const history = await getAllModerationHistory();

  return (
    <GameScreen>
      <div
        dir="rtl"
        className="relative h-full w-full overflow-y-auto bg-gradient-to-b from-slate-950 via-indigo-950/40 to-slate-950"
      >
        <div className="relative mx-auto flex w-full max-w-4xl flex-col gap-6 p-4 sm:p-6">
          <h1 className="font-fantasy text-2xl font-semibold text-slate-100">היסטוריית ניהול</h1>
          <ModerationHistoryTable initialHistory={history} />
        </div>
      </div>
    </GameScreen>
  );
}
