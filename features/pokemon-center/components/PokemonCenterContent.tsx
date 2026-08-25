"use client";

import { useState, useTransition } from "react";
import Link from "next/link";

import { NurseJoyDialogue, type DialogueAction } from "./NurseJoyDialogue";
import { PartyHealSelector } from "./PartyHealSelector";
import { BackButton } from "@/components/layout/BackButton";
import { healPartyAction } from "@/features/pokemon-center/actions/heal-party.action";
import { partyNeedsHealing } from "@/features/pokemon-center/utils/heal-status";
import { useTutorial, useTutorialTarget } from "@/features/tutorial/context/tutorial-context";
import type { OwnedPokemon } from "@/shared/types/player-pokemon";

interface PokemonCenterContentProps {
  initialParty: OwnedPokemon[];
}

const WELCOME_MESSAGE = "ברוכים הבאים למרכז הפוקימון! תרצו שארפא את הפוקימונים שלכם?";
const NO_THANKS_MESSAGE = "בסדר גמור! אני כאן אם תשנו את דעתכם.";
const SELECT_PROMPT_MESSAGE = "בחרו אילו פוקימונים מהצוות הפעיל תרצו לרפא.";
const ALREADY_FULL_MESSAGE = "הצוות הפעיל שלכם כבר במצב בריאות מלאה!";
const NO_PARTY_MESSAGE = "אין לכם פוקימונים בצוות הפעיל כרגע. הוסיפו פוקימון לצוות כדי להשתמש במרכז הפוקימון.";
const HEALED_MESSAGE = "הפוקימונים שלכם רופאו במלואם. נשמח לראותכם שוב!";
const NOTHING_TO_HEAL_MESSAGE = "הפוקימונים שנבחרו כבר במצב בריאות מלאה.";
const GENERIC_ERROR_MESSAGE = "משהו השתבש. נסו שוב.";

type CenterPhase = "idle" | "selecting" | "already-full" | "no-party" | "healed";

// Page composition root for /pokemon-center — mirrors HomeContent/
// MyPokemonContent's role for their own pages. Owns the dialogue state
// machine (idle Yes/No -> selecting -> healed) entirely in React state, but
// the healing itself always goes through a Server Action + service
// (features/pokemon-center/actions/heal-party.action.ts) — this component
// never writes to PlayerPokemon.currentHp itself, only mirrors the server's
// result locally once it comes back, same "DB is the single source of
// truth" rule BattleContent follows for HP (see its own doc comment).
export function PokemonCenterContent({ initialParty }: PokemonCenterContentProps) {
  const [party, setParty] = useState(initialParty);
  const [phase, setPhase] = useState<CenterPhase>(initialParty.length === 0 ? "no-party" : "idle");
  const [message, setMessage] = useState(initialParty.length === 0 ? NO_PARTY_MESSAGE : WELCOME_MESSAGE);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [healError, setHealError] = useState<string | null>(null);
  const [isHealing, startHealTransition] = useTransition();

  // GAME TUTORIAL — PHASE 2. Spotlights the whole heal flow (never a single
  // button — the real flow is itself multi-step: Yes -> select -> confirm).
  // reportAction("pokemon-healed") fires only once the REAL healPartyAction
  // result below confirms success AND the Starter's own id is among the
  // ones actually healed — "do not trust a client event alone if the
  // Server Action result can verify success" (this task's own explicit
  // rule). A no-op unless the Tutorial is currently awaiting exactly this
  // action, so this is always safe to call regardless of whether the
  // Tutorial is even active.
  const healFlowTargetRef = useTutorialTarget("pokemon-center-heal-flow");
  const { reportAction } = useTutorial();

  function handleYes() {
    if (!partyNeedsHealing(party)) {
      setPhase("already-full");
      setMessage(ALREADY_FULL_MESSAGE);
      return;
    }

    setSelectedIds(new Set());
    setHealError(null);
    setPhase("selecting");
    setMessage(SELECT_PROMPT_MESSAGE);
  }

  function handleNo() {
    setMessage(NO_THANKS_MESSAGE);
  }

  function returnToIdle() {
    setPhase("idle");
    setMessage(WELCOME_MESSAGE);
    setSelectedIds(new Set());
    setHealError(null);
  }

  function handleToggle(pokemonId: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(pokemonId)) {
        next.delete(pokemonId);
      } else {
        next.add(pokemonId);
      }
      return next;
    });
  }

  function handleSelectAll() {
    setSelectedIds(new Set(party.map((pokemon) => pokemon.id)));
  }

  function handleClearSelection() {
    setSelectedIds(new Set());
  }

  function handleConfirmHeal() {
    if (selectedIds.size === 0 || isHealing) return;

    setHealError(null);
    const idsToHeal = Array.from(selectedIds);

    startHealTransition(async () => {
      const result = await healPartyAction(idsToHeal);

      if (result.status === "healed") {
        const healedIds = new Set(result.healedIds);
        setParty((prev) => prev.map((pokemon) => (healedIds.has(pokemon.id) ? { ...pokemon, currentHp: pokemon.maxHp } : pokemon)));
        setSelectedIds(new Set());
        setPhase("healed");
        setMessage(HEALED_MESSAGE);

        // GAME TUTORIAL — PHASE 2. Only ever reported once the real result
        // is in hand AND it genuinely includes the Starter — never merely
        // "a heal succeeded" for some other party member.
        const healedStarter = party.find((pokemon) => pokemon.isStarter && healedIds.has(pokemon.id));
        if (healedStarter) reportAction("pokemon-healed");
        return;
      }

      if (result.status === "nothing-to-heal") {
        setHealError(NOTHING_TO_HEAL_MESSAGE);
        return;
      }

      setHealError(GENERIC_ERROR_MESSAGE);
    });
  }

  const dialogueActions: DialogueAction[] =
    phase === "idle"
      ? [
          { id: "yes", label: "כן", onClick: handleYes },
          { id: "no", label: "לא", onClick: handleNo, variant: "secondary" },
        ]
      : phase === "already-full"
        ? [{ id: "ok", label: "הבנתי", onClick: returnToIdle }]
        : phase === "healed"
          ? [{ id: "continue", label: "המשך", onClick: returnToIdle }]
          : [];

  return (
    <div
      dir="rtl"
      className="relative h-full w-full overflow-y-auto bg-gradient-to-b from-slate-950 via-indigo-950/40 to-slate-950"
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 40% at 50% 0%, rgba(129,90,238,0.16), transparent 60%), radial-gradient(ellipse 50% 30% at 90% 100%, rgba(99,102,241,0.12), transparent 60%)",
        }}
      />

      <div ref={healFlowTargetRef} className="relative mx-auto flex max-w-4xl flex-col gap-6 p-4 sm:p-6 lg:p-8">
        <BackButton />

        <NurseJoyDialogue message={message} actions={dialogueActions}>
          {phase === "no-party" ? (
            <Link
              href="/my-pokemon"
              className="rounded-full border border-indigo-400/70 bg-indigo-500/20 px-5 py-2 text-sm font-semibold text-indigo-200 transition-colors hover:bg-indigo-500/30"
            >
              נהל את הפוקימונים שלי
            </Link>
          ) : null}
        </NurseJoyDialogue>

        {phase === "selecting" ? (
          <PartyHealSelector
            party={party}
            selectedIds={selectedIds}
            onToggle={handleToggle}
            onSelectAll={handleSelectAll}
            onClearSelection={handleClearSelection}
            onConfirm={handleConfirmHeal}
            onCancel={returnToIdle}
            isHealing={isHealing}
            errorMessage={healError}
          />
        ) : null}
      </div>
    </div>
  );
}
