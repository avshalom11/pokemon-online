import { ProgressBar } from "./ProgressBar";

interface HealthBarProps {
  current: number;
  max: number;
}

// Smooth green -> red hue interpolation, deliberately not Pokémon's 3-step
// green/yellow/red threshold, for a more modern, original feel.
function getHealthColor(percent: number): string {
  const hue = Math.max(0, Math.min(140, (percent / 100) * 140));
  return `hsl(${hue}, 70%, 50%)`;
}

export function HealthBar({ current, max }: HealthBarProps) {
  const percent = max > 0 ? Math.max(0, Math.min(100, (current / max) * 100)) : 0;
  const color = getHealthColor(percent);

  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
        <span>HP</span>
        <span dir="ltr" className="text-slate-300">
          {current} / {max}
        </span>
      </div>
      <ProgressBar
        percent={percent}
        fillStyle={{ backgroundColor: color, boxShadow: `0 0 6px ${color}aa` }}
      />
    </div>
  );
}
