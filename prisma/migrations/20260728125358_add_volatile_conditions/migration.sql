-- AlterTable
ALTER TABLE "field_battle_session" ADD COLUMN     "playerVolatileState" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "wildVolatileState" JSONB NOT NULL DEFAULT '{}';
