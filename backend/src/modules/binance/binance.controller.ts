// backend/src/modules/binance/binance.controller.ts
// Express router for all /api/binance/* endpoints

import { Router, Request, Response } from 'express'
import {
  getBinanceAccount,
  getBinanceTicker,
  getBinanceCandles,
  getBinanceOrderBook,
  placeBinanceOrder,
  cancelBinanceOrder,
  getBinanceOpenOrders,
} from './binance.service'
import { riskGuard } from '../../guards/risk.guard'

const router = Router()

// GET /api/binance/account
router.get('/account', async (_req: Request, res: Response) => {
  try {
    const data = await getBinanceAccount()
    res.json({ ok: true, data })
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e.message })
  }
})

// GET /api/binance/ticker/:symbol   e.g. BTCUSDT
router.get('/ticker/:symbol', async (req: Request, res: Response) => {
  try {
    const data = await getBinanceTicker(req.params.symbol.toUpperCase())
    res.json({ ok: true, data })
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e.message })
  }
})

// GET /api/binance/candles/:symbol?interval=1h&limit=100
router.get('/candles/:symbol', async (req: Request, res: Response) => {
  try {
    const { interval = '1h', limit = '100' } = req.query as Record<string, string>
    const data = await getBinanceCandles(req.params.symbol.toUpperCase(), interval, parseInt(limit))
    res.json({ ok: true, data })
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e.message })
  }
})

// GET /api/binance/orderbook/:symbol
router.get('/orderbook/:symbol', async (req: Request, res: Response) => {
  try {
    const data = await getBinanceOrderBook(req.params.symbol.toUpperCase())
    res.json({ ok: true, data })
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e.message })
  }
})

// GET /api/binance/orders/open
router.get('/orders/open', async (req: Request, res: Response) => {
  try {
    const symbol = (req.query.symbol as string)?.toUpperCase()
    const data = await getBinanceOpenOrders(symbol)
    res.json({ ok: true, data })
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e.message })
  }
})

// POST /api/binance/order
// Body: { symbol, side, type, quantity, price?, stopPrice? }
router.post('/order', riskGuard, async (req: Request, res: Response) => {
  try {
    const data = await placeBinanceOrder(req.body)
    res.json({ ok: true, data })
  } catch (e: any) {
    res.status(400).json({ ok: false, error: e.message })
  }
})

// DELETE /api/binance/order/:symbol/:orderId
router.delete('/order/:symbol/:orderId', async (req: Request, res: Response) => {
  try {
    const data = await cancelBinanceOrder(
      req.params.symbol.toUpperCase(),
      parseInt(req.params.orderId),
    )
    res.json({ ok: true, data })
  } catch (e: any) {
    res.status(400).json({ ok: false, error: e.message })
  }
})

export default router
