const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');

// Get all fuels (active)
router.get('/', async (req, res) => {
    try {
        const fuels = await prisma.fuel.findMany({
            where: {
                deletedAt: null // Only active fuels
            },
            orderBy: {
                createdAt: 'desc'
            }
        });
        res.json(fuels);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create fuel
router.post('/', async (req, res) => {
    try {
        const { name, price } = req.body;

        // Basic validation
        if (!name || price === undefined) {
            return res.status(400).json({ error: 'Name and price are required' });
        }

        const fuel = await prisma.fuel.create({
            data: {
                name,
                price: parseFloat(price),
                isActive: true
            }
        });

        res.json(fuel);
    } catch (error) {
        // Handle unique constraint violation for name
        if (error.code === 'P2002') {
            return res.status(400).json({ error: 'Fuel name already exists' });
        }
        res.status(500).json({ error: error.message });
    }
});

// Update fuel
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, price, isActive } = req.body;

        const result = await prisma.$transaction(async (prisma) => {
            const fuel = await prisma.fuel.update({
                where: { id: parseInt(id) },
                data: {
                    name,
                    price: price !== undefined ? parseFloat(price) : undefined,
                    isActive
                }
            });

            // If price is updated, update all nozzles using this fuel
            if (price !== undefined) {
                await prisma.nozzle.updateMany({
                    where: { fuelId: parseInt(id) },
                    data: { price: parseFloat(price) }
                });
            }

            return fuel;
        });

        res.json(result);
    } catch (error) {
        if (error.code === 'P2002') {
            return res.status(400).json({ error: 'Fuel name already exists' });
        }
        res.status(500).json({ error: error.message });
    }
});

// Delete fuel (Soft delete)
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const fuel = await prisma.fuel.update({
            where: { id: parseInt(id) },
            data: { deletedAt: new Date(), isActive: false }
        });
        res.json(fuel);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
