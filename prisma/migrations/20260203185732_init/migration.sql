-- CreateEnum
CREATE TYPE "ShiftType" AS ENUM ('MORNING', 'EVENING', 'NIGHT');

-- CreateTable
CREATE TABLE "Station" (
    "id" SERIAL NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT,
    "mobile" TEXT,
    "email" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Station_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserRole" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "UserRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "stationId" INTEGER,
    "username" TEXT NOT NULL,
    "name" TEXT,
    "passwordHash" TEXT NOT NULL,
    "code" TEXT,
    "mobile" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "address" TEXT,
    "roleId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" SERIAL NOT NULL,
    "stationId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentMethod" (
    "id" SERIAL NOT NULL,
    "stationId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "customerId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentMethod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Fuel" (
    "id" SERIAL NOT NULL,
    "stationId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Fuel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Dispenser" (
    "id" SERIAL NOT NULL,
    "stationId" INTEGER NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Dispenser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Nozzle" (
    "id" SERIAL NOT NULL,
    "stationId" INTEGER NOT NULL,
    "code" TEXT NOT NULL,
    "dispenserId" INTEGER NOT NULL,
    "fuelId" INTEGER NOT NULL,
    "price" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currentreading" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Nozzle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DutySession" (
    "id" SERIAL NOT NULL,
    "stationId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "type" "ShiftType" NOT NULL DEFAULT 'MORNING',
    "startTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endTime" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'in_progress',
    "totalPaymentCollected" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "verifiedAt" TIMESTAMP(3),
    "verifiedByUserId" INTEGER,
    "rejectionNotes" TEXT,

    CONSTRAINT "DutySession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NozzleSessionReading" (
    "id" SERIAL NOT NULL,
    "dutySessionId" INTEGER NOT NULL,
    "nozzleId" INTEGER NOT NULL,
    "openingReading" DECIMAL(10,2) NOT NULL,
    "testQty" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "closingReading" DECIMAL(10,2),
    "fuelDispensed" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NozzleSessionReading_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SessionPayment" (
    "id" SERIAL NOT NULL,
    "dutySessionId" INTEGER NOT NULL,
    "paymentMethodId" INTEGER NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "quantity" INTEGER,
    "coinsAmount" DECIMAL(10,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SessionPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Settings" (
    "id" SERIAL NOT NULL,
    "stationId" INTEGER NOT NULL,
    "enableDenominationEntry" BOOLEAN NOT NULL DEFAULT true,
    "enableCoinEntry" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Denomination" (
    "id" SERIAL NOT NULL,
    "value" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Denomination_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentDenomination" (
    "id" SERIAL NOT NULL,
    "sessionPaymentId" INTEGER NOT NULL,
    "denominationId" INTEGER NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PaymentDenomination_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShiftEditRequest" (
    "id" SERIAL NOT NULL,
    "dutySessionId" INTEGER NOT NULL,
    "requestedByUserId" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "approvedByUserId" INTEGER,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShiftEditRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Station_slug_key" ON "Station"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "UserRole_name_key" ON "UserRole"("name");

-- CreateIndex
CREATE INDEX "User_stationId_idx" ON "User"("stationId");

-- CreateIndex
CREATE INDEX "User_roleId_isActive_idx" ON "User"("roleId", "isActive");

-- CreateIndex
CREATE INDEX "User_isActive_idx" ON "User"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "User_stationId_username_key" ON "User"("stationId", "username");

-- CreateIndex
CREATE INDEX "Customer_stationId_idx" ON "Customer"("stationId");

-- CreateIndex
CREATE INDEX "Customer_isActive_idx" ON "Customer"("isActive");

-- CreateIndex
CREATE INDEX "Customer_phone_idx" ON "Customer"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_stationId_email_key" ON "Customer"("stationId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentMethod_customerId_key" ON "PaymentMethod"("customerId");

-- CreateIndex
CREATE INDEX "PaymentMethod_stationId_idx" ON "PaymentMethod"("stationId");

-- CreateIndex
CREATE INDEX "PaymentMethod_isActive_idx" ON "PaymentMethod"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentMethod_stationId_name_key" ON "PaymentMethod"("stationId", "name");

-- CreateIndex
CREATE INDEX "Fuel_stationId_idx" ON "Fuel"("stationId");

-- CreateIndex
CREATE INDEX "Fuel_isActive_idx" ON "Fuel"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Fuel_stationId_name_key" ON "Fuel"("stationId", "name");

-- CreateIndex
CREATE INDEX "Dispenser_stationId_idx" ON "Dispenser"("stationId");

-- CreateIndex
CREATE INDEX "Dispenser_isActive_idx" ON "Dispenser"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Dispenser_stationId_code_key" ON "Dispenser"("stationId", "code");

-- CreateIndex
CREATE INDEX "Nozzle_stationId_idx" ON "Nozzle"("stationId");

-- CreateIndex
CREATE INDEX "Nozzle_isActive_isAvailable_idx" ON "Nozzle"("isActive", "isAvailable");

-- CreateIndex
CREATE INDEX "Nozzle_dispenserId_idx" ON "Nozzle"("dispenserId");

-- CreateIndex
CREATE INDEX "Nozzle_fuelId_idx" ON "Nozzle"("fuelId");

-- CreateIndex
CREATE UNIQUE INDEX "Nozzle_stationId_code_key" ON "Nozzle"("stationId", "code");

-- CreateIndex
CREATE INDEX "DutySession_stationId_idx" ON "DutySession"("stationId");

-- CreateIndex
CREATE INDEX "DutySession_userId_status_idx" ON "DutySession"("userId", "status");

-- CreateIndex
CREATE INDEX "DutySession_status_endTime_idx" ON "DutySession"("status", "endTime");

-- CreateIndex
CREATE INDEX "DutySession_userId_endTime_idx" ON "DutySession"("userId", "endTime");

-- CreateIndex
CREATE INDEX "DutySession_createdAt_idx" ON "DutySession"("createdAt");

-- CreateIndex
CREATE INDEX "NozzleSessionReading_dutySessionId_idx" ON "NozzleSessionReading"("dutySessionId");

-- CreateIndex
CREATE INDEX "NozzleSessionReading_nozzleId_idx" ON "NozzleSessionReading"("nozzleId");

-- CreateIndex
CREATE INDEX "SessionPayment_dutySessionId_idx" ON "SessionPayment"("dutySessionId");

-- CreateIndex
CREATE INDEX "SessionPayment_paymentMethodId_idx" ON "SessionPayment"("paymentMethodId");

-- CreateIndex
CREATE INDEX "SessionPayment_createdAt_idx" ON "SessionPayment"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Settings_stationId_key" ON "Settings"("stationId");

-- CreateIndex
CREATE UNIQUE INDEX "Denomination_value_key" ON "Denomination"("value");

-- CreateIndex
CREATE INDEX "Denomination_sortOrder_idx" ON "Denomination"("sortOrder");

-- CreateIndex
CREATE INDEX "Denomination_isActive_idx" ON "Denomination"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentDenomination_sessionPaymentId_denominationId_key" ON "PaymentDenomination"("sessionPaymentId", "denominationId");

-- CreateIndex
CREATE INDEX "ShiftEditRequest_dutySessionId_idx" ON "ShiftEditRequest"("dutySessionId");

-- CreateIndex
CREATE INDEX "ShiftEditRequest_status_idx" ON "ShiftEditRequest"("status");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "UserRole"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentMethod" ADD CONSTRAINT "PaymentMethod_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentMethod" ADD CONSTRAINT "PaymentMethod_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Fuel" ADD CONSTRAINT "Fuel_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dispenser" ADD CONSTRAINT "Dispenser_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Nozzle" ADD CONSTRAINT "Nozzle_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Nozzle" ADD CONSTRAINT "Nozzle_dispenserId_fkey" FOREIGN KEY ("dispenserId") REFERENCES "Dispenser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Nozzle" ADD CONSTRAINT "Nozzle_fuelId_fkey" FOREIGN KEY ("fuelId") REFERENCES "Fuel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DutySession" ADD CONSTRAINT "DutySession_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DutySession" ADD CONSTRAINT "DutySession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DutySession" ADD CONSTRAINT "DutySession_verifiedByUserId_fkey" FOREIGN KEY ("verifiedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NozzleSessionReading" ADD CONSTRAINT "NozzleSessionReading_dutySessionId_fkey" FOREIGN KEY ("dutySessionId") REFERENCES "DutySession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NozzleSessionReading" ADD CONSTRAINT "NozzleSessionReading_nozzleId_fkey" FOREIGN KEY ("nozzleId") REFERENCES "Nozzle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionPayment" ADD CONSTRAINT "SessionPayment_dutySessionId_fkey" FOREIGN KEY ("dutySessionId") REFERENCES "DutySession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionPayment" ADD CONSTRAINT "SessionPayment_paymentMethodId_fkey" FOREIGN KEY ("paymentMethodId") REFERENCES "PaymentMethod"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Settings" ADD CONSTRAINT "Settings_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentDenomination" ADD CONSTRAINT "PaymentDenomination_denominationId_fkey" FOREIGN KEY ("denominationId") REFERENCES "Denomination"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentDenomination" ADD CONSTRAINT "PaymentDenomination_sessionPaymentId_fkey" FOREIGN KEY ("sessionPaymentId") REFERENCES "SessionPayment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftEditRequest" ADD CONSTRAINT "ShiftEditRequest_dutySessionId_fkey" FOREIGN KEY ("dutySessionId") REFERENCES "DutySession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftEditRequest" ADD CONSTRAINT "ShiftEditRequest_requestedByUserId_fkey" FOREIGN KEY ("requestedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftEditRequest" ADD CONSTRAINT "ShiftEditRequest_approvedByUserId_fkey" FOREIGN KEY ("approvedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
