-- Consolidate the project's three currency-ish columns down to two
-- (coins, gold). The old `gold` column was never read or written by any
-- application code (dead weight); `gems` was display-only (never earned or
-- spent by any gameplay logic) and becomes the new `gold`, the project's
-- rare/premium currency going forward.

-- DropColumn
ALTER TABLE "player_profile" DROP COLUMN "gold";

-- RenameColumn
ALTER TABLE "player_profile" RENAME COLUMN "gems" TO "gold";
