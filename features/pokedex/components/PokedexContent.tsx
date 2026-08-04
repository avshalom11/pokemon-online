"use client";

import { useMemo, useState } from "react";

import { PokedexCard } from "./PokedexCard";
import { PokedexDetailPanel } from "./PokedexDetailPanel";
import { BackButton } from "@/components/layout/BackButton";
import { POKEMON_RARITY_LABELS, POKEMON_TYPE_LABELS } from "@/shared/types/pokemon-labels";
import type { PokemonRarity, PokemonType } from "@/shared/types/pokemon";
import type { PokedexEntryView, PokedexStatus } from "../types/pokedex.types";

interface PokedexContentProps {
  entries: PokedexEntryView[];
}

// "Seen" (real Pokédex convention this filter follows) means "encountered
// at all" — caught species are a subset of seen, never excluded from it;
// "Caught" is the strictly narrower filter. "Not seen" is the complement of
// both.
type StatusFilter = "all" | "seen" | "caught" | "not-seen";

const STATUS_FILTERS: { id: StatusFilter; label: string }[] = [
  { id: "all", label: "הכל" },
  { id: "seen", label: "נצפו" },
  { id: "caught", label: "נתפסו" },
  { id: "not-seen", label: "טרם נצפו" },
];

// Derived from the same label maps every other rarity/type UI in this
// project already reads (shared/types/pokemon-labels.ts) — never a second,
// hand-typed list of types/rarities.
const TYPE_OPTIONS = Object.keys(POKEMON_TYPE_LABELS) as PokemonType[];
const RARITY_OPTIONS = Object.keys(POKEMON_RARITY_LABELS) as PokemonRarity[];

function matchesStatusFilter(status: PokedexStatus, filter: StatusFilter): boolean {
  switch (filter) {
    case "all":
      return true;
    case "seen":
      return status !== "unseen";
    case "caught":
      return status === "caught";
    case "not-seen":
      return status === "unseen";
  }
}

// Page composition root for /pokedex — same shell/flow convention as
// MyPokemonContent (gradient background, radial overlay, BackButton,
// centered max-width column). All entries are fetched ONCE, server-side
// (see app/(game)/pokedex/page.tsx); every filter/search/sort below is pure
// client-side array filtering over that single already-loaded list — never
// a re-fetch, never a per-keystroke server round trip. Search only ever
// matches text a card already shows (dex number always, name only once
// seen) — never a hidden species' real name, so typing a guess can't leak
// whether an unseen entry matches.
export function PokedexContent({ entries }: PokedexContentProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [typeFilter, setTypeFilter] = useState<PokemonType | "all">("all");
  const [rarityFilter, setRarityFilter] = useState<PokemonRarity | "all">("all");
  const [selectedSpeciesId, setSelectedSpeciesId] = useState<string | null>(null);

  const selectedEntry = entries.find((entry) => entry.species.id === selectedSpeciesId && entry.status !== "unseen") ?? null;

  const filteredEntries = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return entries.filter((entry) => {
      if (!matchesStatusFilter(entry.status, statusFilter)) return false;
      if (typeFilter !== "all" && !entry.species.types.includes(typeFilter)) return false;
      if (rarityFilter !== "all" && entry.species.rarity !== rarityFilter) return false;

      if (normalizedSearch) {
        const dexMatch = String(entry.species.dexNumber).includes(normalizedSearch);
        const nameMatch = entry.status !== "unseen" && entry.species.name.toLowerCase().includes(normalizedSearch);
        if (!dexMatch && !nameMatch) return false;
      }

      return true;
    });
  }, [entries, search, statusFilter, typeFilter, rarityFilter]);

  const seenCount = entries.filter((entry) => entry.status !== "unseen").length;
  const caughtCount = entries.filter((entry) => entry.status === "caught").length;

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
          <h1 className="text-lg font-bold text-slate-100">פוקידקס</h1>
          <StatPill label="נצפו" value={`${seenCount} / ${entries.length}`} />
          <StatPill label="נתפסו" value={`${caughtCount} / ${entries.length}`} />
        </div>

        <div className="flex flex-col gap-3">
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="חיפוש לפי שם או מספר..."
            className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-4 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-indigo-400/50 focus:outline-none"
          />

          <div className="flex flex-wrap items-center gap-2">
            {STATUS_FILTERS.map((filter) => (
              <button
                key={filter.id}
                type="button"
                onClick={() => setStatusFilter(filter.id)}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                  statusFilter === filter.id
                    ? "border-indigo-400/70 bg-indigo-500/20 text-indigo-200"
                    : "border-white/10 bg-slate-900/60 text-slate-300 hover:border-indigo-400/40"
                }`}
              >
                {filter.label}
              </button>
            ))}

            <select
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value as PokemonType | "all")}
              className="rounded-full border border-white/10 bg-slate-900/60 px-3 py-1.5 text-xs font-semibold text-slate-300 focus:border-indigo-400/50 focus:outline-none"
            >
              <option value="all">כל הסוגים</option>
              {TYPE_OPTIONS.map((type) => (
                <option key={type} value={type}>
                  {POKEMON_TYPE_LABELS[type]}
                </option>
              ))}
            </select>

            <select
              value={rarityFilter}
              onChange={(event) => setRarityFilter(event.target.value as PokemonRarity | "all")}
              className="rounded-full border border-white/10 bg-slate-900/60 px-3 py-1.5 text-xs font-semibold text-slate-300 focus:border-indigo-400/50 focus:outline-none"
            >
              <option value="all">כל הנדירויות</option>
              {RARITY_OPTIONS.map((rarity) => (
                <option key={rarity} value={rarity}>
                  {POKEMON_RARITY_LABELS[rarity]}
                </option>
              ))}
            </select>
          </div>
        </div>

        {filteredEntries.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-white/10 bg-slate-900/30 p-8 text-center text-sm text-slate-500">
            לא נמצאו פוקימונים התואמים את החיפוש.
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-7 xl:grid-cols-8">
            {filteredEntries.map((entry) => (
              <PokedexCard key={entry.species.id} entry={entry} onSelect={() => setSelectedSpeciesId(entry.species.id)} />
            ))}
          </div>
        )}
      </div>

      {selectedEntry ? <PokedexDetailPanel entry={selectedEntry} onClose={() => setSelectedSpeciesId(null)} /> : null}
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
