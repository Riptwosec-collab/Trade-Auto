// backend/src/modules/ibkr/ibkr.service.ts
// Interactive Brokers — via ib_insync style using @stoqey/ib
// Requires TWS or IB Gateway running on localhost

import {
  IBApi,
  EventName,
  ErrorCode,
  Contract,
  Order as IBOrder,
  OrderAction,
  OrderType,
  SecType,
  BarSizeSetting,
  WhatToShow,
} from '@stoqey/ib'
import { config } from '../../config'

// ── Client singleton ──────────────────────────────────────────
let ibClient: IBApi | null = null
let connected = false

export function getIBKRClient(): IBApi {
  if (!ibClient) {
    ibClient = new IBApi({
      host:     config.IBKR_HOST,
      port:     config.IBKR_PORT,
      clientId: config.IBKR_CLIENT_ID,
    })

    ibClient.on(EventName.connected, () => {
      connected = true
      console.log('✅ IBKR connected')
    })

    ibClient.on(EventName.disconnected, () => {
      connected = false
      console.warn('⚠️  IBKR disconnected')
    })

    ibClient.on(EventName.error, (err: Error, code: ErrorCode, reqId: number) => {
      console.error(`IBKR error [${code}] req#${reqId}: ${err.message}`)
    })
  }
  return ibClient
}

export async function connectIBKR(): Promise<void> {
  return new Promise((resolve, reject) => {
    const client = getIBKRClient()
    if (connected) return resolve()

    const timeout = setTimeout(() => reject(new Error('IBKR connect timeout')), 10_000)

    client.once(EventName.connected, () => {
      clearTimeout(timeout)
      resolve()
    })

    client.connect()
  })
}

export function disconnectIBKR() {
  ibClient?.disconnect()
}

export function isIBKRConnected() {
  return connected
}

// ── Helpers ───────────────────────────────────────────────────
function makeStockContract(symbol: string): Contract {
  return {
    symbol,
    secType: SecType.STK,
    currency: 'USD',
    exchange: 'SMART',
  }
}

function makeForexContract(base: string, quote = 'USD'): Contract {
  return {
    symbol: base,
    secType: SecType.CASH,
    currency: quote,
    exchange: 'IDEALPRO',
  }
}

function makeFutureContract(symbol: string, expiry: string): Contract {
  return {
    symbol,
    secType: SecType.FUT,
    currency: 'USD',
    exchange: 'CME',
    lastTradeDateOrContractMonth: expiry,
  }
}

// ── Account summary ───────────────────────────────────────────
export async function getIBKRAccountSummary(): Promise<Record<string, string>> {
  return new Promise((resolve, reject) => {
    const client = getIBKRClient()
    const summary: Record<string, string> = {}
    const reqId = Math.floor(Math.random() * 9000) + 1000

    const timeout = setTimeout(() => reject(new Error('Account summary timeout')), 8_000)

    client.on(EventName.accountSummary, (_reqId, _account, tag, value) => {
      summary[tag] = value
    })

    client.once(EventName.accountSummaryEnd, () => {
      clearTimeout(timeout)
      resolve(summary)
    })

    client.reqAccountSummary(reqId, 'All', 'NetLiquidation,TotalCashValue,BuyingPower,GrossPositionValue,UnrealizedPnL,RealizedPnL')
  })
}

// ── Positions ─────────────────────────────────────────────────
export async function getIBKRPositions(): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const client = getIBKRClient()
    const positions: any[] = []
    const timeout = setTimeout(() => reject(new Error('Positions timeout')), 8_000)

    client.on(EventName.position, (_account, contract, pos, avgCost) => {
      if (pos !== 0) {
        positions.push({
          symbol:   contract.symbol,
          secType:  contract.secType,
          currency: contract.currency,
          position: pos,
          avgCost,
        })
      }
    })

    client.once(EventName.positionEnd, () => {
      clearTimeout(timeout)
      resolve(positions)
    })

    client.reqPositions()
  })
}

// ── Market Data (snapshot) ────────────────────────────────────
export async function getIBKRMarketData(symbol: string, type: 'stock' | 'forex' = 'stock'): Promise<any> {
  return new Promise((resolve, reject) => {
    const client = getIBKRClient()
    const reqId  = Math.floor(Math.random() * 9000) + 1000
    const contract = type === 'forex'
      ? makeForexContract(symbol)
      : makeStockContract(symbol)
    const data: any = { symbol }
    const timeout = setTimeout(() => { resolve(data) }, 3_000)

    client.on(EventName.tickPrice, (_reqId, tickType, price) => {
      if (tickType === 1) data.bid   = price
      if (tickType === 2) data.ask   = price
      if (tickType === 4) data.last  = price
      if (tickType === 6) data.high  = price
      if (tickType === 7) data.low   = price
      if (tickType === 9) data.close = price
    })

    client.reqMktData(reqId, contract, '', true, false)
    // snapshot — auto-cancels after one tick
  })
}

// ── Place Order ───────────────────────────────────────────────
export interface IBKROrderParams {
  symbol:     string
  secType:    'STK' | 'CASH' | 'FUT'
  side:       'BUY' | 'SELL'
  orderType:  'MKT' | 'LMT' | 'STP' | 'STP LMT' | 'TRAIL'
  quantity:   number
  limitPrice?: number
  stopPrice?:  number
  trailPercent?: number
  tif?:        'DAY' | 'GTC'
}

export async function placeIBKROrder(params: IBKROrderParams): Promise<any> {
  return new Promise((resolve, reject) => {
    const client  = getIBKRClient()
    const orderId = Math.floor(Math.random() * 90000) + 10000

    const contract: Contract = params.secType === 'CASH'
      ? makeForexContract(params.symbol)
      : params.secType === 'FUT'
        ? makeFutureContract(params.symbol, '202509')
        : makeStockContract(params.symbol)

    const order: IBOrder = {
      action:      params.side as OrderAction,
      orderType:   params.orderType as OrderType,
      totalQuantity: params.quantity,
      lmtPrice:    params.limitPrice,
      auxPrice:    params.stopPrice ?? params.trailPercent,
      tif:         params.tif ?? 'DAY',
      transmit:    true,
    }

    const timeout = setTimeout(() => reject(new Error('Order timeout')), 10_000)

    client.once(EventName.orderStatus, (id, status, filled, remaining, avgFillPrice) => {
      if (id === orderId) {
        clearTimeout(timeout)
        resolve({ orderId, status, filled, remaining, avgFillPrice })
      }
    })

    client.placeOrder(orderId, contract, order)
  })
}

// ── Cancel Order ──────────────────────────────────────────────
export function cancelIBKROrder(orderId: number): void {
  getIBKRClient().cancelOrder(orderId)
}

// ── Historical Data ───────────────────────────────────────────
export async function getIBKRHistoricalData(
  symbol: string,
  duration  = '1 D',
  barSize: BarSizeSetting | string = BarSizeSetting.HOURS_ONE,
): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const client   = getIBKRClient()
    const reqId    = Math.floor(Math.random() * 9000) + 1000
    const contract = makeStockContract(symbol)
    const bars: any[] = []
    const timeout  = setTimeout(() => reject(new Error('Historical data timeout')), 15_000)

    client.on(EventName.historicalData, (_reqId, time, open, high, low, close, volume) => {
      bars.push({
        time,
        open,
        high,
        low,
        close,
        volume,
      })
    })

    client.once(EventName.result, () => {
      clearTimeout(timeout)
      resolve(bars)
    })

    client.reqHistoricalData(reqId, contract, '', duration, barSize as BarSizeSetting, WhatToShow.TRADES, 1, 1, false)
  })
}
