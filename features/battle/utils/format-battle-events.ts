import { getMoveById, type StatName } from "@/engine/moves";

import type { BattleActor, BattleEvent } from "@/features/battle/events/battle-event.types";
import type { MajorStatus } from "@/features/battle/status/major-status";
import type { VolatileConditionKind } from "@/features/battle/volatile/volatile-condition.types";
import { faintedMessage } from "./battle-messages";

// Phase 6A — the presentation layer's own mapping from structured Battle
// Events (features/battle/events/battle-event.types.ts) to the Hebrew
// strings a player actually reads. This is the ONLY place battle-event
// text/translation lives — the Damage Engine and the Battle Action
// Service only ever produce structured data (BattleEvent[]), never
// strings. Mirrors the existing battle-messages.ts convention (Pokémon
// names passed in as plain parameters, only the surrounding Hebrew grammar
// belongs here) and reuses faintedMessage from that same module rather
// than duplicating its wording.

export interface FormatBattleEventContext {
  playerPokemonName: string;
  enemyPokemonName: string;
}

function actorName(actor: BattleActor, context: FormatBattleEventContext): string {
  return actor === "player" ? context.playerPokemonName : context.enemyPokemonName;
}

function moveDisplayName(moveId: string): string {
  return getMoveById(moveId)?.name ?? moveId;
}

// Hebrew display name (with definite article) + grammatical gender for
// each battle stat — needed to pick the matching verb form below ("עלתה"/
// "ירדה" feminine vs. "עלה"/"ירד" masculine).
const STAT_DISPLAY: Record<StatName, { name: string; feminine: boolean }> = {
  attack: { name: "ההתקפה", feminine: true },
  defense: { name: "ההגנה", feminine: true },
  specialAttack: { name: "ההתקפה המיוחדת", feminine: true },
  specialDefense: { name: "ההגנה המיוחדת", feminine: true },
  speed: { name: "המהירות", feminine: true },
  accuracy: { name: "הדיוק", feminine: false },
  evasion: { name: "ההתחמקות", feminine: true },
};

const STATUS_APPLIED_MESSAGE: Record<MajorStatus, string> = {
  burn: "נכווה!",
  poison: "הורעל!",
  paralysis: "שותק!",
  sleep: "נרדם!",
  freeze: "קפא!",
};

const STATUS_DAMAGE_MESSAGE: Record<"burn" | "poison", string> = {
  burn: "נפגע מהכוויה!",
  poison: "נפגע מהרעל!",
};

// Phase 7 — Volatile Conditions. Functions (not plain strings) since every
// one of these needs the actor's own name interpolated in a different
// place in the sentence.
const VOLATILE_APPLIED_MESSAGE: Record<VolatileConditionKind, (name: string) => string> = {
  confusion: (name) => `${name} התבלבל!`,
  flinch: (name) => `${name} נרתע!`,
  protect: (name) => `${name} הגן על עצמו!`,
  disable: (name) => `המהלך של ${name} הושבת!`,
  encore: (name) => `${name} קיבל ביס חוזר!`,
  "leech-seed": (name) => `${name} נזרע בזרעי עלוקה!`,
  trapping: (name) => `${name} נלכד במתקפה!`,
};

const VOLATILE_ENDED_MESSAGE: Record<VolatileConditionKind, (name: string) => string> = {
  confusion: (name) => `${name} כבר לא מבולבל.`,
  flinch: (name) => `${name} כבר לא נרתע.`,
  protect: (name) => `ההגנה של ${name} הסתיימה.`,
  disable: (name) => `המהלך של ${name} כבר לא מושבת.`,
  encore: (name) => `הביס החוזר של ${name} הסתיים.`,
  "leech-seed": (name) => `${name} כבר לא נזרע.`,
  trapping: (name) => `${name} השתחרר מהלכידה!`,
};

export function formatBattleEvent(event: BattleEvent, context: FormatBattleEventContext): string {
  switch (event.type) {
    case "move-used":
      return `${actorName(event.actor, context)} השתמש ב־${moveDisplayName(event.moveId)}`;
    case "move-missed":
      return "המתקפה פספסה!";
    case "critical-hit":
      return "פגיעה קריטית!";
    case "effectiveness":
      if (event.value === "super-effective") return "המתקפה הייתה יעילה מאוד!";
      if (event.value === "not-very-effective") return "המתקפה לא הייתה יעילה במיוחד.";
      return "למתקפה לא הייתה השפעה.";
    case "damage-dealt":
      return `${actorName(event.target, context)} איבד ${event.damage} חיים.`;
    case "fainted":
      return faintedMessage(actorName(event.actor, context));
    case "action-skipped":
      return event.reason === "no-valid-target"
        ? "לא נותר יריב לתקוף!"
        : `${actorName(event.actor, context)} לא הספיק לפעול.`;
    case "stat-stage-changed": {
      const stat = STAT_DISPLAY[event.stat];
      const rose = event.newStage > event.previousStage;
      const verb = rose ? (stat.feminine ? "עלתה" : "עלה") : stat.feminine ? "ירדה" : "ירד";
      const veryIntense = Math.abs(event.newStage - event.previousStage) >= 2 ? " מאוד" : "";
      return `${stat.name} של ${actorName(event.actor, context)} ${verb}${veryIntense}!`;
    }
    case "stat-stage-limit": {
      const stat = STAT_DISPLAY[event.stat];
      const verb = event.direction === "higher" ? "לעלות" : "לרדת";
      const canVerb = stat.feminine ? "יכולה" : "יכול";
      return `${stat.name} של ${actorName(event.actor, context)} לא ${canVerb} ${verb} יותר!`;
    }
    case "status-applied":
      return `${actorName(event.actor, context)} ${STATUS_APPLIED_MESSAGE[event.status]}`;
    case "status-application-failed":
      return event.reason === "immune" ? "זה לא השפיע." : "הסטטוס לא השתנה.";
    case "status-prevented-action":
      if (event.status === "paralysis") return `${actorName(event.actor, context)} לא יכול לזוז בגלל השיתוק!`;
      if (event.status === "sleep") return `${actorName(event.actor, context)} ישן.`;
      return `${actorName(event.actor, context)} קפוא ולא יכול לזוז!`;
    case "status-recovered":
      return event.status === "sleep" ? `${actorName(event.actor, context)} התעורר!` : `${actorName(event.actor, context)} הפשיר!`;
    case "status-damage":
      return `${actorName(event.actor, context)} ${STATUS_DAMAGE_MESSAGE[event.status]}`;
    case "healed":
      return event.source === "drain"
        ? `${actorName(event.actor, context)} שאב ${event.amount} נקודות חיים!`
        : `${actorName(event.actor, context)} החזיר לעצמו ${event.amount} נקודות חיים!`;
    case "healing-failed":
      return `נקודות החיים של ${actorName(event.actor, context)} כבר מלאות.`;
    case "recoil-damage":
      return `${actorName(event.actor, context)} נפגע מהרתע ואיבד ${event.damage} נקודות חיים!`;
    case "multi-hit-complete":
      return `המתקפה פגעה ${event.hits} פעמים!`;
    case "volatile-applied":
      return VOLATILE_APPLIED_MESSAGE[event.condition](actorName(event.actor, context));
    case "volatile-application-failed":
      if (event.reason === "immune") return "זה לא השפיע.";
      if (event.reason === "already-active") return "זה כבר בתוקף.";
      if (event.reason === "failed") return "ההגנה נכשלה!";
      return "אין מהלך קודם להשתמש בו.";
    case "volatile-prevented-action":
      return event.condition === "flinch"
        ? `${actorName(event.actor, context)} נרתע ולא הצליח לפעול!`
        : `${actorName(event.actor, context)} כל כך מבולבל שהוא לא יכול לתקוף!`;
    case "volatile-recovered":
      return `${actorName(event.actor, context)} כבר לא מבולבל.`;
    case "confusion-self-damage":
      return `${actorName(event.actor, context)} פגע בעצמו מתוך בלבול!`;
    case "protected":
      return `${actorName(event.actor, context)} הגן על עצמו מפני המתקפה!`;
    case "move-disabled":
      return `המתקפה ${moveDisplayName(event.moveId)} הושבתה!`;
    case "encore-applied":
      return `${actorName(event.actor, context)} חייב להשתמש ב־${moveDisplayName(event.moveId)}!`;
    case "leech-seed-damage":
      return `${actorName(event.actor, context)} איבד חיים בגלל זרעי העלוקה!`;
    case "trapping-damage":
      return `${actorName(event.actor, context)} נפגע מהלכידה!`;
    case "volatile-ended":
      return VOLATILE_ENDED_MESSAGE[event.condition](actorName(event.actor, context));
  }
}

export function formatBattleEvents(events: readonly BattleEvent[], context: FormatBattleEventContext): string[] {
  return events.map((event) => formatBattleEvent(event, context));
}
