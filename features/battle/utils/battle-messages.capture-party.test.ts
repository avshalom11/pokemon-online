// FIELD CAPTURE — AUTO-ADD TO PARTY IF SPACE — message text coverage.
import assert from "node:assert/strict";
import { test } from "node:test";

import { captureSucceededMessage } from "@/features/battle/utils/battle-messages";

test("added-to-party message includes the exact required Hebrew line", () => {
  assert.equal(captureSucceededMessage("Bulbasaur", true), "Bulbasaur נתפס בהצלחה! הפוקימון נוסף לשישייה שלך.");
});

test("party-full message includes the exact required Hebrew line", () => {
  assert.equal(captureSucceededMessage("Bulbasaur", false), "Bulbasaur נתפס בהצלחה! השישייה שלך מלאה — הפוקימון נוסף למאגר.");
});
