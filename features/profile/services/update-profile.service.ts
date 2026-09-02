import "server-only";

import { prisma } from "@/lib/db/prisma";
import { Prisma } from "@/lib/generated/prisma/client";
import type { UpdateProfileInput } from "../validation/profile.schema";

export type UpdateProfileResult = { status: "success" } | { status: "error"; message: string };

// The only place a profile-content edit (about me, avatar, theme, privacy
// toggles, rich profile content) is ever persisted. Username is deliberately NOT
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
      // profileContentBlocks is DELIBERATELY absent from this update — the
      // old block editor was retired from the UI (see
      // features/profile/rich-content's own doc comments) but its stored
      // data is kept as rollback/migration safety, per that retirement's
      // own explicit data-safety rule. Omitting a field from Prisma's
      // `data` object (as opposed to setting it to `undefined` explicitly,
      // which has the same effect) tells Prisma to leave the column
      // completely untouched — never overwritten/cleared by a profile save
      // through this now-old-block-free form.
      //
      // RICH PROFILE EDITOR — already fully validated by
      // updateProfileSchema's own richProfileContentDocSchema before this
      // function is ever reached. Prisma.DbNull (never a bare JS `null`) is
      // required to actually write SQL NULL to a nullable Json? column —
      // assigning `undefined` would instead tell Prisma to leave the column
      // untouched, which is never what "the owner sent no rich content this
      // save" should mean (this is a full profile-content save, not a
      // partial patch, unlike profileContentBlocks above).
      richProfileContent:
        input.richProfileContent == null ? Prisma.DbNull : (input.richProfileContent as unknown as Prisma.InputJsonValue),
    },
  });

  return { status: "success" };
}
