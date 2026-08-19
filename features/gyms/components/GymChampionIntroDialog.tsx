"use client";

import { SpriteImage } from "@/components/media/SpriteImage";

interface GymChampionIntroDialogProps {
  championName: string;
  characterImageUrl: string;
  isPending: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

// REGIONAL CHAMPION — INTRO + VICTORY DIALOG POLISH — shown BEFORE a
// Regional Champion battle session is created, mirroring GymIntroDialog's
// own "blocking pre-battle confirmation, no session until אישור" shape
// (same component family, deliberately kept as its own file rather than a
// parameterized GymIntroDialog since the two are scoped to entirely
// different targets — see GymsContent.tsx's own onStart routing: Easy goes
// through GymIntroDialog, Regional Champion goes through this one, Medium/
// Leader go through neither). Uses the SAME shared Regional Champion
// character image (getRegionalChampionCharacterImageUrl,
// gym-trainer-images.ts) and the SAME fixed Champion name
// (getRegionalChampionTrainerName, gym-trainer-names.ts) every other Gym
// screen already reads — no new image/name data. Confirming only advances
// into the existing openSelection (read-only party-selection) flow; the
// actual NpcBattleSession is still only ever created by startGymBattleAction
// once the player also confirms their party there, exactly as before this
// dialog existed.
export function GymChampionIntroDialog({ championName, characterImageUrl, isPending, onConfirm, onCancel }: GymChampionIntroDialogProps) {
  return (
    <div dir="rtl" role="dialog" aria-modal="true" className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border border-amber-400/30 bg-slate-900 p-6 text-center shadow-2xl">
        <div className="flex justify-center">
          <SpriteImage
            src={characterImageUrl}
            alt={championName}
            className="h-24 w-24 rounded-lg object-contain"
            fallbackClassName="flex h-24 w-24 items-center justify-center rounded-lg border border-dashed border-white/20 bg-slate-800/60 text-slate-500"
          />
        </div>
        <p className="mt-3 text-sm font-semibold text-amber-300">{championName}</p>
        <p className="mt-2 text-base font-bold text-slate-100">
          עברת דרך ארוכה כדי להגיע עד אליי... אבל אל תטעה לחשוב שזה אומר שאתה מסוגל לנצח אותי.
        </p>

        <div className="mt-6 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={isPending}
            className="rounded-lg border border-white/10 bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-300 transition-colors hover:bg-slate-700 disabled:opacity-50"
          >
            ביטול
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isPending}
            className="rounded-lg bg-amber-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-amber-500 disabled:opacity-50"
          >
            אישור
          </button>
        </div>
      </div>
    </div>
  );
}
