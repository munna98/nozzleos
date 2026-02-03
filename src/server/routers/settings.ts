import { router, tenantProcedure, adminProcedure } from '../trpc/init'
import prisma from '@/lib/prisma'
import { z } from 'zod'

export const settingsRouter = router({
    /**
     * Get settings for the current station
     */
    get: tenantProcedure.query(async ({ ctx }) => {
        // Get or create default settings for this station
        let settings = await prisma.settings.findUnique({
            where: { stationId: ctx.stationId },
        })

        if (!settings) {
            settings = await prisma.settings.create({
                data: { stationId: ctx.stationId },
            })
        }

        return settings
    }),

    /**
     * Update settings for the current station (admin only)
     */
    update: adminProcedure
        .input(z.object({
            enableDenominationEntry: z.boolean().optional(),
            enableCoinEntry: z.boolean().optional(),
        }))
        .mutation(async ({ ctx, input }) => {
            const settings = await prisma.settings.upsert({
                where: { stationId: ctx.stationId },
                update: input,
                create: {
                    stationId: ctx.stationId,
                    ...input,
                },
            })
            return settings
        }),
})
