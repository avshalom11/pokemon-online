"use client";

import { useEffect, useRef, useState, useTransition } from "react";

import { SpriteImage } from "@/components/media/SpriteImage";
import { getFrontSpritePath } from "@/features/pokemon/media/pokemon-media-paths";
import { getTmInfoAction } from "@/features/tm-system/actions/tm-info.actions";
import {
  tmInfoAccuracyLabel,
  tmInfoAlreadyKnowsLabel,
  tmInfoEmptyMessage,
  tmInfoHeading,
  tmInfoPowerLabel,
  tmInfoTypeLabel,
  tmInfoUnavailableLabel,
  tmInfoUnknownStat,
  tmUseLoadingMessage,
} from "@/features/tm-system/messages/tm-use-messages";
import type { TmInfoResult } from "@/features/tm-system/services/tm-info.service";

interface TmInfoDialogProps {
  itemId: string;
  itemName: string;
  itemImageUrl: string;
  onClose: () => void;
}

// TM SYSTEM UI POLISH — the shared "?" info dialog, opened from either
// ShopItemCard or InventoryItemCard for a TM ("tms") item, same shape as
// EvolutionItemInfoDialog's own role on evolution products. Purely
// informational: never triggers TM selection/purchase/use of any kind — it
// only ever calls the read-only getTmInfoAction, never
// purchaseShopItemAction or teachTmAction. Data is fetched via a Server
// Action on mount (same "useEffect + startTransition + server action"
// idiom TmUsePanel already establishes) rather than computed client-side,
// since compatibility (canLearnTm) and ownership are both authoritative
// server-only facts this component must never re-derive itself.
//
// Same backdrop/dialog-box visual convention as EvolutionItemInfoDialog
// (backdrop click-to-dismiss, inner box stopPropagation, Escape closes) —
// this dialog is read-only, so dismissing it any way the player likes is
// safe.
export function TmInfoDialog({ itemId, itemName, itemImageUrl, onClose }: TmInfoDialogProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [result, setResult] = useState<TmInfoResult | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [, startTransition] = useTransition();

  useEffect(() => {
    startTransition(async () => {
      const actionResult = await getTmInfoAction(itemId);
      if (actionResult.status === "error") {
        setLoadError(true);
        return;
      }
      setResult(actionResult);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemId]);

  useEffect(() => {
    closeButtonRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const isOk = result?.status === "ok";

  return (
    <div
      dir="rtl"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tm-info-heading"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        className="flex w-full max-w-sm flex-col gap-4 rounded-2xl border border-indigo-400/30 bg-slate-900 p-6 text-center shadow-2xl"
      >
        <div className="flex flex-col items-center gap-2">
          <SpriteImage
            src={itemImageUrl}
            alt={itemName}
            className="h-16 w-16 object-contain"
            fallbackClassName="flex h-16 w-16 items-center justify-center rounded-lg border border-dashed border-white/20 bg-slate-800/60 text-slate-500"
          />
          <h2 id="tm-info-heading" className="text-lg font-bold text-slate-100">
            {itemName}
          </h2>

          {isOk ? (
            <div dir="ltr" className="flex items-center gap-3 text-xs text-slate-300">
              <span>
                {tmInfoTypeLabel} {result.moveType ?? tmInfoUnknownStat}
              </span>
              <span>
                {tmInfoPowerLabel} {result.movePower ?? tmInfoUnknownStat}
              </span>
              <span>
                {tmInfoAccuracyLabel} {result.moveAccuracy ?? tmInfoUnknownStat}
              </span>
            </div>
          ) : null}
        </div>

        <p className="text-sm font-semibold text-slate-200">{tmInfoHeading}</p>

        {loadError ? (
          <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-sm font-semibold text-rose-400">
            אירעה שגיאה בטעינת הפוקימונים, נסה שוב.
          </p>
        ) : !result ? (
          <p className="rounded-xl border border-dashed border-white/10 bg-slate-900/40 p-4 text-center text-sm text-slate-500">
            {tmUseLoadingMessage}
          </p>
        ) : result.status !== "ok" ? (
          <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-sm font-semibold text-rose-400">
            פריט TM לא תקין.
          </p>
        ) : result.compatiblePokemon.length === 0 ? (
          <p className="rounded-xl border border-dashed border-white/10 bg-slate-900/40 p-4 text-center text-sm text-slate-500">
            {tmInfoEmptyMessage}
          </p>
        ) : (
          <ul className="flex max-h-[50vh] flex-col gap-2 overflow-y-auto">
            {result.compatiblePokemon.map((pokemon) => {
              const displayName = pokemon.nickname ?? pokemon.species.name;
              const unavailableLabel = pokemon.unavailableReason ? tmInfoUnavailableLabel(pokemon.unavailableReason) : null;

              return (
                <li
                  key={pokemon.playerPokemonId}
                  className="flex items-center gap-2 rounded-xl border border-white/10 bg-slate-900/60 px-3 py-2 text-right"
                >
                  <SpriteImage
                    src={getFrontSpritePath(pokemon.species)}
                    alt={displayName}
                    className="h-10 w-10 shrink-0 object-contain"
                    fallbackClassName="flex h-10 w-10 shrink-0 items-center justify-center rounded border border-dashed border-white/20 bg-slate-800/60 text-slate-500"
                  />
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-sm font-semibold text-slate-100">{displayName}</span>
                    <span className="text-[11px] text-slate-400">
                      Lv.{pokemon.level} · {pokemon.species.name}
                    </span>
                  </div>
                  <div className="flex flex-col items-end gap-0.5">
                    {pokemon.alreadyKnowsMove ? (
                      <span className="rounded-full bg-indigo-500/20 px-2 py-0.5 text-[10px] font-semibold text-indigo-300">
                        {tmInfoAlreadyKnowsLabel}
                      </span>
                    ) : null}
                    {unavailableLabel ? <span className="text-[10px] text-amber-400">{unavailableLabel}</span> : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        <button
          ref={closeButtonRef}
          type="button"
          onClick={onClose}
          className="self-center rounded-lg border border-white/20 px-4 py-2 text-sm font-semibold text-slate-200 transition-colors hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-indigo-400/70"
        >
          סגור
        </button>
      </div>
    </div>
  );
}
