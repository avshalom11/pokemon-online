// Hebrew wording for the TM-use feature — same "one dedicated -messages.ts
// per domain" precedent features/evolution/messages/evolution-messages.ts
// and features/move-learning/messages/move-learning-messages.ts already
// establish.

export function tmUsePanelTitle(itemName: string): string {
  return `השתמש ב-${itemName} על פוקימון`;
}

export const tmUseLoadingMessage = "בודק אילו פוקימונים תואמים...";

// STEP 4/5 — no incompatible Pokémon are ever shown at all; this is the one
// message shown in their place when the eligible list is empty (never a
// list of WHY each Pokémon was excluded — the player never needs the
// specific reason, per this feature's own "hide incompatible entirely"
// rule).
export const noEligibleTmPokemonMessage =
  "אין לך כרגע פוקימונים זמינים שיכולים ללמוד את המהלך הזה. ייתכן שאף פוקימון תואם, שכולם כבר יודעים את המהלך, או שהם נמצאים במקום שלא מאפשר שינוי מהלכים כרגע (כגון דגירה, קרב פעיל או מכירה בשוק).";

export function tmUseConfirmMessage(pokemonName: string, moveName: string): string {
  return `${pokemonName} ילמד את ${moveName}. להמשיך?`;
}

export function tmUseForgetMovePromptTitle(pokemonName: string): string {
  return `${pokemonName} כבר יודע 4 מהלכים`;
}

export function tmUseForgetMovePromptMessage(pokemonName: string, moveName: string): string {
  return `כדי ללמד את ${pokemonName} את ${moveName}, יש לבחור מהלך קיים אחד לשכוח במקומו.`;
}

export const tmUseNewMoveLabel = "מהלך חדש:";

export const tmUseForgetMovePrompt = "בחר מהלך לשכיחה:";

export const tmUseConfirmButtonLabel = "אישור";

export const tmUseCancelButtonLabel = "ביטול";

export function tmUseSuccessMessage(pokemonName: string, moveName: string): string {
  return `${pokemonName} למד בהצלחה את ${moveName}!`;
}

// TM INFO DIALOG — the "?" button's own read-only compatibility view.
export const tmInfoHeading = "פוקימונים שלך שיכולים ללמוד את המתקפה";

export const tmInfoAlreadyKnowsLabel = "כבר מכיר";

export const tmInfoEmptyMessage = "אין לך כרגע פוקימונים שתואמים למתקפה זו.";

export const tmInfoTypeLabel = "סוג:";
export const tmInfoPowerLabel = "כוח:";
export const tmInfoAccuracyLabel = "דיוק:";
export const tmInfoUnknownStat = "—";

// Optional per-Pokémon status label — informational only, never a reason
// to hide the Pokémon (see tm-info.service.ts's own doc comment).
export function tmInfoUnavailableLabel(reason: string): string | null {
  switch (reason) {
    case "in-daycare":
      return "בדגירה כרגע";
    case "in-field-battle":
    case "in-gym-battle":
    case "in-league-battle":
      return "בקרב פעיל כרגע";
    case "already-listed":
      return "רשום למכירה בשוק";
    default:
      return null;
  }
}

// Every non-success TeachTmResult status, mapped to a clear Hebrew message.
// Kept as a single lookup (rather than scattering per-branch strings across
// components) so every caller of teachTmAction shows the exact same wording
// for the exact same server-side rejection reason.
export function tmUseErrorMessage(status: string): string {
  switch (status) {
    case "not-owned":
      return "הפוקימון הזה אינו שייך לך.";
    case "invalid-item":
      return "פריט TM לא תקין.";
    case "incompatible":
      return "הפוקימון הזה אינו תואם למהלך הזה.";
    case "already-known":
      return "הפוקימון כבר יודע את המהלך הזה.";
    case "forget-slot-required":
      return "יש לבחור מהלך קיים לשכיחה.";
    case "insufficient-tm":
      return "אין לך מספיק דיסקיות מסוג זה.";
    case "unavailable":
      return "הפוקימון אינו זמין כרגע (ייתכן שהוא בדגירה, בקרב פעיל, או רשום למכירה בשוק).";
    default:
      return "אירעה שגיאה, נסה שוב.";
  }
}
