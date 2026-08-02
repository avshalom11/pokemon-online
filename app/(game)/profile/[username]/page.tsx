import { redirect } from "next/navigation";

import { GameScreen } from "@/components/layout/GameScreen";
import { BackButton } from "@/components/layout/BackButton";
import { ProfileContent } from "@/features/profile/components/ProfileContent";
import { getProfileEditViewModel } from "@/features/profile/services/profile-edit-view.service";
import { getPublicProfileView } from "@/features/profile/services/public-profile-view.service";
import { getCurrentSession } from "@/lib/auth/auth-session";

interface ProfilePageProps {
  params: Promise<{ username: string }>;
}

// The one public profile route — reachable while authenticated (the
// (game) route group's own layout guard applies here exactly like every
// other game page; "other players" in this feature's spec means other
// logged-in players viewing each other, not anonymous internet visitors —
// see this feature's own architecture notes for that scope call). The
// SAME page renders for every visitor, owner included — see
// getPublicProfileView's own doc comment for why isOwner only ever
// controls whether the Edit Profile button/data are present, never which
// content is shown.
export default async function ProfilePage({ params }: ProfilePageProps) {
  const { username } = await params;

  const session = await getCurrentSession();
  if (!session) {
    redirect("/");
  }

  const view = await getPublicProfileView(username, session.user.id);

  if (!view) {
    return (
      <GameScreen>
        <div dir="rtl" className="flex h-full w-full flex-col items-center justify-center gap-4 bg-slate-950 p-6 text-center">
          <BackButton />
          <p className="text-lg font-semibold text-slate-200">לא נמצא שחקן עם שם המשתמש הזה.</p>
        </div>
      </GameScreen>
    );
  }

  const editData = view.isOwner ? await getProfileEditViewModel(session.user.id, view.username) : null;

  return (
    <GameScreen>
      <ProfileContent view={view} editData={editData} />
    </GameScreen>
  );
}
