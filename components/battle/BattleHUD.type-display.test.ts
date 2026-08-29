// BATTLE UI — TYPE DISPLAY, PER-SIDE PRESENTATION. The player keeps the
// inline "Name (Type / Type)" format; the opponent's type moves to the
// metadata line under the name, alongside rarity: "(rarity) (Type / Type)".
// BattleHUD distinguishes the two via an explicit `side: "player" | "enemy"`
// prop that BattleScene passes at its own two call sites — never inferred
// from participant fields (rarity/experience aren't reliable side signals
// across every battle mode this component is shared by). No React-render/
// DOM harness exists in this project (lib/battle/gym-battle-backgrounds.
// test.ts and BattleContent's own test files already establish this
// source-level convention) — verified via real source text on the actual,
// unmodified BattleHUD.tsx/BattleScene.tsx.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const hudSource = readFileSync(new URL("./BattleHUD.tsx", import.meta.url), "utf8");
const sceneSource = readFileSync(new URL("./BattleScene.tsx", import.meta.url), "utf8");

test("BattleHUD sources the type label from the participant's own canonical types[], via the shared formatter — never a hardcoded per-species string", () => {
  assert.ok(hudSource.includes('import { formatPokemonTypesLabel } from "@/lib/battle/pokemonTypeLabel";'));
  assert.ok(hudSource.includes("formatPokemonTypesLabel(participant.types)"));
  assert.ok(!/\b(Electric|Fire|Water|Flying|Grass|Poison)\b\s*[,:]/.test(hudSource), "must never hardcode a real type name literal for a specific Pokémon");
});

test("side is an explicit prop, never inferred from rarity/experience (unreliable across Gym/League)", () => {
  assert.ok(hudSource.includes('side: "player" | "enemy";'), "BattleHUDProps must declare an explicit side prop");
  assert.ok(hudSource.includes("const isPlayer = side ==="), "the component must branch on the explicit side prop");
});

test("PLAYER: a single type still renders inline, on the same line as the name — 'Name (Type)'", () => {
  const nameIndex = hudSource.indexOf("{participant.name}");
  const inlineTypeIndex = hudSource.indexOf("isPlayer && typesLabel");
  assert.ok(nameIndex > -1 && inlineTypeIndex > -1);
  assert.ok(inlineTypeIndex > nameIndex, "the player's inline type check must come after the name in the same span");

  const inlineTypeBlock = hudSource.slice(inlineTypeIndex, hudSource.indexOf("? (", inlineTypeIndex) + 200);
  assert.ok(inlineTypeBlock.includes("({typesLabel})"), "the player's inline type must be wrapped in parentheses");
  assert.ok(inlineTypeBlock.includes('dir="ltr"'), "the inline type text must be explicitly LTR");
});

test("PLAYER: a dual type renders inline exactly like a single type (same code path, formatPokemonTypesLabel already joins with ' / ')", () => {
  // There is only ONE inline-type branch for the player — single vs. dual
  // is entirely formatPokemonTypesLabel's own concern (already tested in
  // pokemonTypeLabel.test.ts), never a second branch here.
  const occurrences = hudSource.split("isPlayer && typesLabel").length - 1;
  assert.equal(occurrences, 1, "there must be exactly one player inline-type branch, handling both single and dual types uniformly");
});

test("PLAYER: the inline type is nested INSIDE the same truncating name span — never its own separate line", () => {
  const nameIndex = hudSource.indexOf("{participant.name}");
  const inlineTypeIndex = hudSource.indexOf("isPlayer && typesLabel");
  const betweenNameAndType = hudSource.slice(nameIndex, inlineTypeIndex);
  assert.ok(!betweenNameAndType.includes("</span>"), "the name's own span must not close before the player's inline type — they must share one line");
});

test("OPPONENT (enemy): the type is NOT inline with the name — the name span never renders it for the enemy side", () => {
  const nameSpanStart = hudSource.indexOf('<span className="font-fantasy min-w-0 truncate');
  const nameSpanEnd = hudSource.indexOf("</span>", hudSource.indexOf("isPlayer && typesLabel"));
  const nameSpanBlock = hudSource.slice(nameSpanStart, nameSpanEnd);

  assert.ok(nameSpanBlock.includes("isPlayer && typesLabel"), "the inline type inside the name span must be explicitly gated on isPlayer");
  assert.ok(!nameSpanBlock.includes("!isPlayer"), "the name span itself must never special-case the enemy side to add type text");
});

test("OPPONENT (enemy): single and dual type both render on the metadata line as '(rarity) (Type)' / '(rarity) (Type / Type)', never inline", () => {
  const metadataBlockStart = hudSource.indexOf("!isPlayer && (rarityLabel || typesLabel)");
  assert.ok(metadataBlockStart > -1, "the metadata line must be explicitly gated on the enemy side (!isPlayer)");

  const metadataBlock = hudSource.slice(metadataBlockStart, hudSource.indexOf("<HealthBar"));
  assert.ok(metadataBlock.includes("({rarityLabel})"), "rarity must render wrapped in its own parentheses on the metadata line");
  assert.ok(metadataBlock.includes("({typesLabel})"), "type must render wrapped in its own parentheses on the metadata line");
  // formatPokemonTypesLabel already joins dual types with " / " (verified in
  // pokemonTypeLabel.test.ts) — this line has no separate dual-type branch,
  // so a single ({typesLabel}) span correctly covers both cases.
});

test("OPPONENT (enemy): rarity and type are kept as separate sibling spans, never concatenated into one bidi-mixed string", () => {
  const metadataBlockStart = hudSource.indexOf("!isPlayer && (rarityLabel || typesLabel)");
  const metadataBlock = hudSource.slice(metadataBlockStart, hudSource.indexOf("<HealthBar"));

  const raritySpanIndex = metadataBlock.indexOf("({rarityLabel})");
  const typeSpanIndex = metadataBlock.indexOf("({typesLabel})");
  assert.ok(raritySpanIndex > -1 && typeSpanIndex > -1);

  const typeSpanOpenTag = metadataBlock.slice(metadataBlock.lastIndexOf("<span", typeSpanIndex), metadataBlock.indexOf(">", metadataBlock.lastIndexOf("<span", typeSpanIndex)) + 1);
  assert.ok(typeSpanOpenTag.includes('dir="ltr"'), "the type span on the metadata line must be explicitly LTR, isolated from the Hebrew rarity span");
});

test("OPPONENT (enemy): the metadata line renders type alone (no rarity) when rarity is absent — e.g. Gym/League opponents", () => {
  const metadataBlockStart = hudSource.indexOf("!isPlayer && (rarityLabel || typesLabel)");
  const metadataBlock = hudSource.slice(metadataBlockStart, hudSource.indexOf("<HealthBar"));
  assert.ok(metadataBlock.includes("rarityLabel ? (") && metadataBlock.includes("typesLabel ? ("), "rarity and type must each be independently conditional, so either can render alone");
});

test("the previous player-only rarity-line implementation is gone — the metadata line's condition now includes !isPlayer", () => {
  assert.ok(!hudSource.includes("{rarityLabel ? (\n          <span className=\"mt-0.5 block truncate"), "the old standalone rarity-only line must be replaced by the combined, side-gated metadata line");
});

test("the type text stays visually smaller/subtler than the name in both presentations", () => {
  const inlineTypeIndex = hudSource.indexOf("isPlayer && typesLabel");
  const inlineSpanStart = hudSource.indexOf("<span", inlineTypeIndex);
  const inlineSpanTag = hudSource.slice(inlineSpanStart, hudSource.indexOf(">", inlineSpanStart) + 1);
  assert.ok(inlineSpanTag.includes("text-[10px]") && inlineSpanTag.includes("text-slate-400"));

  const metadataBlockStart = hudSource.indexOf("!isPlayer && (rarityLabel || typesLabel)");
  const metadataTypeSpanStart = hudSource.indexOf("<span", hudSource.indexOf("({typesLabel})", metadataBlockStart) - 200);
  const metadataTypeSpanTag = hudSource.slice(metadataTypeSpanStart, hudSource.indexOf(">", metadataTypeSpanStart) + 1);
  assert.ok(metadataTypeSpanTag.includes("text-[10px]") && metadataTypeSpanTag.includes("text-slate-400"));
});

test("the existing HP bar, status badge, level badge, and XP bar rendering are all still present and unmoved by this change", () => {
  assert.ok(hudSource.includes("<HealthBar current={participant.currentHealth} max={participant.maxHealth} />"));
  assert.ok(hudSource.includes("STATUS_BADGE[participant.status]"));
  assert.ok(hudSource.includes("רמה {participant.level}"));
  assert.ok(hudSource.includes("<PokemonXpBar experience={experience} />"));
});

test("BattleScene renders BOTH player and enemy through the exact same BattleHUD component, each with its own explicit side prop", () => {
  const playerHud = sceneSource.match(/<BattleHUD theme=\{theme\} participant=\{player\} side="player"/);
  const enemyHud = sceneSource.match(/<BattleHUD theme=\{theme\} participant=\{enemy\} side="enemy"/);
  assert.ok(playerHud, "the player side must render through BattleHUD with side=\"player\"");
  assert.ok(enemyHud, "the enemy side must render through BattleHUD with side=\"enemy\"");
});
