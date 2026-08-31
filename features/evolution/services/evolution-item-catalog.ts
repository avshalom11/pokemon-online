import { getAllEvolutionItemEvolutionEntries } from "@/data/pokemon/pokemon-evolutions";
import { getSpeciesById } from "@/features/pokemon/services/species-catalog";

// Pure, framework-free "which Pokémon evolve with this item" view over the
// canonical Evolution-Item table — same "pure formula, no React/Prisma"
// split as evolution-item-eligibility.ts, but catalog-wide (every species
// that CAN use this item, not just the current player's owned ones). Used
// by InventoryItemCard to render an "Evolves:" line, and by
// getEvolutionItemMappings below (Shop's question-mark info dialog) — both
// always derived live from data/pokemon/pokemon-evolutions.ts, never
// hardcoded per item, so a future species added to an item's evolution
// entry needs no UI change anywhere.
//
// A species with exactly one branch for this item (the common case) is
// shown by its own name alone (e.g. "Growlithe"). A species with more than
// one branch sharing this exact item (today, only Clamperl's two Water
// Stone targets) is shown once per branch as "Species → Target" instead,
// since a plain species name alone would be ambiguous about which
// evolution it produces.
export function getEvolutionItemDisplayLabels(itemId: string): string[] {
  const entries = getAllEvolutionItemEvolutionEntries().filter((entry) => entry.evolution.itemId === itemId);

  const entriesBySpecies = new Map<string, typeof entries>();
  for (const entry of entries) {
    const existing = entriesBySpecies.get(entry.speciesId);
    if (existing) {
      existing.push(entry);
    } else {
      entriesBySpecies.set(entry.speciesId, [entry]);
    }
  }

  const labels: string[] = [];
  for (const [speciesId, speciesEntries] of entriesBySpecies) {
    const speciesName = getSpeciesById(speciesId)?.name ?? speciesId;

    if (speciesEntries.length === 1) {
      labels.push(speciesName);
      continue;
    }

    for (const entry of speciesEntries) {
      const targetName = getSpeciesById(entry.evolution.evolvesToSpeciesId)?.name ?? entry.evolution.evolvesToSpeciesId;
      labels.push(`${speciesName} → ${targetName}`);
    }
  }

  return labels;
}

// Structured, uncollapsed source→target rows for one item — every entry
// shown on its own row, always as an explicit pair (unlike
// getEvolutionItemDisplayLabels above, which collapses a single-branch
// species down to its bare name for the compact card summary). This is
// what the Shop's question-mark info dialog renders: e.g. Water Stone
// returns two separate rows (Clamperl -> Huntail, Clamperl -> Gorebyss),
// never one ambiguous "Clamperl" row. Sorted by the source species' own
// dexNumber so the list reads in a stable, Pokédex-familiar order rather
// than raw table-declaration order.
export interface EvolutionItemMapping {
  sourceSpeciesId: string;
  sourceName: string;
  targetSpeciesId: string;
  targetName: string;
}

export function getEvolutionItemMappings(itemId: string): EvolutionItemMapping[] {
  return getAllEvolutionItemEvolutionEntries()
    .filter((entry) => entry.evolution.itemId === itemId)
    .map((entry) => {
      const sourceSpecies = getSpeciesById(entry.speciesId);
      const targetSpecies = getSpeciesById(entry.evolution.evolvesToSpeciesId);

      return {
        sourceSpeciesId: entry.speciesId,
        sourceName: sourceSpecies?.name ?? entry.speciesId,
        targetSpeciesId: entry.evolution.evolvesToSpeciesId,
        targetName: targetSpecies?.name ?? entry.evolution.evolvesToSpeciesId,
        sourceDexNumber: sourceSpecies?.dexNumber ?? Number.POSITIVE_INFINITY,
      };
    })
    .sort((a, b) => a.sourceDexNumber - b.sourceDexNumber)
    .map(({ sourceSpeciesId, sourceName, targetSpeciesId, targetName }) => ({ sourceSpeciesId, sourceName, targetSpeciesId, targetName }));
}

// MEGA EVOLUTION — UI/NAMING FIXES — one row per SOURCE species, carrying
// every one of its own targets together, rather than one row per raw
// mapping. Used by EvolutionItemInfoDialog so a source with more than one
// branch for the same item (Clamperl + Water Stone; Mega Stone's six X/Y/Z
// bases — Charizard/Mewtwo/Raichu/Garchomp/Lucario/Absol) is represented
// exactly once — the compatible BASE Pokémon is what this view
// communicates, never inflated by how many target forms it happens to
// have. A pure grouping step over getEvolutionItemMappings' own output
// (order preserved — first-seen source order, which is already dex-number
// sorted), never a second/hardcoded species list.
export interface GroupedEvolutionItemMapping {
  sourceSpeciesId: string;
  sourceName: string;
  targets: readonly { targetSpeciesId: string; targetName: string }[];
}

// POKÉDEX — FORM VISIBILITY + ACQUISITION HINT FIX — pure "is this species a
// Mega Evolution target" check, derived live from the same canonical
// registry every other view in this file already reads
// (getAllEvolutionItemEvolutionEntries filtered to itemId === "mega-stone")
// — never a second/hardcoded Mega species list, and never inferred from a
// naming/spriteId convention that could silently drift from the real
// registry. Used by the Pokédex's unseen-form acquisition hint (Mega
// species are never wild-encounterable, so they never get a location hint
// — see features/pokedex/utils/pokedex-form-hints.ts).
export function isMegaEvolutionTarget(speciesId: string): boolean {
  return getAllEvolutionItemEvolutionEntries().some(
    (entry) => entry.evolution.itemId === "mega-stone" && entry.evolution.evolvesToSpeciesId === speciesId
  );
}

export function groupEvolutionItemMappingsBySource(mappings: readonly EvolutionItemMapping[]): GroupedEvolutionItemMapping[] {
  const grouped: GroupedEvolutionItemMapping[] = [];
  const indexBySourceId = new Map<string, number>();

  for (const mapping of mappings) {
    const existingIndex = indexBySourceId.get(mapping.sourceSpeciesId);
    if (existingIndex === undefined) {
      indexBySourceId.set(mapping.sourceSpeciesId, grouped.length);
      grouped.push({
        sourceSpeciesId: mapping.sourceSpeciesId,
        sourceName: mapping.sourceName,
        targets: [{ targetSpeciesId: mapping.targetSpeciesId, targetName: mapping.targetName }],
      });
    } else {
      (grouped[existingIndex]!.targets as { targetSpeciesId: string; targetName: string }[]).push({
        targetSpeciesId: mapping.targetSpeciesId,
        targetName: mapping.targetName,
      });
    }
  }

  return grouped;
}
