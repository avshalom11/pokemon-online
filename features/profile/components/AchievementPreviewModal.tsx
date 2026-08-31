"use client";

import { SpriteImage } from "@/components/media/SpriteImage";

interface AchievementPreviewModalProps {
  imageUrl: string;
  name: string;
  // MEDAL IMAGE SIZE (later task) — the ONLY thing this prop controls: a
  // Regional Medal (or LEAGUE AWARDS — a League award, same size) is shown
  // slightly larger than a Gym Badge here (Badge sizing is untouched).
  // Never affects imageUrl resolution/fetching.
  kind: "badge" | "medal" | "league-award";
  onClose: () => void;
}

// GYM BADGE/MEDAL IMAGE ORDER — PROFILE CLICK-TO-ENLARGE (later task) — a
// lightbox for an already-earned Gym Badge/Regional Medal on the Profile
// Achievements section. Deliberately never fetches or computes an imageUrl
// of its own: the caller (ProfileAchievementsSection) passes through the
// EXACT same imageUrl already present on the achievement view model
// (itself sourced from the Badge/Medal catalog's own numeric image helper,
// gym-badge-images.ts — the one shared numbering source of truth) — never
// a second image lookup/mapping. Mirrors EditProfileModal's
// own "backdrop click OR ✕ button closes, inner content click does not"
// convention exactly, the established modal pattern across this codebase.
// Privacy is never this component's concern: ProfileAchievementsSection
// only ever mounts it for an item already present in the (server-side,
// privacy-filtered) achievements view — a hidden achievement's item never
// exists in that list for a non-owner viewer in the first place, so there
// is nothing here to gate a second time.
export function AchievementPreviewModal({ imageUrl, name, kind, onClose }: AchievementPreviewModalProps) {
  const isMedal = kind === "medal" || kind === "league-award";

  return (
    <div
      dir="rtl"
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        className="relative flex w-full max-w-xs flex-col items-center rounded-2xl border border-white/10 bg-slate-900/95 p-6 text-center shadow-[0_0_40px_rgba(99,102,241,0.25)]"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="סגור"
          className="absolute left-4 top-4 flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-slate-800/80 text-slate-300 hover:text-white"
        >
          ✕
        </button>

        <SpriteImage
          src={imageUrl}
          alt={name}
          className={isMedal ? "h-48 w-48 object-contain" : "h-40 w-40 object-contain"}
          fallbackClassName={
            isMedal
              ? "flex h-48 w-48 items-center justify-center rounded-lg border border-dashed border-white/20 bg-slate-800/60 text-slate-500"
              : "flex h-40 w-40 items-center justify-center rounded-lg border border-dashed border-white/20 bg-slate-800/60 text-slate-500"
          }
        />
        <p className="mt-4 text-base font-semibold text-slate-100">{name}</p>
      </div>
    </div>
  );
}
