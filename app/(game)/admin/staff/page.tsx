import { redirect } from "next/navigation";

import { StaffAdminPanel } from "@/features/moderation/components/StaffAdminPanel";
import { isStaffAdminRole } from "@/features/moderation/services/staff-admin-access";
import { getStaffRole } from "@/features/moderation/services/staff-role.service";
import { getStaffRosterView } from "@/features/moderation/services/staff-roster-view.service";
import { getCurrentSession } from "@/lib/auth/auth-session";
import { getPlayerProfile } from "@/lib/auth/player-profile";

// STAFF / MODERATION — PHASE 6 — the OWNER-only staff-management page.
// Lives inside the (game) route group (app/(game)/layout.tsx already
// guarantees a real session by the time this renders — see that layout's
// own doc comment), so this only needs its own ADDITIONAL check: is this
// specific viewer OWNER. A non-OWNER reaching this URL directly is
// redirected to /home — a safe, ordinary page they DO have access to,
// never a bare error page or a loop-prone target (same "redirect
// somewhere the visitor can actually use" rule app/banned/page.tsx's own
// "not actually banned" fallback already establishes).
//
// isStaffAdminRole is the pure, separately-tested decision
// (features/moderation/services/staff-admin-access.ts); this file's own
// job is just the three-line "resolve role, redirect if not allowed"
// wiring around it, reviewed by inspection like every other page-level
// redirect in this codebase (see lib/auth/site-ban-redirect-loop.test.ts's
// own doc comment for why).
export default async function StaffAdminPage() {
  const session = await getCurrentSession();
  // Same defensive re-check every other page reachable under proxy.ts's
  // PROTECTED_PATHS already performs (see app/onboarding/starter/page.tsx)
  // rather than assuming the layout's own guarantee — a stale cookie
  // whose Session/User row is gone must still be routed through the real
  // cookie-clearing fix, never a bare crash from `session.user.id` on
  // null.
  if (!session) {
    redirect("/api/clear-stale-session");
  }

  const profile = await getPlayerProfile(session.user.id);
  const role = await getStaffRole(profile.id);

  if (!isStaffAdminRole(role)) {
    redirect("/home");
  }

  const roster = await getStaffRosterView();

  return (
    <div dir="rtl" className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-4 sm:p-6">
      <h1 className="font-fantasy text-2xl font-semibold text-slate-100">ניהול צוות</h1>
      <StaffAdminPanel initialRoster={roster} />
    </div>
  );
}
