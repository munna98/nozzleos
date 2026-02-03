import { router, protectedProcedure } from '../trpc/init'
import prisma from '@/lib/prisma'

export const denominationRouter = router({
    /**
     * Get all active denominations (sorted by sortOrder)
     * Note: Denominations are global (shared across all stations)
     */
    getAll: protectedProcedure.query(async () => {
        const denominations = await prisma.denomination.findMany({
            where: { isActive: true },
            orderBy: { sortOrder: 'asc' },
        })
        return denominations
    }),
})
