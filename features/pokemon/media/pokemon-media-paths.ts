const POKEMON_MEDIA_ROOT = "/assets/pokemon";

// Every Pokémon media asset is derived from its National Pokédex number —
// no per-species image URLs are stored in the catalog. Padded to 4 digits
// (e.g. 1 -> "0001") to match the on-disk filenames; the catalog itself
// stores dexNumber as a plain integer, never a padded string.
function formatDexNumber(dexNumber: number): string {
  return dexNumber.toString().padStart(4, "0");
}

export function getFrontSpritePath(dexNumber: number): string {
  return `${POKEMON_MEDIA_ROOT}/sprites/front/${formatDexNumber(dexNumber)}.gif`;
}

export function getBackSpritePath(dexNumber: number): string {
  return `${POKEMON_MEDIA_ROOT}/sprites/back/${formatDexNumber(dexNumber)}.gif`;
}

export function getShinyFrontSpritePath(dexNumber: number): string {
  return `${POKEMON_MEDIA_ROOT}/sprites/shiny-front/${formatDexNumber(dexNumber)}.gif`;
}

export function getShinyBackSpritePath(dexNumber: number): string {
  return `${POKEMON_MEDIA_ROOT}/sprites/shiny-back/${formatDexNumber(dexNumber)}.gif`;
}

export function getIconPath(dexNumber: number): string {
  return `${POKEMON_MEDIA_ROOT}/icons/${formatDexNumber(dexNumber)}.png`;
}

export function getArtworkPath(dexNumber: number): string {
  return `${POKEMON_MEDIA_ROOT}/artwork/${formatDexNumber(dexNumber)}.png`;
}
