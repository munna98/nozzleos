-- Safe migration for PostgreSQL (Supabase / Neon / Local / Vercel)
-- Adds staff assignment to SessionPayment

-- 1. Add staffId column to SessionPayment if it doesn't already exist
ALTER TABLE "SessionPayment" 
ADD COLUMN IF NOT EXISTS "staffId" INTEGER;

-- 2. Create Index on staffId for quick lookup
CREATE INDEX IF NOT EXISTS "SessionPayment_staffId_idx" 
ON "SessionPayment"("staffId");

-- 3. Add Foreign Key to User table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'SessionPayment_staffId_fkey'
    ) THEN
        ALTER TABLE "SessionPayment"
        ADD CONSTRAINT "SessionPayment_staffId_fkey"
        FOREIGN KEY ("staffId") REFERENCES "User"("id")
        ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;
