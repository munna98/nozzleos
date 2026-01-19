const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');

// Get all payment methods
router.get('/', async (req, res) => {
    try {
        const paymentMethods = await prisma.paymentMethod.findMany({
            orderBy: {
                createdAt: 'desc'
            },
            include: {
                customer: true
            }
        });
        res.json(paymentMethods);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create payment method
router.post('/', async (req, res) => {
    try {
        const { name, isActive } = req.body;

        const paymentMethod = await prisma.paymentMethod.create({
            data: {
                name,
                isActive: isActive ?? true
            }
        });
        res.json(paymentMethod);
    } catch (error) {
        if (error.code === 'P2002') {
            return res.status(400).json({ error: 'Payment method name already exists' });
        }
        res.status(500).json({ error: error.message });
    }
});

// Update payment method
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, isActive } = req.body;

        const paymentMethod = await prisma.paymentMethod.update({
            where: { id: parseInt(id) },
            data: {
                name,
                isActive
            }
        });
        res.json(paymentMethod);
    } catch (error) {
        if (error.code === 'P2002') {
            return res.status(400).json({ error: 'Payment method name already exists' });
        }
        res.status(500).json({ error: error.message });
    }
});

// Delete payment method
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        // Check if it's a customer linked payment method
        const existing = await prisma.paymentMethod.findUnique({
            where: { id: parseInt(id) }
        });

        if (existing && existing.customerId) {
            return res.status(400).json({ error: 'Cannot delete a customer-linked payment method. Delete the customer instead.' });
        }

        const paymentMethod = await prisma.paymentMethod.delete({
            where: { id: parseInt(id) }
        });
        res.json(paymentMethod);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
