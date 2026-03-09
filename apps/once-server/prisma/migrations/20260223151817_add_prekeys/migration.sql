-- CreateTable
CREATE TABLE "pre_keys" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "keyType" TEXT NOT NULL,
    "publicKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usedAt" TIMESTAMP(3),
    "usedByUserId" TEXT,

    CONSTRAINT "pre_keys_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "pre_keys_deviceId_idx" ON "pre_keys"("deviceId");

-- CreateIndex
CREATE INDEX "pre_keys_deviceId_usedAt_idx" ON "pre_keys"("deviceId", "usedAt");

-- AddForeignKey
ALTER TABLE "pre_keys" ADD CONSTRAINT "pre_keys_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
