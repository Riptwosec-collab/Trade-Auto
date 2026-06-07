// backend/src/modules/binance/binance.service.ts
// Handles Binance REST + WebSocket for Crypto trading

import Binance, { OrderType } from 'binance-api-node'
import type { CandleChartInterval_LT, NewOrderSpot } from 'binance-api-node'
import { config } from '../../config'

// ── Client factory ────────────────────────────────────────────
function createBinanceClient() {
  const isTestnet = config.BINANCE_TESTNET

  return Binance({
    apiKey:    isTestnet ? config.BINANCE_TESTNET_API_KEY    : config.BINANCE_API_KEY,
    apiSecret: isTestnet ? config.BINANCE_TESTNET_API_SECRET : config.BINANCE_API_SECRET,
    httpBase:  isTestnet
      ? 'https://testnet.binance.vision'
      : 'https://api.binance.com',
    wsBase: isTestnet
      ? 'wss://testnet.binance.vision/ws'
      : 'wss://stream.binance.com:9443/ws',
  })
}

export const binanceClient = createBinanceClient()

// ── Account ───────────────────────────────────────────────────
export async function getBinanceAccount() {
  const account = await binanceClient.accountInfo()
  return {
    balances: account.balances.filter(b => parseFloat(b.free) > 0 || parseFloat(b.locked) > 0),
    canTrade: account.canTrade,
    canWithdraw: account.canWithdraw,
  }
}

// ── Market Data ───────────────────────────────────────────────
export async function getBinanceTicker(symbol: string) {
  const ticker = await binanceClient.prices({ symbol })
  return { symbol, price: parseFloat(ticker[symbol]) }
}

export async function getBinanceCandles(symbol: string, interval: string = '1h', limit = 100) {
  const candles = await binanceClient.candles({ symbol, interval: interval as CandleChartInterval_LT, limit })
  return candles.map(c => ({
    time:   c.openTime,
    open:   parseFloat(c.open),
    high:   parseFloat(c.high),
    low:    parseFloat(c.low),
    close:  parseFloat(c.close),
    volume: parseFloat(c.volume),
  }))
}

export async function getBinanceOrderBook(symbol: string, limit = 20) {
  const book = await binanceClient.book({ symbol, limit })
  return {
    bids: book.bids.map(b => ({ price: parseFloat(b.price), qty: parseFloat(b.quantity) })),
    asks: book.asks.map(a => ({ price: parseFloat(a.price), qty: parseFloat(a.quantity) })),
  }
}

// ── Orders ────────────────────────────────────────────────────
export interface BinanceOrderParams {
  symbol:    string
  side:      'BUY' | 'SELL'
  type:      'MARKET' | 'LIMIT' | 'STOP_LOSS_LIMIT' | 'TAKE_PROFIT_LIMIT'
  quantity:  number
  price?:    number   // required for LIMIT
  stopPrice?: number  // required for STOP orders
}

export async function placeBinanceOrder(params: BinanceOrderParams) {
  let orderPayload: NewOrderSpot
  const baseOrder = {
    symbol: params.symbol,
    side: params.side,
    quantity: params.quantity.toString(),
  }

  switch (params.type) {
    case 'LIMIT':
      orderPayload = {
        ...baseOrder,
        type: OrderType.LIMIT,
        price: params.price?.toString() ?? '',
        timeInForce: 'GTC',
      }
      break
    case 'STOP_LOSS_LIMIT':
      orderPayload = {
        ...baseOrder,
        type: OrderType.STOP_LOSS_LIMIT,
        price: params.price?.toString() ?? '',
        stopPrice: params.stopPrice?.toString() ?? '',
        timeInForce: 'GTC',
      }
      break
    case 'TAKE_PROFIT_LIMIT':
      orderPayload = {
        ...baseOrder,
        type: OrderType.TAKE_PROFIT_LIMIT,
        price: params.price?.toString() ?? '',
        stopPrice: params.stopPrice?.toString() ?? '',
        timeInForce: 'GTC',
      }
      break
    default:
      orderPayload = {
        ...baseOrder,
        type: OrderType.MARKET,
      }
  }

  const order = await binanceClient.order(orderPayload)

  return {
    orderId:     order.orderId,
    symbol:      order.symbol,
    side:        order.side,
    type:        order.type,
    status:      order.status,
    executedQty: parseFloat(order.executedQty),
    price:       parseFloat(order.price),
  }
}

export async function cancelBinanceOrder(symbol: string, orderId: number) {
  return binanceClient.cancelOrder({ symbol, orderId })
}

export async function getBinanceOpenOrders(symbol?: string) {
  return binanceClient.openOrders({ symbol })
}

// ── WebSocket Streams ─────────────────────────────────────────
export function subscribeBinanceTicker(
  symbol: string,
  onUpdate: (price: number, change: number) => void,
) {
  return binanceClient.ws.ticker(symbol, ticker => {
    onUpdate(parseFloat(ticker.curDayClose), parseFloat(ticker.priceChangePercent))
  })
}

export function subscribeBinanceCandles(
  symbol: string,
  interval: string,
  onCandle: (candle: object) => void,
) {
  return binanceClient.ws.candles(symbol, interval, candle => {
    if (candle.isFinal) onCandle(candle)
  })
}

export function subscribeBinanceOrderBook(
  symbol: string,
  onUpdate: (bids: object[], asks: object[]) => void,
) {
  return binanceClient.ws.partialDepth({ symbol, level: 10 }, depth => {
    onUpdate(depth.bids, depth.asks)
  })
}
