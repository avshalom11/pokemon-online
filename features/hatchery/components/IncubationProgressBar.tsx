import { ProgressBar } from "@/components/battle/ProgressBar";

interface IncubationProgressBarProps {
  battleProgress: number;
  requiredBattleTarget: number;
}

// Same shared visual primitive/label-above-bar convention
// components/battle/ExperienceBar.tsx already establishes for the header's
// XP bar — reused here rather than a second bar implementation. Every
// number shown is read as-is from the persisted PlayerEggIncubation row
// (EGGS PHASE 3); nothing here recomputes a target or a percentage rule of
// its own beyond the plain division needed to draw the bar's width.
export function IncubationProgressBar({ battleProgress, requiredBattleTarget }: IncubationProgressBarProps) {
  const percent = requiredBattleTarget > 0 ? Math.max(0, Math.min(100, (battleProgress / requiredBattleTarget) * 100)) : 0;
  const remaining = Math.max(0, requiredBattleTarget - battleProgress);

  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-[11px] font-semibold text-slate-400">
        <span>התקדמות דגירה</span>
        <span dir="ltr">
          {battleProgress} / {requiredBattleTarget} קרבות
        </span>
      </div>
      <ProgressBar percent={percent} height="md" fillStyle={{ background: "linear-gradient(90deg, #34d399, #34d399cc)" }} />
      <div className="mt-1 text-[11px] text-slate-500">
        {remaining > 0 ? `${remaining} קרבות נותרו` : "מוכנה לבקיעה"}
      </div>
    </div>
  );
}
