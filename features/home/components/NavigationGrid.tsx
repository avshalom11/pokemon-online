import { NavigationCard } from "./NavigationCard";

const NAVIGATION_ITEMS = [
  { title: "מפה", icon: "🗺️", href: "/map" },
  { title: "הפוקימונים שלי", icon: "🐾", href: "/my-pokemon" },
  { title: "תיק ציוד", icon: "🎒", comingSoon: true },
  { title: "פוקידקס", icon: "📖", comingSoon: true },
  { title: "חנות", icon: "🛒", comingSoon: true },
] as const;

export function NavigationGrid() {
  return (
    <section dir="rtl">
      <h2 className="mb-3 text-sm font-semibold tracking-wide text-slate-400 uppercase">תפריט המשחק</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {NAVIGATION_ITEMS.map((item) => (
          <NavigationCard
            key={item.title}
            title={item.title}
            icon={item.icon}
            href={"href" in item ? item.href : undefined}
            comingSoon={"comingSoon" in item ? item.comingSoon : undefined}
          />
        ))}
      </div>
    </section>
  );
}
