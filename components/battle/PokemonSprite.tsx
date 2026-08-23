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
   * this with a short timeout). Also drives the small impact-burst overlay
   * below — both sides of a hit get the same brief flash + burst. */
  isHit?: boolean;
  /** Universal fast player-attack lunge (see app/globals.css's
   * battle-attack-lunge and features/battle/utils/battle-attack-effect.ts)
   * — only ever passed for role="player", played once per accepted attack. */
  isAttacking?: boolean;
  /** CAPTURE SHAKE ANIMATION — only ever passed for role="enemy", and only
   * by Field Battle (BattleContent.tsx); Gym/League never set this, so
   * they render exactly as before even though they share this component.
   * While set, the wild Pokémon's own sprite/placeholder is replaced
   * entirely by a rocking Poké Ball rendered at the same anchored
   * position — see app/globals.css's capture-ball-shake/capture-ball-success. */
  captureAnimationStage?: "shaking" | "success" | null;
  /** The exact ball image being thrown (InventoryItemView.item.imageUrl —
   * never a separate/duplicated path lookup) — required whenever
   * captureAnimationStage is set. */
  captureBallImageSrc?: string | null;
}

const PLACEHOLDER_TINT = "#2dd4bf";

// Reserves generous, responsive space for a large animated sprite (GIF)
// rather than a small fixed-size placeholder — swapping in real art later
// only ever touches this file, never BattleScene.
export function PokemonSprite({
  role,
  spriteUrl,
  fallbackSpriteUrl,
  name,
  isHit,
  isAttacking,
  captureAnimationStage,
  captureBallImageSrc,
}: PokemonSpriteProps) {
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
      {/* Lunge lives on its own outermost wrapper so it never fights the
          idle-bob (translateY) or hit-flash (translateX + filter) transforms
          nested below it — same "one transform type per wrapper" rule the
          idle-bob comment already established. */}
      <div className={isAttacking ? "animate-battle-attack-lunge" : ""}>
        {/* Idle bob lives on its own wrapper so it never fights the scale
            transform above (both would otherwise overwrite the same CSS
            `transform` property). */}
        <div className="animate-battle-idle" style={{ animationDelay: isEnemy ? "0s" : "0.6s" }}>
          <div
            className={`relative flex h-20 w-20 items-center justify-center sm:h-28 sm:w-28 md:h-36 md:w-36 lg:h-40 lg:w-40 ${isHit ? "animate-battle-hit-flash" : ""}`}
          >
            {captureAnimationStage && captureBallImageSrc ? (
              <CaptureBall src={captureBallImageSrc} stage={captureAnimationStage} />
            ) : spriteUrl ? (
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

            {/* Small impact burst overlay (app/globals.css's
                battle-impact-burst) — purely decorative, layered on top of
                whichever sprite is currently hit-flashing. Never shown
                together with the capture-ball animation (isHit is never
                true while a capture is in flight — see BattleContent's
                proceedCapture, which only triggers the enemy hit-flash on
                a FAILED capture, after the ball animation has already
                cleared). */}
            {isHit ? (
              <div
                className="pointer-events-none absolute inset-0 m-auto h-1/2 w-1/2 animate-battle-impact-burst rounded-full bg-white/70"
                aria-hidden="true"
              />
            ) : null}
          </div>
        </div>
      </div>

      <div className="mx-auto -mt-2 h-3 w-20 rounded-full bg-black/35 blur-sm sm:h-4 sm:w-28" />
    </div>
  );
}

// CAPTURE SHAKE ANIMATION — renders in place of the wild Pokémon's own
// sprite/placeholder above, inside the exact same anchored/scaled wrapper,
// so it appears centered at the wild Pokémon's own battle position with no
// extra positioning logic of its own. Sized smaller than the full sprite
// box (a Poké Ball is much smaller than a Pokémon) and centered within it.
// "shaking" plays the rocking animation (app/globals.css's
// capture-ball-shake, CAPTURE_SHAKE_DURATION_MS); "success" plays the
// brief glow/pop (capture-ball-success, CAPTURE_SUCCESS_HOLD_MS) — see
// BattleContent.tsx's proceedCapture for the state machine driving this.
function CaptureBall({ src, stage }: { src: string; stage: "shaking" | "success" }) {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <img
        src={src}
        alt=""
        aria-hidden="true"
        className={`h-1/2 w-1/2 object-contain drop-shadow-2xl ${
          stage === "shaking" ? "animate-capture-ball-shake" : "animate-capture-ball-success"
        }`}
      />
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
