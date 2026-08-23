-- CreateTable
CREATE TABLE "account_deletion_request" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "account_deletion_request_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "account_deletion_request_tokenHash_key" ON "account_deletion_request"("tokenHash");

-- CreateIndex
CREATE INDEX "account_deletion_request_userId_idx" ON "account_deletion_request"("userId");

-- AddForeignKey
ALTER TABLE "account_deletion_request" ADD CONSTRAINT "account_deletion_request_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
