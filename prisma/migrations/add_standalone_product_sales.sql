-- Safe, idempotent migration for standalone admin product sales
-- Adds stationId, soldByUserId, createdByUserId, soldAt, notes to SessionProduct
-- Makes dutySessionId nullable and backfills existing rows safely

-- 1. Add new columns if they don't exist
ALTER TABLE "SessionProduct" ADD COLUMN IF NOT EXISTS "stationId" INTEGER;
ALTER TABLE "SessionProduct" ADD COLUMN IF NOT EXISTS "soldByUserId" INTEGER;
ALTER TABLE "SessionProduct" ADD COLUMN IF NOT EXISTS "createdByUserId" INTEGER;
ALTER TABLE "SessionProduct" ADD COLUMN IF NOT EXISTS "soldAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "SessionProduct" ADD COLUMN IF NOT EXISTS "notes" TEXT;

-- 2. Backfill stationId from DutySession (fallback to Product if needed)
UPDATE "SessionProduct" sp
SET "stationId" = ds."stationId"
FROM "DutySession" ds
WHERE sp."dutySessionId" = ds.id
  AND sp."stationId" IS NULL;

UPDATE "SessionProduct" sp
SET "stationId" = p."stationId"
FROM "Product" p
WHERE sp."productId" = p.id
  AND sp."stationId" IS NULL;

-- 3. Backfill soldAt from createdAt for existing rows where soldAt was just defaulted
UPDATE "SessionProduct"
SET "soldAt" = "createdAt"
WHERE "createdAt" < "soldAt";

-- 4. Enforce NOT NULL on stationId and allow NULL on dutySessionId
ALTER TABLE "SessionProduct" ALTER COLUMN "stationId" SET NOT NULL;
ALTER TABLE "SessionProduct" ALTER COLUMN "dutySessionId" DROP NOT NULL;

-- 5. Create Indexes
CREATE INDEX IF NOT EXISTS "SessionProduct_stationId_idx" ON "SessionProduct"("stationId");
CREATE INDEX IF NOT EXISTS "SessionProduct_soldByUserId_idx" ON "SessionProduct"("soldByUserId");
CREATE INDEX IF NOT EXISTS "SessionProduct_soldAt_idx" ON "SessionProduct"("soldAt");

-- 6. Add Foreign Keys safely
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'SessionProduct_stationId_fkey'
    ) THEN
        ALTER TABLE "SessionProduct"
        ADD CONSTRAINT "SessionProduct_stationId_fkey"
        FOREIGN KEY ("stationId") REFERENCES "Station"("id")
        ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'SessionProduct_soldByUserId_fkey'
    ) THEN
        ALTER TABLE "SessionProduct"
        ADD CONSTRAINT "SessionProduct_soldByUserId_fkey"
        FOREIGN KEY ("soldByUserId") REFERENCES "User"("id")
        ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'SessionProduct_createdByUserId_fkey'
    ) THEN
        ALTER TABLE "SessionProduct"
        ADD CONSTRAINT "SessionProduct_createdByUserId_fkey"
        FOREIGN KEY ("createdByUserId") REFERENCES "User"("id")
        ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;
