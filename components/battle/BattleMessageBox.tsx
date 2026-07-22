import type { BattleTheme } from "@/shared/types/battle-theme";

interface BattleMessageBoxProps {
  theme: BattleTheme;
  message?: string;
}

export function BattleMessageBox({ theme, message }: BattleMessageBoxProps) {
  return (
    <div
      className="relative overflow-hidden rounded-lg border border-white/10 bg-slate-900/80 px-5 py-3 text-sm font-medium tracking-wide text-slate-100 shadow-xl backdrop-blur-md sm:text-base"
      style={{ boxShadow: "0 12px 30px -18px rgba(0,0,0,0.7)" }}
    >
      <div className="absolute inset-y-0 start-0 w-1" style={{ backgroundColor: theme.colors.panelAccent }} />
      {message ?? " "}
    </div>
  );
}
