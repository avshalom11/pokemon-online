interface PokemonSpriteProps {
  role: "enemy" | "player";
  /** Real sprite art — later an animated GIF. Falls back to an original
   * placeholder silhouette when not provided, so this component is the
   * only thing that needs to change once real per-species art exists. */
  spriteUrl?: string;
  name?: string;
}

const PLACEHOLDER_TINT = "#2dd4bf";

// Reserves generous, responsive space for a future large animated sprite
// (GIF) rather than a small fixed-size placeholder — swapping in real art
// later only ever touches this file, never BattleScene.
export function PokemonSprite({ role, spriteUrl, name }: PokemonSpriteProps) {
  const isEnemy = role === "enemy";

  return (
    <div className={isEnemy ? "scale-[0.85]" : "scale-[1.15]"}>
      {/* Idle bob lives on its own wrapper so it never fights the scale
          transform above (both would otherwise overwrite the same CSS
          `transform` property). */}
      <div className="animate-battle-idle" style={{ animationDelay: isEnemy ? "0s" : "0.6s" }}>
        <div className="flex h-20 w-20 items-center justify-center sm:h-28 sm:w-28 md:h-36 md:w-36 lg:h-40 lg:w-40">
          {spriteUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- future animated GIF sprite, not a static optimizable asset
            <img
              src={spriteUrl}
              alt={name ?? role}
              className={`h-full w-full object-contain drop-shadow-2xl ${isEnemy ? "" : "-scale-x-100"}`}
            />
          ) : (
            <PlaceholderCreature flipped={!isEnemy} />
          )}
        </div>
      </div>

      <div className="mx-auto -mt-2 h-3 w-20 rounded-full bg-black/35 blur-sm sm:h-4 sm:w-28" />
    </div>
  );
}

function PlaceholderCreature({ flipped }: { flipped: boolean }) {
  return (
    <svg
      viewBox="0 0 120 120"
      className={`h-full w-full drop-shadow-2xl ${flipped ? "-scale-x-100" : ""}`}
      role="img"
      aria-label="creature placeholder sprite"
    >
      <circle cx="16" cy="34" r="9" fill={PLACEHOLDER_TINT} />
      <circle cx="104" cy="34" r="9" fill={PLACEHOLDER_TINT} />
      <path
        d="M60 20 C30 20 18 45 22 70 C25 92 40 102 60 102 C80 102 95 92 98 70 C102 45 90 20 60 20 Z"
        fill={PLACEHOLDER_TINT}
      />
      <circle cx="44" cy="58" r="5" fill="#1f2937" />
      <circle cx="76" cy="58" r="5" fill="#1f2937" />
      <path
        d="M48 76 Q60 84 72 76"
        stroke="#1f2937"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}
