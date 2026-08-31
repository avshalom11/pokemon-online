import type { ProfileThemeId } from "../themes/profile-themes";
import type { ProfileContentBlock } from "./profile-content.types";
import type { FriendshipStatus } from "@/features/friends/types";
import type { LeagueId } from "@/features/leagues/types/league.types";
import type { RegionId } from "@/shared/types/region";

// A single displayed party member on the PUBLIC profile — deliberately NOT
// OwnedPokemon: only the fields the spec explicitly allows are ever
// selected onto this shape (dex number + optional sprite form override for
// the sprite, display name, level). No id (internal PlayerPokemon id), no
// XP, no IVs/stats, no moves, no status — those are never even read for
// this purpose, let alone exposed. See public-profile-view.service.ts's own
// doc comment.
export interface PublicPartyMemberView {
  dexNumber: number;
  // Mirrors PokemonSpecies.spriteId (shared/types/pokemon.ts) — carried
  // through so an owned Pokémon that's an alternate FORM (e.g. Deoxys
  // Attack Form) still renders its own real sprite here instead of its
  // base form's, without exposing anything else about the owned instance.
  spriteId?: string;
  // Mirrors PokemonSpecies.spriteExt (shared/types/pokemon.ts) — carried
  // through for the same reason as spriteId: Paldea species whose real
  // sprite files are PNG must still render correctly here.
  spriteExt?: "gif" | "png";
  displayName: string;
  level: number;
}

// Public statistics — every field here is safe to show (no currency, no
// inventory, no private Pokémon data). "Total field-battle victories" is
// deliberately absent: no reliable lifetime counter exists yet (only a
// per-day log — see DailyFieldBattleCount's own doc comment), and Phase 1
// must never invent one by summing the daily log.
export interface PublicStatsView {
  trainerLevel: number;
  pokedexSeenCount: number;
  pokedexCaughtCount: number;
  totalOwnedPokemon: number;
}

// PROFILE ACHIEVEMENTS (later task) — one earned Gym Badge / Regional
// Medal, ready to render. Labels/images are always read from the existing
// Gym catalog (gym-badges.ts/regional-medals.ts, getGymBadgeDefinition/
// getRegionalMedalDefinition) — never recreated/duplicated here; this
// shape only carries what the profile UI actually needs, nothing an
// owned-achievement row itself wouldn't already have (no player id, no
// awardedAt timestamp — irrelevant to a public display).
export interface PublicBadgeView {
  regionId: RegionId;
  gymNumber: 1 | 2 | 3;
  displayName: string;
  imageUrl: string;
}

export interface PublicRegionalMedalView {
  regionId: RegionId;
  displayName: string;
  imageUrl: string;
}

// LEAGUE AWARDS — one GROUPED (leagueId, place) trophy/medal, ready to
// render. `imageUrl` is always read straight off the existing
// LeaguePlayerAchievement the achievement history already computes
// (features/leagues/services/league-achievement.service.ts, itself
// resolved via league-achievement-media.ts's own canonical
// leagueAwardImageUrl) — never a second image lookup here. `count` is the
// number of times this exact (leagueId, place) was earned across every
// tournament cycle — a player who won the same League/placement multiple
// times shows ONE card with a quantity, never one duplicate card per win
// (see profile-achievements-view.service.ts's own grouping doc comment).
export interface PublicLeagueAwardView {
  leagueId: LeagueId;
  place: 1 | 2 | 3;
  leagueDisplayName: string;
  placementLabel: string;
  imageUrl: string;
  count: number;
}

// The generic "הישגים" (Achievements) container — deliberately not named
// "GymAchievements" or scoped to Gyms in its own shape, so a
// League-trophy array (League I/II/III/Champions League Trophies, Silver/
// Bronze/Arad awards) could be added as one more sibling field here later
// without restructuring the profile architecture or touching
// ProfileContent.tsx's own composition — see `leagueAwards` below, which is
// exactly that field, now populated.
//
// `visibleToViewer` is the ONE server-side privacy decision the profile UI
// ever needs to branch on: true means `badges`/`regionalMedals` below are
// the CURRENT viewer's real, populated data (owner viewing their own
// profile — always; any other viewer — only when the owner's
// showGymAchievementsOnProfile setting is ON); false means they are
// deliberately EMPTY arrays — hidden achievement counts are never sent to
// an unauthorized viewer, never just hidden by CSS (see
// profile-achievements-view.service.ts's own doc comment).
//
// `hiddenFromOtherUsers` is the raw, owner-controlled setting value,
// carried separately so the OWNER's own view (where visibleToViewer is
// always true) can still show "הישגים מוסתרים ממשתמשים אחרים" — a
// non-owner viewer never needs this field (their own visibleToViewer
// already reflects it).
export interface ProfileAchievementsView {
  visibleToViewer: boolean;
  hiddenFromOtherUsers: boolean;
  badges: readonly PublicBadgeView[];
  regionalMedals: readonly PublicRegionalMedalView[];
  leagueAwards: readonly PublicLeagueAwardView[];
}

// The one shape both the public visitor view AND the owner's own view of
// their profile page render from — see public-profile-view.service.ts's
// own doc comment for why the owner sees the exact same privacy-filtered
// content as everyone else (only `isOwner` differs, controlling whether
// the Edit Profile button renders at all).
export interface PublicProfileView {
  username: string;
  // FRIENDS PHASE 1 — the profile owner's own PlayerProfile id, needed by
  // AddFriendButton to address a friend request at the right player.
  // Exposing a PlayerProfile id to the client is an already-established
  // safe pattern in this codebase (see lib/auth/player-profile.ts's own
  // getPlayerProfilesByIds doc comment: "Gym/League features key
  // everything by PlayerProfile.id ... never by the auth User.id") — never
  // the raw auth User.id, and never anything sensitive.
  playerId: string;
  displayName: string;
  trainerLevel: number;
  regionId: RegionId;
  regionLabel: string;
  avatarDexNumber: number | null;
  themeId: ProfileThemeId;
  // null when hidden (showAboutMeOnProfile is false) OR genuinely empty —
  // the UI never needs to distinguish the two cases, since both render as
  // "nothing shown".
  aboutMe: string | null;
  isOwner: boolean;
  // FRIENDS PHASE 1 — the VIEWER's own relationship to this profile,
  // computed server-side (public-profile-view.service.ts) from the one
  // Friendship table — drives which state AddFriendButton renders (never
  // guessed/re-derived client-side).
  friendshipStatus: FriendshipStatus;
  // Non-null exactly when friendshipStatus is "pending-incoming" — the
  // underlying Friendship row's own id, letting AddFriendButton
  // accept/decline right from this profile via the existing
  // respondToFriendRequestAction (never a second accept/decline
  // implementation).
  incomingFriendRequestId: string | null;
  // null when the owner has hidden their party (showPartyOnProfile is
  // false) — the UI shows the "party hidden" message in that case, never
  // an empty array (which would instead mean "this player owns no
  // Pokémon", a different, real state this type doesn't need to represent
  // separately since every player has a starter).
  party: PublicPartyMemberView[] | null;
  // null when the owner has hidden their stats (showStatsOnProfile false).
  stats: PublicStatsView | null;
  // PROFILE ACHIEVEMENTS (later task) — the "הישגים" section. Always
  // present (never null) — even when hidden, the UI needs
  // achievements.visibleToViewer to decide whether to render the neutral
  // "user chose to hide" message versus nothing at all; see
  // ProfileAchievementsView's own doc comment for the full privacy
  // contract.
  achievements: ProfileAchievementsView;
  // The owner's structured showcase content — an ADDITIONAL section, never
  // gated by any of the three privacy toggles above (per this feature's
  // own spec: "an additional showcase area, not a replacement for the
  // existing profile header and privacy settings"). Always an array
  // (never null) — an empty array is a real, valid state ("no custom
  // content yet") and the UI renders nothing at all for it, never a
  // broken/empty section.
  contentBlocks: ProfileContentBlock[];
}

// The owner-only edit view model — always the REAL current settings
// regardless of any show*OnProfile toggle (the owner must be able to see
// and change what they're currently hiding), plus a live party preview
// (always the real current party, independent of showPartyOnProfile — see
// this feature's own spec: "the owner may still preview their own party
// while editing").
export interface ProfileEditViewModel {
  aboutMe: string;
  avatarDexNumber: number | null;
  themeId: ProfileThemeId;
  showPartyOnProfile: boolean;
  showStatsOnProfile: boolean;
  showAboutMeOnProfile: boolean;
  // PROFILE ACHIEVEMENTS — the ONE setting that gates the whole "הישגים"
  // section: earned Gym Badges, Regional Medals, AND League Awards (never a
  // separate switch per achievement kind — see this feature's own spec).
  showGymAchievementsOnProfile: boolean;
  partyPreview: PublicPartyMemberView[];
  contentBlocks: ProfileContentBlock[];
}
