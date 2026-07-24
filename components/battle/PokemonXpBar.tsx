import { ProgressBar } from "./ProgressBar";
import { getPokemonLevelProgress } from "@/features/pokemon-progression/pokemon-progression-calculations";

interface PokemonXpBarProps {
  // Total lifetime XP — the single value this needs. Progress-within-level,
  // the next-level requirement, the fill percent, and the max-level state
  // are all derived here via the same centralized pure function every other
  // Pokémon-progression consumer uses (features/pokemon-progression/
  // pokemon-progression-calculations.ts) — never recomputed or duplicated.
  experience: number;
}

// One reusable Pokémon-XP bar, used directly below HealthBar in every
// location that shows an owned Pokémon's HP: the battle HUD (active
// Pokémon only — see BattleHUD), Home's party slots, and My Pokémon's
// collection cards. Same ProgressBar primitive as HealthBar/ExperienceBar,
// same "label row + track" shape as HealthBar specifically, so the two
// read as a matched pair wherever they're stacked.
export function PokemonXpBar({ experience }: PokemonXpBarProps) {
  const progress = getPokemonLevelProgress(experience);

  if (progress.isMaxLevel) {
    return (
      <div>
        <div className="mb-1 flex items-center justify-between text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
          <span>XP</span>
          <span className="text-amber-300">MAX LEVEL</span>
        </div>
        <ProgressBar percent={100} fillStyle={{ background: "linear-gradient(90deg, #fbbf24, #f59e0bcc)" }} />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
        <span>XP</span>
        {/* dir="ltr": same fix as HealthBar's own current/max text — without
            it, the RTL layout visually reorders this digit sequence. */}
        <span dir="ltr" className="normal-case text-slate-300">
          {progress.currentLevelXp.toLocaleString("he-IL")} / {progress.xpRequiredForNextLevel.toLocaleString("he-IL")} XP
        </span>
      </div>
      <ProgressBar
        percent={progress.progressPercent}
        fillStyle={{ background: "linear-gradient(90deg, #818cf8, #6366f1cc)" }}
      />
    </div>
  );
}
