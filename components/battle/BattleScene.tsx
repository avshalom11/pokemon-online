"use client";

import type { CSSProperties, ReactNode } from "react";

import { BattleAttackPanel } from "./BattleAttackPanel";
import { BattleBackground } from "./BattleBackground";
import { BattleHUD } from "./BattleHUD";
import { BattleMenu } from "./BattleMenu";
import { BattleMessageBox } from "./BattleMessageBox";
import { PokemonSprite } from "./PokemonSprite";
import {
  DEFAULT_ATTACK_SLOTS,
  DEFAULT_BATTLE_MENU_ACTIONS,
  ENEMY_HUD_POSITION_CLASS,
  PLAYER_HUD_SIDE_CLASS,
  PLAYER_HUD_TOP_PERCENT,
} from "@/lib/battle/battleLayout";
import type { BattleArenaPoint, BattleTheme } from "@/shared/types/battle-theme";
import type {
  BattleAttackSlot,
  BattleMenuAction,
  BattleParticipantDisplay,
  PlayerBattleParticipantDisplay,
} from "@/shared/types/battle-ui";

export interface BattleSceneProps {
  /** The only thing that should differ between battle locations. */
  theme: BattleTheme;
  enemy: BattleParticipantDisplay;
  player: PlayerBattleParticipantDisplay;
  message?: string;
  attacks?: BattleAttackSlot[];
  onAttackSelect?: (attackId: string) => void;
  menuActions?: BattleMenuAction[];
  onMenuAction?: (actionId: string) => void;
  /** Brief hit-flash feedback, forwarded to PokemonSprite — see its own
   * `isHit` doc comment. Both default to false/undefined, so omitting
   * them is a no-op for any caller that doesn't need this. */
  enemyHit?: boolean;
  playerHit?: boolean;
  /** Forwarded straight through to BattleBackground — see its own
   * `rarityOverlayClassName` doc comment
   * (components/battle/BattleBackground.tsx). */
  rarityOverlayClassName?: string;
}

// Anchors a Pokémon sprite so its feet land exactly on a given point of the
// background art (theme.arena.wildPlatform / playerPlatform — a percentage
// position, see shared/types/battle-theme.ts). translate(-50%, -100%)
// shifts the element so its horizontal center and *bottom* edge sit at
// that point, rather than its own top-left corner. Positioned relative to
// this same absolute inset-0 layer that BattleBackground also fills, so
// the percentages always line up with the actual artwork regardless of
// how much room the footer below ends up taking.
function PlatformAnchor({ point, children }: { point: BattleArenaPoint; children: ReactNode }) {
  const style: CSSProperties = {
    position: "absolute",
    left: `${point.xPercent}%`,
    top: `${point.yPercent}%`,
    transform: "translate(-50%, -100%)",
  };

  return <div style={style}>{children}</div>;
}

// Composition root for every battle location. Layout (who goes where) lives
// here; visual identity (background image/colors/particles/lighting/arena)
// lives entirely in the `theme` prop. Adding a new battle location should
// never require editing this file — only a new theme object in
// lib/battle/battleThemes.ts.
//
// Fills whatever container it's placed in (100% width/height) rather than
// owning the viewport or header space itself — that's BattleWindow's job
// (features/battle/components/BattleWindow.tsx), so BattleScene stays
// reusable as "just the battle content" regardless of how it's framed.
export function BattleScene({
  theme,
  enemy,
  player,
  message,
  attacks = DEFAULT_ATTACK_SLOTS,
  onAttackSelect,
  menuActions = DEFAULT_BATTLE_MENU_ACTIONS,
  onMenuAction,
  enemyHit,
  playerHit,
  rarityOverlayClassName,
}: BattleSceneProps) {
  return (
    // `isolate` establishes a new stacking context so BattleBackground's
    // `-z-10` only ever stacks behind BattleScene's own content, never
    // behind an ancestor's background — without it, a plain `relative`
    // container doesn't contain negative z-index children.
    <div className="relative isolate flex h-full w-full flex-col overflow-hidden">
      <BattleBackground theme={theme} rarityOverlayClassName={rarityOverlayClassName} />

      {/* Sprites — percentage-anchored to this theme's two battle-platform
          circles in the art, independent of the HUD/footer layout below. */}
      <PlatformAnchor point={theme.arena.wildPlatform}>
        <PokemonSprite role="enemy" spriteUrl={enemy.spriteUrl} name={enemy.name} isHit={enemyHit} />
      </PlatformAnchor>
      <PlatformAnchor point={theme.arena.playerPlatform}>
        <PokemonSprite
          role="player"
          spriteUrl={player.spriteUrl}
          fallbackSpriteUrl={player.fallbackSpriteUrl}
          name={player.name}
          isHit={playerHit}
        />
      </PlatformAnchor>

      {/* Player status card — positioned in the SAME full-scene percentage
          coordinate space as the sprites above (not the arena sub-box the
          enemy's card below uses), specifically so its vertical position is
          independent of both the wild platform's Y and the footer's height
          — see PLAYER_HUD_TOP_PERCENT's doc comment
          (lib/battle/battleLayout.ts) for why an arena-relative offset
          couldn't reliably clear the wild Pokémon in every zone. */}
      <div className={PLAYER_HUD_SIDE_CLASS} style={{ top: `${PLAYER_HUD_TOP_PERCENT}%` }}>
        <BattleHUD theme={theme} participant={player} experience={player.experience} />
      </div>

      {/* Enemy HUD — corner-anchored within the space above the footer.
          Flexbox (min-h-0 flex-1, sibling to the shrink-0 footer below)
          reserves exactly the footer's real, responsive height, so it
          never ends up covered by it regardless of screen size. */}
      <div className="relative min-h-0 flex-1 p-3 sm:p-6 lg:p-8">
        <div className={ENEMY_HUD_POSITION_CLASS}>
          <BattleHUD theme={theme} participant={enemy} />
        </div>
      </div>

      {/* This footer is `shrink-0` and pinned to the BOTTOM of the flex
          column (its sibling above, the enemy-HUD area, is `flex-1
          min-h-0` and simply absorbs whatever height this footer doesn't
          use) — its visible content's distance from the player's HP/XP
          card above is therefore governed by the footer's own rendered
          height (padding + the message box/attack/menu content below),
          NOT by its top padding: a bottom-anchored flex item's top edge
          always moves to keep its BOTTOM flush, so adding top padding
          here only shifts the invisible boundary with the flex-1 sibling
          above, never the actual gap to the player's card. `pb-*` is
          deliberately smaller than `pt-*` for the same reason — every
          pixel trimmed from the bottom (or from the content below) is a
          pixel of real, comfortable breathing room gained above; see
          BattleMessageBox/BattleAttackPanel/BattleMenu's own trimmed
          sizing, which exists for this exact purpose, not just visual
          compactness. */}
      <div className="relative flex shrink-0 flex-col gap-1 bg-gradient-to-t from-black/55 to-transparent px-2 pt-2 pb-1 sm:gap-1.5 sm:px-3 sm:pt-2.5 sm:pb-1.5">
        <BattleMessageBox theme={theme} message={message} />

        {/* Attack Panel + Action Panel side by side on larger screens;
            stacked full-width on mobile so nothing overlaps or gets
            cramped. Even split (not the old ~75/25) — the battle window is
            narrower now than when this footer spanned the full viewport,
            and the temporary single-attack-slot system (see
            TEMPORARY_ATTACK_SLOTS in features/battle/components/
            BattleContent.tsx) leaves the attack panel mostly empty anyway,
            while the two action buttons ("לכידה"/"בריחה") need the room to
            avoid truncating at the panel's new width. Kept deliberately
            compact (tight gap, no extra padding beyond the panels' own) so
            this whole footer stays short enough to never reach up into the
            player's HP/XP card, which is positioned independently of the
            footer's height (PLAYER_HUD_TOP_PERCENT, lib/battle/battleLayout.ts). */}
        <div className="flex flex-col gap-1.5 sm:flex-row sm:gap-2">
          <div className="sm:flex-1">
            <BattleAttackPanel theme={theme} attacks={attacks} onSelect={onAttackSelect} />
          </div>
          <div className="sm:flex-1">
            <BattleMenu theme={theme} actions={menuActions} onSelect={onMenuAction} />
          </div>
        </div>
      </div>
    </div>
  );
}
