import "server-only";

import { prisma } from "@/lib/db/prisma";
import type { Prisma } from "@/lib/generated/prisma/client";

// The single source of truth for "what day is it" as far as the daily
// battle counter is concerned — Asia/Jerusalem's own calendar date,
// regardless of the server's own timezone. Intl.DateTimeFormat with the
// "en-CA" locale formats as "YYYY-MM-DD" (a lucky, well-known quirk of that
// locale's date format), so this needs no date-math library and is
// automatically DST-correct. Exported so the Home page's own read
// (features/home/services/home-data.service.ts) and every increment call
// below always agree on "today" from the exact same function.
export function getJerusalemDateKey(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jerusalem" }).format(now);
}

// Increments the caller's own row for today's Asia/Jerusalem date,
// creating it first if this is the first victory of the day — an atomic
// DB-level upsert, not a read-then-write, so two racing calls can never
// lose an increment to each other. Never resets or deletes a prior day's
// row: a new day is simply a new (playerId, date) row that doesn't exist
// yet, so "starts again from 0 at midnight" requires no scheduled job at
// all, and every past day's row survives for future statistics.
//
// Always called with a transaction client, never the top-level `prisma`
// client — this only ever runs as part of promoteToNextEncounter's own
// transaction (features/battle-session/services/battle-session.service.ts),
// the daily counter's one true increment point: exactly when the player
// has just genuinely defeated a wild Pokémon and the session is advancing
// to the next one. Never called for starting/restoring a session, escaping,
// capturing, a party wipe, or nextWild merely being pre-generated — see
// promoteToNextEncounter's own doc comment for why a racing/retried call
// for that same victory can never reach here twice.
// Returns the row's own post-increment count so callers already inside this
// same transaction (promoteToNextEncounter, battle-session.service.ts) can
// hand it straight to the client in that same response — never a second
// read of a value this call just wrote.
export async function incrementDailyBattleCount(tx: Prisma.TransactionClient, playerId: string): Promise<number> {
  const date = getJerusalemDateKey();

  const row = await tx.dailyFieldBattleCount.upsert({
    where: { playerId_date: { playerId, date } },
    update: { count: { increment: 1 } },
    create: { playerId, date, count: 1 },
  });

  return row.count;
}

// The Home page's own read — today's count only (Asia/Jerusalem), 0 when
// no row exists yet (a player who hasn't started a field battle today).
export async function getTodayBattleCount(playerId: string): Promise<number> {
  const date = getJerusalemDateKey();

  const row = await prisma.dailyFieldBattleCount.findUnique({
    where: { playerId_date: { playerId, date } },
  });

  return row?.count ?? 0;
}
