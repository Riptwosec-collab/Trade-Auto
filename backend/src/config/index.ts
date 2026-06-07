// backend/src/config/index.ts
// Central config — loaded once at startup, validated via Zod

import 'dotenv/config'
import { z } from 'zod'

const optionalUrl = z.string().url().optional().or(z.literal('').transform(() => undefined))
const optionalString = z.string().optional().or(z.literal('').transform(() => undefined))
const numberFromString = (fallback: string) => z.string().default(fallback).transform((value, ctx) => {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Expected a valid number' })
    return z.NEVER
  }
  return parsed
})

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: numberFromString('3001'),
  APP_SECRET: z.string().min(32).default('development_secret_change_me_32_chars'),
  FRONTEND_URL: z.string().url().default('http://localhost:3000'),

  DATABASE_URL: optionalString,
  REDIS_URL: optionalString,

  // Binance. Live keys are only required when BINANCE_TESTNET=false.
  BINANCE_API_KEY: optionalString,
  BINANCE_API_SECRET: optionalString,
  BINANCE_TESTNET: z.string().default('true').transform(v => v === 'true'),
  BINANCE_TESTNET_API_KEY: optionalString,
  BINANCE_TESTNET_API_SECRET: optionalString,

  // Alpaca. Defaults to paper endpoints; keys are checked only when Alpaca endpoints are called.
  ALPACA_API_KEY: optionalString,
  ALPACA_API_SECRET: optionalString,
  ALPACA_BASE_URL: z.string().url().default('https://paper-api.alpaca.markets'),
  ALPACA_DATA_URL: z.string().url().default('https://data.alpaca.markets'),

  // IBKR (optional — requires TWS or IB Gateway running locally)
  IBKR_HOST: z.string().default('127.0.0.1'),
  IBKR_PORT: numberFromString('7497'),
  IBKR_CLIENT_ID: numberFromString('1'),
  IBKR_ACCOUNT_ID: optionalString,

  // Risk
  MAX_RISK_PER_TRADE: numberFromString('1'),
  DAILY_LOSS_LIMIT: numberFromString('2'),
  WEEKLY_LOSS_LIMIT: numberFromString('5'),
  MAX_CONSECUTIVE_LOSSES: numberFromString('3'),
  MAX_DRAWDOWN_PCT: numberFromString('10'),

  // Notifications
  TELEGRAM_BOT_TOKEN: optionalString,
  TELEGRAM_CHAT_ID: optionalString,
  DISCORD_WEBHOOK_URL: optionalUrl,
})

const _env = envSchema.safeParse(process.env)

if (!_env.success) {
  console.error('❌  Invalid environment variables:')
  console.error(_env.error.flatten().fieldErrors)
  process.exit(1)
}

export const config = _env.data

export const isProduction = config.NODE_ENV === 'production'
export const isTestnet = config.BINANCE_TESTNET

export function assertConfigured(service: 'binance' | 'alpaca') {
  if (service === 'binance') {
    const hasTestnetKeys = Boolean(config.BINANCE_TESTNET_API_KEY && config.BINANCE_TESTNET_API_SECRET)
    const hasLiveKeys = Boolean(config.BINANCE_API_KEY && config.BINANCE_API_SECRET)

    if (config.BINANCE_TESTNET && !hasTestnetKeys) {
      throw new Error('Binance testnet keys are missing. Set BINANCE_TESTNET_API_KEY and BINANCE_TESTNET_API_SECRET in backend/.env')
    }

    if (!config.BINANCE_TESTNET && !hasLiveKeys) {
      throw new Error('Binance live keys are missing. Set BINANCE_API_KEY and BINANCE_API_SECRET in backend/.env')
    }
  }

  if (service === 'alpaca' && !(config.ALPACA_API_KEY && config.ALPACA_API_SECRET)) {
    throw new Error('Alpaca keys are missing. Set ALPACA_API_KEY and ALPACA_API_SECRET in backend/.env')
  }
}
