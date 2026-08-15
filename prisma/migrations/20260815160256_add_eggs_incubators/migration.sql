-- CreateTable
CREATE TABLE "player_owned_egg" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "rarity" TEXT NOT NULL,
    "regionId" TEXT NOT NULL,
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "player_owned_egg_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "player_incubator" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "incubatorTypeId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "player_incubator_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "player_egg_incubation" (
    "ownedEggId" TEXT NOT NULL,
    "incubatorId" TEXT NOT NULL,
    "battleProgress" INTEGER NOT NULL DEFAULT 0,
    "requiredBattleTarget" INTEGER NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "player_egg_incubation_pkey" PRIMARY KEY ("ownedEggId")
);

-- CreateIndex
CREATE INDEX "player_owned_egg_playerId_idx" ON "player_owned_egg"("playerId");

-- CreateIndex
CREATE INDEX "player_owned_egg_playerId_rarity_idx" ON "player_owned_egg"("playerId", "rarity");

-- CreateIndex
CREATE INDEX "player_incubator_playerId_idx" ON "player_incubator"("playerId");

-- CreateIndex
CREATE UNIQUE INDEX "player_incubator_playerId_incubatorTypeId_key" ON "player_incubator"("playerId", "incubatorTypeId");

-- CreateIndex
CREATE UNIQUE INDEX "player_egg_incubation_incubatorId_key" ON "player_egg_incubation"("incubatorId");

-- AddForeignKey
ALTER TABLE "player_owned_egg" ADD CONSTRAINT "player_owned_egg_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "player_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_incubator" ADD CONSTRAINT "player_incubator_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "player_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_egg_incubation" ADD CONSTRAINT "player_egg_incubation_ownedEggId_fkey" FOREIGN KEY ("ownedEggId") REFERENCES "player_owned_egg"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_egg_incubation" ADD CONSTRAINT "player_egg_incubation_incubatorId_fkey" FOREIGN KEY ("incubatorId") REFERENCES "player_incubator"("id") ON DELETE CASCADE ON UPDATE CASCADE;
