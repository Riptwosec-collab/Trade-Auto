// backend/src/modules/alpaca/alpaca.controller.ts

import { Router, Request, Response } from 'express'
import {
  getAlpacaAccount,
  getAlpacaPositions,
  closeAllAlpacaPositions,
  getAlpacaBars,
  getAlpacaLatestQuote,
  getAlpacaSnapshot,
  placeAlpacaOrder,
  cancelAlpacaOrder,
  getAlpacaOrders,
  isMarketOpen,
} from './alpaca.service'
import { riskGuard } from '../../guards/risk.guard'

const router = Router()

// GET /api/alpaca/account
router.get('/account', async (_req, res) => {
  try {
    res.json({ ok: true, data: await getAlpacaAccount() })
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e.message })
  }
})

// GET /api/alpaca/positions
router.get('/positions', async (_req, res) => {
  try {
    res.json({ ok: true, data: await getAlpacaPositions() })
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e.message })
  }
})

// DELETE /api/alpaca/positions  — KILL SWITCH
router.delete('/positions', async (_req, res) => {
  try {
    await closeAllAlpacaPositions()
    res.json({ ok: true, message: 'All positions closed' })
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e.message })
  }
})

// GET /api/alpaca/bars/:symbol?timeframe=1Hour&limit=100
router.get('/bars/:symbol', async (req, res) => {
  try {
    const { timeframe = '1Hour', limit = '100' } = req.query as Record<string, string>
    const data = await getAlpacaBars(req.params.symbol.toUpperCase(), timeframe, parseInt(limit))
    res.json({ ok: true, data })
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e.message })
  }
})

// GET /api/alpaca/quote/:symbol
router.get('/quote/:symbol', async (req, res) => {
  try {
    const data = await getAlpacaLatestQuote(req.params.symbol.toUpperCase())
    res.json({ ok: true, data })
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e.message })
  }
})

// GET /api/alpaca/snapshot?symbols=AAPL,NVDA,TSLA
router.get('/snapshot', async (req, res) => {
  try {
    const symbols = ((req.query.symbols as string) || 'AAPL,NVDA,TSLA,MSFT')
      .split(',').map(s => s.trim().toUpperCase())
    const data = await getAlpacaSnapshot(symbols)
    res.json({ ok: true, data })
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e.message })
  }
})

// GET /api/alpaca/orders?status=open
router.get('/orders', async (req, res) => {
  try {
    const status = (req.query.status as 'open' | 'closed' | 'all') || 'open'
    const data = await getAlpacaOrders(status)
    res.json({ ok: true, data })
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e.message })
  }
})

// POST /api/alpaca/order
router.post('/order', riskGuard, async (req, res) => {
  try {
    const data = await placeAlpacaOrder(req.body)
    res.json({ ok: true, data })
  } catch (e: any) {
    res.status(400).json({ ok: false, error: e.message })
  }
})

// DELETE /api/alpaca/order/:id
router.delete('/order/:id', async (req, res) => {
  try {
    await cancelAlpacaOrder(req.params.id)
    res.json({ ok: true, message: `Order ${req.params.id} cancelled` })
  } catch (e: any) {
    res.status(400).json({ ok: false, error: e.message })
  }
})

// GET /api/alpaca/clock
router.get('/clock', async (_req, res) => {
  try {
    res.json({ ok: true, data: await isMarketOpen() })
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e.message })
  }
})

export default router
