"use server";

import { changePassword, type ChangePasswordResult } from "@/features/profile/services/change-password.service";
import { changePasswordSchema } from "@/features/profile/validation/profile.schema";
import { getCurrentSession } from "@/lib/auth/auth-session";

export type ChangePasswordActionResult = ChangePasswordResult;

export async function changePasswordAction(input: unknown): Promise<ChangePasswordActionResult> {
  const session = await getCurrentSession();
  if (!session) return { status: "error", message: "יש להתחבר מחדש." };

  const parsed = changePasswordSchema.safeParse(input);
  if (!parsed.success) return { status: "error", message: "הסיסמה שהוזנה אינה תקינה." };

  return changePassword(parsed.data);
}
