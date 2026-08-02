import { getSpeciesById } from "@/features/pokemon/services/species-catalog";
import { getFrontSpritePath } from "@/features/pokemon/media/pokemon-media-paths";

// A small curated set of selectable profile avatars — reuses the existing
// Species Registry + sprite media helper (never a new image asset, never a
// raw/arbitrary URL) so "choose an avatar" never needs an upload/storage
// service. Each option's speciesId is real Species Registry data; the dex
// number (the only value actually persisted — PlayerProfile.avatarDexNumber)
// and image URL are both derived from it, never hardcoded independently.
const AVATAR_SPECIES_IDS = ["bulbasaur", "charmander", "squirtle", "pikachu", "eevee"] as const;

export interface ProfileAvatarOption {
  dexNumber: number;
  label: string;
  imageUrl: string;
}

export const PROFILE_AVATAR_OPTIONS: ProfileAvatarOption[] = AVATAR_SPECIES_IDS.flatMap((speciesId) => {
  const species = getSpeciesById(speciesId);
  // Defensive only — every id above is a real, current Species Registry
  // entry; this just guards against a future data change silently breaking
  // the avatar picker instead of crashing it.
  if (!species) return [];

  return [{ dexNumber: species.dexNumber, label: species.name, imageUrl: getFrontSpritePath(species.dexNumber) }];
});

// Every dex number a player is allowed to persist as their avatar — the one
// place PlayerProfile.avatarDexNumber is ever validated against (features/
// profile/validation/profile.schema.ts), so a client can never set an
// arbitrary/unlisted dex number as their avatar.
const ALLOWED_AVATAR_DEX_NUMBERS: readonly number[] = PROFILE_AVATAR_OPTIONS.map((option) => option.dexNumber);

export function isAllowedAvatarDexNumber(dexNumber: number): boolean {
  return ALLOWED_AVATAR_DEX_NUMBERS.includes(dexNumber);
}

export function getAvatarImageUrl(dexNumber: number | null): string | null {
  if (dexNumber === null) return null;
  return PROFILE_AVATAR_OPTIONS.find((option) => option.dexNumber === dexNumber)?.imageUrl ?? null;
}
