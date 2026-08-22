-- CreateTable
CREATE TABLE "friendship" (
    "id" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "addresseeId" TEXT NOT NULL,
    "friendPairKey" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),

    CONSTRAINT "friendship_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "private_conversation" (
    "id" TEXT NOT NULL,
    "playerAId" TEXT NOT NULL,
    "playerBId" TEXT NOT NULL,
    "conversationPairKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "private_conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "private_message" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "private_message_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "friendship_addresseeId_status_idx" ON "friendship"("addresseeId", "status");

-- CreateIndex
CREATE INDEX "friendship_requesterId_status_idx" ON "friendship"("requesterId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "friendship_friendPairKey_key" ON "friendship"("friendPairKey");

-- CreateIndex
CREATE UNIQUE INDEX "private_conversation_conversationPairKey_key" ON "private_conversation"("conversationPairKey");

-- CreateIndex
CREATE INDEX "private_message_conversationId_createdAt_idx" ON "private_message"("conversationId", "createdAt");

-- AddForeignKey
ALTER TABLE "friendship" ADD CONSTRAINT "friendship_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "player_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "friendship" ADD CONSTRAINT "friendship_addresseeId_fkey" FOREIGN KEY ("addresseeId") REFERENCES "player_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "private_conversation" ADD CONSTRAINT "private_conversation_playerAId_fkey" FOREIGN KEY ("playerAId") REFERENCES "player_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "private_conversation" ADD CONSTRAINT "private_conversation_playerBId_fkey" FOREIGN KEY ("playerBId") REFERENCES "player_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "private_message" ADD CONSTRAINT "private_message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "private_conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "private_message" ADD CONSTRAINT "private_message_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "player_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
