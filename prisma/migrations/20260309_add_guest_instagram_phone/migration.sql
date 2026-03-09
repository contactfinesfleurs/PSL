-- Add instagram and phone fields to EventGuest
ALTER TABLE "EventGuest" ADD COLUMN IF NOT EXISTS "phone" TEXT;
ALTER TABLE "EventGuest" ADD COLUMN IF NOT EXISTS "instagram" TEXT;
