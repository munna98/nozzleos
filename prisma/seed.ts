import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import 'dotenv/config'

const prisma = new PrismaClient()

async function main() {
    console.log('🌱 Starting database seed...')

    // ==================== ROLES ====================
    // Create Super Admin role (global, hidden from station-level queries)
    const superAdminRole = await prisma.userRole.upsert({
        where: { name: 'Super Admin' },
        update: {},
        create: { name: 'Super Admin' },
    })

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

    console.log('✅ Created roles (including Super Admin)')

    // ==================== STATION ====================
    // Create default station for existing data migration
    const nkPetroleum = await prisma.station.upsert({
        where: { slug: 'nk-petroleum' },
        update: {},
        create: {
            slug: 'nk-petroleum',
            name: 'NK Petroleum',
            location: null,
            mobile: null,
            email: null,
        },
    })
    console.log('✅ Created NK Petroleum station')

    // ==================== SUPER ADMIN USER ====================
    // Global super admin (no stationId) - can't use upsert with null in composite unique
    const existingSuperAdmin = await prisma.user.findFirst({
        where: {
            stationId: null,
            username: 'superadmin'
        }
    })

    const superAdminPassword = await bcrypt.hash('Superadmin', 10)

    if (!existingSuperAdmin) {
        await prisma.user.create({
            data: {
                stationId: null,
                username: 'superadmin',
                name: 'Super Administrator',
                passwordHash: superAdminPassword,
                roleId: superAdminRole.id,
            },
        })
    } else {
        await prisma.user.update({
            where: { id: existingSuperAdmin.id },
            data: { passwordHash: superAdminPassword }
        })
    }
    console.log('✅ Created super admin user (superadmin / Superadmin)')

    // ==================== STATION ADMIN USER ====================
    // Station-specific admin for NK Petroleum
    const stationAdminPassword = await bcrypt.hash('NKpetroleum', 10)
    await prisma.user.upsert({
        where: {
            stationId_username: { stationId: nkPetroleum.id, username: 'nk-petroleum' }
        },
        update: {
            passwordHash: stationAdminPassword,
        },
        create: {
            stationId: nkPetroleum.id,
            username: 'nk-petroleum',
            name: 'NK Petroleum Admin',
            passwordHash: stationAdminPassword,
            roleId: adminRole.id,
        },
    })
    console.log('✅ Created station admin user (nk-petroleum / admin)')

    // ==================== PAYMENT METHODS ====================
    // Cash payment method for NK Petroleum
    await prisma.paymentMethod.upsert({
        where: {
            stationId_name: { stationId: nkPetroleum.id, name: 'Cash' }
        },
        update: {},
        create: {
            stationId: nkPetroleum.id,
            name: 'Cash'
        },
    })
    console.log('✅ Created payment methods')

    // ==================== STATION SETTINGS ====================
    await prisma.settings.upsert({
        where: { stationId: nkPetroleum.id },
        update: {},
        create: {
            stationId: nkPetroleum.id,
            enableDenominationEntry: true,
            enableCoinEntry: true,
        },
    })
    console.log('✅ Created station settings')

    // ==================== GLOBAL DENOMINATIONS ====================
    // These are shared across all stations (Indian currency notes)
    const denominations = [
        { value: 500, label: '₹500', sortOrder: 1 },
        { value: 200, label: '₹200', sortOrder: 2 },
        { value: 100, label: '₹100', sortOrder: 3 },
        { value: 50, label: '₹50', sortOrder: 4 },
        { value: 20, label: '₹20', sortOrder: 5 },
        { value: 10, label: '₹10', sortOrder: 6 },
    ]

    for (const denom of denominations) {
        await prisma.denomination.upsert({
            where: { value: denom.value },
            update: { label: denom.label, sortOrder: denom.sortOrder },
            create: denom,
        })
    }
    console.log('✅ Created global denominations')

    console.log('🎉 Database seeded successfully!')
    console.log('')
    console.log('📋 Login Credentials:')
    console.log('   Super Admin: superadmin / Superadmin')
    console.log('   Station Admin (NK Petroleum): nk-petroleum / NKpetroleum')
}

main()
    .catch((e) => {
        console.error('❌ Seed failed:', e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
