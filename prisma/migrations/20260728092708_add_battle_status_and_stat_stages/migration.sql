-- AlterTable
ALTER TABLE "field_battle_session" ADD COLUMN     "playerStatStages" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "wildStatStages" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "wildStatus" TEXT,
ADD COLUMN     "wildStatusTurnsRemaining" INTEGER;

-- AlterTable
ALTER TABLE "player_pokemon" ADD COLUMN     "status" TEXT,
ADD COLUMN     "statusTurnsRemaining" INTEGER;
