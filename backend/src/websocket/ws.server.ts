// backend/src/websocket/ws.server.ts
// Real-time price streaming to frontend via Socket.io
// Aggregates Binance + Alpaca streams into one unified feed

import { Server as HttpServer } from 'http'
import { Server as IOServer, Socket } from 'socket.io'
import { config } from '../config'
import {
  subscribeBinanceTicker,
  subscribeBinanceCandles,
  subscribeBinanceOrderBook,
} from '../modules/binance/binance.service'
import { alpacaClient } from '../modules/alpaca/alpaca.service'

let io: IOServer

// ── Active subscriptions registry ────────────────────────────
const binanceSubs: Map<string, () => void> = new Map()

export function initWebSocket(httpServer: HttpServer) {
  io = new IOServer(httpServer, {
    cors: {
      origin: config.FRONTEND_URL,
      methods: ['GET', 'POST'],
    },
    transports: ['websocket', 'polling'],
  })

  io.on('connection', (socket: Socket) => {
    console.log(`🔌 Client connected: ${socket.id}`)

    // ── Subscribe to Binance ticker ───────────────────────────
    socket.on('subscribe:crypto', (symbol: string) => {
      const key = `ticker:${symbol}`
      if (binanceSubs.has(key)) return

      const unsub = subscribeBinanceTicker(symbol, (price, changePct) => {
        io.emit(`ticker:${symbol}`, { symbol, price, changePct, source: 'binance' })
      })
      binanceSubs.set(key, unsub as any)
      console.log(`📡 Subscribed Binance ticker: ${symbol}`)
    })

    // ── Subscribe to Binance candles ──────────────────────────
    socket.on('subscribe:candles', ({ symbol, interval }: { symbol: string; interval: string }) => {
      const key = `candles:${symbol}:${interval}`
      if (binanceSubs.has(key)) return

      const unsub = subscribeBinanceCandles(symbol, interval, (candle) => {
        io.emit(`candles:${symbol}:${interval}`, candle)
      })
      binanceSubs.set(key, unsub as any)
    })

    // ── Subscribe to Binance order book ───────────────────────
    socket.on('subscribe:orderbook', (symbol: string) => {
      const key = `orderbook:${symbol}`
      if (binanceSubs.has(key)) return

      const unsub = subscribeBinanceOrderBook(symbol, (bids, asks) => {
        io.emit(`orderbook:${symbol}`, { bids, asks })
      })
      binanceSubs.set(key, unsub as any)
    })

    // ── Subscribe to Alpaca stock quotes ──────────────────────
    socket.on('subscribe:stock', (symbol: string) => {
      try {
        const alpacaWS = (alpacaClient as any).data_stream_v2
        alpacaWS.subscribeForQuotes([symbol])
        alpacaWS.onStockQuote((quote: any) => {
          io.emit(`quote:${symbol}`, {
            symbol,
            bid: quote.BidPrice,
            ask: quote.AskPrice,
            price: (quote.BidPrice + quote.AskPrice) / 2,
            source: 'alpaca',
          })
        })
      } catch (err) {
        console.error('Alpaca WS error:', err)
      }
    })

    // ── Unsubscribe ───────────────────────────────────────────
    socket.on('unsubscribe', (key: string) => {
      const unsub = binanceSubs.get(key)
      if (typeof unsub === 'function') { unsub(); binanceSubs.delete(key) }
    })

    socket.on('disconnect', () => {
      console.log(`🔌 Client disconnected: ${socket.id}`)
    })
  })

  return io
}

// ── Broadcast helpers ─────────────────────────────────────────
export function broadcastOrderFilled(order: object) {
  io?.emit('order:filled', order)
}

export function broadcastRiskAlert(alert: object) {
  io?.emit('risk:alert', alert)
}

export function broadcastBotSignal(signal: object) {
  io?.emit('bot:signal', signal)
}

export function getIO() { return io }
