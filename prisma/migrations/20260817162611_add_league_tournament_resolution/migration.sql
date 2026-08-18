-- AlterTable
ALTER TABLE "league_tournament_match" ADD COLUMN     "resolutionReason" TEXT;

-- CreateTable
CREATE TABLE "league_tournament_placement" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "place" INTEGER NOT NULL,
    "participantId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "league_tournament_placement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "league_tournament_placement_tournamentId_place_key" ON "league_tournament_placement"("tournamentId", "place");

-- AddForeignKey
ALTER TABLE "league_tournament_placement" ADD CONSTRAINT "league_tournament_placement_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "league_tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;
