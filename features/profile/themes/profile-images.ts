import { getSpeciesById } from "@/features/pokemon/services/species-catalog";
import { getFrontSpritePath } from "@/features/pokemon/media/pokemon-media-paths";

// Image blocks in the profile content designer — this project has no
// upload/storage system yet (checked: no upload endpoint, no external
// image-hosting integration, no arbitrary-URL image field anywhere). Per
// this feature's own Phase 1 scope, an image block is NEVER an arbitrary
// external URL — it's always one of this small, curated, server-defined
// set, reusing the existing Species Registry + sprite media helper (the
// same pattern features/profile/themes/profile-avatars.ts already
// established for avatars) rather than any new asset/upload work. Adding
// real uploads later only means adding new entries/a new selection UI here
// — the block SHAPE (an opaque `imageId` string — see ProfileImageBlock)
// never has to change.
const PROFILE_IMAGE_SPECIES_IDS = [
  "bulbasaur",
  "charmander",
  "squirtle",
  "pikachu",
  "eevee",
  "charizard",
  "venusaur",
  "blastoise",
  "gyarados",
  "mewtwo",
] as const;

export interface ProfileImageOption {
  // The stable reference stored in a ProfileImageBlock.imageId — the
  // speciesId itself, never a raw URL.
  id: string;
  label: string;
  imageUrl: string;
}

export const PROFILE_IMAGE_OPTIONS: ProfileImageOption[] = PROFILE_IMAGE_SPECIES_IDS.flatMap((speciesId) => {
  const species = getSpeciesById(speciesId);
  // Defensive only — every id above is a real, current Species Registry
  // entry; this just guards against a future data change silently
  // breaking the picker instead of crashing it.
  if (!species) return [];

  return [{ id: species.id, label: species.name, imageUrl: getFrontSpritePath(species.dexNumber) }];
});

// The one place a ProfileImageBlock.imageId is ever validated against the
// allowlist (features/profile/validation/profile-content.schema.ts) — a
// client can never reference an image outside this exact set.
export function isAllowedProfileImageId(imageId: string): boolean {
  return PROFILE_IMAGE_OPTIONS.some((option) => option.id === imageId);
}

export function getProfileImageUrl(imageId: string): string | null {
  return PROFILE_IMAGE_OPTIONS.find((option) => option.id === imageId)?.imageUrl ?? null;
}
