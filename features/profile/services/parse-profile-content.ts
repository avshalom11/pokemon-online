import type { Prisma } from "@/lib/generated/prisma/client";
import { profileContentBlocksSchema } from "../validation/profile-content.schema";
import type { ProfileContentBlock } from "../types/profile-content.types";

// PlayerProfile.profileContentBlocks is stored as Prisma.JsonValue — never
// trusted directly on read, same "invalid -> safe fallback" philosophy
// this codebase's other JSON columns already follow (e.g.
// battle-session.service.ts's parseParticipants/parseStatStages). Re-runs
// the EXACT same Zod schema writes are validated against, so a legacy/
// corrupt/hand-edited row can never crash a profile page render — it just
// renders as if the owner had never added any content blocks.
export function parseProfileContentBlocks(value: Prisma.JsonValue): ProfileContentBlock[] {
  const result = profileContentBlocksSchema.safeParse(value);
  return result.success ? (result.data as ProfileContentBlock[]) : [];
}
