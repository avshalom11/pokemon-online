// STAFF / MODERATION — PHASE 5. Clean, staff-facing Hebrew copy for every
// server error this feature's Global Chat moderation UI can surface (spec:
// "Display clean server errors such as: already banned, no permission,
// invalid target, punishment state changed before confirmation"). A
// lookup by plain string code rather than a strict
// Record<SomeExactUnion, string> — several different Server Actions
// (delete/chat-ban/site-ban/permanent-ban/revoke) each return their own
// slightly different error union, and this is the one shared dictionary
// all of them read through, so adding a new action's error code here is
// additive, never a breaking change to the others. `getModerationErrorLabel`
// falls back to a generic message for anything unlisted, so an unexpected
// code can never crash the dialog.
const MODERATION_ERROR_LABELS: Record<string, string> = {
  "invalid-reason": "יש להזין נימוק תקין (לא ריק, עד 500 תווים)",
  "message-not-found": "ההודעה כבר לא קיימת",
  unauthenticated: "יש להתחבר מחדש",
  "actor-not-staff": "אין לך הרשאת צוות",
  "actor-lacks-permission": "אין לך הרשאה לבצע פעולה זו",
  "hierarchy-violation": "לא ניתן לנקוט פעולה כלפי חבר הצוות הזה",
  "owner-duration-required": "יש לבחור משך זמן",
  "invalid-owner-duration": "משך הזמן שנבחר אינו תקין",
  "duration-not-allowed-for-role": "אין אפשרות לבחור משך זמן בתפקיד זה",
  "already-banned": "השחקן כבר מורחק כרגע",
  "not-found": "הפעולה לא נמצאה",
  "not-a-ban": "לא ניתן לבטל פעולה זו",
  "already-revoked": "ההרחקה כבר בוטלה",
  "already-expired": "ההרחקה כבר פגה ואין מה לבטל",
  "role-cap-reached": "הגעת למכסת חברי הצוות המותרת",
  // STAFF / MODERATION — PHASE 6 — staff appointment/removal-specific
  // codes (features/moderation/services/manage-staff.service.ts /
  // permissions/staff-permissions.ts's own StaffRoleChangeRejection).
  "not-owner": "רק הבעלים יכול לבצע פעולה זו",
  "self-target": "לא ניתן לבצע פעולה זו על עצמך",
  "target-is-owner": "לא ניתן לבצע פעולה זו כלפי הבעלים",
  "cannot-grant-owner": "לא ניתן להעניק תפקיד בעלים",
  "cannot-appoint-owner": "לא ניתן להעניק תפקיד בעלים",
  "already-staff": "השחקן כבר חבר צוות",
  "cannot-remove-owner": "לא ניתן להסיר את הבעלים",
  "not-staff": "השחקן אינו חבר צוות",
  "invalid-role": "תפקיד לא תקין",
  "target-not-found": "השחקן לא נמצא",
};

const FALLBACK_MODERATION_ERROR_LABEL = "אירעה שגיאה. נסו שוב.";

export function getModerationErrorLabel(code: string): string {
  return MODERATION_ERROR_LABELS[code] ?? FALLBACK_MODERATION_ERROR_LABEL;
}
