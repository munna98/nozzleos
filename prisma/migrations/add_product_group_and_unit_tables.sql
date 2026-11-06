-- Migration: Add ProductGroup and ProductUnit tables
-- Multi-tenant friendly with stationId foreign key

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

ALTER TABLE "ProductGroup" DROP CONSTRAINT IF EXISTS "ProductGroup_stationId_fkey";
ALTER TABLE "ProductGroup" ADD CONSTRAINT "ProductGroup_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

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

ALTER TABLE "ProductUnit" DROP CONSTRAINT IF EXISTS "ProductUnit_stationId_fkey";
ALTER TABLE "ProductUnit" ADD CONSTRAINT "ProductUnit_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
