import { prisma } from '@nozzleos/db';
import { TRPCError } from '@trpc/server';
import { Decimal } from 'decimal.js';

export class ShiftService {
    /**
     * Get all shifts with pagination
     */
    async getAllShifts(params: {
        limit: number;
        offset: number;
        status?: 'in_progress' | 'completed' | 'archived';
        userId?: number;
        isAdmin: boolean;
    }) {
        const where: Record<string, unknown> = {};

        if (params.status) {
            where.status = params.status;
        }

        // Non-admin users can only see their own shifts
        if (!params.isAdmin && params.userId) {
            where.userId = params.userId;
        }

        const [sessions, total] = await Promise.all([
            prisma.dutySession.findMany({
                where,
                include: {
                    user: { include: { role: true } },
                    nozzleReadings: {
                        include: {
                            nozzle: { include: { fuel: true, dispenser: true } },
                        },
                    },
                    sessionPayments: {
                        include: { paymentMethod: true },
                    },
                },
                orderBy: { createdAt: 'desc' },
                take: params.limit,
                skip: params.offset,
            }),
            prisma.dutySession.count({ where }),
        ]);

        return { sessions, pagination: { total, limit: params.limit, offset: params.offset } };
    }

    /**
     * Get active shift for a user
     */
    async getUserActiveShift(userId: number) {
        return prisma.dutySession.findFirst({
            where: {
                userId,
                status: 'in_progress',
            },
            include: {
                nozzleReadings: {
                    include: {
                        nozzle: { include: { fuel: true, dispenser: true } },
                    },
                },
                sessionPayments: {
                    include: { paymentMethod: true },
                    orderBy: { createdAt: 'desc' },
                },
            },
        });
    }

    // Helper function to generate shift name
    generateShiftName(): string {
        const now = new Date();
        const hours = now.getHours();

        let shiftType: string;
        if (hours >= 6 && hours < 14) {
            shiftType = 'Morning';
        } else if (hours >= 14 && hours < 22) {
            shiftType = 'Evening';
        } else {
            shiftType = 'Night';
        }

        const dateStr = now.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        });

        return `${shiftType} Shift - ${dateStr}`;
    }

    /**
     * Start a new shift for a user
     */
    async startShift(userId: number, shiftName: string, nozzleIds: number[]) {
        // Check for existing active shift
        const existingShift = await prisma.dutySession.findFirst({
            where: { userId, status: 'in_progress' },
        });

        if (existingShift) {
            throw new TRPCError({
                code: 'BAD_REQUEST',
                message: 'You already have an active shift',
            });
        }

        // Check nozzle availability
        const nozzles = await prisma.nozzle.findMany({
            where: {
                id: { in: nozzleIds },
                isActive: true,
                deletedAt: null,
            },
        });

        if (nozzles.length !== nozzleIds.length) {
            throw new TRPCError({
                code: 'BAD_REQUEST',
                message: 'One or more selected nozzles not found',
            });
        }

        const inUseNozzles = nozzles.filter((n) => !n.isAvailable);
        if (inUseNozzles.length > 0) {
            const inUseCodes = inUseNozzles.map((n) => n.code).join(', ');
            throw new TRPCError({
                code: 'BAD_REQUEST',
                message: `The following nozzles are already in use: ${inUseCodes}`,
            });
        }

        // Create shift and update nozzle availability
        return prisma.$transaction(async (tx) => {
            // Mark nozzles as unavailable
            await tx.nozzle.updateMany({
                where: { id: { in: nozzleIds } },
                data: { isAvailable: false },
            });

            // Create duty session
            const session = await tx.dutySession.create({
                data: {
                    userId,
                    shiftName,
                    nozzleReadings: {
                        create: nozzles.map((nozzle) => ({
                            nozzleId: nozzle.id,
                            openingReading: nozzle.currentreading,
                        })),
                    },
                },
                include: {
                    nozzleReadings: {
                        include: {
                            nozzle: { include: { fuel: true, dispenser: true } },
                        },
                    },
                    sessionPayments: true,
                },
            });

            return session;
        });
    }

    /**
     * Update or add a payment to a shift
     */
    async addOrUpdatePayment(shiftId: number, userId: number, data: { paymentId?: number; paymentMethodId: number; amount: number; quantity?: number }) {
        const session = await this.getActiveShift(shiftId, userId);

        if (data.paymentId) {
            // Update existing
            const existingPayment = await prisma.sessionPayment.findFirst({
                where: { id: data.paymentId, dutySessionId: shiftId }
            });

            if (!existingPayment) {
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'Payment not found',
                });
            }

            await prisma.sessionPayment.update({
                where: { id: data.paymentId },
                data: {
                    paymentMethodId: data.paymentMethodId,
                    amount: data.amount,
                    quantity: data.quantity,
                },
            });
        } else {
            // Create new
            await prisma.sessionPayment.create({
                data: {
                    dutySessionId: shiftId,
                    paymentMethodId: data.paymentMethodId,
                    amount: data.amount,
                    quantity: data.quantity,
                },
            });
        }

        // Recalculate total
        return this.updateShiftTotalCollected(shiftId);
    }

    /**
     * Delete a payment
     */
    async deletePayment(shiftId: number, userId: number, paymentId: number) {
        const session = await this.getActiveShift(shiftId, userId);

        await prisma.sessionPayment.delete({
            where: { id: paymentId },
        });

        // Recalculate total
        return this.updateShiftTotalCollected(shiftId);
    }

    /**
     * Update nozzle reading
     */
    async updateNozzleReading(shiftId: number, userId: number, data: { nozzleReadingId: number; testQty?: number; closingReading?: number }) {
        const session = await this.getActiveShift(shiftId, userId);

        const reading = await prisma.nozzleSessionReading.findUnique({
            where: { id: data.nozzleReadingId },
        });

        if (!reading) {
            throw new TRPCError({
                code: 'NOT_FOUND',
                message: 'Nozzle reading not found',
            });
        }

        const updateData: Record<string, unknown> = {};
        if (data.testQty !== undefined) {
            updateData.testQty = data.testQty;
        }
        if (data.closingReading !== undefined) {
            updateData.closingReading = data.closingReading;
            const opening = new Decimal(reading.openingReading.toString());
            const closing = new Decimal(data.closingReading);
            const testQty = new Decimal(data.testQty ?? reading.testQty.toString());
            updateData.fuelDispensed = closing.minus(opening).minus(testQty).toNumber();
        }

        return prisma.nozzleSessionReading.update({
            where: { id: data.nozzleReadingId },
            data: updateData,
            include: { nozzle: { include: { fuel: true, dispenser: true } } },
        });
    }

    /**
     * Get shift summary
     */
    async getSummary(shiftId: number, userId: number, isAdmin: boolean) {
        const session = await prisma.dutySession.findFirst({
            where: { id: shiftId },
            include: {
                nozzleReadings: {
                    include: {
                        nozzle: { include: { fuel: true } }
                    }
                },
                sessionPayments: { include: { paymentMethod: true } }
            }
        });

        if (!session) {
            throw new TRPCError({
                code: 'NOT_FOUND',
                message: 'Shift not found',
            });
        }

        if (!isAdmin && session.userId !== userId) {
            throw new TRPCError({
                code: 'FORBIDDEN',
                message: 'You do not have permission to view this shift',
            });
        }

        let totalFuelSales = 0;

        const readingsWithAmount = session.nozzleReadings.map(reading => {
            const consumed = Number(reading.fuelDispensed);
            const price = Number(reading.nozzle.price);
            const amount = consumed * price;
            totalFuelSales += amount;

            return {
                ...reading,
                amount,
                price
            };
        });

        const totalCollected = Number(session.totalPaymentCollected);
        const shortage = totalCollected - totalFuelSales;

        return {
            ...session,
            totalFuelSales,
            totalCollected,
            shortage,
            nozzleReadings: readingsWithAmount
        };
    }

    /**
     * Complete shift
     */
    async completeShift(shiftId: number, userId: number, notes?: string) {
        const session = await this.getActiveShift(shiftId, userId);

        return prisma.$transaction(async (tx) => {
            // Mark nozzles as available again
            const nozzleIds = session.nozzleReadings.map((r) => r.nozzleId);
            await tx.nozzle.updateMany({
                where: { id: { in: nozzleIds } },
                data: { isAvailable: true },
            });

            // Update nozzle current readings
            for (const reading of session.nozzleReadings) {
                if (reading.closingReading) {
                    await tx.nozzle.update({
                        where: { id: reading.nozzleId },
                        data: { currentreading: reading.closingReading.toNumber() },
                    });
                }
            }

            // Complete the session
            return tx.dutySession.update({
                where: { id: shiftId },
                data: {
                    status: 'completed',
                    endTime: new Date(),
                    notes: notes,
                },
                include: {
                    nozzleReadings: {
                        include: { nozzle: { include: { fuel: true, dispenser: true } } },
                    },
                    sessionPayments: { include: { paymentMethod: true } },
                },
            });
        });
    }

    // Helper: Validates and gets active shift
    private async getActiveShift(shiftId: number, userId: number) {
        const session = await prisma.dutySession.findFirst({
            where: { id: shiftId, userId, status: 'in_progress' },
            include: { nozzleReadings: true },
        });

        if (!session) {
            throw new TRPCError({
                code: 'NOT_FOUND',
                message: 'Active shift not found',
            });
        }
        return session;
    }

    // Helper: Updates total collected
    private async updateShiftTotalCollected(shiftId: number) {
        const totalPayments = await prisma.sessionPayment.aggregate({
            where: { dutySessionId: shiftId },
            _sum: { amount: true },
        });

        await prisma.dutySession.update({
            where: { id: shiftId },
            data: { totalPaymentCollected: totalPayments._sum.amount || 0 },
        });

        return { success: true };
    }
}
