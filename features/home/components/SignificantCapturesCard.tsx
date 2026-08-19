import { PanelCard } from "./PanelCard";
import { SpriteImage } from "@/components/media/SpriteImage";
import type { SignificantCaptureView, SignificantCapturesToday } from "@/features/home/services/significant-captures.service";

interface SignificantCapturesCardProps {
  data: SignificantCapturesToday;
}

const VERY_RARE_EMPTY_LABEL = "עדיין לא נתפס היום פוקימון נדיר מאוד";
const LEGENDARY_EMPTY_LABEL = "עדיין לא נתפס היום פוקימון אגדי";

// HOME — SIGNIFICANT CAPTURES TODAY. One shared PanelCard shell split into
// two mini-cards. Rendered under the ambient dir="rtl" HomeContent already
// sets — under RTL, the FIRST grid child lands in the rightmost column, so
// veryRare (required: right side) is listed before legendary (left side)
// below, never reordered with an explicit `order-*` class.
export function SignificantCapturesCard({ data }: SignificantCapturesCardProps) {
  return (
    <PanelCard title="תפיסות משמעותיות היום:">
      <div className="grid grid-cols-2 gap-3">
        <CaptureHalf capture={data.veryRare} emptyLabel={VERY_RARE_EMPTY_LABEL} />
        <CaptureHalf capture={data.legendary} emptyLabel={LEGENDARY_EMPTY_LABEL} />
      </div>
    </PanelCard>
  );
}

function CaptureHalf({ capture, emptyLabel }: { capture: SignificantCaptureView | null; emptyLabel: string }) {
  if (!capture) {
    return (
      <div className="flex min-h-[168px] flex-col items-center justify-center rounded-xl bg-slate-950/40 p-3 text-center">
        <p className="text-xs text-slate-500">{emptyLabel}</p>
      </div>
    );
  }

  // ONLY the four requested fields — no level/stats/type/rarity/description/
  // IV-EV, per this ticket's explicit "Do NOT display" list.
  return (
    <div className="flex flex-col items-center gap-1 rounded-xl bg-slate-950/40 p-3 text-center">
      <SpriteImage
        src={capture.spriteUrl}
        alt={capture.speciesName}
        className="h-20 w-20 object-contain sm:h-24 sm:w-24"
        fallbackClassName="flex h-20 w-20 items-center justify-center rounded-lg border border-dashed border-white/20 bg-slate-800/60 text-slate-500 sm:h-24 sm:w-24"
      />
      <p className="text-sm font-semibold text-slate-100">{capture.speciesName}</p>
      <p className="text-xs text-slate-400">{capture.playerDisplayName}</p>
      <p className="text-[11px] text-slate-500">{capture.capturedAtLabel}</p>
    </div>
  );
}
