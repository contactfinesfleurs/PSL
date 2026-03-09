-- AlterTable
ALTER TABLE "Sample" ADD COLUMN "supplierName" TEXT,
ADD COLUMN "supplierAddress" TEXT,
ADD COLUMN "supplierCountry" TEXT,
ADD COLUMN "shippingDate" TIMESTAMP(3),
ADD COLUMN "trackingNumber" TEXT,
ADD COLUMN "trackingStatus" TEXT,
ADD COLUMN "receivedAt" TIMESTAMP(3);
