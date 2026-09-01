import { SpriteImage } from "@/components/media/SpriteImage";
import { AddFriendButton } from "@/features/friends/components/AddFriendButton";
import { getStaffRolePresentation } from "@/features/moderation/config/staff-role-presentation";
import { StaffRoleLabel } from "@/features/moderation/components/StaffRoleLabel";
import { getAvatarImageUrl } from "../themes/profile-avatars";
import type { PublicProfileView } from "../types/profile.types";

interface ProfileHeaderProps {
  view: PublicProfileView;
  onEditClick?: () => void;
}

// Identity section — avatar, username, trainer level, region, and (owner
// only) the Edit Profile button. Never reads any privacy-gated field
// itself (party/stats/aboutMe) — those are their own sections below.
export function ProfileHeader({ view, onEditClick }: ProfileHeaderProps) {
  const avatarUrl = getAvatarImageUrl(view.avatarDexNumber);
  const avatarInitial = view.displayName.trim().charAt(0).toUpperCase() || "?";

  return (
    <div className="flex flex-col items-center gap-3 text-center sm:flex-row sm:items-center sm:gap-5 sm:text-right">
      {avatarUrl ? (
        <SpriteImage
          src={avatarUrl}
          alt={view.displayName}
          className="h-24 w-24 shrink-0 object-contain drop-shadow-[0_0_20px_rgba(99,102,241,0.35)]"
          fallbackClassName="flex h-24 w-24 shrink-0 items-center justify-center rounded-full border border-dashed border-white/20 bg-slate-800/60 text-slate-500"
        />
      ) : (
        <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-3xl font-bold text-white shadow-[0_0_20px_rgba(129,90,238,0.45)]">
          {avatarInitial}
        </div>
      )}

      <div className="flex flex-1 flex-col items-center gap-1 sm:items-start">
        <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
          <h1 className={`text-xl font-bold ${getStaffRolePresentation(view.targetStaffRole)?.nameClassName ?? "text-slate-100"}`}>
            {view.displayName}
          </h1>
          {/* STAFF / MODERATION — ROLE PRESENTATION — uses the profile
              TARGET's own persisted staff role (view.targetStaffRole), never
              the current viewer's — see StaffRoleLabel.tsx's own doc
              comment. Renders nothing for a plain player. */}
          <StaffRoleLabel role={view.targetStaffRole} />
          <span dir="auto" className="text-xs text-slate-500">{`@${view.username}`}</span>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-slate-400 sm:justify-start">
          <span className="rounded-full bg-indigo-500/20 px-2.5 py-1 font-semibold text-indigo-200">רמה {view.trainerLevel}</span>
          <span className="rounded-full bg-slate-800/80 px-2.5 py-1 font-medium">{view.regionLabel}</span>
        </div>

        {view.isOwner ? (
          <button
            type="button"
            onClick={onEditClick}
            className="mt-2 rounded-lg border border-indigo-400/40 bg-indigo-500/10 px-4 py-1.5 text-xs font-semibold text-indigo-200 transition-colors hover:border-indigo-400/70 hover:bg-indigo-500/20"
          >
            ערוך פרופיל
          </button>
        ) : (
          <AddFriendButton
            targetPlayerId={view.playerId}
            targetDisplayName={view.displayName}
            initialStatus={view.friendshipStatus}
            incomingFriendRequestId={view.incomingFriendRequestId}
          />
        )}
      </div>
    </div>
  );
}
