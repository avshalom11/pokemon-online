-- AlterTable
ALTER TABLE "player_inventory_item" ADD COLUMN     "lockedQuantity" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "marketplace_listing" (
    "id" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "priceMoney" INTEGER NOT NULL DEFAULT 0,
    "priceGold" INTEGER NOT NULL DEFAULT 0,
    "buyerId" TEXT,
    "soldAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "marketplace_listing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketplace_listing_pokemon" (
    "playerPokemonId" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,

    CONSTRAINT "marketplace_listing_pokemon_pkey" PRIMARY KEY ("playerPokemonId")
);

-- CreateTable
CREATE TABLE "marketplace_listing_item" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,

    CONSTRAINT "marketplace_listing_item_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "marketplace_listing_sellerId_idx" ON "marketplace_listing"("sellerId");

-- CreateIndex
CREATE INDEX "marketplace_listing_status_idx" ON "marketplace_listing"("status");

-- CreateIndex
CREATE INDEX "marketplace_listing_pokemon_listingId_idx" ON "marketplace_listing_pokemon"("listingId");

-- CreateIndex
CREATE UNIQUE INDEX "marketplace_listing_item_listingId_itemId_key" ON "marketplace_listing_item"("listingId", "itemId");

-- AddForeignKey
ALTER TABLE "marketplace_listing" ADD CONSTRAINT "marketplace_listing_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "player_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace_listing" ADD CONSTRAINT "marketplace_listing_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "player_profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace_listing_pokemon" ADD CONSTRAINT "marketplace_listing_pokemon_playerPokemonId_fkey" FOREIGN KEY ("playerPokemonId") REFERENCES "player_pokemon"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace_listing_pokemon" ADD CONSTRAINT "marketplace_listing_pokemon_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "marketplace_listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace_listing_item" ADD CONSTRAINT "marketplace_listing_item_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "marketplace_listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;
