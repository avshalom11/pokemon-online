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
}

interface FieldBattleSessionRow {
  playerId: string;
  zoneId: string;
  wildSpeciesId: string;
  wildLevel: number;
  wildCurrentHp: number;
  wildMaxHp: number;
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
let idCounter = 0;
let playerPokemonUpdateCallCount = 0;

function nextId(prefix: string): string {
  idCounter += 1;
  return `${prefix}_${idCounter}`;
}

function cloneState() {
  return {
    pokemons: new Map([...pokemons].map(([id, row]) => [id, { ...row }])),
    knownMoves: new Map([...knownMoves].map(([id, row]) => [id, { ...row }])),
    pending: new Map([...pending].map(([id, row]) => [id, { ...row }])),
    profiles: new Map([...profiles].map(([id, row]) => [id, { ...row }])),
    sessions: new Map([...sessions].map(([id, row]) => [id, { ...row }])),
  };
}

function restoreState(snapshot: ReturnType<typeof cloneState>) {
  pokemons = snapshot.pokemons;
  knownMoves = snapshot.knownMoves;
  pending = snapshot.pending;
  profiles = snapshot.profiles;
  sessions = snapshot.sessions;
}

export function resetFakeDb() {
  pokemons = new Map();
  knownMoves = new Map();
  pending = new Map();
  profiles = new Map();
  sessions = new Map();
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

export function seedPlayerProfile(row: { id: string; level?: number; experience?: number }) {
  const full: PlayerProfileRow = { id: row.id, level: row.level ?? 1, experience: row.experience ?? 0 };
  profiles.set(row.id, full);
  return full;
}

export function seedFieldBattleSession(row: {
  playerId: string;
  zoneId: string;
  wildSpeciesId: string;
  wildLevel: number;
  wildCurrentHp: number;
  wildMaxHp: number;
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

export function getPlayerPokemonUpdateCallCount() {
  return playerPokemonUpdateCallCount;
}

function matchesValue(actual: unknown, expected: unknown): boolean {
  if (expected !== null && typeof expected === "object" && "not" in (expected as Record<string, unknown>)) {
    return actual !== (expected as { not: unknown }).not;
  }
  return actual === expected;
}

function matches<T>(row: T, where: Record<string, unknown> = {}): boolean {
  const record = row as Record<string, unknown>;
  return Object.entries(where).every(([key, value]) => matchesValue(record[key], value));
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
      Object.assign(row, data);
      return { ...row };
    },
  },
  fieldBattleSession: {
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
