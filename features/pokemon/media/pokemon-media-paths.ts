const POKEMON_MEDIA_ROOT = "/assets/pokemon";

// Every Pokémon media asset is derived from its National Pokédex number —
// no per-species image URLs are stored in the catalog. Padded to 4 digits
// (e.g. 1 -> "0001") to match the on-disk filenames; the catalog itself
// stores dexNumber as a plain integer, never a padded string.
// Exported so display contexts that need the padded dex number as text
// (e.g. the My Pokémon details panel's "#0004" label) reuse this instead of
// re-implementing the padding rule.
export function formatDexNumber(dexNumber: number): string {
  return dexNumber.toString().padStart(4, "0");
}

// Anything front/back sprite paths can be derived from — every current
// caller already has a PokemonSpecies (or a slimmer projection carrying
// these same two fields, e.g. PublicPartyMemberView) in scope, so passing
// it directly here needs no extra plumbing. A plain interface rather than
// importing PokemonSpecies itself, so this module stays decoupled from the
// full species shape — same "no per-species image URLs stored in the
// catalog" precedent this file already followed before Forms existed.
export interface SpriteSource {
  dexNumber: number;
  // See PokemonSpecies.spriteId's own doc comment (shared/types/pokemon.ts).
  // Absent means "derive the filename from dexNumber", the default for
  // every species with no dedicated alternate-form sprite sheet.
  spriteId?: string;
  // See PokemonSpecies.spriteExt's own doc comment (shared/types/pokemon.ts).
  // Absent means "gif", the real on-disk extension for every species before
  // Paldea's mixed GIF/PNG sprite sheets.
  spriteExt?: "gif" | "png";
}

function resolveSpriteStem(source: SpriteSource): string {
  return source.spriteId ?? formatDexNumber(source.dexNumber);
}

function resolveSpriteExt(source: SpriteSource): string {
  return source.spriteExt ?? "gif";
}

export function getFrontSpritePath(source: SpriteSource): string {
  return `${POKEMON_MEDIA_ROOT}/sprites/front/${resolveSpriteStem(source)}.${resolveSpriteExt(source)}`;
}

export function getBackSpritePath(source: SpriteSource): string {
  return `${POKEMON_MEDIA_ROOT}/sprites/back/${resolveSpriteStem(source)}.${resolveSpriteExt(source)}`;
}

export function getShinyFrontSpritePath(source: SpriteSource): string {
  return `${POKEMON_MEDIA_ROOT}/sprites/shiny-front/${resolveSpriteStem(source)}.${resolveSpriteExt(source)}`;
}

export function getShinyBackSpritePath(source: SpriteSource): string {
  return `${POKEMON_MEDIA_ROOT}/sprites/shiny-back/${resolveSpriteStem(source)}.${resolveSpriteExt(source)}`;
}

export function getIconPath(dexNumber: number): string {
  return `${POKEMON_MEDIA_ROOT}/icons/${formatDexNumber(dexNumber)}.png`;
}

export function getArtworkPath(dexNumber: number): string {
  return `${POKEMON_MEDIA_ROOT}/artwork/${formatDexNumber(dexNumber)}.png`;
}
