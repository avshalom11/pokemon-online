-- AlterTable
ALTER TABLE "player_pokemon" ADD COLUMN     "partySlot" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "player_pokemon_playerId_partySlot_key" ON "player_pokemon"("playerId", "partySlot");

-- Backfill: give every existing player their first up-to-6 owned Pokemon a
-- persisted party slot, using the exact same ordering the app's derived
-- party logic already used before this migration (starter first, then
-- oldest-caught first) - so no existing player's active team visibly
-- changes as a result of this migration.
WITH ranked AS (
  SELECT "id", ROW_NUMBER() OVER (PARTITION BY "playerId" ORDER BY "isStarter" DESC, "createdAt" ASC) AS rn
  FROM "player_pokemon"
)
UPDATE "player_pokemon" p SET "partySlot" = ranked.rn
FROM ranked WHERE p."id" = ranked."id" AND ranked.rn <= 6;
