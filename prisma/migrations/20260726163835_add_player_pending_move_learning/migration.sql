-- CreateTable
CREATE TABLE "player_pending_move_learning" (
    "id" TEXT NOT NULL,
    "playerPokemonId" TEXT NOT NULL,
    "moveId" TEXT NOT NULL,
    "learnedAtLevel" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "sequence" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "player_pending_move_learning_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "player_pending_move_learning_playerPokemonId_status_idx" ON "player_pending_move_learning"("playerPokemonId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "player_pending_move_learning_playerPokemonId_moveId_status_key" ON "player_pending_move_learning"("playerPokemonId", "moveId", "status");

-- AddForeignKey
ALTER TABLE "player_pending_move_learning" ADD CONSTRAINT "player_pending_move_learning_playerPokemonId_fkey" FOREIGN KEY ("playerPokemonId") REFERENCES "player_pokemon"("id") ON DELETE CASCADE ON UPDATE CASCADE;
