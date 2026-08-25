// FIELD BATTLE MOVE LEARNING — POKÉMON NAME IN COPY: the dialog must always
// show which Pokémon a pending move-learning decision belongs to, using the
// real display/species name already resolved onto the view model — never a
// hardcoded string in React. Source-level check (see this same directory's
// own move-learning-ux.test.ts for why: no React-render/DOM harness in this
// project).
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const dialogSrc = readFileSync(new URL("./MoveLearningDecisionDialog.tsx", import.meta.url), "utf8");
const gateSrc = readFileSync(new URL("./PendingMoveLearningGate.tsx", import.meta.url), "utf8");
const messagesSrc = readFileSync(new URL("../messages/move-learning-messages.ts", import.meta.url), "utf8");

test("MoveLearningDecisionDialog takes pokemonName as a prop and never hardcodes a Pokémon name", () => {
  assert.match(dialogSrc, /pokemonName: string;/);
  assert.ok(dialogSrc.includes("moveLearningPromptTitle(pokemonName)"));
  assert.ok(dialogSrc.includes("moveLearningPromptMessage(pokemonName, pending.moveName)"));
});

test("the shared Hebrew copy puts the Pokémon name first, exactly as this task's own required structure", () => {
  assert.match(messagesSrc, /`\$\{pokemonName\} רוצה ללמוד מתקפה חדשה!`/);
  assert.match(
    messagesSrc,
    /`\$\{pokemonName\} רוצה ללמוד את \$\{moveName\}\.\\nבחר מתקפה שברצונך להחליף, או בחר שלא ללמד את המתקפה החדשה\.`/
  );
});

test("PendingMoveLearningGate passes the real pokemonName from its own fetched view — never a placeholder", () => {
  assert.ok(gateSrc.includes("pokemonName={view?.pokemonName ?? \"\"}"));
});

test("the move comparison UI (new move + all 4 known moves with type/power/accuracy, replace/decline) is unchanged", () => {
  assert.ok(dialogSrc.includes("moveLearningNewMoveLabel"));
  assert.ok(dialogSrc.includes("moveLearningReplaceMovePrompt"));
  assert.ok(dialogSrc.includes("knownMoves.map((move)"));
  assert.match(dialogSrc, /power \?\? "—"/);
  assert.match(dialogSrc, /accuracy \?\? "—"/);
});
