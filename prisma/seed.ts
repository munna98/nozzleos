import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import 'dotenv/config'

const prisma = new PrismaClient()

async function main() {
    console.log('🌱 Starting database seed...')

    // Create roles
    const adminRole = await prisma.userRole.upsert({
        where: { name: 'Admin' },
        update: {},
        create: { name: 'Admin' },
    })

    const managerRole = await prisma.userRole.upsert({
        where: { name: 'Manager' },
        update: {},
        create: { name: 'Manager' },
    })

    const attendantRole = await prisma.userRole.upsert({
        where: { name: 'Attendant' },
        update: {},
        create: { name: 'Attendant' },
    })

    console.log('✅ Created roles')

    // Create admin user
    const adminPassword = await bcrypt.hash('admin', 10)
    await prisma.user.upsert({
        where: { username: 'admin' },
        update: {},
        create: {
            username: 'admin',
            name: 'Administrator',
            passwordHash: adminPassword,
            roleId: adminRole.id,
        },
    })
    console.log('✅ Created admin user')

    // Create product categories
    // Create payment methods
    await prisma.paymentMethod.upsert({
        where: { name: 'Cash' },
        update: {},
        create: { name: 'Cash' },
    })

    console.log('✅ Created payment methods')

    console.log('🎉 Database seeded successfully!')
}

main()
    .catch((e) => {
        console.error('❌ Seed failed:', e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
