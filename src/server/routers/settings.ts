import { router, protectedProcedure, adminProcedure } from '../trpc/init'
import prisma from '@/lib/prisma'
import { z } from 'zod'

export const settingsRouter = router({
    /**
     * Get global settings
     */
    get: protectedProcedure.query(async () => {
        // Get or create default settings
        let settings = await prisma.settings.findUnique({
            where: { id: 1 },
        })

        if (!settings) {
            settings = await prisma.settings.create({
                data: { id: 1 },
            })
        }

        return settings
    }),

    /**
     * Update global settings (admin only)
     */
    update: adminProcedure
        .input(z.object({
            enableDenominationEntry: z.boolean().optional(),
            enableCoinEntry: z.boolean().optional(),
        }))
        .mutation(async ({ input }) => {
            const settings = await prisma.settings.upsert({
                where: { id: 1 },
                update: input,
                create: {
                    id: 1,
                    ...input,
                },
            })
            return settings
        }),
})
