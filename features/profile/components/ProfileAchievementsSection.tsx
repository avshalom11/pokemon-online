import { SpriteImage } from "@/components/media/SpriteImage";
import type { ProfileAchievementsView, PublicBadgeView, PublicRegionalMedalView } from "../types/profile.types";

interface ProfileAchievementsSectionProps {
  achievements: ProfileAchievementsView;
}

// PROFILE ACHIEVEMENTS — the generic "הישגים" section (replaces the old
// architectural placeholder, ProfileBadgesSection.tsx, which explicitly
// anticipated this exact feature). Deliberately generic, not
// Gym-specific: renders whatever groups `achievements` currently carries
// (today: earned Gym Badges, Regional Medals) so a later League-trophy
// array can be added as one more group here without rebuilding this
// component or ProfileContent.tsx's own composition (see this feature's
// own spec, section 17).
//
// Labels/images are always read straight off `achievements` (itself built
// from the existing Gym Badge/Medal catalog — gym-badges.ts/
// regional-medals.ts) — never recreated or hardcoded here, so there is
// exactly one place Badge/Medal names/artwork are defined.
export function ProfileAchievementsSection({ achievements }: ProfileAchievementsSectionProps) {
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

          {achievements.badges.length === 0 && achievements.regionalMedals.length === 0 ? (
            <p className="text-center text-sm text-slate-500">עדיין לא הושגו תגי מכון או מדליות מחוז</p>
          ) : (
            <div className="flex flex-col gap-4">
              {achievements.badges.length > 0 ? (
                <AchievementGroup title="תגי מכון" items={achievements.badges.map(badgeToDisplayItem)} />
              ) : null}
              {achievements.regionalMedals.length > 0 ? (
                <AchievementGroup title="מדליות מחוז" items={achievements.regionalMedals.map(medalToDisplayItem)} />
              ) : null}
            </div>
          )}
        </>
      )}
    </section>
  );
}

interface AchievementDisplayItem {
  key: string;
  imageUrl: string;
  name: string;
}

function badgeToDisplayItem(badge: PublicBadgeView): AchievementDisplayItem {
  return { key: `${badge.regionId}-${badge.gymNumber}`, imageUrl: badge.imageUrl, name: badge.displayName };
}

function medalToDisplayItem(medal: PublicRegionalMedalView): AchievementDisplayItem {
  return { key: medal.regionId, imageUrl: medal.imageUrl, name: medal.displayName };
}

function AchievementGroup({ title, items }: { title: string; items: AchievementDisplayItem[] }) {
  return (
    <div>
      <h3 className="mb-2 text-[11px] font-semibold tracking-wide text-slate-500">{title}</h3>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <div key={item.key} className="flex w-16 flex-col items-center gap-1 text-center" title={item.name}>
            <SpriteImage
              src={item.imageUrl}
              alt={item.name}
              className="h-12 w-12 object-contain"
              fallbackClassName="flex h-12 w-12 items-center justify-center rounded-lg border border-dashed border-white/20 bg-slate-800/60 text-slate-500"
            />
            <span className="line-clamp-2 text-[10px] leading-tight text-slate-400">{item.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
