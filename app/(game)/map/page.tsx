import { redirect } from "next/navigation";

import { MapContent } from "./components/MapContent";
import { getCurrentSession } from "@/lib/auth/auth-session";

// The real auth + onboarding guard now lives in app/(game)/layout.tsx (this
// page is only ever reached once that guard has already passed) — the
// no-session check below exists purely so TypeScript can narrow
// session.user.id's type; getCurrentSession is cache()-wrapped, so this
// costs no extra DB round trip. MapContent itself is the original map
// page's content, unchanged.
export default async function MapPage({ searchParams }: { searchParams: Promise<{ notice?: string }> }) {
  const session = await getCurrentSession();

  if (!session) {
    redirect("/");
  }

  const { notice } = await searchParams;

  return <MapContent notice={notice} />;
}
