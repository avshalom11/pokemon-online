import { GameScreen } from "@/components/layout/GameScreen";
import { ShopContent } from "@/features/shop/components/ShopContent";

// No session check and no data fetching here, unlike every other page
// under app/(game) — the shop's catalog is still static placeholder data
// (features/shop/data), so there is nothing player-specific to resolve
// yet. The (game) layout's own auth guard already covers this route; once
// purchasing needs the player's coins/inventory, this becomes an async
// Server Component exactly like Home/My Pokémon/Pokémon Center.
export default function ShopPage() {
  return (
    <GameScreen>
      <ShopContent />
    </GameScreen>
  );
}
