-- Migration: add_product_share
-- Adds ProductShare and ShareContribution tables for the share-by-code feature.

-- CreateTable: ProductShare
CREATE TABLE "ProductShare" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT,
    "productId" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    CONSTRAINT "ProductShare_pkey" PRIMARY KEY ("id")
);

-- CreateTable: ShareContribution
CREATE TABLE "ShareContribution" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "shareId" TEXT NOT NULL,
    "authorName" TEXT,
    "photoPaths" TEXT,
    "note" TEXT,
    CONSTRAINT "ShareContribution_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProductShare_code_key" ON "ProductShare"("code");
CREATE INDEX "ProductShare_productId_idx" ON "ProductShare"("productId");
CREATE INDEX "ProductShare_profileId_idx" ON "ProductShare"("profileId");
CREATE INDEX "ShareContribution_shareId_idx" ON "ShareContribution"("shareId");

-- AddForeignKey
ALTER TABLE "ProductShare" ADD CONSTRAINT "ProductShare_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShareContribution" ADD CONSTRAINT "ShareContribution_shareId_fkey"
    FOREIGN KEY ("shareId") REFERENCES "ProductShare"("id") ON DELETE CASCADE ON UPDATE CASCADE;
