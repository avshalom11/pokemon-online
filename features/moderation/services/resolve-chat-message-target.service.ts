import "server-only";

import { prisma } from "@/lib/db/prisma";

export interface ChatMessageTarget {
  targetPlayerId: string;
}

// STAFF / MODERATION — PHASE 5. The one shared "resolve a Global Chat
// message's real sender" lookup every message-based moderation Server
// Action (chat ban / temporary site ban / permanent site ban — delete
// resolves its own message internally, features/moderation/services/
// delete-message.service.ts) uses to turn a client-supplied `messageId`
// into a TRUSTED targetPlayerId, per this phase's own explicit rule: "the
// client should send messageId. Resolve the message owner server-side" —
// a client can never simply pass a playerId directly to ban whoever it
// wants.
export async function resolveChatMessageTarget(messageId: string): Promise<ChatMessageTarget | null> {
  const message = await prisma.globalChatMessage.findUnique({ where: { id: messageId } });
  if (!message) return null;
  return { targetPlayerId: message.playerId };
}
