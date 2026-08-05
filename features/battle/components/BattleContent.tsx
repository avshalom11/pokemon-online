"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { BattleBagPanel, type MedicineResultView } from "./BattleBagPanel";
import { BattleResultOverlay } from "./BattleResultOverlay";
import { BattleWindow } from "./BattleWindow";
import { MasterBallConfirmDialog } from "./MasterBallConfirmDialog";
import { XpToast } from "./XpToast";
import { BattleScene } from "@/components/battle/BattleScene";
import { RarityWarningBanner } from "@/components/battle/RarityWarningBanner";
import type { EncounterResult } from "@/engine/encounter/pokemon-encounter-engine";
import { executeBattleActionAction } from "@/features/battle/actions/battle-action.action";
import { attemptCaptureAction } from "@/features/battle/actions/capture.action";
import { syncPartyHpAction } from "@/features/battle/actions/sync-party-hp.action";
import { applyMedicineItemAction } from "@/features/battle/actions/use-medicine.action";
import type { BattleKnownMoveSlot } from "@/features/battle/services/battle-view.service";
import { endBattleSessionAction } from "@/features/battle-session/actions/end-battle-session.action";
import { syncActivePokemonAction } from "@/features/battle-session/actions/sync-active-pokemon.action";
import type { BattleVictoryReward } from "@/features/battle-session/services/battle-session.service";
import type { BattleVolatileSummary } from "@/features/battle/services/battle-action.service";
import {
  attackMessage,
  captureSucceededMessage,
  escapeMessage,
  forcedReplacementMessage,
  medicineUseMessage,
  partyDefeatedMessage,
  switchInMessage,
  throwPokeballMessage,
  wildAppearedMessage,
} from "@/features/battle/utils/battle-messages";
import { buildAttackSlots } from "@/features/battle/utils/battle-attack-slots";
import { determineNextPhaseAfterFaint, resolveWildCounterAttack } from "@/features/battle/utils/battle-turn-rules";
import { HIT_FLASH_DURATION_MS, XP_TOAST_DURATION_MS } from "@/features/battle/utils/battle-timing";
import { EvolutionBranchChoiceDialog } from "@/features/evolution/components/EvolutionBranchChoiceDialog";
import { EvolutionPromptDialog } from "@/features/evolution/components/EvolutionPromptDialog";
import { acceptEvolutionAction, chooseEvolutionBranchAction, rejectEvolutionAction } from "@/features/evolution/actions/evolution.actions";
import { getBranchEvolution } from "@/data/pokemon/pokemon-evolutions";
import type { PendingEvolutionBranchView, PendingEvolutionView } from "@/features/evolution/types/evolution.types";
import type { PokemonSpecies } from "@/shared/types/pokemon";
import type { InventoryItemView } from "@/features/inventory/types/inventory.types";
import { PartySelector } from "@/features/party/components/PartySelector";
import { canSwitchTo } from "@/features/party/utils/party-rules";
import { getPlayerProgressAction } from "@/features/player/actions/get-player-progression.action";
import { usePlayerProgression } from "@/features/player/context/player-progression-context";
import { progressFromLevelUpResult } from "@/features/player-progression/progression-calculations";
import { playerXpToastMessage } from "@/features/player-progression/progression-messages";
import type { LevelUpResult } from "@/features/player-progression/progression-types";
import { getBackSpritePath, getFrontSpritePath } from "@/features/pokemon/media/pokemon-media-paths";
import { getSpeciesById } from "@/features/pokemon/services/species-catalog";
import type { PokemonLevelUpResult } from "@/features/pokemon-progression/pokemon-progression-types";
import { getRarityPresentation } from "@/lib/battle/battleRarityPresentation";
import { getBattleTheme } from "@/lib/battle/battleThemes";
import type { BattleMenuAction } from "@/shared/types/battle-ui";
import type { OwnedPokemon } from "@/shared/types/player-pokemon";
import type { ZoneId } from "@/shared/types/zone";

// Fallback order the Bag auto-switches through as the selected ball's stock
// hits zero (requirement: Poké Ball -> Great Ball -> Ultra Ball -> Master
// Ball) — never derived from the Shop catalog's own array order, which
// isn't guaranteed to match this specific gameplay progression.
const BALL_FALLBACK_ORDER = ["poke-ball", "great-ball", "ultra-ball", "master-ball"] as const;

const MASTER_BALL_ITEM_ID = "master-ball";

// The first owned ball (quantity > 0) in BALL_FALLBACK_ORDER, or null if
// none remain — used both for the initial selection on mount and for the
// automatic fallback once the currently selected ball runs out.
function pickNextBall(qtyMap: Record<string, number>): string | null {
  return BALL_FALLBACK_ORDER.find((id) => (qtyMap[id] ?? 0) > 0) ?? null;
}

interface BattleContentProps {
  zoneId: ZoneId;
  wild: EncounterResult;
  party: OwnedPokemon[];
  activePokemonId: string;
  // Every party member's Known Moves, resolved server-side against the
  // Move Registry (see battle-view.service.ts) — keyed by playerPokemonId
  // so the move panel stays correct across a mid-battle switch without a
  // second fetch.
  knownMovesByPokemonId: Record<string, BattleKnownMoveSlot[]>;
  // The authenticated trainer's own name (never hardcoded) — used only for
  // the "<name> threw a Poké Ball at <wild name>!" capture message.
  playerName: string;
  // Every front-sprite URL this zone could ever roll (see
  // getZoneFrontSpriteUrls, features/battle/services/battle-view.service.ts)
  // — preloaded at idle time on mount so a new wild encounter's sprite is
  // already cached by the browser once the transition reveals it.
  zonePreloadSpriteUrls: string[];
  // The player's owned Poké Balls + Medicine, server-fetched once up front
  // (app/(game)/battle/page.tsx, via features/inventory's own
  // getInventoryView — Stones excluded, they have no in-battle use) and
  // kept as a live client-side mirror from here on (see inventoryQtyMap
  // below), same "DB authoritative at mount, live-mirrored during battle"
  // rule this component already uses for HP/status/volatile.
  bagItems: InventoryItemView[];
}

// Explicit battle state machine. "enemyTurn" is set for documentation/
// blocking-guard purposes even though its resolution is synchronous within
// the same handler (matching the existing fixed-damage system's
// no-animation-delay design) — it never renders as its own visible frame,
// but the phase guard at the top of every handler is still what prevents
// double actions: React runs one event handler to completion before the
// next click's handler runs, so a synchronous setPhase is sufficient.
type BattlePhase =
  | "playerTurn"
  | "enemyTurn"
  | "capturing"
  | "selectingVoluntarySwitch"
  | "selectingForcedReplacement"
  | "captured"
  | "escaped"
  | "partyDefeated";

// Damage is still the existing TEMPORARY_ATTACK_DAMAGE
// (engine/battle/battle-config.ts, applied server-side by the Battle
// Action Service) no matter which known move is picked — only the
// button/selection layer changes in this phase. buildAttackSlots itself
// (always four slots, in slot order, empty ones disabled) lives in
// features/battle/utils/battle-attack-slots.ts — pure, independently
// tested, same pattern as battle-turn-rules.ts.

// The two remaining battle timing constants (HIT_FLASH_DURATION_MS,
// XP_TOAST_DURATION_MS) live in features/battle/utils/battle-timing.ts —
// both are purely cosmetic and non-blocking (a sprite flash, an
// auto-dismissing toast), never gating any phase transition. Every message
// update below is otherwise immediate: an outcome is revealed the instant
// its server response is processed, with no artificial reveal delay of any
// kind — responsiveness takes priority over giving each line its own
// readable beat. The only "wait" left anywhere in this file is real network
// latency (the awaited Server Action calls themselves), never a timer.

// Phase 7 — the neutral default for a side's Volatile Conditions (nothing
// active), used both as playerVolatile/enemyVolatile's initial state and
// whenever a switch/new encounter resets one side back to it client-side
// (the server already resets its own persisted copy the same way — see
// battle-session.service.ts's resetVolatileOnSwitch).
const EMPTY_VOLATILE_SUMMARY: BattleVolatileSummary = {
  confused: false,
  protecting: false,
  disabledMoveId: null,
  encoreMoveId: null,
  leechSeeded: false,
  trapped: false,
};

// Flinch is deliberately omitted here — it's a same-turn-only flag the
// server itself always clears again by the end of the very turn it fires
// in (see battle-action.service.ts's end-of-turn blanket clear), so by the
// time this component re-renders it's already false again; a badge for it
// would never actually be visible.
function volatileBadges(volatile: BattleVolatileSummary): string[] {
  const badges: string[] = [];
  if (volatile.confused) badges.push("CNF");
  if (volatile.protecting) badges.push("PRT");
  if (volatile.disabledMoveId) badges.push("DIS");
  if (volatile.encoreMoveId) badges.push("ENC");
  if (volatile.leechSeeded) badges.push("SEED");
  if (volatile.trapped) badges.push("TRAP");
  return badges;
}

// HP authority: PlayerPokemon.currentHp in the DB is always the single
// source of truth. `partyHpMap` here is a live mirror seeded from it at
// mount — every HP-changing event updates this map immediately (so the UI
// never waits on a round trip) and fires syncPartyHpAction in the
// background in the same tick. Switching never changes HP, so switches
// never call it. This was chosen over "sync only at battle end" so there is
// only ever one source of truth to reason about, and so a player closing
// the tab mid-battle doesn't get their Pokémon's HP rolled back.
export function BattleContent({
  zoneId,
  wild,
  party,
  activePokemonId,
  knownMovesByPokemonId,
  playerName,
  zonePreloadSpriteUrls,
  bagItems,
}: BattleContentProps) {
  const router = useRouter();
  const theme = getBattleTheme(zoneId);
  const { applyProgress } = usePlayerProgression();

  const [wildState, setWildState] = useState(wild);
  const [partyHpMap, setPartyHpMap] = useState<Record<string, number>>(() =>
    Object.fromEntries(party.map((pokemon) => [pokemon.id, pokemon.currentHp]))
  );
  // Phase 6F — same live-mirror pattern as partyHpMap above, for major
  // status conditions. wildStatusState has no per-id map (only one wild is
  // ever active) and is reset to null on every new encounter, exactly like
  // wildState's own HP.
  const [partyStatusMap, setPartyStatusMap] = useState<Record<string, string | null>>(() =>
    Object.fromEntries(party.map((pokemon) => [pokemon.id, pokemon.status]))
  );
  const [wildStatusState, setWildStatusState] = useState<string | null>(null);
  // Phase 7 — same live-mirror pattern as wildStatusState above, for
  // Volatile Conditions. Reset to the neutral default on every new
  // encounter/switch exactly like status (see resetVolatileSummaries
  // below); the server (battle-action.service.ts) remains the sole source
  // of truth — this only drives the attack panel's Disable/Encore
  // restriction, the switch button's trapped gate, and the HUD badges.
  const [playerVolatile, setPlayerVolatile] = useState<BattleVolatileSummary>(EMPTY_VOLATILE_SUMMARY);
  const [enemyVolatile, setEnemyVolatile] = useState<BattleVolatileSummary>(EMPTY_VOLATILE_SUMMARY);
  // Live level/XP/maxHp overrides for owned Pokémon, seeded empty and
  // filled in only when a victory reward actually names a Pokémon (see
  // applyPokemonRewards below) — same "server response applied the instant
  // it resolves, no navigation, no refresh" pattern partyHpMap already
  // established for HP, and player-progression-context.tsx established for
  // the header. maxHp is included (Phase 2: calculated stats) so a level-up
  // mid-battle immediately rescales the HP bar's maximum, not just the
  // level badge — applyPokemonRewards also writes the accompanying
  // newCurrentHp into partyHpMap in the same update, since the DB's
  // currentHp was already rescaled server-side (see applyPokemonXpGrant's
  // applyLevelUpToCurrentHp) in that same transaction.
  // speciesId is optional and only ever set by a completed evolution (see
  // handleAcceptEvolution) — an evolution keeps level/experience unchanged
  // (only species and derived maxHp change), so every write to this map
  // must spread the previous entry first rather than replacing it whole,
  // or an evolved Pokémon's species override would be silently wiped out
  // the next time this same map is updated for an unrelated XP reward (see
  // applyPokemonRewards below).
  const [partyProgressMap, setPartyProgressMap] = useState<
    Record<string, { level: number; experience: number; maxHp: number; speciesId?: string }>
  >({});
  // Non-null exactly while the evolution decision modal is showing — set
  // by applyVictoryReward the instant a battle-victory response reports a
  // freshly-created pending evolution (PokemonLevelUpResult.
  // pendingEvolutionSpeciesId), cleared the instant the player answers
  // (handleAcceptEvolution/handleRejectEvolution). Deliberately its own
  // state, never folded into BattlePhase: it's a modal overlay layered on
  // top of whatever phase battle is already in after a win (same
  // "sub-menu, not a battle-phase transition" reasoning the Bag's own
  // isBagOpen/medicineResult already use), and — like those — its opaque
  // fixed-inset backdrop is what actually blocks interaction underneath,
  // not a phase change.
  const [pendingEvolution, setPendingEvolution] = useState<PendingEvolutionView | null>(null);
  // Non-null exactly while the Branch Evolution choice dialog is showing
  // (Eevee's Espeon/Umbreon fork today) — mutually exclusive with
  // pendingEvolution above (a single grant only ever creates one or the
  // other, never both — see tryCreatePendingEvolution's own doc comment).
  // Choosing a target (handleChooseEvolutionBranch) clears this and
  // populates pendingEvolution instead, reusing the normal confirm dialog
  // for the second, explicit step.
  const [pendingEvolutionBranch, setPendingEvolutionBranch] = useState<PendingEvolutionBranchView | null>(null);
  const [isResolvingEvolution, startEvolutionTransition] = useTransition();
  // The Bag's live quantity mirror — seeded from the server-fetched
  // `bagItems` prop at mount, decremented the instant a capture/medicine
  // action's response confirms exactly how many remain (never optimistic,
  // never guessed client-side: both attemptCaptureAction and
  // applyMedicineItemAction always return the post-decrement quantity).
  const [inventoryQtyMap, setInventoryQtyMap] = useState<Record<string, number>>(() =>
    Object.fromEntries(bagItems.map((view) => [view.item.id, view.quantity]))
  );
  // The Bag's currently active ball for Capture — defaults to the first
  // owned ball in BALL_FALLBACK_ORDER, null when the player owns none (in
  // which case Capture starts out disabled). Never persisted server-side:
  // this is a pure in-session UI preference, re-derived fresh from
  // inventory every time it needs a fallback (see applyBallConsumption).
  const [selectedBallItemId, setSelectedBallItemId] = useState<string | null>(() => pickNextBall(inventoryQtyMap));
  const [isBagOpen, setIsBagOpen] = useState(false);
  // Set the instant a medicine use's server response confirms success —
  // never before, never faked. While non-null, the Bag shows a dedicated
  // result screen (the healed Pokémon's updated HP/HP bar, how much was
  // restored, which item was used, and a "חזור לקרב" button) INSTEAD OF the
  // party-selection picker, and battle stays fully paused: the wild's
  // counter-attack is only resolved once the player explicitly confirms
  // (see handleConfirmMedicineResult) — never automatically, never on a
  // timer. `previousHp` is the HP just before this heal (captured
  // client-side at the moment the request was fired) — the only thing this
  // state carries that isn't already re-derivable from partyHpMap, needed
  // to display "restored X HP" without recomputing it from a stale value.
  const [medicineResult, setMedicineResult] = useState<MedicineResultView | null>(null);
  const [pendingMasterBallConfirm, setPendingMasterBallConfirm] = useState(false);
  const [isUsingItem, startUseItemTransition] = useTransition();
  const [activeId, setActiveId] = useState(activePokemonId);
  // A restored (post-refresh) battle must reopen onto whatever phase the
  // persisted facts actually imply, not always a fresh "playerTurn" — the
  // one case that matters is a currently-fainted active Pokémon, which
  // means a forced replacement was still pending when the page was left.
  // Everything else (mid-animation phases like "enemyTurn"/"capturing") is
  // sub-second and never worth persisting — see battle-session.service.ts's
  // own doc comment on why session state deliberately doesn't track those.
  const [phase, setPhase] = useState<BattlePhase>(() => {
    const initialActive = party.find((pokemon) => pokemon.id === activePokemonId);
    return initialActive && initialActive.currentHp <= 0 ? "selectingForcedReplacement" : "playerTurn";
  });
  const [message, setMessage] = useState(wildAppearedMessage(wild.pokemon.name));
  // Brief, non-blocking player-XP feedback — entirely independent of
  // `message`/the battle message box (see XpToast.tsx and this file's own
  // showXpToast below). Never gates any battle-state transition.
  const [xpToastMessage, setXpToastMessage] = useState<string | null>(null);
  const [isCapturing, startCaptureTransition] = useTransition();
  const [, startHpSyncTransition] = useTransition();
  // Phase 4F: the attack button's own request to the Battle Action Service
  // (features/battle/actions/battle-action.action.ts) — distinct from
  // startSessionSyncTransition below, which only ever fires fire-and-forget
  // writes for the OTHER battle actions (switch/capture/escape) that this
  // phase deliberately leaves untouched.
  const [, startBattleActionTransition] = useTransition();
  // Fire-and-forget writes to the persisted FieldBattleSession (wild HP,
  // active Pokémon, ending the session) — a distinct concern from
  // startHpSyncTransition above, which only ever touches PlayerPokemon rows.
  const [, startSessionSyncTransition] = useTransition();

  const [enemyHit, setEnemyHit] = useState(false);
  const [playerHit, setPlayerHit] = useState(false);
  const enemyHitTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const playerHitTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const xpToastTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (enemyHitTimeout.current) clearTimeout(enemyHitTimeout.current);
      if (playerHitTimeout.current) clearTimeout(playerHitTimeout.current);
      if (xpToastTimeout.current) clearTimeout(xpToastTimeout.current);
    },
    []
  );

  // Warms the browser's image cache for every sprite this zone could ever
  // roll, once, at idle time — so that whenever a new wild Pokémon is
  // revealed (including the server-promoted encounter after a defeat —
  // see handleAttack's wildFainted branch), its sprite is very likely
  // already cached and decodes instantly instead of popping in. Deliberately
  // fire-and-forget and off the main thread's urgent work
  // (requestIdleCallback, falling back to a timeout where unsupported):
  // this must never compete with anything the player is actually waiting
  // on, only fill otherwise-idle time.
  useEffect(() => {
    if (zonePreloadSpriteUrls.length === 0) return;

    const runWhenIdle =
      typeof window.requestIdleCallback === "function"
        ? window.requestIdleCallback
        : (callback: () => void) => window.setTimeout(callback, 200);
    const cancelIdle =
      typeof window.cancelIdleCallback === "function" ? window.cancelIdleCallback : window.clearTimeout;

    const handle = runWhenIdle(() => {
      for (const src of zonePreloadSpriteUrls) {
        const image = new Image();
        image.src = src;
      }
    });

    return () => cancelIdle(handle as number);
  }, [zonePreloadSpriteUrls]);

  function triggerHit(side: "enemy" | "player") {
    const setHit = side === "enemy" ? setEnemyHit : setPlayerHit;
    const timeoutRef = side === "enemy" ? enemyHitTimeout : playerHitTimeout;

    setHit(true);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setHit(false), HIT_FLASH_DURATION_MS);
  }

  // Shown for both a wild defeat and a successful capture (see handleAttack
  // and handleCapture below) — same transient-banner idiom already used
  // elsewhere in this codebase (MyPokemonContent's releaseNotice), auto-
  // dismissing on its own with no user interaction required. A level-up, if
  // any, was already recorded as a persistent notification server-side in
  // the same call that produced this xpResult (see progression-service.ts)
  // — this toast only ever shows the short XP line, never level-up text.
  function showXpToast(xpResult: LevelUpResult | null) {
    if (!xpResult || xpResult.xpGained <= 0) return;

    setXpToastMessage(playerXpToastMessage(xpResult.xpGained));
    if (xpToastTimeout.current) clearTimeout(xpToastTimeout.current);
    xpToastTimeout.current = setTimeout(() => setXpToastMessage(null), XP_TOAST_DURATION_MS);
  }

  // Applies a reward action's response to the shared header progression
  // state the instant it resolves (see player-progression-context.tsx) —
  // no navigation, no refresh, and independent of the toast's own
  // xpGained > 0 guard below, so the header/level badge stay correct even
  // in a hypothetical zero-XP-but-still-a-reward-object case. This never
  // recomputes the XP curve itself: progressFromLevelUpResult only renames
  // fields the server already computed (progression-calculations.ts).
  function applyBattleReward(xpResult: LevelUpResult | null) {
    if (!xpResult) return;
    applyProgress(progressFromLevelUpResult(xpResult));
    showXpToast(xpResult);
  }

  // Applies every rewarded Pokémon's own new level/total XP to the live
  // override map the instant the reward response resolves — silently, no
  // toast, no battle message (see the Core Design Rule this file already
  // follows for player XP): this phase explicitly excludes level-up
  // messages/animations (features/pokemon-progression's own doc comments),
  // it only has to keep whatever's already visible (the active Pokémon's
  // level badge, a party-selector card) correct without a refresh. Never
  // recomputes anything — `result.newLevel`/`result.newTotalXp` are already
  // the server's authoritative values (grantBattlePokemonXp).
  function applyPokemonRewards(results: PokemonLevelUpResult[]) {
    if (results.length === 0) return;

    setPartyProgressMap((prev) => {
      const next = { ...prev };
      for (const result of results) {
        // Spreads any existing entry first (see this map's own doc
        // comment) so a Pokémon that already evolved earlier this battle
        // keeps its speciesId override across a later, unrelated XP
        // reward for the same Pokémon.
        next[result.playerPokemonId] = {
          ...next[result.playerPokemonId],
          level: result.newLevel,
          experience: result.newTotalXp,
          maxHp: result.newMaxHp,
        };
      }
      return next;
    });

    // newCurrentHp is already the DB's authoritative post-level-up value
    // (applyPokemonXpGrant applied applyLevelUpToCurrentHp in the same
    // transaction) — mirrored into partyHpMap here so the HP bar reflects
    // it immediately, exactly like every other HP-changing event in this
    // file (see this component's own "HP authority" doc comment above).
    setPartyHpMap((prev) => {
      const next = { ...prev };
      for (const result of results) {
        next[result.playerPokemonId] = result.newCurrentHp;
      }
      return next;
    });

    // The evolution prompt — this phase's own trigger point: only ever
    // checked here, after XP/level (above) and pending move learning
    // (already resolved server-side inside the same grant, before this
    // response was even produced — see pokemon-progression-service.ts's
    // applyPokemonXpGrant for the documented ordering) are both fully
    // resolved. "Handle only one evolution decision at a time" (phase
    // spec): the first result that reports a freshly-created pending
    // evolution wins; any others simply stay pending in the DB and
    // surface later (the next time this same check runs, or via the
    // Home-page safety net) once the first is resolved. Never re-shown
    // for a decision that already exists from an earlier reward —
    // pendingEvolutionSpeciesId is only ever set on the exact grant that
    // created it (see that field's own doc comment), so a stale/already-
    // pending decision from a previous battle never re-triggers this.
    if (!pendingEvolution && !pendingEvolutionBranch) {
      const justBecamePending = results.find((result) => result.pendingEvolutionSpeciesId || result.pendingEvolutionBranch);

      if (justBecamePending?.pendingEvolutionSpeciesId) {
        const currentSpecies = getSpeciesById(justBecamePending.speciesId);
        const evolvedSpecies = getSpeciesById(justBecamePending.pendingEvolutionSpeciesId);
        const owner = party.find((pokemon) => pokemon.id === justBecamePending.playerPokemonId);

        if (currentSpecies && evolvedSpecies) {
          setPendingEvolution({
            playerPokemonId: justBecamePending.playerPokemonId,
            nickname: owner?.nickname ?? null,
            currentSpecies,
            evolvedSpecies,
          });
        }
      } else if (justBecamePending?.pendingEvolutionBranch) {
        const currentSpecies = getSpeciesById(justBecamePending.speciesId);
        const branchEvolution = getBranchEvolution(justBecamePending.speciesId);
        const owner = party.find((pokemon) => pokemon.id === justBecamePending.playerPokemonId);
        const targets = branchEvolution?.targets
          .map((targetSpeciesId) => getSpeciesById(targetSpeciesId))
          .filter((species): species is PokemonSpecies => species !== undefined);

        if (currentSpecies && targets && targets.length > 0) {
          setPendingEvolutionBranch({
            playerPokemonId: justBecamePending.playerPokemonId,
            nickname: owner?.nickname ?? null,
            currentSpecies,
            targets,
          });
        }
      }
    }
  }

  // The lethal-attack path's single reward-application entry point: both
  // halves of BattleVictoryReward (see battle-session.service.ts) are
  // always granted together in one transaction, so they're always applied
  // to the UI together too — never a partial update where the header
  // reflects a new player level but a party card still shows a stale
  // Pokémon level, or vice versa.
  function applyVictoryReward(reward: BattleVictoryReward | null) {
    if (!reward) return;
    applyBattleReward(reward.player);
    applyPokemonRewards(reward.pokemon);
  }

  // Derived every render from the party prop + the live HP/progress maps —
  // never a separately stored copy, so there is exactly one place HP or
  // level/XP can drift from.
  const livePartyList = party.map((pokemon) => {
    // An accepted evolution overrides species — see handleAcceptEvolution
    // and applyPokemonRewards' own doc comment on why partyProgressMap's
    // speciesId field must survive later unrelated writes. Falls back to
    // the original species if the override id somehow doesn't resolve
    // (should never happen — acceptEvolutionAction only ever returns a
    // real catalog id — but never worth crashing the battle screen over).
    const overrideSpeciesId = partyProgressMap[pokemon.id]?.speciesId;
    const species = overrideSpeciesId ? (getSpeciesById(overrideSpeciesId) ?? pokemon.species) : pokemon.species;

    return {
      ...pokemon,
      species,
      currentHp: partyHpMap[pokemon.id] ?? pokemon.currentHp,
      level: partyProgressMap[pokemon.id]?.level ?? pokemon.level,
      experience: partyProgressMap[pokemon.id]?.experience ?? pokemon.experience,
      maxHp: partyProgressMap[pokemon.id]?.maxHp ?? pokemon.maxHp,
      // partyStatusMap intentionally holds `null` for a healthy Pokémon —
      // `??` would wrongly fall back to the (possibly stale) prop in that
      // case, so this checks membership instead.
      status: pokemon.id in partyStatusMap ? partyStatusMap[pokemon.id] : pokemon.status,
    };
  });
  const activePokemon = livePartyList.find((pokemon) => pokemon.id === activeId)!;
  const playerDisplayName = activePokemon.nickname ?? activePokemon.species.name;

  // The Bag's live view — same catalog objects the `bagItems` prop already
  // carries, quantities overridden from inventoryQtyMap, zero-quantity
  // items dropped (never shown, same "no zero-quantity rows" rule
  // features/inventory's own screen already follows).
  const liveInventoryItems: InventoryItemView[] = bagItems
    .map((view) => ({ ...view, quantity: inventoryQtyMap[view.item.id] ?? view.quantity }))
    .filter((view) => view.quantity > 0);
  const selectedBallView = selectedBallItemId
    ? liveInventoryItems.find((view) => view.item.id === selectedBallItemId)
    : undefined;

  // The one shared exit path for every session-ending state (run, capture,
  // full-party defeat) — router.replace (not push) so a finished battle
  // never sits in browser history, mirroring Map's own replace on the way in.
  //
  // Also fires one background, never-awaited re-fetch of the player's
  // authoritative progression (see getPlayerProgressAction) to confirm the
  // header's shared state against the DB on the way out — every in-battle
  // reward already applies its own response the instant it resolves (see
  // applyBattleReward), so in the common case this is a no-op confirm; it
  // only matters for the rare case where the very last reward call was
  // still in flight the moment the player left. Never awaited, so it can
  // never delay leaving the battle screen.
  function handleReturnToMap() {
    startSessionSyncTransition(async () => {
      const progress = await getPlayerProgressAction();
      if (progress) applyProgress(progress);
    });
    router.replace("/map");
  }

  // Shared by: a normal attack's counter-hit, a failed capture's
  // counter-hit, the one guaranteed hit after a *voluntary* switch, and a
  // successful medicine use. Never called after a forced replacement —
  // that faint already consumed the wild Pokémon's one attack for the turn.
  //
  // `currentHp` is always passed in by the caller rather than read from
  // `partyHpMap[targetId]` here — React state updates queued via setState
  // (e.g. the medicine flow's own setPartyHpMap right before this call,
  // see handleSelectMedicineTarget) never land in this closure's own
  // `partyHpMap` until the next render, so reading the map here would use
  // a stale, pre-update HP as the counter-attack's baseline. That exact bug
  // is what made a freshly-healed Pokémon "faint" instead of healing: the
  // counter-attack was computed against the old low HP the potion was
  // meant to fix, then that (wrong) result overwrote the just-applied heal
  // in state. Every call site below now passes the actual just-known HP.
  function resolveCounterAttackAgainstActive(targetId: string, targetName: string, currentHp: number) {
    const { newHp, fainted } = resolveWildCounterAttack(currentHp);

    setPartyHpMap((prev) => ({ ...prev, [targetId]: newHp }));
    triggerHit("player");
    startHpSyncTransition(() => {
      syncPartyHpAction(targetId, newHp);
    });

    if (!fainted) {
      setPhase("playerTurn");
      setMessage(attackMessage(wildState.pokemon.name, targetName));
      return;
    }

    const nextLiveParty = party.map((pokemon) => ({
      ...pokemon,
      currentHp: pokemon.id === targetId ? newHp : (partyHpMap[pokemon.id] ?? pokemon.currentHp),
    }));
    const nextPhase = determineNextPhaseAfterFaint(nextLiveParty);

    setPhase(nextPhase);
    setMessage(
      nextPhase === "selectingForcedReplacement" ? forcedReplacementMessage(targetName) : partyDefeatedMessage()
    );

    if (nextPhase === "partyDefeated") {
      startSessionSyncTransition(() => {
        endBattleSessionAction();
      });
    }
  }

  // Resets only enemy-specific state — party HP/active Pokémon are left
  // completely untouched, so consecutive encounters never leak the previous
  // wild Pokémon's HP/hit-flash/message, and never heal or reset the party.
  function startNewEncounter(nextWild: EncounterResult) {
    setWildState(nextWild);
    setWildStatusState(null);
    // Phase 7 — a new wild is a genuinely new battle instance for
    // Volatile Conditions too (see battle-session.service.ts's
    // promoteToNextEncounter, which resets both sides' persisted copy the
    // same way).
    setPlayerVolatile(EMPTY_VOLATILE_SUMMARY);
    setEnemyVolatile(EMPTY_VOLATILE_SUMMARY);
    setMessage(wildAppearedMessage(nextWild.pokemon.name));
    setEnemyHit(false);
    setPlayerHit(false);
    setPhase("playerTurn");
  }

  // Phase 4F: orchestration only — no damage/HP math happens in this
  // component anymore. handleAttack locks the UI, shows the player's own
  // attack line, then asks the Battle Action Service (via
  // executeBattleActionAction) to actually resolve the action; every field
  // it renders below (updatedWildHp, updatedPartyHp, wildFainted,
  // partyPokemonFainted, battleEnded, experienceGranted) is exactly what
  // the server already computed and persisted — this function only decides
  // *when* to reveal it and which message/phase that implies.
  function handleAttack(moveId: string) {
    if (phase !== "playerTurn") return;

    // Locks input immediately (same convention every other action handler
    // uses) and shows the player's own attack line right away.
    setPhase("enemyTurn");
    setMessage(attackMessage(playerDisplayName, wildState.pokemon.name));

    startBattleActionTransition(async () => {
      const result = await executeBattleActionAction(zoneId, "attack", moveId);

      if (result.status !== "success") {
        // The server rejected the action (stale phase, a race, an already-
        // concluded battle, ...) — never trust the client's own belief that
        // it was still the player's turn. Recover to a safe, interactive
        // state rather than leaving the UI stuck on "enemyTurn".
        setPhase("playerTurn");
        return;
      }

      setWildState((prev) => ({ ...prev, currentHealth: result.updatedWildHp }));
      setWildStatusState(result.enemyStatus);
      setPartyStatusMap((prev) => ({ ...prev, [activeId]: result.playerStatus }));
      setPlayerVolatile(result.playerVolatile);
      setEnemyVolatile(result.enemyVolatile);
      triggerHit("enemy");

      // Lethal hit: no outcome message is ever shown here — no "fainted",
      // no XP, no victory text (see the Core Design Rule: the battle box
      // only ever carries immediate battle events, and gameplay speed is
      // the top priority for this exact path). result.promotedWild is the
      // next encounter the server had already prepared in advance (see
      // promoteToNextEncounter, battle-session.service.ts) and promoted in
      // this exact same response — switching to it is a plain, synchronous
      // local state update, never a second round trip or any artificial
      // delay of any kind.
      if (result.wildFainted) {
        applyVictoryReward(result.experienceGranted);

        if (result.promotedWild) {
          startNewEncounter(result.promotedWild);
        } else {
          // Only ever null on a same-turn double knockout (see
          // promotedWild's own doc comment) — the session has already
          // ended server-side, so there is nothing left to advance into.
          handleReturnToMap();
        }
        return;
      }

      // Non-lethal: the wild's counter-attack outcome was already resolved
      // server-side in this same call — revealed the instant this response
      // is processed, no separate reveal delay.
      // Already persisted server-side by the Battle Action Service — no
      // syncPartyHpAction call needed here (unlike the switch/failed-
      // capture counter-attack paths below, which still compute and sync
      // client-side; that's unchanged, out-of-scope territory for this
      // phase).
      setPartyHpMap((prev) => ({ ...prev, [activeId]: result.updatedPartyHp }));
      triggerHit("player");

      if (!result.partyPokemonFainted) {
        setPhase("playerTurn");
        setMessage(attackMessage(wildState.pokemon.name, playerDisplayName));
        return;
      }

      setPhase(result.battleEnded ? "partyDefeated" : "selectingForcedReplacement");
      setMessage(result.battleEnded ? partyDefeatedMessage() : forcedReplacementMessage(playerDisplayName));
    });
  }

  // Applies a capture/medicine action's confirmed post-decrement quantity
  // to the live inventory mirror, then — for a ball specifically — falls
  // back to the next owned ball in BALL_FALLBACK_ORDER the instant the just-
  // consumed one hits zero (requirement: auto-switch when the selected
  // ball runs out; disable Capture entirely once no ball remains at all).
  // A medicine item reaching zero never triggers any fallback — there is
  // no "selected medicine" concept, only Poké Balls persist a selection.
  function applyInventoryConsumption(itemId: string, remainingQuantity: number, isBall: boolean) {
    const nextQtyMap = { ...inventoryQtyMap, [itemId]: remainingQuantity };
    setInventoryQtyMap(nextQtyMap);

    if (isBall && remainingQuantity <= 0 && selectedBallItemId === itemId) {
      setSelectedBallItemId(pickNextBall(nextQtyMap));
    }
  }

  // Ball selection is pure client-side Bag state — see selectedBallItemId's
  // own doc comment. Closes the Bag immediately, same "select and return to
  // battle" flow the requirement describes.
  function handleSelectBall(itemId: string) {
    setSelectedBallItemId(itemId);
    setIsBagOpen(false);
  }

  function handleCapture() {
    // phase-guarded exactly like every other action handler (attack,
    // escape, switch) — set to "capturing" synchronously below, for the
    // entire duration of the request AND the failed-capture message pause,
    // so a rapid second click can never fire a second capture request
    // (isCapturing from useTransition is also checked as an extra guard,
    // but the phase lock alone is what actually closes the gap: it's set
    // synchronously here, not after a render/transition flush).
    if (phase !== "playerTurn" || isCapturing || !selectedBallItemId) return;

    // Master Ball guards behind its own confirmation — see
    // MasterBallConfirmDialog's own doc comment. Nothing is consumed (or
    // even requested from the server) until the player explicitly confirms;
    // Cancel leaves phase/message/inventory completely untouched.
    if (selectedBallItemId === MASTER_BALL_ITEM_ID) {
      setPendingMasterBallConfirm(true);
      return;
    }

    proceedCapture(selectedBallItemId);
  }

  function handleConfirmMasterBall() {
    setPendingMasterBallConfirm(false);
    proceedCapture(MASTER_BALL_ITEM_ID);
  }

  function handleCancelMasterBall() {
    setPendingMasterBallConfirm(false);
  }

  function proceedCapture(ballItemId: string) {
    setPhase("capturing");
    // Shown immediately (before the server round-trip resolves) through the
    // exact same message state/box every other battle message uses — never
    // a separate toast/notification — so it's visible for the whole time
    // the capture request is in flight, then gets overwritten below by
    // whichever result message follows. Never skipped: this line always
    // runs before either result branch below.
    setMessage(throwPokeballMessage(playerName, wildState.pokemon.name));

    startCaptureTransition(async () => {
      const result = await attemptCaptureAction(ballItemId);

      if (result.status === "captured") {
        applyInventoryConsumption(ballItemId, result.remainingQuantity, true);
        // Short, battle-only message — the capture result itself, no
        // player-XP/level-up suffix (same Core Design Rule as the defeat
        // path above). The ending behavior (modal, manual return-to-map)
        // is unchanged; only its message content and the independent XP
        // toast are new.
        setMessage(captureSucceededMessage(result.pokemonName));
        applyBattleReward(result.xpResult);
        setPhase("captured");
        return;
      }

      if (result.status !== "failed") {
        // "no-balls" (a race against this exact ball running out
        // elsewhere) or a rare server error — never trust the client's own
        // belief that a ball was available. Recover to a safe, interactive
        // state rather than pretending a turn was spent on nothing.
        setPhase("playerTurn");
        return;
      }

      applyInventoryConsumption(ballItemId, result.remainingQuantity, true);

      // The wild Pokémon's counter-attack lands immediately, exactly like a
      // failed attack would; phase stays "capturing" (not "playerTurn")
      // until resolveCounterAttackAgainstActive sets its own next phase
      // below, so it's still impossible to throw a second ball mid-sequence.
      triggerHit("enemy");
      resolveCounterAttackAgainstActive(activeId, playerDisplayName, activePokemon.currentHp);
    });
  }

  // Bag -> Medicine -> target-picker's final step. The Bag stays OPEN
  // through the server round-trip and — once success confirms — switches
  // to a dedicated result screen (medicineResult, rendered by
  // BattleBagPanel) instead of closing on its own: closing automatically
  // (this component's earlier behavior, first via an immediate close, then
  // via a timed auto-close) either hid the heal entirely or gave the player
  // no real control over when battle resumes. Now nothing past this point
  // happens until the player explicitly clicks "חזור לקרב" — see
  // handleConfirmMedicineResult, the only place the wild's counter-attack
  // for a medicine use is ever triggered.
  function handleSelectMedicineTarget(itemId: string, playerPokemonId: string) {
    if (phase !== "playerTurn" || isUsingItem || medicineResult) return;

    const itemView = liveInventoryItems.find((view) => view.item.id === itemId);
    const target = livePartyList.find((pokemon) => pokemon.id === playerPokemonId);
    const targetName = target ? (target.nickname ?? target.species.name) : "";
    // Captured now, before the request fires — the one piece of "how much
    // did this heal" the server response doesn't itself carry (it only
    // returns the new HP, not the delta). Reading it here (not later, after
    // the await) is what makes it accurate: nothing else can change this
    // Pokémon's HP between this click and the response landing, since the
    // phase lock below blocks every other action for the whole request.
    const previousHp = target?.currentHp ?? 0;

    setPhase("enemyTurn");
    setMessage(medicineUseMessage(playerName, itemView?.item.name ?? "", targetName));

    startUseItemTransition(async () => {
      const result = await applyMedicineItemAction(itemId, playerPokemonId);

      if (result.status !== "success") {
        // Nothing changed server-side — close the Bag and recover
        // immediately, exactly like every other action's rejection path.
        // No result screen: there is nothing to show.
        setIsBagOpen(false);
        setPhase("playerTurn");
        return;
      }

      applyInventoryConsumption(itemId, result.remainingQuantity, false);
      // Already persisted server-side by use-medicine.service.ts — no
      // syncPartyHpAction call needed here, same precedent handleAttack's
      // own lethal-hit path already established for a server-authoritative
      // HP write. Applied while the Bag is STILL OPEN: livePartyList (and
      // the `party` prop it flows into BattleBagPanel as) re-derives from
      // this map every render, so the result screen's HP number/bar (read
      // live off that same party list, never duplicated into
      // medicineResult itself) reflect this the instant it lands.
      setPartyHpMap((prev) => ({ ...prev, [playerPokemonId]: result.newHp }));

      // Shows the result screen — battle stays paused here until the
      // player clicks "חזור לקרב" (handleConfirmMedicineResult). itemName
      // comes from the server's own response (authoritative), imageUrl
      // from the Bag's own already-loaded catalog view (pure display
      // asset, no authority concern).
      setMedicineResult({
        itemName: result.itemName,
        itemImageUrl: itemView?.item.imageUrl ?? "",
        pokemonId: playerPokemonId,
        previousHp,
      });
    });
  }

  // The sole trigger for "חזור לקרב" — closes the result screen/Bag and
  // resolves the wild's counter-attack, exactly once, only on an explicit
  // click (never automatically, never on a timer). Reads the healed
  // Pokémon's HP from partyHpMap rather than from medicineResult itself:
  // by the time this fires, at least one render has already happened since
  // the heal was applied (the player had to see the result screen and
  // click a button), so partyHpMap here is guaranteed fresh — unlike the
  // synchronous back-to-back setState calls this codebase's earlier
  // medicine bug was caused by (see resolveCounterAttackAgainstActive's own
  // doc comment), there is no stale-closure risk on a handler that only
  // ever runs in response to a real user click.
  function handleConfirmMedicineResult() {
    if (!medicineResult) return;

    const { pokemonId, previousHp } = medicineResult;
    const newHp = partyHpMap[pokemonId] ?? previousHp;

    setMedicineResult(null);
    setIsBagOpen(false);

    // The wild's counter-attack always lands on the currently ACTIVE
    // Pokémon (unchanged rule — same as every other counter-attack call
    // site), which may or may not be the one just healed. When it IS the
    // same Pokémon, its baseline HP for that counter-attack must be the
    // just-healed value — never a pre-heal value — see
    // resolveCounterAttackAgainstActive's own doc comment for the exact
    // bug this guards against. When a *different* (benched) Pokémon was
    // healed, the active one's own HP was never touched by this action, so
    // its already-known value is correct as-is.
    const activeHpAfterHeal = pokemonId === activeId ? newHp : activePokemon.currentHp;
    resolveCounterAttackAgainstActive(activeId, playerDisplayName, activeHpAfterHeal);
  }

  function handleVoluntarySwitchSelect(pokemonId: string) {
    const target = livePartyList.find((pokemon) => pokemon.id === pokemonId);
    if (!target || !canSwitchTo(target, activeId)) return;
    // Phase 7 — the active Pokémon can't voluntarily switch out while
    // trapped (Bind/Wrap/Fire Spin/Clamp); the server enforces this too
    // (syncActivePokemon's own `force` check) — this is purely a fast,
    // client-side reflection of the same rule so the UI never even
    // attempts a switch it already knows will be rejected.
    if (playerVolatile.trapped) return;

    const targetName = target.nickname ?? target.species.name;
    setActiveId(pokemonId);
    setPlayerVolatile(EMPTY_VOLATILE_SUMMARY);
    startSessionSyncTransition(() => {
      syncActivePokemonAction(pokemonId);
    });

    // Consumes the turn: exactly one wild attack lands on the newly-active
    // Pokémon immediately — resolveCounterAttackAgainstActive sets its own
    // phase/message below.
    resolveCounterAttackAgainstActive(pokemonId, targetName, target.currentHp);
  }

  function handleForcedReplacementSelect(pokemonId: string) {
    const target = livePartyList.find((pokemon) => pokemon.id === pokemonId);
    if (!target || !canSwitchTo(target, activeId)) return;

    setActiveId(pokemonId);
    setPhase("playerTurn");
    setMessage(switchInMessage(target.nickname ?? target.species.name));
    setPlayerVolatile(EMPTY_VOLATILE_SUMMARY);
    startSessionSyncTransition(() => {
      // Phase 7 — force: true. A forced replacement (the active Pokémon
      // already fainted) must always be allowed, trapped or not — only a
      // *voluntary* switch is ever rejected for that.
      syncActivePokemonAction(pokemonId, true);
    });
    // No counter-attack call here — the faint that triggered this forced
    // replacement already consumed the wild Pokémon's attack for the turn.
  }

  // Accepting evolves the same PlayerPokemon row in place, server-side
  // (accept-evolution.service.ts) — this only ever applies whatever the
  // server actually returns to the live battle state (species override +
  // recalculated maxHp/currentHp), never assumes success client-side. A
  // rejection (result.status !== "success") just closes the dialog with
  // nothing changed — the pending state was already what it was; this
  // component doesn't need to distinguish *why* it failed to still recover
  // safely.
  function handleAcceptEvolution() {
    if (!pendingEvolution) return;
    const targetId = pendingEvolution.playerPokemonId;

    startEvolutionTransition(async () => {
      const result = await acceptEvolutionAction(targetId);
      setPendingEvolution(null);

      if (result.status !== "success") return;

      setPartyProgressMap((prev) => ({
        ...prev,
        [targetId]: {
          level: result.level,
          experience: result.experience,
          maxHp: result.newMaxHp,
          speciesId: result.newSpeciesId,
        },
      }));
      setPartyHpMap((prev) => ({ ...prev, [targetId]: result.newCurrentHp }));
    });
  }

  // Rejecting is permanent server-side (reject-evolution.service.ts) —
  // nothing here needs to remember that fact locally beyond closing the
  // dialog: the Pokémon's species/HP were never touched, so livePartyList
  // already reflects "unchanged" with zero extra state.
  function handleRejectEvolution() {
    if (!pendingEvolution) return;
    const targetId = pendingEvolution.playerPokemonId;

    startEvolutionTransition(async () => {
      await rejectEvolutionAction(targetId);
      setPendingEvolution(null);
    });
  }

  // Step one of the Branch Evolution flow (Eevee's Espeon/Umbreon fork) —
  // on success, swaps the branch-choice dialog for the normal
  // EvolutionPromptDialog (via pendingEvolution) so the player still gives
  // an explicit final confirmation, exactly like any other level
  // evolution — this never evolves the Pokémon by itself.
  function handleChooseEvolutionBranch(targetSpeciesId: string) {
    if (!pendingEvolutionBranch) return;
    const targetId = pendingEvolutionBranch.playerPokemonId;
    const currentSpecies = pendingEvolutionBranch.currentSpecies;
    const nickname = pendingEvolutionBranch.nickname;
    const chosenSpecies = pendingEvolutionBranch.targets.find((target) => target.id === targetSpeciesId);

    startEvolutionTransition(async () => {
      const result = await chooseEvolutionBranchAction(targetId, targetSpeciesId);
      setPendingEvolutionBranch(null);

      if (result.status === "success" && chosenSpecies) {
        setPendingEvolution({ playerPokemonId: targetId, nickname, currentSpecies, evolvedSpecies: chosenSpecies });
      }
    });
  }

  // Rejecting a branch choice is permanent, exactly like rejecting a
  // normal level evolution (reject-evolution.service.ts handles both
  // pending states) — the Pokémon stays Eevee (or whatever species) with
  // no further evolution ever offered for this specific instance.
  function handleRejectEvolutionBranch() {
    if (!pendingEvolutionBranch) return;
    const targetId = pendingEvolutionBranch.playerPokemonId;

    startEvolutionTransition(async () => {
      await rejectEvolutionAction(targetId);
      setPendingEvolutionBranch(null);
    });
  }

  function handleEscape() {
    setPhase("escaped");
    setMessage(escapeMessage());
    startSessionSyncTransition(() => {
      endBattleSessionAction();
    });

    // No artificial pause here — handleReturnToMap's own router.replace is
    // real (non-instant) navigation, so the "escaped" message above still
    // gets a genuine, if brief, on-screen moment while Map's route loads.
    handleReturnToMap();
  }

  function handleMenuAction(actionId: string) {
    if (phase !== "playerTurn") return;

    if (actionId === "run") {
      handleEscape();
    } else if (actionId === "capture") {
      handleCapture();
    } else if (actionId === "switch") {
      setPhase("selectingVoluntarySwitch");
    } else if (actionId === "bag") {
      setIsBagOpen(true);
    }
  }

  // attackId is the selected Known Move's moveId (see buildAttackSlots) —
  // BattleAttackPanel never fires onSelect for a disabled (empty) slot, so
  // this only ever runs for a real, currently-known move.
  function handleAttackSelect(attackId: string) {
    handleAttack(attackId);
  }

  const attackSlots = buildAttackSlots(knownMovesByPokemonId[activeId] ?? [], {
    disabledMoveId: playerVolatile.disabledMoveId,
    encoreMoveId: playerVolatile.encoreMoveId,
  });

  // The capture button must show the currently selected ball's own image,
  // name, and quantity (requirement) — never just a generic "לכידה" label —
  // and disables the instant no ball remains at all (selectedBallView is
  // undefined exactly then, since liveInventoryItems only ever holds
  // quantity > 0 rows).
  const captureLabel = isCapturing
    ? "תופס..."
    : selectedBallView
      ? `${selectedBallView.item.name} ×${selectedBallView.quantity}`
      : "אין פוכדורים";

  const menuActions: BattleMenuAction[] = [
    { id: "switch", label: "החלפה" },
    {
      id: "capture",
      label: captureLabel,
      disabled: !selectedBallView || isCapturing,
      iconImageUrl: selectedBallView?.item.imageUrl,
    },
    { id: "bag", label: "תיק" },
    { id: "run", label: "בריחה" },
  ];

  // Derived fresh every render from the current wild encounter's own
  // PokemonSpecies.rarity — recomputes automatically whenever wildState
  // changes (a new encounter after a capture/flee/faint), never cached
  // separately from that source of truth.
  const rarityPresentation = getRarityPresentation(wildState.pokemon.rarity);

  return (
    <BattleWindow
      backgroundClassName={rarityPresentation.windowBackgroundClass}
      banner={<RarityWarningBanner rarity={wildState.pokemon.rarity} />}
    >
      <BattleScene
        theme={theme}
        message={message}
        rarityOverlayClassName={rarityPresentation.sceneOverlayClassName}
        enemy={{
          name: wildState.pokemon.name,
          level: wildState.level,
          currentHealth: wildState.currentHealth,
          maxHealth: wildState.maximumHealth,
          spriteUrl: getFrontSpritePath(wildState.pokemon),
          status: wildStatusState,
          volatileBadges: volatileBadges(enemyVolatile),
          rarity: wildState.pokemon.rarity,
        }}
        player={{
          name: playerDisplayName,
          level: activePokemon.level,
          currentHealth: activePokemon.currentHp,
          maxHealth: activePokemon.maxHp,
          spriteUrl: getBackSpritePath(activePokemon.species),
          fallbackSpriteUrl: getFrontSpritePath(activePokemon.species),
          status: activePokemon.status,
          volatileBadges: volatileBadges(playerVolatile),
          // Already the live value — activePokemon comes from livePartyList,
          // which merges in partyProgressMap's overrides the instant a
          // victory reward resolves (see applyPokemonRewards below), so this
          // reflects a level-up/XP gain immediately, no refresh needed.
          experience: activePokemon.experience,
        }}
        attacks={attackSlots}
        onAttackSelect={handleAttackSelect}
        menuActions={menuActions}
        onMenuAction={handleMenuAction}
        enemyHit={enemyHit}
        playerHit={playerHit}
      />

      <XpToast message={xpToastMessage} />

      {phase === "selectingVoluntarySwitch" ? (
        <PartySelector
          party={livePartyList}
          activePokemonId={activeId}
          mode="voluntary"
          onSelect={handleVoluntarySwitchSelect}
          onClose={() => setPhase("playerTurn")}
        />
      ) : null}

      {phase === "selectingForcedReplacement" ? (
        <PartySelector party={livePartyList} activePokemonId={activeId} mode="forced" onSelect={handleForcedReplacementSelect} />
      ) : null}

      {phase === "captured" || phase === "partyDefeated" ? (
        <BattleResultOverlay
          variant={phase === "captured" ? "captured" : "lost"}
          title={phase === "captured" ? "נתפס בהצלחה!" : "הצוות הובס"}
          message={message}
          onReturnToMap={handleReturnToMap}
        />
      ) : null}

      {isBagOpen ? (
        <BattleBagPanel
          items={liveInventoryItems}
          selectedBallItemId={selectedBallItemId}
          party={livePartyList}
          onSelectBall={handleSelectBall}
          onSelectMedicineTarget={handleSelectMedicineTarget}
          onClose={() => setIsBagOpen(false)}
          // Locks the whole panel's chrome (tabs, close button, target
          // picking) while a medicine request is in flight, AND for as
          // long as the result screen is showing — the latter is what
          // forces "חזור לקרב" to be the only way out of a completed heal,
          // rather than letting the player dismiss the Bag (and softlock
          // the turn — see handleConfirmMedicineResult, the only place
          // that ever actually resumes battle) via the ✕ button instead.
          pending={isUsingItem || Boolean(medicineResult)}
          medicineResult={medicineResult}
          onConfirmMedicineResult={handleConfirmMedicineResult}
        />
      ) : null}

      {pendingMasterBallConfirm ? (
        <MasterBallConfirmDialog pending={isCapturing} onCancel={handleCancelMasterBall} onConfirm={handleConfirmMasterBall} />
      ) : null}

      {pendingEvolution ? (
        <EvolutionPromptDialog
          pending={pendingEvolution}
          isSubmitting={isResolvingEvolution}
          onAccept={handleAcceptEvolution}
          onReject={handleRejectEvolution}
        />
      ) : null}

      {pendingEvolutionBranch ? (
        <EvolutionBranchChoiceDialog
          pending={pendingEvolutionBranch}
          isSubmitting={isResolvingEvolution}
          onChoose={handleChooseEvolutionBranch}
          onReject={handleRejectEvolutionBranch}
        />
      ) : null}
    </BattleWindow>
  );
}
