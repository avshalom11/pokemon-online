-- AlterTable
ALTER TABLE "player_pokemon" ADD COLUMN     "evolutionPermanentlyBlocked" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "pendingEvolutionSpeciesId" TEXT;
