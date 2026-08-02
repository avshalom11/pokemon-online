import { getLevelEvolution, getStoneEvolutions } from "@/data/pokemon/pokemon-evolutions";
import { SpriteImage } from "@/components/media/SpriteImage";
import { formatDexNumber, getFrontSpritePath } from "@/features/pokemon/media/pokemon-media-paths";
import { getSpeciesById } from "@/features/pokemon/services/species-catalog";
import { getShopItemById } from "@/features/shop/services/shop-catalog.service";
import { POKEMON_RARITY_LABELS, POKEMON_TYPE_LABELS } from "@/shared/types/pokemon-labels";
import type { PokemonBaseStats } from "@/shared/types/pokemon";
import type { PokedexEntryView } from "../types/pokedex.types";

interface PokedexDetailPanelProps {
  entry: PokedexEntryView;
  onClose: () => void;
}

const BASE_STAT_LABELS: { key: keyof PokemonBaseStats; label: string }[] = [
  { key: "health", label: "חיים" },
  { key: "attack", label: "התקפה" },
  { key: "defense", label: "הגנה" },
  { key: "specialAttack", label: "התקפה מיוחדת" },
  { key: "specialDefense", label: "הגנה מיוחדת" },
  { key: "speed", label: "מהירות" },
];

// Read-only modal — same centered-overlay/glass-panel idiom
// PokemonDetailsPanel already established, but with no actions of its own
// (the Pokédex never mutates anything; every field here is canonical
// species data plus this player's own already-loaded status). Only ever
// rendered for a "seen" or "caught" entry — see PokedexCard, which makes an
// "unseen" card non-interactive — so there is no separate hidden/obscured
// branch to handle in here.
export function PokedexDetailPanel({ entry, onClose }: PokedexDetailPanelProps) {
  const { species, status } = entry;

  // Forward evolution only (never "evolves from") — canonical data read
  // straight from data/pokemon/pokemon-evolutions.ts, the same single
  // source of truth the encounter/evolution engines use; never
  // hardcoded/duplicated here. A species with neither is simply omitted
  // from the section below (e.g. a final evolution, or one with no
  // evolution relationship at all).
  const levelEvolution = getLevelEvolution(species.id);
  const stoneEvolutions = getStoneEvolutions(species.id);
  const hasEvolutionInfo = levelEvolution !== undefined || stoneEvolutions.length > 0;

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
              src={getFrontSpritePath(species.dexNumber)}
              alt={species.name}
              className="h-40 w-40 object-contain drop-shadow-[0_0_20px_rgba(99,102,241,0.35)]"
              fallbackClassName="flex h-40 w-40 items-center justify-center rounded-xl border border-dashed border-white/20 bg-slate-800/60 text-slate-500"
            />

            <div>
              <p dir="ltr" className="text-xs font-medium text-slate-500">{`#${formatDexNumber(species.dexNumber)}`}</p>
              <h2 className="text-2xl font-bold text-slate-100">{species.name}</h2>
            </div>

            <div className="flex flex-wrap justify-center gap-2">
              {species.types.map((type) => (
                <span key={type} className="rounded-full bg-slate-800/80 px-3 py-1 text-xs font-medium text-slate-200">
                  {POKEMON_TYPE_LABELS[type]}
                </span>
              ))}
              <span className="rounded-full bg-slate-800/80 px-3 py-1 text-xs font-medium text-slate-200">
                {POKEMON_RARITY_LABELS[species.rarity]}
              </span>
              <span
                className={`rounded-full px-3 py-1 text-xs font-bold ${
                  status === "caught" ? "bg-emerald-400/90 text-slate-950" : "bg-slate-700/90 text-slate-200"
                }`}
              >
                {status === "caught" ? "בבעלותך" : "נצפה בטבע"}
              </span>
            </div>
          </div>

          <p className="mt-5 text-center text-sm leading-relaxed text-slate-300">{species.description}</p>

          <div className="mt-6">
            <h3 className="mb-2 text-xs font-semibold tracking-wide text-slate-400 uppercase">סטטיסטיקות בסיס</h3>
            <div className="space-y-2">
              {BASE_STAT_LABELS.map(({ key, label }) => (
                <StatBar key={key} label={label} value={species.baseStats[key]} />
              ))}
            </div>
          </div>

          {hasEvolutionInfo ? (
            <div className="mt-6">
              <h3 className="mb-2 text-xs font-semibold tracking-wide text-slate-400 uppercase">התפתחות</h3>
              <ul className="space-y-1.5 text-sm text-slate-300">
                {levelEvolution ? (
                  <EvolutionLine
                    targetSpeciesId={levelEvolution.evolvesToSpeciesId}
                    detail={`ברמה ${levelEvolution.requiredLevel}`}
                  />
                ) : null}
                {stoneEvolutions.map((evolution) => (
                  <EvolutionLine
                    key={evolution.stoneItemId}
                    targetSpeciesId={evolution.evolvesToSpeciesId}
                    detail={`באמצעות ${getShopItemById(evolution.stoneItemId)?.name ?? evolution.stoneItemId}`}
                  />
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function EvolutionLine({ targetSpeciesId, detail }: { targetSpeciesId: string; detail: string }) {
  const targetName = getSpeciesById(targetSpeciesId)?.name ?? targetSpeciesId;
  return (
    <li className="flex items-center justify-center gap-1.5">
      <span className="font-semibold text-slate-100">{targetName}</span>
      <span className="text-slate-500">—</span>
      <span>{detail}</span>
    </li>
  );
}

function StatBar({ label, value }: { label: string; value: number }) {
  // Same 150 headroom StatBar in PokemonDetailsPanel already uses — base
  // stats in this catalog top out well under that (data/pokemon/pokemon-data.ts).
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
