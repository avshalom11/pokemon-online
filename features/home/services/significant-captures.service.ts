import "server-only";

import { POKEMON_DATA } from "@/data/pokemon/pokemon-data";
import { getFrontSpritePath } from "@/features/pokemon/media/pokemon-media-paths";
import { getSpeciesById } from "@/features/pokemon/services/species-catalog";
import { getPlayerIdentitiesByIds } from "@/lib/auth/player-profile";
import { prisma } from "@/lib/db/prisma";
import type { PokemonRarity } from "@/shared/types/pokemon";

export interface SignificantCaptureView {
  speciesName: string;
  playerDisplayName: string;
  // CLICKABLE USERNAMES — null whenever a real username couldn't be
  // resolved (see lib/auth/player-profile.ts's getPlayerIdentitiesByIds) —
  // components/social/PlayerNameLink.tsx renders plain, non-clickable text
  // in that case.
  playerUsername: string | null;
  // Pre-formatted "DD/MM/YYYY · HH:MM" (Asia/Jerusalem wall-clock) — see
  // formatCaptureTimestamp below. Home is a server component (per this
  // project's own "pages display data" rule, home-data.service.ts's doc
  // comment), so formatting here avoids a second, client-side timezone
  // computation.
  capturedAtLabel: string;
  spriteUrl: string;
}

export interface SignificantCaptures {
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
// across ALL time, from ANY player. Never reset or hidden at a day
// boundary — a slot keeps showing its most recent qualifying capture until
// a NEWER capture of the SAME rarity replaces it. Ordered by createdAt desc
// + findFirst: since rows are strictly time-ordered, the single most recent
// qualifying row IS the latest whenever one exists.
async function getLatestQualifyingCapture(rarity: PokemonRarity): Promise<SignificantCaptureView | null> {
  const speciesIds = getSpeciesIdsForRarity(rarity);
  if (speciesIds.length === 0) return null;

  const row = await prisma.playerPokemon.findFirst({
    where: { speciesId: { in: speciesIds }, source: "capture" },
    orderBy: { createdAt: "desc" },
  });
  if (!row) return null;

  const species = getSpeciesById(row.speciesId);
  if (!species) return null;

  const identities = await getPlayerIdentitiesByIds([row.playerId]);
  const identity = identities.get(row.playerId);

  return {
    speciesName: species.name,
    playerDisplayName: identity?.displayName ?? "שחקן",
    playerUsername: identity?.username ?? null,
    capturedAtLabel: formatCaptureTimestamp(row.createdAt),
    spriteUrl: getFrontSpritePath(species),
  };
}

// The Home page's own read (features/home/services/home-data.service.ts) —
// the latest Very Rare and Legendary captures across all time, each
// independently null only when nobody has ever caught one of that rarity.
// Not daily-reset: Very Rare and Legendary each keep displaying their last
// qualifying capture — no matter how old — until a newer capture of that
// SAME rarity comes in; the two slots update independently of each other.
export async function getSignificantCaptures(): Promise<SignificantCaptures> {
  const [veryRare, legendary] = await Promise.all([
    getLatestQualifyingCapture("very-rare"),
    getLatestQualifyingCapture("legendary"),
  ]);
  return { veryRare, legendary };
}
