"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

import { startPokemonEncounter } from "@/engine/encounter/pokemon-encounter-engine";
import { POKEMON_TYPE_LABELS } from "@/shared/types/pokemon-labels";
import type { ZoneId } from "@/shared/types/zone";

export function BattleContent() {
  const searchParams = useSearchParams();
  const zone = searchParams.get("zone");

  const encounter = useMemo(() => {
    if (!zone) {
      return null;
    }

    return startPokemonEncounter(zone as ZoneId);
  }, [zone]);

  const [enemyHealth, setEnemyHealth] = useState<number | null>(
    null
  );

  const [battleMessage, setBattleMessage] = useState(
    "פוקימון פראי הופיע!"
  );

  if (!zone || !encounter) {
    return (
      <main
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "16px",
          fontFamily: "Arial",
        }}
      >
        <h1>לא נבחר אזור</h1>

        <Link href="/map">חזרה למפה</Link>
      </main>
    );
  }

  const activeEncounter = encounter;

  const currentEnemyHealth =
    enemyHealth ?? activeEncounter.currentHealth;

  const isEnemyDefeated = currentEnemyHealth <= 0;

  function handleAttack() {
    if (isEnemyDefeated) {
      return;
    }

    const damage = Math.floor(Math.random() * 6) + 5;

    const updatedHealth = Math.max(
      0,
      currentEnemyHealth - damage
    );

    setEnemyHealth(updatedHealth);

    if (updatedHealth === 0) {
      setBattleMessage(
        `${activeEncounter.pokemon.name} הובס! ניצחת בקרב.`
      );

      return;
    }

    setBattleMessage(
      `התקפת וגרמת ${damage} נקודות נזק!`
    );
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        backgroundColor: "#87ceeb",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "16px",
        fontFamily: "Arial",
        padding: "24px",
      }}
    >
      <h1>קרב פוקימון</h1>

      <p>אזור: {activeEncounter.zoneId}</p>

      <h2>{activeEncounter.pokemon.name}</h2>

      <p>{activeEncounter.pokemon.description}</p>

      <p>רמה: {activeEncounter.level}</p>

      <p>
        סוג:{" "}
        {activeEncounter.pokemon.types
          .map((type) => POKEMON_TYPE_LABELS[type])
          .join(", ")}
      </p>

      <p>
        חיים: {currentEnemyHealth} /{" "}
        {activeEncounter.maximumHealth}
      </p>

      <p
        style={{
          backgroundColor: "white",
          color: "black",
          padding: "12px 18px",
          borderRadius: "10px",
          minWidth: "280px",
          textAlign: "center",
        }}
      >
        {battleMessage}
      </p>

      <div
        style={{
          display: "flex",
          gap: "12px",
          marginTop: "20px",
        }}
      >
        <button
          type="button"
          onClick={handleAttack}
          disabled={isEnemyDefeated}
          style={{
            padding: "10px 20px",
            cursor: isEnemyDefeated
              ? "not-allowed"
              : "pointer",
          }}
        >
          התקפה
        </button>

        <Link href="/map">
          <button
            type="button"
            style={{
              padding: "10px 20px",
              cursor: "pointer",
            }}
          >
            יציאה מהקרב
          </button>
        </Link>
      </div>
    </main>
  );
}
