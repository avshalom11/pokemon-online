// Stand-in for the "next/cache" package. The action layer calls
// revalidatePath purely for its Next.js cache side effect, which has no
// meaning outside a running Next.js server — a no-op here is faithful.
export function revalidatePath(): void {}
