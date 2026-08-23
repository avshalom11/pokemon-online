// ACCOUNT DELETION — UI/action wiring coverage via source reads, same
// technique as features/home/components/NavigationGrid.hatchery.test.ts
// and features/player-progression/victory-xp-scope-boundary.test.ts: these
// files are Client Components / Server Actions that pull in next/headers,
// next/navigation, or the real Better Auth instance, none of which are
// importable directly under this project's plain node:test runner — the
// actual gating/ordering logic is instead verified by reading the real
// source text.
import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";

function readSourceNormalized(path: string): string {
  return fs.readFileSync(path, "utf8").replace(/\r\n/g, "\n");
}

const profileContentSrc = readSourceNormalized("features/profile/components/ProfileContent.tsx");
const securitySectionSrc = readSourceNormalized("features/profile/components/SecurityAccountSection.tsx");
const dangerZoneSrc = readSourceNormalized("features/profile/components/DeleteAccountDialog.tsx");
const requestActionSrc = readSourceNormalized("features/account-deletion/actions/request-account-deletion.action.ts");
const confirmActionSrc = readSourceNormalized("features/account-deletion/actions/confirm-account-deletion.action.ts");
const confirmPageSrc = readSourceNormalized("app/delete-account/confirm/page.tsx");
const confirmFormSrc = readSourceNormalized("features/account-deletion/components/DeleteAccountConfirmForm.tsx");
const requestServiceSrc = readSourceNormalized("features/account-deletion/services/account-deletion-request.service.ts");
const deletionServiceSrc = readSourceNormalized("features/account-deletion/services/account-deletion.service.ts");
const confirmStateSrc = readSourceNormalized("features/account-deletion/actions/confirm-account-deletion.state.ts");

// A "use server" file's every top-level export must be an async function
// (types/interfaces are erased at compile time and don't count) — Next.js
// build/runtime-enforced. Returns the list of exported names that violate
// this, so a test can assert it's empty.
function findIllegalUseServerExports(src: string): string[] {
  if (!/^"use server";/m.test(src)) return [];
  const violations: string[] = [];
  for (const match of src.matchAll(/^export\s+(async function|function|const|class|let|var)\s+(\w+)/gm)) {
    const [, kind, name] = match;
    if (kind !== "async function") violations.push(name);
  }
  return violations;
}

// (16) the "מחק משתמש" deletion row lives inside SecurityAccountSection —
// no separate "danger zone" section/title — and that whole section only
// ever renders for the profile owner, never on another player's public
// profile view.
test("(16) the account-deletion row lives inside SecurityAccountSection (no separate danger-zone section), which is only ever rendered behind view.isOwner", () => {
  assert.ok(
    profileContentSrc.includes(
      "<SecurityAccountSection currentUsername={view.username} onUsernameChanged={handleUsernameChanged} />"
    )
  );
  const occurrences = (profileContentSrc.match(/<SecurityAccountSection\b/g) ?? []).length;
  assert.equal(occurrences, 1, "exactly one render site — no second, ungated place it could also mount from");
  assert.ok(!profileContentSrc.includes("AccountDangerZoneSection"), "the old separate danger-zone section must be gone entirely");
  assert.ok(securitySectionSrc.includes("מחק משתמש"));
  assert.ok(!securitySectionSrc.includes("אזור מסוכן"), "no separate danger-zone title may exist anywhere in this section");
});

test("(16b) the delete-account dialog itself never reads/accepts any prop that could make it act on someone else's account", () => {
  assert.ok(securitySectionSrc.includes("<DeleteAccountDialog onClose={() => setIsDeleteAccountOpen(false)} />"), "onClose is the ONLY prop ever passed — it always acts on the CURRENT session's own account");
});

test("(16c) the delete-account row is styled as visually destructive (red), distinct from the two ordinary rows above it", () => {
  const rowMatch = securitySectionSrc.match(/<button[\s\S]*?מחק משתמש[\s\S]*?<\/button>/);
  assert.ok(rowMatch);
  assert.ok(rowMatch![0].includes("bg-rose-600"));
});

// (17) Cancel never mutates anything — only onClose runs; the deletion
// request action is wired exclusively to the "אישור ושליחת מייל" button.
test('(17) "ביטול" only closes the dialog — no server action is reachable from it', () => {
  const cancelButtonMatch = dangerZoneSrc.match(/ביטול[\s\S]{0,400}/);
  assert.ok(cancelButtonMatch);
  // Look backwards from "ביטול" to its own <button> tag's onClick.
  const beforeCancel = dangerZoneSrc.slice(0, dangerZoneSrc.indexOf("ביטול"));
  const lastButtonOpen = beforeCancel.lastIndexOf("<button");
  const cancelButtonTag = dangerZoneSrc.slice(lastButtonOpen, dangerZoneSrc.indexOf("ביטול"));
  assert.ok(cancelButtonTag.includes("onClick={onClose}"));
  assert.ok(!cancelButtonTag.includes("requestAccountDeletionAction"));
});

test('(17b) "אישור ושליחת מייל" is the only button wired to requestAccountDeletionAction', () => {
  assert.ok(dangerZoneSrc.includes("import { requestAccountDeletionAction }"));
  const occurrences = (dangerZoneSrc.match(/requestAccountDeletionAction\(\)/g) ?? []).length;
  assert.equal(occurrences, 1);
  assert.ok(dangerZoneSrc.includes('onClick={handleConfirm}'));
});

// (4)/(13 task-section) never trust a client-supplied email/userId for the
// deletion request — resolved from the session alone.
test("(18) requestAccountDeletionAction takes no arguments and resolves the account from getCurrentSession only", () => {
  assert.ok(requestActionSrc.includes("export async function requestAccountDeletionAction(): Promise<RequestAccountDeletionActionResult> {"));
  assert.ok(requestActionSrc.includes("await getCurrentSession()"));
  assert.ok(requestActionSrc.includes("requestAccountDeletion(session.user.id)"));
});

test("(18b) requestAccountDeletion resolves the email from the User row itself, never from a parameter", () => {
  assert.ok(requestServiceSrc.includes("export async function requestAccountDeletion(userId: string): Promise<RequestAccountDeletionResult> {"));
  assert.ok(requestServiceSrc.includes("prisma.user.findUnique({ where: { id: userId }, select: { email: true } })"));
});

// (6) GET/loading/prefetching the confirm page never deletes anything —
// the page only ever calls the read-only checkDeletionToken.
test("(19) the confirm page's own render only calls the read-only checkDeletionToken — never confirmAccountDeletion", () => {
  assert.ok(confirmPageSrc.includes("import { checkDeletionToken } from"));
  assert.ok(!confirmPageSrc.includes("confirmAccountDeletion"));
});

test("(19b) the actual deletion only happens via an explicit form POST (useActionState), never on page load", () => {
  assert.ok(confirmFormSrc.includes("useActionState(\n    confirmAccountDeletionAction,"));
  assert.ok(confirmFormSrc.includes('<button\n        type="submit"'));
});

// (9) session invalidation — signOut, then redirect to the public screen,
// only ever on a successful deletion.
test("(20) a successful confirm signs out and redirects to the public screen; a failed confirm never signs out or redirects", () => {
  const successBlockIndex = confirmActionSrc.indexOf('if (result.status !== "success")');
  const signOutIndex = confirmActionSrc.indexOf("await auth.api.signOut");
  const redirectIndex = confirmActionSrc.indexOf('redirect("/")');
  assert.ok(successBlockIndex > -1 && signOutIndex > -1 && redirectIndex > -1);
  // signOut/redirect must appear textually AFTER the early-return for a
  // non-success result, so a failure can never reach them.
  assert.ok(successBlockIndex < signOutIndex);
  assert.ok(signOutIndex < redirectIndex);
});

// (21) confirmAccountDeletion never takes a userId/session — token
// possession is the sole authorization (task section 4's own explicit
// prohibition on userId-based authorization).
test("(21) confirmAccountDeletionAction never reads a session or a client-supplied userId before deleting", () => {
  assert.ok(!confirmActionSrc.includes("getCurrentSession"));
  assert.ok(!confirmActionSrc.includes("formData.get(\"userId\")"));
  assert.ok(confirmActionSrc.includes('const token = formData.get("token");'));
});

// CRASH REGRESSION — "A 'use server' file can only export async
// functions, found object." confirm-account-deletion.action.ts used to
// also export `initialConfirmAccountDeletionState` (a plain object)
// alongside `confirmAccountDeletionAction` — illegal, and exactly what
// crashed the real confirmation-page POST (500, then an uncaught error on
// the client) the first time this feature shipped. Fixed by moving the
// state type/initial value into their own plain (non-"use server") file,
// same split lib/auth/auth-action-state.ts already established for
// lib/auth/actions.ts. This test would have caught the exact regression.
test("(23) every top-level export of the confirm/request \"use server\" action files is an async function — no plain object/const export alongside them", () => {
  assert.deepEqual(findIllegalUseServerExports(confirmActionSrc), []);
  assert.deepEqual(findIllegalUseServerExports(requestActionSrc), []);
});

test('(23b) confirm-account-deletion.state.ts (where the state now lives) carries NO "use server" directive — it is a plain shared module, not itself a Server Action file', () => {
  assert.ok(!/^"use server";/m.test(confirmStateSrc));
  assert.ok(confirmStateSrc.includes("export const initialConfirmAccountDeletionState"));
});

test("(23c) DeleteAccountConfirmForm imports the initial state from the plain state file, not from the \"use server\" action file", () => {
  assert.ok(
    confirmFormSrc.includes(
      'import { initialConfirmAccountDeletionState } from "@/features/account-deletion/actions/confirm-account-deletion.state";'
    )
  );
});

// (22) the exactly-once claim inside confirmAccountDeletion runs inside
// ONE transaction with the explicit non-FK cleanup and the final delete —
// atomic, same idiom as every other guarded-updateMany primitive in this
// codebase.
test("(22) token claim, explicit cleanup, and the final user delete all run inside the same prisma.$transaction", () => {
  const txStart = deletionServiceSrc.indexOf("return await prisma.$transaction(async (tx) => {");
  const claimIndex = deletionServiceSrc.indexOf("await tx.accountDeletionRequest.updateMany");
  const placementCleanupIndex = deletionServiceSrc.indexOf("await tx.leagueTournamentPlacement.deleteMany");
  const sessionCleanupIndex = deletionServiceSrc.indexOf("await tx.fieldBattleSession.deleteMany");
  const userDeleteIndex = deletionServiceSrc.indexOf("await tx.user.delete");
  assert.ok(txStart > -1 && claimIndex > -1 && placementCleanupIndex > -1 && sessionCleanupIndex > -1 && userDeleteIndex > -1);
  assert.ok(txStart < claimIndex);
  assert.ok(claimIndex < placementCleanupIndex);
  assert.ok(placementCleanupIndex < sessionCleanupIndex);
  assert.ok(sessionCleanupIndex < userDeleteIndex);
});
