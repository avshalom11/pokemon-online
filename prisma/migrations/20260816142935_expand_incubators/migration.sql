-- INCUBATOR EXPANSION — replaces "at most one incubator per player per
-- type" with "at most one PERMANENT incubator per player, ever; unlimited
-- consumable instances of any type". See prisma/schema.prisma's
-- PlayerIncubator model for the full design rationale.

-- DropIndex
-- The old Phase-1 invariant no longer holds: a player may now own several
-- PlayerIncubator rows sharing the same incubatorTypeId (e.g. three
-- consumable Regular Incubators).
DROP INDEX "player_incubator_playerId_incubatorTypeId_key";

-- AlterTable
-- Nullable: 1 marks the player's one permanent starter incubator, NULL
-- marks every consumable instance. Backfilled below before the new unique
-- index is created.
ALTER TABLE "player_incubator" ADD COLUMN     "permanentSlot" INTEGER;

-- Data backfill — every player_incubator row that exists before this
-- migration was created exclusively by EGGS PHASE 1's ensureStandardIncubator
-- upsert, which the old @@unique([playerId, incubatorTypeId]) guaranteed was
-- at most one "standard" row per player: that is exactly the player's
-- permanent starter incubator under the new design. Renaming its type id to
-- "regular" (this expansion's canonical id for the same x1 incubator) and
-- stamping permanentSlot = 1 turns every existing row into the new
-- permanent-incubator shape with no data loss and no player left without
-- their starter incubator.
UPDATE "player_incubator" SET "incubatorTypeId" = 'regular', "permanentSlot" = 1 WHERE "incubatorTypeId" = 'standard';

-- CreateIndex
-- Postgres treats NULL as distinct in a unique index, so this only ever
-- collides for two rows both carrying permanentSlot = 1 for the same
-- player — real enforcement of "at most one permanent incubator per
-- player" — while placing no limit on how many permanentSlot: NULL
-- (consumable) rows, including duplicates of the same type, a player owns.
CREATE UNIQUE INDEX "player_incubator_playerId_permanentSlot_key" ON "player_incubator"("playerId", "permanentSlot");
