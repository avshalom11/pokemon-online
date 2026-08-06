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
