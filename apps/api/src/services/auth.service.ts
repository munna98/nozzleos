import { prisma } from '@nozzleos/db';
import { TRPCError } from '@trpc/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret';

interface UserTokenPayload {
    userId: number;
    username: string;
    role: string;
}

export class AuthService {
    /**
     * Get user profile
     */
    async getUserProfile(userId: number) {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { role: true },
        });

        if (!user) {
            throw new TRPCError({
                code: 'NOT_FOUND',
                message: 'User not found',
            });
        }

        return {
            id: user.id,
            username: user.username,
            name: user.name,
            role: user.role.name,
            roleId: user.roleId,
        };
    }

    /**
     * Generate access and refresh tokens
     */
    private generateTokens(user: { id: number; username: string; role: { name: string } }) {
        const accessToken = jwt.sign(
            { userId: user.id, username: user.username, role: user.role.name },
            JWT_SECRET,
            { expiresIn: '15m' }
        );

        const refreshToken = jwt.sign(
            { userId: user.id },
            JWT_REFRESH_SECRET,
            { expiresIn: '7d' }
        );

        return { accessToken, refreshToken };
    }

    /**
     * Login user
     */
    async login(username: string, password: string) {
        const user = await prisma.user.findUnique({
            where: { username },
            include: { role: true },
        });

        if (!user || !user.isActive) {
            throw new TRPCError({
                code: 'UNAUTHORIZED',
                message: 'Invalid username or password',
            });
        }

        const validPassword = await bcrypt.compare(password, user.passwordHash);
        if (!validPassword) {
            throw new TRPCError({
                code: 'UNAUTHORIZED',
                message: 'Invalid username or password',
            });
        }

        const tokens = this.generateTokens(user);

        // Store refresh token in database
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

        await prisma.refreshToken.create({
            data: {
                userId: user.id,
                token: tokens.refreshToken,
                expiresAt,
            },
        });

        return {
            user: {
                id: user.id,
                username: user.username,
                name: user.name,
                role: user.role.name,
                roleId: user.roleId,
            },
            ...tokens,
        };
    }

    /**
     * Refresh access token
     */
    async refreshTokens(refreshToken: string) {
        try {
            jwt.verify(refreshToken, JWT_REFRESH_SECRET);

            const storedToken = await prisma.refreshToken.findUnique({
                where: { token: refreshToken },
                include: { user: { include: { role: true } } },
            });

            if (!storedToken || storedToken.expiresAt < new Date()) {
                throw new TRPCError({
                    code: 'UNAUTHORIZED',
                    message: 'Invalid or expired refresh token',
                });
            }

            const tokens = this.generateTokens(storedToken.user);

            // Update refresh token
            await prisma.refreshToken.update({
                where: { id: storedToken.id },
                data: {
                    token: tokens.refreshToken,
                    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                },
            });

            return tokens;
        } catch {
            throw new TRPCError({
                code: 'UNAUTHORIZED',
                message: 'Invalid refresh token',
            });
        }
    }

    /**
     * Logout user (invalidate tokens)
     */
    async logout(userId: number) {
        await prisma.refreshToken.deleteMany({
            where: { userId },
        });
        return { success: true };
    }
}
