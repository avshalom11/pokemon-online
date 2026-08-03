interface RegionCardProps {
  englishName: string;
  cardImageSrc: string;
  isActive: boolean;
  isPending: boolean;
  onSelect: () => void;
}

// One region tile on the World page — same visual language as
// features/home/components/NavigationCard.tsx (rounded-2xl bordered tile),
// with an "active" state instead of that card's "coming soon" state, since
// every region here is already selectable. The card image always comes from
// the Region Registry (RegionDefinition.cardImageSrc) — this component
// never hardcodes an image path itself.
export function RegionCard({ englishName, cardImageSrc, isActive, isPending, onSelect }: RegionCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={isPending}
      aria-pressed={isActive}
      className={`group relative flex h-28 flex-col items-center justify-center gap-2 overflow-hidden rounded-2xl border p-3 text-center transition-all disabled:cursor-wait disabled:opacity-70 sm:h-36 ${
        isActive
          ? "border-indigo-400/60 bg-indigo-500/10 text-slate-100 shadow-[0_0_20px_rgba(99,102,241,0.3)]"
          : "border-white/10 bg-slate-900/60 text-slate-100 hover:-translate-y-0.5 hover:border-indigo-400/50 hover:bg-slate-900/80 hover:shadow-[0_0_20px_rgba(99,102,241,0.25)]"
      }`}
    >
      <img
        src={cardImageSrc}
        alt=""
        aria-hidden="true"
        className="h-12 w-full rounded-lg object-cover sm:h-16"
      />
      <span dir="ltr" className="text-sm font-semibold">
        {englishName}
      </span>

      {isActive ? (
        <span className="absolute top-2 rounded-full bg-indigo-500/90 px-2 py-0.5 text-[10px] font-semibold text-white">
          פעיל
        </span>
      ) : null}
    </button>
  );
}
