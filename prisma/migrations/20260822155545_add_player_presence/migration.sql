-- AlterTable
ALTER TABLE "player_profile" ADD COLUMN     "lastSeenAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "player_profile_lastSeenAt_idx" ON "player_profile"("lastSeenAt");
