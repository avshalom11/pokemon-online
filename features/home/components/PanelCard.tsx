import type { ReactNode } from "react";

interface PanelCardProps {
  title: string;
  children: ReactNode;
}

// Shared rounded-card shell for the three bottom info panels
// (Achievements/News/Statistics) so their framing stays identical without
// each panel duplicating the border/background/heading styles.
export function PanelCard({ title, children }: PanelCardProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4 sm:p-5">
      <h3 className="mb-3 text-sm font-semibold tracking-wide text-slate-300 uppercase">{title}</h3>
      {children}
    </div>
  );
}
