// LEAGUE — FINAL PLACEMENT CELEBRATION MODAL. No React-render/DOM harness
// exists in this project (see PokedexCard.test.ts's own doc comment) — this
// checks the mandatory-dismissal invariants via a static source read
// instead of rendering.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const modalSrc = readFileSync(new URL("./LeaguePlacementCelebrationModal.tsx", import.meta.url), "utf8");

test("the backdrop has no onClick handler — clicking outside can never close this modal", () => {
  const backdropMatch = modalSrc.match(/className="fixed inset-0[^"]*"/);
  assert.ok(backdropMatch, "expected to find the backdrop div's className");
  const backdropBlockStart = modalSrc.indexOf(backdropMatch![0]);
  const backdropBlock = modalSrc.slice(Math.max(0, backdropBlockStart - 300), backdropBlockStart);
  assert.ok(!backdropBlock.includes("onClick"), "the backdrop wrapper must never have an onClick (no click-outside-to-dismiss)");
});

test("there is no Escape-key handler anywhere in the modal", () => {
  assert.ok(!modalSrc.includes("Escape"), "this modal must never listen for or handle the Escape key");
  assert.ok(!modalSrc.includes("addEventListener"), "this modal must never attach any keydown/dismiss listener");
});

test("there is no ✕ / close button — the only actionable button is אישור", () => {
  assert.ok(!modalSrc.includes("✕"), "no X close button may exist");
  assert.ok(!/aria-label="סגור"/.test(modalSrc), "no generic close-labeled control may exist");
  const buttonCount = (modalSrc.match(/<button/g) ?? []).length;
  assert.equal(buttonCount, 1, "exactly one button must exist — the אישור confirmation");
});

test("the single button reads אישור and calls the acknowledge handler, disabled while a request is in flight", () => {
  assert.ok(modalSrc.includes(">אישור<") || modalSrc.includes(">\n          אישור\n"), "the confirm button must read אישור");
  assert.ok(modalSrc.includes("onClick={handleAcknowledge}"));
  assert.ok(modalSrc.includes("disabled={isPending}"), "the button must disable itself while a submission is in flight, preventing a duplicate double-click submission");
});

test("acknowledging calls the real server action with the real tournamentId, never an arbitrary/client-chosen playerId", () => {
  assert.ok(modalSrc.includes("import { acknowledgeLeaguePlacementCelebrationAction }"));
  assert.ok(modalSrc.includes("acknowledgeLeaguePlacementCelebrationAction(celebration.tournamentId)"));
  assert.ok(!/playerId/.test(modalSrc), "the client must never supply a playerId — ownership is derived server-side from the session");
});

test("the modal never performs any reward-granting call itself — it only ever acknowledges", () => {
  assert.ok(!modalSrc.includes("grantCompletedLeagueTournamentRewards"));
  assert.ok(!modalSrc.includes("grantCurrencyRewards"));
  assert.ok(!modalSrc.includes("addPlayerExperience"));
  assert.ok(!modalSrc.includes("grantChest"));
});

test("has a real, accessible dialog role, and is centered", () => {
  assert.ok(modalSrc.includes('role="dialog"'));
  assert.ok(modalSrc.includes('aria-modal="true"'));
  assert.ok(modalSrc.includes("items-center") && modalSrc.includes("justify-center"), "the modal must be centered on screen");
});

test("the award image is rendered via the canonical celebration.imageUrl — never a second image lookup in this component", () => {
  assert.ok(modalSrc.includes("src={celebration.imageUrl}"));
  assert.ok(!modalSrc.includes("leagueAwardImageUrl("), "this component must never call the image resolver itself — only the server-side service does");
});

test("all three placements (1st/2nd/3rd) share ONE modal component — visual escalation is only a theme lookup, never three separate components", () => {
  assert.ok(modalSrc.includes("PLACEMENT_THEME"), "placement-specific styling must be a simple lookup table keyed by place");
  assert.equal((modalSrc.match(/export function LeaguePlacementCelebrationModal/g) ?? []).length, 1);
  // No external animation/effects library — Tailwind classes only.
  assert.ok(!modalSrc.includes('from "canvas-confetti"') && !modalSrc.includes('from "framer-motion"'), "no external effects library may be introduced");
});

// ============================================================================
// VICTORY SOUND + FIREWORKS
// ============================================================================

test("the victory sound is the existing shared battle-result-sound utility — never a new Audio instance or a duplicated sound path", () => {
  assert.ok(modalSrc.includes('import { playVictorySound } from "@/features/battle/utils/battle-result-sound";'));
  assert.ok(modalSrc.includes("playVictorySound();"));
  assert.ok(!modalSrc.includes("new Audio("), "the modal must never construct its own Audio instance — it must go through the shared utility");
  assert.ok(!modalSrc.includes("/sounds/"), "the modal must never hardcode a sound file path itself");
});

test("the victory sound plays via a ref-guarded effect keyed on tournamentId — exactly once per NEW celebration, never replayed by an unrelated re-render", () => {
  assert.ok(modalSrc.includes("useRef<string | null>(null)"), "a ref must track which tournamentId's sound has already played");
  assert.ok(
    modalSrc.includes("if (playedSoundForTournamentIdRef.current === celebration.tournamentId) return;"),
    "the effect must bail out if this exact celebration's sound already played"
  );
  assert.ok(
    modalSrc.includes("playedSoundForTournamentIdRef.current = celebration.tournamentId;"),
    "the ref must be updated to this celebration's tournamentId before playing"
  );
  assert.ok(/\}, \[celebration\.tournamentId\]\);/.test(modalSrc), "the effect's dependency array must be exactly [celebration.tournamentId] — never empty, never omitted");
});

test("the fireworks layer is rendered inside the modal, positioned before the card in the DOM so it paints behind it", () => {
  assert.ok(modalSrc.includes('import { LeagueCelebrationFireworks } from "./LeagueCelebrationFireworks";'));
  const fireworksIndex = modalSrc.indexOf("<LeagueCelebrationFireworks");
  const cardIndex = modalSrc.indexOf('className={`relative flex w-full max-w-sm flex-col items-center rounded-2xl border');
  assert.ok(fireworksIndex > -1 && cardIndex > -1);
  assert.ok(fireworksIndex < cardIndex, "the fireworks layer must be declared BEFORE the card div, so it paints behind it");
});

test("the card is explicitly positioned (relative) so it reliably paints above the absolutely-positioned fireworks layer regardless of DOM order rules", () => {
  assert.ok(modalSrc.includes("`relative flex w-full max-w-sm"), "the card must be position: relative");
});

test("1st place gets more intense fireworks than 2nd/3rd, derived from celebration.place — never a separate fireworks component per placement", () => {
  assert.ok(modalSrc.includes("intense={celebration.place === 1}"));
});
