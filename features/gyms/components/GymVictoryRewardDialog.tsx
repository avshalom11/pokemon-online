import { SpriteImage } from "@/components/media/SpriteImage";
import { getGymBadgeDefinition } from "@/features/gyms/data/gym-badges";
import { getRegionalMedalDefinition } from "@/features/gyms/data/regional-medals";
import type { GrantedGymReward } from "@/features/gyms/services/gym-reward.service";
import type { RegionId } from "@/shared/types/region";

interface GymVictoryRewardDialogProps {
  regionId: RegionId;
  gymNumber: 1 | 2 | 3 | null;
  // VICTORY DIALOG (later task, section 11) — the actual fixed trainer name
  // (gym-trainer-names.ts), read straight off the battle view data; combined
  // into this SAME dialog's own title rather than showing a second,
  // overlapping "you won!" confirmation before this one.
  trainerName: string;
  reward: GrantedGymReward;
  onConfirm: () => void;
}

// GYMS & LEAGUES PHASE 4 — the post-victory reward result (section 20).
// Same "opaque fixed-inset backdrop, one explicit אישור to dismiss" pattern
// ChestFoundDialog/EggFoundDialog already establish for Field Battle — this
// is a NEW component (not a reuse of either) since neither's shape fits a
// Badge/Medal + money + XP-percent bundle, but the visual language is
// intentionally identical. Badge/Medal artwork uses the exact deterministic
// paths Phase 1 defined (gym-badges.ts/regional-medals.ts) through
// SpriteImage, which already falls back to the project's own "אין תמונה"
// placeholder if the file doesn't exist on disk yet — never a broken-image
// icon, and never a generated placeholder file.
export function GymVictoryRewardDialog({ regionId, gymNumber, trainerName, reward, onConfirm }: GymVictoryRewardDialogProps) {
  const isChampion = reward.kind === "regional-champion";
  const badge = !isChampion && gymNumber ? getGymBadgeDefinition(regionId, gymNumber) : null;
  const medal = isChampion ? getRegionalMedalDefinition(regionId) : null;

  // VICTORY DIALOG COPY (later task, section 1) — the exact approved
  // sentence, combined here with the reward result into ONE dialog for a
  // Gym Leader/Regional Champion win — never a second, overlapping "you
  // won!" confirmation shown before this one.
  const title = `כל הכבוד! ניצחת את ${trainerName}. לא רבים מצליחים!`;
  const imageUrl = medal?.imageUrl ?? badge?.imageUrl ?? "";
  const imageAlt = medal?.displayName ?? badge?.displayName ?? "";
  // BADGE/MEDAL EARNED STATE (later task, section 3/4) — the exact "עיטור
  // התקבל" wording GymsContent's own region-overview list already uses for
  // a completed Gym's badge, reused here rather than a second phrase for
  // the same concept.
  const earnedLabel = isChampion ? "מדליה אזורית התקבלה ✓" : "עיטור התקבל ✓";

  return (
    <div
      dir="rtl"
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
    >
      <div className="w-full max-w-sm rounded-2xl border border-amber-400/30 bg-slate-900 p-6 text-center shadow-2xl">
        <h2 className="text-lg font-bold text-slate-100">{title}</h2>

        <div className="mt-4 flex justify-center">
          <SpriteImage
            src={imageUrl}
            alt={imageAlt}
            className="h-24 w-24 object-contain"
            fallbackClassName="flex h-24 w-24 items-center justify-center rounded-lg border border-dashed border-white/20 bg-slate-800/60 text-slate-500"
          />
        </div>

        <p className="mt-2 text-sm font-semibold text-amber-400">{earnedLabel}</p>

        <dl className="mt-4 flex flex-col gap-1.5 text-sm text-slate-300">
          <div className="flex items-center justify-between">
            <dt>כסף</dt>
            <dd className="font-semibold text-amber-300">{reward.money.toLocaleString("he-IL")}</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt>ניסיון</dt>
            <dd className="font-semibold text-amber-300">
              {reward.xpPercentOfNextLevel}% ({reward.xpAmount.toLocaleString("he-IL")})
            </dd>
          </div>
          {reward.leveledUp ? (
            <div className="flex items-center justify-between">
              <dt>עלייה בדרגה</dt>
              <dd className="font-semibold text-emerald-400">רמה {reward.newPlayerLevel}</dd>
            </div>
          ) : null}
          {reward.chestRewards.length > 0 ? (
            <div className="flex items-center justify-between">
              <dt>תיבות</dt>
              <dd className="font-semibold text-amber-300">
                {reward.chestRewards.map((chest) => `${chest.chestTypeId} x${chest.quantity}`).join(", ")}
              </dd>
            </div>
          ) : null}
        </dl>

        <button
          type="button"
          onClick={onConfirm}
          className="mt-6 w-full rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-amber-500"
        >
          אישור
        </button>
      </div>
    </div>
  );
}
