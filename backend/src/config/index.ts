// backend/src/config/index.ts
// Central config — loaded once at startup, validated via Zod

import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV:              z.enum(['development', 'production', 'test']).default('development'),
  PORT:                  z.string().default('3001').transform(Number),
  APP_SECRET:            z.string().min(32),
  FRONTEND_URL:          z.string().url(),

  DATABASE_URL:          z.string(),
  REDIS_URL:             z.string(),

  // Binance
  BINANCE_API_KEY:       z.string(),
  BINANCE_API_SECRET:    z.string(),
  BINANCE_TESTNET:       z.string().default('true').transform(v => v === 'true'),
  BINANCE_TESTNET_API_KEY:    z.string().optional(),
  BINANCE_TESTNET_API_SECRET: z.string().optional(),

  // Alpaca
  ALPACA_API_KEY:        z.string(),
  ALPACA_API_SECRET:     z.string(),
  ALPACA_BASE_URL:       z.string().url(),
  ALPACA_DATA_URL:       z.string().url(),

  // IBKR (optional — requires TWS running locally)
  IBKR_HOST:             z.string().default('127.0.0.1'),
  IBKR_PORT:             z.string().default('7497').transform(Number),
  IBKR_CLIENT_ID:        z.string().default('1').transform(Number),
  IBKR_ACCOUNT_ID:       z.string().optional(),

  // Risk
  MAX_RISK_PER_TRADE:    z.string().default('1').transform(Number),
  DAILY_LOSS_LIMIT:      z.string().default('2').transform(Number),
  WEEKLY_LOSS_LIMIT:     z.string().default('5').transform(Number),
  MAX_CONSECUTIVE_LOSSES:z.string().default('3').transform(Number),
  MAX_DRAWDOWN_PCT:      z.string().default('10').transform(Number),

  // Notifications
  TELEGRAM_BOT_TOKEN:    z.string().optional(),
  TELEGRAM_CHAT_ID:      z.string().optional(),
  DISCORD_WEBHOOK_URL:   z.string().url().optional(),
})

const _env = envSchema.safeParse(process.env)

if (!_env.success) {
  console.error('❌  Invalid environment variables:')
  console.error(_env.error.flatten().fieldErrors)
  process.exit(1)
}

export const config = _env.data

export const isProduction = config.NODE_ENV === 'production'
export const isTestnet    = config.BINANCE_TESTNET
