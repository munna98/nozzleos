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
    const adminPassword = await bcrypt.hash('admin123', 10)
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

    // Create test attendant
    const attendantPassword = await bcrypt.hash('attendant123', 10)
    await prisma.user.upsert({
        where: { username: 'attendant1' },
        update: {},
        create: {
            username: 'attendant1',
            name: 'Test Attendant',
            passwordHash: attendantPassword,
            roleId: attendantRole.id,
        },
    })

    console.log('✅ Created users (admin/admin123, attendant1/attendant123)')

    // Create fuels
    const petrol = await prisma.fuel.upsert({
        where: { name: 'Petrol' },
        update: {},
        create: { name: 'Petrol', price: 102.5 },
    })

    const diesel = await prisma.fuel.upsert({
        where: { name: 'Diesel' },
        update: {},
        create: { name: 'Diesel', price: 89.5 },
    })

    console.log('✅ Created fuels')

    // Create dispensers and nozzles
    const dispenser1 = await prisma.dispenser.upsert({
        where: { code: 'D1' },
        update: {},
        create: { code: 'D1', name: 'Dispenser 1' },
    })

    const dispenser2 = await prisma.dispenser.upsert({
        where: { code: 'D2' },
        update: {},
        create: { code: 'D2', name: 'Dispenser 2' },
    })

    console.log('✅ Created dispensers')

    // Create nozzles
    await prisma.nozzle.upsert({
        where: { code: 'N1' },
        update: {},
        create: {
            code: 'N1',
            dispenserId: dispenser1.id,
            fuelId: petrol.id,
            price: 102.5,
            currentreading: 10000,
        },
    })

    await prisma.nozzle.upsert({
        where: { code: 'N2' },
        update: {},
        create: {
            code: 'N2',
            dispenserId: dispenser1.id,
            fuelId: diesel.id,
            price: 89.5,
            currentreading: 8000,
        },
    })

    await prisma.nozzle.upsert({
        where: { code: 'N3' },
        update: {},
        create: {
            code: 'N3',
            dispenserId: dispenser2.id,
            fuelId: petrol.id,
            price: 102.5,
            currentreading: 15000,
        },
    })

    await prisma.nozzle.upsert({
        where: { code: 'N4' },
        update: {},
        create: {
            code: 'N4',
            dispenserId: dispenser2.id,
            fuelId: diesel.id,
            price: 89.5,
            currentreading: 12000,
        },
    })

    console.log('✅ Created nozzles')

    // Create payment methods
    await prisma.paymentMethod.upsert({
        where: { name: 'Cash' },
        update: {},
        create: { name: 'Cash' },
    })

    await prisma.paymentMethod.upsert({
        where: { name: 'UPI' },
        update: {},
        create: { name: 'UPI' },
    })

    await prisma.paymentMethod.upsert({
        where: { name: 'Card' },
        update: {},
        create: { name: 'Card' },
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
