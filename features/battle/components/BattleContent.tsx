"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { BattleResultOverlay } from "./BattleResultOverlay";
import { BattleWindow } from "./BattleWindow";
import { PokeballCounter } from "./PokeballCounter";
import { BattleScene } from "@/components/battle/BattleScene";
import { applyFixedAttack } from "@/engine/battle/battle-config";
import type { EncounterResult } from "@/engine/encounter/pokemon-encounter-engine";
import { attemptCaptureAction } from "@/features/battle/actions/capture.action";
import { getNextEncounterAction } from "@/features/battle/actions/next-encounter.action";
import { syncPartyHpAction } from "@/features/battle/actions/sync-party-hp.action";
import { endBattleSessionAction } from "@/features/battle-session/actions/end-battle-session.action";
import { syncActivePokemonAction } from "@/features/battle-session/actions/sync-active-pokemon.action";
import { syncWildHpAction } from "@/features/battle-session/actions/sync-wild-hp.action";
import {
  attackMessage,
  captureFailedMessage,
  captureSucceededMessage,
  escapeMessage,
  faintedMessage,
  forcedReplacementMessage,
  partyDefeatedMessage,
  switchInMessage,
  throwPokeballMessage,
  wildAppearedMessage,
} from "@/features/battle/utils/battle-messages";
import { determineNextPhaseAfterFaint, resolveWildCounterAttack } from "@/features/battle/utils/battle-turn-rules";
import { PartySelector } from "@/features/party/components/PartySelector";
import { canSwitchTo } from "@/features/party/utils/party-rules";
import { getBackSpritePath, getFrontSpritePath } from "@/features/pokemon/media/pokemon-media-paths";
import { getBattleTheme } from "@/lib/battle/battleThemes";
import type { BattleAttackSlot, BattleMenuAction } from "@/shared/types/battle-ui";
import type { OwnedPokemon } from "@/shared/types/player-pokemon";
import type { ZoneId } from "@/shared/types/zone";

interface BattleContentProps {
  zoneId: ZoneId;
  wild: EncounterResult;
  party: OwnedPokemon[];
  activePokemonId: string;
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

// TEMPORARY attack: one shared move, fixed damage (engine/battle/battle-config.ts).
// Real per-species moves (engine/battle/battle-engine.ts + data/moves/move-data.ts)
// are already built and untouched — this is a deliberately simpler, parallel
// system until that gets wired into actual gameplay.
const TEMPORARY_ATTACK_SLOTS: BattleAttackSlot[] = [{ id: "attack", name: "תקיפה" }];

const HIT_FLASH_DURATION_MS = 400;
// Brief pause after defeating a wild Pokémon before the next one appears —
// long enough to read the victory message, short enough that the loop still
// feels continuous (no navigation, no reload).
const NEXT_ENCOUNTER_DELAY_MS = 1200;
// Shared pause between one battle message and whatever comes next — long
// enough to actually read a short line, short enough that battle still
// feels responsive. Reused by every single-step message sequence: a
// landed attack's own message before the outcome/counter-attack message
// replaces it, a switch-in message before the wild's guaranteed counter-hit,
// a failed capture's message before the wild's counter-hit, and an escape
// message before Map replaces this screen. Deliberately one shared constant
// (not four near-duplicates) so all these pauses stay in step by
// construction rather than drifting independently over time.
const MESSAGE_STEP_DELAY_MS = 700;

// HP authority: PlayerPokemon.currentHp in the DB is always the single
// source of truth. `partyHpMap` here is a live mirror seeded from it at
// mount — every HP-changing event updates this map immediately (so the UI
// never waits on a round trip) and fires syncPartyHpAction in the
// background in the same tick. Switching never changes HP, so switches
// never call it. This was chosen over "sync only at battle end" so there is
// only ever one source of truth to reason about, and so a player closing
// the tab mid-battle doesn't get their Pokémon's HP rolled back.
export function BattleContent({ zoneId, wild, party, activePokemonId, playerName }: BattleContentProps) {
  const router = useRouter();
  const theme = getBattleTheme(zoneId);

  const [wildState, setWildState] = useState(wild);
  const [partyHpMap, setPartyHpMap] = useState<Record<string, number>>(() =>
    Object.fromEntries(party.map((pokemon) => [pokemon.id, pokemon.currentHp]))
  );
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
  const [capturedName, setCapturedName] = useState<string | null>(null);
  const [isCapturing, startCaptureTransition] = useTransition();
  const [, startHpSyncTransition] = useTransition();
  const [, startNextEncounterTransition] = useTransition();
  // Fire-and-forget writes to the persisted FieldBattleSession (wild HP,
  // active Pokémon, ending the session) — a distinct concern from
  // startHpSyncTransition above, which only ever touches PlayerPokemon rows.
  const [, startSessionSyncTransition] = useTransition();

  const [enemyHit, setEnemyHit] = useState(false);
  const [playerHit, setPlayerHit] = useState(false);
  const enemyHitTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const playerHitTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nextEncounterTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Single shared ref for every MESSAGE_STEP_DELAY_MS pause (attack, switch,
  // failed capture, escape) — phase-guarding already ensures only one such
  // sequence can ever be pending at a time, so one ref covers all of them.
  const messageStepTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (enemyHitTimeout.current) clearTimeout(enemyHitTimeout.current);
      if (playerHitTimeout.current) clearTimeout(playerHitTimeout.current);
      if (nextEncounterTimeout.current) clearTimeout(nextEncounterTimeout.current);
      if (messageStepTimeout.current) clearTimeout(messageStepTimeout.current);
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

  // Derived every render from the party prop + the live HP map — never a
  // separately stored copy, so there is exactly one place HP can drift from.
  const livePartyList = party.map((pokemon) => ({
    ...pokemon,
    currentHp: partyHpMap[pokemon.id] ?? pokemon.currentHp,
  }));
  const activePokemon = livePartyList.find((pokemon) => pokemon.id === activeId)!;
  const playerDisplayName = activePokemon.nickname ?? activePokemon.species.name;

  // The one shared exit path for every session-ending state (run, capture,
  // full-party defeat) — router.replace (not push) so a finished battle
  // never sits in browser history, mirroring Map's own replace on the way in.
  function handleReturnToMap() {
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
    setMessage(wildAppearedMessage(nextWild.pokemon.name));
    setEnemyHit(false);
    setPlayerHit(false);
    setCapturedName(null);
    setPhase("playerTurn");
  }

  function handleAttack() {
    if (phase !== "playerTurn") return;

    // Locks input immediately (same convention every other action handler
    // uses) and shows the player's own attack line right away; the actual
    // outcome — the wild fainting, or its counter-attack — is deferred by
    // MESSAGE_STEP_DELAY_MS below so that line is actually readable instead
    // of being replaced in the same synchronous render pass.
    setPhase("enemyTurn");
    setMessage(attackMessage(playerDisplayName, wildState.pokemon.name));

    const newWildHp = applyFixedAttack(wildState.currentHealth);
    setWildState((prev) => ({ ...prev, currentHealth: newWildHp }));
    triggerHit("enemy");
    startSessionSyncTransition(() => {
      syncWildHpAction(zoneId, newWildHp);
    });

    if (messageStepTimeout.current) clearTimeout(messageStepTimeout.current);
    messageStepTimeout.current = setTimeout(() => {
      if (newWildHp <= 0) {
        setPhase("enemyDefeated");
        setMessage(faintedMessage(wildState.pokemon.name));
        scheduleNextEncounter();
        return;
      }

      resolveCounterAttackAgainstActive(activeId, playerDisplayName);
    }, MESSAGE_STEP_DELAY_MS);
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
        setCapturedName(result.pokemonName);
        setMessage(captureSucceededMessage(result.pokemonName));
        setPhase("captured");
        return;
      }

      // Failed (or a rare server error) — show the failure line first, held
      // for MESSAGE_STEP_DELAY_MS so it's actually readable, then the wild
      // Pokémon's counter-attack still lands, exactly like a failed attack
      // would. Phase stays "capturing" (not "playerTurn") for that whole
      // pause, so it's still impossible to throw a second ball mid-sequence.
      setMessage(captureFailedMessage(wildState.pokemon.name));
      triggerHit("enemy");

      if (messageStepTimeout.current) clearTimeout(messageStepTimeout.current);
      messageStepTimeout.current = setTimeout(() => {
        resolveCounterAttackAgainstActive(activeId, playerDisplayName);
      }, MESSAGE_STEP_DELAY_MS);
    });
  }

  function handleVoluntarySwitchSelect(pokemonId: string) {
    const target = livePartyList.find((pokemon) => pokemon.id === pokemonId);
    if (!target || !canSwitchTo(target, activeId)) return;

    const targetName = target.nickname ?? target.species.name;
    setActiveId(pokemonId);
    setPhase("enemyTurn");
    setMessage(switchInMessage(targetName));
    startSessionSyncTransition(() => {
      syncActivePokemonAction(pokemonId);
    });

    // Consumes the turn: exactly one wild attack lands on the newly-active
    // Pokémon before control returns to the player — deferred by
    // MESSAGE_STEP_DELAY_MS so the "X, go!" line is readable before the
    // wild's counter-attack message replaces it.
    if (messageStepTimeout.current) clearTimeout(messageStepTimeout.current);
    messageStepTimeout.current = setTimeout(() => {
      resolveCounterAttackAgainstActive(pokemonId, targetName);
    }, MESSAGE_STEP_DELAY_MS);
  }

  function handleForcedReplacementSelect(pokemonId: string) {
    const target = livePartyList.find((pokemon) => pokemon.id === pokemonId);
    if (!target || !canSwitchTo(target, activeId)) return;

    setActiveId(pokemonId);
    setPhase("playerTurn");
    setMessage(switchInMessage(target.nickname ?? target.species.name));
    startSessionSyncTransition(() => {
      syncActivePokemonAction(pokemonId);
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
    messageStepTimeout.current = setTimeout(handleReturnToMap, MESSAGE_STEP_DELAY_MS);
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

  function handleAttackSelect(attackId: string) {
    if (attackId === "attack") {
      handleAttack();
    }
  }

  const menuActions: BattleMenuAction[] = [
    { id: "switch", label: "החלפה" },
    { id: "capture", label: isCapturing ? "תופס..." : "לכידה" },
    { id: "run", label: "בריחה" },
  ];

  return (
    <BattleWindow>
      <BattleScene
        theme={theme}
        message={message}
        enemy={{
          name: wildState.pokemon.name,
          level: wildState.level,
          currentHealth: wildState.currentHealth,
          maxHealth: wildState.maximumHealth,
          spriteUrl: getFrontSpritePath(wildState.pokemon.dexNumber),
        }}
        player={{
          name: playerDisplayName,
          level: activePokemon.level,
          currentHealth: activePokemon.currentHp,
          maxHealth: activePokemon.maxHp,
          spriteUrl: getBackSpritePath(activePokemon.species.dexNumber),
          fallbackSpriteUrl: getFrontSpritePath(activePokemon.species.dexNumber),
        }}
        attacks={TEMPORARY_ATTACK_SLOTS}
        onAttackSelect={handleAttackSelect}
        menuActions={menuActions}
        onMenuAction={handleMenuAction}
        enemyHit={enemyHit}
        playerHit={playerHit}
      />

      <PokeballCounter />

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
          message={phase === "captured" && capturedName ? captureSucceededMessage(capturedName) : message}
          onReturnToMap={handleReturnToMap}
        />
      ) : null}
    </BattleWindow>
  );
}
