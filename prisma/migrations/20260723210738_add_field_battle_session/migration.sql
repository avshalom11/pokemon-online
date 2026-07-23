-- CreateTable
CREATE TABLE "field_battle_session" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "zoneId" TEXT NOT NULL,
    "wildSpeciesId" TEXT NOT NULL,
    "wildLevel" INTEGER NOT NULL,
    "wildCurrentHp" INTEGER NOT NULL,
    "wildMaxHp" INTEGER NOT NULL,
    "activePlayerPokemonId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "field_battle_session_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "field_battle_session_playerId_key" ON "field_battle_session"("playerId");

-- CreateIndex
CREATE INDEX "field_battle_session_activePlayerPokemonId_idx" ON "field_battle_session"("activePlayerPokemonId");

-- AddForeignKey
ALTER TABLE "field_battle_session" ADD CONSTRAINT "field_battle_session_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "player_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "field_battle_session" ADD CONSTRAINT "field_battle_session_activePlayerPokemonId_fkey" FOREIGN KEY ("activePlayerPokemonId") REFERENCES "player_pokemon"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
