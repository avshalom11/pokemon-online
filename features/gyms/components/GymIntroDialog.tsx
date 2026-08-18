"use client";

import { SpriteImage } from "@/components/media/SpriteImage";

interface GymIntroDialogProps {
  trainerName: string;
  characterImageUrl: string;
  isPending: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

// GYM INTRO DIALOG — EASY TRAINER ONLY (later task, sections 5-8). Shown
// BEFORE the Easy Trainer's battle session is created — the Gym Leader
// "speaking to the player" before the first fight of that Gym. Uses the
// SAME shared Gym character image (getGymCharacterImageUrl,
// gym-trainer-images.ts — no new image map) and the SAME fixed Leader name
// (getGymTrainerName(..., "leader"), gym-trainer-names.ts) every other Gym
// screen already reads, so this never duplicates either data source.
// Deliberately never rendered for Medium/Leader/Champion (see
// GymsContent.tsx's own onStart routing) — this is the only place this
// component is ever mounted, so scoping it correctly there is what keeps
// this a single, non-duplicated dialog.
export function GymIntroDialog({ trainerName, characterImageUrl, isPending, onConfirm, onCancel }: GymIntroDialogProps) {
  return (
    <div dir="rtl" role="dialog" aria-modal="true" className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border border-indigo-400/30 bg-slate-900 p-6 text-center shadow-2xl">
        <div className="flex justify-center">
          <SpriteImage
            src={characterImageUrl}
            alt={trainerName}
            className="h-24 w-24 rounded-lg object-contain"
            fallbackClassName="flex h-24 w-24 items-center justify-center rounded-lg border border-dashed border-white/20 bg-slate-800/60 text-slate-500"
          />
        </div>
        <p className="mt-3 text-sm font-semibold text-indigo-300">{trainerName}</p>
        <p className="mt-2 text-base font-bold text-slate-100">נראה אם אתה באמת מוכן. תצליח לעבור את הלוחמים שלי?</p>

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
            className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 disabled:opacity-50"
          >
            אישור
          </button>
        </div>
      </div>
    </div>
  );
}
