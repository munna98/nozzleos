import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import { createExpressMiddleware } from '@trpc/server/adapters/express'
import { appRouter } from './routers/index.js'
import { createContext } from './context.js'

const app = express()
const PORT = process.env.PORT || 5000

// Middleware
app.use(cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
}))
app.use(express.json())
app.use(cookieParser())

// Health check endpoint
app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// tRPC endpoint
app.use(
    '/trpc',
    createExpressMiddleware({
        router: appRouter,
        createContext,
        onError({ error, path }) {
            console.error(`[tRPC Error] ${path}:`, error.message)
        },
    })
)

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`)
    console.log(`📡 tRPC endpoint: http://localhost:${PORT}/trpc`)
})

export { appRouter, type AppRouter } from './routers/index.js'
