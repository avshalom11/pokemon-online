import Link from "next/link";
import type { ReactNode } from "react";

interface NavigationCardProps {
  title: string;
  icon: ReactNode;
  href?: string;
  comingSoon?: boolean;
}

// A single big game-card. Working cards pass href; anything without a real
// destination yet passes comingSoon instead of a dead/placeholder link.
export function NavigationCard({ title, icon, href, comingSoon }: NavigationCardProps) {
  const content = (
    <div
      className={`group relative flex h-28 flex-col items-center justify-center gap-2 overflow-hidden rounded-2xl border p-4 text-center transition-all sm:h-32 ${
        comingSoon
          ? "border-white/5 bg-slate-900/40 text-slate-600"
          : "border-white/10 bg-slate-900/60 text-slate-100 hover:-translate-y-0.5 hover:border-indigo-400/50 hover:bg-slate-900/80 hover:shadow-[0_0_20px_rgba(99,102,241,0.25)]"
      }`}
    >
      <div className={`text-3xl ${comingSoon ? "opacity-40" : "text-indigo-300"}`}>{icon}</div>
      <span className="text-sm font-semibold">{title}</span>

      {comingSoon ? (
        <span className="absolute top-2 rounded-full bg-slate-800/90 px-2 py-0.5 text-[10px] font-semibold text-slate-400">
          בקרוב
        </span>
      ) : null}
    </div>
  );

  if (comingSoon || !href) {
    return (
      <div aria-disabled="true" className="cursor-default select-none">
        {content}
      </div>
    );
  }

  return (
    <Link href={href} className="block">
      {content}
    </Link>
  );
}
