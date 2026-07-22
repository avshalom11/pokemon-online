"use client";

import { useRouter, useSearchParams } from "next/navigation";

import { BattleScene } from "@/components/battle/BattleScene";
import { GameScreen } from "@/components/layout/GameScreen";
import { getBattleTheme } from "@/lib/battle/battleThemes";
import type {
  BattleParticipantDisplay,
  PlayerBattleParticipantDisplay,
} from "@/shared/types/battle-ui";
import type { ZoneId } from "@/shared/types/zone";

// Stage 1 of the battle screen redesign: visual interface only, with static
// placeholder participants. No engine wiring, damage, or menu actions yet —
// that lands in a later pass once BattleScene has proven itself visually.
const PLACEHOLDER_ENEMY: BattleParticipantDisplay = {
  name: "Pikachu",
  level: 5,
  currentHealth: 28,
  maxHealth: 35,
};

const PLACEHOLDER_PLAYER: PlayerBattleParticipantDisplay = {
  name: "Pikachu",
  level: 7,
  currentHealth: 40,
  maxHealth: 46,
  currentExperience: 18,
  maxExperience: 100,
};

export function BattleContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const zone = searchParams.get("zone") as ZoneId | null;
  const theme = getBattleTheme(zone);

  // Escape ("run") immediately leaves the battle — no confirmation, no
  // battle-state changes, just navigation.
  function handleMenuAction(actionId: string) {
    if (actionId === "run") {
      router.push("/map");
    }
  }

  return (
    <GameScreen>
      <BattleScene
        theme={theme}
        enemy={PLACEHOLDER_ENEMY}
        player={PLACEHOLDER_PLAYER}
        message={`${PLACEHOLDER_ENEMY.name} פראי הופיע!`}
        onMenuAction={handleMenuAction}
      />
    </GameScreen>
  );
}
