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
  source: string | null;
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
  // GYMS & LEAGUES PHASE 9 — mirrors PlayerProfile.displayName
  // (prisma/schema.prisma), needed by getPlayerProfilesByIds' own bulk
  // display-name resolution (League bracket/achievement/current-champion
  // UI). Every existing test that never explicitly seeds this keeps working
  // unchanged via the same "<id>-name" deterministic fallback.
  displayName: string;
  level: number;
  experience: number;
  coins: number;
  gold: number;
  regionId: string;
  // MAP — SELECTABLE WILD LEVEL RANGE. Mirrors PlayerProfile.
  // selectedWildLevelBracketIndex (prisma/schema.prisma) — null means "no
  // bracket chosen yet", same default every real new profile row has.
  selectedWildLevelBracketIndex: number | null;
  // PROFILE ACHIEVEMENTS (later task) — mirrors PlayerProfile.
  // showGymAchievementsOnProfile's own @default(true); every existing test
  // that never explicitly seeds this keeps behaving as if the setting is
  // ON, same convention selectedWildLevelBracketIndex above established.
  showGymAchievementsOnProfile: boolean;
  // BATTLE RESULT SOUNDS + GLOBAL SOUND TOGGLE (later task) — mirrors
  // PlayerProfile.soundEnabled's own @default(true); every existing test
  // that never explicitly seeds this keeps behaving as if sound is ON,
  // same convention showGymAchievementsOnProfile above established.
  soundEnabled: boolean;
  // PLAYER SEARCH — mirrors PlayerProfile.avatarDexNumber's own nullable,
  // no-@default column; every existing test that never explicitly seeds
  // this keeps behaving as if no avatar is set (null), same convention
  // every other nullable column here already follows.
  avatarDexNumber: number | null;
  // PUBLIC PROFILE PRIVACY — mirrors PlayerProfile.showPartyOnProfile/
  // showStatsOnProfile/showAboutMeOnProfile/aboutMe/profileThemeId's own
  // real defaults (@default(true)/@default(true)/@default(true)/
  // @default("")/@default("default")). Needed to test
  // getPublicProfileView's privacy toggles now that user.findUnique's
  // `playerProfile: true` selection (this fake) makes that function
  // reachable under the fake DB at all — every existing test that never
  // explicitly seeds these keeps behaving as fully visible/empty, same
  // convention every other column here follows.
  showPartyOnProfile: boolean;
  showStatsOnProfile: boolean;
  showAboutMeOnProfile: boolean;
  aboutMe: string;
  profileThemeId: string;
  // ONLINE PRESENCE — mirrors PlayerProfile.lastSeenAt's own nullable,
  // no-@default column; every existing test that never explicitly seeds
  // this keeps behaving as "never seen" (offline), same convention every
  // other nullable column here already follows.
  lastSeenAt: Date | null;
  // NEW PLAYER STARTER — mirrors PlayerProfile.onboardingCompleted's own
  // @default(false) and starterPokemonId's own nullable, no-@default
  // column — needed by select-starter.service.ts's selectStarterPokemon
  // (the only real caller). Every existing test that never explicitly
  // seeds these keeps behaving as "onboarding not yet completed", same
  // convention every other column here already follows.
  onboardingCompleted: boolean;
  starterPokemonId: string | null;
}

// PLAYER SEARCH — mirrors prisma/schema.prisma's User model's own
// `username` column exactly (the only field this fake needs — every other
// User column — email, emailVerified, image, ... — is never read by any
// service under test). Identity mapping with PlayerProfileRow: a User row
// and its PlayerProfile share the SAME id, same "profile id == session
// user id" convention test/support/fakes/player-profile.fake.ts's own doc
// comment already establishes — so resolving one player's `user` relation
// is just `users.get(profile.id)` / `profiles.get(user.id)`, no separate
// foreign key needed in this fake.
// FAILED LOGIN LOCKOUT — email/failedLoginAttempts/lockedUntil mirror
// prisma/schema.prisma's User model exactly (see login-lockout.ts, the
// only reader/writer of the latter two). email defaults to null rather
// than a real string so every pre-existing seedUser/seedPlayerProfile call
// (username-only, from PLAYER SEARCH) keeps behaving exactly as before —
// findUnique({ where: { email } }) simply never matches those rows, same
// as a real account with a different email would.
interface UserRow {
  id: string;
  username: string | null;
  email: string | null;
  failedLoginAttempts: number;
  lockedUntil: Date | null;
}

// AUTH SECURITY — LOGIN RATE LIMITING — mirrors prisma/schema.prisma's
// LoginAttemptLock exactly (see that model's own doc comment). Keyed by
// (identifierKey, ipHash), never by a User id — this table intentionally
// has no relation to UserRow at all, since login-lockout.ts must rate-limit
// entirely made-up identifiers too.
interface LoginAttemptLockRow {
  id: string;
  identifierKey: string;
  ipHash: string;
  failedAttempts: number;
  lockedUntil: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// ACCOUNT DELETION — mirrors prisma/schema.prisma's AccountDeletionRequest
// exactly (see that model's own doc comment). `tokenHash` is the fake's
// own uniqueness key, matching the real @@unique([tokenHash]).
interface AccountDeletionRequestRow {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  consumedAt: Date | null;
  createdAt: Date;
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

// EGGS PHASE 1 fakes — mirrors prisma/schema.prisma's PlayerOwnedEgg/
// PlayerIncubator/PlayerEggIncubation exactly (see those models' own doc
// comments for the real design reasoning); this file only needs to
// replicate their query/constraint SHAPE for the feature-layer services
// under test.
interface PlayerOwnedEggRow {
  id: string;
  playerId: string;
  rarity: string;
  regionId: string;
  source: string | null;
  createdAt: Date;
}

interface PlayerIncubatorRow {
  id: string;
  playerId: string;
  incubatorTypeId: string;
  // INCUBATOR EXPANSION — 1 on the player's one permanent starter
  // incubator, null on every consumable instance (mirrors
  // prisma/schema.prisma's PlayerIncubator.permanentSlot exactly — see that
  // column's own doc comment for why NULL, not a boolean, is what makes
  // "at most one permanent row per player" a real composite-unique
  // guarantee here too).
  permanentSlot: number | null;
  createdAt: Date;
}

interface PlayerEggIncubationRow {
  ownedEggId: string;
  incubatorId: string;
  battleProgress: number;
  requiredBattleTarget: number;
  startedAt: Date;
}

// POKÉMON DAYCARE — PHASE 1 — mirrors prisma/schema.prisma's
// PlayerDaycareStay exactly: keyed by playerPokemonId (its own real
// primary key), with playerId carrying its own separate uniqueness
// (enforced by this fake's create() below, same "second real unique
// constraint checked by hand" precedent fieldBattleSession.create already
// establishes for its own playerId @id).
interface PlayerDaycareStayRow {
  playerPokemonId: string;
  playerId: string;
  depositedAt: Date;
  startingLevel: number;
  createdAt: Date;
  updatedAt: Date;
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

// GLOBAL CHAT — mirrors prisma/schema.prisma's GlobalChatMessage exactly
// (see that model's own doc comment).
interface GlobalChatMessageRow {
  id: string;
  playerId: string;
  message: string;
  createdAt: Date;
}

// FRIENDS PHASE 1 — mirrors prisma/schema.prisma's Friendship/
// PrivateConversation/PrivateMessage exactly (see each model's own doc
// comment).
interface FriendshipRow {
  id: string;
  requesterId: string;
  addresseeId: string;
  friendPairKey: string;
  status: string;
  createdAt: Date;
  respondedAt: Date | null;
}

interface PrivateConversationRow {
  id: string;
  playerAId: string;
  playerBId: string;
  conversationPairKey: string;
  createdAt: Date;
}

interface PrivateMessageRow {
  id: string;
  conversationId: string;
  senderId: string;
  message: string;
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
  // GAME TUTORIAL — PHASE 3
  isTutorialEncounter: boolean;
}

// GYMS & LEAGUES PHASE 3
interface NpcBattleSessionRow {
  id: string;
  playerId: string;
  battleSource: string;
  regionId: string;
  gymNumber: number | null;
  battleSlot: string | null;
  npcTeam: unknown;
  npcActiveIndex: number;
  npcCurrentHp: number;
  npcStatus: string | null;
  npcStatusTurnsRemaining: number | null;
  npcStatStages: unknown;
  npcVolatileState: unknown;
  playerPokemonIds: unknown;
  activePlayerPokemonId: string;
  playerBattleHp: unknown;
  playerBattleStatus: unknown;
  playerStatStages: unknown;
  playerVolatileState: unknown;
  createdAt: Date;
  updatedAt: Date;
}

// GAME TUTORIAL — PHASE 0
interface PlayerTutorialProgressRow {
  id: string;
  playerId: string;
  currentStageId: string;
  currentSubStep: string | null;
  status: string;
  completedAt: Date | null;
  rewardClaimed: boolean;
  // GAME TUTORIAL — PHASE 3
  pidgeyCaptured: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// GYMS & LEAGUES PHASE 1
interface PlayerGymBattleProgressRow {
  id: string;
  playerId: string;
  regionId: string;
  gymNumber: number;
  battleSlot: string;
  completedAt: Date;
}

interface PlayerGymBadgeRow {
  id: string;
  playerId: string;
  regionId: string;
  gymNumber: number;
  awardedAt: Date;
}

interface PlayerRegionalChampionProgressRow {
  id: string;
  playerId: string;
  regionId: string;
  completedAt: Date;
}

interface PlayerRegionalMedalRow {
  id: string;
  playerId: string;
  regionId: string;
  awardedAt: Date;
}

// GYMS & LEAGUES PHASE 5
interface LeagueTournamentRow {
  id: string;
  leagueId: string;
  weekKey: string;
  registrationClosesAt: Date;
  round1StartsAt: Date;
  status: string;
  // GYMS & LEAGUES PHASE 8
  rewardsGrantedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

interface LeagueTournamentParticipantRow {
  id: string;
  tournamentId: string;
  playerId: string | null;
  participantType: string;
  registeredAt: Date;
}

interface LeagueTournamentMatchRow {
  id: string;
  tournamentId: string;
  roundNumber: number;
  slot: number;
  scheduledAt: Date;
  participantAId: string;
  participantBId: string;
  winnerParticipantId: string | null;
  status: string;
  involvesComputer: boolean;
  // GYMS & LEAGUES PHASE 7
  resolutionReason: string | null;
}

// GYMS & LEAGUES PHASE 7
interface LeagueTournamentPlacementRow {
  id: string;
  tournamentId: string;
  place: number;
  participantId: string;
  playerId: string;
  createdAt: Date;
}

// GYMS & LEAGUES PHASE 6
interface LeagueBattleSessionRow {
  id: string;
  tournamentMatchId: string;
  participantAId: string;
  participantBId: string;
  participantAJoinedAt: Date | null;
  participantAPokemon: unknown;
  participantAActiveSlotId: string | null;
  participantABattleHp: unknown;
  participantAStatusMap: unknown;
  participantAStatStages: unknown;
  participantAVolatileState: unknown;
  participantAPendingMoveId: string | null;
  participantBJoinedAt: Date | null;
  participantBPokemon: unknown;
  participantBActiveSlotId: string | null;
  participantBBattleHp: unknown;
  participantBStatusMap: unknown;
  participantBStatStages: unknown;
  participantBVolatileState: unknown;
  participantBPendingMoveId: string | null;
  turnNumber: number;
  status: string;
  winnerParticipantId: string | null;
  startedAt: Date;
  completedAt: Date | null;
  updatedAt: Date;
}

let pokemons = new Map<string, PlayerPokemonRow>();
let knownMoves = new Map<string, PlayerKnownMoveRow>();
let pending = new Map<string, PlayerPendingMoveLearningRow>();
let profiles = new Map<string, PlayerProfileRow>();
let sessions = new Map<string, FieldBattleSessionRow>();
let dailyBattleCounts = new Map<string, DailyFieldBattleCountRow>();
let notifications = new Map<string, NotificationRow>();
// GLOBAL CHAT
let globalChatMessages = new Map<string, GlobalChatMessageRow>();
// PLAYER SEARCH
let users = new Map<string, UserRow>();
// AUTH SECURITY — LOGIN RATE LIMITING
let loginAttemptLocks = new Map<string, LoginAttemptLockRow>();
// ACCOUNT DELETION
let accountDeletionRequests = new Map<string, AccountDeletionRequestRow>();
// FRIENDS PHASE 1
let friendships = new Map<string, FriendshipRow>();
let privateConversations = new Map<string, PrivateConversationRow>();
let privateMessages = new Map<string, PrivateMessageRow>();
let inventoryItems = new Map<string, PlayerInventoryItemRow>();
let seenSpecies = new Map<string, PlayerSeenSpeciesRow>();
let ownedEggs = new Map<string, PlayerOwnedEggRow>();
let incubators = new Map<string, PlayerIncubatorRow>();
let eggIncubations = new Map<string, PlayerEggIncubationRow>();
let daycareStays = new Map<string, PlayerDaycareStayRow>();
// GAME TUTORIAL — PHASE 0 — keyed by playerId, same "one row per player" shape
// as npcBattleSessions below.
let tutorialProgresses = new Map<string, PlayerTutorialProgressRow>();
// GYMS & LEAGUES PHASE 3
let npcBattleSessions = new Map<string, NpcBattleSessionRow>();
// GYMS & LEAGUES PHASE 1
let gymBattleProgress = new Map<string, PlayerGymBattleProgressRow>();
let gymBadges = new Map<string, PlayerGymBadgeRow>();
let regionalChampionProgress = new Map<string, PlayerRegionalChampionProgressRow>();
let regionalMedals = new Map<string, PlayerRegionalMedalRow>();
// GYMS & LEAGUES PHASE 5
let leagueTournaments = new Map<string, LeagueTournamentRow>();
let leagueTournamentParticipants = new Map<string, LeagueTournamentParticipantRow>();
let leagueTournamentMatches = new Map<string, LeagueTournamentMatchRow>();
let leagueBattleSessions = new Map<string, LeagueBattleSessionRow>();
let leagueTournamentPlacements = new Map<string, LeagueTournamentPlacementRow>();
let idCounter = 0;
// POKÉMON DAYCARE — PHASE 2 (5 SLOTS + DEPOSIT FEE) — a simple async mutex
// so concurrent $transaction calls never interleave their bodies (see
// $transaction's own doc comment below for why this matters).
let transactionQueue: Promise<void> = Promise.resolve();
let playerPokemonUpdateCallCount = 0;
// MOVE-LEARNING OPTIMIZATION — same "prove a call did/didn't happen"
// purpose as playerPokemonUpdateCallCount above: applyLevelUpMoveLearning
// (features/move-learning/move-learning-service.ts) reads this table via
// loadKnownMoveSet as its own first real DB step, so counting calls here
// is the most direct way to prove the no-level-up skip in
// applyPokemonXpGrant (pokemon-progression-service.ts) actually avoids the
// query entirely, not just happens to return the same empty result a real
// query against unseeded data also would.
let playerKnownMoveFindManyCallCount = 0;

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

// Only ever used for the permanent-starter-slot upsert (ensureStarterIncubator)
// — permanentSlot is always the literal 1 there. Consumable instances
// (grantIncubator) always go through playerIncubator.create below instead,
// never this keyed-upsert path, so a composite key scheme that could only
// ever describe "one particular permanentSlot value for one player" is
// sufficient.
function incubatorKey(playerId: string, permanentSlot: number): string {
  return `${playerId}::${permanentSlot}`;
}

function seenSpeciesKey(playerId: string, speciesId: string): string {
  return `${playerId}::${speciesId}`;
}

// GYMS & LEAGUES PHASE 1 — key helpers mirroring the exact @@unique
// constraints on each new model (prisma/schema.prisma).
function gymBattleProgressKey(playerId: string, regionId: string, gymNumber: number, battleSlot: string): string {
  return `${playerId}::${regionId}::${gymNumber}::${battleSlot}`;
}

function gymBadgeKey(playerId: string, regionId: string, gymNumber: number): string {
  return `${playerId}::${regionId}::${gymNumber}`;
}

function regionalChampionOrMedalKey(playerId: string, regionId: string): string {
  return `${playerId}::${regionId}`;
}

// GYMS & LEAGUES PHASE 5 — shared by leagueTournament.findUnique/
// findUniqueOrThrow, mirroring the real @@unique([leagueId, weekKey])
// constraint alongside plain id lookup.
function findLeagueTournament(where: { id?: string; leagueId_weekKey?: { leagueId: string; weekKey: string } }): LeagueTournamentRow | undefined {
  if (where.id) return leagueTournaments.get(where.id);
  if (where.leagueId_weekKey) {
    const { leagueId, weekKey } = where.leagueId_weekKey;
    return [...leagueTournaments.values()].find((row) => row.leagueId === leagueId && row.weekKey === weekKey);
  }
  return undefined;
}

// GYMS & LEAGUES PHASE 6 — mirrors the real @@unique([tournamentMatchId])
// constraint alongside plain id lookup, same shape as findLeagueTournament
// above.
function findLeagueBattleSession(where: { id?: string; tournamentMatchId?: string }): LeagueBattleSessionRow | undefined {
  if (where.id) return leagueBattleSessions.get(where.id);
  if (where.tournamentMatchId) {
    return [...leagueBattleSessions.values()].find((row) => row.tournamentMatchId === where.tournamentMatchId);
  }
  return undefined;
}

// INVENTORY SELL — the incubator side of the same "activeIncubation: null"
// relation-null filter playerOwnedEgg's own findMany/deleteMany already
// resolve by hand: true when some PlayerEggIncubation row currently
// references this incubator (mirrors the real schema's own
// PlayerEggIncubation.incubatorId @unique relation).
function incubatorHasActiveIncubation(incubatorId: string): boolean {
  return [...eggIncubations.values()].some((incubation) => incubation.incubatorId === incubatorId);
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
    globalChatMessages: new Map([...globalChatMessages].map(([id, row]) => [id, { ...row }])),
    users: new Map([...users].map(([id, row]) => [id, { ...row }])),
    loginAttemptLocks: new Map([...loginAttemptLocks].map(([id, row]) => [id, { ...row }])),
    friendships: new Map([...friendships].map(([id, row]) => [id, { ...row }])),
    privateConversations: new Map([...privateConversations].map(([id, row]) => [id, { ...row }])),
    privateMessages: new Map([...privateMessages].map(([id, row]) => [id, { ...row }])),
    inventoryItems: new Map([...inventoryItems].map(([id, row]) => [id, { ...row }])),
    seenSpecies: new Map([...seenSpecies].map(([id, row]) => [id, { ...row }])),
    ownedEggs: new Map([...ownedEggs].map(([id, row]) => [id, { ...row }])),
    incubators: new Map([...incubators].map(([id, row]) => [id, { ...row }])),
    eggIncubations: new Map([...eggIncubations].map(([id, row]) => [id, { ...row }])),
    daycareStays: new Map([...daycareStays].map(([id, row]) => [id, { ...row }])),
    tutorialProgresses: new Map([...tutorialProgresses].map(([id, row]) => [id, { ...row }])),
    npcBattleSessions: new Map([...npcBattleSessions].map(([id, row]) => [id, { ...row }])),
    gymBattleProgress: new Map([...gymBattleProgress].map(([id, row]) => [id, { ...row }])),
    gymBadges: new Map([...gymBadges].map(([id, row]) => [id, { ...row }])),
    regionalChampionProgress: new Map([...regionalChampionProgress].map(([id, row]) => [id, { ...row }])),
    regionalMedals: new Map([...regionalMedals].map(([id, row]) => [id, { ...row }])),
    leagueTournaments: new Map([...leagueTournaments].map(([id, row]) => [id, { ...row }])),
    leagueTournamentParticipants: new Map([...leagueTournamentParticipants].map(([id, row]) => [id, { ...row }])),
    leagueTournamentMatches: new Map([...leagueTournamentMatches].map(([id, row]) => [id, { ...row }])),
    leagueBattleSessions: new Map([...leagueBattleSessions].map(([id, row]) => [id, { ...row }])),
    leagueTournamentPlacements: new Map([...leagueTournamentPlacements].map(([id, row]) => [id, { ...row }])),
    accountDeletionRequests: new Map([...accountDeletionRequests].map(([id, row]) => [id, { ...row }])),
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
  globalChatMessages = snapshot.globalChatMessages;
  users = snapshot.users;
  loginAttemptLocks = snapshot.loginAttemptLocks;
  friendships = snapshot.friendships;
  privateConversations = snapshot.privateConversations;
  privateMessages = snapshot.privateMessages;
  inventoryItems = snapshot.inventoryItems;
  seenSpecies = snapshot.seenSpecies;
  ownedEggs = snapshot.ownedEggs;
  incubators = snapshot.incubators;
  eggIncubations = snapshot.eggIncubations;
  daycareStays = snapshot.daycareStays;
  tutorialProgresses = snapshot.tutorialProgresses;
  npcBattleSessions = snapshot.npcBattleSessions;
  gymBattleProgress = snapshot.gymBattleProgress;
  gymBadges = snapshot.gymBadges;
  regionalChampionProgress = snapshot.regionalChampionProgress;
  regionalMedals = snapshot.regionalMedals;
  leagueTournaments = snapshot.leagueTournaments;
  leagueTournamentParticipants = snapshot.leagueTournamentParticipants;
  leagueTournamentMatches = snapshot.leagueTournamentMatches;
  leagueBattleSessions = snapshot.leagueBattleSessions;
  leagueTournamentPlacements = snapshot.leagueTournamentPlacements;
  accountDeletionRequests = snapshot.accountDeletionRequests;
}

export function resetFakeDb() {
  pokemons = new Map();
  knownMoves = new Map();
  pending = new Map();
  profiles = new Map();
  sessions = new Map();
  dailyBattleCounts = new Map();
  notifications = new Map();
  globalChatMessages = new Map();
  users = new Map();
  loginAttemptLocks = new Map();
  friendships = new Map();
  privateConversations = new Map();
  privateMessages = new Map();
  inventoryItems = new Map();
  seenSpecies = new Map();
  ownedEggs = new Map();
  incubators = new Map();
  eggIncubations = new Map();
  daycareStays = new Map();
  tutorialProgresses = new Map();
  npcBattleSessions = new Map();
  gymBattleProgress = new Map();
  gymBadges = new Map();
  regionalChampionProgress = new Map();
  regionalMedals = new Map();
  leagueTournaments = new Map();
  leagueTournamentParticipants = new Map();
  leagueTournamentMatches = new Map();
  leagueBattleSessions = new Map();
  leagueTournamentPlacements = new Map();
  accountDeletionRequests = new Map();
  idCounter = 0;
  transactionQueue = Promise.resolve();
  playerPokemonUpdateCallCount = 0;
  playerKnownMoveFindManyCallCount = 0;
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
  source?: string | null;
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
    source: row.source ?? null,
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

export function seedPlayerProfile(row: {
  id: string;
  displayName?: string;
  level?: number;
  experience?: number;
  coins?: number;
  gold?: number;
  regionId?: string;
  selectedWildLevelBracketIndex?: number | null;
  showGymAchievementsOnProfile?: boolean;
  soundEnabled?: boolean;
  avatarDexNumber?: number | null;
  showPartyOnProfile?: boolean;
  showStatsOnProfile?: boolean;
  showAboutMeOnProfile?: boolean;
  aboutMe?: string;
  profileThemeId?: string;
  // ONLINE PRESENCE — optional convenience for tests that need a seeded
  // player to start out already online, without a separate recordHeartbeat
  // call.
  lastSeenAt?: Date | null;
  // PLAYER SEARCH — optional convenience: also creates/updates the
  // matching fake User row (same id) with this username, so a test doesn't
  // need a separate seedUser call just to make a seeded profile
  // search-findable. Omitted (the common case for every other feature's
  // tests) creates no User row at all, exactly like before this field
  // existed.
  username?: string;
  // NEW PLAYER STARTER — optional convenience for onboarding tests.
  onboardingCompleted?: boolean;
  starterPokemonId?: string | null;
}) {
  const full: PlayerProfileRow = {
    id: row.id,
    displayName: row.displayName ?? `${row.id}-name`,
    level: row.level ?? 1,
    experience: row.experience ?? 0,
    coins: row.coins ?? 500,
    gold: row.gold ?? 0,
    // Matches PlayerProfile.regionId's own @default("kanto") in
    // prisma/schema.prisma — every existing test that never explicitly
    // seeds a region keeps behaving exactly as it did before Phase 4.
    regionId: row.regionId ?? "kanto",
    // Matches PlayerProfile.selectedWildLevelBracketIndex's own nullable,
    // no-@default column — every existing test that never explicitly seeds
    // this keeps behaving exactly as it did before this feature (null ->
    // falls back to the highest unlocked bracket).
    selectedWildLevelBracketIndex: row.selectedWildLevelBracketIndex ?? null,
    // Matches PlayerProfile.showGymAchievementsOnProfile's own
    // @default(true).
    showGymAchievementsOnProfile: row.showGymAchievementsOnProfile ?? true,
    // Matches PlayerProfile.soundEnabled's own @default(true).
    soundEnabled: row.soundEnabled ?? true,
    avatarDexNumber: row.avatarDexNumber ?? null,
    showPartyOnProfile: row.showPartyOnProfile ?? true,
    showStatsOnProfile: row.showStatsOnProfile ?? true,
    showAboutMeOnProfile: row.showAboutMeOnProfile ?? true,
    aboutMe: row.aboutMe ?? "",
    profileThemeId: row.profileThemeId ?? "default",
    lastSeenAt: row.lastSeenAt ?? null,
    onboardingCompleted: row.onboardingCompleted ?? false,
    starterPokemonId: row.starterPokemonId ?? null,
  };
  profiles.set(row.id, full);
  if (row.username !== undefined) {
    users.set(row.id, { id: row.id, username: row.username, email: null, failedLoginAttempts: 0, lockedUntil: null });
  }
  return full;
}

// PLAYER SEARCH / FAILED LOGIN LOCKOUT — seeds a standalone fake User row.
// Prefer passing `username` directly to seedPlayerProfile above for the
// common case of "one player, needs a username"; this exists for tests
// that need a User row WITHOUT (or before) its matching PlayerProfile, or
// that need to seed email/lockout state (login-lockout.ts's own tests) —
// every field beyond id/username defaults to the same "fresh account"
// state a real freshly-registered User row has.
export function seedUser(row: {
  id: string;
  username: string | null;
  email?: string | null;
  failedLoginAttempts?: number;
  lockedUntil?: Date | null;
}) {
  const full: UserRow = {
    id: row.id,
    username: row.username,
    email: row.email ?? null,
    failedLoginAttempts: row.failedLoginAttempts ?? 0,
    lockedUntil: row.lockedUntil ?? null,
  };
  users.set(row.id, full);
  return full;
}

export function getUserRow(id: string) {
  const row = users.get(id);
  return row ? { ...row } : undefined;
}

// AUTH SECURITY — LOGIN RATE LIMITING — seed/get helpers for
// LoginAttemptLock, same "seed + read-only getter" pair every other fake
// table here already provides. Keyed by (identifierKey, ipHash) — matching
// the real @@unique([identifierKey, ipHash]) constraint — never by a User
// id, since login-lockout.ts rate-limits identifiers that may not resolve
// to any real account at all.
function loginAttemptLockKey(identifierKey: string, ipHash: string): string {
  return `${identifierKey}::${ipHash}`;
}

export function seedLoginAttemptLock(row: {
  identifierKey: string;
  ipHash: string;
  failedAttempts?: number;
  lockedUntil?: Date | null;
}) {
  const now = new Date();
  const full: LoginAttemptLockRow = {
    id: nextId("login_attempt_lock"),
    identifierKey: row.identifierKey,
    ipHash: row.ipHash,
    failedAttempts: row.failedAttempts ?? 0,
    lockedUntil: row.lockedUntil ?? null,
    createdAt: now,
    updatedAt: now,
  };
  loginAttemptLocks.set(loginAttemptLockKey(row.identifierKey, row.ipHash), full);
  return full;
}

// ACCOUNT DELETION — seed/get helpers, same "seed + read-only getter" pair
// every other fake table here already provides. Lets tests construct
// expired/already-consumed states directly, without going through
// requestAccountDeletion's own (always-fresh) create path.
export function seedAccountDeletionRequest(row: {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  consumedAt?: Date | null;
}) {
  const id = nextId("account_deletion_request");
  const full: AccountDeletionRequestRow = {
    id,
    userId: row.userId,
    tokenHash: row.tokenHash,
    expiresAt: row.expiresAt,
    consumedAt: row.consumedAt ?? null,
    createdAt: new Date(),
  };
  accountDeletionRequests.set(id, full);
  return full;
}

export function getAccountDeletionRequestByUserId(userId: string) {
  const row = [...accountDeletionRequests.values()].find((candidate) => candidate.userId === userId);
  return row ? { ...row } : undefined;
}

export function getLoginAttemptLockRow(identifierKey: string, ipHash: string) {
  const row = loginAttemptLocks.get(loginAttemptLockKey(identifierKey, ipHash));
  return row ? { ...row } : undefined;
}

// GLOBAL CHAT — bypasses sendGlobalChatMessage's own validation/cooldown/cap
// entirely (unlike calling the real service in a loop), so ordering/cap
// tests can seed many rows with explicit, controlled createdAt values
// without fighting the 1-per-second cooldown or waiting on real wall-clock
// time between inserts.
export function seedGlobalChatMessage(row: { id?: string; playerId: string; message?: string; createdAt?: Date }) {
  const id = row.id ?? nextId("chat");
  const full: GlobalChatMessageRow = {
    id,
    playerId: row.playerId,
    message: row.message ?? "hello",
    createdAt: row.createdAt ?? new Date(),
  };
  globalChatMessages.set(id, full);
  return full;
}

export function getGlobalChatMessageRows() {
  return [...globalChatMessages.values()].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime()).map((row) => ({ ...row }));
}

export function getGlobalChatMessageCount() {
  return globalChatMessages.size;
}

// FRIENDS PHASE 1 — bypasses sendFriendRequest's own validation/notification
// entirely, so tests can seed a specific relationship state directly (e.g.
// an already-accepted friendship, or a pending request from a specific
// requester) without needing to route through the real flow first.
export function seedFriendship(row: {
  id?: string;
  requesterId: string;
  addresseeId: string;
  status?: string;
  createdAt?: Date;
}) {
  const id = row.id ?? nextId("friendship");
  const full: FriendshipRow = {
    id,
    requesterId: row.requesterId,
    addresseeId: row.addresseeId,
    friendPairKey: [row.requesterId, row.addresseeId].sort().join("::"),
    status: row.status ?? "pending",
    createdAt: row.createdAt ?? new Date(),
    respondedAt: null,
  };
  friendships.set(id, full);
  return full;
}

export function getFriendshipRow(id: string) {
  const row = friendships.get(id);
  return row ? { ...row } : undefined;
}

export function getFriendshipRowsForPlayer(playerId: string) {
  return [...friendships.values()].filter((row) => row.requesterId === playerId || row.addresseeId === playerId).map((row) => ({ ...row }));
}

export function seedPrivateConversation(row: { id?: string; playerAId: string; playerBId: string; createdAt?: Date }) {
  const id = row.id ?? nextId("conversation");
  const [playerAId, playerBId] = [row.playerAId, row.playerBId].sort();
  const full: PrivateConversationRow = {
    id,
    playerAId,
    playerBId,
    conversationPairKey: [row.playerAId, row.playerBId].sort().join("::"),
    createdAt: row.createdAt ?? new Date(),
  };
  privateConversations.set(id, full);
  return full;
}

export function seedPrivateMessage(row: { id?: string; conversationId: string; senderId: string; message?: string; createdAt?: Date }) {
  const id = row.id ?? nextId("private_message");
  const full: PrivateMessageRow = {
    id,
    conversationId: row.conversationId,
    senderId: row.senderId,
    message: row.message ?? "hello",
    createdAt: row.createdAt ?? new Date(),
  };
  privateMessages.set(id, full);
  return full;
}

export function getPrivateMessageRows(conversationId: string) {
  return [...privateMessages.values()]
    .filter((row) => row.conversationId === conversationId)
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
    .map((row) => ({ ...row }));
}

export function getPrivateMessageCount(conversationId: string) {
  return [...privateMessages.values()].filter((row) => row.conversationId === conversationId).length;
}

export function getPlayerProfileRow(id: string) {
  const row = profiles.get(id);
  return row ? { ...row } : undefined;
}

// POKÉMON DAYCARE — PHASE 1 test helpers — same "seed + read-only getter"
// pair every other feature's fake support already provides (e.g.
// seedFriendship/getFriendshipRow above).
export function seedDaycareStay(row: { playerPokemonId: string; playerId: string; startingLevel: number; depositedAt?: Date }) {
  const now = new Date();
  const full: PlayerDaycareStayRow = {
    playerPokemonId: row.playerPokemonId,
    playerId: row.playerId,
    startingLevel: row.startingLevel,
    depositedAt: row.depositedAt ?? now,
    createdAt: now,
    updatedAt: now,
  };
  daycareStays.set(row.playerPokemonId, full);
  return full;
}

export function getDaycareStayRow(playerPokemonId: string) {
  const row = daycareStays.get(playerPokemonId);
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
  // GAME TUTORIAL — PHASE 3
  isTutorialEncounter?: boolean;
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
    isTutorialEncounter: row.isTutorialEncounter ?? false,
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

// NEW PLAYER STARTER — same "seed + read-only getter" pair every other
// fake table here already provides; needed by select-starter's own tests
// to look up a newly-created Pokémon (and its known moves) without
// already knowing its generated id.
export function getPlayerPokemonsByPlayerId(playerId: string) {
  return [...pokemons.values()].filter((row) => row.playerId === playerId).map((row) => ({ ...row }));
}

export function getKnownMoveRows(playerPokemonId: string) {
  return [...knownMoves.values()].filter((row) => row.playerPokemonId === playerPokemonId).map((row) => ({ ...row }));
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

export function getPlayerKnownMoveFindManyCallCount() {
  return playerKnownMoveFindManyCallCount;
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

export function seedOwnedEgg(row: { id?: string; playerId: string; rarity: string; regionId: string; source?: string | null }) {
  const id = row.id ?? nextId("egg");
  const full: PlayerOwnedEggRow = {
    id,
    playerId: row.playerId,
    rarity: row.rarity,
    regionId: row.regionId,
    source: row.source ?? null,
    createdAt: new Date(),
  };
  ownedEggs.set(id, full);
  return full;
}

export function getOwnedEggRow(id: string) {
  const row = ownedEggs.get(id);
  return row ? { ...row } : undefined;
}

// GYMS & LEAGUES PHASE 8 — every egg row a player owns, regardless of
// source/incubation state (unlike listOwnedEggs' own "not currently
// incubating" filter) — used by League reward tests to assert exact
// rarity/quantity/source.
export function getOwnedEggRowsForPlayer(playerId: string) {
  return [...ownedEggs.values()].filter((row) => row.playerId === playerId).map((row) => ({ ...row }));
}

// Keyed by plain id (not incubatorKey's playerId+permanentSlot composite)
// so a test can freely seed several independent incubators for the same
// player, including duplicates of the same type and/or more than one row
// with permanentSlot: 1 — this seed helper intentionally does NOT replicate
// the real @@unique([playerId, permanentSlot]) constraint, unlike
// playerIncubator.upsert itself (ensureStarterIncubator's own write path),
// which does. A test that needs a seeded incubator to be the SAME row
// ensureStarterIncubator later resolves should call ensureStarterIncubator
// directly instead of seeding one by hand.
export function seedIncubator(row: { id?: string; playerId: string; incubatorTypeId: string; permanentSlot?: number | null }) {
  const id = row.id ?? nextId("incubator");
  const full: PlayerIncubatorRow = {
    id,
    playerId: row.playerId,
    incubatorTypeId: row.incubatorTypeId,
    permanentSlot: row.permanentSlot ?? null,
    createdAt: new Date(),
  };
  incubators.set(id, full);
  return full;
}

export function getIncubatorRows(playerId: string) {
  return [...incubators.values()].filter((row) => row.playerId === playerId).map((row) => ({ ...row }));
}

export function getEggIncubationRow(ownedEggId: string) {
  const row = eggIncubations.get(ownedEggId);
  return row ? { ...row } : undefined;
}

function matchesValue(actual: unknown, expected: unknown): boolean {
  if (expected !== null && typeof expected === "object") {
    const operators = expected as Record<string, unknown>;
    if ("not" in operators) return actual !== operators.not;
    if ("gte" in operators) return (actual as number) >= (operators.gte as number);
    if ("gt" in operators) return (actual as number) > (operators.gt as number);
    // GYMS & LEAGUES PHASE 9 — mirrors real Prisma's `{ field: { in: [...] }
    // }` filter (getPlayerProfilesByIds' own bulk id lookup, lib/auth/
    // player-profile.ts).
    if ("in" in operators) return (operators.in as unknown[]).includes(actual);
    // PLAYER SEARCH — mirrors real Prisma's `{ field: { contains: "...",
    // mode: "insensitive" } }` string filter (player-search.service.ts's
    // searchPlayersByUsername, the only caller).
    if ("contains" in operators) {
      if (actual === null || actual === undefined) return false;
      const haystack = String(actual);
      const needle = String(operators.contains);
      return operators.mode === "insensitive" ? haystack.toLowerCase().includes(needle.toLowerCase()) : haystack.includes(needle);
    }
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

// PLAYER SEARCH — shared by user.findUnique/findMany above: projects a fake
// User row through a real-Prisma-shaped `select`, resolving the
// `playerProfile` relation from the SAME `profiles` map every other fake
// method here already uses (identity mapping: a User row and its
// PlayerProfile share one id — see UserRow's own doc comment). `true`
// returns the whole profile row (public-profile-view.service.ts's own
// `playerProfile: true`); `{ select: {...} }` returns only the requested
// fields (player-search.service.ts's own nested select).
function projectUserRow(
  row: UserRow,
  select?: {
    id?: boolean;
    username?: boolean;
    email?: boolean;
    lockedUntil?: boolean;
    failedLoginAttempts?: boolean;
    playerProfile?: true | { select?: Record<string, boolean> };
  }
) {
  if (!select) return { ...row };

  const result: Record<string, unknown> = {};
  if (select.id) result.id = row.id;
  if (select.username) result.username = row.username;
  if (select.email) result.email = row.email;
  if (select.lockedUntil) result.lockedUntil = row.lockedUntil;
  if (select.failedLoginAttempts) result.failedLoginAttempts = row.failedLoginAttempts;
  if (select.playerProfile) {
    const profile = profiles.get(row.id);
    if (!profile) {
      result.playerProfile = null;
    } else if (select.playerProfile === true) {
      result.playerProfile = { ...profile };
    } else {
      const fieldSelect = select.playerProfile.select ?? {};
      const projected: Record<string, unknown> = {};
      for (const key of Object.keys(fieldSelect)) {
        if (fieldSelect[key]) projected[key] = (profile as unknown as Record<string, unknown>)[key];
      }
      result.playerProfile = projected;
    }
  }
  return result;
}

const client = {
  playerPokemon: {
    // EGGS PHASE 4 — hatch.service.ts's own createOwnedPokemon call (shared
    // with capture.service.ts/select-starter.service.ts) is the first real
    // caller of this specific method in a test context; every field not
    // explicitly passed defaults exactly like seedPlayerPokemon's own
    // defaults above, matching the real schema's own @default(...) values.
    async create({
      data,
    }: {
      data: {
        playerId: string;
        speciesId: string;
        level: number;
        experience: number;
        currentHp: number;
        isStarter: boolean;
        partySlot?: number | null;
        source?: string | null;
      };
    }) {
      const id = nextId("pokemon");
      const full: PlayerPokemonRow = {
        id,
        playerId: data.playerId,
        speciesId: data.speciesId,
        nickname: null,
        level: data.level,
        experience: data.experience,
        currentHp: data.currentHp,
        isStarter: data.isStarter,
        partySlot: data.partySlot ?? null,
        createdAt: new Date(),
        status: null,
        statusTurnsRemaining: null,
        pendingEvolutionSpeciesId: null,
        pendingEvolutionBranch: false,
        evolutionPermanentlyBlocked: false,
        source: data.source ?? null,
      };
      pokemons.set(id, full);
      return { ...full };
    },
    async findUnique({ where }: { where: { id: string } }) {
      return pokemons.get(where.id) ?? null;
    },
    async findUniqueOrThrow({ where }: { where: { id: string } }) {
      const row = pokemons.get(where.id);
      if (!row) throw new Error(`fake prisma: playerPokemon ${where.id} not found`);
      return { ...row };
    },
    // HOME — SIGNIFICANT CAPTURES TODAY — mirrors real Prisma's
    // `findFirst({ where, orderBy })`: significant-captures.service.ts
    // relies on orderBy: { createdAt: "desc" } to resolve "the latest
    // qualifying capture" in one query, so this fake must apply it too
    // rather than returning insertion order.
    async findFirst({
      where,
      orderBy,
    }: {
      where: Record<string, unknown>;
      orderBy?: Record<string, "asc" | "desc"> | Record<string, "asc" | "desc">[];
    }) {
      const rows = [...pokemons.values()].filter((row) => matches(row, where));
      const sorted = applyOrderBy(rows, orderBy);
      return sorted[0] ? { ...sorted[0] } : null;
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
    // PUBLIC PROFILE — mirrors real Prisma's `count({ where })`, needed by
    // getOwnedPokemonStats (features/pokemon/services/player-pokemon.ts),
    // the first caller under a test context (public-profile-view.test.ts).
    async count({ where }: { where: Record<string, unknown> }) {
      return [...pokemons.values()].filter((row) => matches(row, where)).length;
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
    // RELEASE POKÉMON — release-pokemon.service.ts's own single real
    // caller, only ever reached after its own ownership/in-party/in-battle/
    // in-daycare/last-pokemon guards already passed — same "throw if
    // missing" shape playerOwnedEgg's own delete() above already
    // establishes, never a silent no-op.
    async delete({ where }: { where: { id: string } }) {
      const row = pokemons.get(where.id);
      if (!row) throw new Error(`fake prisma: playerPokemon ${where.id} not found for delete`);
      pokemons.delete(where.id);
      return { ...row };
    },
  },
  playerProfile: {
    // NEW PLAYER STARTER — `userId` + `select` support added for
    // select-starter.service.ts's own findUniqueOrThrow({where:{userId},
    // select:{id:true}}) call — same "id === userId in this fake's own
    // convention" dual-key lookup findUnique below already uses.
    async findUniqueOrThrow({
      where,
      select,
    }: {
      where: { id: string } | { userId: string };
      select?: { id?: boolean };
    }) {
      const lookupId = "id" in where ? where.id : where.userId;
      const row = profiles.get(lookupId);
      if (!row) throw new Error(`fake prisma: playerProfile ${lookupId} not found`);
      if (select?.id) return { id: row.id };
      return { ...row };
    },
    // STARTING BALANCE — mirrors ensurePlayerProfile's own real call
    // exactly (lib/auth/player-profile.ts): a no-op `update` on an
    // existing row (never re-applies `create`'s starting values), a full
    // row seeded from `create` the first time — same "profile id == user
    // id" convention every other method here already uses, and the same
    // default-filling seedPlayerProfile above already establishes for
    // every column `create` doesn't explicitly set.
    async upsert({
      where,
      create,
      update,
    }: {
      where: { id: string } | { userId: string };
      create: { userId: string; displayName: string; coins?: number; gold?: number };
      update: Record<string, unknown>;
    }) {
      const lookupId = "id" in where ? where.id : where.userId;
      const existing = profiles.get(lookupId);
      if (existing) {
        applyNumericOperators(existing as unknown as Record<string, unknown>, update);
        return { ...existing };
      }
      const full: PlayerProfileRow = {
        id: lookupId,
        displayName: create.displayName,
        level: 1,
        experience: 0,
        coins: create.coins ?? 500,
        gold: create.gold ?? 0,
        regionId: "kanto",
        selectedWildLevelBracketIndex: null,
        showGymAchievementsOnProfile: true,
        soundEnabled: true,
        avatarDexNumber: null,
        showPartyOnProfile: true,
        showStatsOnProfile: true,
        showAboutMeOnProfile: true,
        aboutMe: "",
        profileThemeId: "default",
        lastSeenAt: null,
        onboardingCompleted: false,
        starterPokemonId: null,
      };
      profiles.set(lookupId, full);
      return { ...full };
    },
    // FIELD BATTLE PERFORMANCE — mirrors getActiveBattleSessionWithParty's
    // (battle-session.service.ts) one-query read of PlayerProfile's own
    // `fieldBattleSession`/`pokemon` relations, since the real Prisma schema
    // has no separate normalized fake for relation traversal — this reads
    // straight out of the same `sessions`/`pokemons` maps every other fake
    // method here already uses, keyed by the profile's own id (== playerId
    // throughout these tests, exactly like every other fake table).
    async findUnique({
      where,
      select,
    }: {
      // AUTH SECURITY — SECURITY NOTIFICATION — `userId` support added for
      // lib/auth/player-profile.ts's notifySecurityLoginLockout, the real
      // Prisma schema's own PlayerProfile.userId @unique lookup. This
      // fake's own PlayerProfileRow has no separate stored `userId` field
      // (its established convention treats profile id and session user id
      // as identical — see e.g. player-profile.fake.ts's own doc comment),
      // so `where.userId` resolves through the exact same `profiles` map
      // as `where.id` — accurate GIVEN that convention, without needing a
      // second stored field that would only ever hold the same value.
      where: { id: string } | { userId: string };
      select?: {
        id?: boolean;
        fieldBattleSession?: boolean;
        pokemon?: { where?: Record<string, unknown>; orderBy?: Record<string, "asc" | "desc">; take?: number };
      };
    }) {
      const lookupId = "id" in where ? where.id : where.userId;
      const row = profiles.get(lookupId);
      if (!row) return null;
      if (!select) return { ...row };

      const result: Record<string, unknown> = {};
      if (select.id) {
        result.id = row.id;
      }
      if (select.fieldBattleSession) {
        result.fieldBattleSession = sessions.get(lookupId) ?? null;
      }
      if (select.pokemon) {
        const pokemonArgs = select.pokemon;
        const rows = [...pokemons.values()].filter(
          (pokemon) => pokemon.playerId === lookupId && matches(pokemon, pokemonArgs.where)
        );
        const sorted = applyOrderBy(rows, pokemonArgs.orderBy);
        result.pokemon = (pokemonArgs.take ? sorted.slice(0, pokemonArgs.take) : sorted).map((r) => ({ ...r }));
      }
      return result;
    },
    async update({ where, data }: { where: { id: string }; data: Record<string, unknown> }) {
      const row = profiles.get(where.id);
      if (!row) throw new Error(`fake prisma: playerProfile ${where.id} not found for update`);
      applyNumericOperators(row as unknown as Record<string, unknown>, data);
      return { ...row };
    },
    // GYMS & LEAGUES PHASE 9 — bulk lookup for getPlayerProfilesByIds
    // (lib/auth/player-profile.ts), used by League bracket/achievement/
    // current-champion display-name resolution.
    async findMany({ where }: { where: Record<string, unknown> }) {
      return [...profiles.values()].filter((row) => matches(row, where)).map((row) => ({ ...row }));
    },
    // ONLINE PRESENCE — mirrors presence.service.ts's getOnlinePlayerCount:
    // a plain `{ lastSeenAt: { gte: cutoff } }` count, reusing matchesValue's
    // existing `gte` operator support (which compares via JS's native `>=`,
    // so it works on Date instances exactly like it already does on numbers
    // elsewhere in this fake).
    async count({ where }: { where: Record<string, unknown> }) {
      return [...profiles.values()].filter((row) => matches(row, where)).length;
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
  // GYMS & LEAGUES PHASE 3 — mirrors fieldBattleSession's own fake shape
  // (single row per playerId, plain create/findUnique/updateMany/deleteMany
  // — no upsert, since a session is only ever created once per attempt).
  npcBattleSession: {
    async create({ data }: { data: Record<string, unknown> }) {
      const full: NpcBattleSessionRow = {
        id: nextId("npc_battle"),
        playerId: data.playerId as string,
        battleSource: data.battleSource as string,
        regionId: data.regionId as string,
        gymNumber: (data.gymNumber as number | null | undefined) ?? null,
        battleSlot: (data.battleSlot as string | null | undefined) ?? null,
        npcTeam: data.npcTeam,
        npcActiveIndex: (data.npcActiveIndex as number | undefined) ?? 0,
        npcCurrentHp: data.npcCurrentHp as number,
        npcStatus: (data.npcStatus as string | null | undefined) ?? null,
        npcStatusTurnsRemaining: (data.npcStatusTurnsRemaining as number | null | undefined) ?? null,
        npcStatStages: data.npcStatStages ?? {},
        npcVolatileState: data.npcVolatileState ?? {},
        playerPokemonIds: data.playerPokemonIds,
        activePlayerPokemonId: data.activePlayerPokemonId as string,
        playerBattleHp: data.playerBattleHp,
        playerBattleStatus: data.playerBattleStatus ?? {},
        playerStatStages: data.playerStatStages ?? {},
        playerVolatileState: data.playerVolatileState ?? {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      npcBattleSessions.set(full.playerId, full);
      return { ...full };
    },
    async findUnique({ where }: { where: { playerId: string } }) {
      const row = npcBattleSessions.get(where.playerId);
      return row ? { ...row } : null;
    },
    // GYM BATTLE POLISH (later task) — `where` may now also carry an
    // `updatedAt` CAS guard (see gym-battle-session.service.ts's
    // guardedSessionUpdate/guardedSessionDelete): a full matches() check
    // against the row, not just the playerId lookup, so a stale guard
    // correctly reports count:0 instead of blindly mutating — the same
    // "count is the fact" idiom every other guarded updateMany in this fake
    // already uses (e.g. playerInventoryItem.updateMany's own
    // quantity:{gte} guard).
    async updateMany({ where, data }: { where: { playerId: string } & Record<string, unknown>; data: Record<string, unknown> }) {
      const row = npcBattleSessions.get(where.playerId);
      if (!row || !matches(row, where)) return { count: 0 };
      Object.assign(row, data, { updatedAt: new Date() });
      return { count: 1 };
    },
    async deleteMany({ where }: { where: { playerId: string } & Record<string, unknown> }) {
      const row = npcBattleSessions.get(where.playerId);
      if (!row || !matches(row, where)) return { count: 0 };
      npcBattleSessions.delete(where.playerId);
      return { count: 1 };
    },
  },
  // GAME TUTORIAL — PHASE 0 — mirrors npcBattleSession's own shape (single
  // row per playerId), plus an idempotent upsert mirroring ensurePlayerProfile's
  // own "create on first call, no-op on every call after" idiom
  // (lib/auth/player-profile.ts) for getOrCreateTutorialProgress.
  playerTutorialProgress: {
    async upsert({
      where,
      create,
      update,
    }: {
      where: { playerId: string };
      create: { playerId: string };
      update: Record<string, unknown>;
    }) {
      const existing = tutorialProgresses.get(where.playerId);
      if (existing) {
        Object.assign(existing, update, { updatedAt: new Date() });
        return { ...existing };
      }
      const full: PlayerTutorialProgressRow = {
        id: nextId("tutorial_progress"),
        playerId: create.playerId,
        currentStageId: "welcome",
        currentSubStep: null,
        status: "not_started",
        completedAt: null,
        rewardClaimed: false,
        pidgeyCaptured: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      tutorialProgresses.set(where.playerId, full);
      return { ...full };
    },
    async findUnique({ where }: { where: { playerId: string } }) {
      const row = tutorialProgresses.get(where.playerId);
      return row ? { ...row } : null;
    },
    // The CAS-style guard tutorial-progress.service.ts's advanceTutorialStage
    // relies on (where also carries the currently-read currentStageId) —
    // same idiom promoteToNextEncounter's own updateMany guard already uses
    // (battle-session.service.ts).
    async updateMany({ where, data }: { where: { playerId: string } & Record<string, unknown>; data: Record<string, unknown> }) {
      const row = tutorialProgresses.get(where.playerId);
      if (!row || !matches(row, where)) return { count: 0 };
      Object.assign(row, data, { updatedAt: new Date() });
      return { count: 1 };
    },
  },
  // GYMS & LEAGUES PHASE 1 fakes — same idempotent-upsert idiom as
  // playerSeenSpecies above: create on first call, a no-op "return the
  // existing row unchanged" on every call after, proving
  // markGymBattleCompleted/markRegionalChampionDefeated's own idempotency
  // without a real unique-constraint violation to catch it.
  playerGymBattleProgress: {
    // GYMS & LEAGUES PHASE 4 — mirrors real Postgres unique-constraint
    // behavior for markGymBattleCompleted's new create-then-catch idiom:
    // throws a P2002-shaped error (same code Prisma's real client surfaces)
    // when the (playerId, regionId, gymNumber, battleSlot) key already
    // exists, rather than silently overwriting.
    async create({ data }: { data: { playerId: string; regionId: string; gymNumber: number; battleSlot: string } }) {
      const key = gymBattleProgressKey(data.playerId, data.regionId, data.gymNumber, data.battleSlot);
      if (gymBattleProgress.has(key)) {
        throw Object.assign(new Error("Unique constraint failed on playerGymBattleProgress"), { code: "P2002" });
      }
      const full: PlayerGymBattleProgressRow = { id: nextId("gym_progress"), completedAt: new Date(), ...data };
      gymBattleProgress.set(key, full);
      return { ...full };
    },
    async upsert({
      where,
      create,
    }: {
      where: { playerId_regionId_gymNumber_battleSlot: { playerId: string; regionId: string; gymNumber: number; battleSlot: string } };
      create: { playerId: string; regionId: string; gymNumber: number; battleSlot: string };
      update: Record<string, unknown>;
    }) {
      const { playerId, regionId, gymNumber, battleSlot } = where.playerId_regionId_gymNumber_battleSlot;
      const key = gymBattleProgressKey(playerId, regionId, gymNumber, battleSlot);
      const existing = gymBattleProgress.get(key);
      if (existing) return { ...existing };
      const full: PlayerGymBattleProgressRow = { id: nextId("gym_progress"), completedAt: new Date(), ...create };
      gymBattleProgress.set(key, full);
      return { ...full };
    },
    async findUnique({
      where,
    }: {
      where: { playerId_regionId_gymNumber_battleSlot: { playerId: string; regionId: string; gymNumber: number; battleSlot: string } };
    }) {
      const { playerId, regionId, gymNumber, battleSlot } = where.playerId_regionId_gymNumber_battleSlot;
      const row = gymBattleProgress.get(gymBattleProgressKey(playerId, regionId, gymNumber, battleSlot));
      return row ? { ...row } : null;
    },
    async findMany({ where }: { where: Record<string, unknown> }) {
      return [...gymBattleProgress.values()].filter((row) => matches(row, where)).map((row) => ({ ...row }));
    },
    async count({ where }: { where: Record<string, unknown> }) {
      return [...gymBattleProgress.values()].filter((row) => matches(row, where)).length;
    },
  },
  playerGymBadge: {
    async upsert({
      where,
      create,
    }: {
      where: { playerId_regionId_gymNumber: { playerId: string; regionId: string; gymNumber: number } };
      create: { playerId: string; regionId: string; gymNumber: number };
      update: Record<string, unknown>;
    }) {
      const { playerId, regionId, gymNumber } = where.playerId_regionId_gymNumber;
      const key = gymBadgeKey(playerId, regionId, gymNumber);
      const existing = gymBadges.get(key);
      if (existing) return { ...existing };
      const full: PlayerGymBadgeRow = { id: nextId("gym_badge"), awardedAt: new Date(), ...create };
      gymBadges.set(key, full);
      return { ...full };
    },
    async findUnique({ where }: { where: { playerId_regionId_gymNumber: { playerId: string; regionId: string; gymNumber: number } } }) {
      const { playerId, regionId, gymNumber } = where.playerId_regionId_gymNumber;
      const row = gymBadges.get(gymBadgeKey(playerId, regionId, gymNumber));
      return row ? { ...row } : null;
    },
    async findMany({ where }: { where: Record<string, unknown> }) {
      return [...gymBadges.values()].filter((row) => matches(row, where)).map((row) => ({ ...row }));
    },
  },
  playerRegionalChampionProgress: {
    // Same real-unique-constraint mirror as playerGymBattleProgress.create
    // above, keyed on (playerId, regionId) — used by
    // markRegionalChampionDefeated's create-then-catch idiom.
    async create({ data }: { data: { playerId: string; regionId: string } }) {
      const key = regionalChampionOrMedalKey(data.playerId, data.regionId);
      if (regionalChampionProgress.has(key)) {
        throw Object.assign(new Error("Unique constraint failed on playerRegionalChampionProgress"), { code: "P2002" });
      }
      const full: PlayerRegionalChampionProgressRow = { id: nextId("champion_progress"), completedAt: new Date(), ...data };
      regionalChampionProgress.set(key, full);
      return { ...full };
    },
    async upsert({
      where,
      create,
    }: {
      where: { playerId_regionId: { playerId: string; regionId: string } };
      create: { playerId: string; regionId: string };
      update: Record<string, unknown>;
    }) {
      const key = regionalChampionOrMedalKey(where.playerId_regionId.playerId, where.playerId_regionId.regionId);
      const existing = regionalChampionProgress.get(key);
      if (existing) return { ...existing };
      const full: PlayerRegionalChampionProgressRow = { id: nextId("champion_progress"), completedAt: new Date(), ...create };
      regionalChampionProgress.set(key, full);
      return { ...full };
    },
    async findUnique({ where }: { where: { playerId_regionId: { playerId: string; regionId: string } } }) {
      const row = regionalChampionProgress.get(regionalChampionOrMedalKey(where.playerId_regionId.playerId, where.playerId_regionId.regionId));
      return row ? { ...row } : null;
    },
  },
  playerRegionalMedal: {
    async upsert({
      where,
      create,
    }: {
      where: { playerId_regionId: { playerId: string; regionId: string } };
      create: { playerId: string; regionId: string };
      update: Record<string, unknown>;
    }) {
      const key = regionalChampionOrMedalKey(where.playerId_regionId.playerId, where.playerId_regionId.regionId);
      const existing = regionalMedals.get(key);
      if (existing) return { ...existing };
      const full: PlayerRegionalMedalRow = { id: nextId("medal"), awardedAt: new Date(), ...create };
      regionalMedals.set(key, full);
      return { ...full };
    },
    async findUnique({ where }: { where: { playerId_regionId: { playerId: string; regionId: string } } }) {
      const row = regionalMedals.get(regionalChampionOrMedalKey(where.playerId_regionId.playerId, where.playerId_regionId.regionId));
      return row ? { ...row } : null;
    },
    // PROFILE ACHIEVEMENTS (later task) — mirrors playerGymBadge.findMany's
    // own generic matches()-filtered listing, needed by
    // getOwnedRegionalMedals (gym-progression.service.ts).
    async findMany({ where }: { where: Record<string, unknown> }) {
      return [...regionalMedals.values()].filter((row) => matches(row, where)).map((row) => ({ ...row }));
    },
  },
  // GYMS & LEAGUES PHASE 5 fakes.
  leagueTournament: {
    async create({
      data,
    }: {
      data: { leagueId: string; weekKey: string; registrationClosesAt: Date; round1StartsAt: Date; status?: string };
    }) {
      const duplicate = [...leagueTournaments.values()].some((row) => row.leagueId === data.leagueId && row.weekKey === data.weekKey);
      if (duplicate) {
        throw Object.assign(new Error("Unique constraint failed on league_tournament"), { code: "P2002" });
      }
      const id = nextId("league_tournament");
      const full: LeagueTournamentRow = {
        id,
        leagueId: data.leagueId,
        weekKey: data.weekKey,
        registrationClosesAt: data.registrationClosesAt,
        round1StartsAt: data.round1StartsAt,
        status: data.status ?? "registration-open",
        rewardsGrantedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      leagueTournaments.set(id, full);
      return { ...full };
    },
    async findUnique({ where }: { where: { id?: string; leagueId_weekKey?: { leagueId: string; weekKey: string } } }) {
      const row = findLeagueTournament(where);
      return row ? { ...row } : null;
    },
    async findUniqueOrThrow({ where }: { where: { id?: string; leagueId_weekKey?: { leagueId: string; weekKey: string } } }) {
      const row = findLeagueTournament(where);
      if (!row) throw new Error("fake prisma: leagueTournament not found");
      return { ...row };
    },
    async update({ where, data }: { where: { id: string }; data: Record<string, unknown> }) {
      const row = leagueTournaments.get(where.id);
      if (!row) throw new Error("fake prisma: leagueTournament not found for update");
      Object.assign(row, data, { updatedAt: new Date() });
      return { ...row };
    },
    async updateMany({ where, data }: { where: Record<string, unknown>; data: Record<string, unknown> }) {
      let count = 0;
      for (const row of leagueTournaments.values()) {
        if (matches(row, where)) {
          Object.assign(row, data, { updatedAt: new Date() });
          count += 1;
        }
      }
      return { count };
    },
    // GYMS & LEAGUES PHASE 8 — used by league-achievement.service.ts's own
    // "every completed tournament for this League" read.
    async findMany({ where }: { where?: Record<string, unknown> }) {
      return [...leagueTournaments.values()].filter((row) => matches(row, where)).map((row) => ({ ...row }));
    },
  },
  leagueTournamentParticipant: {
    async create({ data }: { data: { tournamentId: string; playerId?: string | null; participantType: string } }) {
      const playerId = data.playerId ?? null;
      if (playerId !== null) {
        const duplicate = [...leagueTournamentParticipants.values()].some(
          (row) => row.tournamentId === data.tournamentId && row.playerId === playerId
        );
        if (duplicate) {
          throw Object.assign(new Error("Unique constraint failed on league_tournament_participant"), { code: "P2002" });
        }
      }
      const id = nextId("league_participant");
      const full: LeagueTournamentParticipantRow = {
        id,
        tournamentId: data.tournamentId,
        playerId,
        participantType: data.participantType,
        registeredAt: new Date(),
      };
      leagueTournamentParticipants.set(id, full);
      return { ...full };
    },
    async findUnique({
      where,
    }: {
      where: { id?: string; tournamentId_playerId?: { tournamentId: string; playerId: string } };
    }) {
      if (where.id) {
        const row = leagueTournamentParticipants.get(where.id);
        return row ? { ...row } : null;
      }
      if (where.tournamentId_playerId) {
        const { tournamentId, playerId } = where.tournamentId_playerId;
        const row = [...leagueTournamentParticipants.values()].find((r) => r.tournamentId === tournamentId && r.playerId === playerId);
        return row ? { ...row } : null;
      }
      return null;
    },
    async findMany({
      where,
      orderBy,
    }: {
      where?: Record<string, unknown>;
      orderBy?: Record<string, "asc" | "desc">;
    }) {
      const rows = [...leagueTournamentParticipants.values()].filter((row) => matches(row, where));
      return applyOrderBy(rows, orderBy).map((row) => ({ ...row }));
    },
    // LEAGUE REGISTRATION — CANCEL (later task) — cancelLeagueRegistration's
    // own deleteMany({ where: { tournamentId, playerId, participantType } }),
    // same "filter + delete matching keys, return the count" shape every
    // other deleteMany in this fake already uses.
    async deleteMany({ where }: { where: Record<string, unknown> }) {
      let count = 0;
      for (const [key, row] of leagueTournamentParticipants) {
        if (matches(row, where)) {
          leagueTournamentParticipants.delete(key);
          count += 1;
        }
      }
      return { count };
    },
  },
  leagueTournamentMatch: {
    async create({
      data,
    }: {
      data: {
        tournamentId: string;
        roundNumber: number;
        slot: number;
        scheduledAt: Date;
        participantAId: string;
        participantBId: string;
        status?: string;
        involvesComputer?: boolean;
      };
    }) {
      // LEAGUE ROUND-1 GENERATION LIFECYCLE FIX — mirrors the real schema's
      // @@unique([tournamentId, roundNumber, slot]) (prisma/schema.prisma),
      // previously unenforced by this fake. Needed so a genuine race
      // between two concurrent generateRound1ForTournament calls (now
      // reachable in production via ensureRound1GeneratedForActiveTournament)
      // is caught the same way real Postgres would catch it — the second
      // writer's create throws P2002 instead of silently persisting a
      // duplicate match row.
      const duplicate = [...leagueTournamentMatches.values()].some(
        (row) => row.tournamentId === data.tournamentId && row.roundNumber === data.roundNumber && row.slot === data.slot
      );
      if (duplicate) {
        throw Object.assign(new Error("Unique constraint failed on league_tournament_match"), { code: "P2002" });
      }
      const id = nextId("league_match");
      const full: LeagueTournamentMatchRow = {
        id,
        tournamentId: data.tournamentId,
        roundNumber: data.roundNumber,
        slot: data.slot,
        scheduledAt: data.scheduledAt,
        participantAId: data.participantAId,
        participantBId: data.participantBId,
        winnerParticipantId: null,
        status: data.status ?? "scheduled",
        involvesComputer: data.involvesComputer ?? false,
        resolutionReason: null,
      };
      leagueTournamentMatches.set(id, full);
      return { ...full };
    },
    async findMany({
      where,
      orderBy,
    }: {
      where?: Record<string, unknown>;
      orderBy?: Record<string, "asc" | "desc">;
    }) {
      const rows = [...leagueTournamentMatches.values()].filter((row) => matches(row, where));
      return applyOrderBy(rows, orderBy).map((row) => ({ ...row }));
    },
    async findUnique({ where }: { where: { id: string } }) {
      const row = leagueTournamentMatches.get(where.id);
      return row ? { ...row } : null;
    },
    // GYMS & LEAGUES PHASE 7 — used by advanceCompletedLeagueRound's own
    // cheap "does the next round already exist" idempotency check.
    async findFirst({ where }: { where?: Record<string, unknown> }) {
      const row = [...leagueTournamentMatches.values()].find((candidate) => matches(candidate, where));
      return row ? { ...row } : null;
    },
    // GYMS & LEAGUES PHASE 6 — used by league-battle-action.service.ts's
    // own exactly-once match-completion write; `matches` already supports
    // the `{ status: { not: "completed" } }` shape via matchesValue's
    // "not" operator.
    async updateMany({ where, data }: { where: Record<string, unknown>; data: Record<string, unknown> }) {
      let count = 0;
      for (const row of leagueTournamentMatches.values()) {
        if (matches(row, where)) {
          Object.assign(row, data);
          count += 1;
        }
      }
      return { count };
    },
  },
  // GYMS & LEAGUES PHASE 7 fakes.
  leagueTournamentPlacement: {
    async create({
      data,
    }: {
      data: { tournamentId: string; place: number; participantId: string; playerId: string };
    }) {
      const duplicate = [...leagueTournamentPlacements.values()].some(
        (row) => row.tournamentId === data.tournamentId && row.place === data.place
      );
      if (duplicate) {
        throw Object.assign(new Error("Unique constraint failed on league_tournament_placement"), { code: "P2002" });
      }
      const id = nextId("league_placement");
      const full: LeagueTournamentPlacementRow = {
        id,
        tournamentId: data.tournamentId,
        place: data.place,
        participantId: data.participantId,
        playerId: data.playerId,
        createdAt: new Date(),
      };
      leagueTournamentPlacements.set(id, full);
      return { ...full };
    },
    async findMany({ where, orderBy }: { where?: Record<string, unknown>; orderBy?: Record<string, "asc" | "desc"> }) {
      const rows = [...leagueTournamentPlacements.values()].filter((row) => matches(row, where));
      return applyOrderBy(rows, orderBy).map((row) => ({ ...row }));
    },
    // ACCOUNT DELETION — explicit cleanup call site (this row has no real
    // FK to PlayerProfile, see that model's own schema.prisma doc comment,
    // so it would never cascade on its own).
    async deleteMany({ where }: { where: Record<string, unknown> }) {
      let count = 0;
      for (const [id, row] of leagueTournamentPlacements) {
        if (matches(row, where)) {
          leagueTournamentPlacements.delete(id);
          count += 1;
        }
      }
      return { count };
    },
  },
  // GYMS & LEAGUES PHASE 6 fakes.
  leagueBattleSession: {
    async create({
      data,
    }: {
      data: { tournamentMatchId: string; participantAId: string; participantBId: string };
    }) {
      const duplicate = [...leagueBattleSessions.values()].some((row) => row.tournamentMatchId === data.tournamentMatchId);
      if (duplicate) {
        throw Object.assign(new Error("Unique constraint failed on league_battle_session"), { code: "P2002" });
      }
      const id = nextId("league_battle_session");
      const now = new Date();
      const full: LeagueBattleSessionRow = {
        id,
        tournamentMatchId: data.tournamentMatchId,
        participantAId: data.participantAId,
        participantBId: data.participantBId,
        participantAJoinedAt: null,
        participantAPokemon: null,
        participantAActiveSlotId: null,
        participantABattleHp: null,
        participantAStatusMap: {},
        participantAStatStages: {},
        participantAVolatileState: {},
        participantAPendingMoveId: null,
        participantBJoinedAt: null,
        participantBPokemon: null,
        participantBActiveSlotId: null,
        participantBBattleHp: null,
        participantBStatusMap: {},
        participantBStatStages: {},
        participantBVolatileState: {},
        participantBPendingMoveId: null,
        turnNumber: 1,
        status: "waiting-for-players",
        winnerParticipantId: null,
        startedAt: now,
        completedAt: null,
        updatedAt: now,
      };
      leagueBattleSessions.set(id, full);
      return { ...full };
    },
    async findUnique({ where }: { where: { id?: string; tournamentMatchId?: string } }) {
      const row = findLeagueBattleSession(where);
      return row ? { ...row } : null;
    },
    async findUniqueOrThrow({ where }: { where: { id?: string; tournamentMatchId?: string } }) {
      const row = findLeagueBattleSession(where);
      if (!row) throw new Error("fake prisma: leagueBattleSession not found");
      return { ...row };
    },
    async update({ where, data }: { where: { id: string }; data: Record<string, unknown> }) {
      const row = leagueBattleSessions.get(where.id);
      if (!row) throw new Error("fake prisma: leagueBattleSession not found for update");
      applyNumericOperators(row as unknown as Record<string, unknown>, data);
      row.updatedAt = new Date();
      return { ...row };
    },
    async updateMany({ where, data }: { where: Record<string, unknown>; data: Record<string, unknown> }) {
      let count = 0;
      for (const row of leagueBattleSessions.values()) {
        if (matches(row, where)) {
          applyNumericOperators(row as unknown as Record<string, unknown>, data);
          row.updatedAt = new Date();
          count += 1;
        }
      }
      return { count };
    },
    async findMany({ where }: { where?: Record<string, unknown> }) {
      return [...leagueBattleSessions.values()].filter((row) => matches(row, where)).map((row) => ({ ...row }));
    },
  },
  // EGGS PHASE 1 fakes — see the row interfaces' own doc comment above for
  // what these mirror.
  playerOwnedEgg: {
    async create({ data }: { data: { playerId: string; rarity: string; regionId: string; source?: string | null } }) {
      const id = nextId("egg");
      const full: PlayerOwnedEggRow = {
        id,
        playerId: data.playerId,
        rarity: data.rarity,
        regionId: data.regionId,
        source: data.source ?? null,
        createdAt: new Date(),
      };
      ownedEggs.set(id, full);
      return { ...full };
    },
    async findUnique({ where }: { where: { id: string } }) {
      const row = ownedEggs.get(where.id);
      return row ? { ...row } : null;
    },
    // Only the two filter shapes egg-ownership.service.ts's listOwnedEggs
    // actually sends: a plain playerId match, plus the relation filter
    // `activeIncubation: null` — "no PlayerEggIncubation row references
    // this egg as its ownedEggId" — handled by hand since the generic
    // `matches()` helper only understands flat field equality, never a
    // relation.
    async findMany({
      where,
      orderBy,
    }: {
      where: { playerId?: string; activeIncubation?: null };
      orderBy?: Record<string, "asc" | "desc">;
    }) {
      const rows = [...ownedEggs.values()]
        .filter((row) => (where.playerId === undefined ? true : row.playerId === where.playerId))
        .filter((row) => (where.activeIncubation === null ? !eggIncubations.has(row.id) : true));
      return applyOrderBy(rows, orderBy).map((row) => ({ ...row }));
    },
    // EGGS PHASE 4 — the egg is consumed on a successful hatch
    // (hatch.service.ts).
    async delete({ where }: { where: { id: string } }) {
      const row = ownedEggs.get(where.id);
      if (!row) throw new Error(`fake prisma: playerOwnedEgg ${where.id} not found for delete`);
      ownedEggs.delete(where.id);
      return { ...row };
    },
    // INVENTORY SELL — sell-egg.service.ts's own guarded delete: the
    // `activeIncubation: null` relation filter is resolved by hand, same
    // reasoning findMany's own doc comment above already gives (the
    // generic `matches()` helper only understands flat field equality,
    // never a relation).
    async deleteMany({ where }: { where: { id?: string; playerId?: string; activeIncubation?: null } }) {
      let count = 0;
      for (const [id, row] of ownedEggs) {
        if (where.id !== undefined && row.id !== where.id) continue;
        if (where.playerId !== undefined && row.playerId !== where.playerId) continue;
        if (where.activeIncubation === null && eggIncubations.has(row.id)) continue;
        ownedEggs.delete(id);
        count += 1;
      }
      return { count };
    },
  },
  playerIncubator: {
    // Mirrors playerInventoryItem's own upsert shape exactly — create on
    // first access, a no-op update on every call after, the same
    // idempotent "at most one row per key" guarantee ensureStarterIncubator
    // (incubator.service.ts) relies on. Only ever called for the permanent
    // starter slot (permanentSlot: 1) — consumable instances are always
    // created via the plain `create` below instead.
    async upsert({
      where,
      create,
    }: {
      where: { playerId_permanentSlot: { playerId: string; permanentSlot: number } };
      create: { playerId: string; incubatorTypeId: string; permanentSlot: number };
      update: Record<string, unknown>;
    }) {
      const key = incubatorKey(where.playerId_permanentSlot.playerId, where.playerId_permanentSlot.permanentSlot);
      const existing = incubators.get(key);
      if (existing) return { ...existing };

      const id = nextId("incubator");
      const full: PlayerIncubatorRow = { id, createdAt: new Date(), ...create };
      incubators.set(key, full);
      return { ...full };
    },
    // INCUBATOR EXPANSION — grantIncubator's (incubator.service.ts) own
    // write path: always a brand-new, independent consumable instance
    // (permanentSlot: null), never keyed/deduplicated against anything —
    // calling this twice for the same player+type yields two separate rows,
    // matching the real Prisma `create` this mirrors exactly.
    async create({ data }: { data: { playerId: string; incubatorTypeId: string; permanentSlot: number | null } }) {
      const id = nextId("incubator");
      const full: PlayerIncubatorRow = {
        id,
        playerId: data.playerId,
        incubatorTypeId: data.incubatorTypeId,
        permanentSlot: data.permanentSlot,
        createdAt: new Date(),
      };
      incubators.set(id, full);
      return { ...full };
    },
    async findUnique({ where }: { where: { id: string } }) {
      const row = [...incubators.values()].find((candidate) => candidate.id === where.id);
      return row ? { ...row } : null;
    },
    async findMany({
      where,
      orderBy,
    }: {
      where: Record<string, unknown>;
      orderBy?: Record<string, "asc" | "desc">;
    }) {
      const rows = [...incubators.values()].filter((row) => matches(row, where));
      return applyOrderBy(rows, orderBy).map((row) => ({ ...row }));
    },
    // INVENTORY SELL — sell-incubator.service.ts's own candidate lookup:
    // the `activeIncubation: null` relation filter is stripped out and
    // resolved by hand (same reasoning findMany's sibling models already
    // give — `matches()` only understands flat field equality), the
    // remaining flat fields (playerId/incubatorTypeId/permanentSlot) go
    // through the normal `matches()` helper.
    async findFirst({ where }: { where: Record<string, unknown> }) {
      const { activeIncubation, ...flatWhere } = where;
      const rows = [...incubators.values()].filter((row) => matches(row, flatWhere));
      const filtered = activeIncubation === null ? rows.filter((row) => !incubatorHasActiveIncubation(row.id)) : rows;
      return filtered[0] ? { ...filtered[0] } : null;
    },
    // INCUBATOR EXPANSION — hatch.service.ts's own consume-on-hatch step: a
    // single-use incubator is removed entirely the instant a hatch it held
    // succeeds (the permanent starter incubator is never passed here — see
    // hatchIncubation's own isIncubatorPermanent guard).
    async delete({ where }: { where: { id: string } }) {
      const entry = [...incubators.entries()].find(([, candidate]) => candidate.id === where.id);
      if (!entry) throw new Error(`fake prisma: playerIncubator ${where.id} not found for delete`);
      incubators.delete(entry[0]);
      return { ...entry[1] };
    },
    // INVENTORY SELL — sell-incubator.service.ts's own guarded delete: same
    // by-hand `activeIncubation: null` relation handling as findFirst
    // above. The exact-id + permanentSlot: null + activeIncubation: null
    // WHERE is what makes this safe under a race (a concurrent sell or a
    // just-started incubation for this same candidate finds zero rows).
    async deleteMany({ where }: { where: Record<string, unknown> }) {
      const { activeIncubation, ...flatWhere } = where;
      let count = 0;
      for (const [key, row] of incubators) {
        if (!matches(row, flatWhere)) continue;
        if (activeIncubation === null && incubatorHasActiveIncubation(row.id)) continue;
        incubators.delete(key);
        count += 1;
      }
      return { count };
    },
  },
  playerEggIncubation: {
    async create({ data }: { data: { ownedEggId: string; incubatorId: string; requiredBattleTarget: number } }) {
      const full: PlayerEggIncubationRow = {
        ownedEggId: data.ownedEggId,
        incubatorId: data.incubatorId,
        battleProgress: 0,
        requiredBattleTarget: data.requiredBattleTarget,
        startedAt: new Date(),
      };
      eggIncubations.set(data.ownedEggId, full);
      return { ...full };
    },
    // `ownedEggId` is this model's own primary key (see the real schema's
    // own doc comment) and `incubatorId` carries its own real @@unique —
    // callers pass exactly one of the two, mirroring real Prisma's
    // WhereUniqueInput for a model with more than one unique field.
    async findUnique({ where }: { where: { ownedEggId?: string; incubatorId?: string } }) {
      if (where.ownedEggId !== undefined) {
        const row = eggIncubations.get(where.ownedEggId);
        return row ? { ...row } : null;
      }
      const row = [...eggIncubations.values()].find((candidate) => candidate.incubatorId === where.incubatorId);
      return row ? { ...row } : null;
    },
    // The one relation filter listActiveIncubations (incubation.service.ts)
    // sends — "every incubation whose incubator belongs to this player" —
    // resolved by hand for the same reason playerOwnedEgg.findMany's
    // activeIncubation filter is above.
    async findMany({
      where,
      orderBy,
    }: {
      where: { incubator?: { playerId: string } };
      orderBy?: Record<string, "asc" | "desc">;
    }) {
      let rows = [...eggIncubations.values()];
      if (where.incubator) {
        const incubatorIds = new Set(
          [...incubators.values()].filter((row) => row.playerId === where.incubator!.playerId).map((row) => row.id)
        );
        rows = rows.filter((row) => incubatorIds.has(row.incubatorId));
      }
      return applyOrderBy(rows, orderBy).map((row) => ({ ...row }));
    },
    // EGGS PHASE 3 — the one write path progressActiveIncubations
    // (incubation.service.ts) uses to persist a battleProgress increment.
    async update({
      where,
      data,
    }: {
      where: { ownedEggId: string };
      data: { battleProgress: number };
    }) {
      const row = eggIncubations.get(where.ownedEggId);
      if (!row) throw new Error(`fake prisma: playerEggIncubation ${where.ownedEggId} not found for update`);
      row.battleProgress = data.battleProgress;
      return { ...row };
    },
    // EGGS PHASE 4 — hatch.service.ts's own race guard: matches the exact
    // battleProgress the caller already read, so a racing/retried hatch
    // call (or an incubation whose progress changed since that read) finds
    // zero rows here and safely aborts before creating anything.
    async deleteMany({ where }: { where: Record<string, unknown> }) {
      let count = 0;
      for (const [key, row] of eggIncubations) {
        if (matches(row, where)) {
          eggIncubations.delete(key);
          count += 1;
        }
      }
      return { count };
    },
  },
  // POKÉMON DAYCARE — PHASE 1 — mirrors PlayerDaycareStay exactly: keyed
  // by playerPokemonId (its own real primary key), with playerId's
  // separate real @unique enforced by hand here too, same "second unique
  // constraint checked explicitly, throws the real P2002 shape" precedent
  // fieldBattleSession.create below already establishes for its own
  // playerId @id.
  // PHASE 2 — 5 SLOTS. playerId is no longer unique (mirrors the real
  // schema's own dropped @unique — see PlayerDaycareStay's own doc comment
  // in prisma/schema.prisma) — only playerPokemonId's primary key is ever
  // enforced by create() below now. count()/findMany() are what
  // depositToDaycare/getDaycareViewData use to read "how many active
  // stays does this player currently have."
  playerDaycareStay: {
    async create({ data }: { data: { playerPokemonId: string; playerId: string; startingLevel: number } }) {
      if (daycareStays.has(data.playerPokemonId)) {
        throw Object.assign(new Error("Unique constraint failed on the fields: (`playerPokemonId`)"), { code: "P2002" });
      }
      const now = new Date();
      const full: PlayerDaycareStayRow = {
        playerPokemonId: data.playerPokemonId,
        playerId: data.playerId,
        startingLevel: data.startingLevel,
        depositedAt: now,
        createdAt: now,
        updatedAt: now,
      };
      daycareStays.set(data.playerPokemonId, full);
      return { ...full };
    },
    // `playerPokemonId` is this model's own only remaining primary key —
    // every real call site now looks a stay up by it directly.
    async findUnique({ where }: { where: { playerPokemonId: string } }) {
      const row = daycareStays.get(where.playerPokemonId);
      return row ? { ...row } : null;
    },
    // PHASE 2 — getDaycareViewData's own "every stay this player currently
    // has" read, and depositToDaycare's own pre-check reuse this same
    // generic where-filter support other findMany fakes already establish.
    async findMany({ where, orderBy }: { where: Record<string, unknown>; orderBy?: Record<string, "asc" | "desc"> }) {
      const rows = [...daycareStays.values()].filter((row) => matches(row, where));
      return applyOrderBy(rows, orderBy).map((row) => ({ ...row }));
    },
    // PHASE 2 — the 5-slot capacity guard (both depositToDaycare's fast
    // pre-check and its real, race-relevant in-transaction re-count) reads
    // through this.
    async count({ where }: { where: Record<string, unknown> }) {
      return [...daycareStays.values()].filter((row) => matches(row, where)).length;
    },
    // The exactly-once pickup guard (daycare.service.ts's
    // collectFromDaycare) — matches a specific (playerId, playerPokemonId)
    // pair, so a racing/duplicate pickup request for the same stay finds
    // zero rows here and safely aborts before spending money or applying
    // levels, same "CAS-guarded delete" precedent playerEggIncubation's
    // own deleteMany above already establishes for hatch's race guard.
    async deleteMany({ where }: { where: Record<string, unknown> }) {
      let count = 0;
      for (const [key, row] of daycareStays) {
        if (matches(row, where)) {
          daycareStays.delete(key);
          count += 1;
        }
      }
      return { count };
    },
  },
  fieldBattleSession: {
    // Mirrors seedFieldBattleSession's own defaulting for every field the
    // real Prisma schema fills in via @default(...) rather than requiring
    // callers to pass explicitly — getOrStartBattle's own create() call
    // (battle-session.service.ts) only ever sets the wild*/nextWild*/
    // activePlayerPokemonId/participants fields, exactly like a fresh
    // session in production.
    // FIELD BATTLE STUCK — playerId is this model's own unique key
    // (@id in the real schema), so a second create() for a player who
    // already has a row must fail with the same P2002 code real Postgres
    // would raise — getOrStartBattle's own try/catch (battle-session.
    // service.ts) depends on this to prove its concurrent-request recovery
    // rather than crashing.
    async create({ data }: { data: Record<string, unknown> }) {
      const playerId = data.playerId as string;
      if (sessions.has(playerId)) {
        throw Object.assign(new Error("Unique constraint failed on the fields: (`playerId`)"), { code: "P2002" });
      }
      const full: FieldBattleSessionRow = {
        playerId,
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
        isTutorialEncounter: (data.isTutorialEncounter as boolean | undefined) ?? false,
      };
      sessions.set(full.playerId, full);
      return { ...full };
    },
    async findUnique({ where }: { where: { playerId: string } }) {
      const row = sessions.get(where.playerId);
      return row ? { ...row } : null;
    },
    async findUniqueOrThrow({ where }: { where: { playerId: string } }) {
      const row = sessions.get(where.playerId);
      if (!row) throw new Error(`fake prisma: fieldBattleSession ${where.playerId} not found`);
      return { ...row };
    },
    // DAYCARE — HIDE DEPOSITED POKÉMON + PROTECT FROM REMOVAL — same
    // generic where-filter support other findFirst/findMany fakes already
    // establish. release-pokemon.service.ts's own in-battle check
    // (findFirst({ where: { playerId, activePlayerPokemonId } })) is the
    // one caller; sessions is keyed uniquely by playerId (one active
    // session per player, exactly like the real schema), so this is just
    // findUnique-by-playerId plus the generic matches() check on top.
    async findFirst({ where }: { where: Record<string, unknown> }) {
      const row = typeof where.playerId === "string" ? sessions.get(where.playerId) : undefined;
      return row && matches(row, where) ? { ...row } : null;
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
  // GLOBAL CHAT — mirrors global-chat.service.ts's exact call shapes:
  // create (send), findFirst orderBy desc (cooldown check), findMany
  // orderBy/take (both the "latest N" read and the cap-cleanup's "N oldest"
  // lookup), count (cap check), deleteMany with an `id: { in: [...] }`
  // filter (cap cleanup) — matchesValue's existing "in" operator support
  // (added for getPlayerProfilesByIds) already covers that last one.
  globalChatMessage: {
    async create({ data }: { data: { playerId: string; message: string } }) {
      const id = nextId("chat");
      const full: GlobalChatMessageRow = { id, playerId: data.playerId, message: data.message, createdAt: new Date() };
      globalChatMessages.set(id, full);
      return { ...full };
    },
    async findFirst({
      where,
      orderBy,
    }: {
      where: Record<string, unknown>;
      orderBy?: Record<string, "asc" | "desc"> | Record<string, "asc" | "desc">[];
    }) {
      const rows = [...globalChatMessages.values()].filter((row) => matches(row, where));
      const sorted = applyOrderBy(rows, orderBy);
      return sorted[0] ? { ...sorted[0] } : null;
    },
    async findMany({
      where,
      orderBy,
      take,
    }: {
      where?: Record<string, unknown>;
      orderBy?: Record<string, "asc" | "desc"> | Record<string, "asc" | "desc">[];
      take?: number;
    }) {
      const rows = [...globalChatMessages.values()].filter((row) => matches(row, where ?? {}));
      const sorted = applyOrderBy(rows, orderBy);
      return (take ? sorted.slice(0, take) : sorted).map((row) => ({ ...row }));
    },
    async count() {
      return globalChatMessages.size;
    },
    async deleteMany({ where }: { where: Record<string, unknown> }) {
      let count = 0;
      for (const [id, row] of globalChatMessages) {
        if (matches(row, where)) {
          globalChatMessages.delete(id);
          count += 1;
        }
      }
      return { count };
    },
  },
  // FRIENDS PHASE 1 — mirrors friendship.service.ts's exact call shapes:
  // findUnique by either `id` or the canonical `friendPairKey` (the real
  // unique index), create (throws a real P2002-shaped error on a
  // colliding friendPairKey — same idiom as playerGymBattleProgress.create
  // above, needed so sendFriendRequest's own create-then-catch race-safety
  // path is exercisable under this fake), update, deleteMany, findMany.
  // PLAYER SEARCH — mirrors public-profile-view.service.ts's and
  // player-search.service.ts's exact call shapes: findUnique by `id` or
  // `username`, findMany with a `username: { contains, mode }` filter +
  // `take` (player-search.service.ts's own searchPlayersByUsername), and a
  // `playerProfile` relation selection that's either `true` (return the
  // whole row — public-profile-view.service.ts) or `{ select: {...} }` (a
  // partial projection — player-search.service.ts) — see
  // resolvePlayerProfileSelection below for the one shared resolver both
  // paths use.
  user: {
    async findUnique({
      where,
      select,
    }: {
      where: { id?: string; username?: string | null; email?: string };
      select?: {
        id?: boolean;
        username?: boolean;
        email?: boolean;
        lockedUntil?: boolean;
        failedLoginAttempts?: boolean;
        playerProfile?: true | { select?: Record<string, boolean> };
      };
    }) {
      let row: UserRow | undefined;
      if (where.id) row = users.get(where.id);
      else if (where.username !== undefined) row = [...users.values()].find((candidate) => candidate.username === where.username);
      // FAILED LOGIN LOCKOUT — mirrors login-lockout.ts's own
      // findLockableUserByIdentifier, the only caller that looks up by email.
      else if (where.email !== undefined) row = [...users.values()].find((candidate) => candidate.email === where.email);
      if (!row) return null;
      return projectUserRow(row, select);
    },
    async findMany({
      where,
      select,
      take,
    }: {
      where?: Record<string, unknown>;
      select?: { id?: boolean; username?: boolean; playerProfile?: true | { select?: Record<string, boolean> } };
      take?: number;
    }) {
      const rows = [...users.values()].filter((row) => matches(row, where ?? {}));
      const limited = take ? rows.slice(0, take) : rows;
      return limited.map((row) => projectUserRow(row, select));
    },
    // FAILED LOGIN LOCKOUT — mirrors login-lockout.ts's own
    // resetFailedLoginAttempts/recordFailedLoginAttempt/isLockedOut, the
    // only writers of failedLoginAttempts/lockedUntil in this codebase.
    // Same increment-operator support applyNumericOperators already gives
    // playerPokemon.update/playerProfile.update above.
    async update({
      where,
      data,
      select,
    }: {
      where: { id: string };
      data: Record<string, unknown>;
      select?: { failedLoginAttempts?: boolean };
    }) {
      const row = users.get(where.id);
      if (!row) throw new Error(`fake prisma: user ${where.id} not found for update`);
      applyNumericOperators(row as unknown as Record<string, unknown>, data);
      if (select?.failedLoginAttempts) return { failedLoginAttempts: row.failedLoginAttempts };
      return { ...row };
    },
    // ACCOUNT DELETION — mirrors the real `tx.user.delete()`'s cascade for
    // just the two tables this fake's own tests actually assert on
    // (User itself, and PlayerProfile — keyed by the same id in this
    // fake's convention, see projectUserRow's own `profiles.get(row.id)`
    // above). This is NOT a general-purpose cascade simulator for every
    // other PlayerProfile-owned table — that guarantee is real Postgres
    // ON DELETE CASCADE at the schema level (see prisma/schema.prisma and
    // account-deletion.service.ts's own doc comment), verified separately
    // by this feature's schema-audit source-boundary test rather than
    // re-implemented here.
    async delete({ where }: { where: { id: string } }) {
      const row = users.get(where.id);
      if (!row) throw new Error(`fake prisma: user ${where.id} not found for delete`);
      users.delete(where.id);
      profiles.delete(where.id);
      return { ...row };
    },
  },
  // AUTH SECURITY — LOGIN RATE LIMITING — mirrors login-lockout.ts's exact
  // call shapes: findUnique/update by the compound (identifierKey, ipHash)
  // key (matching the real @@unique constraint's Prisma-generated
  // `identifierKey_ipHash` field name), upsert for
  // recordFailedLoginAttempt, updateMany for resetLoginAttempts (a no-op
  // when no row exists yet for that pair, same as the real DB).
  loginAttemptLock: {
    async findUnique({
      where,
    }: {
      where: { identifierKey_ipHash: { identifierKey: string; ipHash: string } };
    }) {
      const row = loginAttemptLocks.get(loginAttemptLockKey(where.identifierKey_ipHash.identifierKey, where.identifierKey_ipHash.ipHash));
      return row ? { ...row } : null;
    },
    async upsert({
      where,
      create,
      update,
    }: {
      where: { identifierKey_ipHash: { identifierKey: string; ipHash: string } };
      create: { identifierKey: string; ipHash: string; failedAttempts: number };
      update: Record<string, unknown>;
    }) {
      const key = loginAttemptLockKey(where.identifierKey_ipHash.identifierKey, where.identifierKey_ipHash.ipHash);
      const existing = loginAttemptLocks.get(key);
      if (!existing) {
        const now = new Date();
        const full: LoginAttemptLockRow = {
          id: nextId("login_attempt_lock"),
          identifierKey: create.identifierKey,
          ipHash: create.ipHash,
          failedAttempts: create.failedAttempts,
          lockedUntil: null,
          createdAt: now,
          updatedAt: now,
        };
        loginAttemptLocks.set(key, full);
        return { ...full };
      }
      applyNumericOperators(existing as unknown as Record<string, unknown>, update);
      existing.updatedAt = new Date();
      return { ...existing };
    },
    async update({ where, data }: { where: { id: string }; data: Record<string, unknown> }) {
      const row = [...loginAttemptLocks.values()].find((candidate) => candidate.id === where.id);
      if (!row) throw new Error(`fake prisma: loginAttemptLock ${where.id} not found for update`);
      applyNumericOperators(row as unknown as Record<string, unknown>, data);
      row.updatedAt = new Date();
      return { ...row };
    },
    async updateMany({ where, data }: { where: { identifierKey: string; ipHash: string }; data: Record<string, unknown> }) {
      let count = 0;
      for (const row of loginAttemptLocks.values()) {
        if (row.identifierKey === where.identifierKey && row.ipHash === where.ipHash) {
          applyNumericOperators(row as unknown as Record<string, unknown>, data);
          row.updatedAt = new Date();
          count += 1;
        }
      }
      return { count };
    },
  },
  // ACCOUNT DELETION — mirrors account-deletion-request.service.ts's /
  // account-deletion.service.ts's exact call shapes: findUnique by the
  // unique tokenHash, create, deleteMany (invalidating a user's previous
  // outstanding request), delete (rollback on email-send failure), and the
  // exactly-once updateMany claim guard (same idiom loginAttemptLock's own
  // updateMany above, and wildDefeatRewardGranted elsewhere, already use).
  accountDeletionRequest: {
    async findUnique({ where }: { where: { tokenHash: string } }) {
      const row = [...accountDeletionRequests.values()].find((candidate) => candidate.tokenHash === where.tokenHash);
      return row ? { ...row } : null;
    },
    async create({
      data,
    }: {
      data: { userId: string; tokenHash: string; expiresAt: Date };
    }) {
      const id = nextId("account_deletion_request");
      const full: AccountDeletionRequestRow = {
        id,
        userId: data.userId,
        tokenHash: data.tokenHash,
        expiresAt: data.expiresAt,
        consumedAt: null,
        createdAt: new Date(),
      };
      accountDeletionRequests.set(id, full);
      return { ...full };
    },
    async deleteMany({ where }: { where: Record<string, unknown> }) {
      let count = 0;
      for (const [id, row] of accountDeletionRequests) {
        if (matches(row, where)) {
          accountDeletionRequests.delete(id);
          count += 1;
        }
      }
      return { count };
    },
    async delete({ where }: { where: { id: string } }) {
      const row = accountDeletionRequests.get(where.id);
      if (!row) throw new Error(`fake prisma: accountDeletionRequest ${where.id} not found for delete`);
      accountDeletionRequests.delete(where.id);
      return { ...row };
    },
    async updateMany({ where, data }: { where: Record<string, unknown>; data: Record<string, unknown> }) {
      let count = 0;
      for (const row of accountDeletionRequests.values()) {
        if (matches(row, where)) {
          Object.assign(row, data);
          count += 1;
        }
      }
      return { count };
    },
  },
  friendship: {
    async findUnique({ where }: { where: { id?: string; friendPairKey?: string } }) {
      if (where.id) {
        const row = friendships.get(where.id);
        return row ? { ...row } : null;
      }
      if (where.friendPairKey) {
        const row = [...friendships.values()].find((candidate) => candidate.friendPairKey === where.friendPairKey);
        return row ? { ...row } : null;
      }
      return null;
    },
    async create({
      data,
    }: {
      data: { requesterId: string; addresseeId: string; friendPairKey: string; status?: string };
    }) {
      const duplicate = [...friendships.values()].some((row) => row.friendPairKey === data.friendPairKey);
      if (duplicate) {
        throw Object.assign(new Error("Unique constraint failed on friendship"), { code: "P2002" });
      }
      const id = nextId("friendship");
      const full: FriendshipRow = {
        id,
        requesterId: data.requesterId,
        addresseeId: data.addresseeId,
        friendPairKey: data.friendPairKey,
        status: data.status ?? "pending",
        createdAt: new Date(),
        respondedAt: null,
      };
      friendships.set(id, full);
      return { ...full };
    },
    async update({ where, data }: { where: { id: string }; data: Record<string, unknown> }) {
      const row = friendships.get(where.id);
      if (!row) throw new Error(`fake prisma: friendship ${where.id} not found for update`);
      Object.assign(row, data);
      return { ...row };
    },
    async deleteMany({ where }: { where: Record<string, unknown> }) {
      let count = 0;
      for (const [id, row] of friendships) {
        if (matches(row, where)) {
          friendships.delete(id);
          count += 1;
        }
      }
      return { count };
    },
    async findMany({
      where,
      orderBy,
    }: {
      where: Record<string, unknown>;
      orderBy?: Record<string, "asc" | "desc"> | Record<string, "asc" | "desc">[];
    }) {
      const rows = [...friendships.values()].filter((row) => matches(row, where));
      return applyOrderBy(rows, orderBy).map((row) => ({ ...row }));
    },
  },
  // FRIENDS PHASE 1 — PRIVATE CHAT. Mirrors private-chat.service.ts's
  // exact call shapes: findUnique by `id` or `conversationPairKey`, create
  // (same real-unique-constraint-mirroring idiom as friendship.create
  // above).
  privateConversation: {
    async findUnique({ where }: { where: { id?: string; conversationPairKey?: string } }) {
      if (where.id) {
        const row = privateConversations.get(where.id);
        return row ? { ...row } : null;
      }
      if (where.conversationPairKey) {
        const row = [...privateConversations.values()].find((candidate) => candidate.conversationPairKey === where.conversationPairKey);
        return row ? { ...row } : null;
      }
      return null;
    },
    async create({ data }: { data: { playerAId: string; playerBId: string; conversationPairKey: string } }) {
      const duplicate = [...privateConversations.values()].some((row) => row.conversationPairKey === data.conversationPairKey);
      if (duplicate) {
        throw Object.assign(new Error("Unique constraint failed on private_conversation"), { code: "P2002" });
      }
      const id = nextId("conversation");
      const full: PrivateConversationRow = {
        id,
        playerAId: data.playerAId,
        playerBId: data.playerBId,
        conversationPairKey: data.conversationPairKey,
        createdAt: new Date(),
      };
      privateConversations.set(id, full);
      return { ...full };
    },
  },
  // FRIENDS PHASE 1 — PRIVATE CHAT. Mirrors private-chat.service.ts's exact
  // call shapes: create, findMany (orderBy/take — both the "latest N" read
  // and the cap-cleanup's "N oldest" lookup, scoped by conversationId via
  // `where`), count (scoped by conversationId), deleteMany with an
  // `id: { in: [...] }` + `conversationId` filter (cap cleanup — never
  // touches another conversation's rows, mirrored exactly by matches()'s
  // existing generic where-filter support).
  privateMessage: {
    async create({ data }: { data: { conversationId: string; senderId: string; message: string } }) {
      const id = nextId("private_message");
      const full: PrivateMessageRow = {
        id,
        conversationId: data.conversationId,
        senderId: data.senderId,
        message: data.message,
        createdAt: new Date(),
      };
      privateMessages.set(id, full);
      return { ...full };
    },
    async findMany({
      where,
      orderBy,
      take,
    }: {
      where?: Record<string, unknown>;
      orderBy?: Record<string, "asc" | "desc"> | Record<string, "asc" | "desc">[];
      take?: number;
    }) {
      const rows = [...privateMessages.values()].filter((row) => matches(row, where ?? {}));
      const sorted = applyOrderBy(rows, orderBy);
      return (take ? sorted.slice(0, take) : sorted).map((row) => ({ ...row }));
    },
    async count({ where }: { where?: Record<string, unknown> }) {
      return [...privateMessages.values()].filter((row) => matches(row, where ?? {})).length;
    },
    async deleteMany({ where }: { where: Record<string, unknown> }) {
      let count = 0;
      for (const [id, row] of privateMessages) {
        if (matches(row, where)) {
          privateMessages.delete(id);
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
      playerKnownMoveFindManyCallCount += 1;
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
    // MOVE LEARNING UX / DAYCARE LEVEL-UP DECISIONS — mirrors
    // move-learning-service.ts's createPendingMoveLearning, the one real
    // caller: a plain insert, EXCEPT for the schema's own
    // @@unique([playerPokemonId, moveId, status]) constraint (see the real
    // Prisma model in schema.prisma), which that caller explicitly relies
    // on to treat a racing/duplicate insert as "already pending" rather
    // than a hard failure — thrown here as an object shaped like a real
    // Prisma `PrismaClientKnownRequestError` (`{ code: "P2002" }"), the
    // only field createPendingMoveLearning's own isUniqueConstraintViolation
    // check reads.
    async create({
      data,
    }: {
      data: { playerPokemonId: string; moveId: string; learnedAtLevel: number; status: string };
    }) {
      const alreadyExists = [...pending.values()].some(
        (row) => row.playerPokemonId === data.playerPokemonId && row.moveId === data.moveId && row.status === data.status
      );
      if (alreadyExists) {
        throw Object.assign(new Error("fake prisma: unique constraint violation on playerPendingMoveLearning"), { code: "P2002" });
      }

      const id = nextId("pending");
      idCounter += 1;
      const full: PlayerPendingMoveLearningRow = {
        id,
        playerPokemonId: data.playerPokemonId,
        moveId: data.moveId,
        learnedAtLevel: data.learnedAtLevel,
        status: data.status as PendingStatus,
        sequence: idCounter,
        resolvedAt: null,
      };
      pending.set(id, full);
      return { ...full };
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
  //
  // POKÉMON DAYCARE — PHASE 2 (5 SLOTS + DEPOSIT FEE) — CONCURRENCY.
  // Serialized via transactionQueue: each call waits for every
  // previously-started $transaction to fully finish (commit OR roll back)
  // before its OWN body starts running, and only then does it become the
  // next thing everyone else waits on. This mirrors how a single real
  // database connection processes one transaction at a time — real
  // Postgres additionally allows independent transactions to run
  // concurrently as long as they never lock the same row, but full
  // serialization is a strictly SAFE, conservative approximation for a
  // fake with no per-row locking of its own: it can never produce a false
  // "this race is safe" result the way the previous unserialized version
  // could (two `$transaction` bodies genuinely interleaving their
  // individually-awaited steps, letting each one observe state from
  // BEFORE the other's writes — exactly the gap that let two concurrent
  // Daycare deposits both pass a "fewer than 5 stays" check at once).
  // Every existing race test in this codebase (e.g. friendship.test.ts's
  // "two players requesting each other at the same instant") already only
  // depends on ONE of two racing writes winning a real unique constraint —
  // serializing execution order can only ever make that MORE
  // deterministic, never break it.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async $transaction<T>(fn: (tx: any) => Promise<T>): Promise<T> {
    const myTurn = transactionQueue;
    let releaseNext!: () => void;
    transactionQueue = new Promise<void>((resolve) => {
      releaseNext = resolve;
    });

    await myTurn;
    try {
      const snapshot = cloneState();
      try {
        return await fn(client);
      } catch (error) {
        restoreState(snapshot);
        throw error;
      }
    } finally {
      releaseNext();
    }
  },
};

// GYMS & LEAGUES PHASE 1 — read-only accessors for test assertions, same
// style as getFieldBattleSessionRow/getPlayerProfileRow above.
export function getGymBattleProgressRow(playerId: string, regionId: string, gymNumber: number, battleSlot: string) {
  const row = gymBattleProgress.get(gymBattleProgressKey(playerId, regionId, gymNumber, battleSlot));
  return row ? { ...row } : undefined;
}

export function getGymBadgeRow(playerId: string, regionId: string, gymNumber: number) {
  const row = gymBadges.get(gymBadgeKey(playerId, regionId, gymNumber));
  return row ? { ...row } : undefined;
}

export function getRegionalChampionProgressRow(playerId: string, regionId: string) {
  const row = regionalChampionProgress.get(regionalChampionOrMedalKey(playerId, regionId));
  return row ? { ...row } : undefined;
}

export function getRegionalMedalRow(playerId: string, regionId: string) {
  const row = regionalMedals.get(regionalChampionOrMedalKey(playerId, regionId));
  return row ? { ...row } : undefined;
}

// GYMS & LEAGUES PHASE 3
export function getNpcBattleSessionRow(playerId: string) {
  const row = npcBattleSessions.get(playerId);
  return row ? { ...row } : undefined;
}

// GYMS & LEAGUES PHASE 5
export function getLeagueTournamentRow(leagueId: string, weekKey: string) {
  const row = [...leagueTournaments.values()].find((candidate) => candidate.leagueId === leagueId && candidate.weekKey === weekKey);
  return row ? { ...row } : undefined;
}

export function getLeagueTournamentParticipantRows(tournamentId: string) {
  return [...leagueTournamentParticipants.values()].filter((row) => row.tournamentId === tournamentId).map((row) => ({ ...row }));
}

export function getLeagueTournamentMatchRows(tournamentId: string, roundNumber?: number) {
  return [...leagueTournamentMatches.values()]
    .filter((row) => row.tournamentId === tournamentId && (roundNumber === undefined || row.roundNumber === roundNumber))
    .map((row) => ({ ...row }));
}

// GYMS & LEAGUES PHASE 6
export function getLeagueBattleSessionRow(tournamentMatchId: string) {
  const row = [...leagueBattleSessions.values()].find((candidate) => candidate.tournamentMatchId === tournamentMatchId);
  return row ? { ...row } : undefined;
}

// GYMS & LEAGUES PHASE 7
export function getLeagueTournamentPlacementRows(tournamentId: string) {
  return [...leagueTournamentPlacements.values()]
    .filter((row) => row.tournamentId === tournamentId)
    .sort((a, b) => a.place - b.place)
    .map((row) => ({ ...row }));
}

export const prisma = client;
