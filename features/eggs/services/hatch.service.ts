import "server-only";

import { calculatePokemonHpStat } from "@/engine/battle/pokemon-stat-calculations";
import { rollHatchLevel } from "@/features/eggs/services/hatch-level.service";
import { rollHatchSpecies } from "@/features/eggs/services/hatch-pool.service";
import { isIncubatorPermanent } from "@/features/eggs/services/incubator.service";
import { isIncubationReady } from "@/features/eggs/services/incubation.service";
import { getFirstEmptyPartySlot } from "@/features/party/utils/party-rules";
import { createOwnedPokemon } from "@/features/pokemon/services/create-owned-pokemon.service";
import { getFrontSpritePath } from "@/features/pokemon/media/pokemon-media-paths";
import { getTotalXpRequiredForPokemonLevel } from "@/features/pokemon-progression/pokemon-progression-calculations";
import { prisma } from "@/lib/db/prisma";
import type { PokemonRarity } from "@/shared/types/pokemon";
import { toRegionId, type RegionId } from "@/shared/types/region";

export interface HatchOutcome {
  ownedPokemonId: string;
  speciesId: string;
  displayName: string;
  level: number;
  rarity: PokemonRarity;
  regionId: RegionId;
  spriteUrl: string;
  addedToParty: boolean;
}

export type HatchIncubationResult =
  | { status: "hatched"; result: HatchOutcome; incubatorId: string; incubatorConsumed: boolean }
  | { status: "not-found" }
  | { status: "not-ready" }
  | { status: "empty-pool" };

// EGGS PHASE 4 — the one server-side hatch entry point. `incubationId` is
// the incubation's own primary key (PlayerEggIncubation.ownedEggId — see
// that model's own doc comment). Never auto-called: the player must
// explicitly trigger this (a future Hatchery action), and readiness alone
// (isIncubationReady) never causes a hatch by itself — Phase 3's own
// progressActiveIncubations already established "ready eggs just sit ready
// until consumed."
//
// Species/level selection (rollHatchSpecies/rollHatchLevel — both pure,
// randomSource-injectable, same convention every other production roll in
// this project already uses) happens BEFORE the consuming transaction
// starts: an empty region+rarity pool must fail with nothing at all
// consumed, never a partial write followed by a rollback that still leaves
// ambiguity about what almost happened.
export async function hatchIncubation(
  playerId: string,
  incubationId: string,
  randomSource?: () => number
): Promise<HatchIncubationResult> {
  const incubation = await prisma.playerEggIncubation.findUnique({ where: { ownedEggId: incubationId } });
  if (!incubation) return { status: "not-found" };

  const incubator = await prisma.playerIncubator.findUnique({ where: { id: incubation.incubatorId } });
  if (!incubator || incubator.playerId !== playerId) return { status: "not-found" };

  const egg = await prisma.playerOwnedEgg.findUnique({ where: { id: incubation.ownedEggId } });
  if (!egg || egg.playerId !== playerId) return { status: "not-found" };

  if (!isIncubationReady(incubation)) return { status: "not-ready" };

  const regionId = toRegionId(egg.regionId);
  const rarity = egg.rarity as PokemonRarity;

  const species = rollHatchSpecies(regionId, rarity, randomSource);
  if (!species) return { status: "empty-pool" };

  const level = rollHatchLevel(species.id, randomSource);
  const currentHp = calculatePokemonHpStat(species.baseStats.health, level);

  return prisma.$transaction(async (tx) => {
    // The race guard: matches the exact battleProgress this call already
    // read, mirroring the same "exact-value WHERE, count === 0 means
    // someone else already claimed it" idiom promoteToNextEncounter
    // (battle-session.service.ts) and endBattleSession/attemptCapture
    // (capture.service.ts) already establish. A racing/retried hatch call
    // for the same incubation — or a battle victory that happened to
    // progress it in the same instant — finds zero rows here and aborts
    // cleanly before creating anything, so the same incubation can never
    // hatch twice.
    const removed = await tx.playerEggIncubation.deleteMany({
      where: { ownedEggId: incubation.ownedEggId, incubatorId: incubation.incubatorId, battleProgress: incubation.battleProgress },
    });
    if (removed.count === 0) return { status: "not-ready" };

    // The egg itself is consumed — its PlayerOwnedEgg row is deleted, never
    // left behind as a dangling "already hatched" row.
    await tx.playerOwnedEgg.delete({ where: { id: egg.id } });

    // INCUBATOR EXPANSION — the incubator that held this egg is consumed
    // ONLY if it's a single-use instance (isIncubatorPermanent false: every
    // Shop-purchased or chest-granted incubator — see incubator.service.ts's
    // grantIncubator). The player's one permanent starter incubator is
    // never touched here: it's reusable equipment, immediately free to
    // hold a different egg next, exactly like every incubator was in
    // Phase 1. Runs inside this same transaction so "consume the
    // incubator" and "create the Pokémon" always commit or roll back
    // together — a failed Pokémon creation can never leave a silently
    // vanished incubator behind.
    const incubatorConsumed = !isIncubatorPermanent(incubator);
    if (incubatorConsumed) {
      await tx.playerIncubator.delete({ where: { id: incubator.id } });
    }

    // createOwnedPokemon (shared with capture.service.ts/select-starter.
    // service.ts) — the one canonical PlayerPokemon creation path, same
    // ownership architecture every other newly owned Pokémon already uses.
    // partySlot is deliberately omitted here (defaults to null, storage
    // only) — the auto-add-to-party step right below is what may promote
    // it out of that default, never this call itself.
    const { pokemon } = await createOwnedPokemon(tx, {
      playerId,
      speciesId: species.id,
      level,
      // Same "total-XP baseline consistent with the level it's created
      // at" convention capture.service.ts/select-starter.service.ts
      // already establish — never a stale `experience: 0`.
      experience: getTotalXpRequiredForPokemonLevel(level),
      currentHp,
      isStarter: false,
      source: "egg",
    });

    // EGG HATCH — AUTO-ADD TO PARTY IF SPACE, matching capture.service.ts's
    // own attemptCapture exactly (same getFirstEmptyPartySlot helper, same
    // "read current occupancy fresh inside this transaction, try/catch the
    // update, never let a race abort an otherwise-successful hatch" shape —
    // see that function's own doc comment for why the try/catch exists).
    let addedToParty = false;
    const currentParty = await tx.playerPokemon.findMany({
      where: { playerId, partySlot: { not: null } },
      select: { partySlot: true },
    });
    const emptySlot = getFirstEmptyPartySlot(currentParty.map((member) => member.partySlot as number));
    if (emptySlot !== null) {
      try {
        await tx.playerPokemon.update({ where: { id: pokemon.id }, data: { partySlot: emptySlot } });
        addedToParty = true;
      } catch {
        // Left in storage — see this block's own doc comment.
      }
    }

    return {
      status: "hatched",
      incubatorId: incubator.id,
      incubatorConsumed,
      result: {
        ownedPokemonId: pokemon.id,
        speciesId: species.id,
        displayName: species.name,
        level,
        rarity,
        regionId,
        spriteUrl: getFrontSpritePath(species),
        addedToParty,
      },
    };
  });
}
