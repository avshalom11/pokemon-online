// GYM BATTLE COPY + ITEM EFFECT DISPLAY — FOCUSED POLISH — this project has
// no React-render/DOM test harness (every existing Gym task's own
// *-boundary.test.ts already establishes this convention), so the
// UI-copy/wiring invariants here are verified by reading the actual source
// text of the files this task changed; the Bag effect label itself IS a
// plain function, so that part is a real behavioral test against the REAL
// shop catalog (features/shop/data/shop-items.ts) — never a hand-copied
// percentage table.
import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";

import { GYM_BATTLE_SLOT_LABELS_HE, gymBagItemEffectLabelHe } from "@/features/gyms/data/gym-labels";
import { getShopItemById } from "@/features/shop/services/shop-catalog.service";
import { npcTeamDefeatedMessage } from "@/features/gyms/utils/gym-battle-messages";

const gymIntroDialogSrc = fs.readFileSync("features/gyms/components/GymIntroDialog.tsx", "utf8");
const gymBattleContentSrc = fs.readFileSync("features/gyms/components/GymBattleContent.tsx", "utf8");
const gymVictoryRewardDialogSrc = fs.readFileSync("features/gyms/components/GymVictoryRewardDialog.tsx", "utf8");
const gymBagPanelSrc = fs.readFileSync("features/gyms/components/GymBagPanel.tsx", "utf8");

// 1. Gym intro text is exactly the two approved lines.
test("1: the Gym intro dialog (Easy Trainer, first battle of a Gym) shows the exact approved two-line copy, Leader image/name untouched", () => {
  assert.ok(gymIntroDialogSrc.includes("נראה אם אתה באמת מוכן."), "first line must be exact");
  assert.ok(gymIntroDialogSrc.includes("תצליח לעבור את הלוחמים שלי?"), "second line must be exact");
  // The two lines must be genuinely separate text nodes (a real line break),
  // never joined back into one sentence with a space.
  assert.ok(!gymIntroDialogSrc.includes("נראה אם אתה באמת מוכן. תצליח לעבור"), "the two lines must not be re-merged into one paragraph");
  // The Leader image/name wiring (characterImageUrl/trainerName props) is
  // untouched — still the same getGymCharacterImageUrl/getGymTrainerName
  // helpers GymsContent.tsx passes in, nothing here recomputes them.
  assert.ok(gymIntroDialogSrc.includes("{trainerName}") && gymIntroDialogSrc.includes("src={characterImageUrl}"));
});

// 2/3/4. Role labels.
test("2/3/4: the Easy/Medium/Gym Leader battle role labels match the approved copy exactly; Regional Champion's own label is a separate function, untouched", () => {
  assert.equal(GYM_BATTLE_SLOT_LABELS_HE.easy, "חניך מתחיל");
  assert.equal(GYM_BATTLE_SLOT_LABELS_HE.medium, "חניך מתקדם");
  assert.equal(GYM_BATTLE_SLOT_LABELS_HE.leader, "מאמן המכון");
});

test("Regional Champion's own label (regionalChampionLabelHe) is untouched — a separate function GYM_BATTLE_SLOT_LABELS_HE never governs", () => {
  const gymLabelsSrc = fs.readFileSync("features/gyms/data/gym-labels.ts", "utf8");
  assert.ok(gymLabelsSrc.includes('return `מנהל מחוז ${REGION_DISPLAY_NAMES_HE[regionId]}`;'), "the Regional Champion label formula must be unchanged");
});

// 5. Trainee (Easy/Medium) victory text.
test("5: Easy/Medium victory text is exactly the approved sentence", () => {
  assert.equal(npcTeamDefeatedMessage(), "ניצחת את כל הפוקימונים של היריב!");
  // The ONE caller is GymEasyMediumVictoryNotice — confirms this new copy
  // actually reaches the trainee victory screen, not just the function
  // itself.
  assert.ok(gymBattleContentSrc.includes("{npcTeamDefeatedMessage()}"));
});

// 6. Leader/Champion victory copy is untouched by this task.
test("6: Gym Leader / Regional Champion victory copy remains completely unchanged by this task", () => {
  assert.ok(gymVictoryRewardDialogSrc.includes("כל הכבוד! ניצחת את ${trainerName}. לא רבים מצליחים!"), "the Leader sentence must stay exactly as before");
  assert.ok(
    gymVictoryRewardDialogSrc.includes("כל הכבוד! הוכחת שאתה ראוי למדליית המחוז. מעטים מצליחים להגיע עד כאן ולנצח אותי."),
    "the Champion sentence must stay exactly as before"
  );
});

// 7/8. Bag effect values, derived from the real catalog.
const EXPECTED_MEDICINE_EFFECTS: readonly { id: string; label: string }[] = [
  { id: "potion", label: "ריפוי: 20%" },
  { id: "super-potion", label: "ריפוי: 50%" },
  { id: "hyper-potion", label: "ריפוי: 70%" },
  { id: "max-potion", label: "ריפוי: 100%" },
  { id: "revive", label: "החייאה: 50% חיים" },
  { id: "max-revive", label: "החייאה: 100% חיים" },
];

test("7/8: every Gym-battle-supported healing/revive item shows its REAL effect (heal % or revive % HP), derived from the item's own catalog fields — not a hand-copied table", () => {
  for (const { id, label } of EXPECTED_MEDICINE_EFFECTS) {
    const item = getShopItemById(id);
    assert.ok(item, `${id} must exist in the Shop catalog`);
    // Recomputed independently here (Math.round(item.healPercent * 100))
    // from the item's OWN real fields, not copy-pasted from the label
    // table above, so this genuinely proves the display tracks the
    // catalog rather than merely restating expected strings.
    const percent = Math.round((item!.healPercent ?? 0) * 100);
    const recomputed = item!.medicineEffectKind === "revive" ? `החייאה: ${percent}% חיים` : `ריפוי: ${percent}%`;
    assert.equal(recomputed, label, `${id}'s real catalog values must produce this exact label`);
    assert.equal(gymBagItemEffectLabelHe(item!), label);
  }
});

test("8 (wiring): the Bag panel renders gymBagItemEffectLabelHe next to the item name, both in the item grid and the target-picker header — never a hardcoded percentage", () => {
  assert.ok(gymBagPanelSrc.includes("import { gymBagItemEffectLabelHe"), "must import the shared, catalog-derived label helper");
  const usageCount = gymBagPanelSrc.split("gymBagItemEffectLabelHe(").length - 1;
  assert.ok(usageCount >= 2, "the effect label must be rendered in both the item grid and the target-picker header");
  // No hardcoded "%" literal anywhere else in this file's JSX besides
  // through the helper — the quantity badge ("x{view.quantity}") is the
  // only other numeric display and doesn't use "%".
  assert.ok(!/["'`]\s*\d+%/.test(gymBagPanelSrc), "no hardcoded percentage string may appear in the Bag panel");
});

// 9. No item mechanics changed.
test("9: no item mechanics were touched — use-medicine.service.ts and gym-battle-item.service.ts still compute the actual heal/revive amount from item.healPercent, unchanged by this display-only task", () => {
  const useMedicineSrc = fs.readFileSync("features/battle/services/use-medicine.service.ts", "utf8");
  const gymBattleItemSrc = fs.readFileSync("features/gyms/services/gym-battle-item.service.ts", "utf8");
  for (const src of [useMedicineSrc, gymBattleItemSrc]) {
    assert.ok(src.includes("item.healPercent"), "the real heal/revive formula must still read straight off the catalog's own healPercent field");
  }
});
