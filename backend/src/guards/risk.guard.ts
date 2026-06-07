// backend/src/guards/risk.guard.ts
// Runs BEFORE every order — blocks if any risk rule is violated

import { Request, Response, NextFunction } from 'express'
import { config } from '../config'
import { getRiskState } from '../modules/risk/risk.service'

function isLiveOrderPath(path: string) {
  if (path.startsWith('/api/binance')) return !config.BINANCE_TESTNET
  if (path.startsWith('/api/alpaca')) return !config.ALPACA_BASE_URL.includes('paper')
  if (path.startsWith('/api/ibkr')) return !(config.IBKR_PORT === 7497 || config.IBKR_PORT === 4002)
  return false
}

export async function riskGuard(req: Request, res: Response, next: NextFunction) {
  try {
    const state = await getRiskState()

    if (isLiveOrderPath(req.originalUrl)) {
      if (!config.LIVE_TRADING_ENABLED) {
        return res.status(403).json({
          ok: false,
          blocked: true,
          reason: 'LIVE_TRADING_DISABLED',
          message: 'Live trading is disabled. Set LIVE_TRADING_ENABLED=true on the backend after funding and broker API setup are complete.',
        })
      }

      if (req.body.liveConfirm !== config.LIVE_ORDER_CONFIRMATION) {
        return res.status(403).json({
          ok: false,
          blocked: true,
          reason: 'LIVE_CONFIRMATION_REQUIRED',
          message: `Live order confirmation required. Send liveConfirm="${config.LIVE_ORDER_CONFIRMATION}".`,
        })
      }
    }

    // ── 1. Kill switch ────────────────────────────────────────
    if (state.killSwitchActive) {
      return res.status(403).json({
        ok: false,
        blocked: true,
        reason: 'KILL_SWITCH_ACTIVE',
        message: 'Trading halted — kill switch is ON',
      })
    }

    // ── 2. Daily loss limit ───────────────────────────────────
    if (state.dailyLossPct >= config.DAILY_LOSS_LIMIT) {
      return res.status(403).json({
        ok: false,
        blocked: true,
        reason: 'DAILY_LOSS_LIMIT',
        message: `Daily loss limit reached: ${state.dailyLossPct.toFixed(2)}% / ${config.DAILY_LOSS_LIMIT}%`,
      })
    }

    // ── 3. Weekly loss limit ──────────────────────────────────
    if (state.weeklyLossPct >= config.WEEKLY_LOSS_LIMIT) {
      return res.status(403).json({
        ok: false,
        blocked: true,
        reason: 'WEEKLY_LOSS_LIMIT',
        message: `Weekly loss limit reached: ${state.weeklyLossPct.toFixed(2)}% / ${config.WEEKLY_LOSS_LIMIT}%`,
      })
    }

    // ── 4. Consecutive losses ─────────────────────────────────
    if (state.consecutiveLosses >= config.MAX_CONSECUTIVE_LOSSES) {
      return res.status(403).json({
        ok: false,
        blocked: true,
        reason: 'CONSECUTIVE_LOSSES',
        message: `${state.consecutiveLosses} consecutive losses — pause required`,
      })
    }

    // ── 5. Max drawdown ───────────────────────────────────────
    if (state.drawdownPct >= config.MAX_DRAWDOWN_PCT) {
      return res.status(403).json({
        ok: false,
        blocked: true,
        reason: 'MAX_DRAWDOWN',
        message: `Max drawdown exceeded: ${state.drawdownPct.toFixed(2)}% / ${config.MAX_DRAWDOWN_PCT}%`,
      })
    }

    // ── 6. Per-trade risk size check ──────────────────────────
    const { riskAmount, capitalValue } = req.body
    if (riskAmount && capitalValue) {
      const riskPct = (riskAmount / capitalValue) * 100
      if (riskPct > config.MAX_RISK_PER_TRADE) {
        return res.status(403).json({
          ok: false,
          blocked: true,
          reason: 'RISK_TOO_HIGH',
          message: `Trade risk ${riskPct.toFixed(2)}% exceeds max ${config.MAX_RISK_PER_TRADE}%`,
        })
      }
    }

    // ── All checks passed ─────────────────────────────────────
    req.body._riskChecked = true
    next()
  } catch (err: any) {
    res.status(500).json({ ok: false, error: 'Risk check failed: ' + err.message })
  }
}
