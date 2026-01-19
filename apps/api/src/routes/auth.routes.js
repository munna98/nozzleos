const express = require('express');
const router = express.Router();
const authService = require('../services/auth.service');
const prisma = require('../lib/prisma');
const { authenticate } = require('../middleware/auth.middleware');

// Login
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password required' });
        }

        const { accessToken, refreshToken, user } = await authService.login(username, password);

        res.json({
            accessToken,
            refreshToken,
            user: {
                id: user.id,
                username: user.username,
                name: user.name,
                role: user.role.name,
                roleId: user.roleId
            }
        });
    } catch (error) {
        res.status(401).json({ error: error.message });
    }
});

// Refresh access token
router.post('/refresh', async (req, res) => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return res.status(400).json({ error: 'Refresh token required' });
        }

        const accessToken = await authService.refreshAccessToken(refreshToken);
        res.json({ accessToken });
    } catch (error) {
        res.status(401).json({ error: error.message });
    }
});

// Logout
router.post('/logout', authenticate, async (req, res) => {
    try {
        const { refreshToken } = req.body;
        await authService.logout(refreshToken);
        res.json({ message: 'Logged out successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get current user
router.get('/me', authenticate, async (req, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            include: { role: true }
        });

        res.json({
            id: user.id,
            username: user.username,
            name: user.name,
            role: user.role.name,
            roleId: user.roleId
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
