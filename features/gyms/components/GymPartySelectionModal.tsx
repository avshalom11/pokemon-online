"use client";

import { useState } from "react";

import { HealthBar } from "@/components/battle/HealthBar";
import { SpriteImage } from "@/components/media/SpriteImage";
import type { GymPartySelectionOption } from "@/features/gyms/services/gym-battle-session.service";

interface GymPartySelectionModalProps {
  options: readonly GymPartySelectionOption[];
  requiredCount: number;
  isPending: boolean;
  errorMessage: string | null;
  onConfirm: (selectedIds: readonly string[]) => void;
  onCancel: () => void;
}

// PRE-BATTLE PARTY SELECTION (later task, section 6/7) — shown BEFORE
// startGymBattleAction ever runs; nothing is created here yet. Shows each
// Pokémon's REAL current HP (never a fresh/full battle-local number —
// there is no battle yet) so the player can see exactly who is healthy,
// injured, or fainted before choosing. A fainted Pokémon (currentHp <= 0)
// can never be selected — the existing game architecture has no "enter
// fainted and revive mid-battle" allowance for a Gym's OWN starting
// selection (Bag Revives only ever target an ALREADY-fainted PARTICIPANT
// during the battle itself, a different concept).
export function GymPartySelectionModal({ options, requiredCount, isPending, errorMessage, onConfirm, onCancel }: GymPartySelectionModalProps) {
  const [selected, setSelected] = useState<string[]>([]);

  function toggle(id: string, fainted: boolean) {
    if (isPending || fainted) return;
    setSelected((current) => {
      if (current.includes(id)) return current.filter((existing) => existing !== id);
      if (current.length >= requiredCount) return current;
      return [...current, id];
    });
  }

  const canConfirm = selected.length === requiredCount && !isPending;

  return (
    <div dir="rtl" role="dialog" aria-modal="true" className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="flex w-full max-w-lg flex-col rounded-2xl border border-white/10 bg-slate-900 p-5 shadow-2xl">
        <h2 className="text-base font-bold text-slate-100">בחירת קבוצה לקרב</h2>
        <p className="mt-1 text-xs text-slate-400">
          יש לבחור {requiredCount} פוקימונים שישתתפו בקרב. פוקימונים פצועים נכנסים לקרב עם נקודות החיים הנוכחיות שלהם — הקרב אינו מרפא אוטומטית.
        </p>

        {errorMessage ? (
          <p role="alert" className="mt-2 rounded-lg border border-red-400/40 bg-red-500/10 px-3 py-1.5 text-xs text-red-200">
            {errorMessage}
          </p>
        ) : null}

        <div className="mt-3 flex max-h-80 flex-col gap-2 overflow-y-auto">
          {options.map((pokemon) => {
            const isSelected = selected.includes(pokemon.id);
            return (
              <button
                key={pokemon.id}
                type="button"
                disabled={isPending || pokemon.fainted}
                onClick={() => toggle(pokemon.id, pokemon.fainted)}
                aria-pressed={isSelected}
                className={`flex items-center gap-3 rounded-lg border p-2 text-right transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                  isSelected ? "border-indigo-400/70 bg-indigo-500/10" : "border-white/10 bg-slate-800/60 enabled:hover:bg-slate-700/60"
                }`}
              >
                <SpriteImage
                  src={pokemon.frontSpriteUrl}
                  alt={pokemon.name}
                  className="h-10 w-10 object-contain"
                  fallbackClassName="flex h-10 w-10 items-center justify-center rounded-lg border border-dashed border-white/20 bg-slate-800/60 text-slate-500"
                />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-100">
                    {pokemon.name} <span className="text-slate-400">Lv.{pokemon.level}</span>
                  </p>
                  <HealthBar current={Math.max(0, pokemon.currentHp)} max={pokemon.maxHp} />
                </div>
                {pokemon.fainted ? <span className="text-xs text-red-400">התעלף</span> : null}
              </button>
            );
          })}
        </div>

        <div className="mt-4 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={isPending}
            className="rounded-lg border border-white/10 bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-300 transition-colors hover:bg-slate-700 disabled:opacity-50"
          >
            ביטול
          </button>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">
              נבחרו {selected.length} מתוך {requiredCount}
            </span>
            <button
              type="button"
              onClick={() => onConfirm(selected)}
              disabled={!canConfirm}
              className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 disabled:opacity-50"
            >
              התחל קרב
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
