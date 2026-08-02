// Structured public-showcase content — NEVER HTML/CSS. Every block is a
// plain, closed-shape record; styling is always a lookup KEY into a
// server-defined allowlist (features/profile/themes/profile-content-styles.ts),
// never a raw color/CSS value the client could set arbitrarily. This is
// the exact shape persisted (as a JSON array) on
// PlayerProfile.profileContentBlocks and re-validated on every read AND
// write through the matching Zod schema (features/profile/validation/
// profile-content.schema.ts) — this file has no validation logic of its
// own, only the shape.
export type ProfileFontId = "default" | "serif" | "rounded" | "pixel" | "handwritten";
export type ProfileColorId = "white" | "black" | "gray" | "red" | "blue" | "green" | "purple" | "yellow" | "orange";
export type ProfileTextSize = "small" | "medium" | "large" | "xl";
export type ProfileAlignment = "left" | "center" | "right";
export type ProfileImageWidth = "small" | "medium" | "large" | "full";
export type ProfileSpacerSize = "small" | "medium" | "large";

// Shared by both text-like block types (text/heading) — a heading is only
// ever a semantic ("this is a title", rendered as an <h2>/<h3>) and default
// size distinction, never a different set of styling options.
interface ProfileTextLikeFields {
  text: string;
  fontId: ProfileFontId;
  fontSize: ProfileTextSize;
  alignment: ProfileAlignment;
  colorId: ProfileColorId;
  // Absent (undefined) means "no background" — never a separate
  // "transparent" color id.
  backgroundColorId?: ProfileColorId;
  bold: boolean;
  italic: boolean;
  underline: boolean;
}

export interface ProfileTextBlock extends ProfileTextLikeFields {
  id: string;
  type: "text";
}

export interface ProfileHeadingBlock extends ProfileTextLikeFields {
  id: string;
  type: "heading";
}

export interface ProfileImageBlock {
  id: string;
  type: "image";
  // A key into the fixed, server-defined image allowlist (features/
  // profile/themes/profile-images.ts) — never a raw/external URL. See
  // that module's own doc comment for why (no upload system exists yet).
  imageId: string;
  altText: string;
  width: ProfileImageWidth;
  alignment: ProfileAlignment;
}

export interface ProfileDividerBlock {
  id: string;
  type: "divider";
}

export interface ProfileSpacerBlock {
  id: string;
  type: "spacer";
  size: ProfileSpacerSize;
}

export type ProfileContentBlock =
  | ProfileTextBlock
  | ProfileHeadingBlock
  | ProfileImageBlock
  | ProfileDividerBlock
  | ProfileSpacerBlock;
