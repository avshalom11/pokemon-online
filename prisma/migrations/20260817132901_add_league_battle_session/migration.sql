-- CreateTable
CREATE TABLE "league_battle_session" (
    "id" TEXT NOT NULL,
    "tournamentMatchId" TEXT NOT NULL,
    "participantAId" TEXT NOT NULL,
    "participantBId" TEXT NOT NULL,
    "participantAJoinedAt" TIMESTAMP(3),
    "participantAPokemon" JSONB,
    "participantAActiveSlotId" TEXT,
    "participantABattleHp" JSONB,
    "participantAStatusMap" JSONB NOT NULL DEFAULT '{}',
    "participantAStatStages" JSONB NOT NULL DEFAULT '{}',
    "participantAVolatileState" JSONB NOT NULL DEFAULT '{}',
    "participantAPendingMoveId" TEXT,
    "participantBJoinedAt" TIMESTAMP(3),
    "participantBPokemon" JSONB,
    "participantBActiveSlotId" TEXT,
    "participantBBattleHp" JSONB,
    "participantBStatusMap" JSONB NOT NULL DEFAULT '{}',
    "participantBStatStages" JSONB NOT NULL DEFAULT '{}',
    "participantBVolatileState" JSONB NOT NULL DEFAULT '{}',
    "participantBPendingMoveId" TEXT,
    "turnNumber" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'waiting-for-players',
    "winnerParticipantId" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "league_battle_session_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "league_battle_session_tournamentMatchId_key" ON "league_battle_session"("tournamentMatchId");

-- AddForeignKey
ALTER TABLE "league_battle_session" ADD CONSTRAINT "league_battle_session_tournamentMatchId_fkey" FOREIGN KEY ("tournamentMatchId") REFERENCES "league_tournament_match"("id") ON DELETE CASCADE ON UPDATE CASCADE;
