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
  const { username: rawUsername } = await params;
  // URL DECODING — this Next.js version's dynamic route `params` are NOT
  // auto-decoded for page components (unlike Route Handlers, which do
  // decode them) — verified directly: a Hebrew username's dynamic segment
  // arrives here as the raw percent-encoded string (e.g.
  // "%D7%90%D7%91..."), never the real "אבשלום", so it can never match a
  // stored username and every Hebrew-username profile 404s. Decoding once
  // here — the one place this route reads the segment — keeps
  // getPublicProfileView's shared lookup flow untouched and works
  // identically for English usernames (decodeURIComponent on plain ASCII
  // is a no-op). Falls back to the raw value on a malformed sequence rather
  // than crashing — getPublicProfileView already returns null for any
  // string that doesn't match a real username, so this degrades to the
  // same "not found" UI instead of a 500.
  let username = rawUsername;
  try {
    username = decodeURIComponent(rawUsername);
  } catch {
    // Malformed percent-encoding — fall through with the raw value; the
    // lookup below simply won't match anything, same clean "not found" UI.
  }

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

  const editData = view.isOwner ? await getProfileEditViewModel(session.user.id) : null;
  // PRIVACY — the account's own email, read straight from the authenticated
  // session (never from getPublicProfileView's own query, which
  // deliberately never selects email at all — see that function's own doc
  // comment). Gated on view.isOwner here, server-side, so a non-owner
  // render never even has this value in scope, let alone in props sent to
  // the client — not a value that exists and is merely hidden by CSS/React.
  const ownerEmail = view.isOwner ? session.user.email : null;

  return (
    <GameScreen>
      <ProfileContent view={view} editData={editData} ownerEmail={ownerEmail} />
    </GameScreen>
  );
}
