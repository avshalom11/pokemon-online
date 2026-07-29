import { getRarityPresentation } from "@/lib/battle/battleRarityPresentation";
import type { PokemonRarity } from "@/shared/types/pokemon";

interface RarityWarningBannerProps {
  rarity: PokemonRarity;
}

// Renders nothing for common/rare (RarityPresentation.warning is only set
// for very-rare/legendary) — the caller never needs its own rarity branch,
// it can render this unconditionally for every encounter.
export function RarityWarningBanner({ rarity }: RarityWarningBannerProps) {
  const { warning } = getRarityPresentation(rarity);

  if (!warning) {
    return null;
  }

  return (
    <div
      role="alert"
      className={`w-full max-w-xl rounded-xl px-4 py-3 text-center backdrop-blur-sm sm:max-w-2xl sm:px-6 sm:py-4 ${warning.className}`}
    >
      <p className="font-fantasy text-sm font-bold tracking-wide sm:text-base">{warning.title}</p>
      <p className="mt-1 text-xs opacity-90 sm:text-sm">{warning.message}</p>
    </div>
  );
}
