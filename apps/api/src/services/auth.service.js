const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-prod';
const REFRESH_SECRET = process.env.REFRESH_SECRET || 'refresh-secret-change-in-prod';
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';

class AuthService {
    async hashPassword(password) {
        return bcrypt.hash(password, 10);
    }

    async comparePassword(password, hash) {
        return bcrypt.compare(password, hash);
    }

    async login(username, password) {
        const user = await prisma.user.findUnique({
            where: { username },
            include: { role: true }
        });

        if (!user) throw new Error('User not found');
        if (!user.isActive) throw new Error('User account is disabled');

        // Use passwordHash instead of password (as per schema update)
        // But check if user.passwordHash is populated. 
        // If the DB was just reset, it should be fine.
        const isValid = await this.comparePassword(password, user.passwordHash);
        if (!isValid) throw new Error('Invalid password');

        const accessToken = this.generateAccessToken(user);
        const refreshToken = await this.generateRefreshToken(user.id);

        return { accessToken, refreshToken, user };
    }

    generateAccessToken(user) {
        return jwt.sign(
            {
                id: user.id,
                username: user.username,
                roleId: user.roleId,
                role: user.role.name
            },
            JWT_SECRET,
            { expiresIn: ACCESS_TOKEN_EXPIRY }
        );
    }

    async generateRefreshToken(userId) {
        const token = jwt.sign(
            { userId },
            REFRESH_SECRET,
            { expiresIn: REFRESH_TOKEN_EXPIRY }
        );

        await prisma.refreshToken.create({
            data: {
                userId,
                token,
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
            }
        });

        return token;
    }

    async refreshAccessToken(refreshToken) {
        const dbToken = await prisma.refreshToken.findUnique({
            where: { token: refreshToken },
            include: { user: { include: { role: true } } }
        });

        if (!dbToken || dbToken.expiresAt < new Date()) {
            throw new Error('Invalid or expired refresh token');
        }

        const user = dbToken.user;
        return this.generateAccessToken(user);
    }

    verifyAccessToken(token) {
        return jwt.verify(token, JWT_SECRET);
    }

    async logout(refreshToken) {
        await prisma.refreshToken.delete({
            where: { token: refreshToken }
        }).catch(() => { }); // Ignore if token already deleted
    }
}

module.exports = new AuthService();
