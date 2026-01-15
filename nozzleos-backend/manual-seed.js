const bcrypt = require('bcryptjs')
require('dotenv').config()
const prisma = require('./src/lib/prisma')

async function main() {
    console.log('Seeding database...')
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
            roleId: roleMap['Admin'],
            isActive: true
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
    console.log(`Password: ${adminPassword}`)
}

main()
    .then(async () => {
        await prisma.$disconnect()
        console.log('Seeding complete.')
    })
    .catch(async (e) => {
        console.error(e)
        await prisma.$disconnect()
        process.exit(1)
    })
