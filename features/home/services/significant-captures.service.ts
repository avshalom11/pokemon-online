import "server-only";

import { POKEMON_DATA } from "@/data/pokemon/pokemon-data";
import { getJerusalemDateKey } from "@/features/daily-battles/services/daily-battle-count.service";
import { getFrontSpritePath } from "@/features/pokemon/media/pokemon-media-paths";
import { getSpeciesById } from "@/features/pokemon/services/species-catalog";
import { getPlayerProfilesByIds } from "@/lib/auth/player-profile";
import { prisma } from "@/lib/db/prisma";
import type { PokemonRarity } from "@/shared/types/pokemon";

export interface SignificantCaptureView {
  speciesName: string;
  playerDisplayName: string;
  // Pre-formatted "DD/MM/YYYY · HH:MM" (Asia/Jerusalem wall-clock) — see
  // formatCaptureTimestamp below. Home is a server component (per this
  // project's own "pages display data" rule, home-data.service.ts's doc
  // comment), so formatting here avoids a second, client-side timezone
  // computation that could disagree with the server's own "today" check.
  capturedAtLabel: string;
  spriteUrl: string;
}

export interface SignificantCapturesToday {
  veryRare: SignificantCaptureView | null;
  legendary: SignificantCaptureView | null;
}

// Species data is the static catalog (data/pokemon/pokemon-data.ts), never
// stored per-row in Prisma — so "which species are Very Rare/Legendary" is
// resolved once here into a plain id list, then used as a `speciesId: {
// in: [...] }` filter against the real PlayerPokemon table. Memoized: the
// catalog is static for the process lifetime, and this runs on every Home
// load.
const speciesIdsByRarity = new Map<PokemonRarity, string[]>();
function getSpeciesIdsForRarity(rarity: PokemonRarity): string[] {
  let ids = speciesIdsByRarity.get(rarity);
  if (!ids) {
    ids = POKEMON_DATA.filter((species) => species.rarity === rarity).map((species) => species.id);
    speciesIdsByRarity.set(rarity, ids);
  }
  return ids;
}

// "DD/MM/YYYY · HH:MM" in Asia/Jerusalem wall-clock time, built from
// Intl.DateTimeFormat parts (never a locale's own separator choice) so the
// exact format the ticket specifies (e.g. "19/08/2026 · 14:32") is
// guaranteed regardless of the server's own locale/timezone.
function formatCaptureTimestamp(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Jerusalem",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${get("day")}/${get("month")}/${get("year")} · ${get("hour")}:${get("minute")}`;
}

// The latest capture (source === "capture" — never an Egg/starter/other
// acquisition, see PlayerPokemonAcquisitionSource) of the given rarity,
// ANY player, restricted to today's Asia/Jerusalem calendar date. Ordered
// by createdAt desc + findFirst: since rows are strictly time-ordered, the
// single most recent qualifying row IS "today's latest" whenever one
// exists — if even that most recent row predates today, nothing today
// qualifies (never falls back to yesterday's capture).
async function getLatestQualifyingCaptureToday(rarity: PokemonRarity, now: Date): Promise<SignificantCaptureView | null> {
  const speciesIds = getSpeciesIdsForRarity(rarity);
  if (speciesIds.length === 0) return null;

  const row = await prisma.playerPokemon.findFirst({
    where: { speciesId: { in: speciesIds }, source: "capture" },
    orderBy: { createdAt: "desc" },
  });
  if (!row) return null;
  if (getJerusalemDateKey(row.createdAt) !== getJerusalemDateKey(now)) return null;

  const species = getSpeciesById(row.speciesId);
  if (!species) return null;

  const profiles = await getPlayerProfilesByIds([row.playerId]);
  const playerDisplayName = profiles.get(row.playerId) ?? "שחקן";

  return {
    speciesName: species.name,
    playerDisplayName,
    capturedAtLabel: formatCaptureTimestamp(row.createdAt),
    spriteUrl: getFrontSpritePath(species),
  };
}

// The Home page's own read (features/home/services/home-data.service.ts) —
// today's latest Very Rare and Legendary captures, each independently null
// when nobody has caught one yet today. `now` defaults to the real current
// instant (same "optional now, real Date by default" precedent as
// getJerusalemDateKey/getCurrentLeagueTournamentOccurrenceWindow) — tests
// pass a fixed instant to deterministically exercise the Asia/Jerusalem day
// boundary.
export async function getSignificantCapturesToday(now: Date = new Date()): Promise<SignificantCapturesToday> {
  const [veryRare, legendary] = await Promise.all([
    getLatestQualifyingCaptureToday("very-rare", now),
    getLatestQualifyingCaptureToday("legendary", now),
  ]);
  return { veryRare, legendary };
}
