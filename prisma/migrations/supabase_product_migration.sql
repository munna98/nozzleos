-- ============================================================================
-- Supabase Migration Script for Product Sales & Shift Integration
-- 100% Safe and Idempotent (can be run multiple times without data loss)
-- ============================================================================

-- 1. Ensure fuelPrice column exists on NozzleSessionReading
ALTER TABLE "NozzleSessionReading" 
ADD COLUMN IF NOT EXISTS "fuelPrice" DECIMAL(10, 2) NOT NULL DEFAULT 0;

UPDATE "NozzleSessionReading" nsr
SET "fuelPrice" = n.price
FROM "Nozzle" n
WHERE nsr."nozzleId" = n.id
  AND (nsr."fuelPrice" = 0 OR nsr."fuelPrice" IS NULL);

-- 2. Create Product table
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

CREATE INDEX IF NOT EXISTS "Product_stationId_idx" ON "Product"("stationId");
CREATE INDEX IF NOT EXISTS "Product_isActive_idx" ON "Product"("isActive");
CREATE INDEX IF NOT EXISTS "Product_group_idx" ON "Product"("group");
CREATE UNIQUE INDEX IF NOT EXISTS "Product_stationId_code_key" ON "Product"("stationId", "code");

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

-- 3. Create ProductGroup table
CREATE TABLE IF NOT EXISTS "ProductGroup" (
    "id" SERIAL NOT NULL,
    "stationId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT DEFAULT 'slate',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductGroup_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ProductGroup_stationId_name_key" ON "ProductGroup"("stationId", "name");
CREATE INDEX IF NOT EXISTS "ProductGroup_stationId_idx" ON "ProductGroup"("stationId");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'ProductGroup_stationId_fkey'
    ) THEN
        ALTER TABLE "ProductGroup" 
        ADD CONSTRAINT "ProductGroup_stationId_fkey" 
        FOREIGN KEY ("stationId") REFERENCES "Station"("id") 
        ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

-- 4. Create ProductUnit table
CREATE TABLE IF NOT EXISTS "ProductUnit" (
    "id" SERIAL NOT NULL,
    "stationId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductUnit_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ProductUnit_stationId_code_key" ON "ProductUnit"("stationId", "code");
CREATE INDEX IF NOT EXISTS "ProductUnit_stationId_idx" ON "ProductUnit"("stationId");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'ProductUnit_stationId_fkey'
    ) THEN
        ALTER TABLE "ProductUnit" 
        ADD CONSTRAINT "ProductUnit_stationId_fkey" 
        FOREIGN KEY ("stationId") REFERENCES "Station"("id") 
        ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

-- 5. Create SessionProduct table (Links DutySession and Product)
CREATE TABLE IF NOT EXISTS "SessionProduct" (
    "id" SERIAL NOT NULL,
    "dutySessionId" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,
    "quantity" DECIMAL(10, 2) NOT NULL DEFAULT 1,
    "price" DECIMAL(10, 2) NOT NULL DEFAULT 0,
    "amount" DECIMAL(10, 2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SessionProduct_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "SessionProduct_dutySessionId_idx" ON "SessionProduct"("dutySessionId");
CREATE INDEX IF NOT EXISTS "SessionProduct_productId_idx" ON "SessionProduct"("productId");
CREATE INDEX IF NOT EXISTS "SessionProduct_createdAt_idx" ON "SessionProduct"("createdAt");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'SessionProduct_dutySessionId_fkey'
    ) THEN
        ALTER TABLE "SessionProduct"
        ADD CONSTRAINT "SessionProduct_dutySessionId_fkey"
        FOREIGN KEY ("dutySessionId") REFERENCES "DutySession"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'SessionProduct_productId_fkey'
    ) THEN
        ALTER TABLE "SessionProduct"
        ADD CONSTRAINT "SessionProduct_productId_fkey"
        FOREIGN KEY ("productId") REFERENCES "Product"("id")
        ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;
