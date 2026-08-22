-- CreateTable
CREATE TABLE "global_chat_message" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "global_chat_message_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "global_chat_message_createdAt_idx" ON "global_chat_message"("createdAt");

-- AddForeignKey
ALTER TABLE "global_chat_message" ADD CONSTRAINT "global_chat_message_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "player_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
