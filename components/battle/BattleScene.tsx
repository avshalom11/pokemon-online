"use client";

import { BattleAttackPanel } from "./BattleAttackPanel";
import { BattleBackground } from "./BattleBackground";
import { BattleHUD } from "./BattleHUD";
import { BattleMenu } from "./BattleMenu";
import { BattleMessageBox } from "./BattleMessageBox";
import { PokemonSprite } from "./PokemonSprite";
import { DEFAULT_ATTACK_SLOTS, DEFAULT_BATTLE_MENU_ACTIONS } from "@/lib/battle/battleLayout";
import type { BattleTheme } from "@/shared/types/battle-theme";
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
}

// Composition root for every battle location. Layout (who goes where) lives
// here; visual identity (background image/colors/particles/lighting) lives
// entirely in the `theme` prop. Adding a new battle location should never
// require editing this file — only a new theme object in
// lib/battle/battleThemes.ts.
//
// Fills whatever container it's placed in (100% width/height) rather than
// owning the viewport or header space itself — that's GameScreen's job
// (components/layout/GameScreen.tsx), so BattleScene stays reusable as
// "just the battle content" regardless of how it's framed on the page.
export function BattleScene({
  theme,
  enemy,
  player,
  message,
  attacks = DEFAULT_ATTACK_SLOTS,
  onAttackSelect,
  menuActions = DEFAULT_BATTLE_MENU_ACTIONS,
  onMenuAction,
}: BattleSceneProps) {
  return (
    // `isolate` establishes a new stacking context so BattleBackground's
    // `-z-10` only ever stacks behind BattleScene's own content, never
    // behind an ancestor's background (e.g. GameScreen's) — without it, a
    // plain `relative` container doesn't contain negative z-index children.
    <div className="relative isolate flex h-full w-full flex-col overflow-hidden">
      <BattleBackground theme={theme} />

      <div className="relative grid min-h-0 flex-1 grid-cols-2 grid-rows-2 gap-2 p-3 sm:gap-4 sm:p-6 lg:p-8">
        <div className="col-start-1 row-start-1 flex items-start justify-start">
          <BattleHUD theme={theme} participant={enemy} />
        </div>

        <div className="col-start-2 row-start-1 flex items-center justify-end">
          <PokemonSprite role="enemy" />
        </div>

        <div className="col-start-1 row-start-2 flex items-end justify-start">
          <PokemonSprite role="player" />
        </div>

        <div className="col-start-2 row-start-2 flex items-end justify-end">
          <BattleHUD
            theme={theme}
            participant={player}
            experience={{ current: player.currentExperience, max: player.maxExperience }}
          />
        </div>
      </div>

      <div className="relative flex shrink-0 flex-col gap-2 bg-gradient-to-t from-black/55 to-transparent p-3 pt-6 sm:gap-3 sm:p-4 sm:pt-8">
        <BattleMessageBox theme={theme} message={message} />

        {/* Attack Panel (~75% width) + Action Panel (~25% width) side by
            side on larger screens; stacked full-width on mobile so nothing
            overlaps or gets cramped. */}
        <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
          <div className="sm:flex-[3]">
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
