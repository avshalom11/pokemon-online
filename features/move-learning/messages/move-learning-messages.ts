import { MAX_KNOWN_MOVES } from "@/engine/known-moves";

// Hebrew wording for the move-learning feature — same "one dedicated
// -messages.ts per domain" precedent features/evolution/messages/
// evolution-messages.ts already established.

export const moveLearningPromptTitle = "הפוקימון שלך רוצה ללמוד מתקפה חדשה!";

export function moveLearningPromptMessage(moveName: string, learnedAtLevel: number): string {
  return `הפוקימון הגיע לרמה ${learnedAtLevel} ורוצה ללמוד את ${moveName}, אך כבר יודע ${MAX_KNOWN_MOVES} מתקפות. בחר מתקפה קיימת להחלפה, או וותר על המתקפה החדשה.`;
}

export const moveLearningNewMoveLabel = "מתקפה חדשה:";

export const moveLearningReplaceMovePrompt = "בחר מתקפה להחלפה:";

export const moveLearningLearnButtonLabel = "למד את המתקפה";

export const moveLearningDeclineButtonLabel = "אל תלמד את המתקפה";

export function moveLearningErrorMessage(action: "למד" | "דחה", status: string): string {
  return `לא ניתן היה ${action} את המתקפה (${status}).`;
}
