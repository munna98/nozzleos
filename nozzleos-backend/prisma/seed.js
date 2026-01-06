const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    const roles = ['Admin', 'Manager', 'Filling Attendant']

    for (const roleName of roles) {
        const role = await prisma.userRole.upsert({
            where: { name: roleName },
            update: {},
            create: {
                name: roleName,
            },
        })
        console.log(`Role created/verified: ${role.name}`)
    }
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
