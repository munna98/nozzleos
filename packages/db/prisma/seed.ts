import { PrismaClient } from '../src/index.js'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
    const roles = ['Admin', 'Manager', 'Filling Attendant']
    const roleMap: Record<string, number> = {}

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
            roleId: roleMap['Admin'],
        },
        create: {
            username: 'admin',
            name: 'Admin',
            passwordHash: hashedPassword,
            roleId: roleMap['Admin'],
            isActive: true,
        },
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
