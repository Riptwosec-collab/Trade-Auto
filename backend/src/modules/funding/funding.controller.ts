import { Router } from 'express'
import { config } from '../../config'

const router = Router()

function alpacaMode() {
  return config.ALPACA_BASE_URL.includes('paper') ? 'paper' : 'live'
}

function ibkrMode() {
  return config.IBKR_PORT === 7497 || config.IBKR_PORT === 4002 ? 'paper' : 'live'
}

router.get('/status', (_req, res) => {
  res.json({
    ok: true,
    data: {
      liveTradingEnabled: config.LIVE_TRADING_ENABLED,
      liveOrderConfirmation: config.LIVE_ORDER_CONFIRMATION,
      brokers: {
        binance: {
          mode: config.BINANCE_TESTNET ? 'testnet' : 'live',
          configured: config.BINANCE_TESTNET
            ? Boolean(config.BINANCE_TESTNET_API_KEY && config.BINANCE_TESTNET_API_SECRET)
            : Boolean(config.BINANCE_API_KEY && config.BINANCE_API_SECRET),
          fundingUrl: 'https://www.binance.com/en/my/wallet/account/main/deposit/crypto',
          apiKeysUrl: 'https://www.binance.com/en/my/settings/api-management',
        },
        alpaca: {
          mode: alpacaMode(),
          configured: Boolean(config.ALPACA_API_KEY && config.ALPACA_API_SECRET),
          fundingUrl: 'https://app.alpaca.markets/brokerage/funding',
          apiKeysUrl: 'https://app.alpaca.markets/profile/api-keys',
        },
        ibkr: {
          mode: ibkrMode(),
          configured: Boolean(config.IBKR_HOST && config.IBKR_PORT && config.IBKR_CLIENT_ID),
          fundingUrl: 'https://www.interactivebrokers.com/en/index.php?f=1544&p=cash1',
          apiKeysUrl: 'https://www.interactivebrokers.com/en/trading/ib-api.php',
        },
      },
    },
  })
})

export default router
