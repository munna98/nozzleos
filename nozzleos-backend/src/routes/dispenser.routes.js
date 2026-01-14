const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');

// Get all dispensers (active) with nozzles
router.get('/', async (req, res) => {
    try {
        const dispensers = await prisma.dispenser.findMany({
            where: {
                deletedAt: null // Only active dispensers
            },
            orderBy: {
                createdAt: 'desc'
            },
            include: {
                nozzles: {
                    where: {
                        deletedAt: null
                    },
                    include: {
                        fuel: true
                    }
                }
            }
        });
        res.json(dispensers);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create dispenser
router.post('/', async (req, res) => {
    try {
        const { code, name } = req.body;

        // Basic validation
        if (!code || !name) {
            return res.status(400).json({ error: 'Code and name are required' });
        }

        const dispenser = await prisma.dispenser.create({
            data: {
                code,
                name,
                isActive: true
            }
        });

        res.json(dispenser);
    } catch (error) {
        // Handle unique constraint violation for code
        if (error.code === 'P2002') {
            return res.status(400).json({ error: 'Dispenser code already exists' });
        }
        res.status(500).json({ error: error.message });
    }
});

// Update dispenser
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { code, name, isActive } = req.body;

        const dispenser = await prisma.dispenser.update({
            where: { id: parseInt(id) },
            data: {
                code,
                name,
                isActive
            },
            include: {
                nozzles: {
                    where: {
                        deletedAt: null
                    },
                    include: {
                        fuel: true
                    }
                }
            }
        });

        res.json(dispenser);
    } catch (error) {
        if (error.code === 'P2002') {
            return res.status(400).json({ error: 'Dispenser code already exists' });
        }
        res.status(500).json({ error: error.message });
    }
});

// Delete dispenser (Soft delete)
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const dispenser = await prisma.dispenser.update({
            where: { id: parseInt(id) },
            data: { deletedAt: new Date(), isActive: false }
        });
        res.json(dispenser);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
