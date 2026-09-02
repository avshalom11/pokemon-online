import * as z from "zod";

import { isProfileAlignment, isProfileColorId } from "@/features/profile/themes/profile-content-styles";
import { isRichTextEffectId, isRichTextFontFamilyId, isRichTextFontSizeId } from "@/features/profile/rich-content/config/rich-text-style-options";
import type {
  RichBlockNode,
  RichInlineNode,
  RichTextBulletListNode,
  RichTextHeadingNode,
  RichTextListItemNode,
  RichTextOrderedListNode,
  RichTextParagraphNode,
} from "@/features/profile/rich-content/types/rich-profile-content.types";

// RICH PROFILE EDITOR (PHASE A) — the ONE place the rich-content document
// is actually enforced (features/profile/rich-content/types/
// rich-profile-content.types.ts only documents the shape this validates).
// Same philosophy the older features/profile/validation/
// profile-content.schema.ts already established for profileContentBlocks:
// safe bounded limits, checked server-side on every write AND every read
// (see parse-rich-profile-content.ts), never trusted from the client even
// though the Tiptap editor's own extension config already constrains what
// it CAN produce — this is what actually matters if that config is ever
// bypassed (a hand-crafted request, a future editor bug).
export const MAX_RICH_CONTENT_TEXT_CHARACTERS = 4000;
export const MAX_RICH_CONTENT_NODES = 500;
export const MAX_RICH_CONTENT_SERIALIZED_BYTES = 20_000;

// http/https only — never javascript:, data:, or any other scheme. A
// malformed URL (new URL() throwing) is rejected the same as an unsafe
// scheme, never allowed through as "at least it didn't crash".
export function isSafeHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

const textAlignSchema = z.string().refine(isProfileAlignment, { error: "יישור לא חוקי" });

// MARKS — exactly the five this feature supports; bold/italic/underline
// carry no attrs at all (nothing to validate beyond the literal type tag).
const boldMarkSchema = z.strictObject({ type: z.literal("bold") });
const italicMarkSchema = z.strictObject({ type: z.literal("italic") });
const underlineMarkSchema = z.strictObject({ type: z.literal("underline") });

const linkMarkSchema = z.strictObject({
  type: z.literal("link"),
  attrs: z.strictObject({
    href: z
      .string()
      .trim()
      .min(1)
      .max(2000)
      .refine(isSafeHttpUrl, { error: "קישור לא חוקי — מותרים רק קישורי http/https" }),
  }),
});

// TEXT STYLE — color is a lookup key into the same palette
// profileContentBlocks already uses; font/size/effect are each a lookup
// key into this feature's own dedicated allowlists (rich-text-style-
// options.ts — never Tailwind-generic-only like the old block editor's
// ProfileFontId/ProfileTextSize, and never a raw px/CSS value) — see this
// mark's own doc comment in rich-profile-content.types.ts. Every key
// absent is valid (a plain, unstyled text run, or "normal" for effectId).
const textStyleMarkSchema = z.strictObject({
  type: z.literal("textStyle"),
  attrs: z.strictObject({
    colorId: z.string().refine(isProfileColorId, { error: "צבע לא חוקי" }).nullable().optional(),
    fontId: z.string().refine(isRichTextFontFamilyId, { error: "גופן לא חוקי" }).nullable().optional(),
    sizeId: z.string().refine(isRichTextFontSizeId, { error: "גודל לא חוקי" }).nullable().optional(),
    effectId: z.string().refine(isRichTextEffectId, { error: "אפקט לא חוקי" }).nullable().optional(),
  }),
});

const markSchema = z.discriminatedUnion("type", [
  boldMarkSchema,
  italicMarkSchema,
  underlineMarkSchema,
  linkMarkSchema,
  textStyleMarkSchema,
]);

const textNodeSchema = z.strictObject({
  type: z.literal("text"),
  text: z.string().min(1),
  marks: z.array(markSchema).max(10).optional(),
});

const hardBreakNodeSchema = z.strictObject({ type: z.literal("hardBreak") });

// RECURSIVE NODES — paragraph/heading hold inline content (text/hardBreak);
// bulletList/orderedList hold listItem, which itself holds block content
// (paragraph/heading/nested lists) — the exact same nesting Tiptap's own
// StarterKit list schema produces. z.lazy() is required here since Zod
// can't otherwise resolve a schema that references itself before it's
// fully defined; the explicit z.ZodType<...> annotation on each is what
// keeps every one of these actually type-checked against
// rich-profile-content.types.ts's own shapes rather than silently
// widening to `any`.
const inlineNodeSchema: z.ZodType<RichInlineNode> = z.lazy(() => z.union([textNodeSchema, hardBreakNodeSchema]));

const paragraphNodeSchema: z.ZodType<RichTextParagraphNode> = z.lazy(() =>
  z.strictObject({
    type: z.literal("paragraph"),
    attrs: z.strictObject({ textAlign: textAlignSchema.optional() }).optional(),
    content: z.array(inlineNodeSchema).max(MAX_RICH_CONTENT_NODES).optional(),
  })
);

const headingNodeSchema: z.ZodType<RichTextHeadingNode> = z.lazy(() =>
  z.strictObject({
    type: z.literal("heading"),
    attrs: z.strictObject({
      level: z.union([z.literal(1), z.literal(2), z.literal(3)]),
      textAlign: textAlignSchema.optional(),
    }),
    content: z.array(inlineNodeSchema).max(MAX_RICH_CONTENT_NODES).optional(),
  })
);

const listItemNodeSchema: z.ZodType<RichTextListItemNode> = z.lazy(() =>
  z.strictObject({
    type: z.literal("listItem"),
    content: z.array(blockNodeSchema).max(MAX_RICH_CONTENT_NODES).optional(),
  })
);

const bulletListNodeSchema: z.ZodType<RichTextBulletListNode> = z.lazy(() =>
  z.strictObject({
    type: z.literal("bulletList"),
    content: z.array(listItemNodeSchema).max(MAX_RICH_CONTENT_NODES).optional(),
  })
);

const orderedListNodeSchema: z.ZodType<RichTextOrderedListNode> = z.lazy(() =>
  z.strictObject({
    type: z.literal("orderedList"),
    attrs: z.strictObject({ start: z.number().int().min(1).max(9999) }).optional(),
    content: z.array(listItemNodeSchema).max(MAX_RICH_CONTENT_NODES).optional(),
  })
);

const blockNodeSchema: z.ZodType<RichBlockNode> = z.lazy(() =>
  z.union([paragraphNodeSchema, headingNodeSchema, bulletListNodeSchema, orderedListNodeSchema])
);

// Full-tree walkers for the two document-wide limits below — plain
// recursion over the ALREADY-VALIDATED node shape (this only ever runs
// inside .refine(), after every individual node has already passed its own
// schema), so no defensive type-narrowing is needed here.
function sumTextLength(node: RichBlockNode | RichInlineNode | RichTextListItemNode): number {
  let total = node.type === "text" ? node.text.length : 0;
  if ("content" in node && node.content) {
    for (const child of node.content) total += sumTextLength(child);
  }
  return total;
}

function countNodes(node: RichBlockNode | RichInlineNode | RichTextListItemNode): number {
  let total = 1;
  if ("content" in node && node.content) {
    for (const child of node.content) total += countNodes(child);
  }
  return total;
}

// The one place the FULL document is validated — structure (via the node
// union above), plus the two document-wide caps (total text length, total
// node count) profileContentBlocksSchema's own refine() already established
// the precedent for, plus a raw serialized-size ceiling as a blunt backstop
// against pathological attribute/nesting abuse that individual node caps
// wouldn't otherwise catch.
export const richProfileContentDocSchema = z
  .strictObject({
    type: z.literal("doc"),
    content: z.array(blockNodeSchema).max(MAX_RICH_CONTENT_NODES),
  })
  .refine((doc) => JSON.stringify(doc).length <= MAX_RICH_CONTENT_SERIALIZED_BYTES, {
    error: `מסמך התוכן גדול מדי (מעל ${MAX_RICH_CONTENT_SERIALIZED_BYTES} תווים)`,
  })
  .refine((doc) => doc.content.reduce((sum, node) => sum + sumTextLength(node), 0) <= MAX_RICH_CONTENT_TEXT_CHARACTERS, {
    error: `סך כל הטקסט לא יכול לעלות על ${MAX_RICH_CONTENT_TEXT_CHARACTERS} תווים`,
  })
  .refine((doc) => doc.content.reduce((sum, node) => sum + countNodes(node), 1) <= MAX_RICH_CONTENT_NODES, {
    error: "יותר מדי רכיבים במסמך",
  });

export type RichProfileContentDocInput = z.infer<typeof richProfileContentDocSchema>;
