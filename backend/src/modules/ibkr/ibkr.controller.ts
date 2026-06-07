// backend/src/modules/ibkr/ibkr.controller.ts

import { Router } from 'express'
import {
  connectIBKR,
  disconnectIBKR,
  isIBKRConnected,
  getIBKRAccountSummary,
  getIBKRPositions,
  getIBKRMarketData,
  getIBKRHistoricalData,
  placeIBKROrder,
  cancelIBKROrder,
} from './ibkr.service'
import { riskGuard } from '../../guards/risk.guard'

const router = Router()

// GET /api/ibkr/status
router.get('/status', (_req, res) => {
  res.json({ ok: true, connected: isIBKRConnected() })
})

// POST /api/ibkr/connect
router.post('/connect', async (_req, res) => {
  try {
    await connectIBKR()
    res.json({ ok: true, message: 'IBKR connected' })
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e.message, hint: 'Make sure TWS or IB Gateway is running on port ' + process.env.IBKR_PORT })
  }
})

// POST /api/ibkr/disconnect
router.post('/disconnect', (_req, res) => {
  disconnectIBKR()
  res.json({ ok: true, message: 'IBKR disconnected' })
})

// GET /api/ibkr/account
router.get('/account', async (_req, res) => {
  try {
    res.json({ ok: true, data: await getIBKRAccountSummary() })
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e.message })
  }
})

// GET /api/ibkr/positions
router.get('/positions', async (_req, res) => {
  try {
    res.json({ ok: true, data: await getIBKRPositions() })
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e.message })
  }
})

// GET /api/ibkr/quote/:symbol?type=stock
router.get('/quote/:symbol', async (req, res) => {
  try {
    const type = (req.query.type as 'stock' | 'forex') || 'stock'
    const data = await getIBKRMarketData(req.params.symbol.toUpperCase(), type)
    res.json({ ok: true, data })
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e.message })
  }
})

// GET /api/ibkr/history/:symbol?duration=1 D&barSize=1 hour
router.get('/history/:symbol', async (req, res) => {
  try {
    const { duration = '1 D', barSize = '1 hour' } = req.query as Record<string, string>
    const data = await getIBKRHistoricalData(req.params.symbol.toUpperCase(), duration, barSize)
    res.json({ ok: true, data })
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e.message })
  }
})

// POST /api/ibkr/order
router.post('/order', riskGuard, async (req, res) => {
  try {
    const data = await placeIBKROrder(req.body)
    res.json({ ok: true, data })
  } catch (e: any) {
    res.status(400).json({ ok: false, error: e.message })
  }
})

// DELETE /api/ibkr/order/:orderId
router.delete('/order/:orderId', (req, res) => {
  try {
    cancelIBKROrder(parseInt(req.params.orderId))
    res.json({ ok: true, message: `Order ${req.params.orderId} cancel requested` })
  } catch (e: any) {
    res.status(400).json({ ok: false, error: e.message })
  }
})

export default router
