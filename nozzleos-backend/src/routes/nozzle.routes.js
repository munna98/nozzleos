const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');

// Get all nozzles (active) with fuel and dispenser info
router.get('/', async (req, res) => {
    try {
        const nozzles = await prisma.nozzle.findMany({
            where: {
                deletedAt: null // Only active nozzles
            },
            orderBy: {
                createdAt: 'desc'
            },
            include: {
                fuel: true,
                dispenser: true
            }
        });
        res.json(nozzles);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create nozzle
router.post('/', async (req, res) => {
    try {
        const { code, dispenserId, fuelId, price } = req.body;

        // Basic validation
        if (!code || !dispenserId || !fuelId || price === undefined) {
            return res.status(400).json({ error: 'Code, dispenserId, fuelId, and price are required' });
        }

        const nozzle = await prisma.nozzle.create({
            data: {
                code,
                dispenserId: parseInt(dispenserId),
                fuelId: parseInt(fuelId),
                price: parseFloat(price),
                isActive: true,
                isAvailable: true
            },
            include: {
                fuel: true,
                dispenser: true
            }
        });

        res.json(nozzle);
    } catch (error) {
        // Handle unique constraint violation for code
        if (error.code === 'P2002') {
            return res.status(400).json({ error: 'Nozzle code already exists' });
        }
        res.status(500).json({ error: error.message });
    }
});

// Update nozzle
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { code, dispenserId, fuelId, price, isActive } = req.body;

        const nozzle = await prisma.nozzle.update({
            where: { id: parseInt(id) },
            data: {
                code,
                dispenserId: dispenserId !== undefined ? parseInt(dispenserId) : undefined,
                fuelId: fuelId !== undefined ? parseInt(fuelId) : undefined,
                price: price !== undefined ? parseFloat(price) : undefined,
                isActive
            },
            include: {
                fuel: true,
                dispenser: true
            }
        });

        res.json(nozzle);
    } catch (error) {
        if (error.code === 'P2002') {
            return res.status(400).json({ error: 'Nozzle code already exists' });
        }
        res.status(500).json({ error: error.message });
    }
});

// Toggle nozzle availability
router.patch('/:id/availability', async (req, res) => {
    try {
        const { id } = req.params;
        const { isAvailable } = req.body;

        const nozzle = await prisma.nozzle.update({
            where: { id: parseInt(id) },
            data: {
                isAvailable: isAvailable !== undefined ? isAvailable : undefined
            },
            include: {
                fuel: true,
                dispenser: true
            }
        });

        res.json(nozzle);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete nozzle (Soft delete)
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const nozzle = await prisma.nozzle.update({
            where: { id: parseInt(id) },
            data: { deletedAt: new Date(), isActive: false }
        });
        res.json(nozzle);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
