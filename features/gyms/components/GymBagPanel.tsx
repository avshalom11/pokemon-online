"use client";

import { useState } from "react";

import { HealthBar } from "@/components/battle/HealthBar";
import { SpriteImage } from "@/components/media/SpriteImage";
import { gymBagItemErrorMessageHe } from "@/features/gyms/data/gym-labels";
import type { GymBattleViewData } from "@/features/gyms/services/gym-battle-view.service";
import type { InventoryItemView } from "@/features/inventory/types/inventory.types";

interface GymBagPanelProps {
  // Already server-fetched and filtered to owned potions only
  // (getGymBattleBagItemsAction) — this component never fetches or
  // filters inventory itself.
  items: InventoryItemView[];
  participants: GymBattleViewData["participants"];
  pending: boolean;
  errorStatus:
    | "invalid-item"
    | "not-participant"
    | "not-owned"
    | "no-item"
    | "invalid-target"
    | "forced-replacement-pending"
    | "stale-action"
    | null;
  onUseItem: (itemId: string, targetPlayerPokemonId: string) => void;
  onClose: () => void;
}

// BAG DURING GYM BATTLE (later task, section 4) — a deliberately NEW,
// smaller sibling of features/battle/components/BattleBagPanel.tsx rather
// than a reuse of it: that component also offers Poké Balls (never allowed
// here, per section 4's own "Potions/Revive/Max Revive only, no unrelated
// items" rule) and is built around Field Battle's own OwnedPokemon/
// medicine-use flow. This panel keeps the same two-step "item grid -> target
// picker" shape as a design reference, but reads only the live Gym battle
// PARTICIPANT view (currentHp/fainted come from the authoritative
// NpcBattleSession HP — HP persistence, section 9), never a second/fake
// health source.
export function GymBagPanel({ items, participants, pending, errorStatus, onUseItem, onClose }: GymBagPanelProps) {
  const [pickingItemId, setPickingItemId] = useState<string | null>(null);
  const pickingItem = pickingItemId ? items.find((view) => view.item.id === pickingItemId) : undefined;

  return (
    <div dir="rtl" role="dialog" aria-modal="true" className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="relative flex max-h-full w-full max-w-lg flex-col rounded-2xl border border-white/10 bg-slate-900/95 p-4 shadow-2xl sm:p-6">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-base font-bold text-slate-100 sm:text-lg">תיק ציוד</h2>
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            aria-label="סגור"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-slate-800/80 text-slate-300 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            ✕
          </button>
        </div>

        {errorStatus ? (
          <p role="alert" className="mb-3 rounded-lg border border-red-400/40 bg-red-500/10 px-3 py-1.5 text-xs text-red-200">
            {gymBagItemErrorMessageHe(errorStatus)}
          </p>
        ) : null}

        {pickingItem ? (
          <TargetPicker
            item={pickingItem}
            participants={participants}
            pending={pending}
            onBack={() => setPickingItemId(null)}
            onSelect={(targetId) => onUseItem(pickingItem.item.id, targetId)}
          />
        ) : items.length === 0 ? (
          <p className="rounded-xl border border-dashed border-white/10 bg-slate-900/30 p-6 text-center text-sm text-slate-500">
            אין לך תרופות כרגע.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {items.map((view) => (
              <button
                key={view.item.id}
                type="button"
                disabled={pending}
                onClick={() => setPickingItemId(view.item.id)}
                className="flex flex-col items-center gap-1.5 rounded-xl border border-white/10 bg-slate-900/60 p-3 text-center transition-colors hover:border-indigo-400/40 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <div className="relative">
                  <SpriteImage
                    src={view.item.imageUrl}
                    alt={view.item.name}
                    className="h-14 w-14 object-contain"
                    fallbackClassName="flex h-14 w-14 items-center justify-center rounded-lg border border-dashed border-white/20 bg-slate-800/60 text-slate-500"
                  />
                  <span dir="ltr" className="absolute -bottom-1 -right-1 rounded-full border border-slate-950 bg-indigo-500 px-1.5 py-0 text-[10px] font-bold text-white">
                    x{view.quantity}
                  </span>
                </div>
                <span className="text-sm font-semibold text-slate-100">{view.item.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface TargetPickerProps {
  item: InventoryItemView;
  participants: GymBattleViewData["participants"];
  pending: boolean;
  onBack: () => void;
  onSelect: (targetPlayerPokemonId: string) => void;
}

// Eligibility mirrors useGymBattleItem's own server-side rule exactly
// (medicineEffectKind==="revive" only targets a fainted participant, every
// other kind only a living one) — read off the same catalog field, never a
// hardcoded item check; the server re-validates regardless.
function TargetPicker({ item, participants, pending, onBack, onSelect }: TargetPickerProps) {
  const isRevive = item.item.medicineEffectKind === "revive";

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="mb-3 flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          disabled={pending}
          aria-label="חזרה"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-slate-800/80 text-slate-300 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          →
        </button>
        <SpriteImage
          src={item.item.imageUrl}
          alt={item.item.name}
          className="h-10 w-10 shrink-0 object-contain"
          fallbackClassName="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-dashed border-white/20 bg-slate-800/60 text-slate-500"
        />
        <p className="truncate text-sm font-semibold text-slate-100">{item.item.name}</p>
      </div>

      <p className="mb-2 text-xs text-slate-500">{isRevive ? "בחר פוקימון שהתעלף" : "בחר פוקימון לריפוי"}</p>

      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">
        {participants.map((pokemon) => {
          const eligible = isRevive ? pokemon.fainted : !pokemon.fainted;
          return (
            <button
              key={pokemon.id}
              type="button"
              disabled={pending || !eligible}
              onClick={() => onSelect(pokemon.id)}
              className="flex items-center gap-3 rounded-lg border border-white/10 bg-slate-800/60 p-2 text-right transition-colors enabled:hover:bg-slate-700/60 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <SpriteImage src={pokemon.frontSpriteUrl} alt={pokemon.name} className="h-12 w-12 object-contain" />
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
    </div>
  );
}
