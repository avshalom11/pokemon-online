import type { ChangeUsernameResult } from "@/features/profile/services/change-username.service";

// SECURITY & ACCOUNT — shared, client-safe constants for the "אבטחה
// וחשבון" area. Deliberately its own tiny config file, NOT exported from
// change-username.service.ts: that service is "server-only" and pulls in
// next/headers + the real Better Auth instance, so a Client Component
// (ChangeUsernameDialog.tsx, SecurityAccountSection.tsx) importing from it
// directly would fail to build — same "services/ is never imported by
// Client Components" rule PROJECT_RULES.md already states. Same precedent
// as e.g. features/friends/config/friends.config.ts for a fixed,
// UI-relevant number that both a server service and client components
// need. The `ChangeUsernameResult` import above is type-only — erased
// entirely at compile time, so it never actually pulls the server-only
// service's runtime code into a client bundle.
export const USERNAME_CHANGE_COST_GOLD = 100;

// Also NOT exported from change-username.action.ts: a "use server" file
// may only export async Server Actions (Next.js build-enforced) — a plain
// synchronous helper like this one has to live outside it, same
// established precedent lib/auth/auth-action-state.ts's own doc comment
// documents for AuthActionState/initialAuthActionState.
const CHANGE_USERNAME_MESSAGES: Record<Exclude<ChangeUsernameResult["status"], "success">, string> = {
  "same-username": "זהו כבר שם המשתמש הנוכחי שלך.",
  "username-taken": "שם המשתמש כבר תפוס. נסה שם אחר.",
  "insufficient-gold": `אין לך מספיק זהב. שינוי שם משתמש עולה ${USERNAME_CHANGE_COST_GOLD} זהב.`,
  error: "שינוי שם המשתמש נכשל. הזהב לא חויב, נסה שוב.",
};

export function getChangeUsernameErrorMessage(status: Exclude<ChangeUsernameResult["status"], "success">): string {
  return CHANGE_USERNAME_MESSAGES[status];
}
