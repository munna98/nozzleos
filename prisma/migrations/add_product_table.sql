-- Safe migration for PostgreSQL (Supabase / Neon / Local / Vercel)
-- 1. Create Product table if it doesn't already exist
CREATE TABLE IF NOT EXISTS "Product" (
    "id" SERIAL NOT NULL,
    "stationId" INTEGER NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "rate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "group" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- 2. Create Indexes
CREATE INDEX IF NOT EXISTS "Product_stationId_idx" ON "Product"("stationId");
CREATE INDEX IF NOT EXISTS "Product_isActive_idx" ON "Product"("isActive");
CREATE INDEX IF NOT EXISTS "Product_group_idx" ON "Product"("group");
CREATE UNIQUE INDEX IF NOT EXISTS "Product_stationId_code_key" ON "Product"("stationId", "code");

-- 3. Add Foreign Key Constraint to Station
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'Product_stationId_fkey'
    ) THEN
        ALTER TABLE "Product" 
        ADD CONSTRAINT "Product_stationId_fkey" 
        FOREIGN KEY ("stationId") REFERENCES "Station"("id") 
        ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;
