-- Migration: add_projects
-- Adds Project, ProjectProduct, ProjectCollaborator, ProjectContribution tables
-- for collaborative collection sharing between authenticated profiles.

-- CreateTable: Project
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "code" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable: ProjectProduct
CREATE TABLE "ProjectProduct" (
    "id" TEXT NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "projectId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    CONSTRAINT "ProjectProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable: ProjectCollaborator
CREATE TABLE "ProjectCollaborator" (
    "id" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "projectId" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    CONSTRAINT "ProjectCollaborator_pkey" PRIMARY KEY ("id")
);

-- CreateTable: ProjectContribution
CREATE TABLE "ProjectContribution" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "projectId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "photoPaths" TEXT,
    "note" TEXT,
    CONSTRAINT "ProjectContribution_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Project_code_key" ON "Project"("code");
CREATE INDEX "Project_profileId_idx" ON "Project"("profileId");

CREATE UNIQUE INDEX "ProjectProduct_projectId_productId_key" ON "ProjectProduct"("projectId", "productId");
CREATE INDEX "ProjectProduct_projectId_idx" ON "ProjectProduct"("projectId");
CREATE INDEX "ProjectProduct_productId_idx" ON "ProjectProduct"("productId");

CREATE UNIQUE INDEX "ProjectCollaborator_projectId_profileId_key" ON "ProjectCollaborator"("projectId", "profileId");
CREATE INDEX "ProjectCollaborator_projectId_idx" ON "ProjectCollaborator"("projectId");
CREATE INDEX "ProjectCollaborator_profileId_idx" ON "ProjectCollaborator"("profileId");

CREATE INDEX "ProjectContribution_projectId_idx" ON "ProjectContribution"("projectId");
CREATE INDEX "ProjectContribution_productId_idx" ON "ProjectContribution"("productId");
CREATE INDEX "ProjectContribution_profileId_idx" ON "ProjectContribution"("profileId");

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_profileId_fkey"
    FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProjectProduct" ADD CONSTRAINT "ProjectProduct_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProjectProduct" ADD CONSTRAINT "ProjectProduct_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProjectCollaborator" ADD CONSTRAINT "ProjectCollaborator_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProjectCollaborator" ADD CONSTRAINT "ProjectCollaborator_profileId_fkey"
    FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProjectContribution" ADD CONSTRAINT "ProjectContribution_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProjectContribution" ADD CONSTRAINT "ProjectContribution_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProjectContribution" ADD CONSTRAINT "ProjectContribution_profileId_fkey"
    FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
