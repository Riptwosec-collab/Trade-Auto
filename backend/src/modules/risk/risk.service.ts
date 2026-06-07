// backend/src/modules/risk/risk.service.ts
// Tracks P&L state, drawdown, consecutive losses — stored in Redis

import { redis } from '../../config/redis'
import { config } from '../../config'

export interface RiskState {
  capitalPeak:        number
  capitalCurrent:     number
  drawdownPct:        number
  dailyLossAmt:       number
  dailyLossPct:       number
  weeklyLossAmt:      number
  weeklyLossPct:      number
  consecutiveLosses:  number
  totalTrades:        number
  winCount:           number
  lossCount:          number
  killSwitchActive:   boolean
  lastUpdated:        string
}

const RISK_KEY = 'apex:risk:state'

const DEFAULT_STATE: RiskState = {
  capitalPeak:       100_000,
  capitalCurrent:    100_000,
  drawdownPct:       0,
  dailyLossAmt:      0,
  dailyLossPct:      0,
  weeklyLossAmt:     0,
  weeklyLossPct:     0,
  consecutiveLosses: 0,
  totalTrades:       0,
  winCount:          0,
  lossCount:         0,
  killSwitchActive:  false,
  lastUpdated:       new Date().toISOString(),
}

// ── Read / Write ──────────────────────────────────────────────
export async function getRiskState(): Promise<RiskState> {
  const raw = await redis.get(RISK_KEY)
  return raw ? JSON.parse(raw) : DEFAULT_STATE
}

async function saveRiskState(state: RiskState): Promise<void> {
  state.lastUpdated = new Date().toISOString()
  await redis.set(RISK_KEY, JSON.stringify(state))
}

// ── Record a completed trade ──────────────────────────────────
export async function recordTrade(pnl: number, capitalNow: number): Promise<RiskState> {
  const state = await getRiskState()

  state.capitalCurrent = capitalNow
  state.totalTrades++

  // Update peak
  if (capitalNow > state.capitalPeak) state.capitalPeak = capitalNow

  // Drawdown
  state.drawdownPct = ((state.capitalPeak - capitalNow) / state.capitalPeak) * 100

  // Win / Loss tracking
  if (pnl > 0) {
    state.winCount++
    state.consecutiveLosses = 0
  } else {
    state.lossCount++
    state.consecutiveLosses++
    const lossPct = Math.abs(pnl / capitalNow) * 100
    state.dailyLossAmt  += Math.abs(pnl)
    state.dailyLossPct  += lossPct
    state.weeklyLossAmt += Math.abs(pnl)
    state.weeklyLossPct += lossPct
  }

  // Auto kill switch
  if (
    state.drawdownPct        >= config.MAX_DRAWDOWN_PCT ||
    state.dailyLossPct       >= config.DAILY_LOSS_LIMIT ||
    state.consecutiveLosses  >= config.MAX_CONSECUTIVE_LOSSES
  ) {
    state.killSwitchActive = true
  }

  await saveRiskState(state)
  return state
}

export async function recordWin(capital: number) {
  return recordTrade(1, capital) // positive pnl
}

export async function recordLoss(amount: number, capital: number) {
  return recordTrade(-amount, capital)
}

// ── Kill switch ───────────────────────────────────────────────
export async function setKillSwitch(active: boolean): Promise<RiskState> {
  const state = await getRiskState()
  state.killSwitchActive = active
  await saveRiskState(state)
  return state
}

// ── Reset daily counters (call via cron at midnight) ──────────
export async function resetDailyCounters(): Promise<void> {
  const state = await getRiskState()
  state.dailyLossAmt  = 0
  state.dailyLossPct  = 0
  // auto re-enable trading if kill was daily-loss triggered
  if (
    state.consecutiveLosses < config.MAX_CONSECUTIVE_LOSSES &&
    state.drawdownPct < config.MAX_DRAWDOWN_PCT
  ) {
    state.killSwitchActive = false
  }
  await saveRiskState(state)
}

export async function resetWeeklyCounters(): Promise<void> {
  const state = await getRiskState()
  state.weeklyLossAmt = 0
  state.weeklyLossPct = 0
  await saveRiskState(state)
}

// ── Position size calculator ──────────────────────────────────
export function calcPositionSize(params: {
  capital:      number
  riskPct:      number   // e.g. 1 = 1%
  entryPrice:   number
  stopPrice:    number
}): {
  riskAmount:   number
  positionSize: number
  units:        number
  rr?: number
  tpAmount?: number
} {
  const riskAmount  = params.capital * (params.riskPct / 100)
  const stopDist    = Math.abs(params.entryPrice - params.stopPrice)
  const units       = stopDist > 0 ? riskAmount / stopDist : 0
  const positionSize = units * params.entryPrice

  return {
    riskAmount:   parseFloat(riskAmount.toFixed(2)),
    positionSize: parseFloat(positionSize.toFixed(2)),
    units:        parseFloat(units.toFixed(4)),
  }
}
