-- AlterTable
ALTER TABLE "player_profile" ADD COLUMN     "coins" INTEGER NOT NULL DEFAULT 500,
ADD COLUMN     "onboardingCompleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "starterPokemonId" TEXT;

-- CreateTable
CREATE TABLE "player_pokemon" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "speciesId" TEXT NOT NULL,
    "nickname" TEXT,
    "level" INTEGER NOT NULL DEFAULT 5,
    "experience" INTEGER NOT NULL DEFAULT 0,
    "currentHp" INTEGER NOT NULL,
    "isStarter" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "player_pokemon_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "player_pokemon_playerId_idx" ON "player_pokemon"("playerId");

-- AddForeignKey
ALTER TABLE "player_pokemon" ADD CONSTRAINT "player_pokemon_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "player_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
