// frontend/src/lib/api.ts
// Unified API client — wraps all backend endpoints

const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

async function req<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  const json = await res.json()
  if (!json.ok) throw new Error(json.error || 'API error')
  return json.data
}

// ── BINANCE (Crypto) ──────────────────────────────────────────
export const binanceAPI = {
  account:    () => req('/api/binance/account'),
  ticker:     (symbol: string) => req(`/api/binance/ticker/${symbol}`),
  candles:    (symbol: string, interval = '1h', limit = 100) =>
    req(`/api/binance/candles/${symbol}?interval=${interval}&limit=${limit}`),
  orderBook:  (symbol: string) => req(`/api/binance/orderbook/${symbol}`),
  openOrders: (symbol?: string) => req(`/api/binance/orders/open${symbol ? '?symbol=' + symbol : ''}`),
  placeOrder: (body: object) => req('/api/binance/order', { method: 'POST', body: JSON.stringify(body) }),
  cancelOrder:(symbol: string, orderId: number) =>
    req(`/api/binance/order/${symbol}/${orderId}`, { method: 'DELETE' }),
}

// ── ALPACA (Stocks) ───────────────────────────────────────────
export const alpacaAPI = {
  account:    () => req('/api/alpaca/account'),
  positions:  () => req('/api/alpaca/positions'),
  closeAll:   () => req('/api/alpaca/positions', { method: 'DELETE' }),
  bars:       (symbol: string, timeframe = '1Hour', limit = 100) =>
    req(`/api/alpaca/bars/${symbol}?timeframe=${timeframe}&limit=${limit}`),
  quote:      (symbol: string) => req(`/api/alpaca/quote/${symbol}`),
  snapshot:   (symbols: string[]) => req(`/api/alpaca/snapshot?symbols=${symbols.join(',')}`),
  orders:     (status: 'open' | 'closed' | 'all' = 'open') => req(`/api/alpaca/orders?status=${status}`),
  placeOrder: (body: object) => req('/api/alpaca/order', { method: 'POST', body: JSON.stringify(body) }),
  cancelOrder:(id: string) => req(`/api/alpaca/order/${id}`, { method: 'DELETE' }),
  clock:      () => req('/api/alpaca/clock'),
}

// ── IBKR ─────────────────────────────────────────────────────
export const ibkrAPI = {
  status:     () => req('/api/ibkr/status'),
  connect:    () => req('/api/ibkr/connect', { method: 'POST' }),
  disconnect: () => req('/api/ibkr/disconnect', { method: 'POST' }),
  account:    () => req('/api/ibkr/account'),
  positions:  () => req('/api/ibkr/positions'),
  quote:      (symbol: string, type = 'stock') => req(`/api/ibkr/quote/${symbol}?type=${type}`),
  history:    (symbol: string, duration = '1 D', barSize = '1 hour') =>
    req(`/api/ibkr/history/${symbol}?duration=${encodeURIComponent(duration)}&barSize=${encodeURIComponent(barSize)}`),
  placeOrder: (body: object) => req('/api/ibkr/order', { method: 'POST', body: JSON.stringify(body) }),
  cancelOrder:(orderId: number) => req(`/api/ibkr/order/${orderId}`, { method: 'DELETE' }),
}

// ── RISK ──────────────────────────────────────────────────────
export const riskAPI = {
  state:       () => req('/api/risk/state'),
  killSwitch:  (active: boolean) => req('/api/risk/kill-switch', { method: 'POST', body: JSON.stringify({ active }) }),
  resetDaily:  () => req('/api/risk/reset-daily', { method: 'POST' }),
  calcSize:    (body: object) => req('/api/risk/calc-size', { method: 'POST', body: JSON.stringify(body) }),
  recordTrade: (pnl: number, capitalNow: number) =>
    req('/api/risk/record-trade', { method: 'POST', body: JSON.stringify({ pnl, capitalNow }) }),
}

export const fundingAPI = {
  status: () => req('/api/funding/status'),
}
