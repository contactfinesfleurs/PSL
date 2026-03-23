-- Add variant group support: products sharing the same variantGroupId are color variants
ALTER TABLE "Product" ADD COLUMN "variantGroupId" TEXT;
CREATE INDEX "Product_variantGroupId_idx" ON "Product"("variantGroupId");
CREATE INDEX "Product_profileId_variantGroupId_idx" ON "Product"("profileId", "variantGroupId");
