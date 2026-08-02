import "server-only";

import { headers } from "next/headers";

import { auth } from "@/lib/auth/auth";
import { isUsernameTakenError, USERNAME_TAKEN_MESSAGE } from "@/lib/auth/auth-errors";
import { prisma } from "@/lib/db/prisma";
import type { Prisma } from "@/lib/generated/prisma/client";
import type { UpdateProfileInput } from "../validation/profile.schema";

export type UpdateProfileResult = { status: "success"; username: string } | { status: "error"; message: string };

const GENERIC_UPDATE_ERROR_MESSAGE = "עדכון הפרופיל נכשל. נסה שוב.";

function getProfileUpdateErrorMessage(error: unknown): string {
  return isUsernameTakenError(error) ? USERNAME_TAKEN_MESSAGE : GENERIC_UPDATE_ERROR_MESSAGE;
}

// The only place a profile edit is ever persisted. Username changes are
// deliberately NEVER written directly to the User table via Prisma — they
// go through Better Auth's own official auth.api.updateUser (the exact
// same validated, uniqueness-checked path registration itself uses; see
// lib/auth/auth.ts's username plugin), so the auth provider and the game
// database can never desynchronize on who owns which username. PlayerProfile
// (displayName + every cosmetic field) is written afterward, only once the
// username change (if any) has already succeeded — so a rejected username
// (already taken) leaves every other field untouched too, never a partial
// save.
//
// `displayName` is kept in sync with a successful username change (the
// same seeding rule registration already applies at sign-up — see
// lib/auth/auth.ts's databaseHooks) rather than exposing a second,
// independent "display name" concept this phase's spec never asked for.
export async function updateProfile(
  playerId: string,
  currentUsername: string,
  input: UpdateProfileInput
): Promise<UpdateProfileResult> {
  const trimmedUsername = input.username.trim();
  const usernameChanged = trimmedUsername.toLowerCase() !== currentUsername.toLowerCase();

  if (usernameChanged) {
    try {
      await auth.api.updateUser({
        body: { username: trimmedUsername, displayUsername: trimmedUsername },
        headers: await headers(),
      });
    } catch (error) {
      return { status: "error", message: getProfileUpdateErrorMessage(error) };
    }
  }

  await prisma.playerProfile.update({
    where: { id: playerId },
    data: {
      aboutMe: input.aboutMe,
      avatarDexNumber: input.avatarDexNumber,
      profileThemeId: input.themeId,
      showPartyOnProfile: input.showPartyOnProfile,
      showStatsOnProfile: input.showStatsOnProfile,
      showAboutMeOnProfile: input.showAboutMeOnProfile,
      // Already fully validated by updateProfileSchema's own
      // profileContentBlocksSchema (max block count, max text lengths,
      // allowed font/color/alignment/image ids) before this function is
      // ever reached — never re-validated or reshaped here. Same
      // as-unknown-as-InputJsonValue cast battle-session.service.ts's own
      // serializeParticipants already uses for a typed array going into a
      // Prisma Json column.
      profileContentBlocks: input.contentBlocks as unknown as Prisma.InputJsonValue,
      ...(usernameChanged ? { displayName: trimmedUsername } : {}),
    },
  });

  return { status: "success", username: trimmedUsername.toLowerCase() };
}
