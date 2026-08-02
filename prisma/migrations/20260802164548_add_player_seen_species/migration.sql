-- CreateTable
CREATE TABLE "player_seen_species" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "speciesId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "player_seen_species_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "player_seen_species_playerId_idx" ON "player_seen_species"("playerId");

-- CreateIndex
CREATE UNIQUE INDEX "player_seen_species_playerId_speciesId_key" ON "player_seen_species"("playerId", "speciesId");

-- AddForeignKey
ALTER TABLE "player_seen_species" ADD CONSTRAINT "player_seen_species_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "player_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
