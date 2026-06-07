// backend/src/app.ts
// Main Express application — mounts all routers

import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import { createServer } from 'http'
import { config, isProduction } from './config'
import { connectRedis } from './config/redis'
import { initWebSocket } from './websocket/ws.server'

// ── Routers ───────────────────────────────────────────────────
import binanceRouter from './modules/binance/binance.controller'
import alpacaRouter  from './modules/alpaca/alpaca.controller'
import ibkrRouter    from './modules/ibkr/ibkr.controller'
import riskRouter    from './modules/risk/risk.controller'
import fundingRouter from './modules/funding/funding.controller'

const app  = express()
const http = createServer(app)

const allowedOrigins = new Set([config.FRONTEND_URL])

function isAllowedOrigin(origin?: string) {
  if (!origin) return true
  if (allowedOrigins.has(origin)) return true
  return !isProduction && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)
}

// ── Middleware ────────────────────────────────────────────────
app.use(helmet())
app.use(cors({
  origin(origin, callback) {
    callback(null, isAllowedOrigin(origin))
  },
  credentials: true,
}))
app.use(express.json())
app.use(morgan(config.NODE_ENV === 'production' ? 'combined' : 'dev'))

// ── Health check ──────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    env:    config.NODE_ENV,
    time:   new Date().toISOString(),
  })
})

// ── API Routes ────────────────────────────────────────────────
app.use('/api/binance', binanceRouter)
app.use('/api/alpaca',  alpacaRouter)
app.use('/api/ibkr',    ibkrRouter)
app.use('/api/risk',    riskRouter)
app.use('/api/funding', fundingRouter)

// ── 404 ───────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ ok: false, error: 'Route not found' })
})

// ── Global error handler ──────────────────────────────────────
app.use((err: any, _req: any, res: any, _next: any) => {
  console.error(err)
  res.status(500).json({ ok: false, error: err.message || 'Internal server error' })
})

// ── Start ─────────────────────────────────────────────────────
async function bootstrap() {
  await connectRedis()
  initWebSocket(http)

  http.listen(config.PORT, () => {
    console.log(`\n🚀 APEX TRADE Backend running`)
    console.log(`   Port    : ${config.PORT}`)
    console.log(`   Env     : ${config.NODE_ENV}`)
    console.log(`   Binance : ${config.BINANCE_TESTNET ? 'TESTNET' : '🔴 LIVE'}`)
    console.log(`   Alpaca  : ${config.ALPACA_BASE_URL.includes('paper') ? 'PAPER' : '🔴 LIVE'}`)
    console.log(`   IBKR    : ${config.IBKR_HOST}:${config.IBKR_PORT}\n`)
  })
}

bootstrap().catch(err => {
  console.error('Bootstrap failed:', err)
  process.exit(1)
})

export default app
