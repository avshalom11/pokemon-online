"use client";

import { CurrencyIcon } from "./CurrencyIcon";
import { CURRENCY_INFO_PARAGRAPHS, CURRENCY_INFO_TITLES } from "@/features/currency/messages/currency-info-messages";
import type { CurrencyType } from "@/features/currency/types/currency.types";

interface CurrencyInfoDialogProps {
  type: CurrencyType;
  onClose: () => void;
}

// CURRENCY INFO — opened by clicking either header currency pill
// (components/layout/GameHeader.tsx). One shared component for both
// currencies (never two near-duplicate dialogs) — only `type` picks the
// icon and the approved copy (currency-info-messages.ts); the dialog shell
// itself is identical either way, per this task's own "same dialog style
// for both currencies" requirement. Purely informational: no reward
// amounts/drop chances, no action beyond closing, never touches currency
// state itself. Closable both ways this task requires — the corner ✕
// (same convention HowLeaguesWorkDialog already uses) and a bottom אישור
// button (same convention PlayerLevelUpDialog/GymVictoryRewardDialog
// already use) — both call the exact same onClose, never two different
// behaviors. Centered via the SAME "fixed inset-0 flex items-center
// justify-center" pattern every other dialog in this codebase already
// uses — GameHeader.tsx is the one responsible for actually mounting this
// at the viewport root (its own <header> has a backdrop-filter, which
// would otherwise trap this centering inside the header's own small box —
// see that file's own doc comment). max-h-[85vh] + overflow-y-auto on the
// panel itself is the same "scroll internally rather than overflow the
// viewport" convention HowLeaguesWorkDialog/PokedexDetailPanel already use.
export function CurrencyInfoDialog({ type, onClose }: CurrencyInfoDialogProps) {
  const paragraphs = CURRENCY_INFO_PARAGRAPHS[type];

  return (
    <div
      dir="rtl"
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        className="relative max-h-[85vh] w-full max-w-sm overflow-y-auto rounded-2xl border border-white/10 bg-slate-900/95 p-5 shadow-[0_0_40px_rgba(99,102,241,0.25)] sm:p-7"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="סגור"
          className="absolute left-4 top-4 flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-slate-800/80 text-slate-300 hover:text-white"
        >
          ✕
        </button>

        <div className="flex items-center justify-center gap-2">
          <CurrencyIcon type={type} className="h-6 w-6" />
          <h2 className="text-lg font-bold text-slate-100">{CURRENCY_INFO_TITLES[type]}</h2>
        </div>

        <div className="mt-4 flex flex-col gap-3 text-center text-sm leading-relaxed text-slate-300">
          {paragraphs.map((paragraph, index) => (
            <p key={index} className="whitespace-pre-line">
              {paragraph}
            </p>
          ))}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-6 w-full rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-amber-500"
        >
          אישור
        </button>
      </div>
    </div>
  );
}
