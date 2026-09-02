// Shared style-choice primitives for the profile-content editor — every
// style choice is a lookup KEY into a fixed, server-defined allowlist
// (features/profile/themes/profile-content-styles.ts), never a raw
// color/CSS value the client could set arbitrarily. Originally the shape
// backing the old profileContentBlocks block editor (now retired from the
// UI — see features/profile/rich-content's own doc comments); ProfileColorId
// and ProfileAlignment survive because the new Tiptap rich editor
// (features/profile/rich-content) reuses them verbatim rather than
// inventing a second, parallel color/alignment allowlist.
export type ProfileColorId = "white" | "black" | "gray" | "red" | "blue" | "green" | "purple" | "yellow" | "orange";
export type ProfileAlignment = "left" | "center" | "right";
