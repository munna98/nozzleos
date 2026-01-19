const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const { Decimal } = require('decimal.js');

// Helper function to generate shift name
const generateShiftName = () => {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = String(now.getFullYear()).slice(-2);

    const hours = now.getHours();
    let period;
    if (hours >= 5 && hours < 12) {
        period = 'Morning';
    } else if (hours >= 12 && hours < 17) {
        period = 'Afternoon';
    } else if (hours >= 17 && hours < 21) {
        period = 'Evening';
    } else {
        period = 'Night';
    }

    return `Shift_${day}-${month}-${year}_${period}`;
};

// POST /shifts/generate-shift-name
router.post('/generate-shift-name', async (req, res) => {
    try {
        const shiftName = generateShiftName();
        res.json({ shiftName });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /shifts (Admin/Manager mostly, but useful for history)
router.get('/', async (req, res) => {
    try {
        const { limit = 10, offset = 0, status, userId: queryUserId } = req.query;
        const userRole = req.user.role;
        const currentUserId = req.user.id;

        const where = {};

        // If not Admin/Manager, restrict to own shifts
        if (!['Admin', 'Manager'].includes(userRole)) {
            where.userId = currentUserId;
        } else if (queryUserId) {
            // Admin/Manager can filter by userId
            where.userId = parseInt(queryUserId);
        }

        if (status) {
            where.status = status;
        }

        const sessions = await prisma.dutySession.findMany({
            where,
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        username: true
                    }
                },
                nozzleReadings: {
                    select: {
                        id: true,
                        nozzleId: true
                    }
                },
                sessionPayments: {
                    select: {
                        id: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            },
            take: parseInt(limit),
            skip: parseInt(offset)
        });

        const total = await prisma.dutySession.count({ where });

        res.json({
            sessions,
            pagination: {
                total,
                limit: parseInt(limit),
                offset: parseInt(offset)
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST /shifts/start
router.post('/start', async (req, res) => {
    try {
        const { shiftName, nozzleIds } = req.body;
        const userId = req.user.id; // From authenticated user

        // Validation
        if (!shiftName || !shiftName.trim()) {
            return res.status(400).json({ error: 'Shift name is required' });
        }

        if (!nozzleIds || !Array.isArray(nozzleIds) || nozzleIds.length === 0) {
            return res.status(400).json({ error: 'At least one nozzle must be selected' });
        }

        // Check if user has an active shift
        const activeShift = await prisma.dutySession.findFirst({
            where: {
                userId,
                status: 'in_progress'
            }
        });

        if (activeShift) {
            return res.status(400).json({
                error: 'You already have an active shift. Please complete it before starting a new one.'
            });
        }

        // Fetch nozzles with their current readings
        const nozzles = await prisma.nozzle.findMany({
            where: {
                id: { in: nozzleIds.map(id => parseInt(id)) },
                deletedAt: null
            },
            include: {
                fuel: true,
                dispenser: true
            }
        });

        if (nozzles.length !== nozzleIds.length) {
            return res.status(400).json({ error: 'One or more selected nozzles not found' });
        }

        // Check if any nozzle is already in use
        const inUseNozzles = nozzles.filter(n => !n.isAvailable);
        if (inUseNozzles.length > 0) {
            const inUseCodes = inUseNozzles.map(n => n.code).join(', ');
            return res.status(400).json({
                error: `The following nozzles are already in use: ${inUseCodes}`
            });
        }

        // Create duty session and update nozzles status in a transaction
        const result = await prisma.$transaction(async (prisma) => {
            // Update nozzles to unavailable
            await prisma.nozzle.updateMany({
                where: {
                    id: { in: nozzleIds.map(id => parseInt(id)) }
                },
                data: {
                    isAvailable: false
                }
            });

            // Create duty session with nozzle readings
            return await prisma.dutySession.create({
                data: {
                    userId,
                    shiftName: shiftName.trim(),
                    status: 'in_progress',
                    nozzleReadings: {
                        create: nozzles.map(nozzle => ({
                            nozzleId: nozzle.id,
                            openingReading: new Decimal(nozzle.currentreading),
                            testQty: new Decimal(0),
                            fuelDispensed: new Decimal(0)
                        }))
                    }
                },
                include: {
                    nozzleReadings: {
                        include: {
                            nozzle: {
                                include: {
                                    fuel: true,
                                    dispenser: true
                                }
                            }
                        }
                    },
                    sessionPayments: true
                }
            });
        });

        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST /shifts/:id/add-payment
router.post('/:id/add-payment', async (req, res) => {
    try {
        const { id } = req.params;
        const { paymentMethodId, amount, quantity } = req.body;
        const userId = req.user.id;

        // Validation
        if (!paymentMethodId || !amount) {
            return res.status(400).json({ error: 'Payment method and amount are required' });
        }

        const amountDecimal = new Decimal(amount);
        if (amountDecimal.lte(0)) {
            return res.status(400).json({ error: 'Amount must be greater than 0' });
        }

        // Check shift exists
        // Allow Admin/Manager to add payment to any active shift
        const where = {
            id: parseInt(id),
            status: 'in_progress'
        };

        if (!['Admin', 'Manager'].includes(req.user.role)) {
            where.userId = userId;
        }

        const shift = await prisma.dutySession.findFirst({
            where
        });

        if (!shift) {
            return res.status(404).json({ error: 'Active shift not found' });
        }

        // Create payment
        const payment = await prisma.sessionPayment.create({
            data: {
                dutySessionId: parseInt(id),
                paymentMethodId: parseInt(paymentMethodId),
                amount: amountDecimal,
                quantity: quantity ? parseInt(quantity) : null
            },
            include: {
                paymentMethod: true
            }
        });

        // Update total payment collected
        const totalPayments = await prisma.sessionPayment.aggregate({
            where: { dutySessionId: parseInt(id) },
            _sum: { amount: true }
        });

        await prisma.dutySession.update({
            where: { id: parseInt(id) },
            data: {
                totalPaymentCollected: totalPayments._sum.amount || new Decimal(0)
            }
        });

        // Fetch updated payment summary
        const payments = await prisma.sessionPayment.findMany({
            where: { dutySessionId: parseInt(id) },
            include: { paymentMethod: true },
            orderBy: { createdAt: 'desc' }
        });

        res.json({
            payment,
            payments,
            totalPaymentCollected: totalPayments._sum.amount || new Decimal(0)
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// DELETE /shifts/:id/payment/:paymentId
router.delete('/:id/payment/:paymentId', async (req, res) => {
    try {
        const { id, paymentId } = req.params;
        const userId = req.user.id;

        // Verify shift ownership and status
        const where = {
            id: parseInt(id),
            status: 'in_progress'
        };

        if (!['Admin', 'Manager'].includes(req.user.role)) {
            where.userId = userId;
        }

        const shift = await prisma.dutySession.findFirst({
            where
        });

        if (!shift) {
            return res.status(404).json({ error: 'Active shift not found' });
        }

        // Verify payment belongs to this shift
        const payment = await prisma.sessionPayment.findFirst({
            where: {
                id: parseInt(paymentId),
                dutySessionId: parseInt(id)
            }
        });

        if (!payment) {
            return res.status(404).json({ error: 'Payment not found' });
        }

        // Delete payment
        await prisma.sessionPayment.delete({
            where: { id: parseInt(paymentId) }
        });

        // Update total payment collected
        const totalPayments = await prisma.sessionPayment.aggregate({
            where: { dutySessionId: parseInt(id) },
            _sum: { amount: true }
        });

        await prisma.dutySession.update({
            where: { id: parseInt(id) },
            data: {
                totalPaymentCollected: totalPayments._sum.amount || new Decimal(0)
            }
        });

        // Fetch updated payment summary
        const payments = await prisma.sessionPayment.findMany({
            where: { dutySessionId: parseInt(id) },
            include: { paymentMethod: true },
            orderBy: { createdAt: 'desc' }
        });

        res.json({
            payments,
            totalPaymentCollected: totalPayments._sum.amount || new Decimal(0)
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// PUT /shifts/:id/payment/:paymentId
router.put('/:id/payment/:paymentId', async (req, res) => {
    try {
        const { id, paymentId } = req.params;
        const { paymentMethodId, amount } = req.body;
        const userId = req.user.id;

        // Validation
        if (!paymentMethodId || !amount) {
            return res.status(400).json({ error: 'Payment method and amount are required' });
        }

        const amountDecimal = new Decimal(amount);
        if (amountDecimal.lte(0)) {
            return res.status(400).json({ error: 'Amount must be greater than 0' });
        }

        // Verify shift ownership and status
        const where = {
            id: parseInt(id),
            status: 'in_progress'
        };

        if (!['Admin', 'Manager'].includes(req.user.role)) {
            where.userId = userId;
        }

        const shift = await prisma.dutySession.findFirst({
            where
        });

        if (!shift) {
            return res.status(404).json({ error: 'Active shift not found' });
        }

        // Verify payment belongs to this shift
        const existingPayment = await prisma.sessionPayment.findFirst({
            where: {
                id: parseInt(paymentId),
                dutySessionId: parseInt(id)
            }
        });

        if (!existingPayment) {
            return res.status(404).json({ error: 'Payment not found' });
        }

        // Update payment
        const payment = await prisma.sessionPayment.update({
            where: { id: parseInt(paymentId) },
            data: {
                paymentMethodId: parseInt(paymentMethodId),
                amount: amountDecimal
            },
            include: {
                paymentMethod: true
            }
        });

        // Update total payment collected
        const totalPayments = await prisma.sessionPayment.aggregate({
            where: { dutySessionId: parseInt(id) },
            _sum: { amount: true }
        });

        await prisma.dutySession.update({
            where: { id: parseInt(id) },
            data: {
                totalPaymentCollected: totalPayments._sum.amount || new Decimal(0)
            }
        });

        // Fetch updated payment summary
        const payments = await prisma.sessionPayment.findMany({
            where: { dutySessionId: parseInt(id) },
            include: { paymentMethod: true },
            orderBy: { createdAt: 'desc' }
        });

        res.json({
            payment,
            payments,
            totalPaymentCollected: totalPayments._sum.amount || new Decimal(0)
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// PATCH /shifts/:id/nozzle/:nozzleSessionReadingId/test-qty
router.patch('/:id/nozzle/:nozzleSessionReadingId/test-qty', async (req, res) => {
    try {
        const { id, nozzleSessionReadingId } = req.params;
        const { testQty } = req.body;
        const userId = req.user.id;

        // Validation
        if (testQty === undefined || testQty === null) {
            return res.status(400).json({ error: 'Test quantity is required' });
        }

        const testQtyDecimal = new Decimal(testQty);
        if (testQtyDecimal.lt(0)) {
            return res.status(400).json({ error: 'Test quantity cannot be negative' });
        }

        // Verify shift ownership and status
        const where = {
            id: parseInt(id),
            status: 'in_progress'
        };

        if (!['Admin', 'Manager'].includes(req.user.role)) {
            where.userId = userId;
        }

        const shift = await prisma.dutySession.findFirst({
            where
        });

        if (!shift) {
            return res.status(404).json({ error: 'Active shift not found' });
        }

        // Update test quantity
        const reading = await prisma.nozzleSessionReading.update({
            where: {
                id: parseInt(nozzleSessionReadingId),
                dutySessionId: parseInt(id)
            },
            data: {
                testQty: testQtyDecimal
            },
            include: {
                nozzle: {
                    include: {
                        fuel: true,
                        dispenser: true
                    }
                }
            }
        });

        res.json(reading);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// PATCH /shifts/:id/nozzle/:nozzleSessionReadingId/closing-reading
router.patch('/:id/nozzle/:nozzleSessionReadingId/closing-reading', async (req, res) => {
    try {
        const { id, nozzleSessionReadingId } = req.params;
        const { closingReading } = req.body;
        const userId = req.user.id;

        // Validation
        if (closingReading === undefined || closingReading === null) {
            return res.status(400).json({ error: 'Closing reading is required' });
        }

        const closingReadingDecimal = new Decimal(closingReading);

        // Verify shift ownership and status
        const where = {
            id: parseInt(id),
            status: 'in_progress'
        };

        if (!['Admin', 'Manager'].includes(req.user.role)) {
            where.userId = userId;
        }

        const shift = await prisma.dutySession.findFirst({
            where
        });

        if (!shift) {
            return res.status(404).json({ error: 'Active shift not found' });
        }

        // Get current reading to validate
        const currentReading = await prisma.nozzleSessionReading.findUnique({
            where: { id: parseInt(nozzleSessionReadingId) }
        });

        if (!currentReading) {
            return res.status(404).json({ error: 'Nozzle reading not found' });
        }

        if (closingReadingDecimal.lt(currentReading.openingReading)) {
            return res.status(400).json({
                error: 'Closing reading must be greater than or equal to opening reading'
            });
        }

        // Calculate fuel dispensed
        const fuelDispensed = closingReadingDecimal
            .minus(currentReading.openingReading)
            .minus(currentReading.testQty);

        // Update closing reading and fuel dispensed
        const reading = await prisma.nozzleSessionReading.update({
            where: {
                id: parseInt(nozzleSessionReadingId),
                dutySessionId: parseInt(id)
            },
            data: {
                closingReading: closingReadingDecimal,
                fuelDispensed
            },
            include: {
                nozzle: {
                    include: {
                        fuel: true,
                        dispenser: true
                    }
                }
            }
        });

        res.json(reading);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /shifts/:id/preview
router.get('/:id/preview', async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        // Get shift with all related data
        const where = {
            id: parseInt(id)
        };

        if (!['Admin', 'Manager'].includes(req.user.role)) {
            where.userId = userId;
        }

        const shift = await prisma.dutySession.findFirst({
            where,
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        username: true
                    }
                },
                nozzleReadings: {
                    include: {
                        nozzle: {
                            include: {
                                fuel: true,
                                dispenser: true
                            }
                        }
                    }
                },
                sessionPayments: {
                    include: {
                        paymentMethod: true
                    },
                    orderBy: {
                        createdAt: 'desc'
                    }
                }
            }
        });

        if (!shift) {
            return res.status(404).json({ error: 'Shift not found' });
        }

        // Calculate metrics
        const totalFuelDispensed = shift.nozzleReadings.reduce(
            (sum, reading) => sum.plus(reading.fuelDispensed),
            new Decimal(0)
        );

        const expectedRevenue = shift.nozzleReadings.reduce(
            (sum, reading) => {
                const revenue = reading.fuelDispensed.times(reading.nozzle.price);
                return sum.plus(revenue);
            },
            new Decimal(0)
        );

        const actualRevenue = shift.sessionPayments.reduce(
            (sum, payment) => sum.plus(payment.amount),
            new Decimal(0)
        );

        const discrepancy = actualRevenue.minus(expectedRevenue);

        res.json({
            ...shift,
            metrics: {
                totalFuelDispensed,
                expectedRevenue,
                actualRevenue,
                discrepancy,
                duration: shift.endTime
                    ? Math.floor((new Date(shift.endTime) - new Date(shift.startTime)) / 1000 / 60)
                    : null
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST /shifts/:id/submit
router.post('/:id/submit', async (req, res) => {
    try {
        const { id } = req.params;
        const { closingNotes } = req.body;
        const userId = req.user.id;

        // Verify shift ownership and status
        const where = {
            id: parseInt(id),
            status: 'in_progress'
        };

        if (!['Admin', 'Manager'].includes(req.user.role)) {
            where.userId = userId;
        }

        const shift = await prisma.dutySession.findFirst({
            where,
            include: {
                nozzleReadings: true
            }
        });

        if (!shift) {
            return res.status(404).json({ error: 'Active shift not found' });
        }

        // Validate at least one closing reading
        const hasClosingReading = shift.nozzleReadings.some(
            reading => reading.closingReading !== null
        );

        if (!hasClosingReading) {
            return res.status(400).json({
                error: 'At least one nozzle must have a closing reading before submitting'
            });
        }

        // Update nozzle current readings based on closing readings
        // Update nozzle current readings based on closing readings AND set as available
        await prisma.$transaction(async (prisma) => {
            for (const reading of shift.nozzleReadings) {
                const updateData = {
                    isAvailable: true // Make nozzle available again
                };

                if (reading.closingReading !== null) {
                    updateData.currentreading = reading.closingReading;
                }

                await prisma.nozzle.update({
                    where: { id: reading.nozzleId },
                    data: updateData
                });
            }

            // Complete shift
            const completedShift = await prisma.dutySession.update({
                where: { id: parseInt(id) },
                data: {
                    status: 'completed',
                    endTime: new Date(),
                    notes: closingNotes || null
                },
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            username: true
                        }
                    },
                    nozzleReadings: {
                        include: {
                            nozzle: {
                                include: {
                                    fuel: true,
                                    dispenser: true
                                }
                            }
                        }
                    },
                    sessionPayments: {
                        include: {
                            paymentMethod: true
                        }
                    }
                }
            });

            return completedShift;
        });

        res.json({
            message: 'Shift completed successfully',
            shift: completedShift
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /shifts/my-sessions
router.get('/my-sessions', async (req, res) => {
    try {
        const userId = req.user.id;
        const { limit = 10, offset = 0, status } = req.query;

        const where = {
            userId
        };

        if (status) {
            where.status = status;
        }

        const sessions = await prisma.dutySession.findMany({
            where,
            include: {
                nozzleReadings: {
                    select: {
                        id: true,
                        nozzleId: true
                    }
                },
                sessionPayments: {
                    select: {
                        id: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            },
            take: parseInt(limit),
            skip: parseInt(offset)
        });

        const total = await prisma.dutySession.count({ where });

        res.json({
            sessions,
            pagination: {
                total,
                limit: parseInt(limit),
                offset: parseInt(offset)
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /shifts/:id - Get single shift details
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const where = {
            id: parseInt(id)
        };

        if (!['Admin', 'Manager'].includes(req.user.role)) {
            where.userId = userId;
        }

        const shift = await prisma.dutySession.findFirst({
            where,
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        username: true
                    }
                },
                nozzleReadings: {
                    include: {
                        nozzle: {
                            include: {
                                fuel: true,
                                dispenser: true
                            }
                        }
                    }
                },
                sessionPayments: {
                    include: {
                        paymentMethod: true
                    },
                    orderBy: {
                        createdAt: 'desc'
                    }
                }
            }
        });

        if (!shift) {
            return res.status(404).json({ error: 'Shift not found' });
        }

        res.json(shift);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
