"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { BattleResultOverlay } from "./BattleResultOverlay";
import { BattleWindow } from "./BattleWindow";
import { PokeballCounter } from "./PokeballCounter";
import { XpToast } from "./XpToast";
import { BattleScene } from "@/components/battle/BattleScene";
import { RarityWarningBanner } from "@/components/battle/RarityWarningBanner";
import type { EncounterResult } from "@/engine/encounter/pokemon-encounter-engine";
import { executeBattleActionAction } from "@/features/battle/actions/battle-action.action";
import { attemptCaptureAction } from "@/features/battle/actions/capture.action";
import { getNextEncounterAction } from "@/features/battle/actions/next-encounter.action";
import { syncPartyHpAction } from "@/features/battle/actions/sync-party-hp.action";
import type { BattleKnownMoveSlot } from "@/features/battle/services/battle-view.service";
import { endBattleSessionAction } from "@/features/battle-session/actions/end-battle-session.action";
import { syncActivePokemonAction } from "@/features/battle-session/actions/sync-active-pokemon.action";
import type { BattleVictoryReward } from "@/features/battle-session/services/battle-session.service";
import type { BattleVolatileSummary } from "@/features/battle/services/battle-action.service";
import {
  attackMessage,
  captureFailedMessage,
  captureSucceededMessage,
  escapeMessage,
  forcedReplacementMessage,
  partyDefeatedMessage,
  switchInMessage,
  throwPokeballMessage,
  wildAppearedMessage,
} from "@/features/battle/utils/battle-messages";
import { buildAttackSlots } from "@/features/battle/utils/battle-attack-slots";
import { determineNextPhaseAfterFaint, resolveWildCounterAttack } from "@/features/battle/utils/battle-turn-rules";
import {
  ATTACK_MESSAGE_DURATION_MS,
  HIT_FLASH_DURATION_MS,
  NEXT_ENCOUNTER_DELAY_MS,
  XP_TOAST_DURATION_MS,
} from "@/features/battle/utils/battle-timing";
import { PartySelector } from "@/features/party/components/PartySelector";
import { canSwitchTo } from "@/features/party/utils/party-rules";
import { getPlayerProgressAction } from "@/features/player/actions/get-player-progression.action";
import { usePlayerProgression } from "@/features/player/context/player-progression-context";
import { progressFromLevelUpResult } from "@/features/player-progression/progression-calculations";
import { playerXpToastMessage } from "@/features/player-progression/progression-messages";
import type { LevelUpResult } from "@/features/player-progression/progression-types";
import { getBackSpritePath, getFrontSpritePath } from "@/features/pokemon/media/pokemon-media-paths";
import type { PokemonLevelUpResult } from "@/features/pokemon-progression/pokemon-progression-types";
import { getRarityPresentation } from "@/lib/battle/battleRarityPresentation";
import { getBattleTheme } from "@/lib/battle/battleThemes";
import type { BattleMenuAction } from "@/shared/types/battle-ui";
import type { OwnedPokemon } from "@/shared/types/player-pokemon";
import type { ZoneId } from "@/shared/types/zone";

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
  | "enemyDefeated"
  | "loadingNextEncounter"
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

// All battle timing constants (HIT_FLASH_DURATION_MS, ATTACK_MESSAGE_DURATION_MS,
// NEXT_ENCOUNTER_DELAY_MS, XP_TOAST_DURATION_MS) live in
// features/battle/utils/battle-timing.ts — see that file for what each one
// actually protects. ATTACK_MESSAGE_DURATION_MS is reused by every
// single-step message sequence below that actually has a message worth
// reading (a non-lethal attack's own line before the wild's counter-attack
// replaces it, a switch-in message before the wild's guaranteed counter-hit,
// a failed capture's message before the wild's counter-hit, an escape
// message before Map replaces this screen) — deliberately one shared
// constant so all these pauses stay in step by construction rather than
// drifting independently over time. The one exception is a *lethal* attack
// (handleAttack's `newWildHp <= 0` branch): no outcome message is ever
// shown there, so it skips this pause entirely — see that branch's own
// comment.

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
  const [partyProgressMap, setPartyProgressMap] = useState<Record<string, { level: number; experience: number; maxHp: number }>>({});
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
  const [, startNextEncounterTransition] = useTransition();
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
  const nextEncounterTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Single shared ref for every ATTACK_MESSAGE_DURATION_MS pause (attack,
  // switch, failed capture, escape) — phase-guarding already ensures only
  // one such sequence can ever be pending at a time, so one ref covers all
  // of them.
  const messageStepTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const xpToastTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (enemyHitTimeout.current) clearTimeout(enemyHitTimeout.current);
      if (playerHitTimeout.current) clearTimeout(playerHitTimeout.current);
      if (nextEncounterTimeout.current) clearTimeout(nextEncounterTimeout.current);
      if (messageStepTimeout.current) clearTimeout(messageStepTimeout.current);
      if (xpToastTimeout.current) clearTimeout(xpToastTimeout.current);
    },
    []
  );

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
        next[result.playerPokemonId] = { level: result.newLevel, experience: result.newTotalXp, maxHp: result.newMaxHp };
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
  const livePartyList = party.map((pokemon) => ({
    ...pokemon,
    currentHp: partyHpMap[pokemon.id] ?? pokemon.currentHp,
    level: partyProgressMap[pokemon.id]?.level ?? pokemon.level,
    experience: partyProgressMap[pokemon.id]?.experience ?? pokemon.experience,
    maxHp: partyProgressMap[pokemon.id]?.maxHp ?? pokemon.maxHp,
    // partyStatusMap intentionally holds `null` for a healthy Pokémon —
    // `??` would wrongly fall back to the (possibly stale) prop in that
    // case, so this checks membership instead.
    status: pokemon.id in partyStatusMap ? partyStatusMap[pokemon.id] : pokemon.status,
  }));
  const activePokemon = livePartyList.find((pokemon) => pokemon.id === activeId)!;
  const playerDisplayName = activePokemon.nickname ?? activePokemon.species.name;

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
  // counter-hit, and the one guaranteed hit after a *voluntary* switch.
  // Never called after a forced replacement — that faint already consumed
  // the wild Pokémon's one attack for the turn.
  function resolveCounterAttackAgainstActive(targetId: string, targetName: string) {
    const currentHp = partyHpMap[targetId] ?? 0;
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

  function scheduleNextEncounter() {
    if (nextEncounterTimeout.current) clearTimeout(nextEncounterTimeout.current);
    nextEncounterTimeout.current = setTimeout(() => {
      setPhase("loadingNextEncounter");
      startNextEncounterTransition(async () => {
        const nextWild = await getNextEncounterAction(zoneId);
        if (!nextWild) {
          handleReturnToMap();
          return;
        }
        startNewEncounter(nextWild);
      });
    }, NEXT_ENCOUNTER_DELAY_MS);
  }

  // Resets only enemy-specific state — party HP/active Pokémon are left
  // completely untouched, so consecutive encounters never leak the previous
  // wild Pokémon's HP/hit-flash/message, and never heal or reset the party.
  function startNewEncounter(nextWild: EncounterResult) {
    setWildState(nextWild);
    setWildStatusState(null);
    // Phase 7 — a new wild is a genuinely new battle instance for
    // Volatile Conditions too (see battle-session.service.ts's
    // advanceToNextEncounter, which resets both sides' persisted copy the
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

      if (messageStepTimeout.current) clearTimeout(messageStepTimeout.current);

      // Lethal hit: no outcome message is ever shown here — no "fainted",
      // no XP, no victory text (see the Core Design Rule: the battle box
      // only ever carries immediate battle events, and gameplay speed is
      // the top priority for this exact path). So unlike the non-lethal
      // branch below, this never schedules the ATTACK_MESSAGE_DURATION_MS
      // "read the outcome" pause — there is nothing to read. The message
      // box simply keeps showing the attack line until the next
      // encounter's own wildAppeared message replaces it.
      // scheduleNextEncounter's own short delay (NEXT_ENCOUNTER_DELAY_MS)
      // is the *only* remaining pause in this entire path, purely for
      // visual stability, not reading time.
      if (result.wildFainted) {
        setPhase("enemyDefeated");
        applyVictoryReward(result.experienceGranted);
        scheduleNextEncounter();
        return;
      }

      // Non-lethal: the wild's counter-attack outcome was already resolved
      // server-side in this same call — only *revealing* it is delayed, by
      // ATTACK_MESSAGE_DURATION_MS, so the player's own attack line stays
      // readable first, exactly like before.
      messageStepTimeout.current = setTimeout(() => {
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
      }, ATTACK_MESSAGE_DURATION_MS);
    });
  }

  function handleCapture() {
    // phase-guarded exactly like every other action handler (attack,
    // escape, switch) — set to "capturing" synchronously below, for the
    // entire duration of the request AND the failed-capture message pause,
    // so a rapid second click can never fire a second capture request
    // (isCapturing from useTransition is also checked as an extra guard,
    // but the phase lock alone is what actually closes the gap: it's set
    // synchronously here, not after a render/transition flush).
    if (phase !== "playerTurn" || isCapturing) return;

    setPhase("capturing");
    // Shown immediately (before the server round-trip resolves) through the
    // exact same message state/box every other battle message uses — never
    // a separate toast/notification — so it's visible for the whole time
    // the capture request is in flight, then gets overwritten below by
    // whichever result message follows. Never skipped: this line always
    // runs before either result branch below.
    setMessage(throwPokeballMessage(playerName, wildState.pokemon.name));

    startCaptureTransition(async () => {
      const result = await attemptCaptureAction();

      if (result.status === "captured") {
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

      // Failed (or a rare server error) — show the failure line first, held
      // for ATTACK_MESSAGE_DURATION_MS so it's actually readable, then the
      // wild Pokémon's counter-attack still lands, exactly like a failed
      // attack would. Phase stays "capturing" (not "playerTurn") for that
      // whole pause, so it's still impossible to throw a second ball
      // mid-sequence.
      setMessage(captureFailedMessage(wildState.pokemon.name));
      triggerHit("enemy");

      if (messageStepTimeout.current) clearTimeout(messageStepTimeout.current);
      messageStepTimeout.current = setTimeout(() => {
        resolveCounterAttackAgainstActive(activeId, playerDisplayName);
      }, ATTACK_MESSAGE_DURATION_MS);
    });
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
    setPhase("enemyTurn");
    setMessage(switchInMessage(targetName));
    setPlayerVolatile(EMPTY_VOLATILE_SUMMARY);
    startSessionSyncTransition(() => {
      syncActivePokemonAction(pokemonId);
    });

    // Consumes the turn: exactly one wild attack lands on the newly-active
    // Pokémon before control returns to the player — deferred by
    // ATTACK_MESSAGE_DURATION_MS so the "X, go!" line is readable before
    // the wild's counter-attack message replaces it.
    if (messageStepTimeout.current) clearTimeout(messageStepTimeout.current);
    messageStepTimeout.current = setTimeout(() => {
      resolveCounterAttackAgainstActive(pokemonId, targetName);
    }, ATTACK_MESSAGE_DURATION_MS);
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

  function handleEscape() {
    setPhase("escaped");
    setMessage(escapeMessage());
    startSessionSyncTransition(() => {
      endBattleSessionAction();
    });

    if (messageStepTimeout.current) clearTimeout(messageStepTimeout.current);
    messageStepTimeout.current = setTimeout(handleReturnToMap, ATTACK_MESSAGE_DURATION_MS);
  }

  function handleMenuAction(actionId: string) {
    if (phase !== "playerTurn") return;

    if (actionId === "run") {
      handleEscape();
    } else if (actionId === "capture") {
      handleCapture();
    } else if (actionId === "switch") {
      setPhase("selectingVoluntarySwitch");
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

  const menuActions: BattleMenuAction[] = [
    { id: "switch", label: "החלפה" },
    { id: "capture", label: isCapturing ? "תופס..." : "לכידה" },
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
          spriteUrl: getFrontSpritePath(wildState.pokemon.dexNumber),
          status: wildStatusState,
          volatileBadges: volatileBadges(enemyVolatile),
          rarity: wildState.pokemon.rarity,
        }}
        player={{
          name: playerDisplayName,
          level: activePokemon.level,
          currentHealth: activePokemon.currentHp,
          maxHealth: activePokemon.maxHp,
          spriteUrl: getBackSpritePath(activePokemon.species.dexNumber),
          fallbackSpriteUrl: getFrontSpritePath(activePokemon.species.dexNumber),
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

      <PokeballCounter />
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
    </BattleWindow>
  );
}
