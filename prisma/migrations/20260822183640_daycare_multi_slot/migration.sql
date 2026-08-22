-- DropIndex
DROP INDEX "player_daycare_stay_playerId_key";

-- CreateIndex
CREATE INDEX "player_daycare_stay_playerId_idx" ON "player_daycare_stay"("playerId");
