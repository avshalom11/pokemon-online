-- CreateTable
CREATE TABLE "player_tutorial_progress" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "currentStageId" TEXT NOT NULL DEFAULT 'welcome',
    "currentSubStep" TEXT,
    "status" TEXT NOT NULL DEFAULT 'not_started',
    "completedAt" TIMESTAMP(3),
    "rewardClaimed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "player_tutorial_progress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "player_tutorial_progress_playerId_key" ON "player_tutorial_progress"("playerId");

-- AddForeignKey
ALTER TABLE "player_tutorial_progress" ADD CONSTRAINT "player_tutorial_progress_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "player_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
