// backend/src/modules/risk/risk.controller.ts

import { Router } from 'express'
import {
  getRiskState,
  setKillSwitch,
  resetDailyCounters,
  calcPositionSize,
  recordTrade,
} from './risk.service'

const router = Router()

// GET /api/risk/state
router.get('/state', async (_req, res) => {
  try {
    res.json({ ok: true, data: await getRiskState() })
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e.message })
  }
})

// POST /api/risk/kill-switch  { active: true | false }
router.post('/kill-switch', async (req, res) => {
  try {
    const { active } = req.body
    const state = await setKillSwitch(!!active)
    res.json({ ok: true, data: state, message: active ? '🛑 Kill switch ON' : '✅ Kill switch OFF' })
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e.message })
  }
})

// POST /api/risk/reset-daily
router.post('/reset-daily', async (_req, res) => {
  try {
    await resetDailyCounters()
    res.json({ ok: true, message: 'Daily counters reset' })
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e.message })
  }
})

// POST /api/risk/calc-size
// Body: { capital, riskPct, entryPrice, stopPrice }
router.post('/calc-size', (req, res) => {
  try {
    const result = calcPositionSize(req.body)
    res.json({ ok: true, data: result })
  } catch (e: any) {
    res.status(400).json({ ok: false, error: e.message })
  }
})

// POST /api/risk/record-trade  { pnl, capitalNow }
router.post('/record-trade', async (req, res) => {
  try {
    const { pnl, capitalNow } = req.body
    const state = await recordTrade(pnl, capitalNow)
    res.json({ ok: true, data: state })
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e.message })
  }
})

export default router
