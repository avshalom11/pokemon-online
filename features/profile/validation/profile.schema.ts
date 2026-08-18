import * as z from "zod";

import { passwordSchema, usernameSchema } from "@/lib/auth/validation";
import { isAllowedAvatarDexNumber } from "../themes/profile-avatars";
import { PROFILE_THEME_IDS } from "../themes/profile-themes";
import { profileContentBlocksSchema } from "./profile-content.schema";

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

// Structural validation only — reuses the SAME usernameSchema the
// registration form already validates against (lib/auth/validation.ts), so
// the two can never drift apart on length/character rules. Whether the
// requested username is actually available is Better Auth's own job (see
// update-profile.service.ts's auth.api.updateUser call), never this schema's.
export const updateProfileSchema = z.object({
  username: usernameSchema,
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
  contentBlocks: profileContentBlocksSchema,
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
