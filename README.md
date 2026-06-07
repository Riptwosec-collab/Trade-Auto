# ⬡ APEX TRADE — Professional Trading Platform

Full-stack trading platform connecting **Binance** (Crypto), **Alpaca** (Stocks), and **IBKR** (Multi-asset).

---

## 📁 Folder Structure

```
apex-trade/
├── backend/
│   ├── src/
│   │   ├── app.ts                        # Express entry point
│   │   ├── config/
│   │   │   ├── index.ts                  # Env validation (Zod)
│   │   │   └── redis.ts                  # Redis client
│   │   ├── guards/
│   │   │   └── risk.guard.ts             # Pre-order risk checks
│   │   ├── modules/
│   │   │   ├── binance/
│   │   │   │   ├── binance.service.ts    # Binance REST + WS
│   │   │   │   └── binance.controller.ts # /api/binance/*
│   │   │   ├── alpaca/
│   │   │   │   ├── alpaca.service.ts     # Alpaca REST + streaming
│   │   │   │   └── alpaca.controller.ts  # /api/alpaca/*
│   │   │   ├── ibkr/
│   │   │   │   ├── ibkr.service.ts       # IBKR via @stoqey/ib
│   │   │   │   └── ibkr.controller.ts    # /api/ibkr/*
│   │   │   └── risk/
│   │   │       ├── risk.service.ts       # P&L tracking, kill switch
│   │   │       └── risk.controller.ts    # /api/risk/*
│   │   └── websocket/
│   │       └── ws.server.ts             # Socket.io real-time hub
│   ├── prisma/
│   │   └── schema.prisma                # DB schema
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example                     # ← copy to .env
│
├── frontend/
│   ├── src/
│   │   ├── lib/
│   │   │   └── api.ts                   # All API calls
│   │   └── hooks/
│   │       └── useMarketSocket.ts       # Live price hook
│   ├── package.json
│   └── .env.local.example               # ← copy to .env.local
│
├── .env.example                         # Root env reference
├── .gitignore
├── railway.toml                         # Railway backend deploy
└── vercel.json                          # Vercel frontend deploy
```

---

## 🚀 Local Setup

### 1. Clone & install

```bash
git clone https://github.com/yourname/apex-trade.git
cd apex-trade

# Backend
cd backend
cp ../.env.example .env        # fill in your keys
npm install
npx prisma generate
npx prisma migrate dev

# Frontend
cd ../frontend
cp .env.local.example .env.local
npm install
```

### 2. Get API Keys

| Broker | URL | Mode |
|--------|-----|------|
| Binance Testnet | https://testnet.binance.vision | Free testnet |
| Alpaca Paper | https://app.alpaca.markets/paper | Free paper |
| IBKR | https://www.interactivebrokers.com | Requires account |

### 3. Run locally

```bash
# Terminal 1 — Backend
cd backend && npm run dev

# Terminal 2 — Frontend
cd frontend && npm run dev
```

Backend: http://localhost:3001  
Frontend: http://localhost:3000

---

## ☁️ Deploy to Railway + Vercel

### Backend → Railway

```bash
npm install -g @railway/cli
railway login
railway init
railway up
```

Then add all variables from `.env.example` in Railway dashboard under **Variables**.

### Frontend → Vercel

```bash
npm install -g vercel
cd frontend
vercel --prod
```

Add `NEXT_PUBLIC_API_URL` = your Railway backend URL in Vercel dashboard.

---

## 🔌 API Endpoints

### Binance (Crypto)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/binance/account` | Account balances |
| GET | `/api/binance/ticker/:symbol` | Live price |
| GET | `/api/binance/candles/:symbol` | OHLCV data |
| GET | `/api/binance/orderbook/:symbol` | Order book |
| POST | `/api/binance/order` | Place order ✅ risk checked |
| DELETE | `/api/binance/order/:symbol/:id` | Cancel order |

### Alpaca (Stocks)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/alpaca/account` | Account info |
| GET | `/api/alpaca/positions` | Open positions |
| DELETE | `/api/alpaca/positions` | 🛑 Close ALL (kill switch) |
| GET | `/api/alpaca/bars/:symbol` | OHLCV bars |
| GET | `/api/alpaca/snapshot` | Multi-symbol quotes |
| POST | `/api/alpaca/order` | Place order (supports bracket) |
| GET | `/api/alpaca/clock` | Market open/close status |

### IBKR
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/ibkr/status` | Connection status |
| POST | `/api/ibkr/connect` | Connect to TWS |
| GET | `/api/ibkr/account` | Account summary |
| GET | `/api/ibkr/positions` | All positions |
| POST | `/api/ibkr/order` | Place order |

### Risk Engine
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/risk/state` | Full risk state |
| POST | `/api/risk/kill-switch` | Toggle kill switch |
| POST | `/api/risk/calc-size` | Position size calc |
| POST | `/api/risk/reset-daily` | Reset daily counters |

---

## ⚠️ Important Notes

1. **Start with paper/testnet** — NEVER use real keys until fully tested
2. IBKR requires **TWS or IB Gateway** running on the same machine
3. All orders pass through the **Risk Guard** — blocks if limits exceeded
4. Secrets must NEVER be in frontend code — backend only
5. This is a **development template** — add authentication before going live

---

## 🛡️ Risk Defaults

| Rule | Default |
|------|---------|
| Max risk per trade | 1% |
| Daily loss limit | 2% |
| Weekly loss limit | 5% |
| Max consecutive losses | 3 |
| Max drawdown | 10% |

All configurable via `.env`.
