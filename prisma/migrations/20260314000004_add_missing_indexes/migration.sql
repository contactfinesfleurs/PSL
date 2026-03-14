-- Add composite index on Product(profileId, deletedAt) to speed up
-- the common list query: findMany({ where: { profileId, deletedAt: null } })
CREATE INDEX "Product_profileId_deletedAt_idx" ON "Product"("profileId", "deletedAt");

-- Add index on ProjectInvitation(expiresAt) to speed up the expiry filter:
-- findFirst({ where: { ..., OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] } })
CREATE INDEX "ProjectInvitation_expiresAt_idx" ON "ProjectInvitation"("expiresAt");
