import type { ProfileAlignment, ProfileColorId } from "@/features/profile/types/profile-content.types";
import type { RichTextEffectId, RichTextFontFamilyId, RichTextFontSizeId } from "@/features/profile/rich-content/config/rich-text-style-options";

// RICH PROFILE EDITOR (PHASE A) — the structured document shape stored on
// PlayerProfile.richProfileContent. This is a DELIBERATELY CONSTRAINED
// subset of Tiptap/ProseMirror's own JSON document shape (the exact same
// property names/nesting Tiptap's editor.getJSON() produces, so it can be
// fed straight into `editor.commands.setContent(doc)` on load with zero
// transformation) — never arbitrary HTML/CSS, and never every node/mark
// type Tiptap itself is capable of producing. Every node/mark type here has
// a matching literal in features/profile/rich-content/validation/
// rich-profile-content.schema.ts's Zod schema, which is the ONE place this
// shape is actually enforced (this file only documents it) — and every
// style-ish attribute (colorId/fontId/sizeId/textAlign) is a lookup KEY
// into the SAME server-defined allowlists the older
// profileContentBlocks system already established
// (features/profile/themes/profile-content-styles.ts's ProfileColorId/
// ProfileFontId/ProfileTextSize/ProfileAlignment) — reused verbatim rather
// than inventing a second, parallel set of ids, so both systems render
// visually consistent colors/fonts/sizes during the DEV transition where
// they coexist.
export interface RichTextMarkBold {
  type: "bold";
}
export interface RichTextMarkItalic {
  type: "italic";
}
export interface RichTextMarkUnderline {
  type: "underline";
}
export interface RichTextMarkLink {
  type: "link";
  // http/https only — enforced in the Zod schema (isSafeHttpUrl), never
  // trusted as-is here or client-side.
  attrs: { href: string };
}
// TEXT STYLE — the one mark carrying color/font/size/special-effect,
// deliberately never a raw CSS `style` string (unlike Tiptap's own
// official Color/FontFamily extensions, which store literal CSS) — see
// features/profile/rich-content/extensions/profile-text-style.extension.ts
// for the custom Tiptap mark that produces exactly this attrs shape.
// fontId/sizeId/effectId are the rich-editor-specific allowlists
// (features/profile/rich-content/config/rich-text-style-options.ts) —
// deliberately NOT profile-content.types.ts's own ProfileFontId/
// ProfileTextSize (those stay exactly as-is for the OLD block editor,
// which has no numeric-size or expanded-font-family concept). colorId
// alone is still shared with the old system's ProfileColorId — a color
// swatch is the one style dimension both editors already agree on.
export interface RichTextMarkTextStyle {
  type: "textStyle";
  attrs: {
    colorId?: ProfileColorId | null;
    fontId?: RichTextFontFamilyId | null;
    sizeId?: RichTextFontSizeId | null;
    effectId?: RichTextEffectId | null;
  };
}

export type RichTextMark = RichTextMarkBold | RichTextMarkItalic | RichTextMarkUnderline | RichTextMarkLink | RichTextMarkTextStyle;

export interface RichTextTextNode {
  type: "text";
  text: string;
  marks?: RichTextMark[];
}
// Shift+Enter soft line break — a leaf node with no text/attrs of its own,
// so it carries zero injection surface; allowed purely for Word-like feel.
export interface RichTextHardBreakNode {
  type: "hardBreak";
}

export interface RichTextParagraphNode {
  type: "paragraph";
  attrs?: { textAlign?: ProfileAlignment };
  content?: RichInlineNode[];
}
export interface RichTextHeadingNode {
  type: "heading";
  attrs: { level: 1 | 2 | 3; textAlign?: ProfileAlignment };
  content?: RichInlineNode[];
}
export interface RichTextBulletListNode {
  type: "bulletList";
  content?: RichTextListItemNode[];
}
export interface RichTextOrderedListNode {
  type: "orderedList";
  attrs?: { start?: number };
  content?: RichTextListItemNode[];
}
export interface RichTextListItemNode {
  type: "listItem";
  content?: RichBlockNode[];
}

export type RichInlineNode = RichTextTextNode | RichTextHardBreakNode;
export type RichBlockNode = RichTextParagraphNode | RichTextHeadingNode | RichTextBulletListNode | RichTextOrderedListNode;

// The full persisted document — PlayerProfile.richProfileContent's shape
// once parsed. null (the column itself is nullable, no @default) means "the
// owner has never saved anything through the new editor yet" — kept
// distinct from an empty doc ({ type: "doc", content: [] }, which the
// editor itself produces the moment a player opens it with nothing typed)
// so the public renderer can tell "never touched" apart from "explicitly
// saved as empty" if that distinction ever matters later; today both
// render nothing, same as ProfileContentBlock's own empty-array handling.
export interface RichProfileContentDoc {
  type: "doc";
  content: RichBlockNode[];
}
