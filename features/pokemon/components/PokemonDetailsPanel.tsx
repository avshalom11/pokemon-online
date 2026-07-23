import { useState, useTransition } from "react";

import { calculateBattleStats } from "@/engine/battle/stat-calculation";
import { HealthBar } from "@/components/battle/HealthBar";
import { SpriteImage } from "@/components/media/SpriteImage";
import { assignPartySlotAction, removePartySlotAction, swapPartySlotsAction } from "@/features/party/actions/party.actions";
import { formatDexNumber, getArtworkPath } from "@/features/pokemon/media/pokemon-media-paths";
import { MAX_ACTIVE_TEAM_SIZE } from "@/shared/types/player";
import { POKEMON_TYPE_LABELS } from "@/shared/types/pokemon-labels";
import type { OwnedPokemon } from "@/shared/types/player-pokemon";

interface PokemonDetailsPanelProps {
  pokemon: OwnedPokemon;
  trainerName: string;
  // Full party, only needed to find the first empty slot ("Add to party")
  // and whether the party is currently full — pokemon.partySlot already
  // tells us this specific Pokémon's own membership/leader status.
  party: OwnedPokemon[];
  onClose: () => void;
}

const STAT_LABELS: { key: keyof ReturnType<typeof calculateBattleStats>; label: string }[] = [
  { key: "attack", label: "התקפה" },
  { key: "defense", label: "הגנה" },
  { key: "specialAttack", label: "התקפה מיוחדת" },
  { key: "specialDefense", label: "הגנה מיוחדת" },
  { key: "speed", label: "מהירות" },
];

// Centered modal (not a browser popup) — reuses the same overlay pattern as
// ConfirmStarterDialog (fixed inset-0 + backdrop + centered card), scaled up
// into a scrollable glass panel for the much larger amount of content here.
export function PokemonDetailsPanel({ pokemon, trainerName, party, onClose }: PokemonDetailsPanelProps) {
  const displayName = pokemon.nickname ?? pokemon.species.name;
  const stats = calculateBattleStats(pokemon.species.baseStats, pokemon.level);

  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isInParty = pokemon.partySlot !== null;
  const isFirst = pokemon.partySlot === 1;
  const occupiedSlots = new Set(party.map((member) => member.partySlot));
  const firstEmptySlot = Array.from({ length: MAX_ACTIVE_TEAM_SIZE }, (_, index) => index + 1).find(
    (slot) => !occupiedSlots.has(slot)
  );

  function handleAdd() {
    if (firstEmptySlot === undefined) return;
    setErrorMessage(null);
    startTransition(async () => {
      const result = await assignPartySlotAction(pokemon.id, firstEmptySlot);
      if (result.status !== "ok") setErrorMessage("לא ניתן היה להוסיף את הפוקימון לצוות.");
    });
  }

  function handleRemove() {
    setErrorMessage(null);
    startTransition(async () => {
      const result = await removePartySlotAction(pokemon.id);
      if (result.status === "would-leave-no-usable") {
        setErrorMessage("לא ניתן להסיר — זהו הפוקימון התקין האחרון בצוות.");
      } else if (result.status !== "ok") {
        setErrorMessage("לא ניתן היה להסיר את הפוקימון מהצוות.");
      }
    });
  }

  function handleMakeLeader() {
    if (pokemon.partySlot === null) return;
    setErrorMessage(null);
    startTransition(async () => {
      const result = await swapPartySlotsAction(pokemon.partySlot!, 1);
      if (result.status !== "ok") setErrorMessage("לא ניתן היה להפוך את הפוקימון למוביל.");
    });
  }

  return (
    <div
      dir="rtl"
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        className="relative max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-white/10 bg-slate-900/95 shadow-[0_0_40px_rgba(99,102,241,0.25)]"
      >
        <div
          className="pointer-events-none absolute inset-0 rounded-2xl"
          style={{
            background: "radial-gradient(ellipse 70% 40% at 50% 0%, rgba(129,90,238,0.18), transparent 60%)",
          }}
        />

        <div className="relative p-5 sm:p-7">
          <button
            type="button"
            onClick={onClose}
            aria-label="סגור"
            className="absolute left-4 top-4 flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-slate-800/80 text-slate-300 hover:text-white"
          >
            ✕
          </button>

          <div className="flex flex-col items-center gap-3 text-center">
            <SpriteImage
              src={getArtworkPath(pokemon.species.dexNumber)}
              alt={displayName}
              className="h-40 w-40 object-contain drop-shadow-[0_0_20px_rgba(99,102,241,0.35)]"
              fallbackClassName="flex h-40 w-40 items-center justify-center rounded-xl border border-dashed border-white/20 bg-slate-800/60 text-slate-500"
            />

            <div>
              <p className="text-xs font-medium text-slate-500">{`#${formatDexNumber(pokemon.species.dexNumber)}`}</p>
              <h2 className="text-2xl font-bold text-slate-100">{displayName}</h2>
            </div>

            <div className="flex flex-wrap justify-center gap-2">
              {pokemon.species.types.map((type) => (
                <span key={type} className="rounded-full bg-slate-800/80 px-3 py-1 text-xs font-medium text-slate-200">
                  {POKEMON_TYPE_LABELS[type]}
                </span>
              ))}
              {pokemon.isStarter ? (
                <span className="rounded-full bg-amber-400/90 px-3 py-1 text-xs font-bold text-slate-950">
                  פוקימון מקורי
                </span>
              ) : null}
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <InfoTile label="רמה" value={pokemon.level.toString()} />
            <InfoTile label="ניסיון" value={pokemon.experience.toLocaleString("he-IL")} />
            <InfoTile label="מאמן מקורי" value={trainerName} />
            <InfoTile label="טבע" value="טרם הוגדר" />
            <InfoTile label="יכולת" value="טרם הוגדרה" />
            <InfoTile label="פריט מוחזק" value="אין" />
            <InfoTile
              label="תאריך תפיסה"
              value={new Date(pokemon.caughtAt).toLocaleDateString("he-IL")}
            />
          </div>

          <div className="mt-6">
            <HealthBar current={pokemon.currentHp} max={pokemon.maxHp} />
          </div>

          <div className="mt-4">
            <h3 className="mb-2 text-xs font-semibold tracking-wide text-slate-400 uppercase">סטטיסטיקות</h3>
            <div className="space-y-2">
              {STAT_LABELS.map(({ key, label }) => (
                <StatBar key={key} label={label} value={stats[key]} />
              ))}
            </div>
          </div>

          <div className="mt-7 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {isInParty ? (
              <ActionButton label="הסר מהצוות" disabled={isPending} onClick={handleRemove} />
            ) : (
              <ActionButton
                label="הוסף לצוות"
                disabled={isPending || firstEmptySlot === undefined}
                title={firstEmptySlot === undefined ? "הצוות מלא — הסר פוקימון אחר תחילה" : undefined}
                onClick={handleAdd}
              />
            )}
            <ActionButton
              label={isFirst ? "כבר מוביל הצוות" : "הפוך למוביל הצוות"}
              disabled={isPending || !isInParty || isFirst}
              onClick={handleMakeLeader}
            />
            <ActionButton label="סגור" onClick={onClose} />
          </div>

          {errorMessage ? <p className="mt-2 text-center text-[11px] text-rose-400">{errorMessage}</p> : null}
          {isInParty && !errorMessage ? (
            <p className="mt-2 text-center text-[11px] text-slate-500">
              {isFirst ? "מוביל הצוות — מתחיל כל קרב." : "כרגע חלק מהצוות הפעיל."}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-950/40 p-2.5 text-center">
      {/* dir="ltr": several of these values are digit/punctuation sequences
          (dates, numbers) that the bidi algorithm would otherwise visually
          reorder inside this RTL panel — same fix as HealthBar's "current /
          max" text (components/battle/HealthBar.tsx). Harmless for the
          plain-Hebrew-text values (trainer name, placeholders) since
          text-center above is unaffected by dir. */}
      <dd dir="ltr" className="truncate text-sm font-semibold text-slate-100">
        {value}
      </dd>
      <dt className="text-[11px] text-slate-500">{label}</dt>
    </div>
  );
}

function StatBar({ label, value }: { label: string; value: number }) {
  // Base stats in this catalog top out well under 100 (see
  // data/pokemon/pokemon-data.ts) — 150 gives every stat comfortable
  // headroom without needing per-stat max values.
  const percent = Math.min(100, (value / 150) * 100);

  return (
    <div className="flex items-center gap-3">
      <span className="w-28 shrink-0 text-xs text-slate-400">{label}</span>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-black/40">
        <div className="h-full rounded-full bg-indigo-400" style={{ width: `${percent}%` }} />
      </div>
      <span dir="ltr" className="w-8 shrink-0 text-right text-xs font-semibold text-slate-300">
        {value}
      </span>
    </div>
  );
}

function ActionButton({
  label,
  disabled,
  title,
  onClick,
}: {
  label: string;
  disabled?: boolean;
  title?: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      title={title}
      onClick={onClick}
      className="rounded-lg border border-white/10 bg-slate-800/70 px-3 py-2 text-xs font-semibold text-slate-200 transition-colors enabled:hover:border-indigo-400/50 enabled:hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
    >
      {label}
    </button>
  );
}
