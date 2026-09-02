import * as z from "zod";

import { passwordSchema, usernameSchema } from "@/lib/auth/validation";
import { richProfileContentDocSchema } from "@/features/profile/rich-content/validation/rich-profile-content.schema";
import { isAllowedAvatarDexNumber } from "../themes/profile-avatars";
import { PROFILE_THEME_IDS } from "../themes/profile-themes";

export const ABOUT_ME_MAX_LENGTH = 150;

// Plain text only — this is never rendered via dangerouslySetInnerHTML
// anywhere (features/profile/components/ProfileAboutMe.tsx), so HTML/links
// can never execute or render as markup regardless of what characters this
// contains; length/whitespace are the only things validated here. Empty
// string is explicitly allowed (min(0), the schema's default) — "no bio
// set" is a valid state, not a validation failure.
export const aboutMeSchema = z
  .string()
  .trim()
  .max(ABOUT_ME_MAX_LENGTH, { error: `התיאור יכול להכיל עד ${ABOUT_ME_MAX_LENGTH} תווים` });

// SECURITY & ACCOUNT — username is deliberately NOT part of this schema.
// Changing it now costs 100 Gold and goes through its own dedicated flow
// (changeUsernameSchema + change-username.service.ts), never bundled into
// this free profile-content save — see SecurityAccountSection's own doc
// comment for why the two are kept visually and functionally separate.
export const updateProfileSchema = z.object({
  aboutMe: aboutMeSchema,
  avatarDexNumber: z
    .number()
    .int()
    .nullable()
    .refine((value) => value === null || isAllowedAvatarDexNumber(value), { error: "אווטאר לא חוקי" }),
  themeId: z.enum(PROFILE_THEME_IDS, { error: "ערכת עיצוב לא חוקית" }),
  showPartyOnProfile: z.boolean(),
  showStatsOnProfile: z.boolean(),
  showAboutMeOnProfile: z.boolean(),
  showGymAchievementsOnProfile: z.boolean(),
  // RICH PROFILE EDITOR — the official profile-content editor (the old
  // profileContentBlocks block editor has been retired from the UI; see
  // features/profile/rich-content's own doc comments and
  // update-profile.service.ts's own comment on why profileContentBlocks is
  // no longer written here at all). Optional/nullable so a caller that
  // never sends this field (a legacy request, or an existing test fixture
  // predating this feature — see profile.schema.test.ts) still validates
  // successfully; null means "no rich content saved this time", handled
  // identically to "the field was omitted" by update-profile.service.ts.
  richProfileContent: richProfileContentDocSchema.nullable().optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, { error: "יש להזין את הסיסמה הנוכחית" }),
    newPassword: passwordSchema,
    confirmNewPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    error: "הסיסמאות החדשות אינן תואמות",
    path: ["confirmNewPassword"],
  });

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

// SECURITY & ACCOUNT — the dedicated, paid (100 Gold) username-change
// flow's own input. Reuses the SAME usernameSchema every other
// username-accepting form in the app validates against (lib/auth/
// validation.ts) — structural rules can never drift apart between them.
// Availability (is this username actually free) is checked later, in
// change-username.service.ts, never here — same "structural schema,
// service owns uniqueness" split updateProfileSchema used to document for
// its own now-removed username field.
export const changeUsernameSchema = z.object({
  newUsername: usernameSchema,
});

export type ChangeUsernameInput = z.infer<typeof changeUsernameSchema>;
