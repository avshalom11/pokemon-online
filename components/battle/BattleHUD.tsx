import type { ReactNode } from "react";

import { HealthBar } from "./HealthBar";
import { PokemonXpBar } from "./PokemonXpBar";
import { getRarityPresentation } from "@/lib/battle/battleRarityPresentation";
import type { BattleTheme } from "@/shared/types/battle-theme";
import type { BattleParticipantDisplay } from "@/shared/types/battle-ui";

interface BattleHUDProps {
  theme: BattleTheme;
  participant: BattleParticipantDisplay;
  /** Present only for the player HUD — enemy (wild) HUDs never show a
   * Pokémon-XP bar; total lifetime XP, not a {current,max} pair, per
   * PokemonXpBar's own doc comment. */
  experience?: number;
  /** GYM BATTLE POLISH — a generic, optional slot rendered INSIDE this
   * same status card, directly beneath the HP bar (and the XP bar, when
   * present) — never a second, detached overlay. Used by Gym/Regional
   * Champion battles for their Poké Ball team-status row so it visually
   * belongs to this side's Pokémon rather than floating near the trainer
   * name; omitted entirely (default) by every other caller (Field Battle),
   * so this is a zero-risk, purely additive extension of the one shared
   * HUD component both battle types already render through. */
  footer?: ReactNode;
}

// Phase 6F — short status badges, same abbreviation convention every
// mainline Pokémon game uses.
const STATUS_BADGE: Record<string, string> = {
  burn: "BRN",
  poison: "PSN",
  paralysis: "PAR",
  sleep: "SLP",
  freeze: "FRZ",
};

const STATUS_BADGE_COLOR: Record<string, string> = {
  burn: "#f97316",
  poison: "#a855f7",
  paralysis: "#eab308",
  sleep: "#64748b",
  freeze: "#38bdf8",
};

// Trimmed from the original w-56/sm:w-64 card (width, padding, and name
// text all reduced slightly) as part of a visual-polish pass — HealthBar
// itself is untouched, so the HP bar stays exactly as readable as before.
export function BattleHUD({ theme, participant, experience, footer }: BattleHUDProps) {
  // Only ever set for the wild (enemy) participant — see
  // BattleParticipantDisplay.rarity's doc comment — so this is a no-op
  // (undefined) for the player HUD.
  const rarityLabel = participant.rarity
    ? getRarityPresentation(participant.rarity).label
    : undefined;

  return (
    <div
      className="relative w-44 overflow-hidden rounded-lg border border-white/10 bg-slate-900/75 py-2 pr-3 pl-3 shadow-xl backdrop-blur-md sm:w-52 sm:py-2.5 sm:pr-4 sm:pl-4"
      style={{ boxShadow: `0 12px 30px -14px ${theme.colors.panelAccent}66, 0 0 0 1px rgba(255,255,255,0.03) inset` }}
    >
      <div
        className="absolute inset-y-0 start-0 w-1"
        style={{ backgroundColor: theme.colors.panelAccent }}
      />

      <div className="mb-1.5">
        <div className="flex items-baseline justify-between gap-2">
          <span className="font-fantasy truncate text-xs font-semibold tracking-wide text-slate-50 sm:text-sm">
            {participant.name}
          </span>
          <div className="flex shrink-0 items-baseline gap-1">
            {participant.status && STATUS_BADGE[participant.status] ? (
              <span
                className="rounded border border-white/10 px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-white"
                style={{ backgroundColor: STATUS_BADGE_COLOR[participant.status] }}
              >
                {STATUS_BADGE[participant.status]}
              </span>
            ) : null}
            {participant.volatileBadges?.map((badge) => (
              <span
                key={badge}
                className="rounded border border-white/10 bg-slate-700/80 px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-white"
              >
                {badge}
              </span>
            ))}
            <span className="rounded border border-white/10 bg-black/30 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-slate-200">
              רמה {participant.level}
            </span>
          </div>
        </div>

        {/* Own line rather than appended to the name span (truncate): a
            long name + the longest label ("נדיר מאוד") together routinely
            overflow this card's width, and letting the shared truncate eat
            into the name itself made the Pokémon unidentifiable while the
            label stayed fully visible — the opposite of what's useful.
            This way the name keeps exactly its original truncation budget
            (zero regression for the no-rarity case) and the label always
            renders in full. */}
        {rarityLabel ? (
          <span className="mt-0.5 block truncate text-[10px] font-medium text-slate-300/90 sm:text-xs">
            ({rarityLabel})
          </span>
        ) : null}
      </div>

      <HealthBar current={participant.currentHealth} max={participant.maxHealth} />

      {experience !== undefined ? (
        <div className="mt-2">
          <PokemonXpBar experience={experience} />
        </div>
      ) : null}

      {footer ? <div className="mt-2">{footer}</div> : null}
    </div>
  );
}
