// backend/src/modules/alpaca/alpaca.service.ts
// Alpaca Markets — US Stocks, ETFs, Paper & Live trading

import Alpaca from '@alpacahq/alpaca-trade-api'
import { config } from '../../config'

// ── Client ────────────────────────────────────────────────────
export const alpacaClient = new Alpaca({
  keyId:     config.ALPACA_API_KEY,
  secretKey: config.ALPACA_API_SECRET,
  baseUrl:   config.ALPACA_BASE_URL,
  feed:      'iex',  // 'sip' requires paid subscription
})

// ── Account ───────────────────────────────────────────────────
export async function getAlpacaAccount() {
  const account = await alpacaClient.getAccount()
  return {
    id:              account.id,
    status:          account.status,
    cash:            parseFloat(account.cash),
    portfolioValue:  parseFloat(account.portfolio_value),
    buyingPower:     parseFloat(account.buying_power),
    equity:          parseFloat(account.equity),
    dayPL:           parseFloat(account.unrealized_intraday_pl),
    dayPLPct:        parseFloat(account.unrealized_intraday_plpc),
    tradingBlocked:  account.trading_blocked,
    patternDayTrader:account.pattern_day_trader,
  }
}

// ── Positions ─────────────────────────────────────────────────
export async function getAlpacaPositions() {
  const positions = await alpacaClient.getPositions()
  return positions.map((p: any) => ({
    symbol:       p.symbol,
    qty:          parseFloat(p.qty),
    side:         p.side,
    avgEntryPrice:parseFloat(p.avg_entry_price),
    currentPrice: parseFloat(p.current_price),
    marketValue:  parseFloat(p.market_value),
    unrealizedPL: parseFloat(p.unrealized_pl),
    unrealizedPLPct: parseFloat(p.unrealized_plpc),
    changeToday:  parseFloat(p.change_today),
  }))
}

export async function closeAllAlpacaPositions() {
  return alpacaClient.closeAllPositions()
}

// ── Market Data ───────────────────────────────────────────────
export async function getAlpacaBars(
  symbol: string,
  timeframe = '1Hour',
  limit = 100,
) {
  const bars = await alpacaClient.getBarsV2(symbol, {
    timeframe,
    limit,
    feed: 'iex',
  })
  const result = []
  for await (const bar of bars) {
    result.push({
      time:   new Date(bar.Timestamp).getTime(),
      open:   bar.OpenPrice,
      high:   bar.HighPrice,
      low:    bar.LowPrice,
      close:  bar.ClosePrice,
      volume: bar.Volume,
    })
  }
  return result
}

export async function getAlpacaLatestQuote(symbol: string) {
  const quote = await alpacaClient.getLatestQuote(symbol)
  return {
    symbol,
    askPrice: quote.AskPrice,
    bidPrice: quote.BidPrice,
    askSize:  quote.AskSize,
    bidSize:  quote.BidSize,
  }
}

export async function getAlpacaSnapshot(symbols: string[]) {
  const snaps = await alpacaClient.getSnapshots(symbols)
  return Object.entries(snaps).map(([sym, snap]: any) => ({
    symbol:       sym,
    price:        snap.latestTrade?.Price,
    change:       snap.dailyBar?.ClosePrice - snap.prevDailyBar?.ClosePrice,
    changePct:    ((snap.dailyBar?.ClosePrice - snap.prevDailyBar?.ClosePrice) / snap.prevDailyBar?.ClosePrice) * 100,
    volume:       snap.dailyBar?.Volume,
    high:         snap.dailyBar?.HighPrice,
    low:          snap.dailyBar?.LowPrice,
  }))
}

// ── Orders ────────────────────────────────────────────────────
export interface AlpacaOrderParams {
  symbol:       string
  qty:          number
  side:         'buy' | 'sell'
  type:         'market' | 'limit' | 'stop' | 'stop_limit' | 'trailing_stop'
  timeInForce:  'day' | 'gtc' | 'opg' | 'ioc'
  limitPrice?:  number
  stopPrice?:   number
  trailPercent?: number
  orderClass?:  'simple' | 'bracket' | 'oco' | 'oto'
  takeProfitLimitPrice?: number
  stopLossStopPrice?:    number
  stopLossLimitPrice?:   number
}

export async function placeAlpacaOrder(params: AlpacaOrderParams) {
  const orderData: any = {
    symbol:        params.symbol,
    qty:           params.qty,
    side:          params.side,
    type:          params.type,
    time_in_force: params.timeInForce,
  }

  if (params.limitPrice)    orderData.limit_price    = params.limitPrice
  if (params.stopPrice)     orderData.stop_price     = params.stopPrice
  if (params.trailPercent)  orderData.trail_percent  = params.trailPercent
  if (params.orderClass)    orderData.order_class    = params.orderClass

  // Bracket order (entry + SL + TP in one call)
  if (params.orderClass === 'bracket') {
    orderData.take_profit = { limit_price: params.takeProfitLimitPrice }
    orderData.stop_loss   = {
      stop_price:  params.stopLossStopPrice,
      limit_price: params.stopLossLimitPrice,
    }
  }

  const order = await alpacaClient.createOrder(orderData)
  return {
    id:          order.id,
    clientOrderId: order.client_order_id,
    symbol:      order.symbol,
    qty:         parseFloat(order.qty),
    side:        order.side,
    type:        order.type,
    status:      order.status,
    filledQty:   parseFloat(order.filled_qty),
    filledAvgPrice: order.filled_avg_price ? parseFloat(order.filled_avg_price) : null,
    createdAt:   order.created_at,
  }
}

export async function cancelAlpacaOrder(orderId: string) {
  return alpacaClient.cancelOrder(orderId)
}

export async function getAlpacaOrders(status: 'open' | 'closed' | 'all' = 'open') {
  const orders = await alpacaClient.getOrders({
    status,
    until: undefined,
    after: undefined,
    limit: 50,
    direction: undefined,
    nested: undefined,
    symbols: undefined,
  })
  return orders.map((o: any) => ({
    id:       o.id,
    symbol:   o.symbol,
    qty:      parseFloat(o.qty),
    side:     o.side,
    type:     o.type,
    status:   o.status,
    filledQty:parseFloat(o.filled_qty),
    createdAt:o.created_at,
  }))
}

// ── Watchlist ─────────────────────────────────────────────────
export async function getAlpacaWatchlists() {
  return alpacaClient.getWatchlists()
}

// ── Market Hours ──────────────────────────────────────────────
export async function isMarketOpen() {
  const clock = await alpacaClient.getClock()
  return {
    isOpen:     clock.is_open,
    nextOpen:   clock.next_open,
    nextClose:  clock.next_close,
    currentTime:clock.timestamp,
  }
}
