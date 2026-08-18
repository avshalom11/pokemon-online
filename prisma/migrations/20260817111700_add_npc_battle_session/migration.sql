-- CreateTable
CREATE TABLE "npc_battle_session" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "battleSource" TEXT NOT NULL,
    "regionId" TEXT NOT NULL,
    "gymNumber" INTEGER,
    "battleSlot" TEXT,
    "npcTeam" JSONB NOT NULL,
    "npcActiveIndex" INTEGER NOT NULL DEFAULT 0,
    "npcCurrentHp" INTEGER NOT NULL,
    "npcStatus" TEXT,
    "npcStatusTurnsRemaining" INTEGER,
    "npcStatStages" JSONB NOT NULL DEFAULT '{}',
    "npcVolatileState" JSONB NOT NULL DEFAULT '{}',
    "playerPokemonIds" JSONB NOT NULL,
    "activePlayerPokemonId" TEXT NOT NULL,
    "playerBattleHp" JSONB NOT NULL,
    "playerBattleStatus" JSONB NOT NULL DEFAULT '{}',
    "playerStatStages" JSONB NOT NULL DEFAULT '{}',
    "playerVolatileState" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "npc_battle_session_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "npc_battle_session_playerId_key" ON "npc_battle_session"("playerId");

-- AddForeignKey
ALTER TABLE "npc_battle_session" ADD CONSTRAINT "npc_battle_session_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "player_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
