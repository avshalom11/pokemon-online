"use server";

import { redirect } from "next/navigation";

import type { SelectStarterActionState } from "./onboarding-action-state";
import { selectStarterPokemon } from "@/features/onboarding/services/select-starter.service";
import { selectStarterSchema } from "@/features/onboarding/validation/select-starter.schema";
import { getCurrentSession } from "@/lib/auth/auth-session";

export async function selectStarterAction(
  _prevState: SelectStarterActionState,
  formData: FormData
): Promise<SelectStarterActionState> {
  const session = await getCurrentSession();

  if (!session) {
    redirect("/");
  }

  const parsed = selectStarterSchema.safeParse({
    speciesId: formData.get("speciesId"),
  });

  if (!parsed.success) {
    return { status: "error", message: "יש לבחור פוקימון תקין." };
  }

  const result = await selectStarterPokemon(session.user.id, parsed.data.speciesId);

  if (result.status === "invalid-species") {
    return { status: "error", message: "הפוקימון שנבחר אינו זמין כפוקימון התחלתי." };
  }

  // "already-completed" (a duplicate submit/refresh) and "created" both mean
  // onboarding is now done — send the player to the home hub either way
  // instead of surfacing an error for what is really just a duplicate request.
  redirect("/home");
}
