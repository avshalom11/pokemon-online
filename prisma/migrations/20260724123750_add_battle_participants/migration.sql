-- AlterTable
ALTER TABLE "field_battle_session" ADD COLUMN     "participants" JSONB NOT NULL DEFAULT '[]';
