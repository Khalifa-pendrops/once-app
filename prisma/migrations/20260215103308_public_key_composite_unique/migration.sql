/*
  Warnings:

  - A unique constraint covering the columns `[deviceId,keyType]` on the table `public_keys` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "public_keys_deviceId_keyType_key" ON "public_keys"("deviceId", "keyType");
