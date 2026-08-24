import { SpriteImage } from "@/components/media/SpriteImage";
import type { HatchOutcome } from "@/features/eggs/services/hatch.service";

interface HatchResultDialogProps {
  result: HatchOutcome;
  onClose: () => void;
}

// The post-hatch reveal — purely presentational, shown once
// hatchIncubationAction already resolved successfully server-side. Same
// "no backdrop-click-to-dismiss, one explicit acknowledgement button" shell
// as EvolutionPromptDialog.tsx: a hatch result is a one-time reveal, never
// something that should be dismissible by an accidental outside click, a
// timer, or any automatic navigation — only the player's own "אישור" click
// clears it (see HatcheryContent's own onClose={() => setHatchResult(null)}).
// `result.addedToParty` reflects hatch.service.ts's own real, already-
// committed outcome (never re-derived/guessed here) — same "EGG HATCH —
// AUTO-ADD TO PARTY IF SPACE" auto-party behavior capture.service.ts's own
// attemptCapture already established, just reported here rather than acted
// on: this dialog doesn't move the Pokémon anywhere itself.
export function HatchResultDialog({ result, onClose }: HatchResultDialogProps) {
  const partyStatusMessage = result.addedToParty
    ? "הפוקימון נוסף לשישייה שלך"
    : "השישייה שלך מלאה — הפוקימון נוסף למאגר";

  return (
    <div
      dir="rtl"
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
    >
      <div className="w-full max-w-sm rounded-2xl border border-emerald-400/30 bg-slate-900 p-6 text-center shadow-2xl">
        <h2 className="text-lg font-bold text-slate-100">בקעה הביצה!</h2>

        <div className="mt-4 flex justify-center">
          <SpriteImage
            src={result.spriteUrl}
            alt={result.displayName}
            className="h-24 w-24 object-contain"
            fallbackClassName="flex h-24 w-24 items-center justify-center rounded-lg border border-dashed border-white/20 bg-slate-800/60 text-slate-500"
          />
        </div>

        <p className="mt-3 text-base font-semibold text-slate-100">בקע לך {result.displayName}!</p>
        <p dir="ltr" className="text-sm text-slate-400">
          Lv. {result.level}
        </p>

        <p className="mt-4 text-sm text-slate-300">{partyStatusMessage}.</p>

        <button
          type="button"
          onClick={onClose}
          className="mt-6 w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-500"
        >
          אישור
        </button>
      </div>
    </div>
  );
}
