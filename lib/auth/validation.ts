import { z } from "zod";

// Single source of truth for the username character rules — imported by
// this file's Zod schema AND by lib/auth/auth.ts's Better Auth username
// plugin config, so the client-facing validation and the library's own
// enforcement can never drift apart.
export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 20;
export const USERNAME_PATTERN = /^[A-Za-z0-9א-ת_]+$/;

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;

export const usernameSchema = z
  .string()
  .trim()
  .min(USERNAME_MIN_LENGTH, { error: `שם המשתמש חייב להכיל לפחות ${USERNAME_MIN_LENGTH} תווים` })
  .max(USERNAME_MAX_LENGTH, { error: `שם המשתמש יכול להכיל עד ${USERNAME_MAX_LENGTH} תווים` })
  .regex(USERNAME_PATTERN, {
    error: "שם המשתמש יכול להכיל רק אותיות באנגלית או בעברית, ספרות וקו תחתון, ללא רווחים",
  });

export const emailSchema = z
  .email({ error: "כתובת האימייל אינה תקינה" })
  .trim()
  .toLowerCase();

export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, { error: `הסיסמה חייבת להכיל לפחות ${PASSWORD_MIN_LENGTH} תווים` })
  .max(PASSWORD_MAX_LENGTH, { error: `הסיסמה יכולה להכיל עד ${PASSWORD_MAX_LENGTH} תווים` });

export const registerSchema = z
  .object({
    username: usernameSchema,
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    error: "הסיסמאות אינן תואמות",
    path: ["confirmPassword"],
  });

export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  identifier: z.string().trim().min(1, { error: "יש להזין שם משתמש או אימייל" }),
  password: z.string().min(1, { error: "יש להזין סיסמה" }),
  rememberMe: z.preprocess((value) => value === "true" || value === true, z.boolean()),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1, { error: "קישור האיפוס אינו תקין" }),
    newPassword: passwordSchema,
    confirmNewPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    error: "הסיסמאות אינן תואמות",
    path: ["confirmNewPassword"],
  });

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
