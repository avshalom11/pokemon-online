"use client";

import { useState, useTransition } from "react";

import { setWildLevelBracketAction } from "@/features/player/actions/set-wild-level-bracket.action";
import type { UnlockedBracketOption } from "@/features/player/services/wild-level-preference.service";

interface WildLevelBracketSelectorProps {
  unlocked: UnlockedBracketOption[];
  selectedIndex: number;
}

// MAP — SELECTABLE WILD LEVEL RANGE. Plain inline-style control matching
// MapContent.tsx's own existing architecture (that file uses hand-written
// style objects, not Tailwind/CSS modules — see its own doc comment on
// being moved verbatim from the old page.tsx) — deliberately NOT
// restyled/redesigned to match this project's newer Tailwind components.
// Only ever offers brackets already in `unlocked` (server-computed from the
// player's CURRENT level, see wild-level-preference.service.ts) — a locked
// higher bracket is never even rendered as an option, so there is nothing
// for the player to select that the server would reject; the server-side
// validation in setWildLevelBracketPreference is the real guard regardless
// (defense in depth, never trusted from this component alone).
export function WildLevelBracketSelector({ unlocked, selectedIndex }: WildLevelBracketSelectorProps) {
  const [liveSelectedIndex, setLiveSelectedIndex] = useState(selectedIndex);
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const current = unlocked.find((bracket) => bracket.index === liveSelectedIndex);

  function handleChange(event: React.ChangeEvent<HTMLSelectElement>) {
    const nextIndex = Number(event.target.value);
    const previousIndex = liveSelectedIndex;
    setErrorMessage(null);
    setLiveSelectedIndex(nextIndex);

    startTransition(async () => {
      const result = await setWildLevelBracketAction(nextIndex);

      if (result.status !== "success") {
        // Never trust the optimistic update once the server disagrees —
        // revert to whatever was actually persisted before this attempt.
        setLiveSelectedIndex(previousIndex);
        setErrorMessage("לא ניתן לבחור טווח זה כרגע.");
      }
    });
  }

  return (
    <div
      dir="rtl"
      style={{
        alignSelf: "flex-end",
        marginTop: "16px",
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-end",
        gap: "4px",
        fontFamily: "Arial",
      }}
    >
      <label htmlFor="wild-level-bracket-select" style={{ fontSize: "14px", fontWeight: "bold" }}>
        טווח רמות לקרבות
      </label>

      <select
        id="wild-level-bracket-select"
        value={liveSelectedIndex}
        onChange={handleChange}
        disabled={isPending}
        style={{
          padding: "8px 12px",
          borderRadius: "6px",
          border: "1px solid white",
          backgroundColor: "rgba(0, 0, 0, 0.3)",
          color: "white",
          fontFamily: "Arial",
          fontSize: "14px",
          cursor: isPending ? "wait" : "pointer",
        }}
      >
        {unlocked.map((bracket) => (
          <option key={bracket.index} value={bracket.index} style={{ color: "black" }}>
            {bracket.minimumWildLevel}–{bracket.maximumWildLevel}
          </option>
        ))}
      </select>

      {current ? (
        <span style={{ fontSize: "12px", opacity: 0.85 }}>
          נבחר: רמות {current.minimumWildLevel}–{current.maximumWildLevel}
        </span>
      ) : null}

      {errorMessage ? (
        <span style={{ fontSize: "12px", color: "#f87171" }}>{errorMessage}</span>
      ) : null}
    </div>
  );
}
