import type { Prisma } from "@/lib/generated/prisma/client";
import { richProfileContentDocSchema } from "../validation/rich-profile-content.schema";
import type { RichProfileContentDoc } from "../types/rich-profile-content.types";

// RICH PROFILE EDITOR (PHASE A) — PlayerProfile.richProfileContent is
// stored as Prisma.JsonValue | null — never trusted directly on read, same
// "invalid -> safe fallback" philosophy features/profile/services/
// parse-profile-content.ts already established for profileContentBlocks
// (and this schema's other JSON columns, e.g. FieldBattleSession.
// participants). Re-runs the EXACT same Zod schema writes are validated
// against, so a legacy/corrupt/hand-edited row can never crash a profile
// page render — it just renders as if the owner had never saved any rich
// content. null (the column's own real value for "never touched") and an
// invalid/corrupt value both fall back to null here — the renderer already
// treats null as "render nothing", so the two cases don't need to be
// distinguished past this point.
export function parseRichProfileContent(value: Prisma.JsonValue | null): RichProfileContentDoc | null {
  if (value === null) return null;
  const result = richProfileContentDocSchema.safeParse(value);
  return result.success ? (result.data as RichProfileContentDoc) : null;
}
