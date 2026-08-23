import "server-only";

import { getPlayerParty } from "@/features/pokemon/services/player-pokemon";
import { getPlayerProfile } from "@/lib/auth/player-profile";
import { parseProfileContentBlocks } from "./parse-profile-content";
import { getProfileTheme } from "../themes/profile-themes";
import type { ProfileEditViewModel, PublicPartyMemberView } from "../types/profile.types";

// The owner-only edit query — deliberately separate from
// getPublicProfileView (that one applies privacy toggles; this one never
// does, since the owner must always be able to see and change what they're
// currently hiding). No username field: this view model backs
// EditProfileModal's profile-content-only save — see SecurityAccountSection
// for the separate, paid username-change flow, which resolves the current
// username itself (from the session) rather than through this model.
//
// Every optional/boolean field is coalesced to a safe default rather than
// trusted as always-present (see public-profile-view.service.ts's own doc
// comment for exactly why — the same "a stale Prisma Client returns the
// field as undefined, not its real column default" risk applies here too,
// and this is the exact view model that used to crash EditProfileModal on
// mount when that happened).
export async function getProfileEditViewModel(userId: string): Promise<ProfileEditViewModel> {
  const profile = await getPlayerProfile(userId);
  const theme = getProfileTheme(profile.profileThemeId);

  const realParty = await getPlayerParty(profile.id);
  const partyPreview: PublicPartyMemberView[] = realParty.map((pokemon) => ({
    dexNumber: pokemon.species.dexNumber,
    spriteId: pokemon.species.spriteId,
    spriteExt: pokemon.species.spriteExt,
    displayName: pokemon.nickname ?? pokemon.species.name,
    level: pokemon.level,
  }));

  return {
    aboutMe: profile.aboutMe ?? "",
    avatarDexNumber: profile.avatarDexNumber ?? null,
    themeId: theme.id,
    showPartyOnProfile: profile.showPartyOnProfile ?? true,
    showStatsOnProfile: profile.showStatsOnProfile ?? true,
    showAboutMeOnProfile: profile.showAboutMeOnProfile ?? true,
    showGymAchievementsOnProfile: profile.showGymAchievementsOnProfile ?? true,
    partyPreview,
    contentBlocks: parseProfileContentBlocks(profile.profileContentBlocks),
  };
}
