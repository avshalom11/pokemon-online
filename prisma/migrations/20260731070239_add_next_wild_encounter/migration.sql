/*
  Warnings:

  - Added the required column `nextWildCurrentHp` to the `field_battle_session` table without a default value. This is not possible if the table is not empty.
  - Added the required column `nextWildLevel` to the `field_battle_session` table without a default value. This is not possible if the table is not empty.
  - Added the required column `nextWildMaxHp` to the `field_battle_session` table without a default value. This is not possible if the table is not empty.
  - Added the required column `nextWildSpeciesId` to the `field_battle_session` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "field_battle_session" ADD COLUMN     "nextWildCurrentHp" INTEGER NOT NULL,
ADD COLUMN     "nextWildLevel" INTEGER NOT NULL,
ADD COLUMN     "nextWildMaxHp" INTEGER NOT NULL,
ADD COLUMN     "nextWildSpeciesId" TEXT NOT NULL;
