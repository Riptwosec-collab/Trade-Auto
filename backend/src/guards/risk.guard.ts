// backend/src/guards/risk.guard.ts
// Runs BEFORE every order — blocks if any risk rule is violated

import { Request, Response, NextFunction } from 'express'
import { config } from '../config'
import { getRiskState, recordLoss, recordWin } from '../modules/risk/risk.service'

export async function riskGuard(req: Request, res: Response, next: NextFunction) {
  try {
    const state = await getRiskState()

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
