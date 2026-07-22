import { SpriteImage } from "@/components/media/SpriteImage";

interface OnboardingWelcomeProps {
  displayName: string;
}

export function OnboardingWelcome({ displayName }: OnboardingWelcomeProps) {
  return (
    <div dir="rtl" className="flex flex-col items-center gap-4 text-center">
      <SpriteImage
        src="/assets/characters/professor-oak/professor-oak.png"
        alt="פרופסור אוק"
        className="h-48 w-48 object-contain md:h-72 md:w-72"
        fallbackClassName="flex h-48 w-48 items-center justify-center rounded-full border border-dashed border-white/20 bg-slate-800/60 text-slate-500 md:h-72 md:w-72"
      />
      <h1 className="text-2xl font-bold text-slate-100">שלום, {displayName}!</h1>
      <p className="max-w-xl text-slate-300">
        ברוך הבא לעולם הפוקימונים! כל מאמן גדול מתחיל עם חבר אחד לצידו. בחר את הפוקימון הראשון שלך והתחל את המסע.
      </p>
    </div>
  );
}
