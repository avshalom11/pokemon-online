// The ONE place profile theme ids/styling are defined — a closed,
// server-known set of lookup keys, never free-form CSS/class names or
// arbitrary style values from the client (see profile.schema.ts's own
// validation against this exact list). Adding a theme is a data-only
// change here; nothing else needs to know about a new one.
export type ProfileThemeId = "default" | "grass" | "water" | "fire" | "haunted";

export interface ProfileThemeDefinition {
  id: ProfileThemeId;
  label: string;
  // Tailwind utility classes only — applied as-is to the profile page's own
  // background wrapper, never interpreted as arbitrary CSS.
  bannerClassName: string;
}

export const PROFILE_THEMES: Record<ProfileThemeId, ProfileThemeDefinition> = {
  default: {
    id: "default",
    label: "ברירת מחדל",
    bannerClassName: "bg-gradient-to-b from-slate-950 via-indigo-950/40 to-slate-950",
  },
  grass: {
    id: "grass",
    label: "עשב",
    bannerClassName: "bg-gradient-to-b from-slate-950 via-emerald-950/50 to-slate-950",
  },
  water: {
    id: "water",
    label: "מים",
    bannerClassName: "bg-gradient-to-b from-slate-950 via-sky-950/50 to-slate-950",
  },
  fire: {
    id: "fire",
    label: "אש",
    bannerClassName: "bg-gradient-to-b from-slate-950 via-orange-950/50 to-slate-950",
  },
  haunted: {
    id: "haunted",
    label: "רוחות",
    bannerClassName: "bg-gradient-to-b from-slate-950 via-purple-950/50 to-slate-950",
  },
};

export const PROFILE_THEME_IDS = Object.keys(PROFILE_THEMES) as ProfileThemeId[];

// Narrows an arbitrary string (a stored PlayerProfile.profileThemeId, or a
// client-submitted edit value) to ProfileThemeId — the one place that
// narrowing happens, so an invalid/legacy value can never be trusted as a
// real theme key.
export function isProfileThemeId(value: string): value is ProfileThemeId {
  return (PROFILE_THEME_IDS as string[]).includes(value);
}

export function getProfileTheme(themeId: string): ProfileThemeDefinition {
  return isProfileThemeId(themeId) ? PROFILE_THEMES[themeId] : PROFILE_THEMES.default;
}
