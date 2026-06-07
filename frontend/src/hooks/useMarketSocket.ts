// frontend/src/hooks/useMarketSocket.ts
// React hook — connects to backend Socket.io, streams live prices

import { useEffect, useRef, useState, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

interface TickerData {
  symbol:     string
  price:      number
  changePct:  number
  source:     'binance' | 'alpaca'
}

interface OrderBookData {
  bids: { price: number; qty: number }[]
  asks: { price: number; qty: number }[]
}

export function useMarketSocket() {
  const socketRef  = useRef<Socket | null>(null)
  const [connected, setConnected] = useState(false)
  const [tickers,   setTickers]   = useState<Record<string, TickerData>>({})
  const [orderBook, setOrderBook] = useState<Record<string, OrderBookData>>({})
  const [lastAlert, setLastAlert] = useState<any>(null)

  useEffect(() => {
    const socket = io(API_URL, { transports: ['websocket'] })
    socketRef.current = socket

    socket.on('connect',    () => setConnected(true))
    socket.on('disconnect', () => setConnected(false))

    // Risk alerts from server
    socket.on('risk:alert', (alert) => setLastAlert(alert))

    return () => { socket.disconnect() }
  }, [])

  // ── Subscribe to a crypto ticker (Binance) ────────────────
  const subscribeCrypto = useCallback((symbol: string) => {
    const socket = socketRef.current
    if (!socket) return

    socket.emit('subscribe:crypto', symbol)

    socket.on(`ticker:${symbol}`, (data: TickerData) => {
      setTickers(prev => ({ ...prev, [symbol]: data }))
    })

    return () => socket.off(`ticker:${symbol}`)
  }, [])

  // ── Subscribe to order book ───────────────────────────────
  const subscribeOrderBook = useCallback((symbol: string) => {
    const socket = socketRef.current
    if (!socket) return

    socket.emit('subscribe:orderbook', symbol)

    socket.on(`orderbook:${symbol}`, (data: OrderBookData) => {
      setOrderBook(prev => ({ ...prev, [symbol]: data }))
    })

    return () => socket.off(`orderbook:${symbol}`)
  }, [])

  // ── Subscribe to stock quotes (Alpaca) ────────────────────
  const subscribeStock = useCallback((symbol: string) => {
    const socket = socketRef.current
    if (!socket) return

    socket.emit('subscribe:stock', symbol)

    socket.on(`quote:${symbol}`, (data: TickerData) => {
      setTickers(prev => ({ ...prev, [symbol]: data }))
    })

    return () => socket.off(`quote:${symbol}`)
  }, [])

  return {
    connected,
    tickers,
    orderBook,
    lastAlert,
    subscribeCrypto,
    subscribeOrderBook,
    subscribeStock,
  }
}
