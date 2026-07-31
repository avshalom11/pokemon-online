-- CreateTable
CREATE TABLE "daily_field_battle_count" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "daily_field_battle_count_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "daily_field_battle_count_playerId_date_key" ON "daily_field_battle_count"("playerId", "date");

-- AddForeignKey
ALTER TABLE "daily_field_battle_count" ADD CONSTRAINT "daily_field_battle_count_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "player_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
