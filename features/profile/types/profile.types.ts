import type { ProfileThemeId } from "../themes/profile-themes";
import type { ProfileContentBlock } from "./profile-content.types";
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

// The one shape both the public visitor view AND the owner's own view of
// their profile page render from — see public-profile-view.service.ts's
// own doc comment for why the owner sees the exact same privacy-filtered
// content as everyone else (only `isOwner` differs, controlling whether
// the Edit Profile button renders at all).
export interface PublicProfileView {
  username: string;
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
  // null when the owner has hidden their party (showPartyOnProfile is
  // false) — the UI shows the "party hidden" message in that case, never
  // an empty array (which would instead mean "this player owns no
  // Pokémon", a different, real state this type doesn't need to represent
  // separately since every player has a starter).
  party: PublicPartyMemberView[] | null;
  // null when the owner has hidden their stats (showStatsOnProfile false).
  stats: PublicStatsView | null;
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
  username: string;
  aboutMe: string;
  avatarDexNumber: number | null;
  themeId: ProfileThemeId;
  showPartyOnProfile: boolean;
  showStatsOnProfile: boolean;
  showAboutMeOnProfile: boolean;
  partyPreview: PublicPartyMemberView[];
  contentBlocks: ProfileContentBlock[];
}
