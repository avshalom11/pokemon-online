import type { CSSProperties } from "react";

interface ProgressBarProps {
  /** 0-100, already clamped by the caller. */
  percent: number;
  fillStyle: CSSProperties;
  height?: "sm" | "md";
}

// Shared visual primitive behind HealthBar and ExperienceBar so the two
// stay in sync (dark inset track, smooth width transition) without
// duplicating that styling in both files.
export function ProgressBar({ percent, fillStyle, height = "md" }: ProgressBarProps) {
  const trackHeightClass = height === "sm" ? "h-1.5" : "h-2";

  return (
    <div
      className={`w-full overflow-hidden rounded-full bg-black/40 ${trackHeightClass}`}
      style={{ boxShadow: "inset 0 1px 2px rgba(0,0,0,0.5)" }}
    >
      <div
        className="h-full rounded-full transition-[width] duration-300 ease-out"
        style={{ width: `${percent}%`, ...fillStyle }}
      />
    </div>
  );
}
