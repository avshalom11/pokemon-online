import type {
  ProfileAlignment,
  ProfileColorId,
  ProfileFontId,
  ProfileImageWidth,
  ProfileSpacerSize,
  ProfileTextSize,
} from "../types/profile-content.types";

// Every style choice a content block can make is a lookup KEY into one of
// these fixed maps — the client only ever sends/receives an id string
// (validated server-side against these exact keys — see
// features/profile/validation/profile-content.schema.ts), never a class
// name or CSS value. This is the one place a font/color id is ever turned
// into real Tailwind classes.
//
// This project bundles no extra font files/families — the five font ids
// are deliberately built entirely from Tailwind's three built-in generic
// families (sans/serif/mono) plus italic/tracking variations, so "pixel"/
// "rounded"/"handwritten" are approximations, not real distinct typefaces.
// Swapping in real font files later only means changing the className
// here — every block that already chose one of these ids is unaffected.
export const PROFILE_FONT_OPTIONS: { id: ProfileFontId; label: string; className: string }[] = [
  { id: "default", label: "רגיל", className: "font-sans" },
  { id: "serif", label: "סריף", className: "font-serif" },
  { id: "rounded", label: "מעוגל", className: "font-sans tracking-wide" },
  { id: "pixel", label: "פיקסלי", className: "font-mono" },
  { id: "handwritten", label: "כתב יד", className: "font-serif italic" },
];

export const PROFILE_FONT_IDS = PROFILE_FONT_OPTIONS.map((option) => option.id) as ProfileFontId[];

export function isProfileFontId(value: string): value is ProfileFontId {
  return (PROFILE_FONT_IDS as string[]).includes(value);
}

export function getProfileFontClassName(fontId: ProfileFontId): string {
  return PROFILE_FONT_OPTIONS.find((option) => option.id === fontId)?.className ?? PROFILE_FONT_OPTIONS[0].className;
}

// swatchClassName is what the color-picker button itself shows (always a
// solid, visible fill); textClassName/backgroundColorClassName are what a
// saved block actually renders with — kept as separate fields since a
// color that reads well as body text (e.g. gray) would be nearly invisible
// as a solid picker swatch background at the same shade, and vice versa.
export const PROFILE_COLOR_OPTIONS: {
  id: ProfileColorId;
  label: string;
  textClassName: string;
  backgroundColorClassName: string;
  swatchClassName: string;
}[] = [
  { id: "white", label: "לבן", textClassName: "text-white", backgroundColorClassName: "bg-white/90", swatchClassName: "bg-white" },
  {
    id: "black",
    label: "שחור",
    textClassName: "text-slate-950",
    backgroundColorClassName: "bg-slate-950/80",
    swatchClassName: "bg-slate-950",
  },
  {
    id: "gray",
    label: "אפור",
    textClassName: "text-slate-300",
    backgroundColorClassName: "bg-slate-700/60",
    swatchClassName: "bg-slate-500",
  },
  { id: "red", label: "אדום", textClassName: "text-red-400", backgroundColorClassName: "bg-red-950/50", swatchClassName: "bg-red-500" },
  {
    id: "blue",
    label: "כחול",
    textClassName: "text-sky-400",
    backgroundColorClassName: "bg-sky-950/50",
    swatchClassName: "bg-sky-500",
  },
  {
    id: "green",
    label: "ירוק",
    textClassName: "text-emerald-400",
    backgroundColorClassName: "bg-emerald-950/50",
    swatchClassName: "bg-emerald-500",
  },
  {
    id: "purple",
    label: "סגול",
    textClassName: "text-purple-400",
    backgroundColorClassName: "bg-purple-950/50",
    swatchClassName: "bg-purple-500",
  },
  {
    id: "yellow",
    label: "צהוב",
    textClassName: "text-yellow-300",
    backgroundColorClassName: "bg-yellow-950/50",
    swatchClassName: "bg-yellow-400",
  },
  {
    id: "orange",
    label: "כתום",
    textClassName: "text-orange-400",
    backgroundColorClassName: "bg-orange-950/50",
    swatchClassName: "bg-orange-500",
  },
];

export const PROFILE_COLOR_IDS = PROFILE_COLOR_OPTIONS.map((option) => option.id) as ProfileColorId[];

export function isProfileColorId(value: string): value is ProfileColorId {
  return (PROFILE_COLOR_IDS as string[]).includes(value);
}

export function getProfileTextColorClassName(colorId: ProfileColorId): string {
  return PROFILE_COLOR_OPTIONS.find((option) => option.id === colorId)?.textClassName ?? PROFILE_COLOR_OPTIONS[0].textClassName;
}

export function getProfileBackgroundColorClassName(colorId: ProfileColorId): string {
  return (
    PROFILE_COLOR_OPTIONS.find((option) => option.id === colorId)?.backgroundColorClassName ??
    PROFILE_COLOR_OPTIONS[0].backgroundColorClassName
  );
}

const FONT_SIZE_CLASSNAMES: Record<ProfileTextSize, string> = {
  small: "text-xs",
  medium: "text-sm",
  large: "text-lg",
  xl: "text-2xl",
};
export const PROFILE_TEXT_SIZE_IDS = Object.keys(FONT_SIZE_CLASSNAMES) as ProfileTextSize[];
export function isProfileTextSize(value: string): value is ProfileTextSize {
  return (PROFILE_TEXT_SIZE_IDS as string[]).includes(value);
}
export function getProfileFontSizeClassName(size: ProfileTextSize): string {
  return FONT_SIZE_CLASSNAMES[size];
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

const IMAGE_WIDTH_CLASSNAMES: Record<ProfileImageWidth, string> = {
  small: "max-w-[120px]",
  medium: "max-w-[240px]",
  large: "max-w-[400px]",
  full: "max-w-full",
};
export const PROFILE_IMAGE_WIDTH_IDS = Object.keys(IMAGE_WIDTH_CLASSNAMES) as ProfileImageWidth[];
export function isProfileImageWidth(value: string): value is ProfileImageWidth {
  return (PROFILE_IMAGE_WIDTH_IDS as string[]).includes(value);
}
export function getProfileImageWidthClassName(width: ProfileImageWidth): string {
  return IMAGE_WIDTH_CLASSNAMES[width];
}

const SPACER_SIZE_CLASSNAMES: Record<ProfileSpacerSize, string> = {
  small: "h-3",
  medium: "h-6",
  large: "h-12",
};
export const PROFILE_SPACER_SIZE_IDS = Object.keys(SPACER_SIZE_CLASSNAMES) as ProfileSpacerSize[];
export function isProfileSpacerSize(value: string): value is ProfileSpacerSize {
  return (PROFILE_SPACER_SIZE_IDS as string[]).includes(value);
}
export function getProfileSpacerSizeClassName(size: ProfileSpacerSize): string {
  return SPACER_SIZE_CLASSNAMES[size];
}
