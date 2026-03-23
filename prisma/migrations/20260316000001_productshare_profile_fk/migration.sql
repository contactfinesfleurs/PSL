-- AddForeignKey: enforce referential integrity on ProductShare.profileId
ALTER TABLE "ProductShare" ADD CONSTRAINT "ProductShare_profileId_fkey"
  FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
