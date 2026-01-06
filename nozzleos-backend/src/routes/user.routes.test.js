const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

test('Prisma Client should be instantiated correctly', async () => {
    const users = await prisma.user.findMany();
    expect(Array.isArray(users)).toBe(true);
});