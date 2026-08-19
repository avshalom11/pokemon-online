// MOVE SOUND TO TOP TOOLBAR — source-level boundary coverage for the React
// context / layout wiring / the new toolbar control, and confirming the
// old Edit Profile modal toggle is fully gone. Same "no React-render/DOM
// harness" convention every other task's own *-boundary.test.ts already
// establishes in this project.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const contextSrc = readFileSync(new URL("./sound-settings-context.tsx", import.meta.url), "utf8");
const layoutSrc = readFileSync("app/(game)/layout.tsx", "utf8");
const editModalSrc = readFileSync("features/profile/components/EditProfileModal.tsx", "utf8");
const soundToggleSrc = readFileSync("components/layout/SoundToggle.tsx", "utf8");
const headerSrc = readFileSync("components/layout/GameHeader.tsx", "utf8");

test("SoundSettingsProvider mirrors every change into the shared plain getter for non-hook code (game-audio-settings.ts) — unchanged by this task", () => {
  assert.ok(contextSrc.includes("import { setSoundEnabledMirror }"));
  assert.ok(contextSrc.includes("setSoundEnabledMirror(soundEnabled)"));
});

test("app/(game)/layout.tsx still seeds SoundSettingsProvider from the real PlayerProfile.soundEnabled, coalesced to true for a stale Prisma Client", () => {
  assert.ok(layoutSrc.includes("import { SoundSettingsProvider }"));
  assert.ok(layoutSrc.includes("<SoundSettingsProvider initial={profile.soundEnabled ?? true}>"));
});

test("SoundSettingsProvider wraps the same {children} every other page-level provider wraps, including GameHeader itself", () => {
  const providerBlock = layoutSrc.slice(layoutSrc.indexOf("<SoundSettingsProvider"), layoutSrc.lastIndexOf("</SoundSettingsProvider>"));
  assert.ok(providerBlock.includes("{children}"));
  assert.ok(providerBlock.includes("<GameHeader"), "GameHeader (and therefore the new SoundToggle inside it) must be mounted INSIDE the provider");
});

// OLD TOGGLE REMOVED — there must be exactly ONE user-facing sound control
// left (the toolbar), never two.
test("the old Edit Profile modal sound toggle is completely removed", () => {
  assert.ok(!editModalSrc.includes("סאונד במשחק"), "the old label must not appear anywhere in the edit modal");
  assert.ok(!editModalSrc.includes("הגדרות משחק"), "the old Field section must be removed");
  assert.ok(!editModalSrc.includes("soundEnabled"), "the edit modal must not reference soundEnabled in any form");
  assert.ok(!editModalSrc.includes("useSoundSettings"), "the edit modal must no longer touch the sound context at all");
});

// NEW TOOLBAR CONTROL.
test("the new toolbar control uses the exact approved Hebrew label 'סאונד'", () => {
  assert.ok(soundToggleSrc.includes(">\n      סאונד\n    <") || soundToggleSrc.includes(">סאונד<") || /סאונד\s*$/m.test(soundToggleSrc), "the visible label text must be exactly 'סאונד'");
});

test("the whole control is one clickable button that toggles on click", () => {
  assert.ok(soundToggleSrc.includes('type="button"'));
  assert.ok(soundToggleSrc.includes("onClick={handleToggle}"));
  assert.ok(soundToggleSrc.includes("setSoundEnabled(next)"), "clicking must update the live context immediately");
});

test("green indicator when ON, gray indicator when OFF", () => {
  assert.ok(/soundEnabled\s*\?\s*"bg-emerald-\d+.*"\s*:\s*"bg-slate-\d+"/.test(soundToggleSrc.replace(/\n/g, " ")), "the dot color must switch between an emerald/green class and a slate/gray class based on soundEnabled");
});

test("accessible title/aria-label reflects the current ON/OFF state", () => {
  assert.ok(soundToggleSrc.includes("title={`סאונד: ${stateLabel}`}"));
  assert.ok(soundToggleSrc.includes("aria-label={`סאונד: ${stateLabel}`}"));
  assert.ok(soundToggleSrc.includes("aria-pressed={soundEnabled}"));
});

test("persistence: the toggle calls the existing authenticated profile-update action, never a second/duplicated write path", () => {
  assert.ok(soundToggleSrc.includes('import { updateSoundEnabledAction } from "@/features/profile/actions/update-profile.action";'));
  assert.ok(soundToggleSrc.includes("updateSoundEnabledAction(next)"));
});

test("no page reload — the toggle never calls router.push/refresh or navigates in any way", () => {
  assert.ok(!soundToggleSrc.includes("router.") && !soundToggleSrc.includes("window.location"));
});

test("the control reads/writes the SAME SoundSettingsContext every battle sound respects — never a second sound state", () => {
  assert.ok(soundToggleSrc.includes('import { useSoundSettings } from "@/features/player/context/sound-settings-context";'));
  assert.ok(soundToggleSrc.includes("useSoundSettings()"));
  assert.ok(!soundToggleSrc.includes("useState") , "the toggle must not introduce its own separate local sound state — it only reads/writes the shared context");
});

test("the toolbar control is actually mounted in the header, inside the shared toolbar row alongside the other icon controls", () => {
  assert.ok(headerSrc.includes('import { SoundToggle } from "@/components/layout/SoundToggle";'));
  assert.ok(headerSrc.includes("<SoundToggle />"));
});
