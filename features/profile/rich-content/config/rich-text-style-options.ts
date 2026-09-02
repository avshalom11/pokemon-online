// RICH PROFILE EDITOR (STABILIZATION) — the Word-like numeric font sizes,
// expanded font-family stack, and special text-effect ids the toolbar
// offers and the public renderer resolves — all THREE are dedicated to the
// rich editor (never reused from features/profile/themes/
// profile-content-styles.ts's own 4-size/5-font enums, which stay exactly
// as they are for the OLD block editor): the old system's ids are Tailwind
// generic-family-only and can't represent "18pt" or a real "handwritten"
// typeface, which this ticket explicitly asks for. Every id here is still
// a closed, server-defined set — never arbitrary CSS from persisted JSON —
// re-validated in rich-profile-content.schema.ts against the exact
// allowlists this file exports.

// FONT SIZE — Word-like point sizes. Stored/validated as the exact numeric
// STRING id (never a raw "18px" CSS value) — getRichTextFontSizePx is the
// ONE place an id becomes a real, hardcoded pixel value; that value is
// always one of these 20 fixed strings, never derived from user input.
export const RICH_TEXT_FONT_SIZES = [8, 9, 10, 11, 12, 14, 16, 18, 20, 22, 24, 26, 28, 32, 36, 40, 48, 54, 60, 72] as const;
export type RichTextFontSizeId = `${(typeof RICH_TEXT_FONT_SIZES)[number]}`;
export const RICH_TEXT_FONT_SIZE_IDS = RICH_TEXT_FONT_SIZES.map(String) as RichTextFontSizeId[];

export function isRichTextFontSizeId(value: string): value is RichTextFontSizeId {
  return (RICH_TEXT_FONT_SIZE_IDS as string[]).includes(value);
}

export function getRichTextFontSizePx(sizeId: RichTextFontSizeId): string {
  return `${sizeId}px`;
}

// FONT FAMILY — real CSS font-family STACKS (not Tailwind's 3 generic
// families the old system is limited to), so "handwritten"/"display" read
// as genuinely distinct typefaces. Every stack is built ONLY from fonts
// that ship with Windows/macOS (no remote @font-face — nothing insecurely
// loaded from a third party) and ends in a broadly Hebrew-capable fallback
// (Arial, sans-serif) — even where the FIRST-choice face itself has patchy
// Hebrew glyph coverage (e.g. a Latin-only display/handwritten face),
// standard CSS per-character font fallback means the browser silently
// substitutes a face that DOES have the glyph for any character the
// preferred font lacks, so Hebrew text never renders as missing/tofu
// boxes regardless of which id is chosen — this is what "Hebrew
// compatibility important, do not add a font that makes Hebrew disappear"
// requires, and every stack below is built with that guarantee in mind.
export const RICH_TEXT_FONT_FAMILY_OPTIONS: { id: string; label: string; stack: string }[] = [
  { id: "sans", label: "רגיל", stack: 'ui-sans-serif, Arial, "Segoe UI", sans-serif' },
  { id: "serif", label: "סריף", stack: 'Georgia, "Times New Roman", David, serif' },
  { id: "mono", label: "קוד (Monospace)", stack: '"Courier New", Consolas, monospace' },
  { id: "rounded", label: "מעוגל", stack: '"Segoe UI Rounded", "Comic Sans MS", Tahoma, sans-serif' },
  { id: "handwritten", label: "כתב יד", stack: '"Segoe Script", "Bradley Hand", cursive, Arial, sans-serif' },
  { id: "display", label: "מודגש/דקורטיבי", stack: '"Arial Black", Impact, Arial, sans-serif' },
  { id: "elegant", label: "אלגנטי", stack: 'Palatino, "Palatino Linotype", Georgia, serif' },
];
export type RichTextFontFamilyId = (typeof RICH_TEXT_FONT_FAMILY_OPTIONS)[number]["id"];
export const RICH_TEXT_FONT_FAMILY_IDS = RICH_TEXT_FONT_FAMILY_OPTIONS.map((option) => option.id);

export function isRichTextFontFamilyId(value: string): value is RichTextFontFamilyId {
  return RICH_TEXT_FONT_FAMILY_IDS.includes(value);
}

export function getRichTextFontFamilyStack(fontId: RichTextFontFamilyId): string {
  return RICH_TEXT_FONT_FAMILY_OPTIONS.find((option) => option.id === fontId)?.stack ?? RICH_TEXT_FONT_FAMILY_OPTIONS[0].stack;
}

// SPECIAL TEXT STYLES — fixed allowlisted ids only; every className below
// is a real, hand-written utility this app owns (Tailwind utilities for
// "gradient", small custom classes in app/globals.css for the rest) — a
// saved document only ever carries the id, never CSS. "shimmer" is the one
// animated effect: kept deliberately subtle (a slow, low-contrast opacity
// pulse — see app/globals.css's own profile-text-shimmer keyframes) rather
// than a fast/high-contrast flash, per this ticket's own "avoid extreme
// flashing" requirement.
export const RICH_TEXT_EFFECT_OPTIONS: { id: string; label: string; className: string }[] = [
  { id: "normal", label: "ללא אפקט", className: "" },
  { id: "glow", label: "זוהר", className: "profile-text-effect-glow" },
  { id: "neon", label: "ניאון", className: "profile-text-effect-neon" },
  { id: "shimmer", label: "נצנוץ", className: "profile-text-effect-shimmer" },
  { id: "shadow", label: "צל", className: "profile-text-effect-shadow" },
  { id: "gradient", label: "גרדיאנט", className: "bg-gradient-to-l from-indigo-400 via-fuchsia-400 to-amber-300 bg-clip-text text-transparent" },
];
export type RichTextEffectId = (typeof RICH_TEXT_EFFECT_OPTIONS)[number]["id"];
export const RICH_TEXT_EFFECT_IDS = RICH_TEXT_EFFECT_OPTIONS.map((option) => option.id);

export function isRichTextEffectId(value: string): value is RichTextEffectId {
  return RICH_TEXT_EFFECT_IDS.includes(value);
}

export function getRichTextEffectClassName(effectId: RichTextEffectId): string {
  return RICH_TEXT_EFFECT_OPTIONS.find((option) => option.id === effectId)?.className ?? "";
}
