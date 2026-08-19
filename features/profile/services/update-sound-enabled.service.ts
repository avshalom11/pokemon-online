import "server-only";

import { prisma } from "@/lib/db/prisma";

// MOVE SOUND TO TOP TOOLBAR (later task) — the sound preference's ONE
// write path, deliberately its own small file rather than living inside
// update-profile.service.ts: that file imports next/headers (for Better
// Auth's username-change flow), which makes it impossible to import
// directly under this project's node:test runner outside a real Next.js
// server context — a real, pre-existing limitation (see
// update-profile-sound-enabled.test.ts's own doc comment). This function
// has nothing to do with usernames/content blocks, so there's no reason
// for it to inherit that dependency; keeping it separate also means it's
// independently, directly testable. Same architecture as updateProfile
// otherwise — a plain PlayerProfile update via Prisma, ownership resolved
// by the caller (updateSoundEnabledAction) from the authenticated session
// only, never a client-supplied id. This is the ONLY place soundEnabled is
// ever written — the big Edit Profile form no longer sends or manages this
// field at all (see EditProfileModal.tsx).
export async function updateSoundEnabled(playerId: string, soundEnabled: boolean): Promise<void> {
  await prisma.playerProfile.update({
    where: { id: playerId },
    data: { soundEnabled },
  });
}
