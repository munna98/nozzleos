const { PrismaClient } = require('@prisma/client')
const { Pool } = require('pg')
const { PrismaPg } = require('@prisma/adapter-pg')
const bcrypt = require('bcryptjs')

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
    const roles = ['Admin', 'Manager', 'Filling Attendant']
    const roleMap = {}

    for (const roleName of roles) {
        const role = await prisma.userRole.upsert({
            where: { name: roleName },
            update: {},
            create: {
                name: roleName,
            },
        })
        roleMap[roleName] = role.id
        console.log(`Role created/verified: ${role.name}`)
    }

    // Create Admin User
    const adminPassword = 'admin'
    const hashedPassword = await bcrypt.hash(adminPassword, 10)

    const adminUser = await prisma.user.upsert({
        where: { username: 'admin' },
        update: {
            passwordHash: hashedPassword,
            roleId: roleMap['Admin']
        },
        create: {
            username: 'admin',
            name: 'System Admin',
            passwordHash: hashedPassword,
            roleId: roleMap['Admin'],
            isActive: true
        }
    })
    console.log(`Admin user created: ${adminUser.username}`)
}

main()
    .then(async () => {
        await prisma.$disconnect()
    })
    .catch(async (e) => {
        console.error(e)
        await prisma.$disconnect()
        process.exit(1)
    })
