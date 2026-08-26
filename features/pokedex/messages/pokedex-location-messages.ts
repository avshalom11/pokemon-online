import { REGION_DISPLAY_NAMES_HE } from "@/features/gyms/data/gym-labels";
import type { SpeciesEncounterLocation } from "@/data/zones/zone-data";
import type { PokemonRarity } from "@/shared/types/pokemon";
import type { ZoneId } from "@/shared/types/zone";

// POKÉDEX — LOCATION HINTS FOR UNSEEN POKÉMON (PokedexUnseenPanel.tsx).
// Every sentence below is copied VERBATIM from this task's own approved
// copy — deliberately never algorithmically "cleaned up" into one generic
// skeleton, since the approved Hebrew genuinely uses a different
// preposition per zone type (e.g. Cave's "במערות של מחוז X" vs Grass's
// "באזורי הדשא במחוז X") and per rarity tier (Legendary's "של מחוז X" vs
// the other two tiers' "במחוז X", plus "אי־שם"/"במעמקי" wording only
// Legendary uses). {מחוז} is always the one substitution slot, filled from
// REGION_DISPLAY_NAMES_HE (features/gyms/data/gym-labels.ts) — reused
// rather than a second region-name table: shared/types/region-labels.ts
// also exists, but its own "פלדיאה" spelling for Paldea does not match
// this task's required "פלדאה", so it is deliberately not used here.

// Rarity collapses to exactly 3 wording tiers — "common" and "rare" share
// identical copy (see the task's own combined "COMMON / RARE" section).
type LocationHintTier = "common-or-rare" | "very-rare" | "legendary";

function tierFor(rarity: PokemonRarity): LocationHintTier {
  if (rarity === "very-rare") return "very-rare";
  if (rarity === "legendary") return "legendary";
  return "common-or-rare";
}

const LEAD_IN: Record<LocationHintTier, string> = {
  "common-or-rare": "הפוקימון הזה נוהג להימצא ",
  "very-rare": "מאמנים מדווחים שהפוקימון הזה נצפה ",
  legendary: "אגדות עתיקות מספרות שהפוקימון הזה מסתתר ",
};

// The {מחוז}-templated clause per zone type — identical text for the
// "common-or-rare" and "very-rare" tiers (only LEAD_IN differs between
// them); "legendary" gets its own separate table below.
const STANDARD_CLAUSE: Record<ZoneId, string> = {
  grassland: "באזורי הדשא במחוז {מחוז}",
  water: "באזורי המים במחוז {מחוז}",
  cave: "במערות של מחוז {מחוז}",
  lava: "באזורי הלבה במחוז {מחוז}",
  beach: "באזורי החוף במחוז {מחוז}",
  "haunted-house": "בבית הרוחות במחוז {מחוז}",
};

const LEGENDARY_CLAUSE: Record<ZoneId, string> = {
  grassland: "אי־שם באזורי הדשא של מחוז {מחוז}",
  water: "אי־שם באזורי המים של מחוז {מחוז}",
  cave: "במעמקי המערות של מחוז {מחוז}",
  lava: "אי־שם באזורי הלבה של מחוז {מחוז}",
  beach: "אי־שם באזורי החוף של מחוז {מחוז}",
  "haunted-house": "בבית הרוחות של מחוז {מחוז}",
};

function clauseFor(tier: LocationHintTier, location: SpeciesEncounterLocation): string {
  const template = tier === "legendary" ? LEGENDARY_CLAUSE[location.zoneId] : STANDARD_CLAUSE[location.zoneId];
  return template.replace("{מחוז}", REGION_DISPLAY_NAMES_HE[location.regionId]);
}

// Never repeats an identical (region, zone) location — a species can't
// appear twice in the exact same zone's own encounter table anyway (see
// getSpeciesEncounterLocations's own doc comment), but this also guards
// the same pair being passed in twice by a caller.
function dedupeLocations(locations: readonly SpeciesEncounterLocation[]): SpeciesEncounterLocation[] {
  const seen = new Set<string>();
  const result: SpeciesEncounterLocation[] = [];
  for (const location of locations) {
    const key = `${location.regionId}:${location.zoneId}`;
    if (!seen.has(key)) {
      seen.add(key);
      result.push(location);
    }
  }
  return result;
}

// Joins every distinct location's own clause into one flowing sentence —
// the approved multi-location example joins with a bare "ו" glued directly
// onto the final item, no hyphen, and a serial comma before every earlier
// item: "...קאנטו ובמערות של מחוז ג'וטו.".
function joinClauses(clauses: readonly string[]): string {
  if (clauses.length === 1) return clauses[0]!;
  return `${clauses.slice(0, -1).join(", ")} ו${clauses[clauses.length - 1]}`;
}

export function pokedexLocationHint(rarity: PokemonRarity, locations: readonly SpeciesEncounterLocation[]): string {
  const tier = tierFor(rarity);
  const clauses = dedupeLocations(locations).map((location) => clauseFor(tier, location));
  return `${LEAD_IN[tier]}${joinClauses(clauses)}.`;
}

// A species with no real zone-encounter entry at all (a starter, an
// evolution-only form, ...) — getSpeciesEncounterLocations returns an
// empty list for this, never a fabricated location.
export const pokedexNoKnownLocationMessage = "טרם ידוע היכן ניתן למצוא פוקימון זה בטבע.";
