import "server-only";

import { getPokedexCounts } from "@/features/pokedex/services/pokedex-view.service";
import { getOwnedPokemonStats, getPlayerParty } from "@/features/pokemon/services/player-pokemon";
import { getPlayerProgress } from "@/features/player-progression/progression-calculations";
import { prisma } from "@/lib/db/prisma";
import { REGION_LABELS } from "@/shared/types/region-labels";
import { toRegionId } from "@/shared/types/region";
import { parseProfileContentBlocks } from "./parse-profile-content";
import { getProfileTheme } from "../themes/profile-themes";
import type { PublicPartyMemberView, PublicProfileView, PublicStatsView } from "../types/profile.types";

// The ONE public profile query — this is the "public view model" the
// architecture spec requires be kept separate from the owner's own edit
// query (profile-edit-view.service.ts): it only ever selects `id` and
// `username` off User (never email, emailVerified, image, or any other
// auth-table column), so private account data is never even fetched here,
// let alone rendered — a structural guarantee, not just a UI-hiding
// convention. Returns null for an unknown username (the page renders a
// clean not-found state) rather than throwing.
//
// The OWNER sees the exact same privacy-filtered shape a visitor would —
// `isOwner` only ever controls whether the Edit Profile button renders
// (features/profile/components/ProfileContent.tsx); it never unlocks
// hidden sections here. The one deliberate exception ("preview your own
// party while editing") lives entirely in profile-edit-view.service.ts's
// own partyPreview field, never in this function.
export async function getPublicProfileView(usernameParam: string, viewerUserId: string | null): Promise<PublicProfileView | null> {
  const normalizedUsername = usernameParam.trim().toLowerCase();
  if (!normalizedUsername) return null;

  const user = await prisma.user.findUnique({
    where: { username: normalizedUsername },
    select: { id: true, username: true, playerProfile: true },
  });

  if (!user || !user.playerProfile || !user.username) return null;

  const profile = user.playerProfile;
  const progress = getPlayerProgress(profile.experience);
  const regionId = toRegionId(profile.regionId);
  const theme = getProfileTheme(profile.profileThemeId);

  // Every field below is coalesced to a safe default rather than trusted
  // as always-present — a stale generated Prisma Client (e.g. a dev server
  // still running from before a schema migration added one of these
  // columns) would otherwise return an object missing them entirely
  // (`undefined`, not the column's own real default), which used to crash
  // downstream `.length`/boolean checks instead of degrading gracefully.
  const showPartyOnProfile = profile.showPartyOnProfile ?? true;
  const showStatsOnProfile = profile.showStatsOnProfile ?? true;
  const showAboutMeOnProfile = profile.showAboutMeOnProfile ?? true;
  const aboutMeValue = profile.aboutMe ?? "";

  let party: PublicPartyMemberView[] | null = null;
  if (showPartyOnProfile) {
    const realParty = await getPlayerParty(profile.id);
    party = realParty.map((pokemon) => ({
      dexNumber: pokemon.species.dexNumber,
      spriteId: pokemon.species.spriteId,
      spriteExt: pokemon.species.spriteExt,
      displayName: pokemon.nickname ?? pokemon.species.name,
      level: pokemon.level,
    }));
  }

  let stats: PublicStatsView | null = null;
  if (showStatsOnProfile) {
    const [pokedexCounts, ownedStats] = await Promise.all([
      getPokedexCounts(profile.id),
      getOwnedPokemonStats(profile.id),
    ]);

    stats = {
      trainerLevel: progress.level,
      pokedexSeenCount: pokedexCounts.seenCount,
      pokedexCaughtCount: ownedStats.uniqueSpeciesCaught,
      totalOwnedPokemon: ownedStats.totalCaught,
    };
  }

  const aboutMe = showAboutMeOnProfile && aboutMeValue.trim() !== "" ? aboutMeValue : null;

  return {
    username: user.username,
    displayName: profile.displayName,
    trainerLevel: progress.level,
    regionId,
    regionLabel: REGION_LABELS[regionId],
    avatarDexNumber: profile.avatarDexNumber ?? null,
    themeId: theme.id,
    aboutMe,
    isOwner: viewerUserId !== null && viewerUserId === user.id,
    party,
    stats,
    contentBlocks: parseProfileContentBlocks(profile.profileContentBlocks),
  };
}
