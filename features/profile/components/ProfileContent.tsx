"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { EditProfileModal } from "./EditProfileModal";
import { ProfileAboutMe } from "./ProfileAboutMe";
import { ProfileAchievementsSection } from "./ProfileAchievementsSection";
import { ProfileContentBlocksSection } from "./ProfileContentBlocksSection";
import { ProfileHeader } from "./ProfileHeader";
import { ProfilePartySection } from "./ProfilePartySection";
import { ProfileStatsSection } from "./ProfileStatsSection";
import { BackButton } from "@/components/layout/BackButton";
import { ProfileFriendsSection } from "@/features/friends/components/ProfileFriendsSection";
import { getProfileTheme } from "../themes/profile-themes";
import type { ProfileEditViewModel, PublicProfileView } from "../types/profile.types";

interface ProfileContentProps {
  view: PublicProfileView;
  // Only ever non-null when view.isOwner is true — see
  // app/(game)/profile/[username]/page.tsx, the only caller.
  editData: ProfileEditViewModel | null;
}

// Page composition root for /profile/[username] — the SAME component for
// every visitor, owner included; only `view.isOwner` (via editData being
// non-null) changes whether the Edit Profile button/modal — and now the
// חברים section, which reads from the shared FriendsDataProvider
// (features/friends/context/friends-data-context.tsx) rather than a prop,
// since it only ever renders for the owner viewing their OWN data anyway —
// ever mount at all. The page's own theme background (features/profile/
// themes) is the only per-profile visual customization applied here.
export function ProfileContent({ view, editData }: ProfileContentProps) {
  const router = useRouter();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const successTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const theme = getProfileTheme(view.themeId);

  function handleSaved(newUsername: string) {
    setIsEditOpen(false);
    setSuccessMessage("הפרופיל עודכן בהצלחה.");
    if (successTimeout.current) clearTimeout(successTimeout.current);
    successTimeout.current = setTimeout(() => setSuccessMessage(null), 4000);

    if (newUsername !== view.username) {
      // The route itself is keyed by username — a changed username means
      // this exact URL no longer points at the right profile, so navigate
      // to the new one instead of just refreshing in place.
      router.replace(`/profile/${newUsername}`);
    } else {
      router.refresh();
    }
  }

  return (
    <div dir="rtl" className={`relative h-full w-full overflow-y-auto ${theme.bannerClassName}`}>
      <div className="relative mx-auto flex max-w-3xl flex-col gap-5 p-4 sm:p-6 lg:p-8">
        <BackButton />

        <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4 sm:p-6">
          <ProfileHeader view={view} onEditClick={() => setIsEditOpen(true)} />
        </div>

        {successMessage ? (
          <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-center text-sm font-semibold text-emerald-300">
            {successMessage}
          </p>
        ) : null}

        <ProfileAboutMe aboutMe={view.aboutMe} />
        <ProfilePartySection party={view.party} />
        <ProfileStatsSection stats={view.stats} />
        <ProfileAchievementsSection achievements={view.achievements} />
        {view.isOwner ? <ProfileFriendsSection /> : null}
        <ProfileContentBlocksSection blocks={view.contentBlocks} />
      </div>

      {isEditOpen && editData ? (
        <EditProfileModal data={editData} onClose={() => setIsEditOpen(false)} onSaved={handleSaved} />
      ) : null}
    </div>
  );
}
