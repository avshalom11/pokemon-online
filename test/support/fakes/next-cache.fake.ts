// Stand-in for the "next/cache" package. The action layer calls
// revalidatePath purely for its Next.js cache side effect, which has no
// meaning outside a running Next.js server — a real cache invalidation is
// never simulated here.
//
// GYM BATTLE RESULT DIALOG FIX (later task) — every call IS recorded
// (never just a silent no-op), so a test can assert exactly which paths
// were (or, just as importantly, were NOT) revalidated by a given action —
// the whole point of this task's regression test is proving a
// battle-ending action does NOT call this, while the player's own
// "אישור" confirmation action does.
export const revalidatePathCalls: string[] = [];

export function revalidatePath(path: string): void {
  revalidatePathCalls.push(path);
}

export function __resetRevalidatePathCalls(): void {
  revalidatePathCalls.length = 0;
}
