
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('Checking Denominations...')
    const denominations = await prisma.denomination.findMany()
    console.log('Denominations count:', denominations.length)
    console.log(denominations)

    console.log('Checking Settings...')
    const settings = await prisma.settings.findFirst()
    console.log('Settings:', settings)

    console.log('Checking Roles...')
    const roles = await prisma.userRole.findMany()
    console.log('Roles:', roles.map(r => r.name))
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
