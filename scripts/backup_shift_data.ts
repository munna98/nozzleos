import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'

const prisma = new PrismaClient()

async function backup() {
    console.log('--- Starting Pre-Migration Data Backup ---')
    const backupDir = path.join(process.cwd(), 'prisma', 'backups')
    if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true })
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const backupFile = path.join(backupDir, `backup_${timestamp}.json`)

    const [
        stations,
        fuels,
        dispensers,
        nozzles,
        dutySessions,
        nozzleReadings,
        payments,
        paymentDenominations
    ] = await Promise.all([
        prisma.station.findMany(),
        prisma.fuel.findMany(),
        prisma.dispenser.findMany(),
        prisma.nozzle.findMany(),
        prisma.dutySession.findMany(),
        prisma.nozzleSessionReading.findMany(),
        prisma.sessionPayment.findMany(),
        prisma.paymentDenomination.findMany(),
    ])

    const backupData = {
        metadata: {
            createdAt: new Date().toISOString(),
            recordCounts: {
                stations: stations.length,
                fuels: fuels.length,
                dispensers: dispensers.length,
                nozzles: nozzles.length,
                dutySessions: dutySessions.length,
                nozzleReadings: nozzleReadings.length,
                payments: payments.length,
                paymentDenominations: paymentDenominations.length,
            }
        },
        stations,
        fuels,
        dispensers,
        nozzles,
        dutySessions,
        nozzleReadings,
        payments,
        paymentDenominations,
    }

    fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2), 'utf-8')

    console.log(`Backup completed successfully!`)
    console.log(`File saved to: ${backupFile}`)
    console.log('Record counts:', backupData.metadata.recordCounts)
}

backup()
    .catch((err) => {
        console.error('Backup failed:', err)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
