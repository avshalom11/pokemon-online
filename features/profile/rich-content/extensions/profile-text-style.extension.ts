import { TextStyle } from "@tiptap/extension-text-style";

import { getProfileTextColorClassName } from "@/features/profile/themes/profile-content-styles";
import {
  getRichTextEffectClassName,
  getRichTextFontFamilyStack,
  getRichTextFontSizePx,
} from "@/features/profile/rich-content/config/rich-text-style-options";
import type { ProfileColorId } from "@/features/profile/types/profile-content.types";
import type { RichTextEffectId, RichTextFontFamilyId, RichTextFontSizeId } from "@/features/profile/rich-content/config/rich-text-style-options";

// RICH PROFILE EDITOR (PHASE A/B, STABILIZATION) — extends Tiptap's own
// TextStyle mark with FOUR closed-set attributes (colorId/fontId/sizeId/
// effectId), deliberately NOT Tiptap's official @tiptap/extension-color /
// @tiptap/extension-font-family — those store a raw CSS
// `style="color: ..."` / `style="font-family: ..."` string, which is
// exactly the "arbitrary CSS" the approved security direction rules out.
// This extension instead stores only an id (validated server-side against
// the allowlists in rich-text-style-options.ts, colorId against
// profile-content-styles.ts's own palette — never a raw value), and
// resolves that id to a real className/style ONLY for the editor's own
// live contentEditable DOM via renderHTML below — editor.getJSON() (what
// actually gets persisted — see
// features/profile/rich-content/components/RichProfileEditor.tsx) reads
// the mark's own `attrs` directly and is completely independent of
// renderHTML/parseHTML, so the persisted document only ever contains
// `{ type: "textStyle", attrs: { colorId, fontId, sizeId, effectId } }` —
// never a class name, never a CSS string.
//
// LIVE FORMATTING — this is what makes "select text, click a color, it's
// red immediately" (the ticket's own example) work: renderHTML below runs
// on every edit, live, inside the editor's own contentEditable DOM, which
// is exactly what a WYSIWYG editor's "live" behavior means. The PUBLIC
// renderer (RichProfileContentRenderer.tsx) resolves the very same ids
// through the very same className/style functions — the editing canvas and
// the final public render therefore always agree pixel-for-pixel on how a
// given colorId/fontId/sizeId/effectId actually looks.
//
// fontId/sizeId use `style` (a real font-family stack / an exact pixel
// value — see rich-text-style-options.ts's own doc comment for why these
// can't be plain Tailwind classes) rather than `class`; colorId/effectId
// use `class` (Tailwind utilities / the fixed app/globals.css classes).
// Tiptap merges every attribute's own renderHTML output onto the same
// rendered <span> (concatenating multiple `style`/`class` values rather
// than overwriting), so a run with e.g. both fontId and sizeId set gets
// both style rules on one element.
export const ProfileTextStyleExtension = TextStyle.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      colorId: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute("data-color-id"),
        renderHTML: (attributes: { colorId?: ProfileColorId | null }) => {
          if (!attributes.colorId) return {};
          return { "data-color-id": attributes.colorId, class: getProfileTextColorClassName(attributes.colorId) };
        },
      },
      fontId: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute("data-font-id"),
        renderHTML: (attributes: { fontId?: RichTextFontFamilyId | null }) => {
          if (!attributes.fontId) return {};
          return {
            "data-font-id": attributes.fontId,
            style: `font-family: ${getRichTextFontFamilyStack(attributes.fontId)};`,
          };
        },
      },
      sizeId: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute("data-size-id"),
        renderHTML: (attributes: { sizeId?: RichTextFontSizeId | null }) => {
          if (!attributes.sizeId) return {};
          return {
            "data-size-id": attributes.sizeId,
            style: `font-size: ${getRichTextFontSizePx(attributes.sizeId)};`,
          };
        },
      },
      effectId: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute("data-effect-id"),
        renderHTML: (attributes: { effectId?: RichTextEffectId | null }) => {
          if (!attributes.effectId || attributes.effectId === "normal") return {};
          return { "data-effect-id": attributes.effectId, class: getRichTextEffectClassName(attributes.effectId) };
        },
      },
    };
  },
});
