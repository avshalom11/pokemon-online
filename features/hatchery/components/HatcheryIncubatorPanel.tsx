import { IncubatorCard } from "@/features/hatchery/components/IncubatorCard";
import type { HatcheryIncubatorView } from "@/features/hatchery/services/hatchery-view.service";

interface HatcheryIncubatorPanelProps {
  incubators: HatcheryIncubatorView[];
  isPending: boolean;
  onHatch: (incubationId: string) => void;
}

// INCUBATOR EXPANSION — every incubator instance the player owns, each
// rendered as its own independent IncubatorCard (empty/incubating/ready is
// tracked per instance, never assumed to be "the one incubator" the way
// Phase 1's single-incubator panel could). ensureStarterIncubator
// (hatchery-view.service.ts) guarantees this list is never empty.
export function HatcheryIncubatorPanel({ incubators, isPending, onHatch }: HatcheryIncubatorPanelProps) {
  return (
    <div>
      <h2 className="mb-3 text-sm font-semibold tracking-wide text-slate-400 uppercase">האינקובטורים שלי</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {incubators.map((incubator) => (
          <IncubatorCard key={incubator.id} incubator={incubator} isPending={isPending} onHatch={onHatch} />
        ))}
      </div>
    </div>
  );
}
