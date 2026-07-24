-- CreateTable
CREATE TABLE "notification" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notification_playerId_isRead_idx" ON "notification"("playerId", "isRead");

-- CreateIndex
CREATE INDEX "notification_playerId_createdAt_idx" ON "notification"("playerId", "createdAt");

-- AddForeignKey
ALTER TABLE "notification" ADD CONSTRAINT "notification_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "player_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
