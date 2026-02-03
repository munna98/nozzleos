
import { appRouter } from '../src/server/trpc/router'
import { createContext } from '../src/server/trpc/context' // I'll need to check where context creation is
import prisma from '../src/lib/prisma'

// Mock context creator
const createMockContext = (user: any, stationId: number | null, isSuperAdmin: boolean) => ({
    user,
    stationId,
    isSuperAdmin,
    headers: new Headers()
})

async function verifyMultiTenancy() {
    console.log('🚀 Starting Multi-Tenancy Verification...')

    try {
        // 1. Setup Data
        console.log('\n📊 Setting up test data...')

        // Ensure Super Admin exists
        const superAdminRole = await prisma.userRole.upsert({
            where: { name: 'Super Admin' },
            create: { name: 'Super Admin' },
            update: {}
        })

        const stationAdminRole = await prisma.userRole.upsert({
            where: { name: 'Admin' },
            create: { name: 'Admin' },
            update: {}
        })

        // Create 2 test stations
        const station1 = await prisma.station.upsert({
            where: { slug: 'test-station-1' },
            create: {
                slug: 'test-station-1',
                name: 'Test Station 1',
                isActive: true
            },
            update: {}
        })

        const station2 = await prisma.station.upsert({
            where: { slug: 'test-station-2' },
            create: {
                slug: 'test-station-2',
                name: 'Test Station 2',
                isActive: true
            },
            update: {}
        })

        console.log(`✅ Stations created: ${station1.name} (${station1.id}), ${station2.name} (${station2.id})`)

        // 2. Verify Unique Constraints (Scoped)
        console.log('\n🔒 Verifying Unique Constraints...')

        const username = `user_test_${Date.now()}`

        // Create user in Station 1
        await prisma.user.create({
            data: {
                username,
                passwordHash: 'hash',
                roleId: stationAdminRole.id,
                stationId: station1.id
            }
        })
        console.log(`✅ Created user '${username}' in Station 1`)

        // Try to create SAME username in Station 1 (Should Fail)
        try {
            await prisma.user.create({
                data: {
                    username,
                    passwordHash: 'hash',
                    roleId: stationAdminRole.id,
                    stationId: station1.id
                }
            })
            console.error('❌ Failed: Duplicate username in same station was allowed!')
        } catch (e) {
            console.log('✅ Success: Duplicate username prevented in same station')
        }

        // Create SAME username in Station 2 (Should Succeed)
        await prisma.user.create({
            data: {
                username,
                passwordHash: 'hash',
                roleId: stationAdminRole.id,
                stationId: station2.id
            }
        })
        console.log(`✅ Success: Same username '${username}' created in Station 2 (proper isolation)`)


        // 3. Verify Router Isolation
        console.log('\n🕵️ Verifying Router Data Isolation...')

        // Create caller for Station 1 Admin
        const station1User = await prisma.user.findFirst({ where: { stationId: station1.id } })
        const ctx1 = {
            user: { ...station1User!, role: 'Admin' },
            stationId: station1.id,
            isSuperAdmin: false
        }
        const caller1 = appRouter.createCaller(ctx1 as any)

        // Create caller for Station 2 Admin
        const station2User = await prisma.user.findFirst({ where: { stationId: station2.id } })
        const ctx2 = {
            user: { ...station2User!, role: 'Admin' },
            stationId: station2.id,
            isSuperAdmin: false
        }
        const caller2 = appRouter.createCaller(ctx2 as any)

        // Create fuel in Station 1
        const fuelName = `Fuel-${Date.now()}`
        await caller1.fuel.create({
            name: fuelName,
            price: 100,
            type: 'Petrol'
        })
        console.log(`✅ Created '${fuelName}' in Station 1`)

        // Check if Station 2 can see it
        const fuels2 = await caller2.fuel.getAll()
        const found = fuels2.find(f => f.name === fuelName)

        if (found) {
            console.error('❌ Failed: Station 2 can see Station 1 data!')
        } else {
            console.log('✅ Success: Station 2 cannot see Station 1 data')
        }

        // 4. Verify Super Admin Bypass
        console.log('\n🦸 Verifying Super Admin Bypass...')

        const ctxSuper = {
            user: { id: 99999, username: 'super', role: 'Super Admin', stationId: null },
            stationId: station1.id, // Targeting Station 1
            isSuperAdmin: true
        }
        const callerSuper = appRouter.createCaller(ctxSuper as any)

        const fuelsSuper = await callerSuper.fuel.getAll()
        const foundSuper = fuelsSuper.find(f => f.name === fuelName)

        if (foundSuper) {
            console.log('✅ Success: Super Admin can access Station 1 data')
        } else {
            console.error('❌ Failed: Super Admin could not access Station 1 data')
        }

        console.log('\n✨ Verification Complete!')

    } catch (error) {
        console.error('Verification failed:', error)
    } finally {
        // Cleanup if needed, or leave for manual inspection
    }
}

verifyMultiTenancy()
