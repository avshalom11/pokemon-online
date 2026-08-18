-- CreateTable
CREATE TABLE "player_gym_battle_progress" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "regionId" TEXT NOT NULL,
    "gymNumber" INTEGER NOT NULL,
    "battleSlot" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "player_gym_battle_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "player_gym_badge" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "regionId" TEXT NOT NULL,
    "gymNumber" INTEGER NOT NULL,
    "awardedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "player_gym_badge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "player_regional_champion_progress" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "regionId" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "player_regional_champion_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "player_regional_medal" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "regionId" TEXT NOT NULL,
    "awardedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "player_regional_medal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "player_gym_battle_progress_playerId_idx" ON "player_gym_battle_progress"("playerId");

-- CreateIndex
CREATE UNIQUE INDEX "player_gym_battle_progress_playerId_regionId_gymNumber_batt_key" ON "player_gym_battle_progress"("playerId", "regionId", "gymNumber", "battleSlot");

-- CreateIndex
CREATE INDEX "player_gym_badge_playerId_idx" ON "player_gym_badge"("playerId");

-- CreateIndex
CREATE UNIQUE INDEX "player_gym_badge_playerId_regionId_gymNumber_key" ON "player_gym_badge"("playerId", "regionId", "gymNumber");

-- CreateIndex
CREATE INDEX "player_regional_champion_progress_playerId_idx" ON "player_regional_champion_progress"("playerId");

-- CreateIndex
CREATE UNIQUE INDEX "player_regional_champion_progress_playerId_regionId_key" ON "player_regional_champion_progress"("playerId", "regionId");

-- CreateIndex
CREATE INDEX "player_regional_medal_playerId_idx" ON "player_regional_medal"("playerId");

-- CreateIndex
CREATE UNIQUE INDEX "player_regional_medal_playerId_regionId_key" ON "player_regional_medal"("playerId", "regionId");

-- AddForeignKey
ALTER TABLE "player_gym_battle_progress" ADD CONSTRAINT "player_gym_battle_progress_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "player_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_gym_badge" ADD CONSTRAINT "player_gym_badge_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "player_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_regional_champion_progress" ADD CONSTRAINT "player_regional_champion_progress_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "player_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_regional_medal" ADD CONSTRAINT "player_regional_medal_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "player_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
