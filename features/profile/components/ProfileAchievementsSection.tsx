"use client";

import { useState } from "react";

import { SpriteImage } from "@/components/media/SpriteImage";
import { AchievementPreviewModal } from "./AchievementPreviewModal";
import type { ProfileAchievementsView, PublicBadgeView, PublicLeagueAwardView, PublicRegionalMedalView } from "../types/profile.types";

interface ProfileAchievementsSectionProps {
  achievements: ProfileAchievementsView;
}

// PROFILE ACHIEVEMENTS — the generic "הישגים" section (replaces the old
// architectural placeholder, ProfileBadgesSection.tsx, which explicitly
// anticipated this exact feature). Deliberately generic, not
// Gym-specific: renders whatever groups `achievements` currently carries
// (Gym Badges, Regional Medals, and — LEAGUE AWARDS — League Trophies/
// Medals) as one more group here without rebuilding this component or
// ProfileContent.tsx's own composition (see this feature's own spec,
// section 17).
//
// Labels/images are always read straight off `achievements` (built from
// the existing Gym Badge/Medal catalog — gym-badges.ts/regional-medals.ts —
// and, for League awards, the player's own League placement history,
// already resolved and grouped server-side by
// profile-achievements-view.service.ts) — never recreated, re-fetched, or
// hardcoded here, so there is exactly one place each achievement kind's
// names/artwork are defined.
export function ProfileAchievementsSection({ achievements }: ProfileAchievementsSectionProps) {
  // CLICK-TO-ENLARGE (later task) — a single piece of state, shared by
  // every Badge/Medal item below (never one useState per item): only ever
  // set by clicking an item ALREADY rendered from `achievements` (itself
  // already privacy-filtered server-side, see profile-achievements-view.
  // service.ts) — so a hidden achievement's item is never even in the DOM
  // for a non-owner viewer to click, and this component never needs its
  // own separate privacy check.
  const [previewItem, setPreviewItem] = useState<AchievementDisplayItem | null>(null);

  return (
    <section dir="rtl" className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
      <h2 className="mb-3 text-xs font-semibold tracking-wide text-slate-400 uppercase">הישגים</h2>

      {!achievements.visibleToViewer ? (
        // PUBLIC PROFILE BEHAVIOR (section 5) — a neutral message, never an
        // exposed count of hidden achievements. `achievements.badges`/
        // `.regionalMedals` are already genuinely empty arrays for this
        // viewer (server-side privacy — see profile-achievements-view.
        // service.ts), so nothing below this branch is ever reached.
        <p className="text-center text-sm text-slate-500">המשתמש בחר להסתיר את הישגי המכונים שלו</p>
      ) : (
        <>
          {achievements.hiddenFromOtherUsers ? (
            // OWNER VIEW (section 6) — only ever true when the CURRENT
            // viewer is the owner (a non-owner with the setting off never
            // reaches this branch at all — visibleToViewer would be false
            // for them instead).
            <p className="mb-3 text-xs font-semibold text-amber-300/80">הישגים מוסתרים ממשתמשים אחרים</p>
          ) : null}

          {achievements.badges.length === 0 && achievements.regionalMedals.length === 0 && achievements.leagueAwards.length === 0 ? (
            <p className="text-center text-sm text-slate-500">עדיין לא הושגו תגי מכון, מדליות מחוז או פרסי ליגה</p>
          ) : (
            <div className="flex flex-col gap-4">
              {achievements.badges.length > 0 ? (
                <AchievementGroup title="תגי מכון" items={achievements.badges.map(badgeToDisplayItem)} onSelect={setPreviewItem} />
              ) : null}
              {achievements.regionalMedals.length > 0 ? (
                <AchievementGroup title="מדליות מחוז" items={achievements.regionalMedals.map(medalToDisplayItem)} onSelect={setPreviewItem} />
              ) : null}
              {achievements.leagueAwards.length > 0 ? (
                <AchievementGroup title="פרסי ליגה" items={achievements.leagueAwards.map(leagueAwardToDisplayItem)} onSelect={setPreviewItem} />
              ) : null}
            </div>
          )}
        </>
      )}

      {previewItem ? (
        <AchievementPreviewModal imageUrl={previewItem.imageUrl} name={previewItem.name} kind={previewItem.kind} onClose={() => setPreviewItem(null)} />
      ) : null}
    </section>
  );
}

interface AchievementDisplayItem {
  key: string;
  imageUrl: string;
  name: string;
  // MEDAL IMAGE SIZE (later task) — the ONLY reason this field exists: so
  // AchievementPreviewModal can show a Regional Medal (or LEAGUE AWARDS —
  // a League award, same treatment) slightly larger than a Gym Badge.
  // Never used for anything else (no separate image lookup/mapping —
  // imageUrl is still always read straight off the view model, unchanged).
  kind: "badge" | "medal" | "league-award";
  // LEAGUE AWARDS — how many times this exact (leagueId, place) was
  // earned; undefined/1 for a Badge/Medal (those are always binary,
  // owned-or-not — never a quantity). Only ever rendered as a "×N" badge
  // when greater than 1, so a single win never shows a redundant "×1".
  quantity?: number;
}

function badgeToDisplayItem(badge: PublicBadgeView): AchievementDisplayItem {
  return { key: `${badge.regionId}-${badge.gymNumber}`, imageUrl: badge.imageUrl, name: badge.displayName, kind: "badge" };
}

function medalToDisplayItem(medal: PublicRegionalMedalView): AchievementDisplayItem {
  return { key: medal.regionId, imageUrl: medal.imageUrl, name: medal.displayName, kind: "medal" };
}

// LEAGUE AWARDS — `award` is already grouped by (leagueId, place) with its
// own `count` (profile-achievements-view.service.ts) — this only ever maps
// that already-grouped view model onto the generic display shape every
// other achievement kind uses, never re-groups or re-derives anything.
function leagueAwardToDisplayItem(award: PublicLeagueAwardView): AchievementDisplayItem {
  return {
    key: `${award.leagueId}-${award.place}`,
    imageUrl: award.imageUrl,
    name: `${award.leagueDisplayName} — ${award.placementLabel}`,
    kind: "league-award",
    quantity: award.count,
  };
}

function AchievementGroup({
  title,
  items,
  onSelect,
}: {
  title: string;
  items: AchievementDisplayItem[];
  onSelect: (item: AchievementDisplayItem) => void;
}) {
  return (
    <div>
      <h3 className="mb-2 text-[11px] font-semibold tracking-wide text-slate-500">{title}</h3>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => {
          // LEAGUE AWARDS — a "×N" quantity badge, same corner-overlay
          // convention InventoryItemCard.tsx already uses for owned-item
          // quantities, but only shown once earned more than once — a
          // single win never shows a redundant "×1" (no existing Profile
          // achievement convention shows quantity at all, since Badges/
          // Medals are binary; this is the one new case that needs it).
          const showQuantity = item.quantity !== undefined && item.quantity > 1;

          return (
            <button
              key={item.key}
              type="button"
              onClick={() => onSelect(item)}
              title={showQuantity ? `${item.name} ×${item.quantity}` : item.name}
              className="flex w-16 flex-col items-center gap-1 rounded-lg text-center transition-colors hover:bg-white/5"
            >
              <div className="relative">
                <SpriteImage
                  src={item.imageUrl}
                  alt={item.name}
                  className="h-12 w-12 object-contain"
                  fallbackClassName="flex h-12 w-12 items-center justify-center rounded-lg border border-dashed border-white/20 bg-slate-800/60 text-slate-500"
                />
                {showQuantity ? (
                  <span
                    dir="ltr"
                    className="absolute -bottom-1 -right-1 rounded-full border border-slate-950 bg-indigo-500 px-1.5 py-0 text-[10px] font-bold text-white"
                  >
                    ×{item.quantity}
                  </span>
                ) : null}
              </div>
              <span className="line-clamp-2 text-[10px] leading-tight text-slate-400">{item.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
