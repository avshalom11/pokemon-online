-- CreateTable
CREATE TABLE "player_known_move" (
    "id" TEXT NOT NULL,
    "playerPokemonId" TEXT NOT NULL,
    "moveId" TEXT NOT NULL,
    "slot" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "player_known_move_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "player_known_move_playerPokemonId_idx" ON "player_known_move"("playerPokemonId");

-- CreateIndex
CREATE UNIQUE INDEX "player_known_move_playerPokemonId_moveId_key" ON "player_known_move"("playerPokemonId", "moveId");

-- CreateIndex
CREATE UNIQUE INDEX "player_known_move_playerPokemonId_slot_key" ON "player_known_move"("playerPokemonId", "slot");

-- AddForeignKey
ALTER TABLE "player_known_move" ADD CONSTRAINT "player_known_move_playerPokemonId_fkey" FOREIGN KEY ("playerPokemonId") REFERENCES "player_pokemon"("id") ON DELETE CASCADE ON UPDATE CASCADE;
