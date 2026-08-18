import type { PokemonRarity, PokemonSpecies, PokemonType } from "@/shared/types/pokemon";
import type { NpcTeamMember, NpcTeamSlotFallbackTier } from "../types/npc-team.types";

// GYMS & LEAGUES PHASE 2 — the ONE generic, data-driven NPC-team selection
// algorithm every fixed Gym/Regional-Champion team is built from (via
// scripts/generate-gym-npc-teams.ts). Pure and deterministic: no
// Math.random anywhere, same inputs always produce the same team, so
// running the generator again is always reproducible. This module never
// itself decides WHAT the 90 teams contain — see gym-npc-teams.ts/
// regional-champion-teams.ts for the actual (generated, checked-in) fixed
// data; this file is only the reusable mechanism.
//
// Source of truth for region membership is deliberately
// getSpeciesForRegion (data/pokemon/pokemon-region-registry.ts) — the same
// "broad regional pool" features/eggs/services/hatch-pool.service.ts
// already reads for a non-encounter, region-scoped selection, never
// data/zones/* (zone/encounter tables are a narrower, curated subset, not
// "every species that belongs to this region"). Rarity is always
// PokemonSpecies.rarity — the REAL rarity — never the encounter/effective
// rarity engine/encounter-rarity/get-effective-encounter-rarity.ts
// computes for wild encounters.

// No ordered-rarity-tier constant exists elsewhere in the codebase (the
// few files that need "common"/"rare"/"very-rare"/"legendary" together
// just repeat the literal array) — this is the one place "one tier lower"
// is defined for NPC team selection specifically.
const RARITY_TIERS: readonly PokemonRarity[] = ["common", "rare", "very-rare", "legendary"];

function oneTierLower(rarity: PokemonRarity): PokemonRarity | null {
  const index = RARITY_TIERS.indexOf(rarity);
  return index > 0 ? RARITY_TIERS[index - 1] : null;
}

export interface NpcTeamSlotRequest {
  readonly targetRarity: PokemonRarity;
  // The Gym's own type specialization — undefined for a Regional Champion
  // slot (no type specialization, "Type is only a preference" doesn't even
  // apply since there is no type to prefer).
  readonly preferredType?: PokemonType;
  // Ordered "previous design" hints (species ids), tried before the
  // deterministic fallback search below — see npc-team-preferences.ts's
  // own doc comment for why these are guidance, never authority. A hint
  // that doesn't validate (wrong region/rarity/already used in this team)
  // is silently skipped, never forced.
  readonly preferredSpeciesIds?: readonly string[];
}

function bySpeciesId(speciesId: string, pool: readonly PokemonSpecies[]): PokemonSpecies | undefined {
  return pool.find((species) => species.id === speciesId);
}

// Deterministic tie-break among multiple equally-valid candidates when no
// preference hint applies: ascending dexNumber — stable, reproducible, and
// never a hidden/arbitrary "coolness" judgment call. Section 5's "prefer
// recognizable/strong Pokémon" is honored instead via
// npc-team-preferences.ts's explicit hints for Regional Champions and the
// one given Gym Leader example; every other slot (every Easy/Medium
// trainer, and 26 of 27 Gym Leaders with no curated hint) falls through to
// this same deterministic rule, so the whole catalog stays reproducible
// without needing a "which Pokémon is more iconic" data source that
// doesn't exist in this project.
function lowestDexNumber(candidates: readonly PokemonSpecies[]): PokemonSpecies | undefined {
  return [...candidates].sort((a, b) => a.dexNumber - b.dexNumber)[0];
}

// Selects one team's worth of members from `pool` (deliberately injected,
// never fetched internally — the caller passes getSpeciesForRegion(regionId)
// (data/pokemon/pokemon-region-registry.ts) in production; a test passes a
// tiny hand-built fixture — so this function has zero I/O/global-data
// dependencies of its own and is trivially unit-testable), honoring the
// approved absolute priority order (section 2): for each slot, in order,
// try (1) exact rarity + Gym type, (2) exact rarity + any type, (3) one
// rarity tier lower + Gym type, (4) one rarity tier lower + any type — a
// Legendary slot skips (3)/(4) entirely (Legendary must remain Legendary,
// never downgrades). No species repeats within the returned team (`used`
// is checked/updated per slot). Returns one `null` entry per slot that
// could not be filled at all (every candidate already used, or the pool
// genuinely has none) — the caller (the generator script) is the one
// place that decides whether an unfillable slot is a hard error, never
// this pure function silently guessing a substitute.
// GYM TEAM VARIETY (later task) — `initiallyUsed` lets a caller seed the
// dedup set with species already picked elsewhere (the generator script
// uses this to also avoid repeating a species already given to an EARLIER
// battle slot within the SAME Gym — Easy's picks seed Medium's `used` set,
// Easy+Medium seed Leader's). Optional and defaults to empty so every
// existing call site (Regional Champion selection, which has no
// cross-team dedup requirement) is unaffected.
export function selectNpcTeam(
  pool: readonly PokemonSpecies[],
  slotRequests: readonly NpcTeamSlotRequest[],
  initiallyUsed: ReadonlySet<string> = new Set()
): (NpcTeamMember | null)[] {
  const used = new Set(initiallyUsed);
  const results: (NpcTeamMember | null)[] = [];

  for (const request of slotRequests) {
    const member = selectOneSlot(pool, request, used);
    results.push(member);
    if (member) used.add(member.speciesId);
  }

  return results;
}

function candidatesFor(pool: readonly PokemonSpecies[], rarity: PokemonRarity, used: ReadonlySet<string>): PokemonSpecies[] {
  return pool.filter((species) => species.rarity === rarity && !used.has(species.id));
}

function selectOneSlot(pool: readonly PokemonSpecies[], request: NpcTeamSlotRequest, used: ReadonlySet<string>): NpcTeamMember | null {
  const { targetRarity, preferredType } = request;

  // Preference hints first — the first hint that resolves to a real,
  // still-unused species of exactly the target rarity in this region wins
  // the slot outright, regardless of type (a curated design already
  // reflects the intended type theme where one exists — see
  // npc-team-preferences.ts).
  for (const hintId of request.preferredSpeciesIds ?? []) {
    const species = bySpeciesId(hintId, pool);
    if (!species || species.rarity !== targetRarity || used.has(species.id)) continue;
    return {
      speciesId: species.id,
      targetRarity,
      fallbackTier: tierFor(species, targetRarity, preferredType, /* isLowerRarity */ false),
    };
  }

  // Priority 1/2 — exact target rarity.
  const exact = candidatesFor(pool, targetRarity, used);
  const exactPicked = pickPreferringType(exact, preferredType, false, targetRarity === "legendary");
  if (exactPicked) {
    return { speciesId: exactPicked.speciesId, targetRarity, fallbackTier: exactPicked.fallbackTier };
  }

  // Legendary never downgrades a tier — stop here (unfillable) rather than
  // falling through to Priority 3/4 (approved design, section 2).
  if (targetRarity === "legendary") return null;

  // Priority 3/4 — one rarity tier lower.
  const lowerRarity = oneTierLower(targetRarity);
  if (!lowerRarity) return null;

  const lower = candidatesFor(pool, lowerRarity, used);
  const lowerPicked = pickPreferringType(lower, preferredType, /* isLowerRarity */ true);
  if (lowerPicked) {
    return { speciesId: lowerPicked.speciesId, targetRarity, fallbackTier: lowerPicked.fallbackTier };
  }

  return null;
}

function pickPreferringType(
  candidates: readonly PokemonSpecies[],
  preferredType: PokemonType | undefined,
  isLowerRarity = false,
  isLegendarySlot = false
): { speciesId: string; fallbackTier: NpcTeamSlotFallbackTier } | null {
  if (preferredType) {
    const typeMatches = candidates.filter((species) => species.types.includes(preferredType));
    const best = lowestDexNumber(typeMatches);
    if (best) {
      return { speciesId: best.id, fallbackTier: isLowerRarity ? "lower-rarity-matching-type" : "exact-rarity-matching-type" };
    }
  }

  const best = lowestDexNumber(candidates);
  if (!best) return null;

  if (!preferredType) return { speciesId: best.id, fallbackTier: "no-type-preference" };
  if (isLegendarySlot) return { speciesId: best.id, fallbackTier: "legendary-same-region-off-type" };
  return { speciesId: best.id, fallbackTier: isLowerRarity ? "lower-rarity-off-type" : "exact-rarity-off-type" };
}

// Tier classification for a preference-hint pick — mirrors
// pickPreferringType's own tier labels, but a Legendary hint that lands
// off-type is labeled distinctly ("legendary-same-region-off-type") since
// section 12's audit treats a Legendary's type as a pure preference, never
// a fallback signal the way it is for the other three rarities.
function tierFor(
  species: PokemonSpecies,
  targetRarity: PokemonRarity,
  preferredType: PokemonType | undefined,
  isLowerRarity: boolean
): NpcTeamSlotFallbackTier {
  if (!preferredType) return "no-type-preference";
  const matchesType = species.types.includes(preferredType);
  if (targetRarity === "legendary") return matchesType ? "exact-rarity-matching-type" : "legendary-same-region-off-type";
  if (matchesType) return isLowerRarity ? "lower-rarity-matching-type" : "exact-rarity-matching-type";
  return isLowerRarity ? "lower-rarity-off-type" : "exact-rarity-off-type";
}
