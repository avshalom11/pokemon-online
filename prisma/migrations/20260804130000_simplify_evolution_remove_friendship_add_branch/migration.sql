-- Evolution Simplification phase: Friendship-based evolution is removed
-- entirely (PlayerPokemon.friendship is unused by any remaining gameplay
-- system — verified via repo-wide search before this migration was
-- written), and Eevee's former Friendship day/night split becomes an
-- explicit player-chosen Branch Evolution instead (see
-- data/pokemon/pokemon-evolutions.ts's BRANCH_EVOLUTIONS and
-- pendingEvolutionBranch's own doc comment in prisma/schema.prisma).

-- AlterTable
ALTER TABLE "player_pokemon" DROP COLUMN "friendship",
ADD COLUMN     "pendingEvolutionBranch" BOOLEAN NOT NULL DEFAULT false;
