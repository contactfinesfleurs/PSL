-- Create EventGuest table if it doesn't exist yet (idempotent baseline)
CREATE TABLE IF NOT EXISTS "EventGuest" (
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

-- Add foreign key if not exists
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'EventGuest_eventId_fkey'
    ) THEN
        ALTER TABLE "EventGuest" ADD CONSTRAINT "EventGuest_eventId_fkey"
            FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- Create indexes if not exists
CREATE INDEX IF NOT EXISTS "EventGuest_eventId_idx" ON "EventGuest"("eventId");
CREATE INDEX IF NOT EXISTS "EventGuest_rsvpStatus_idx" ON "EventGuest"("rsvpStatus");

-- Add instagram and phone fields (safe even if table was just created above)
ALTER TABLE "EventGuest" ADD COLUMN IF NOT EXISTS "phone" TEXT;
ALTER TABLE "EventGuest" ADD COLUMN IF NOT EXISTS "instagram" TEXT;
