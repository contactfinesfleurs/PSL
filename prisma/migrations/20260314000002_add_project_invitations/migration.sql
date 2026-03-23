-- Migration: add_project_invitations
-- Adds ProjectInvitation table for invite-by-email flow.
-- An owner invites a collaborator by email; the invitee sees a
-- pending notification in the Projects page and can accept/decline.

CREATE TABLE "ProjectInvitation" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "projectId" TEXT NOT NULL,
    "invitedByProfileId" TEXT NOT NULL,
    "invitedEmail" TEXT NOT NULL,
    "invitedProfileId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    CONSTRAINT "ProjectInvitation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProjectInvitation_projectId_invitedEmail_key"
    ON "ProjectInvitation"("projectId", "invitedEmail");

CREATE INDEX "ProjectInvitation_projectId_idx" ON "ProjectInvitation"("projectId");
CREATE INDEX "ProjectInvitation_invitedEmail_idx" ON "ProjectInvitation"("invitedEmail");
CREATE INDEX "ProjectInvitation_invitedProfileId_idx" ON "ProjectInvitation"("invitedProfileId");

ALTER TABLE "ProjectInvitation" ADD CONSTRAINT "ProjectInvitation_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProjectInvitation" ADD CONSTRAINT "ProjectInvitation_invitedByProfileId_fkey"
    FOREIGN KEY ("invitedByProfileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProjectInvitation" ADD CONSTRAINT "ProjectInvitation_invitedProfileId_fkey"
    FOREIGN KEY ("invitedProfileId") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
