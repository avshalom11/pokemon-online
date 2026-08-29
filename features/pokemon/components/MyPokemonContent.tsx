"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";

import { PartySection } from "./PartySection";
import { PokemonDetailsPanel } from "./PokemonDetailsPanel";
import { PokemonGrid } from "./PokemonGrid";
import { BackButton } from "@/components/layout/BackButton";
import { REGION_DISPLAY_NAMES_HE } from "@/features/gyms/data/gym-labels";
import { CollectionPicker } from "@/features/party/components/CollectionPicker";
import { assignPartySlotAction, swapPartySlotsAction } from "@/features/party/actions/party.actions";
import type { MyPokemonViewData } from "@/features/pokemon/services/my-pokemon-view.service";
import { ALL_MY_POKEMON_FILTERS, filterMyPokemonCollection, type MyPokemonFilterState } from "@/features/pokemon/utils/my-pokemon-filters";
import { useTutorial, useTutorialTarget } from "@/features/tutorial/context/tutorial-context";
import { formatPokemonTypesLabel } from "@/lib/battle/pokemonTypeLabel";
import { MAX_ACTIVE_TEAM_SIZE } from "@/shared/types/player";
import { POKEMON_RARITY_LABELS, POKEMON_TYPE_LABELS } from "@/shared/types/pokemon-labels";
import type { PokemonRarity, PokemonType } from "@/shared/types/pokemon";
import type { RegionId } from "@/shared/types/region";

interface MyPokemonContentProps {
  data: MyPokemonViewData;
}

// MY POKÉMON — REGION / RARITY / TYPE FILTERS. Same bare-name Hebrew region
// labels the Pokédex's own region filter uses (REGION_DISPLAY_NAMES_HE,
// features/gyms/data/gym-labels.ts) and the same canonical rarity label map
// every other rarity UI in this project already reads
// (shared/types/pokemon-labels.ts) — never a second, hand-typed list.
const REGION_OPTIONS = Object.keys(REGION_DISPLAY_NAMES_HE) as RegionId[];
const RARITY_OPTIONS = Object.keys(POKEMON_RARITY_LABELS) as PokemonRarity[];
// Same canonical type list the Pokédex's own type filter already derives
// from POKEMON_TYPE_LABELS' keys — never a second, hand-typed enumeration.
// Labels themselves are deliberately ENGLISH here (unlike the Pokédex's own
// type filter, which stays Hebrew per that page's existing convention) —
// reuses the exact same English-type-label formatter the battle UI already
// established (lib/battle/pokemonTypeLabel.ts) rather than a second
// type-label table. formatPokemonTypesLabel joins multiple types with
// " / ", but each option here is always exactly one type, so this simply
// capitalizes it.
const TYPE_OPTIONS = Object.keys(POKEMON_TYPE_LABELS) as PokemonType[];

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
  // MY POKÉMON — REGION / RARITY / TYPE FILTERS. One combined state object
  // (rather than three separate useState calls) so changing one filter via
  // its own setter spread (see the three onChange handlers below) can never
  // accidentally reset the other two — each stays "all" until the player
  // explicitly changes it. Pure client-side filtering over data.collection
  // (already the page's own once-loaded, Daycare-excluded list — see
  // my-pokemon-view.service.ts) — never a re-fetch.
  const [filters, setFilters] = useState<MyPokemonFilterState>(ALL_MY_POKEMON_FILTERS);
  const filteredCollection = useMemo(() => filterMyPokemonCollection(data.collection, filters), [data.collection, filters]);

  // GAME TUTORIAL — PHASE 1. Spotlights the whole party section (never a
  // single card pulled out of PartySlot/PartySection — both are reused on
  // Home and in PartySelector too, so surgically targeting one card inside
  // them would leak this feature's own concern into components unaware of
  // it). reportAction("starter-details-opened") fires the instant the
  // player opens ANY occupied slot's details in view mode AND that slot's
  // own occupant really is the Starter (never merely "party slot 1", in
  // case a swap ever moved the Starter elsewhere) — a no-op unless the
  // Tutorial is currently awaiting exactly this action.
  const partySectionTargetRef = useTutorialTarget("my-pokemon-party-section");
  const { reportAction } = useTutorial();

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
      if (occupant) {
        setSelectedId(occupant.id);
        if (occupant.isStarter) reportAction("starter-details-opened");
      }
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

        <div ref={partySectionTargetRef}>
          <PartySection
            party={data.party}
            variant="detailed"
            onSlotSelect={handlePartySlotSelect}
            disabledSlotIndexes={isPending ? [1, 2, 3, 4, 5, 6] : undefined}
          />
        </div>

        <section>
          <h2 className="mb-3 text-sm font-semibold tracking-wide text-slate-400 uppercase">האוסף שלי</h2>

          {/* MY POKÉMON — REGION / RARITY / TYPE FILTERS. Same compact
              rounded-pill <select> styling the Pokédex's own filters
              already use, for visual consistency across both screens.
              Each select's own descriptive "all" option ("כל המחוזות" /
              "כל הנדירויות" / "כל הסוגים") is the easy way back to
              unfiltered for that one filter — no separate reset button
              needed, and changing one never touches the other two (see
              `filters`' own doc comment above). */}
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <select
              value={filters.region}
              onChange={(event) => setFilters((current) => ({ ...current, region: event.target.value as RegionId | "all" }))}
              className="rounded-full border border-white/10 bg-slate-900/60 px-3 py-1.5 text-xs font-semibold text-slate-300 focus:border-indigo-400/50 focus:outline-none"
            >
              <option value="all">כל המחוזות</option>
              {REGION_OPTIONS.map((region) => (
                <option key={region} value={region}>
                  {REGION_DISPLAY_NAMES_HE[region]}
                </option>
              ))}
            </select>

            <select
              value={filters.rarity}
              onChange={(event) => setFilters((current) => ({ ...current, rarity: event.target.value as PokemonRarity | "all" }))}
              className="rounded-full border border-white/10 bg-slate-900/60 px-3 py-1.5 text-xs font-semibold text-slate-300 focus:border-indigo-400/50 focus:outline-none"
            >
              <option value="all">כל הנדירויות</option>
              {RARITY_OPTIONS.map((rarity) => (
                <option key={rarity} value={rarity}>
                  {POKEMON_RARITY_LABELS[rarity]}
                </option>
              ))}
            </select>

            <select
              value={filters.type}
              onChange={(event) => setFilters((current) => ({ ...current, type: event.target.value as PokemonType | "all" }))}
              className="rounded-full border border-white/10 bg-slate-900/60 px-3 py-1.5 text-xs font-semibold text-slate-300 focus:border-indigo-400/50 focus:outline-none"
              dir="ltr"
            >
              <option value="all">כל הסוגים</option>
              {TYPE_OPTIONS.map((type) => (
                <option key={type} value={type}>
                  {formatPokemonTypesLabel([type])}
                </option>
              ))}
            </select>
          </div>

          <PokemonGrid
            pokemon={filteredCollection}
            onSelect={setSelectedId}
            emptyMessage={
              filters.region !== "all" || filters.rarity !== "all" || filters.type !== "all"
                ? "לא נמצאו פוקימונים התואמים את הסינון שנבחר."
                : undefined
            }
          />
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
