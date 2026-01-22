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
        where: { name: 'Fuel Attendant' },
        update: {},
        create: { name: 'Fuel Attendant' },
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

    // Create payment methods
    await prisma.paymentMethod.upsert({
        where: { name: 'Cash' },
        update: {},
        create: { name: 'Cash' },
    })

    console.log('✅ Created payment methods')

    // Create global settings
    await prisma.settings.upsert({
        where: { id: 1 },
        update: {},
        create: {
            id: 1,
            enableDenominationEntry: true,
            enableCoinEntry: true,
        },
    })
    console.log('✅ Created global settings')

    // Create denominations (Indian currency notes)
    const denominations = [
        { value: 2000, label: '₹2000', sortOrder: 1 },
        { value: 500, label: '₹500', sortOrder: 2 },
        { value: 200, label: '₹200', sortOrder: 3 },
        { value: 100, label: '₹100', sortOrder: 4 },
        { value: 50, label: '₹50', sortOrder: 5 },
        { value: 20, label: '₹20', sortOrder: 6 },
        { value: 10, label: '₹10', sortOrder: 7 },
    ]

    for (const denom of denominations) {
        await prisma.denomination.upsert({
            where: { value: denom.value },
            update: { label: denom.label, sortOrder: denom.sortOrder },
            create: denom,
        })
    }
    console.log('✅ Created denominations')

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
