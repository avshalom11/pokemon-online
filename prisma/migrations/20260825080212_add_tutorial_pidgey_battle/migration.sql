-- AlterTable
ALTER TABLE "field_battle_session" ADD COLUMN     "isTutorialEncounter" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "player_tutorial_progress" ADD COLUMN     "pidgeyCaptured" BOOLEAN NOT NULL DEFAULT false;
