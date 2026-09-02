import type { ProfileAlignment, ProfileColorId } from "../types/profile-content.types";

// Color/alignment allowlists shared by the profile-content editor — the
// client only ever sends/receives an id string (validated server-side
// against these exact keys), never a class name or CSS value. Originally
// also held font/text-size/image-width/spacer-size allowlists for the old
// profileContentBlocks block editor; those were removed once that editor
// was retired from the UI (features/profile/rich-content's own doc
// comments) and nothing else referenced them. PROFILE_COLOR_OPTIONS/
// isProfileColorId/getProfileTextColorClassName and PROFILE_ALIGNMENT_IDS/
// isProfileAlignment/getProfileAlignmentClassName below are NOT dead code —
// the new Tiptap rich editor (features/profile/rich-content) reuses them
// verbatim rather than inventing a second, parallel color/alignment
// allowlist.
//
// swatchClassName is what the color-picker button itself shows (always a
// solid, visible fill); textClassName is what saved content actually
// renders with — kept as separate fields since a color that reads well as
// body text (e.g. gray) would be nearly invisible as a solid picker swatch
// background at the same shade, and vice versa.
export const PROFILE_COLOR_OPTIONS: {
  id: ProfileColorId;
  label: string;
  textClassName: string;
  swatchClassName: string;
}[] = [
  { id: "white", label: "לבן", textClassName: "text-white", swatchClassName: "bg-white" },
  { id: "black", label: "שחור", textClassName: "text-slate-950", swatchClassName: "bg-slate-950" },
  { id: "gray", label: "אפור", textClassName: "text-slate-300", swatchClassName: "bg-slate-500" },
  { id: "red", label: "אדום", textClassName: "text-red-400", swatchClassName: "bg-red-500" },
  { id: "blue", label: "כחול", textClassName: "text-sky-400", swatchClassName: "bg-sky-500" },
  { id: "green", label: "ירוק", textClassName: "text-emerald-400", swatchClassName: "bg-emerald-500" },
  { id: "purple", label: "סגול", textClassName: "text-purple-400", swatchClassName: "bg-purple-500" },
  { id: "yellow", label: "צהוב", textClassName: "text-yellow-300", swatchClassName: "bg-yellow-400" },
  { id: "orange", label: "כתום", textClassName: "text-orange-400", swatchClassName: "bg-orange-500" },
];

export const PROFILE_COLOR_IDS = PROFILE_COLOR_OPTIONS.map((option) => option.id) as ProfileColorId[];

export function isProfileColorId(value: string): value is ProfileColorId {
  return (PROFILE_COLOR_IDS as string[]).includes(value);
}

export function getProfileTextColorClassName(colorId: ProfileColorId): string {
  return PROFILE_COLOR_OPTIONS.find((option) => option.id === colorId)?.textClassName ?? PROFILE_COLOR_OPTIONS[0].textClassName;
}

const ALIGNMENT_CLASSNAMES: Record<ProfileAlignment, string> = {
  left: "text-left items-start",
  center: "text-center items-center",
  right: "text-right items-end",
};
export const PROFILE_ALIGNMENT_IDS = Object.keys(ALIGNMENT_CLASSNAMES) as ProfileAlignment[];
export function isProfileAlignment(value: string): value is ProfileAlignment {
  return (PROFILE_ALIGNMENT_IDS as string[]).includes(value);
}
export function getProfileAlignmentClassName(alignment: ProfileAlignment): string {
  return ALIGNMENT_CLASSNAMES[alignment];
}
