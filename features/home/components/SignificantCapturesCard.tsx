import { PanelCard } from "./PanelCard";
import { SpriteImage } from "@/components/media/SpriteImage";
import { PlayerNameLink } from "@/components/social/PlayerNameLink";
import type { SignificantCaptureView, SignificantCaptures } from "@/features/home/services/significant-captures.service";

interface SignificantCapturesCardProps {
  data: SignificantCaptures;
}

const VERY_RARE_EMPTY_LABEL = "עדיין לא נתפס היום פוקימון נדיר מאוד";
const LEGENDARY_EMPTY_LABEL = "עדיין לא נתפס היום פוקימון אגדי";

// HOME — SIGNIFICANT CAPTURES. One shared PanelCard shell split into two
// mini-cards. Rendered under the ambient dir="rtl" HomeContent already
// sets — under RTL, the FIRST grid child lands in the rightmost column, so
// veryRare (required: right side) is listed before legendary (left side)
// below, never reordered with an explicit `order-*` class.
export function SignificantCapturesCard({ data }: SignificantCapturesCardProps) {
  return (
    <PanelCard title="תפיסות משמעותיות אחרונות:">
      <div className="grid grid-cols-2 gap-3">
        <CaptureHalf capture={data.veryRare} emptyLabel={VERY_RARE_EMPTY_LABEL} glowClassName={VERY_RARE_GLOW_CLASSNAME} />
        <CaptureHalf capture={data.legendary} emptyLabel={LEGENDARY_EMPTY_LABEL} glowClassName={LEGENDARY_GLOW_CLASSNAME} />
      </div>
    </PanelCard>
  );
}

// Purely cosmetic border + glow for each mini-card's own slot — same
// red/amber palette RARITY_PRESENTATION's own very-rare/legendary warning
// styling already uses (lib/battle/battleRarityPresentation.ts), scaled
// down for this card's much smaller footprint. Never touches background,
// layout, or content — additive border/shadow classes only.
const VERY_RARE_GLOW_CLASSNAME = "border-2 border-red-500/70 shadow-[0_0_14px_1px_rgba(220,38,38,0.55)]";
const LEGENDARY_GLOW_CLASSNAME = "border-2 border-amber-300/80 shadow-[0_0_14px_1px_rgba(251,191,36,0.55)]";

function CaptureHalf({
  capture,
  emptyLabel,
  glowClassName,
}: {
  capture: SignificantCaptureView | null;
  emptyLabel: string;
  glowClassName: string;
}) {
  if (!capture) {
    return (
      <div className={`flex min-h-[168px] flex-col items-center justify-center rounded-xl bg-slate-950/40 p-3 text-center ${glowClassName}`}>
        <p className="text-xs text-slate-500">{emptyLabel}</p>
      </div>
    );
  }

  // ONLY the four requested fields — no level/stats/type/rarity/description/
  // IV-EV, per this ticket's explicit "Do NOT display" list.
  return (
    <div className={`flex flex-col items-center gap-1 rounded-xl bg-slate-950/40 p-3 text-center ${glowClassName}`}>
      <SpriteImage
        src={capture.spriteUrl}
        alt={capture.speciesName}
        className="h-20 w-20 object-contain sm:h-24 sm:w-24"
        fallbackClassName="flex h-20 w-20 items-center justify-center rounded-lg border border-dashed border-white/20 bg-slate-800/60 text-slate-500 sm:h-24 sm:w-24"
      />
      <p className="text-sm font-semibold text-slate-100">{capture.speciesName}</p>
      <PlayerNameLink username={capture.playerUsername} displayName={capture.playerDisplayName} className="text-xs text-slate-400" />
      <p className="text-[11px] text-slate-500">{capture.capturedAtLabel}</p>
    </div>
  );
}
