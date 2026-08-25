// Hebrew wording for the move-learning feature — same "one dedicated
// -messages.ts per domain" precedent features/evolution/messages/
// evolution-messages.ts already established.

// FIELD BATTLE MOVE LEARNING — POKÉMON NAME IN COPY: both functions below
// take the pending decision's own pokemonName (from the shared
// PendingMoveLearningView model, never a second/hardcoded lookup) so the
// player always knows which of their Pokémon the decision belongs to,
// exactly like evolutionPromptMessage already does for evolution.
export function moveLearningPromptTitle(pokemonName: string): string {
  return `${pokemonName} רוצה ללמוד מתקפה חדשה!`;
}

// Rendered with `whitespace-pre-line` by MoveLearningDecisionDialog so the
// `\n` below actually breaks the line, same two-sentence shape this task's
// own spec requires.
export function moveLearningPromptMessage(pokemonName: string, moveName: string): string {
  return `${pokemonName} רוצה ללמוד את ${moveName}.\nבחר מתקפה שברצונך להחליף, או בחר שלא ללמד את המתקפה החדשה.`;
}

export const moveLearningNewMoveLabel = "מתקפה חדשה:";

export const moveLearningReplaceMovePrompt = "בחר מתקפה להחלפה:";

export const moveLearningLearnButtonLabel = "למד את המתקפה";

export const moveLearningDeclineButtonLabel = "אל תלמד את המתקפה";

export function moveLearningErrorMessage(action: "למד" | "דחה", status: string): string {
  return `לא ניתן היה ${action} את המתקפה (${status}).`;
}
