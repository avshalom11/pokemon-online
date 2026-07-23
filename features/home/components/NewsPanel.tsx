import { PanelCard } from "./PanelCard";

// No news/CMS model exists yet — a small local list of placeholder
// editorial content (not fabricated live data) until a real feed exists.
const NEWS_ENTRIES = [
  {
    id: "welcome",
    title: "ברוכים הבאים ל-Monster Online!",
    body: "העולם עוד באיסוף כוחות — עקבו אחר העדכונים כאן.",
  },
] as const;

export function NewsPanel() {
  return (
    <PanelCard title="חדשות">
      <ul className="flex flex-col gap-3">
        {NEWS_ENTRIES.map((entry) => (
          <li key={entry.id} className="border-r-2 border-indigo-400/60 pr-3">
            <p className="text-sm font-semibold text-slate-100">{entry.title}</p>
            <p className="text-xs text-slate-500">{entry.body}</p>
          </li>
        ))}
      </ul>
    </PanelCard>
  );
}
