-- Safe migration for Supabase / PostgreSQL
-- 1. Add fuelPrice column if it doesn't already exist with default 0
ALTER TABLE "NozzleSessionReading" 
ADD COLUMN IF NOT EXISTS "fuelPrice" DECIMAL(10, 2) NOT NULL DEFAULT 0;

-- 2. Non-destructive backfill: snapshot historical nozzle prices into existing reading records
UPDATE "NozzleSessionReading" nsr
SET "fuelPrice" = n.price
FROM "Nozzle" n
WHERE nsr."nozzleId" = n.id
  AND (nsr."fuelPrice" = 0 OR nsr."fuelPrice" IS NULL);
