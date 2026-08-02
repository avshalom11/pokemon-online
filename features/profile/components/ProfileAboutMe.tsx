interface ProfileAboutMeProps {
  aboutMe: string | null;
}

// Renders the bio as plain text content ONLY — never
// dangerouslySetInnerHTML — so it can never carry HTML/links as markup
// regardless of what characters `aboutMe` contains. `aboutMe` is already
// null here whenever it should be hidden (empty, or the owner turned the
// section off — see public-profile-view.service.ts), so this renders
// nothing at all in that case rather than an empty section.
export function ProfileAboutMe({ aboutMe }: ProfileAboutMeProps) {
  if (!aboutMe) return null;

  return (
    <section dir="rtl" className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
      <h2 className="mb-2 text-xs font-semibold tracking-wide text-slate-400 uppercase">אודות</h2>
      <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-200">{aboutMe}</p>
    </section>
  );
}
