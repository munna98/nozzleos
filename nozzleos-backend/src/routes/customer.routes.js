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
            },
            include: {
                paymentMethod: true
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
        const { name, email, phone, createPaymentMethod = true } = req.body;

        // Basic validation
        if (!name || !email) {
            return res.status(400).json({ error: 'Name and email are required' });
        }

        const result = await prisma.$transaction(async (tx) => {
            const customer = await tx.customer.create({
                data: {
                    name,
                    email,
                    phone,
                    isActive: true
                }
            });

            if (createPaymentMethod) {
                await tx.paymentMethod.create({
                    data: {
                        name: customer.name,
                        isActive: true,
                        customerId: customer.id
                    }
                });
            }

            return customer;
        });

        res.json(result);
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
        const { name, email, phone, isActive, createPaymentMethod } = req.body;

        const result = await prisma.$transaction(async (tx) => {
            const customer = await tx.customer.update({
                where: { id: parseInt(id) },
                data: {
                    name,
                    email,
                    phone,
                    isActive
                },
                include: {
                    paymentMethod: true
                }
            });

            // Handle Payment Method Logic
            const existingPaymentMethod = await tx.paymentMethod.findUnique({
                where: { customerId: customer.id }
            });

            if (createPaymentMethod === true && !existingPaymentMethod) {
                // Create if requested and doesn't exist
                await tx.paymentMethod.create({
                    data: {
                        name: customer.name,
                        isActive: true,
                        customerId: customer.id
                    }
                });
            } else if (createPaymentMethod === false && existingPaymentMethod) {
                // Delete if requested false and exists
                await tx.paymentMethod.delete({
                    where: { id: existingPaymentMethod.id }
                });
            } else if (existingPaymentMethod && existingPaymentMethod.name !== name) {
                // Sync name if exists and name changed
                await tx.paymentMethod.update({
                    where: { id: existingPaymentMethod.id },
                    data: { name: name }
                });
            }

            return customer;
        });

        res.json(result);
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
