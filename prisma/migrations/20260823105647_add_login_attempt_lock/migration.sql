-- CreateTable
CREATE TABLE "login_attempt_lock" (
    "id" TEXT NOT NULL,
    "identifierKey" TEXT NOT NULL,
    "ipHash" TEXT NOT NULL,
    "failedAttempts" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "login_attempt_lock_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "login_attempt_lock_identifierKey_ipHash_key" ON "login_attempt_lock"("identifierKey", "ipHash");
