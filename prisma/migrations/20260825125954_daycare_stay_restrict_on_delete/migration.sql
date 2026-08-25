-- DropForeignKey
ALTER TABLE "player_daycare_stay" DROP CONSTRAINT "player_daycare_stay_playerPokemonId_fkey";

-- AddForeignKey
ALTER TABLE "player_daycare_stay" ADD CONSTRAINT "player_daycare_stay_playerPokemonId_fkey" FOREIGN KEY ("playerPokemonId") REFERENCES "player_pokemon"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
