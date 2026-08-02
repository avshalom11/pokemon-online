import { SpriteImage } from "@/components/media/SpriteImage";
import { getFrontSpritePath } from "@/features/pokemon/media/pokemon-media-paths";
import type { PublicPartyMemberView } from "../types/profile.types";

interface ProfilePartySectionProps {
  party: PublicPartyMemberView[] | null;
}

// `party` is already null here whenever the owner has hidden it (see
// public-profile-view.service.ts) — this never re-checks any privacy flag
// itself, only renders the two states that flag already resolved to.
// Each entry only ever carries dexNumber/displayName/level (never an id,
// XP, moves, or any other private field) — see PublicPartyMemberView's own
// doc comment for why that's a real, structural guarantee.
export function ProfilePartySection({ party }: ProfilePartySectionProps) {
  return (
    <section dir="rtl" className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
      <h2 className="mb-3 text-xs font-semibold tracking-wide text-slate-400 uppercase">השישייה הפעילה</h2>

      {party === null ? (
        <p className="text-center text-sm text-slate-500">המשתמש בחר להסתיר את השישייה שלו.</p>
      ) : party.length === 0 ? (
        <p className="text-center text-sm text-slate-500">אין פוקימונים בשישייה כרגע.</p>
      ) : (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {party.map((member, index) => (
            <div
              key={`${member.dexNumber}-${index}`}
              className="flex flex-col items-center gap-1 rounded-xl border border-white/10 bg-slate-950/40 p-2 text-center"
            >
              <SpriteImage
                src={getFrontSpritePath(member.dexNumber)}
                alt={member.displayName}
                className="h-12 w-12 object-contain sm:h-14 sm:w-14"
                fallbackClassName="flex h-12 w-12 items-center justify-center rounded-lg border border-dashed border-white/20 bg-slate-800/60 text-slate-500 sm:h-14 sm:w-14"
              />
              <span className="truncate text-[11px] font-semibold text-slate-100">{member.displayName}</span>
              <span className="text-[10px] text-slate-400">Lv.{member.level}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
