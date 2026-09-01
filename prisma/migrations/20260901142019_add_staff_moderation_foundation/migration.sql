-- CreateTable
CREATE TABLE "staff_member" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "appointedByPlayerId" TEXT,
    "appointedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "staff_member_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff_roster_counter" (
    "id" TEXT NOT NULL,
    "deputyCount" INTEGER NOT NULL DEFAULT 0,
    "supportCount" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "staff_roster_counter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "player_moderation_counters" (
    "playerId" TEXT NOT NULL,
    "chatBanCount" INTEGER NOT NULL DEFAULT 0,
    "siteBanCount" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "player_moderation_counters_pkey" PRIMARY KEY ("playerId")
);

-- CreateTable
CREATE TABLE "moderation_action" (
    "id" TEXT NOT NULL,
    "targetPlayerId" TEXT NOT NULL,
    "actorPlayerId" TEXT NOT NULL,
    "actionType" TEXT NOT NULL,
    "reason" TEXT,
    "durationMinutes" INTEGER,
    "expiresAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "revokedByPlayerId" TEXT,
    "revocationReason" TEXT,
    "targetResourceId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "moderation_action_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "staff_member_playerId_key" ON "staff_member"("playerId");

-- CreateIndex
CREATE INDEX "moderation_action_targetPlayerId_actionType_createdAt_idx" ON "moderation_action"("targetPlayerId", "actionType", "createdAt");

-- CreateIndex
CREATE INDEX "moderation_action_actorPlayerId_createdAt_idx" ON "moderation_action"("actorPlayerId", "createdAt");

-- AddForeignKey
ALTER TABLE "staff_member" ADD CONSTRAINT "staff_member_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "player_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_moderation_counters" ADD CONSTRAINT "player_moderation_counters_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "player_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "moderation_action" ADD CONSTRAINT "moderation_action_targetPlayerId_fkey" FOREIGN KEY ("targetPlayerId") REFERENCES "player_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "moderation_action" ADD CONSTRAINT "moderation_action_actorPlayerId_fkey" FOREIGN KEY ("actorPlayerId") REFERENCES "player_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
