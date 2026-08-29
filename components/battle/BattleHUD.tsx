import type { ReactNode } from "react";

import { HealthBar } from "./HealthBar";
import { PokemonXpBar } from "./PokemonXpBar";
import { getRarityPresentation } from "@/lib/battle/battleRarityPresentation";
import { formatPokemonTypesLabel } from "@/lib/battle/pokemonTypeLabel";
import type { BattleTheme } from "@/shared/types/battle-theme";
import type { BattleParticipantDisplay } from "@/shared/types/battle-ui";

interface BattleHUDProps {
  theme: BattleTheme;
  participant: BattleParticipantDisplay;
  // BATTLE UI — TYPE DISPLAY PER SIDE. Which side this card belongs to —
  // BattleScene always knows this statically at its own two call sites
  // (`participant={player}` vs `participant={enemy}`), so it's passed
  // through explicitly rather than inferred from participant fields like
  // `rarity`/`experience`: those are only reliably side-specific for Field
  // Battle (Gym/League opponents carry no rarity at all, and Gym/League
  // players carry no experience), so neither would correctly distinguish
  // sides across every battle mode this component is shared by. Same
  // "player"/"enemy" vocabulary BattleActor (features/battle/events/
  // battle-event.types.ts) already uses elsewhere in this project.
  side: "player" | "enemy";
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
export function BattleHUD({ theme, participant, side, experience, footer }: BattleHUDProps) {
  const isPlayer = side === "player";

  // Only ever set for the wild (enemy) participant — see
  // BattleParticipantDisplay.rarity's doc comment — so this is a no-op
  // (undefined) for the player HUD.
  const rarityLabel = participant.rarity
    ? getRarityPresentation(participant.rarity).label
    : undefined;

  const typesLabel =
    participant.types && participant.types.length > 0 ? formatPokemonTypesLabel(participant.types) : undefined;

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
          {/* BATTLE UI — TYPE DISPLAY, PLAYER SIDE ONLY (inline). Same line
              as the name and the level badge on the end side below — name
              first, then the type(s) in parentheses, appended INSIDE this
              same truncating span (never a sibling flex child) so the whole
              "Name (Type / Type)" unit truncates together as one line
              rather than the type label getting its own separate overflow
              budget. Smaller/subtler than the name (text-[10px] vs.
              text-xs/sm, slate-400 vs. slate-50) and English/LTR — see
              formatPokemonTypesLabel's own doc comment for why this is
              never POKEMON_TYPE_LABELS (Hebrew). The enemy/opponent side
              never shows its type here at all — it moves to the metadata
              line below instead (alongside rarity), see that block's own
              doc comment for why. */}
          <span className="font-fantasy min-w-0 truncate text-xs font-semibold tracking-wide text-slate-50 sm:text-sm">
            {participant.name}
            {isPlayer && typesLabel ? (
              <span className="ms-1 text-[10px] font-medium text-slate-400 sm:text-[11px]" dir="ltr">
                ({typesLabel})
              </span>
            ) : null}
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

        {/* BATTLE UI — METADATA LINE, ENEMY/OPPONENT SIDE ONLY (rarity +
            type together). Own line rather than appended to the name span
            (truncate): a long name + the longest rarity label ("נדיר מאוד")
            together routinely overflow this card's width, and letting the
            shared truncate eat into the name itself made the Pokémon
            unidentifiable while the label stayed fully visible — the
            opposite of what's useful. This way the name keeps exactly its
            original truncation budget and the metadata always renders in
            full. Rarity (already only ever set for the enemy participant —
            see BattleParticipantDisplay.rarity's own doc comment) and type
            are two SEPARATE sibling spans, never concatenated into one
            string: rarity is Hebrew (RTL, no explicit dir — same as
            before), type stays its own dir="ltr" run exactly like the
            player's inline version above, so mixed-direction punctuation
            (the parentheses on each) never gets mangled by the surrounding
            bidi context. Either piece renders alone when the other is
            absent (e.g. Gym/League opponents carry no rarity at all —
            still shows "(Type)" alone); the whole line is omitted only
            when NEITHER is present. Never shown for the player side. */}
        {!isPlayer && (rarityLabel || typesLabel) ? (
          <div className="mt-0.5 flex flex-wrap items-baseline gap-x-1 gap-y-0.5">
            {rarityLabel ? (
              <span className="text-[10px] font-medium text-slate-300/90 sm:text-xs">({rarityLabel})</span>
            ) : null}
            {typesLabel ? (
              <span className="text-[10px] font-medium text-slate-400 sm:text-[11px]" dir="ltr">
                ({typesLabel})
              </span>
            ) : null}
          </div>
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
