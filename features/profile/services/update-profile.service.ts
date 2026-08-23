import "server-only";

import { prisma } from "@/lib/db/prisma";
import type { Prisma } from "@/lib/generated/prisma/client";
import type { UpdateProfileInput } from "../validation/profile.schema";

export type UpdateProfileResult = { status: "success" } | { status: "error"; message: string };

// The only place a profile-content edit (about me, avatar, theme, privacy
// toggles, showcase blocks) is ever persisted. Username is deliberately NOT
// handled here — see updateProfileSchema's own doc comment: changing it
// costs 100 Gold and goes through change-username.service.ts's own
// dedicated, atomic flow instead.
export async function updateProfile(playerId: string, input: UpdateProfileInput): Promise<UpdateProfileResult> {
  await prisma.playerProfile.update({
    where: { id: playerId },
    data: {
      aboutMe: input.aboutMe,
      avatarDexNumber: input.avatarDexNumber,
      profileThemeId: input.themeId,
      showPartyOnProfile: input.showPartyOnProfile,
      showStatsOnProfile: input.showStatsOnProfile,
      showAboutMeOnProfile: input.showAboutMeOnProfile,
      showGymAchievementsOnProfile: input.showGymAchievementsOnProfile,
      // Already fully validated by updateProfileSchema's own
      // profileContentBlocksSchema (max block count, max text lengths,
      // allowed font/color/alignment/image ids) before this function is
      // ever reached — never re-validated or reshaped here. Same
      // as-unknown-as-InputJsonValue cast battle-session.service.ts's own
      // serializeParticipants already uses for a typed array going into a
      // Prisma Json column.
      profileContentBlocks: input.contentBlocks as unknown as Prisma.InputJsonValue,
    },
  });

  return { status: "success" };
}
