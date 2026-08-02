import * as z from "zod";

import { isProfileFontId, isProfileColorId, isProfileTextSize, isProfileAlignment, isProfileImageWidth, isProfileSpacerSize } from "../themes/profile-content-styles";
import { isAllowedProfileImageId } from "../themes/profile-images";

// Safe limits — server-side, never trusted from the client. Also enforced
// live in the editor UI (features/profile/components/ProfileContentEditor.tsx)
// so a player sees the limit before hitting it, but THIS is the one place
// that actually matters: a request bypassing the UI entirely still can't
// persist more than this.
export const MAX_PROFILE_CONTENT_BLOCKS = 30;
export const MAX_TOTAL_TEXT_CHARACTERS = 2000;
export const MAX_TEXT_BLOCK_CHARACTERS = 500;

const blockIdSchema = z.string().min(1).max(64);

const fontIdSchema = z.string().refine(isProfileFontId, { error: "גופן לא חוקי" });
const colorIdSchema = z.string().refine(isProfileColorId, { error: "צבע לא חוקי" });
const textSizeSchema = z.string().refine(isProfileTextSize, { error: "גודל טקסט לא חוקי" });
const alignmentSchema = z.string().refine(isProfileAlignment, { error: "יישור לא חוקי" });

// Shared by text and heading blocks — see ProfileTextLikeFields's own doc
// comment (profile-content.types.ts) for why the two share every field.
const textLikeFieldsSchema = z.object({
  text: z
    .string()
    .trim()
    .max(MAX_TEXT_BLOCK_CHARACTERS, { error: `כל בלוק טקסט יכול להכיל עד ${MAX_TEXT_BLOCK_CHARACTERS} תווים` }),
  fontId: fontIdSchema,
  fontSize: textSizeSchema,
  alignment: alignmentSchema,
  colorId: colorIdSchema,
  backgroundColorId: colorIdSchema.optional(),
  bold: z.boolean(),
  italic: z.boolean(),
  underline: z.boolean(),
});

const textBlockSchema = textLikeFieldsSchema.extend({ id: blockIdSchema, type: z.literal("text") });
const headingBlockSchema = textLikeFieldsSchema.extend({ id: blockIdSchema, type: z.literal("heading") });

const imageBlockSchema = z.object({
  id: blockIdSchema,
  type: z.literal("image"),
  imageId: z.string().refine(isAllowedProfileImageId, { error: "תמונה לא חוקית" }),
  altText: z.string().trim().max(150, { error: "תיאור התמונה ארוך מדי" }),
  width: z.string().refine(isProfileImageWidth, { error: "רוחב לא חוקי" }),
  alignment: alignmentSchema,
});

const dividerBlockSchema = z.object({ id: blockIdSchema, type: z.literal("divider") });

const spacerBlockSchema = z.object({
  id: blockIdSchema,
  type: z.literal("spacer"),
  size: z.string().refine(isProfileSpacerSize, { error: "גודל רווח לא חוקי" }),
});

// A discriminated union keyed on `type` — Zod validates each block against
// exactly the schema matching its own type tag, so e.g. an "image" block
// can never sneak in text-block-only fields or vice versa.
export const profileContentBlockSchema = z.discriminatedUnion("type", [
  textBlockSchema,
  headingBlockSchema,
  imageBlockSchema,
  dividerBlockSchema,
  spacerBlockSchema,
]);

// The one place the FULL block list is validated — max block count, and
// (via the refine below) max total text length across every text/heading
// block combined. Never HTML, never CSS, never a class name — every field
// on every block is either a plain bounded string/boolean or a key into a
// server-defined allowlist (see the refine()s above).
export const profileContentBlocksSchema = z
  .array(profileContentBlockSchema)
  .max(MAX_PROFILE_CONTENT_BLOCKS, { error: `ניתן להוסיף עד ${MAX_PROFILE_CONTENT_BLOCKS} בלוקים` })
  .refine(
    (blocks) => {
      const totalTextLength = blocks.reduce(
        (sum, block) => (block.type === "text" || block.type === "heading" ? sum + block.text.length : sum),
        0
      );
      return totalTextLength <= MAX_TOTAL_TEXT_CHARACTERS;
    },
    { error: `סך כל הטקסט בפרופיל לא יכול לעלות על ${MAX_TOTAL_TEXT_CHARACTERS} תווים` }
  );

export type ProfileContentBlockInput = z.infer<typeof profileContentBlockSchema>;
