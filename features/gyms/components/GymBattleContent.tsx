"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { BattleScene } from "@/components/battle/BattleScene";
import { HealthBar } from "@/components/battle/HealthBar";
import { SpriteImage } from "@/components/media/SpriteImage";
import { useActiveBattle } from "@/features/battle-session/context/active-battle-context";
import { BattleWindow } from "@/features/battle/components/BattleWindow";
import { buildAttackSlots } from "@/features/battle/utils/battle-attack-slots";
import { playAttackHitSound } from "@/features/battle/utils/battle-attack-effect";
import { playDefeatSound, playSmallVictorySound, playVictorySound } from "@/features/battle/utils/battle-result-sound";
import { attackMessage, faintedMessage, forcedReplacementMessage, partyDefeatedMessage } from "@/features/battle/utils/battle-messages";
import type { BattleEvent } from "@/features/battle/events/battle-event.types";
import { decideAttackSoundsForTurn } from "@/features/gyms/utils/gym-attack-sound";
import {
  abandonGymBattleAction,
  confirmGymBattleResultAction,
  executeGymBattleActionAction,
  getGymBattleBagItemsAction,
  getGymBattleViewDataAction,
  switchGymBattleActivePokemonAction,
  useGymBattleItemAction,
  voluntarySwitchGymBattleActivePokemonAction,
} from "@/features/gyms/actions/gym-battle.actions";
import type { GymBattleViewData } from "@/features/gyms/services/gym-battle-view.service";
import type { GrantedGymReward } from "@/features/gyms/services/gym-reward.service";
import { npcSentOutMessage, npcTeamDefeatedMessage } from "@/features/gyms/utils/gym-battle-messages";
import type { InventoryItemView } from "@/features/inventory/types/inventory.types";
import { getGymBattleTheme } from "@/lib/battle/battleThemes";
import type { BattleMenuAction } from "@/shared/types/battle-ui";
import { GymBagPanel } from "./GymBagPanel";
import { GymVictoryRewardDialog } from "./GymVictoryRewardDialog";

interface GymBattleContentProps {
  initialData: GymBattleViewData;
}

type BattleOutcome = { kind: "victory"; reward: GrantedGymReward | null } | { kind: "defeat" } | null;

type BagItemErrorStatus =
  | "invalid-item"
  | "not-participant"
  | "not-owned"
  | "no-item"
  | "invalid-target"
  | "forced-replacement-pending"
  | "stale-action";

// PRE-BATTLE-ACTIONS MENU (later task, sections 4/5/13) — "bag" and
// "switch" are new voluntary, turn-consuming actions alongside the existing
// "forfeit" (now gated behind an explicit confirmation instead of firing
// immediately — see handleMenuAction/showAbandonConfirm below). There is
// deliberately no separate top-level "attack" entry here — attacks are
// already their own `attacks` prop/panel, exactly as before.
const MENU_ACTIONS: BattleMenuAction[] = [
  { id: "bag", label: "תיק" },
  { id: "switch", label: "החלפה" },
  { id: "forfeit", label: "פרישה" },
];

// GYMS & LEAGUES PHASE 4 — the NPC battle screen (section 10). Reuses
// BattleWindow (the shared page shell) and BattleScene (the shared
// theme-driven sprite/HUD/attack-panel composition) unmodified — the ONLY
// thing genuinely new here is this file's own orchestration (calling the
// Gym Server Actions instead of Field Battle's, and the Gym-specific
// context header/switch-panel/reward-dialog below).
//
// Deliberately NOT a reuse of BattleContent.tsx itself: that component is
// tightly coupled to wild-encounter-only concepts this battle must never
// trigger (capture, Egg/Chest finds, escape-as-completion, wild rarity) —
// force-fitting an "NPC mode" into it would risk exactly the kind of
// cross-contamination Phase 3's own service-layer isolation was built to
// prevent. Same "extract/reuse what's cleanly shared, build a small
// separate orchestrator for what's genuinely different" call Phase 3 made
// for the turn engine vs. the session model.
// ATTACK SOUND (later task, section 3/4/5) — reuses the EXACT same shared
// primitive Field Battle's own BattleContent.tsx already plays a player
// attack through (features/battle/utils/battle-attack-effect.ts) — no
// second sound file, no Gym-only Audio helper, no duplicated playback
// logic. The decision of WHICH side(s) actually attacked this turn is
// decideAttackSoundsForTurn's own job (features/gyms/utils/
// gym-attack-sound.ts, unit-tested there); this just acts on it — fires
// immediately/synchronously and at most once per side per call, never
// gated on any cosmetic animation, and never delayed.
function playAttackSoundsForTurn(events: readonly BattleEvent[]): void {
  const decision = decideAttackSoundsForTurn(events);
  if (decision.playerAttacked) playAttackHitSound();
  if (decision.enemyAttacked) playAttackHitSound();
}

export function GymBattleContent({ initialData }: GymBattleContentProps) {
  const router = useRouter();
  const { setActiveBattle } = useActiveBattle();
  const [isPending, startTransition] = useTransition();
  const [data, setData] = useState(initialData);
  const [message, setMessage] = useState(npcSentOutMessage(initialData.npc.name));
  const [needsReplacement, setNeedsReplacement] = useState(false);
  const [outcome, setOutcome] = useState<BattleOutcome>(null);
  const [voluntarySwitchOpen, setVoluntarySwitchOpen] = useState(false);
  const [bagOpen, setBagOpen] = useState(false);
  const [bagItems, setBagItems] = useState<InventoryItemView[]>([]);
  const [bagErrorStatus, setBagErrorStatus] = useState<BagItemErrorStatus | null>(null);
  const [showAbandonConfirm, setShowAbandonConfirm] = useState(false);

  useEffect(() => {
    setActiveBattle(true);
    return () => setActiveBattle(false);
  }, [setActiveBattle]);

  // BATTLE RESULT SOUNDS (later task) — a ref-guarded effect keyed on
  // `outcome` (never a sound call at the outcome-setting call site itself)
  // so this plays exactly once regardless of re-renders — the SAME
  // component keeps re-rendering while the victory/defeat dialog is shown
  // (bag/switch state, pending transitions, ...), and `outcome` itself is a
  // one-way ratchet (GymBattleContent's own doc comment on confirmVictory)
  // that never resets, so a plain "if outcome, play" without the ref guard
  // would replay on every one of those unrelated re-renders. Placed BEFORE
  // the victory early-return below (Rules of Hooks — every hook must run
  // unconditionally).
  //
  // GYM VICTORY SOUND — LEADER/CHAMPION ONLY, GYM SMALL VICTORY SOUND
  // (later tasks) — which victory sound plays is entirely decided by
  // `outcome.reward`, the EXACT SAME authoritative signal the render logic
  // just below (the victory early-return) already uses to pick
  // GymVictoryRewardDialog (Leader/Champion — awards a real Badge/Medal +
  // money/XP -> playVictorySound) over GymEasyMediumVictoryNotice (Easy/
  // Medium — "no numeric reward" is this project's own established rule,
  // gym-reward.service.ts's section 12 -> playSmallVictorySound) — never a
  // second/duplicated check, never inferred from trainerName or any UI
  // copy. The two are mutually exclusive by construction (one if/else
  // branch, one ref value per victory), so they can never both fire for
  // the same result. Defeat sound is completely unaffected — it never
  // depended on reward and still fires for every loss regardless of
  // battle slot.
  const playedResultSoundRef = useRef<"victory" | "small-victory" | "defeat" | null>(null);
  useEffect(() => {
    if (outcome?.kind === "victory" && outcome.reward !== null && playedResultSoundRef.current !== "victory") {
      playedResultSoundRef.current = "victory";
      playVictorySound();
    } else if (outcome?.kind === "victory" && outcome.reward === null && playedResultSoundRef.current !== "small-victory") {
      playedResultSoundRef.current = "small-victory";
      playSmallVictorySound();
    } else if (outcome?.kind === "defeat" && playedResultSoundRef.current !== "defeat") {
      playedResultSoundRef.current = "defeat";
      playDefeatSound();
    }
  }, [outcome]);

  function handleAttack(moveId: string) {
    if (isPending || needsReplacement || outcome) return;

    startTransition(async () => {
      const result = await executeGymBattleActionAction(moveId);

      if (result.status === "invalid-active-pokemon") {
        setNeedsReplacement(true);
        return;
      }
      // TURN SAFETY / RACE GUARD (later task) — a benign, rare collision
      // with another action's request (never a real error the player
      // caused); silently resync to the authoritative server state and
      // stay in the battle, rather than kicking the player back to /gyms
      // over what is, from their perspective, nothing at all.
      if (result.status === "stale-action") {
        const refreshed = await getGymBattleViewDataAction();
        if (refreshed.status === "ready") setData(refreshed.data);
        return;
      }
      if (result.status !== "success") {
        // no-session / not-owned / invalid-move — the session is gone or
        // stale; there is nothing left to do here but return to /gyms.
        router.push("/gyms");
        return;
      }

      // ATTACK SOUND — immediate, cosmetic, never gates the message/HP/
      // phase updates below (section 6: no artificial delays).
      playAttackSoundsForTurn(result.events);

      setMessage(attackMessage(data.player.name, data.npc.name));

      if (result.victoryCompleted) {
        setOutcome({ kind: "victory", reward: result.reward ?? null });
        return;
      }
      if (result.winner === "npc") {
        setMessage(partyDefeatedMessage());
        setOutcome({ kind: "defeat" });
        return;
      }

      const refreshed = await getGymBattleViewDataAction();
      if (refreshed.status !== "ready") {
        router.push("/gyms");
        return;
      }

      if (result.npcFainted) {
        setMessage(`${faintedMessage(data.npc.name)} ${npcSentOutMessage(refreshed.data.npc.name)}`);
      } else if (result.partyPokemonFainted) {
        setMessage(forcedReplacementMessage(data.player.name));
        setNeedsReplacement(true);
      }

      setData(refreshed.data);
    });
  }

  function handleSwitch(playerPokemonId: string) {
    if (isPending) return;
    startTransition(async () => {
      const switched = await switchGymBattleActivePokemonAction(playerPokemonId);
      if (switched.status !== "ok") return;

      const refreshed = await getGymBattleViewDataAction();
      if (refreshed.status !== "ready") {
        router.push("/gyms");
        return;
      }

      setData(refreshed.data);
      setNeedsReplacement(false);
      setMessage(`קדימה, ${refreshed.data.player.name}!`);
    });
  }

  // VOLUNTARY SWITCH (later task, section 5) — distinct from the existing
  // handleSwitch above (that one only ever fires from the FREE,
  // forced-replacement panel after a faint, via
  // switchGymBattleActivePokemonAction — left completely unmodified). This
  // one is the player choosing to switch on their own normal turn; it
  // consumes the turn, so a battleEnded/winner==="npc" outcome (the NPC's
  // free counter-strike finishing the fight) is checked BEFORE refetching
  // view data — the session is already deleted server-side by then, exactly
  // the same ordering handleAttack's own winner==="npc" branch already
  // uses. A free strike can never produce winner==="player" (one-directional
  // by design — see gym-battle-solo-strike.service.ts), so there is no
  // victory branch to handle here.
  function handleVoluntarySwitch(playerPokemonId: string) {
    if (isPending) return;
    setVoluntarySwitchOpen(false);

    startTransition(async () => {
      const result = await voluntarySwitchGymBattleActivePokemonAction(playerPokemonId);
      if (result.status === "no-session") {
        router.push("/gyms");
        return;
      }
      // BAG / VOLUNTARY SWITCH — PLAYER TURN ONLY (later task, section 2)
      // — the server's own authoritative check disagrees with this
      // client's needsReplacement flag (a desync, e.g. a stale render);
      // resync and route into the correct forced-replacement flow instead
      // of leaving the player stuck with no visible way forward.
      if (result.status === "forced-replacement-pending") {
        const refreshed = await getGymBattleViewDataAction();
        if (refreshed.status === "ready") setData(refreshed.data);
        setNeedsReplacement(true);
        return;
      }
      // A benign race with another action — resync silently, same
      // reasoning as handleAttack's own "stale-action" branch.
      if (result.status === "stale-action") {
        const refreshed = await getGymBattleViewDataAction();
        if (refreshed.status === "ready") setData(refreshed.data);
        return;
      }
      if (result.status !== "success") return;

      // ATTACK SOUND — the voluntary switch itself is silent (section 3's
      // own "do NOT play... switching itself"); only the NPC's free-strike
      // RESPONSE, if it actually attacked, gets the sound.
      if (result.npcAttacked) playAttackHitSound();

      if (result.winner === "npc") {
        setMessage(partyDefeatedMessage());
        setOutcome({ kind: "defeat" });
        return;
      }

      const refreshed = await getGymBattleViewDataAction();
      if (refreshed.status !== "ready") {
        router.push("/gyms");
        return;
      }
      setData(refreshed.data);
      setMessage(`קדימה, ${refreshed.data.player.name}!`);
    });
  }

  // BAG DURING GYM BATTLE (later task, section 4) — opening the panel is a
  // read-only fetch (getGymBattleBagItemsAction), never a turn-consuming
  // action by itself; only an actual item use below is.
  function openBag() {
    if (isPending) return;
    setBagErrorStatus(null);
    startTransition(async () => {
      const items = await getGymBattleBagItemsAction();
      setBagItems(items);
      setBagOpen(true);
    });
  }

  // Same battleEnded/winner ordering as handleVoluntarySwitch above — using
  // an item also consumes the turn (the NPC gets one free strike), so a
  // defeat is resolved from the action result directly, before any
  // (now-stale, since the session was already deleted) view-data refetch.
  function handleUseItem(itemId: string, targetPlayerPokemonId: string) {
    if (isPending) return;
    setBagErrorStatus(null);

    startTransition(async () => {
      const result = await useGymBattleItemAction(itemId, targetPlayerPokemonId);
      if (result.status === "no-session") {
        router.push("/gyms");
        return;
      }
      // Same resync-into-forced-replacement reasoning as
      // handleVoluntarySwitch's own "forced-replacement-pending" branch.
      if (result.status === "forced-replacement-pending") {
        const refreshed = await getGymBattleViewDataAction();
        if (refreshed.status === "ready") setData(refreshed.data);
        setBagOpen(false);
        setNeedsReplacement(true);
        return;
      }
      if (result.status !== "success") {
        setBagErrorStatus(result.status);
        return;
      }

      setBagOpen(false);

      // ATTACK SOUND — using the item itself is silent (section 3's own
      // "do NOT play... selecting an item"); only the NPC's free-strike
      // RESPONSE, if it actually attacked, gets the sound.
      if (result.npcAttacked) playAttackHitSound();

      if (result.winner === "npc") {
        setMessage(partyDefeatedMessage());
        setOutcome({ kind: "defeat" });
        return;
      }

      const refreshed = await getGymBattleViewDataAction();
      if (refreshed.status !== "ready") {
        router.push("/gyms");
        return;
      }
      setData(refreshed.data);
      setMessage(`${result.itemName} שומש בהצלחה!`);
    });
  }

  // ABANDON CONFIRMATION (later task, section 13) — "פרישה" no longer
  // abandons immediately; it only opens the confirmation dialog below.
  // abandonGymBattleAction itself is only ever called from
  // confirmAbandon, i.e. after the player's explicit "כן, לפרוש".
  function handleMenuAction(actionId: string) {
    if (isPending) return;
    if (actionId === "forfeit") {
      setShowAbandonConfirm(true);
      return;
    }
    if (actionId === "bag") {
      openBag();
      return;
    }
    if (actionId === "switch") {
      setVoluntarySwitchOpen(true);
      return;
    }
  }

  function confirmAbandon() {
    setShowAbandonConfirm(false);
    startTransition(async () => {
      await abandonGymBattleAction();
      router.push("/gyms");
    });
  }

  // RESULT DIALOG MUST WAIT FOR CONFIRMATION (later task) — the ONE place
  // navigation away from a completed victory is ever triggered. Named (not
  // an inline arrow) so it's the single, unambiguous, greppable call site —
  // never invoked from anywhere except the dialogs' own onConfirm below,
  // i.e. only after the player's explicit "אישור" click. `outcome` itself
  // is a one-way ratchet: nothing in this file ever calls setOutcome(null)/
  // resets it once set, so once the victory branch below is reached, this
  // component can only ever keep rendering that same dialog (or navigate
  // away, but ONLY via this function).
  //
  // ROOT CAUSE OF THE AUTO-DISMISS BUG (later task) — this was never a
  // client-side React state bug. executeGymBattleActionAction (and the
  // voluntary-switch/Bag-item actions) used to call revalidatePath() the
  // instant a battle-ending action completed. Per Next.js's own Server
  // Actions model, a Server Action that calls revalidatePath gets a
  // same-response, SERVER-SIDE re-render of the CURRENT route included in
  // its response — and since the winning transaction had already deleted
  // the NpcBattleSession, that re-render re-ran GymBattlePage's own "no
  // active session -> redirect('/gyms')" guard, navigating the browser away
  // BEFORE this component's own setOutcome(...) had a chance to be seen —
  // no client-side guard could ever have prevented a server-issued redirect
  // baked into the SAME response. The fix: revalidation is no longer
  // performed by the battle-ending action at all — see
  // confirmGymBattleResultAction's own doc comment (gym-battle.actions.ts)
  // — it only ever runs here, deliberately AFTER the player has already
  // seen and confirmed the result, immediately before this function's own
  // deliberate navigation.
  function confirmVictory() {
    startTransition(async () => {
      await confirmGymBattleResultAction();
      router.push("/gyms");
    });
  }

  if (outcome?.kind === "victory") {
    // Easy/Medium victories complete with no reward (section 12 — no
    // numeric reward for those) — a short confirmation instead of the full
    // Badge/Medal/money/XP dialog, which only ever applies to a Gym
    // Leader/Regional Champion win. Either way, exactly ONE dialog is ever
    // rendered here — never both stacked.
    return outcome.reward ? (
      <GymVictoryRewardDialog
        regionId={data.regionId}
        gymNumber={data.gymNumber}
        trainerName={data.trainerName}
        reward={outcome.reward}
        onConfirm={confirmVictory}
      />
    ) : (
      <GymEasyMediumVictoryNotice trainerName={data.trainerName} onConfirm={confirmVictory} />
    );
  }

  const theme = getGymBattleTheme(data.battleSource);
  const attacks = buildAttackSlots([...data.knownMoves]);

  // TURN SAFETY (later task, section 15) — Attack/Bag/voluntary-Switch are
  // mutually exclusive for a given turn. Reusing the exact same
  // "attacks/menuActions become empty while locked" mechanism
  // needsReplacement/outcome already used before this task, just extended
  // to the two new overlay panels: whichever one opened first hides the
  // attack panel and the menu row entirely, so a second action can't even
  // be requested client-side while one is in flight or awaiting the
  // player's target/confirmation choice. The server side of this is
  // lighter-weight than League PvP's own turnNumber+CAS guard — Gym battles
  // are single-player/synchronous (the player is the only source of
  // requests), so there is no genuinely concurrent dual-submission window
  // to race against, unlike League's async two-player model.
  const actionsLocked = Boolean(needsReplacement || outcome || voluntarySwitchOpen || bagOpen || showAbandonConfirm);

  return (
    <BattleWindow musicActive={outcome === null}>
      <BattleScene
        theme={theme}
        enemy={{
          name: data.npc.name,
          level: data.npc.level,
          currentHealth: Math.max(0, data.npc.currentHp),
          maxHealth: data.npc.maxHp,
          spriteUrl: data.npc.spriteUrl,
          status: data.npc.status,
        }}
        player={{
          name: data.player.name,
          level: data.player.level,
          currentHealth: Math.max(0, data.player.currentHp),
          maxHealth: data.player.maxHp,
          spriteUrl: data.player.spriteUrl,
          fallbackSpriteUrl: data.player.fallbackSpriteUrl,
          status: data.player.status,
        }}
        message={outcome?.kind === "defeat" ? partyDefeatedMessage() : needsReplacement ? forcedReplacementMessage(data.player.name) : message}
        attacks={actionsLocked ? [] : attacks}
        onAttackSelect={handleAttack}
        menuActions={actionsLocked ? [] : MENU_ACTIONS}
        onMenuAction={handleMenuAction}
        // POKÉ BALL TEAM-STATUS INDICATORS (GYM BATTLE POLISH task, section
        // 1) — moved from a detached, absolutely-positioned overlay into
        // each side's own BattleHUD card (via BattleScene's new, generic
        // playerHudFooter/enemyHudFooter slot — see that component's own
        // doc comment), directly beneath the HP/XP bars, exactly like the
        // player's real name/HP/XP card visually groups together. One
        // existing Poké Ball icon (never a new asset) per participating
        // Pokémon, grayscale+dimmed while fainted; derived strictly from
        // data.npcTeamAliveFlags/playerTeamAliveFlags, themselves computed
        // server-side straight off the authoritative battle-session HP
        // state — never a second/duplicated indicator implementation.
        playerHudFooter={<PokeBallRow aliveFlags={data.playerTeamAliveFlags} />}
        enemyHudFooter={<PokeBallRow aliveFlags={data.npcTeamAliveFlags} />}
      />

      {/* GYM CONTEXT HEADER (section 10) — region/Gym/battle-slot name or
          Regional Champion, plus how many opponents remain, so the player
          always knows which of the 27 Gyms/9 Champions they're fighting and
          how much of the fixed team is left — never ambiguous with a Field
          Battle wild encounter. */}
      <div dir="rtl" className="pointer-events-none absolute right-3 top-3 rounded-lg bg-black/50 px-3 py-1.5 text-xs text-slate-100 backdrop-blur-sm sm:right-6 sm:top-6">
        <p className="font-semibold">{data.contextLabel}</p>
        <p className="text-slate-300">
          יריבים שנותרו: {data.npcTeamRemainingCount} / {data.npcTeamTotalCount}
        </p>
      </div>

      {needsReplacement ? (
        <GymPartySwitcher participants={data.participants} onSelect={handleSwitch} disabled={isPending} />
      ) : null}

      {voluntarySwitchOpen ? (
        <GymPartySwitcher
          title="החלפת פוקימון"
          participants={data.participants}
          onSelect={handleVoluntarySwitch}
          disabled={isPending}
          onCancel={() => setVoluntarySwitchOpen(false)}
        />
      ) : null}

      {bagOpen ? (
        <GymBagPanel
          items={bagItems}
          participants={data.participants}
          pending={isPending}
          errorStatus={bagErrorStatus}
          onUseItem={handleUseItem}
          onClose={() => setBagOpen(false)}
        />
      ) : null}

      {/* ABANDON CONFIRMATION (later task, section 13) — a blocking
          confirmation shown BEFORE abandonGymBattleAction is ever called;
          "חזרה לקרב" simply closes this dialog with no side effect at all,
          leaving the active session (and every participant's current HP)
          completely untouched. */}
      {showAbandonConfirm ? (
        <div dir="rtl" role="dialog" aria-modal="true" className="absolute inset-0 z-[75] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-slate-900 p-6 text-center shadow-2xl">
            <h2 className="text-lg font-bold text-slate-100">האם אתה בטוח שברצונך לפרוש מהקרב?</h2>
            <div className="mt-6 flex flex-col gap-2">
              <button
                type="button"
                onClick={confirmAbandon}
                className="w-full rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-500"
              >
                כן, לפרוש
              </button>
              <button
                type="button"
                onClick={() => setShowAbandonConfirm(false)}
                className="w-full rounded-lg bg-slate-700 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-600"
              >
                חזרה לקרב
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {outcome?.kind === "defeat" ? (
        <div dir="rtl" role="dialog" aria-modal="true" className="absolute inset-0 z-[70] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-red-400/30 bg-slate-900 p-6 text-center shadow-2xl">
            <h2 className="text-lg font-bold text-slate-100">לא נורא! הפעם {data.trainerName} ניצח.</h2>
            <p className="mt-2 text-sm text-slate-400">אפשר להתחזק ולנסות שוב.</p>
            <button
              type="button"
              onClick={() => router.push("/gyms")}
              className="mt-6 w-full rounded-lg bg-slate-700 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-600"
            >
              אישור
            </button>
          </div>
        </div>
      ) : null}
    </BattleWindow>
  );
}

// POKÉ BALL TEAM-STATUS INDICATORS (GYM BATTLE POLISH task, section 1) —
// rendered as BattleHUD's own `footer` slot now (inside that side's status
// card, directly beneath the HP/XP bars), so this no longer needs its own
// detached background/blur — a plain top border is enough to visually
// separate it from the bars above within the SAME card. Reuses the
// project's existing Poké Ball artwork (public/images/items/poke-balls/
// poke-ball.png, the same file the Shop/Bag already use for the basic Poké
// Ball item) through the project's own fallback-aware SpriteImage, never a
// new asset; a fainted slot is dimmed and desaturated with a CSS grayscale
// filter rather than a second sprite.
function PokeBallRow({ aliveFlags }: { aliveFlags: readonly boolean[] }) {
  return (
    <div className="flex flex-wrap gap-1 border-t border-white/10 pt-1.5">
      {aliveFlags.map((alive, index) => (
        <SpriteImage
          key={index}
          src="/images/items/poke-balls/poke-ball.png"
          alt={alive ? "פוקימון פעיל" : "פוקימון התעלף"}
          className={`h-4 w-4 ${alive ? "" : "opacity-40 grayscale"}`}
          fallbackClassName={`h-4 w-4 rounded-full border border-dashed border-white/20 bg-slate-800/60 ${alive ? "" : "opacity-40"}`}
        />
      ))}
    </div>
  );
}

interface GymPartySwitcherProps {
  // VOLUNTARY SWITCH (later task, section 5) — this same list UI is reused
  // for both the forced-replacement path (no title/onCancel — a faint
  // leaves no choice but to pick a replacement) and the new voluntary path
  // (custom title, cancellable via onCancel) rather than forking into two
  // near-identical components.
  title?: string;
  participants: GymBattleViewData["participants"];
  onSelect: (playerPokemonId: string) => void;
  disabled: boolean;
  onCancel?: () => void;
}

// Deliberately NOT a reuse of features/party/components/PartySelector.tsx:
// that component's availability rule (canSwitchTo) reads a real
// OwnedPokemon's REAL currentHp — exactly the field Phase 3's own isolation
// guarantees a Gym battle never touches. Reusing it here would show the
// WRONG availability (a real-Pokémon at 1 HP but full battle-local HP would
// look unusable, and vice versa). This tiny custom list reads only the
// battle-local participant view (currentHp/fainted from
// NpcBattleSession.playerBattleHp), which is the only correct source here.
function GymPartySwitcher({ title, participants, onSelect, disabled, onCancel }: GymPartySwitcherProps) {
  return (
    <div dir="rtl" role="dialog" aria-modal="true" className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-900/95 p-4 shadow-2xl">
        <h2 className="mb-3 text-base font-bold text-slate-100">{title ?? "הפוקימון שלך התעלף — בחר פוקימון אחר"}</h2>
        <div className="flex flex-col gap-2">
          {participants.map((participant) => (
            <button
              key={participant.id}
              type="button"
              disabled={disabled || participant.fainted || participant.isActive}
              onClick={() => onSelect(participant.id)}
              className="flex items-center gap-3 rounded-lg border border-white/10 bg-slate-800/60 p-2 text-right transition-colors enabled:hover:bg-slate-700/60 disabled:opacity-40"
            >
              <SpriteImage src={participant.frontSpriteUrl} alt={participant.name} className="h-12 w-12 object-contain" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-slate-100">
                  {participant.name} <span className="text-slate-400">Lv.{participant.level}</span>
                </p>
                <HealthBar current={Math.max(0, participant.currentHp)} max={participant.maxHp} />
              </div>
              {participant.fainted ? <span className="text-xs text-red-400">התעלף</span> : null}
            </button>
          ))}
        </div>
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            disabled={disabled}
            className="mt-3 w-full rounded-lg border border-white/10 bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-300 transition-colors hover:bg-slate-700 disabled:opacity-50"
          >
            ביטול
          </button>
        ) : null}
      </div>
    </div>
  );
}

// GYM REWARD RULE (section 12) — Easy/Medium victories complete with no
// numeric reward at all; this simple confirmation is what they show instead
// of the full Badge/Medal/money/XP GymVictoryRewardDialog. VICTORY DIALOG
// COPY (later task, section 1) — the exact approved sentence, using the
// real trainer name; stays open until the player's own explicit "אישור"
// click (see confirmVictory's own doc comment above).
function GymEasyMediumVictoryNotice({ trainerName, onConfirm }: { trainerName: string; onConfirm: () => void }) {
  return (
    <div dir="rtl" role="dialog" aria-modal="true" className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border border-emerald-400/30 bg-slate-900 p-6 text-center shadow-2xl">
        <h2 className="text-lg font-bold text-slate-100">כל הכבוד! ניצחת את {trainerName}. לא רבים מצליחים!</h2>
        <p className="mt-1 text-sm text-slate-400">{npcTeamDefeatedMessage()}</p>
        <button
          type="button"
          onClick={onConfirm}
          className="mt-6 w-full rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-500"
        >
          אישור
        </button>
      </div>
    </div>
  );
}
