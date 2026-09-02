import { ProgressBar } from "@/components/battle/ProgressBar";
import { PanelCard } from "./PanelCard";

// No achievement system/model exists yet — an honest empty state rather
// than fabricated entries. The 0% bar and copy are ready to be swapped for
// real data the moment an achievements engine module exists.
export function AchievementsPanel() {
  return (
    <PanelCard title="הישגים">
      <p className="mb-3 text-sm text-slate-200">עוד לא נפתחו הישגים. התחל לשחק כדי לצבור את הראשון!</p>
      <ProgressBar percent={0} fillStyle={{ backgroundColor: "#818cf8" }} height="sm" />
    </PanelCard>
  );
}
