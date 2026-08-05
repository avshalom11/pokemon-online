export type PokemonType =
  | "normal"
  | "fire"
  | "water"
  | "electric"
  | "grass"
  | "ice"
  | "fighting"
  | "poison"
  | "ground"
  | "flying"
  | "psychic"
  | "bug"
  | "rock"
  | "ghost"
  | "dragon"
  | "dark"
  | "steel"
  | "fairy";

export type PokemonRarity =
  | "common"
  | "rare"
  | "very-rare"
  | "legendary";

export interface PokemonBaseStats {
  health: number;
  attack: number;
  defense: number;
  specialAttack: number;
  specialDefense: number;
  speed: number;
}

export interface PokemonSpecies {
  id: string;
  name: string;
  description: string;

  // National Pokédex number. The single source used to derive every media
  // asset path (sprites, icons, artwork) — see
  // features/pokemon/media/pokemon-media-paths.ts.
  dexNumber: number;

  types: PokemonType[];
  rarity: PokemonRarity;

  baseStats: PokemonBaseStats;

  imageUrl: string;

  // Whether this species can be chosen as a first Pokémon during onboarding.
  isStarter?: boolean;

  // ==========================================================================
  // Pokémon Forms — see features/pokemon/forms/pokemon-forms.ts for the
  // grouping/lookup logic built on these three fields. A species with
  // neither formOf nor any sibling pointing formOf at it is just a normal,
  // single-form species (every species today) — these fields are additive
  // and every existing entry works unchanged with all three left unset.
  // ==========================================================================

  // Set only on an ALTERNATE form (e.g. "deoxys-attack") — the species id of
  // the BASE/headline form it belongs to (e.g. "deoxys"). The base form
  // itself never sets this. Every species sharing a formOf group must share
  // the same dexNumber (enforced by data/pokemon/pokemon-data.test.ts) — a
  // Form is a different appearance of the same National Dex entry, never a
  // different one. Species ids stay fully independent either way (e.g.
  // "deoxys" vs "deoxys-attack") — see that module's own doc comment for why
  // a plain foreign-key field here was chosen over a hardcoded id union.
  formOf?: string;

  // Display label for this specific form (e.g. "Normal Form", "Attack
  // Form"). Optional even on a species with forms — falls back to this
  // species' own `name` wherever it's read (getFormLabel), so a species
  // never NEEDS this just to exist in a forms group.
  formLabel?: string;

  // Sprite filename stem override — see features/pokemon/media/
  // pokemon-media-paths.ts's SpriteSource. Absent (the default for every
  // species today) means the sprite path is derived from `dexNumber`
  // (e.g. dexNumber 386 -> "0386.gif"). Set only when a species' real sprite
  // file doesn't live at its own dexNumber's default filename — the normal
  // case for an alternate form sharing a base form's dexNumber (e.g. Deoxys
  // Attack Form -> spriteId "0386A" -> "0386A.gif"), never used to rename a
  // single-form species' sprite for any other reason.
  spriteId?: string;
}