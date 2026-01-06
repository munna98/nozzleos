const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');

// Get all roles - MUST be before /:id routes
router.get('/roles', async (req, res) => {
    try {
        const roles = await prisma.userRole.findMany();
        res.json(roles);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get all users (employees)
router.get('/', async (req, res) => {
    try {
        const users = await prisma.user.findMany({
            where: {
                deletedAt: null // Only active users
            },
            include: {
                role: true
            },
            orderBy: {
                createdAt: 'desc'
            }
        });
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create user
router.post('/', async (req, res) => {
    try {
        const { username, name, password, code, mobile, address, roleId } = req.body;

        // Basic validation
        if (!username || !password || !roleId) {
            return res.status(400).json({ error: 'Username, password and role are required' });
        }

        const user = await prisma.user.create({
            data: {
                username,
                name,
                password, // In a production app, this should be hashed
                code,
                mobile,
                address,
                roleId: parseInt(roleId)
            }
        });
        res.json(user);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update user
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { username, name, password, code, mobile, address, roleId, isActive } = req.body;

        const data = {
            username,
            name,
            code,
            mobile,
            address,
            roleId: parseInt(roleId),
            isActive
        };

        if (password) {
            data.password = password;
        }

        const user = await prisma.user.update({
            where: { id: parseInt(id) },
            data
        });
        res.json(user);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete user (Soft delete)
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const user = await prisma.user.update({
            where: { id: parseInt(id) },
            data: { deletedAt: new Date(), isActive: false }
        });
        res.json(user);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;