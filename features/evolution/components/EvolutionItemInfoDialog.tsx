import { useEffect, useRef } from "react";

import { SpriteImage } from "@/components/media/SpriteImage";
import { getEvolutionItemMappings, groupEvolutionItemMappingsBySource } from "@/features/evolution/services/evolution-item-catalog";
import { getFrontSpritePath } from "@/features/pokemon/media/pokemon-media-paths";
import { getSpeciesById } from "@/features/pokemon/services/species-catalog";

interface EvolutionItemInfoDialogProps {
  itemId: string;
  itemName: string;
  itemImageUrl: string;
  onClose: () => void;
}

// Purely informational — "which Pokémon can this evolution product evolve",
// opened from the small question-mark button on an evolution-product's
// ShopItemCard (Shop UI Redesign phase) and, as of the Mega Evolution
// naming/UI pass, InventoryItemCard too (same component, same data source,
// reused as-is — see that file's own doc comment). Deliberately has no
// purchase or item-use action of any kind: selling/buying stays
// ShopPurchasePanel/ShopPurchaseConfirmDialog's own flow, and actually
// USING an owned item to evolve a Pokémon stays EvolutionItemPanel's own
// flow (Inventory) — this dialog never calls either.
//
// Every row comes from getEvolutionItemMappings (features/evolution/
// services/evolution-item-catalog.ts), which reads
// data/pokemon/pokemon-evolutions.ts live — nothing here is a hardcoded
// per-item Pokémon list, so a future species added to an item's evolution
// entry appears automatically.
//
// GROUPED BY SOURCE SPECIES — a source with more than one branch for this
// exact item (Clamperl + Water Stone; Pikachu/Exeggcute's Alolan branches;
// Mega Stone's six X/Y/Z-branching bases — Charizard/Mewtwo/Raichu/
// Garchomp/Lucario/Absol) is shown as ONE row listing every one of its own
// targets together, never one duplicated row per target: the compatible
// BASE Pokémon is what this list communicates, and a species having
// multiple Mega/branch forms doesn't make it "more compatible" or need
// repeating. Still entirely derived from the live mapping list above (a
// client-side grouping step, never a second/hardcoded list) — so this
// applies uniformly to every evolution item, Mega Stone included, with no
// per-item special-casing.
//
// Same backdrop/dialog-box visual convention as ShopPurchaseConfirmDialog/
// InventorySellConfirmDialog (backdrop click-to-dismiss, inner box
// stopPropagation, z-[60] to sit in the Shop's own dialog layer) — unlike
// EvolutionItemConfirmDialog/EvolutionBranchChoiceDialog, which
// deliberately forbid backdrop-dismiss because THEIR choice is
// consequential; this dialog is read-only, so dismissing it any way the
// player likes (backdrop, Escape, or the close button) is safe.
export function EvolutionItemInfoDialog({ itemId, itemName, itemImageUrl, onClose }: EvolutionItemInfoDialogProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const groupedBySource = groupEvolutionItemMappingsBySource(getEvolutionItemMappings(itemId));

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

  return (
    <div
      dir="rtl"
      role="dialog"
      aria-modal="true"
      aria-labelledby="evolution-item-info-heading"
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
          <p className="text-sm font-semibold text-slate-100">{itemName}</p>
          <h2 id="evolution-item-info-heading" className="text-lg font-bold text-slate-100">
            פוקימונים שניתן לפתח
          </h2>
        </div>

        {groupedBySource.length === 0 ? (
          <p className="rounded-xl border border-dashed border-white/10 bg-slate-900/40 p-4 text-center text-sm text-slate-500">
            אין כרגע פוקימונים הידועים שמתפתחים באמצעות פריט זה.
          </p>
        ) : (
          <ul className="flex max-h-[60vh] flex-col gap-2 overflow-y-auto">
            {groupedBySource.map((group) => {
              const sourceSpecies = getSpeciesById(group.sourceSpeciesId);

              return (
                <li
                  key={group.sourceSpeciesId}
                  dir="ltr"
                  className="flex flex-wrap items-center justify-center gap-2 rounded-xl border border-white/10 bg-slate-900/60 px-3 py-2"
                >
                  {sourceSpecies ? (
                    <SpriteImage
                      src={getFrontSpritePath(sourceSpecies)}
                      alt={group.sourceName}
                      className="h-8 w-8 object-contain"
                      fallbackClassName="flex h-8 w-8 items-center justify-center rounded border border-dashed border-white/20 bg-slate-800/60 text-slate-500"
                    />
                  ) : null}
                  <span className="text-sm font-medium text-slate-100">{group.sourceName}</span>
                  <span className="text-indigo-300" aria-hidden="true">
                    →
                  </span>
                  {group.targets.map((target, index) => {
                    const targetSpecies = getSpeciesById(target.targetSpeciesId);
                    return (
                      <span key={target.targetSpeciesId} className="flex items-center gap-1.5">
                        {index > 0 ? (
                          <span className="text-slate-500" aria-hidden="true">
                            /
                          </span>
                        ) : null}
                        <span className="text-sm font-medium text-slate-100">{target.targetName}</span>
                        {targetSpecies ? (
                          <SpriteImage
                            src={getFrontSpritePath(targetSpecies)}
                            alt={target.targetName}
                            className="h-8 w-8 object-contain"
                            fallbackClassName="flex h-8 w-8 items-center justify-center rounded border border-dashed border-white/20 bg-slate-800/60 text-slate-500"
                          />
                        ) : null}
                      </span>
                    );
                  })}
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
