-- CreateTable
CREATE TABLE "player_inventory_item" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "player_inventory_item_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "player_inventory_item_playerId_idx" ON "player_inventory_item"("playerId");

-- CreateIndex
CREATE UNIQUE INDEX "player_inventory_item_playerId_itemId_key" ON "player_inventory_item"("playerId", "itemId");

-- AddForeignKey
ALTER TABLE "player_inventory_item" ADD CONSTRAINT "player_inventory_item_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "player_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
