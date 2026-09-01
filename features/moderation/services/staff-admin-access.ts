import type { StaffRole } from "@/features/moderation/types";

// STAFF / MODERATION — PHASE 6. The pure "is this role allowed to see the
// staff-admin/moderation-history surfaces" decision — deliberately
// extracted from the pages themselves (app/(game)/admin/staff/page.tsx,
// app/(game)/admin/moderation-history/page.tsx), same "pure decision,
// separately testable" split lib/auth/auth-session.ts's own
// resolveSiteBanRedirectPath (features/moderation/services/
// site-access.service.ts) already established in Phase 4 — this function
// has no next/navigation or next/headers dependency, unlike the pages
// that call it, which pull those in and can only be verified by source
// inspection (see lib/auth/site-ban-redirect-loop.test.ts's own doc
// comment for why).
//
// Trivial today (OWNER only — spec: "DEPUTY/SUPPORT do NOT expose the
// page to them yet unless existing permissions explicitly require it"),
// but centralizing it here means a future policy change (should DEPUTY
// ever get read access to moderation history) is a one-line change here,
// never a hunt across every page that gates on it.
export function isStaffAdminRole(role: StaffRole | null): boolean {
  return role === "OWNER";
}
