-- Migration initiale — crée le schéma complet depuis zéro

-- CreateEnum
CREATE TYPE "ProfileRole" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'MEMBER');

-- CreateTable: Team
CREATE TABLE "Team" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Profile
CREATE TABLE "Profile" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "ProfileRole" NOT NULL DEFAULT 'MEMBER',
    "teamId" TEXT,
    CONSTRAINT "Profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Product
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "profileId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "reference" TEXT,
    "family" TEXT NOT NULL,
    "season" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "sizeRange" TEXT NOT NULL,
    "sizes" TEXT NOT NULL,
    "measurements" TEXT,
    "materials" TEXT,
    "colors" TEXT,
    "sketchPaths" TEXT,
    "techPackPath" TEXT,
    "description" TEXT,
    "metaTags" TEXT,
    "sampleStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "plannedLaunchAt" TIMESTAMP(3),
    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Sample
CREATE TABLE "Sample" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "productId" TEXT NOT NULL,
    "samplePhotoPaths" TEXT,
    "detailPhotoPaths" TEXT,
    "reviewPhotoPaths" TEXT,
    "reviewNotes" TEXT,
    "supplierName" TEXT,
    "supplierAddress" TEXT,
    "supplierCountry" TEXT,
    "shippingDate" TIMESTAMP(3),
    "trackingNumber" TEXT,
    "trackingStatus" TEXT,
    "receivedAt" TIMESTAMP(3),
    "packshotPaths" TEXT,
    "definitiveColors" TEXT,
    "definitiveMaterials" TEXT,
    CONSTRAINT "Sample_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Event
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "profileId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3),
    "location" TEXT,
    "venue" TEXT,
    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Campaign
CREATE TABLE "Campaign" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "profileId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "startAt" TIMESTAMP(3),
    "endAt" TIMESTAMP(3),
    "budget" DOUBLE PRECISION,
    "currency" TEXT DEFAULT 'EUR',
    "eventId" TEXT,
    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable: SampleLoan
CREATE TABLE "SampleLoan" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "sampleId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "contactName" TEXT NOT NULL,
    "contactRole" TEXT,
    "publication" TEXT,
    "purpose" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueAt" TIMESTAMP(3),
    "returnedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'SENT',
    "notes" TEXT,
    CONSTRAINT "SampleLoan_pkey" PRIMARY KEY ("id")
);

-- CreateTable: MediaPlacement
CREATE TABLE "MediaPlacement" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "productId" TEXT NOT NULL,
    "sampleLoanId" TEXT,
    "publication" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3) NOT NULL,
    "url" TEXT,
    "screenshotPath" TEXT,
    "notes" TEXT,
    "reach" INTEGER,
    CONSTRAINT "MediaPlacement_pkey" PRIMARY KEY ("id")
);

-- CreateTable: EventGuest
CREATE TABLE "EventGuest" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "eventId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "instagram" TEXT,
    "company" TEXT,
    "title" TEXT,
    "category" TEXT NOT NULL DEFAULT 'GUEST',
    "invitedBy" TEXT,
    "rsvpStatus" TEXT NOT NULL DEFAULT 'INVITED',
    "checkedIn" BOOLEAN NOT NULL DEFAULT false,
    "checkedInAt" TIMESTAMP(3),
    "tableNumber" TEXT,
    "seatNumber" TEXT,
    "notes" TEXT,
    CONSTRAINT "EventGuest_pkey" PRIMARY KEY ("id")
);

-- CreateTable: CampaignProduct
CREATE TABLE "CampaignProduct" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    CONSTRAINT "CampaignProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable: EventProduct
CREATE TABLE "EventProduct" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "look" INTEGER,
    CONSTRAINT "EventProduct_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Profile_email_key" ON "Profile"("email");
CREATE INDEX "Profile_role_idx" ON "Profile"("role");
CREATE INDEX "Profile_teamId_idx" ON "Profile"("teamId");

CREATE UNIQUE INDEX "Product_sku_key" ON "Product"("sku");
CREATE INDEX "Product_profileId_idx" ON "Product"("profileId");
CREATE INDEX "Product_profileId_season_year_idx" ON "Product"("profileId", "season", "year");
CREATE INDEX "Product_profileId_family_idx" ON "Product"("profileId", "family");
CREATE INDEX "Product_sampleStatus_idx" ON "Product"("sampleStatus");

CREATE INDEX "Sample_productId_idx" ON "Sample"("productId");

CREATE INDEX "Event_profileId_idx" ON "Event"("profileId");
CREATE INDEX "Event_status_idx" ON "Event"("status");
CREATE INDEX "Event_deletedAt_idx" ON "Event"("deletedAt");

CREATE INDEX "Campaign_profileId_idx" ON "Campaign"("profileId");
CREATE INDEX "Campaign_status_idx" ON "Campaign"("status");
CREATE INDEX "Campaign_deletedAt_idx" ON "Campaign"("deletedAt");

CREATE INDEX "SampleLoan_sampleId_idx" ON "SampleLoan"("sampleId");
CREATE INDEX "SampleLoan_productId_idx" ON "SampleLoan"("productId");
CREATE INDEX "SampleLoan_status_idx" ON "SampleLoan"("status");

CREATE INDEX "MediaPlacement_productId_idx" ON "MediaPlacement"("productId");
CREATE INDEX "MediaPlacement_sampleLoanId_idx" ON "MediaPlacement"("sampleLoanId");

CREATE INDEX "EventGuest_eventId_idx" ON "EventGuest"("eventId");
CREATE INDEX "EventGuest_rsvpStatus_idx" ON "EventGuest"("rsvpStatus");

CREATE UNIQUE INDEX "CampaignProduct_campaignId_productId_key" ON "CampaignProduct"("campaignId", "productId");
CREATE UNIQUE INDEX "EventProduct_eventId_productId_key" ON "EventProduct"("eventId", "productId");

-- AddForeignKey
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Product" ADD CONSTRAINT "Product_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Sample" ADD CONSTRAINT "Sample_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Event" ADD CONSTRAINT "Event_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "SampleLoan" ADD CONSTRAINT "SampleLoan_sampleId_fkey" FOREIGN KEY ("sampleId") REFERENCES "Sample"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SampleLoan" ADD CONSTRAINT "SampleLoan_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MediaPlacement" ADD CONSTRAINT "MediaPlacement_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MediaPlacement" ADD CONSTRAINT "MediaPlacement_sampleLoanId_fkey" FOREIGN KEY ("sampleLoanId") REFERENCES "SampleLoan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "EventGuest" ADD CONSTRAINT "EventGuest_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CampaignProduct" ADD CONSTRAINT "CampaignProduct_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CampaignProduct" ADD CONSTRAINT "CampaignProduct_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "EventProduct" ADD CONSTRAINT "EventProduct_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EventProduct" ADD CONSTRAINT "EventProduct_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
