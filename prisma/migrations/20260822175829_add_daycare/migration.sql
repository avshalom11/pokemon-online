-- CreateTable
CREATE TABLE "player_daycare_stay" (
    "playerPokemonId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "depositedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startingLevel" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "player_daycare_stay_pkey" PRIMARY KEY ("playerPokemonId")
);

-- CreateIndex
CREATE UNIQUE INDEX "player_daycare_stay_playerId_key" ON "player_daycare_stay"("playerId");

-- AddForeignKey
ALTER TABLE "player_daycare_stay" ADD CONSTRAINT "player_daycare_stay_playerPokemonId_fkey" FOREIGN KEY ("playerPokemonId") REFERENCES "player_pokemon"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_daycare_stay" ADD CONSTRAINT "player_daycare_stay_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "player_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
