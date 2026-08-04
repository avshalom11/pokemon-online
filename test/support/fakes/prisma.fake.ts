// In-memory stand-in for `@/lib/db/prisma`, shared by every persistence-
// layer regression test (see ../alias-loader.mjs, which redirects the
// "@/lib/db/prisma" specifier here). Implements only the query shapes the
// features actually under test call — not a general Prisma mock. Grown
// incrementally: Phase 4E added playerPokemon/playerKnownMove/
// playerPendingMoveLearning; Phase 4F added playerProfile and
// fieldBattleSession for the Battle Action Pipeline.
//
// $transaction gives real rollback semantics (snapshot before, restore on
// throw) so tests can assert that a failed resolution leaves no partial
// writes behind, the same guarantee the real Postgres transaction gives
// the production code.

interface PlayerPokemonRow {
  id: string;
  playerId: string;
  speciesId: string;
  nickname: string | null;
  level: number;
  experience: number;
  currentHp: number;
  isStarter: boolean;
  partySlot: number | null;
  createdAt: Date;
  status: string | null;
  statusTurnsRemaining: number | null;
  pendingEvolutionSpeciesId: string | null;
  pendingEvolutionBranch: boolean;
  evolutionPermanentlyBlocked: boolean;
}

interface PlayerKnownMoveRow {
  id: string;
  playerPokemonId: string;
  moveId: string;
  slot: number;
}

type PendingStatus = "pending" | "learned" | "declined";

interface PlayerPendingMoveLearningRow {
  id: string;
  playerPokemonId: string;
  moveId: string;
  learnedAtLevel: number;
  status: PendingStatus;
  sequence: number;
  resolvedAt: Date | null;
}

interface PlayerProfileRow {
  id: string;
  level: number;
  experience: number;
  coins: number;
  gold: number;
  regionId: string;
}

interface DailyFieldBattleCountRow {
  playerId: string;
  date: string;
  count: number;
}

interface PlayerInventoryItemRow {
  id: string;
  playerId: string;
  itemId: string;
  quantity: number;
}

interface PlayerSeenSpeciesRow {
  id: string;
  playerId: string;
  speciesId: string;
  createdAt: Date;
}

interface NotificationRow {
  id: string;
  playerId: string;
  type: string;
  message: string;
  isRead: boolean;
  metadata: unknown;
  createdAt: Date;
}

interface FieldBattleSessionRow {
  playerId: string;
  zoneId: string;
  wildSpeciesId: string;
  wildLevel: number;
  wildCurrentHp: number;
  wildMaxHp: number;
  nextWildSpeciesId: string;
  nextWildLevel: number;
  nextWildCurrentHp: number;
  nextWildMaxHp: number;
  wildDefeatRewardGranted: boolean;
  activePlayerPokemonId: string;
  participants: unknown;
  wildStatStages: unknown;
  playerStatStages: unknown;
  wildStatus: string | null;
  wildStatusTurnsRemaining: number | null;
  wildVolatileState: unknown;
  playerVolatileState: unknown;
}

let pokemons = new Map<string, PlayerPokemonRow>();
let knownMoves = new Map<string, PlayerKnownMoveRow>();
let pending = new Map<string, PlayerPendingMoveLearningRow>();
let profiles = new Map<string, PlayerProfileRow>();
let sessions = new Map<string, FieldBattleSessionRow>();
let dailyBattleCounts = new Map<string, DailyFieldBattleCountRow>();
let notifications = new Map<string, NotificationRow>();
let inventoryItems = new Map<string, PlayerInventoryItemRow>();
let seenSpecies = new Map<string, PlayerSeenSpeciesRow>();
let idCounter = 0;
let playerPokemonUpdateCallCount = 0;

function nextId(prefix: string): string {
  idCounter += 1;
  return `${prefix}_${idCounter}`;
}

function dailyBattleCountKey(playerId: string, date: string): string {
  return `${playerId}::${date}`;
}

function inventoryItemKey(playerId: string, itemId: string): string {
  return `${playerId}::${itemId}`;
}

function seenSpeciesKey(playerId: string, speciesId: string): string {
  return `${playerId}::${speciesId}`;
}

function cloneState() {
  return {
    pokemons: new Map([...pokemons].map(([id, row]) => [id, { ...row }])),
    knownMoves: new Map([...knownMoves].map(([id, row]) => [id, { ...row }])),
    pending: new Map([...pending].map(([id, row]) => [id, { ...row }])),
    profiles: new Map([...profiles].map(([id, row]) => [id, { ...row }])),
    sessions: new Map([...sessions].map(([id, row]) => [id, { ...row }])),
    dailyBattleCounts: new Map([...dailyBattleCounts].map(([id, row]) => [id, { ...row }])),
    notifications: new Map([...notifications].map(([id, row]) => [id, { ...row }])),
    inventoryItems: new Map([...inventoryItems].map(([id, row]) => [id, { ...row }])),
    seenSpecies: new Map([...seenSpecies].map(([id, row]) => [id, { ...row }])),
  };
}

function restoreState(snapshot: ReturnType<typeof cloneState>) {
  pokemons = snapshot.pokemons;
  knownMoves = snapshot.knownMoves;
  pending = snapshot.pending;
  profiles = snapshot.profiles;
  sessions = snapshot.sessions;
  dailyBattleCounts = snapshot.dailyBattleCounts;
  notifications = snapshot.notifications;
  inventoryItems = snapshot.inventoryItems;
  seenSpecies = snapshot.seenSpecies;
}

export function resetFakeDb() {
  pokemons = new Map();
  knownMoves = new Map();
  pending = new Map();
  profiles = new Map();
  sessions = new Map();
  dailyBattleCounts = new Map();
  notifications = new Map();
  inventoryItems = new Map();
  seenSpecies = new Map();
  idCounter = 0;
  playerPokemonUpdateCallCount = 0;
}

export function seedPlayerPokemon(row: {
  id: string;
  playerId: string;
  speciesId?: string;
  nickname?: string | null;
  level?: number;
  experience?: number;
  currentHp?: number;
  isStarter?: boolean;
  partySlot?: number | null;
  createdAt?: Date;
  status?: string | null;
  statusTurnsRemaining?: number | null;
  pendingEvolutionSpeciesId?: string | null;
  pendingEvolutionBranch?: boolean;
  evolutionPermanentlyBlocked?: boolean;
}) {
  const full: PlayerPokemonRow = {
    id: row.id,
    playerId: row.playerId,
    speciesId: row.speciesId ?? "charmander",
    nickname: row.nickname ?? null,
    level: row.level ?? 5,
    experience: row.experience ?? 0,
    currentHp: row.currentHp ?? 20,
    isStarter: row.isStarter ?? false,
    partySlot: row.partySlot ?? null,
    createdAt: row.createdAt ?? new Date(),
    status: row.status ?? null,
    statusTurnsRemaining: row.statusTurnsRemaining ?? null,
    pendingEvolutionSpeciesId: row.pendingEvolutionSpeciesId ?? null,
    pendingEvolutionBranch: row.pendingEvolutionBranch ?? false,
    evolutionPermanentlyBlocked: row.evolutionPermanentlyBlocked ?? false,
  };
  pokemons.set(row.id, full);
  return full;
}

export function seedKnownMove(row: { playerPokemonId: string; moveId: string; slot: number }) {
  const id = nextId("km");
  const full: PlayerKnownMoveRow = { id, ...row };
  knownMoves.set(id, full);
  return full;
}

export function seedPendingMove(row: {
  id?: string;
  playerPokemonId: string;
  moveId: string;
  learnedAtLevel: number;
  status?: PendingStatus;
  sequence?: number;
}) {
  const id = row.id ?? nextId("pending");
  idCounter += 1;
  const full: PlayerPendingMoveLearningRow = {
    id,
    playerPokemonId: row.playerPokemonId,
    moveId: row.moveId,
    learnedAtLevel: row.learnedAtLevel,
    status: row.status ?? "pending",
    sequence: row.sequence ?? idCounter,
    resolvedAt: null,
  };
  pending.set(id, full);
  return full;
}

export function seedPlayerProfile(row: { id: string; level?: number; experience?: number; coins?: number; gold?: number; regionId?: string }) {
  const full: PlayerProfileRow = {
    id: row.id,
    level: row.level ?? 1,
    experience: row.experience ?? 0,
    coins: row.coins ?? 500,
    gold: row.gold ?? 0,
    // Matches PlayerProfile.regionId's own @default("kanto") in
    // prisma/schema.prisma — every existing test that never explicitly
    // seeds a region keeps behaving exactly as it did before Phase 4.
    regionId: row.regionId ?? "kanto",
  };
  profiles.set(row.id, full);
  return full;
}

export function getPlayerProfileRow(id: string) {
  const row = profiles.get(id);
  return row ? { ...row } : undefined;
}

export function seedFieldBattleSession(row: {
  playerId: string;
  zoneId: string;
  wildSpeciesId: string;
  wildLevel: number;
  wildCurrentHp: number;
  wildMaxHp: number;
  // Defaults describe an arbitrary, always-valid "next" encounter — most
  // tests exercise the current wild only and don't care what's queued up
  // behind it, so these only need to satisfy promoteToNextEncounter's own
  // "species must resolve" guarantee, same reasoning as every other
  // optional field's default below.
  nextWildSpeciesId?: string;
  nextWildLevel?: number;
  nextWildCurrentHp?: number;
  nextWildMaxHp?: number;
  activePlayerPokemonId: string;
  wildDefeatRewardGranted?: boolean;
  participants?: unknown;
  wildStatStages?: unknown;
  playerStatStages?: unknown;
  wildStatus?: string | null;
  wildStatusTurnsRemaining?: number | null;
  wildVolatileState?: unknown;
  playerVolatileState?: unknown;
}) {
  const full: FieldBattleSessionRow = {
    playerId: row.playerId,
    zoneId: row.zoneId,
    wildSpeciesId: row.wildSpeciesId,
    wildLevel: row.wildLevel,
    wildCurrentHp: row.wildCurrentHp,
    wildMaxHp: row.wildMaxHp,
    nextWildSpeciesId: row.nextWildSpeciesId ?? "bulbasaur",
    nextWildLevel: row.nextWildLevel ?? 5,
    nextWildCurrentHp: row.nextWildCurrentHp ?? 20,
    nextWildMaxHp: row.nextWildMaxHp ?? 20,
    activePlayerPokemonId: row.activePlayerPokemonId,
    wildDefeatRewardGranted: row.wildDefeatRewardGranted ?? false,
    participants: row.participants ?? [],
    wildStatStages: row.wildStatStages ?? {},
    playerStatStages: row.playerStatStages ?? {},
    wildStatus: row.wildStatus ?? null,
    wildStatusTurnsRemaining: row.wildStatusTurnsRemaining ?? null,
    wildVolatileState: row.wildVolatileState ?? {},
    playerVolatileState: row.playerVolatileState ?? {},
  };
  sessions.set(row.playerId, full);
  return full;
}

export function getKnownMovesFor(playerPokemonId: string) {
  return [...knownMoves.values()]
    .filter((row) => row.playerPokemonId === playerPokemonId)
    .sort((a, b) => a.slot - b.slot)
    .map((row) => ({ moveId: row.moveId, slot: row.slot }));
}

export function getPendingRecord(id: string) {
  const row = pending.get(id);
  return row ? { ...row } : undefined;
}

export function getPlayerPokemonRow(id: string) {
  const row = pokemons.get(id);
  return row ? { ...row } : undefined;
}

export function getFieldBattleSessionRow(playerId: string) {
  const row = sessions.get(playerId);
  return row ? { ...row } : undefined;
}

export function getDailyBattleCountRow(playerId: string, date: string) {
  const row = dailyBattleCounts.get(dailyBattleCountKey(playerId, date));
  return row ? { ...row } : undefined;
}

// Newest first, matching getNotificationBellData's own real ordering
// (notification-service.ts) — most reward/level-up tests only care about
// "what got created, most recent last-in-first-out", so tests can just
// index from the front without re-deriving that order themselves.
export function getNotificationsFor(playerId: string) {
  return [...notifications.values()]
    .filter((row) => row.playerId === playerId)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .map((row) => ({ ...row }));
}

export function getPlayerPokemonUpdateCallCount() {
  return playerPokemonUpdateCallCount;
}

export function getInventoryItemRow(playerId: string, itemId: string) {
  const row = inventoryItems.get(inventoryItemKey(playerId, itemId));
  return row ? { ...row } : undefined;
}

export function seedInventoryItem(row: { playerId: string; itemId: string; quantity: number }) {
  const full: PlayerInventoryItemRow = { id: nextId("inventory"), ...row };
  inventoryItems.set(inventoryItemKey(row.playerId, row.itemId), full);
  return full;
}

export function getSeenSpeciesRows(playerId: string) {
  return [...seenSpecies.values()].filter((row) => row.playerId === playerId).map((row) => ({ ...row }));
}

export function seedSeenSpecies(row: { playerId: string; speciesId: string }) {
  const full: PlayerSeenSpeciesRow = { id: nextId("seen"), createdAt: new Date(), ...row };
  seenSpecies.set(seenSpeciesKey(row.playerId, row.speciesId), full);
  return full;
}

function matchesValue(actual: unknown, expected: unknown): boolean {
  if (expected !== null && typeof expected === "object") {
    const operators = expected as Record<string, unknown>;
    if ("not" in operators) return actual !== operators.not;
    if ("gte" in operators) return (actual as number) >= (operators.gte as number);
    if ("gt" in operators) return (actual as number) > (operators.gt as number);
  }
  return actual === expected;
}

function matches<T>(row: T, where: Record<string, unknown> = {}): boolean {
  const record = row as Record<string, unknown>;
  return Object.entries(where).every(([key, value]) => matchesValue(record[key], value));
}

// Mirrors real Prisma's `{ field: { increment: n } }` / `{ field: {
// decrement: n } }` numeric-update operators (used by currency-reward.
// service.ts's grantCurrencyRewards/spendCurrency and inventory.service.
// ts's addInventoryItem) alongside plain field replacement.
function applyNumericOperators(record: Record<string, unknown>, data: Record<string, unknown>): void {
  for (const [key, value] of Object.entries(data)) {
    if (value && typeof value === "object" && "increment" in value) {
      record[key] = ((record[key] as number) ?? 0) + (value as { increment: number }).increment;
    } else if (value && typeof value === "object" && "decrement" in value) {
      record[key] = ((record[key] as number) ?? 0) - (value as { decrement: number }).decrement;
    } else {
      record[key] = value;
    }
  }
}

function applyOrderBy<T>(
  rows: T[],
  orderBy: Record<string, "asc" | "desc"> | Record<string, "asc" | "desc">[] | undefined
): T[] {
  const specs = Array.isArray(orderBy) ? orderBy : orderBy ? [orderBy] : [];
  return [...rows].sort((a, b) => {
    const recordA = a as Record<string, unknown>;
    const recordB = b as Record<string, unknown>;
    for (const spec of specs) {
      for (const [field, dir] of Object.entries(spec)) {
        const av = recordA[field];
        const bv = recordB[field];
        if (av === bv) continue;
        const cmp = (av as number) < (bv as number) ? -1 : 1;
        return dir === "desc" ? -cmp : cmp;
      }
    }
    return 0;
  });
}

const client = {
  playerPokemon: {
    async findUnique({ where }: { where: { id: string } }) {
      return pokemons.get(where.id) ?? null;
    },
    async findUniqueOrThrow({ where }: { where: { id: string } }) {
      const row = pokemons.get(where.id);
      if (!row) throw new Error(`fake prisma: playerPokemon ${where.id} not found`);
      return { ...row };
    },
    async findFirst({ where }: { where: Record<string, unknown> }) {
      return [...pokemons.values()].find((row) => matches(row, where)) ?? null;
    },
    async findMany({
      where,
      orderBy,
      take,
    }: {
      where: Record<string, unknown>;
      orderBy?: Record<string, "asc" | "desc">;
      take?: number;
    }) {
      const rows = [...pokemons.values()].filter((row) => matches(row, where));
      const sorted = applyOrderBy(rows, orderBy);
      return (take ? sorted.slice(0, take) : sorted).map((row) => ({ ...row }));
    },
    async update({ where, data }: { where: { id: string }; data: Record<string, unknown> }) {
      playerPokemonUpdateCallCount += 1;
      const row = pokemons.get(where.id);
      if (!row) throw new Error(`fake prisma: playerPokemon ${where.id} not found for update`);
      Object.assign(row, data);
      return { ...row };
    },
    // Mirrors currency-reward.service.ts's spendCurrency / evolution-
    // progress.service.ts's tryCreatePendingEvolution: the precondition is
    // encoded directly in `where`, so a call whose precondition no longer
    // holds (e.g. a pending evolution already exists) matches zero rows
    // and returns `{ count: 0 }` rather than throwing.
    async updateMany({ where, data }: { where: Record<string, unknown>; data: Record<string, unknown> }) {
      let count = 0;
      for (const row of pokemons.values()) {
        if (matches(row, where)) {
          Object.assign(row, data);
          count += 1;
        }
      }
      return { count };
    },
  },
  playerProfile: {
    async findUniqueOrThrow({ where }: { where: { id: string } }) {
      const row = profiles.get(where.id);
      if (!row) throw new Error(`fake prisma: playerProfile ${where.id} not found`);
      return { ...row };
    },
    async update({ where, data }: { where: { id: string }; data: Record<string, unknown> }) {
      const row = profiles.get(where.id);
      if (!row) throw new Error(`fake prisma: playerProfile ${where.id} not found for update`);
      applyNumericOperators(row as unknown as Record<string, unknown>, data);
      return { ...row };
    },
    // Mirrors currency-reward.service.ts's spendCurrency: the precondition
    // (sufficient balance) is encoded directly in `where` via `{ gte }`
    // (matchesValue above), so a call against an insufficient balance
    // matches zero rows and returns `{ count: 0 }` rather than throwing —
    // same atomic-guard idiom fieldBattleSession.updateMany already uses
    // for wildDefeatRewardGranted.
    async updateMany({ where, data }: { where: Record<string, unknown>; data: Record<string, unknown> }) {
      let count = 0;
      for (const row of profiles.values()) {
        if (matches(row, where)) {
          applyNumericOperators(row as unknown as Record<string, unknown>, data);
          count += 1;
        }
      }
      return { count };
    },
  },
  playerInventoryItem: {
    async upsert({
      where,
      create,
      update,
    }: {
      where: { playerId_itemId: { playerId: string; itemId: string } };
      create: { playerId: string; itemId: string; quantity: number };
      update: Record<string, unknown>;
    }) {
      const key = inventoryItemKey(where.playerId_itemId.playerId, where.playerId_itemId.itemId);
      const existing = inventoryItems.get(key);
      if (existing) {
        applyNumericOperators(existing as unknown as Record<string, unknown>, update);
        return { ...existing };
      }
      const full: PlayerInventoryItemRow = { id: nextId("inventory"), ...create };
      inventoryItems.set(key, full);
      return { ...full };
    },
    async findUnique({ where }: { where: { playerId_itemId: { playerId: string; itemId: string } } }) {
      const row = inventoryItems.get(inventoryItemKey(where.playerId_itemId.playerId, where.playerId_itemId.itemId));
      return row ? { ...row } : null;
    },
    async findMany({ where }: { where: Record<string, unknown> }) {
      return [...inventoryItems.values()].filter((row) => matches(row, where)).map((row) => ({ ...row }));
    },
    async updateMany({ where, data }: { where: Record<string, unknown>; data: Record<string, unknown> }) {
      let count = 0;
      for (const row of inventoryItems.values()) {
        if (matches(row, where)) {
          applyNumericOperators(row as unknown as Record<string, unknown>, data);
          count += 1;
        }
      }
      return { count };
    },
    async deleteMany({ where }: { where: Record<string, unknown> }) {
      let count = 0;
      for (const [key, row] of inventoryItems) {
        if (matches(row, where)) {
          inventoryItems.delete(key);
          count += 1;
        }
      }
      return { count };
    },
  },
  playerSeenSpecies: {
    // Mirrors markSpeciesSeen's own real-Prisma call exactly: create on
    // first encounter, a no-op update (never any data change) on every
    // call after — the fake's own way of proving "calling this again is
    // always harmless" without a real unique-constraint violation to catch
    // it.
    async upsert({
      where,
      create,
    }: {
      where: { playerId_speciesId: { playerId: string; speciesId: string } };
      create: { playerId: string; speciesId: string };
      update: Record<string, unknown>;
    }) {
      const key = seenSpeciesKey(where.playerId_speciesId.playerId, where.playerId_speciesId.speciesId);
      const existing = seenSpecies.get(key);
      if (existing) {
        return { ...existing };
      }
      const full: PlayerSeenSpeciesRow = { id: nextId("seen"), createdAt: new Date(), ...create };
      seenSpecies.set(key, full);
      return { ...full };
    },
    async findMany({ where }: { where: Record<string, unknown> }) {
      return [...seenSpecies.values()].filter((row) => matches(row, where)).map((row) => ({ ...row }));
    },
  },
  fieldBattleSession: {
    // Mirrors seedFieldBattleSession's own defaulting for every field the
    // real Prisma schema fills in via @default(...) rather than requiring
    // callers to pass explicitly — getOrStartBattle's own create() call
    // (battle-session.service.ts) only ever sets the wild*/nextWild*/
    // activePlayerPokemonId/participants fields, exactly like a fresh
    // session in production.
    async create({ data }: { data: Record<string, unknown> }) {
      const full: FieldBattleSessionRow = {
        playerId: data.playerId as string,
        zoneId: data.zoneId as string,
        wildSpeciesId: data.wildSpeciesId as string,
        wildLevel: data.wildLevel as number,
        wildCurrentHp: data.wildCurrentHp as number,
        wildMaxHp: data.wildMaxHp as number,
        nextWildSpeciesId: data.nextWildSpeciesId as string,
        nextWildLevel: data.nextWildLevel as number,
        nextWildCurrentHp: data.nextWildCurrentHp as number,
        nextWildMaxHp: data.nextWildMaxHp as number,
        activePlayerPokemonId: data.activePlayerPokemonId as string,
        wildDefeatRewardGranted: (data.wildDefeatRewardGranted as boolean | undefined) ?? false,
        participants: data.participants ?? [],
        wildStatStages: data.wildStatStages ?? {},
        playerStatStages: data.playerStatStages ?? {},
        wildStatus: (data.wildStatus as string | null | undefined) ?? null,
        wildStatusTurnsRemaining: (data.wildStatusTurnsRemaining as number | null | undefined) ?? null,
        wildVolatileState: data.wildVolatileState ?? {},
        playerVolatileState: data.playerVolatileState ?? {},
      };
      sessions.set(full.playerId, full);
      return { ...full };
    },
    async findUnique({ where }: { where: { playerId: string } }) {
      const row = sessions.get(where.playerId);
      return row ? { ...row } : null;
    },
    async updateMany({ where, data }: { where: Record<string, unknown>; data: Record<string, unknown> }) {
      let count = 0;
      for (const row of sessions.values()) {
        if (matches(row, where)) {
          Object.assign(row, data);
          count += 1;
        }
      }
      return { count };
    },
    async deleteMany({ where }: { where: Record<string, unknown> }) {
      let count = 0;
      for (const [playerId, row] of sessions) {
        if (matches(row, where)) {
          sessions.delete(playerId);
          count += 1;
        }
      }
      return { count };
    },
  },
  dailyFieldBattleCount: {
    async findUnique({ where }: { where: { playerId_date: { playerId: string; date: string } } }) {
      const row = dailyBattleCounts.get(dailyBattleCountKey(where.playerId_date.playerId, where.playerId_date.date));
      return row ? { ...row } : null;
    },
    async upsert({
      where,
      update,
      create,
    }: {
      where: { playerId_date: { playerId: string; date: string } };
      update: { count: { increment: number } };
      create: { playerId: string; date: string; count: number };
    }) {
      const key = dailyBattleCountKey(where.playerId_date.playerId, where.playerId_date.date);
      const existing = dailyBattleCounts.get(key);
      if (existing) {
        existing.count += update.count.increment;
        return { ...existing };
      }
      const full: DailyFieldBattleCountRow = { playerId: create.playerId, date: create.date, count: create.count };
      dailyBattleCounts.set(key, full);
      return { ...full };
    },
  },
  notification: {
    async create({ data }: { data: { playerId: string; type: string; message: string; metadata?: unknown } }) {
      const id = nextId("notification");
      const full: NotificationRow = {
        id,
        playerId: data.playerId,
        type: data.type,
        message: data.message,
        isRead: false,
        metadata: data.metadata ?? null,
        createdAt: new Date(),
      };
      notifications.set(id, full);
      return { ...full };
    },
    async count({ where }: { where: Record<string, unknown> }) {
      return [...notifications.values()].filter((row) => matches(row, where)).length;
    },
    async findMany({
      where,
      orderBy,
      take,
    }: {
      where: Record<string, unknown>;
      orderBy?: Record<string, "asc" | "desc">;
      take?: number;
    }) {
      const rows = [...notifications.values()].filter((row) => matches(row, where));
      const sorted = applyOrderBy(rows, orderBy);
      return (take ? sorted.slice(0, take) : sorted).map((row) => ({ ...row }));
    },
    async updateMany({ where, data }: { where: Record<string, unknown>; data: Record<string, unknown> }) {
      let count = 0;
      for (const row of notifications.values()) {
        if (matches(row, where)) {
          Object.assign(row, data);
          count += 1;
        }
      }
      return { count };
    },
  },
  playerKnownMove: {
    async findMany({
      where,
      orderBy,
    }: {
      where: Record<string, unknown>;
      orderBy?: Record<string, "asc" | "desc">;
    }) {
      const rows = [...knownMoves.values()].filter((row) => matches(row, where));
      return applyOrderBy(rows, orderBy).map((row) => ({ moveId: row.moveId, slot: row.slot }));
    },
    async deleteMany({ where }: { where: Record<string, unknown> }) {
      for (const [id, row] of knownMoves) {
        if (matches(row, where)) knownMoves.delete(id);
      }
    },
    async createMany({ data }: { data: Array<{ playerPokemonId: string; moveId: string; slot: number }> }) {
      for (const item of data) {
        const id = nextId("km");
        knownMoves.set(id, { id, ...item });
      }
    },
  },
  playerPendingMoveLearning: {
    async findMany({ where }: { where: Record<string, unknown> }) {
      return [...pending.values()].filter((row) => matches(row, where)).map((row) => ({ ...row }));
    },
    async findUnique({
      where,
      select,
    }: {
      where: { id: string };
      select?: { playerPokemon?: { select: { playerId: true } } };
    }) {
      const row = pending.get(where.id);
      if (!row) return null;
      if (select?.playerPokemon) {
        const owner = pokemons.get(row.playerPokemonId);
        return { ...row, playerPokemon: { playerId: owner?.playerId ?? null } };
      }
      return { ...row };
    },
    async findFirst({
      where,
      orderBy,
    }: {
      where: Record<string, unknown>;
      orderBy?: Record<string, "asc" | "desc">[];
    }) {
      const rows = [...pending.values()].filter((row) => matches(row, where));
      const sorted = applyOrderBy(rows, orderBy);
      return sorted[0] ? { ...sorted[0] } : null;
    },
    async count({ where }: { where: Record<string, unknown> }) {
      return [...pending.values()].filter((row) => matches(row, where)).length;
    },
    async update({
      where,
      data,
    }: {
      where: { id: string };
      data: Partial<Pick<PlayerPendingMoveLearningRow, "status" | "resolvedAt">>;
    }) {
      const row = pending.get(where.id);
      if (!row) throw new Error("fake prisma: playerPendingMoveLearning row not found for update");
      Object.assign(row, data);
      return { ...row };
    },
  },
  // `tx` is deliberately untyped here (not `typeof client`) to avoid a
  // self-referencing type on `client`'s own inferred type; callers rely on
  // the real Prisma.TransactionClient type instead (that's what production
  // code type-checks against — see move-learning-service.ts).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async $transaction<T>(fn: (tx: any) => Promise<T>): Promise<T> {
    const snapshot = cloneState();
    try {
      return await fn(client);
    } catch (error) {
      restoreState(snapshot);
      throw error;
    }
  },
};

export const prisma = client;
