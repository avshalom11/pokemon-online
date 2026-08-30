import type { MajorStatus } from "@/features/battle/status/major-status";
import type { ShopItem } from "@/features/shop/types/shop.types";
import type { OwnedPokemon } from "@/shared/types/player-pokemon";

// STATUS-HEALING ITEMS — pure, framework-free eligibility filter for a
// status-curing Medicine item, same "no React, no Prisma" split
// evolution-item-eligibility.ts already establishes for evolution items.
// Deliberately callable client-side: the Inventory screen already has the
// player's full owned-Pokémon list in props (features/pokemon/services/
// player-pokemon.ts's getAllOwnedPokemon, party AND storage), and
// OwnedPokemon already carries status/currentHp directly — no extra round
// trip is needed just to decide who to show here.
//
// This is DISPLAY-ONLY. applyMedicineItemUse (use-medicine.service.ts) is
// the sole authority on whether a use actually succeeds — it re-derives
// this exact same rule itself, server-side, against a fresh DB read, and
// never trusts that a candidate shown here is still valid by the time the
// player actually confirms.
export interface MedicineStatusCandidate {
  playerPokemonId: string;
  nickname: string | null;
  level: number;
  species: OwnedPokemon["species"];
  status: MajorStatus;
}

// Deny-by-default, mirroring applyMedicineItemUse's own rule exactly:
// fainted Pokémon never qualify, a Pokémon with no status never qualifies,
// and — for the five single-status items — a Pokémon carrying any OTHER
// status never qualifies either. Full Heal (curesStatus === "all") is the
// one item where any of the 5 MajorStatus values qualifies.
export function getMedicineStatusCandidates(item: ShopItem, ownedPokemon: readonly OwnedPokemon[]): MedicineStatusCandidate[] {
  if (item.medicineEffectKind !== "cure-status" || !item.curesStatus) {
    return [];
  }

  const candidates: MedicineStatusCandidate[] = [];

  for (const pokemon of ownedPokemon) {
    if (pokemon.currentHp <= 0) continue;

    const status = pokemon.status as MajorStatus | null;
    if (status === null) continue;
    if (item.curesStatus !== "all" && status !== item.curesStatus) continue;

    candidates.push({
      playerPokemonId: pokemon.id,
      nickname: pokemon.nickname ?? null,
      level: pokemon.level,
      species: pokemon.species,
      status,
    });
  }

  return candidates;
}
