-- Safe migration for PostgreSQL (Supabase / Neon / Local / Vercel)
-- 1. Create SessionProduct table if it doesn't already exist
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

-- 2. Create Indexes
CREATE INDEX IF NOT EXISTS "SessionProduct_dutySessionId_idx" ON "SessionProduct"("dutySessionId");
CREATE INDEX IF NOT EXISTS "SessionProduct_productId_idx" ON "SessionProduct"("productId");
CREATE INDEX IF NOT EXISTS "SessionProduct_createdAt_idx" ON "SessionProduct"("createdAt");

-- 3. Add Foreign Key to DutySession
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

-- 4. Add Foreign Key to Product
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
