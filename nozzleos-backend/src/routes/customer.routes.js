const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');

// Get all customers (active)
router.get('/', async (req, res) => {
    try {
        const customers = await prisma.customer.findMany({
            where: {
                deletedAt: null // Only active customers
            },
            orderBy: {
                createdAt: 'desc'
            }
        });
        res.json(customers);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create customer
router.post('/', async (req, res) => {
    try {
        const { name, email, phone } = req.body;

        // Basic validation
        if (!name || !email) {
            return res.status(400).json({ error: 'Name and email are required' });
        }

        const customer = await prisma.customer.create({
            data: {
                name,
                email,
                phone,
                isActive: true
            }
        });
        res.json(customer);
    } catch (error) {
        // Handle unique constraint violation for email
        if (error.code === 'P2002') {
            return res.status(400).json({ error: 'Email already exists' });
        }
        res.status(500).json({ error: error.message });
    }
});

// Update customer
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, email, phone, isActive } = req.body;

        const customer = await prisma.customer.update({
            where: { id: parseInt(id) },
            data: {
                name,
                email,
                phone,
                isActive
            }
        });
        res.json(customer);
    } catch (error) {
        if (error.code === 'P2002') {
            return res.status(400).json({ error: 'Email already exists' });
        }
        res.status(500).json({ error: error.message });
    }
});

// Delete customer (Soft delete)
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const customer = await prisma.customer.update({
            where: { id: parseInt(id) },
            data: { deletedAt: new Date(), isActive: false }
        });
        res.json(customer);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
