"use client";

import { useEffect, useRef, useState, useTransition } from "react";

import { PartySection } from "./PartySection";
import { PokemonDetailsPanel } from "./PokemonDetailsPanel";
import { PokemonGrid } from "./PokemonGrid";
import { BackButton } from "@/components/layout/BackButton";
import { CollectionPicker } from "@/features/party/components/CollectionPicker";
import { assignPartySlotAction, swapPartySlotsAction } from "@/features/party/actions/party.actions";
import type { MyPokemonViewData } from "@/features/pokemon/services/my-pokemon-view.service";
import { MAX_ACTIVE_TEAM_SIZE } from "@/shared/types/player";

interface MyPokemonContentProps {
  data: MyPokemonViewData;
}

// Page composition root for /my-pokemon — mirrors HomeContent's role for
// Home (same background/atmosphere treatment for visual continuity).
//
// Party slot clicks behave differently depending on mode: outside edit mode,
// clicking an occupied slot opens the same PokemonDetailsPanel the
// collection grid uses (remove/make-leader live there already). In edit
// mode, clicking an empty slot opens CollectionPicker (add), and clicking
// two occupied slots in sequence swaps them (reorder) — a lightweight
// alternative to drag & drop.
export function MyPokemonContent({ data }: MyPokemonContentProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [armedSlot, setArmedSlot] = useState<number | null>(null);
  const [pickerSlot, setPickerSlot] = useState<number | null>(null);
  const [partyError, setPartyError] = useState<string | null>(null);
  const [releaseNotice, setReleaseNotice] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const releaseNoticeTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (releaseNoticeTimeout.current) clearTimeout(releaseNoticeTimeout.current);
  }, []);

  const selectedPokemon = data.collection.find((p) => p.id === selectedId) ?? null;

  // Released Pokémon disappear from `data.collection` on their own — the
  // server action's revalidatePath("/my-pokemon") refreshes this page's own
  // server-fetched data automatically (same mechanism assign/remove/swap
  // already rely on), no manual list-patching needed here. This handler
  // only owns the transient success banner.
  function handleReleaseSuccess(releasedName: string) {
    setReleaseNotice(`${releasedName} שוחרר בהצלחה.`);
    if (releaseNoticeTimeout.current) clearTimeout(releaseNoticeTimeout.current);
    releaseNoticeTimeout.current = setTimeout(() => setReleaseNotice(null), 4000);
  }

  function handlePartySlotSelect(slotIndex: number) {
    const occupant = data.party.find((p) => p.partySlot === slotIndex) ?? null;

    if (!isEditMode) {
      if (occupant) setSelectedId(occupant.id);
      return;
    }

    if (!occupant) {
      setPickerSlot(slotIndex);
      return;
    }

    if (armedSlot === null) {
      setArmedSlot(slotIndex);
      return;
    }

    if (armedSlot === slotIndex) {
      setArmedSlot(null);
      return;
    }

    const fromSlot = armedSlot;
    setArmedSlot(null);
    setPartyError(null);
    startTransition(async () => {
      const result = await swapPartySlotsAction(fromSlot, slotIndex);
      if (result.status !== "ok") setPartyError("החלפת המשבצות נכשלה.");
    });
  }

  function handleCollectionPick(pokemonId: string) {
    if (pickerSlot === null) return;
    const slotIndex = pickerSlot;
    setPickerSlot(null);
    setPartyError(null);
    startTransition(async () => {
      const result = await assignPartySlotAction(pokemonId, slotIndex);
      if (result.status !== "ok") setPartyError("הוספת הפוקימון לצוות נכשלה.");
    });
  }

  return (
    <div
      dir="rtl"
      className="relative h-full w-full overflow-y-auto bg-gradient-to-b from-slate-950 via-indigo-950/40 to-slate-950"
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 40% at 50% 0%, rgba(129,90,238,0.16), transparent 60%), radial-gradient(ellipse 50% 30% at 90% 100%, rgba(99,102,241,0.12), transparent 60%)",
        }}
      />

      <div className="relative mx-auto flex max-w-5xl flex-col gap-6 p-4 sm:p-6 lg:p-8">
        <BackButton />

        <div className="flex flex-wrap items-center gap-3">
          <StatPill label="סה״כ פוקימונים" value={data.collection.length.toString()} />
          <StatPill label="גודל צוות" value={`${data.party.length} / ${MAX_ACTIVE_TEAM_SIZE}`} />
          <button
            type="button"
            onClick={() => {
              setIsEditMode((current) => !current);
              setArmedSlot(null);
              setPartyError(null);
            }}
            className={`rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
              isEditMode
                ? "border-indigo-400/70 bg-indigo-500/20 text-indigo-200"
                : "border-white/10 bg-slate-900/60 text-slate-300 hover:border-indigo-400/40"
            }`}
          >
            {isEditMode ? "סיום עריכה" : "ערוך צוות"}
          </button>
        </div>

        {isEditMode ? (
          <p className="text-xs text-slate-500">
            {armedSlot !== null
              ? `נבחרה משבצת ${armedSlot} — לחץ על משבצת נוספת כדי להחליף, או שוב על אותה משבצת לביטול.`
              : "לחץ על משבצת ריקה כדי להוסיף פוקימון, או על שתי משבצות תפוסות ברצף כדי להחליף ביניהן."}
          </p>
        ) : null}
        {partyError ? <p className="text-xs text-rose-400">{partyError}</p> : null}
        {releaseNotice ? <p className="text-xs text-emerald-400">{releaseNotice}</p> : null}

        <PartySection
          party={data.party}
          variant="detailed"
          onSlotSelect={handlePartySlotSelect}
          disabledSlotIndexes={isPending ? [1, 2, 3, 4, 5, 6] : undefined}
        />

        <section>
          <h2 className="mb-3 text-sm font-semibold tracking-wide text-slate-400 uppercase">האוסף שלי</h2>
          <PokemonGrid pokemon={data.collection} onSelect={setSelectedId} />
        </section>
      </div>

      {selectedPokemon ? (
        <PokemonDetailsPanel
          pokemon={selectedPokemon}
          trainerName={data.displayName}
          party={data.party}
          totalOwnedCount={data.collection.length}
          onClose={() => setSelectedId(null)}
          onReleaseSuccess={handleReleaseSuccess}
        />
      ) : null}

      {pickerSlot !== null ? (
        <CollectionPicker
          slotIndex={pickerSlot}
          collection={data.collection.filter((p) => p.partySlot === null)}
          onSelect={handleCollectionPick}
          onClose={() => setPickerSlot(null)}
        />
      ) : null}
    </div>
  );
}

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 rounded-full border border-white/10 bg-slate-900/60 px-4 py-2">
      <span dir="ltr" className="text-sm font-bold text-slate-100">
        {value}
      </span>
      <span className="text-xs text-slate-500">{label}</span>
    </div>
  );
}
