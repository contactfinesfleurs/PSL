-- Add color code fields to Product
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "colorPrimary" TEXT;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "colorSecondary" TEXT;
