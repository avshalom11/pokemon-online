"use client";

import { useEffect, useState, useTransition } from "react";

import { BackButton } from "@/components/layout/BackButton";
import { collectFromDaycareAction, depositToDaycareAction, getDaycareViewAction } from "@/features/daycare/actions/daycare.actions";
import { DaycareActiveStayPanel } from "@/features/daycare/components/DaycareActiveStayPanel";
import { DaycareEligiblePokemonCard } from "@/features/daycare/components/DaycareEligiblePokemonCard";
import { DaycareEmptySlotCard } from "@/features/daycare/components/DaycareEmptySlotCard";
import { DaycareRulesInfo } from "@/features/daycare/components/DaycareRulesInfo";
import { DAYCARE_DEPOSIT_FEE, DAYCARE_MAX_SLOTS, DAYCARE_VIEW_POLL_INTERVAL_MS } from "@/features/daycare/config/daycare.config";
import type { DaycareViewData } from "@/features/daycare/types";

interface DaycareContentProps {
  initialData: DaycareViewData;
}

const DEPOSIT_ERROR_MESSAGES: Record<string, string> = {
  "not-owned": "לא נמצא פוקימון כזה בבעלותך. נסה לרענן את העמוד.",
  "already-max-level": "פוקימון שכבר ברמה מקסימלית אינו יכול להיכנס למעון.",
  "in-party": "יש להסיר את הפוקימון מהשישייה לפני הפקדתו במעון.",
  "already-in-daycare": "הפוקימון הזה כבר נמצא במעון.",
  "daycare-full": `המעון מלא — ניתן להחזיק עד ${DAYCARE_MAX_SLOTS} פוקימונים במעון`,
  "insufficient-funds": "אין לך מספיק כסף כדי להכניס את הפוקימון למעון",
  unauthenticated: "יש להתחבר כדי להשתמש במעון.",
};

const PICKUP_ERROR_MESSAGES: Record<string, string> = {
  "not-found": "לא נמצאה שהייה פעילה במעון עבור הפוקימון הזה. נסה לרענן את העמוד.",
  "insufficient-funds": "אין לך מספיק כסף כדי להוציא את הפוקימון מהמעון",
  unauthenticated: "יש להתחבר כדי להשתמש במעון.",
};

// POKÉMON DAYCARE — PHASE 2 (5 SLOTS + DEPOSIT FEE). Page composition root
// for /daycare, same shell/state-management convention Phase 1 already
// established (gradient background, BackButton, centered column; local
// `data` state updated directly from each action's own returned result,
// never router.refresh() — revalidatePath inside the actions keeps the
// next full navigation fresh independently; a light background poll,
// DAYCARE_VIEW_POLL_INTERVAL_MS, keeps every stay's earned-levels/debt/
// countdown current — the SERVER remains the sole authority on what's
// actually earned, this poll only ever re-reads that authoritative state).
//
// PHASE 2's own UI change: `data.activeStays` is now an ARRAY (0 to
// DAYCARE_MAX_SLOTS entries) rendered as a grid of per-Pokémon cards,
// padded out with DaycareEmptySlotCard placeholders so the grid always
// visually reads as a complete "X/5" picture. The deposit selector stays
// visible (not an either/or with the active-stays grid, unlike Phase 1)
// as long as there's at least one free slot, and disappears — replaced by
// the "המעון מלא" message — only once all 5 are occupied.
export function DaycareContent({ initialData }: DaycareContentProps) {
  const [data, setData] = useState(initialData);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const interval = setInterval(async () => {
      const fresh = await getDaycareViewAction();
      setData(fresh);
    }, DAYCARE_VIEW_POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  function handleDeposit(playerPokemonId: string) {
    setErrorMessage(null);
    startTransition(async () => {
      const result = await depositToDaycareAction(playerPokemonId);
      if (!result.ok) {
        setErrorMessage(DEPOSIT_ERROR_MESSAGES[result.error] ?? "אירעה שגיאה, נסה שוב.");
        return;
      }
      setData(await getDaycareViewAction());
    });
  }

  function handlePickup(playerPokemonId: string) {
    setErrorMessage(null);
    startTransition(async () => {
      const result = await collectFromDaycareAction(playerPokemonId);
      if (!result.ok) {
        setErrorMessage(PICKUP_ERROR_MESSAGES[result.error] ?? "אירעה שגיאה, נסה שוב.");
        return;
      }
      setData(await getDaycareViewAction());
    });
  }

  const freeSlots = DAYCARE_MAX_SLOTS - data.activeStays.length;
  const hasFreeSlot = freeSlots > 0;

  return (
    <div dir="rtl" className="relative h-full w-full overflow-y-auto bg-gradient-to-b from-slate-950 via-indigo-950/40 to-slate-950">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 40% at 50% 0%, rgba(129,90,238,0.16), transparent 60%), radial-gradient(ellipse 50% 30% at 90% 100%, rgba(99,102,241,0.12), transparent 60%)",
        }}
      />

      <div className="relative mx-auto flex max-w-5xl flex-col gap-6 p-4 sm:p-6 lg:p-8">
        <BackButton />

        <h1 className="text-lg font-bold text-slate-100">מעון פוקימונים</h1>

        {errorMessage ? (
          <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-sm font-semibold text-rose-400">{errorMessage}</p>
        ) : null}

        <div>
          <h2 className="mb-3 text-sm font-semibold tracking-wide text-slate-400 uppercase">
            פוקימונים במעון: {data.activeStays.length}/{DAYCARE_MAX_SLOTS}
          </h2>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.activeStays.map((stay) => (
              <DaycareActiveStayPanel
                key={stay.playerPokemonId}
                stay={stay}
                playerMoney={data.playerMoney}
                disabled={isPending}
                onPickup={() => handlePickup(stay.playerPokemonId)}
              />
            ))}
            {Array.from({ length: freeSlots }).map((_, index) => (
              <DaycareEmptySlotCard key={`empty-${index}`} />
            ))}
          </div>
        </div>

        {hasFreeSlot ? (
          <div>
            <h2 className="mb-1 text-sm font-semibold tracking-wide text-slate-400 uppercase">בחר פוקימון להפקדה</h2>
            <p className="mb-3 text-xs text-slate-500">דמי כניסה למעון: {DAYCARE_DEPOSIT_FEE.toLocaleString("he-IL")} כסף</p>

            {data.eligiblePokemon.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-white/10 bg-slate-900/30 p-6 text-center text-sm text-slate-500">
                אין לך כרגע פוקימון זמין להפקדה במעון.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {data.eligiblePokemon.map((pokemon) => (
                  <DaycareEligiblePokemonCard key={pokemon.id} pokemon={pokemon} disabled={isPending} onDeposit={handleDeposit} />
                ))}
              </div>
            )}
          </div>
        ) : (
          <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-center text-sm font-semibold text-amber-400">
            {`המעון מלא — ניתן להחזיק עד ${DAYCARE_MAX_SLOTS} פוקימונים במעון`}
          </p>
        )}

        <DaycareRulesInfo />
      </div>
    </div>
  );
}
