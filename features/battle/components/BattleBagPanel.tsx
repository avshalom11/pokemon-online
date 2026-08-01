"use client";

import { useState } from "react";

import { SpriteImage } from "@/components/media/SpriteImage";
import { PartySlot } from "@/features/pokemon/components/PartySlot";
import type { InventoryItemView } from "@/features/inventory/types/inventory.types";
import type { OwnedPokemon } from "@/shared/types/player-pokemon";

// A completed medicine use, shown by MedicineResultScreen below instead of
// the party-selection picker until the player explicitly confirms — see
// BattleContent's own medicineResult state for the full rationale. Only
// carries what isn't already available elsewhere: `previousHp` (the one
// thing needed to display "restored X HP" that the live `party` list no
// longer has once healed) and which item was used. The Pokémon's current
// (already-healed) HP/HP-bar/name/sprite are always read live off the
// `party` prop passed to this panel — never duplicated into this type —
// so there is exactly one source of truth for "what is this Pokémon's HP
// right now."
export interface MedicineResultView {
  itemName: string;
  itemImageUrl: string;
  pokemonId: string;
  previousHp: number;
}

interface BattleBagPanelProps {
  // Already live (server-fetched quantities minus everything consumed so
  // far this battle) and already filtered to owned (quantity > 0) Poké
  // Balls + Medicine only — see BattleContent's own liveInventoryItems.
  items: InventoryItemView[];
  selectedBallItemId: string | null;
  party: OwnedPokemon[];
  onSelectBall: (itemId: string) => void;
  onSelectMedicineTarget: (itemId: string, playerPokemonId: string) => void;
  onClose: () => void;
  // True while a medicine request is in flight, and for as long as
  // medicineResult below is showing — locks every interactive control in
  // this panel (tabs, close, back, item/target selection) other than the
  // result screen's own "חזור לקרב" button, so the player can neither
  // dismiss the panel nor fire a second request while a result is pending
  // confirmation. Never true for the Poké Ball flow, which has no server
  // round-trip to wait on.
  pending?: boolean;
  // Non-null the instant a medicine use's server response confirms success
  // — see BattleContent's own medicineResult state. Takes over this panel's
  // entire body (replacing whatever category/picker view was showing)
  // until the player clicks the result screen's confirm button.
  medicineResult: MedicineResultView | null;
  onConfirmMedicineResult: () => void;
}

type Category = "poke-balls" | "potions";

// The battle Bag — same full-panel overlay idiom as PartySelector (absolute
// inset-0, scoped to the battle panel). Two categories, Poké Balls and
// Medicine, both sourced entirely from the live Bag inventory passed in —
// this component never fetches or duplicates catalog/inventory data itself.
// Selecting a ball closes the Bag immediately (BattleContent sets it as the
// active ball); selecting a medicine item instead opens an inline target
// picker within this same panel, closing only once a valid target is
// chosen — cancelling back out of the target picker (or the whole panel)
// never calls either callback, so nothing is ever consumed.
export function BattleBagPanel({
  items,
  selectedBallItemId,
  party,
  onSelectBall,
  onSelectMedicineTarget,
  onClose,
  pending = false,
  medicineResult,
  onConfirmMedicineResult,
}: BattleBagPanelProps) {
  const [category, setCategory] = useState<Category>("poke-balls");
  const [pickingMedicineItemId, setPickingMedicineItemId] = useState<string | null>(null);

  const categoryItems = items.filter((view) => view.item.categoryId === category);
  const pickingItem = pickingMedicineItemId ? items.find((view) => view.item.id === pickingMedicineItemId) : undefined;

  function handleTabSelect(next: Category) {
    setCategory(next);
    setPickingMedicineItemId(null);
  }

  return (
    <div
      dir="rtl"
      role="dialog"
      aria-modal="true"
      className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
    >
      <div className="relative flex max-h-full w-full max-w-2xl flex-col rounded-2xl border border-white/10 bg-slate-900/95 p-4 shadow-2xl sm:p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
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

        {medicineResult ? (
          <MedicineResultScreen result={medicineResult} party={party} onConfirm={onConfirmMedicineResult} />
        ) : pickingItem ? (
          <MedicineTargetPicker
            item={pickingItem}
            party={party}
            pending={pending}
            onBack={() => setPickingMedicineItemId(null)}
            onSelect={(playerPokemonId) => onSelectMedicineTarget(pickingItem.item.id, playerPokemonId)}
          />
        ) : (
          <>
            <div className="mb-3 flex gap-2">
              <TabButton
                label="פוכדורים"
                active={category === "poke-balls"}
                disabled={pending}
                onClick={() => handleTabSelect("poke-balls")}
              />
              <TabButton
                label="תרופות"
                active={category === "potions"}
                disabled={pending}
                onClick={() => handleTabSelect("potions")}
              />
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto">
              {categoryItems.length === 0 ? (
                <p className="rounded-xl border border-dashed border-white/10 bg-slate-900/30 p-6 text-center text-sm text-slate-500">
                  אין לך פריטים בקטגוריה זו כרגע.
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {categoryItems.map((view) => (
                    <BagItemCard
                      key={view.item.id}
                      view={view}
                      isSelected={category === "poke-balls" && view.item.id === selectedBallItemId}
                      disabled={pending}
                      onSelect={() =>
                        category === "poke-balls" ? onSelectBall(view.item.id) : setPickingMedicineItemId(view.item.id)
                      }
                    />
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function TabButton({
  label,
  active,
  disabled,
  onClick,
}: {
  label: string;
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={`rounded-lg border px-3 py-1.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
        active
          ? "border-indigo-400/70 bg-indigo-500/20 text-indigo-200"
          : "border-white/10 bg-slate-900/60 text-slate-300 hover:border-white/20 hover:bg-slate-800"
      }`}
    >
      {label}
    </button>
  );
}

function BagItemCard({
  view,
  isSelected,
  disabled,
  onSelect,
}: {
  view: InventoryItemView;
  isSelected: boolean;
  disabled?: boolean;
  onSelect: () => void;
}) {
  const { item, quantity } = view;

  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      aria-pressed={isSelected}
      className={`flex flex-col items-center gap-1.5 rounded-xl border p-3 text-center transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
        isSelected ? "border-indigo-400/70 bg-indigo-500/10" : "border-white/10 bg-slate-900/60 hover:border-indigo-400/40"
      }`}
    >
      <div className="relative">
        <SpriteImage
          src={item.imageUrl}
          alt={item.name}
          className="h-14 w-14 object-contain sm:h-16 sm:w-16"
          fallbackClassName="flex h-14 w-14 items-center justify-center rounded-lg border border-dashed border-white/20 bg-slate-800/60 text-slate-500 sm:h-16 sm:w-16"
        />
        <span
          dir="ltr"
          className="absolute -bottom-1 -right-1 rounded-full border border-slate-950 bg-indigo-500 px-1.5 py-0 text-[10px] font-bold text-white"
        >
          x{quantity}
        </span>
      </div>

      <span className="text-sm font-semibold text-slate-100">{item.name}</span>
      <span className="text-[11px] leading-snug text-slate-400">{item.description}</span>
    </button>
  );
}

interface MedicineTargetPickerProps {
  item: InventoryItemView;
  party: OwnedPokemon[];
  // Locks the back button and every party slot while a use is in flight or
  // its result is being revealed — see BattleBagPanelProps's own doc
  // comment. The picker still keeps rendering the live `party` HP normally
  // while pending; only interaction is blocked, never the visible values.
  pending?: boolean;
  onBack: () => void;
  onSelect: (playerPokemonId: string) => void;
}

// Inline step-2 view within the same Bag panel — never a second overlay.
// Eligibility mirrors use-medicine.service.ts's own fainted/non-fainted
// rule (server re-validates regardless): Revive items only enable fainted
// party members, every other medicine item only enables non-fainted ones.
// Read straight off the item's own canonical medicineEffectKind
// (features/shop/types/shop.types.ts) — never a hardcoded item id/name
// check, so a future Medicine item works correctly here with zero code
// change as long as its catalog entry sets the right kind.
function MedicineTargetPicker({ item, party, pending, onBack, onSelect }: MedicineTargetPickerProps) {
  const isRevive = item.item.medicineEffectKind === "revive";

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="mb-3 flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          disabled={pending}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-slate-800/80 text-slate-300 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="חזרה"
        >
          →
        </button>
        <SpriteImage
          src={item.item.imageUrl}
          alt={item.item.name}
          className="h-10 w-10 shrink-0 object-contain"
          fallbackClassName="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-dashed border-white/20 bg-slate-800/60 text-slate-500"
        />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-100">{item.item.name}</p>
          <p className="truncate text-[11px] text-slate-400">{item.item.description}</p>
        </div>
      </div>

      <p className="mb-2 text-xs text-slate-500">{isRevive ? "בחר פוקימון שהתעלף" : "בחר פוקימון לריפוי"}</p>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {party.map((pokemon) => {
            const isFainted = pokemon.currentHp <= 0;
            const eligible = isRevive ? isFainted : !isFainted;

            return (
              <PartySlot
                key={pokemon.id}
                pokemon={pokemon}
                isActive={false}
                // pending here only ever means "a use is already in
                // flight" (this picker is replaced by MedicineResultScreen
                // the instant a result exists — see this panel's own
                // render branch), so this just blocks firing a second
                // request before the first one's response lands.
                disabled={!eligible}
                onSelect={eligible && !pending ? () => onSelect(pokemon.id) : undefined}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

interface MedicineResultScreenProps {
  result: MedicineResultView;
  party: OwnedPokemon[];
  onConfirm: () => void;
}

// Replaces the target picker the instant a medicine use's server response
// confirms success — battle stays fully paused here (no timer, no
// automatic close) until the player explicitly clicks "חזור לקרב". The
// healed Pokémon's current HP/HP-bar (PartySlot -> HealthBar shows both the
// numeric value and the bar together) are read live off `party`, never off
// `result` — `party` is the same server-authoritative live list every
// other screen in this panel already uses, so this can never show a faked
// or stale number. "restored X HP" is the only value actually computed
// here, from the live current HP minus the pre-heal snapshot
// (result.previousHp) — clamped at 0 defensively (it can never legitimately
// be negative, since a heal only ever raises HP).
function MedicineResultScreen({ result, party, onConfirm }: MedicineResultScreenProps) {
  const pokemon = party.find((candidate) => candidate.id === result.pokemonId);
  if (!pokemon) return null;

  const restoredAmount = Math.max(0, pokemon.currentHp - result.previousHp);

  return (
    <div className="flex min-h-0 flex-1 flex-col items-center gap-4 overflow-y-auto py-2">
      <div className="flex w-full items-center gap-3 rounded-xl border border-emerald-400/20 bg-emerald-500/10 p-3">
        <SpriteImage
          src={result.itemImageUrl}
          alt={result.itemName}
          className="h-10 w-10 shrink-0 object-contain"
          fallbackClassName="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-dashed border-white/20 bg-slate-800/60 text-slate-500"
        />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-100">{result.itemName}</p>
          <p dir="rtl" className="text-xs font-semibold text-emerald-300">
            שוחזרו <span dir="ltr">{restoredAmount}</span> נקודות חיים
          </p>
        </div>
      </div>

      <div className="w-full max-w-xs">
        <PartySlot pokemon={pokemon} isActive={false} />
      </div>

      <button
        type="button"
        onClick={onConfirm}
        className="mt-1 rounded-lg bg-indigo-600 px-6 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-500"
      >
        חזור לקרב
      </button>
    </div>
  );
}
