import { SpriteImage } from "@/components/media/SpriteImage";
import { FLIP_PLAYER_SPRITE_HORIZONTALLY } from "@/lib/battle/battleLayout";

interface PokemonSpriteProps {
  role: "enemy" | "player";
  /** Real sprite art (front for the wild Pokémon, back for the player's).
   * Falls back to an original placeholder silhouette when not provided at
   * all, so this component is the only thing that needs to change once
   * every species has real art. */
  spriteUrl?: string;
  /** Tried once if `spriteUrl` fails to load — e.g. the player's front
   * sprite as a temporary stand-in while a species' back sprite hasn't
   * been added yet (Milestone 9). SpriteImage's own placeholder box is the
   * final fallback if both fail. */
  fallbackSpriteUrl?: string;
  name?: string;
  /** Brief shake + red-tint feedback (see app/globals.css's
   * battle-hit-flash) for "took a hit" moments — a successful attack
   * landing, or a failed capture attempt. Caller is responsible for
   * turning this back off after the animation plays (BattleContent does
   * this with a short timeout). */
  isHit?: boolean;
}

const PLACEHOLDER_TINT = "#2dd4bf";

// Reserves generous, responsive space for a large animated sprite (GIF)
// rather than a small fixed-size placeholder — swapping in real art later
// only ever touches this file, never BattleScene.
export function PokemonSprite({ role, spriteUrl, fallbackSpriteUrl, name, isHit }: PokemonSpriteProps) {
  const isEnemy = role === "enemy";

  // Flip only ever applies to the player — see FLIP_PLAYER_SPRITE_HORIZONTALLY's
  // doc comment (lib/battle/battleLayout.ts) for why. The wild Pokémon's
  // front sprite is never mirrored.
  const shouldFlip = !isEnemy && FLIP_PLAYER_SPRITE_HORIZONTALLY;

  return (
    // Scale values match lib/battle/battleLayout.ts's SPRITE_SCALE —
    // literal here because Tailwind can't resolve an interpolated class
    // name, kept numerically in sync with that file by hand (see its
    // comment). origin-bottom anchors the scale to this box's bottom edge
    // (where the ground shadow below sits) rather than its center, so
    // shrinking/growing the sprite never shifts its feet off the platform
    // point BattleScene's PlatformAnchor already placed this whole element
    // at — only the top of the sprite moves.
    <div className={`origin-bottom ${isEnemy ? "scale-[0.55]" : "scale-[0.73]"}`}>
      {/* Idle bob lives on its own wrapper so it never fights the scale
          transform above (both would otherwise overwrite the same CSS
          `transform` property). */}
      <div className="animate-battle-idle" style={{ animationDelay: isEnemy ? "0s" : "0.6s" }}>
        <div
          className={`flex h-20 w-20 items-center justify-center sm:h-28 sm:w-28 md:h-36 md:w-36 lg:h-40 lg:w-40 ${isHit ? "animate-battle-hit-flash" : ""}`}
        >
          {spriteUrl ? (
            <SpriteImage
              src={spriteUrl}
              fallbackSrc={fallbackSpriteUrl}
              alt={name ?? role}
              className={`h-full w-full object-contain drop-shadow-2xl ${shouldFlip ? "-scale-x-100" : ""}`}
              fallbackClassName="flex h-full w-full items-center justify-center rounded-lg border border-dashed border-white/20 bg-slate-800/60 text-slate-500"
            />
          ) : (
            <PlaceholderCreature flipped={shouldFlip} />
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
