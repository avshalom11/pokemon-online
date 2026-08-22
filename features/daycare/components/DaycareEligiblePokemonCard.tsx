import { SpriteImage } from "@/components/media/SpriteImage";
import { DAYCARE_DEPOSIT_FEE } from "@/features/daycare/config/daycare.config";
import type { DaycareEligiblePokemonView } from "@/features/daycare/types";

interface DaycareEligiblePokemonCardProps {
  pokemon: DaycareEligiblePokemonView;
  disabled: boolean;
  onDeposit: (playerPokemonId: string) => void;
}

// SECTION 12/7 — one entry in the eligible-Pokémon deposit selector:
// sprite, level, this Pokémon's OWN current timing bracket/price for its
// next level (both derived server-side, never recomputed here), and a
// direct deposit button — no separate confirmation step, matching this
// feature's own minimal scope (Hatchery's own two-step egg-then-incubator
// picker exists only because IT has a real second choice to make;
// depositing has none). PHASE 2 — the button label itself now spells out
// the flat DAYCARE_DEPOSIT_FEE, so it's obvious depositing costs Money
// immediately, separate from whatever this Pokémon later earns in debt.
export function DaycareEligiblePokemonCard({ pokemon, disabled, onDeposit }: DaycareEligiblePokemonCardProps) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-xl border border-white/10 bg-slate-900/60 p-3 text-center">
      <SpriteImage
        src={pokemon.spriteUrl}
        alt={pokemon.displayName}
        className="h-14 w-14 object-contain"
        fallbackClassName="flex h-14 w-14 items-center justify-center rounded-lg border border-dashed border-white/20 bg-slate-800/60 text-slate-500"
      />
      <span className="truncate text-xs font-semibold text-slate-100">{pokemon.displayName}</span>
      <span className="text-[11px] text-slate-400">רמה {pokemon.level}</span>
      <span className="text-[10px] text-slate-500">רמה הבאה: {pokemon.hoursForNextLevel} שעות</span>
      <span className="text-[10px] text-slate-500">מחיר לרמה הבאה: {pokemon.costForNextLevel.toLocaleString("he-IL")} כסף</span>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onDeposit(pokemon.id)}
        className="mt-1 w-full rounded-lg bg-indigo-500/90 px-2 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
      >
        הפקד (דמי כניסה: {DAYCARE_DEPOSIT_FEE.toLocaleString("he-IL")} כסף)
      </button>
    </div>
  );
}
