import { ProgressBar } from "./ProgressBar";

interface ExperienceBarProps {
  current: number;
  max: number;
  accent: string;
}

export function ExperienceBar({ current, max, accent }: ExperienceBarProps) {
  const percent = max > 0 ? Math.max(0, Math.min(100, (current / max) * 100)) : 0;

  return (
    <div>
      <div className="mb-1 text-[10px] font-semibold tracking-wide text-slate-400 uppercase">
        EXP
      </div>
      <ProgressBar
        percent={percent}
        height="sm"
        fillStyle={{ background: `linear-gradient(90deg, ${accent}, ${accent}cc)` }}
      />
    </div>
  );
}
