'use client'

import { useState, useEffect } from 'react'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

// ── Types ─────────────────────────────────────────────────────
interface Ticker { symbol: string; price: string; change: string; up: boolean }
interface Position { symbol: string; market: string; side: string; qty: number; pnl: number; pnlPct: number }

// ── Mock data (used when backend offline) ─────────────────────
const MOCK_TICKERS: Ticker[] = [
  { symbol: 'BTC/USD',  price: '$107,842', change: '+2.34%', up: true  },
  { symbol: 'ETH/USD',  price: '$3,842',   change: '+1.82%', up: true  },
  { symbol: 'NVDA',     price: '$942.30',  change: '+3.21%', up: true  },
  { symbol: 'AAPL',     price: '$211.80',  change: '+0.92%', up: true  },
  { symbol: 'EUR/USD',  price: '1.0834',   change: '-0.31%', up: false },
  { symbol: 'GBP/USD',  price: '1.2741',   change: '-0.18%', up: false },
  { symbol: 'SOL/USD',  price: '$182.40',  change: '+4.12%', up: true  },
  { symbol: 'TSLA',     price: '$244.60',  change: '-1.42%', up: false },
]

const MOCK_POSITIONS: Position[] = [
  { symbol: 'NVDA',    market: 'Stocks', side: 'LONG',  qty: 10,   pnl: 2340,  pnlPct: 2.54 },
  { symbol: 'BTC/USD', market: 'Crypto', side: 'LONG',  qty: 0.05, pnl: 1820,  pnlPct: 1.72 },
  { symbol: 'EUR/USD', market: 'Forex',  side: 'SHORT', qty: 1,    pnl: 540,   pnlPct: 0.46 },
  { symbol: 'TSLA',   market: 'Stocks', side: 'SHORT', qty: 20,   pnl: -284,  pnlPct: -0.58 },
]

// ── Components ────────────────────────────────────────────────
function Badge({ type, children }: { type: 'buy'|'sell'|'neutral'|'gold'|'purple'; children: React.ReactNode }) {
  const styles: Record<string, string> = {
    buy:     'bg-green-500/10 text-green-400 border border-green-500/20',
    sell:    'bg-red-500/10 text-red-400 border border-red-500/20',
    neutral: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
    gold:    'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20',
    purple:  'bg-purple-500/10 text-purple-400 border border-purple-500/20',
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold font-mono ${styles[type]}`}>
      {children}
    </span>
  )
}

function MetricCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="bg-[#0F1C30] border border-[#1E2E4A] rounded-xl p-4 hover:border-[#263850] transition-all">
      <div className="text-xs text-[#4A5F7A] uppercase tracking-widest mb-1 font-semibold">{label}</div>
      <div className={`text-xl font-bold font-mono ${color || 'text-[#5B94FF]'}`}>{value}</div>
      {sub && <div className="text-xs text-[#7A8FA6] mt-1">{sub}</div>}
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────
export default function Home() {
  const [page, setPage]           = useState<'dashboard'|'trade'|'portfolio'|'risk'|'bot'>('dashboard')
  const [lang, setLang]           = useState<'th'|'en'>('th')
  const [market, setMarket]       = useState<'crypto'|'stock'|'forex'>('crypto')
  const [symbol, setSymbol]       = useState('BTCUSDT')
  const [side, setSide]           = useState<'buy'|'sell'>('buy')
  const [qty, setQty]             = useState('0.05')
  const [price, setPrice]         = useState('107500')
  const [sl, setSl]               = useState('104000')
  const [tp, setTp]               = useState('115000')
  const [orderType, setOrderType] = useState<'market'|'limit'>('market')
  const [botActive, setBotActive] = useState(false)
  const [botMode, setBotMode]     = useState<'conservative'|'balanced'|'aggressive'>('conservative')
  const [killActive, setKillActive] = useState(false)
  const [aiInput, setAiInput]     = useState('')
  const [aiMessages, setAiMessages] = useState<{role:string;text:string}[]>([
    { role: 'bot', text: lang === 'th'
      ? 'สวัสดีครับ! พิมพ์ชื่อสัญลักษณ์เพื่อวิเคราะห์ เช่น NVDA, BTC, EUR/USD'
      : 'Hello! Type a symbol to analyze e.g. NVDA, BTC, EUR/USD' }
  ])
  const [backendStatus, setBackendStatus] = useState<'checking'|'online'|'offline'>('checking')

  const t = (th: string, en: string) => lang === 'th' ? th : en

  // Check backend health
  useEffect(() => {
    fetch(`${API}/health`, { signal: AbortSignal.timeout(3000) })
      .then(r => r.json())
      .then(() => setBackendStatus('online'))
      .catch(() => setBackendStatus('offline'))
  }, [])

  // Symbol lists per market
  const symbols = {
    crypto: ['BTCUSDT','ETHUSDT','SOLUSDT','BNBUSDT','XRPUSDT'],
    stock:  ['AAPL','NVDA','TSLA','MSFT','PLTR','META','AMZN'],
    forex:  ['EURUSD','GBPUSD','USDJPY','AUDUSD','USDCHF'],
  }

  function handleMarketChange(m: 'crypto'|'stock'|'forex') {
    setMarket(m)
    setSymbol(symbols[m][0])
    const defaults = {
      crypto: { price:'107500', sl:'104000', tp:'115000' },
      stock:  { price:'211.80', sl:'205.00', tp:'225.00' },
      forex:  { price:'1.0834', sl:'1.0870', tp:'1.0760' },
    }
    setPrice(defaults[m].price)
    setSl(defaults[m].sl)
    setTp(defaults[m].tp)
  }

  async function placeOrder() {
    const broker = market === 'crypto' ? 'binance' : market === 'stock' ? 'alpaca' : 'alpaca'
    const body = market === 'crypto'
      ? { symbol, side: side.toUpperCase(), type: orderType.toUpperCase(), quantity: parseFloat(qty), price: parseFloat(price) }
      : { symbol, qty: parseFloat(qty), side, type: orderType, timeInForce: 'gtc', limitPrice: parseFloat(price) }

    try {
      const res = await fetch(`${API}/api/${broker}/order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (json.ok) alert(`✅ Order placed! ID: ${json.data?.orderId || json.data?.id}`)
      else alert(`❌ Error: ${json.error}`)
    } catch {
      alert('⚠️ Backend offline — order not sent')
    }
  }

  async function toggleKillSwitch() {
    const next = !killActive
    try {
      await fetch(`${API}/api/risk/kill-switch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: next }),
      })
    } catch {}
    setKillActive(next)
  }

  function runAI() {
    const sym = aiInput.trim().toUpperCase() || 'BTC'
    const db: Record<string, any> = {
      NVDA:   { trend:'Bullish', bull:82, bear:18, rsi:62, entry:'$935', sl:'$908', tp:'$992', risk:'Medium' },
      BTC:    { trend:'Bullish', bull:76, bear:24, rsi:58, entry:'$107,500', sl:'$104,000', tp:'$115,000', risk:'Medium-High' },
      ETH:    { trend:'Bullish', bull:71, bear:29, rsi:55, entry:'$3,820', sl:'$3,700', tp:'$4,100', risk:'Medium' },
      EURUSD: { trend:'Bearish', bull:35, bear:65, rsi:42, entry:'1.0840', sl:'1.0875', tp:'1.0780', risk:'Low' },
      SOL:    { trend:'Bullish', bull:79, bear:21, rsi:64, entry:'$180', sl:'$172', tp:'$198', risk:'High' },
    }
    const key = Object.keys(db).find(k => sym.includes(k)) || 'BTC'
    const d = db[key]
    const isGreen = d.trend === 'Bullish'

    setAiMessages(prev => [...prev,
      { role: 'user', text: sym },
      { role: 'bot', text:
        `📊 ${key} — ${d.trend} ${isGreen ? '🟢' : '🔴'}\n` +
        `Bullish: ${d.bull}% | Bearish: ${d.bear}%\n` +
        `RSI: ${d.rsi}\n` +
        `Entry: ${d.entry} | SL: ${d.sl} | TP: ${d.tp}\n` +
        `Risk: ${d.risk}\n` +
        (lang === 'th' ? '⚠️ ไม่ใช่คำแนะนำการลงทุน' : '⚠️ Not investment advice')
      }
    ])
    setAiInput('')
  }

  // ── Risk calc
  const riskAmt   = 847320 * 0.01
  const rr        = tp && sl && price
    ? (Math.abs(parseFloat(tp) - parseFloat(price)) / Math.abs(parseFloat(price) - parseFloat(sl))).toFixed(1)
    : '0'

  const navItems = [
    { id: 'dashboard', label: t('หน้าหลัก','Dashboard'), icon: '📊' },
    { id: 'trade',     label: t('เทรด','Trade'),         icon: '⚡' },
    { id: 'portfolio', label: t('พอร์ต','Portfolio'),     icon: '💼' },
    { id: 'risk',      label: t('ความเสี่ยง','Risk'),     icon: '🛡️' },
    { id: 'bot',       label: t('บอท','Bot'),             icon: '🤖' },
  ]

  return (
    <div className="min-h-screen bg-[#060D1A] text-[#E8F0FF]">

      {/* TICKER STRIP */}
      <div className="bg-[#0B1525] border-b border-[#1E2E4A] h-7 flex items-center overflow-hidden">
        <div className="flex gap-6 animate-marquee whitespace-nowrap px-4 text-xs font-mono">
          {[...MOCK_TICKERS, ...MOCK_TICKERS].map((t, i) => (
            <span key={i} className="flex items-center gap-2">
              <span className="text-[#7A8FA6]">{t.symbol}</span>
              <span className="font-semibold">{t.price}</span>
              <span className={t.up ? 'text-green-400' : 'text-red-400'}>{t.change}</span>
            </span>
          ))}
        </div>
      </div>

      {/* TOPBAR */}
      <header className="bg-[#060D1A]/95 backdrop-blur border-b border-[#1E2E4A] h-12 flex items-center justify-between px-4 sticky top-0 z-50">
        <div className="flex items-center gap-3">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center font-bold text-sm text-white">A</div>
            <span className="font-bold text-base tracking-widest">
              <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">APEX</span>
              <span className="text-[#7A8FA6] font-light ml-1">TRADE</span>
            </span>
          </div>

          {/* NAV */}
          <nav className="flex gap-0.5 bg-[#0B1525] border border-[#1E2E4A] rounded-lg p-1 ml-2">
            {navItems.map(item => (
              <button
                key={item.id}
                onClick={() => setPage(item.id as any)}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                  page === item.id
                    ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-500/25'
                    : 'text-[#7A8FA6] hover:text-white hover:bg-white/5'
                }`}
              >
                {item.icon} {item.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          {/* Backend status */}
          <span className={`text-xs font-semibold flex items-center gap-1 ${
            backendStatus === 'online' ? 'text-green-400' : backendStatus === 'offline' ? 'text-red-400' : 'text-yellow-400'
          }`}>
            <span className={`w-2 h-2 rounded-full ${
              backendStatus === 'online' ? 'bg-green-400 shadow-sm shadow-green-400' : backendStatus === 'offline' ? 'bg-red-400' : 'bg-yellow-400'
            }`}></span>
            {backendStatus === 'online' ? 'Backend Online' : backendStatus === 'offline' ? 'Demo Mode' : 'Connecting...'}
          </span>

          {/* Lang toggle */}
          <div className="flex gap-1">
            <button onClick={() => setLang('th')} className={`text-xs px-2 py-1 rounded font-bold border transition-all ${lang==='th' ? 'bg-blue-600 border-blue-500 text-white' : 'border-[#1E2E4A] text-[#7A8FA6]'}`}>TH</button>
            <button onClick={() => setLang('en')} className={`text-xs px-2 py-1 rounded font-bold border transition-all ${lang==='en' ? 'bg-blue-600 border-blue-500 text-white' : 'border-[#1E2E4A] text-[#7A8FA6]'}`}>EN</button>
          </div>

          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-xs font-bold cursor-pointer">TP</div>
        </div>
      </header>

      {/* PAGES */}
      <main className="p-4 max-w-screen-2xl mx-auto">

        {/* ── DASHBOARD ── */}
        {page === 'dashboard' && (
          <div className="space-y-4">
            {/* Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              <MetricCard label={t('มูลค่าพอร์ต','Portfolio')} value="$847,320" sub="▲ +2.34% today" color="text-blue-400" />
              <MetricCard label="Daily P&L" value="+$19,430" color="text-green-400" sub="+$54,180 MTD" />
              <MetricCard label="Win Rate" value="67.4%" color="text-yellow-400" sub="Profit Factor: 2.31" />
              <MetricCard label="Sharpe Ratio" value="1.84" color="text-cyan-400" sub="Sortino: 2.12" />
              <MetricCard label={t('โพซิชันเปิด','Positions')} value="7" color="text-purple-400" sub={t('ความเสี่ยง','Risk')+': $3,240'} />
              <MetricCard label="Max Drawdown" value="-3.2%" color="text-red-400" sub="Limit: -8.5%" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Heatmap */}
              <div className="bg-[#0F1C30] border border-[#1E2E4A] rounded-xl p-4 lg:col-span-2">
                <div className="text-xs text-[#4A5F7A] uppercase tracking-widest mb-3 font-semibold flex items-center gap-1">
                  <span className="w-0.5 h-3 bg-blue-500 rounded"></span>
                  {t('ฮีตแมปตลาด','Market Heatmap')}
                </div>
                <div className="grid grid-cols-5 gap-2">
                  {[
                    { s:'NVDA', p:'+3.21%', v:.35 },{ s:'BTC', p:'+2.34%', v:.5 },
                    { s:'AAPL', p:'+0.92%', v:.2 },{ s:'TSLA', p:'-1.42%', v:-.2 },
                    { s:'META', p:'-2.10%', v:-.35 },{ s:'SOL', p:'+4.12%', v:.4 },
                    { s:'ETH', p:'+1.82%', v:.25 },{ s:'MSFT', p:'+0.43%', v:.12 },
                    { s:'AMZN', p:'-0.28%', v:-.1 },{ s:'AMD', p:'-3.10%', v:-.45 },
                  ].map(h => (
                    <div key={h.s} className={`p-2 rounded-lg text-center cursor-pointer hover:scale-105 transition-transform border border-transparent hover:border-white/10 ${h.v > 0 ? 'bg-green-500/'+Math.round(h.v*80) : 'bg-red-500/'+Math.round(Math.abs(h.v)*80)}`}
                      style={{ background: h.v > 0 ? `rgba(0,230,118,${Math.abs(h.v)*0.6})` : `rgba(255,69,96,${Math.abs(h.v)*0.6})` }}>
                      <div className="text-xs font-bold">{h.s}</div>
                      <div className={`text-xs font-mono ${h.v > 0 ? 'text-green-300' : 'text-red-300'}`}>{h.p}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* News */}
              <div className="bg-[#0F1C30] border border-[#1E2E4A] rounded-xl p-4">
                <div className="text-xs text-[#4A5F7A] uppercase tracking-widest mb-3 font-semibold flex items-center gap-1">
                  <span className="w-0.5 h-3 bg-blue-500 rounded"></span>
                  {t('ข่าวตลาด','Market News')}
                </div>
                {[
                  { tag:'Bullish', tagColor:'green', headline:'Fed คงดอกเบี้ย ตลาดตอบรับบวก', time:'2h ago' },
                  { tag:'Earnings', tagColor:'blue', headline:'NVDA Q1 2025 กำไรเกิน +42% YoY', time:'4h ago' },
                  { tag:'Crypto', tagColor:'purple', headline:'BTC ทดสอบแนวต้าน $110K', time:'5h ago' },
                  { tag:'Risk', tagColor:'red', headline:'CPI สูงกว่าคาด — USD แข็งค่า', time:'6h ago' },
                ].map((n, i) => (
                  <div key={i} className="py-2 border-b border-[#1E2E4A]/50 last:border-0 cursor-pointer hover:pl-1 transition-all">
                    <Badge type={n.tagColor === 'green' ? 'buy' : n.tagColor === 'red' ? 'sell' : n.tagColor === 'purple' ? 'purple' : 'neutral'}>{n.tag}</Badge>
                    <div className="text-xs font-medium mt-1 mb-1">{n.headline}</div>
                    <div className="text-xs text-[#4A5F7A]">{n.time}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Positions */}
            <div className="bg-[#0F1C30] border border-[#1E2E4A] rounded-xl p-4">
              <div className="text-xs text-[#4A5F7A] uppercase tracking-widest mb-3 font-semibold flex items-center gap-1">
                <span className="w-0.5 h-3 bg-blue-500 rounded"></span>
                {t('โพซิชันที่เปิดอยู่','Open Positions')}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="text-xs text-[#4A5F7A] uppercase tracking-wider border-b border-[#1E2E4A]">
                    <th className="pb-2 text-left">Symbol</th>
                    <th className="pb-2 text-left">Market</th>
                    <th className="pb-2 text-left">Side</th>
                    <th className="pb-2 text-right">Qty</th>
                    <th className="pb-2 text-right">P&L</th>
                    <th className="pb-2 text-right">%</th>
                  </tr></thead>
                  <tbody>
                    {MOCK_POSITIONS.map((p, i) => (
                      <tr key={i} className="border-b border-[#1E2E4A]/40 hover:bg-blue-500/5 cursor-pointer">
                        <td className="py-2 font-bold text-blue-300">{p.symbol}</td>
                        <td className="py-2"><Badge type={p.market==='Crypto'?'purple':p.market==='Forex'?'gold':'neutral'}>{p.market}</Badge></td>
                        <td className="py-2"><Badge type={p.side==='LONG'?'buy':'sell'}>{p.side}</Badge></td>
                        <td className="py-2 text-right font-mono text-xs">{p.qty}</td>
                        <td className={`py-2 text-right font-mono font-bold ${p.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>{p.pnl >= 0 ? '+' : ''}${p.pnl.toLocaleString()}</td>
                        <td className={`py-2 text-right font-mono text-xs ${p.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>{p.pnlPct >= 0 ? '+' : ''}{p.pnlPct}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── TRADE ── */}
        {page === 'trade' && (
          <div className="space-y-4">
            {/* Market selector */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex gap-2">
                {(['crypto','stock','forex'] as const).map(m => (
                  <button key={m} onClick={() => handleMarketChange(m)}
                    className={`px-4 py-1.5 rounded-full text-xs font-bold border transition-all ${market === m ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/25' : 'border-[#1E2E4A] text-[#7A8FA6] hover:border-blue-500 hover:text-blue-400'}`}>
                    {m === 'crypto' ? '₿ Crypto' : m === 'stock' ? '📈 '+t('หุ้น','Stocks') : '💱 Forex'}
                  </button>
                ))}
              </div>
              <select value={symbol} onChange={e => setSymbol(e.target.value)}
                className="bg-[#0B1525] border border-[#1E2E4A] text-[#E8F0FF] px-3 py-1.5 rounded-lg text-xs font-mono">
                {symbols[market].map(s => <option key={s}>{s}</option>)}
              </select>
              <div className="text-xl font-bold font-mono text-green-400">
                {market === 'crypto' ? '$107,842' : market === 'stock' ? '$211.80' : '1.0834'}
              </div>
              <Badge type="buy">▲ {market === 'crypto' ? '+2.34%' : market === 'stock' ? '+0.92%' : '-0.31%'}</Badge>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
              {/* Chart placeholder */}
              <div className="lg:col-span-2 bg-[#0F1C30] border border-[#1E2E4A] rounded-xl p-4">
                <div className="flex gap-2 mb-3">
                  {['1m','5m','15m','1h','4h','1D'].map(tf => (
                    <button key={tf} className={`text-xs px-2 py-0.5 rounded font-mono transition-all ${tf==='1h'?'bg-blue-600 text-white':'text-[#7A8FA6] hover:text-white'}`}>{tf}</button>
                  ))}
                </div>
                <div className="bg-[#060D1A] rounded-lg h-48 flex items-center justify-center border border-[#1E2E4A] relative overflow-hidden">
                  <svg viewBox="0 0 400 180" className="w-full h-full" preserveAspectRatio="none">
                    <defs><linearGradient id="cg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#3D7BFF" stopOpacity=".4"/><stop offset="100%" stopColor="#3D7BFF" stopOpacity="0"/></linearGradient></defs>
                    <polyline points="0,160 50,140 100,130 150,110 180,120 220,90 260,75 300,60 350,45 400,30" fill="none" stroke="#3D7BFF" strokeWidth="2"/>
                    <polygon points="0,160 50,140 100,130 150,110 180,120 220,90 260,75 300,60 350,45 400,30 400,180 0,180" fill="url(#cg)"/>
                    <line x1="0" y1="50" x2="400" y2="50" stroke="rgba(255,69,96,.5)" strokeWidth="1" strokeDasharray="4"/>
                    <line x1="0" y1="140" x2="400" y2="140" stroke="rgba(0,230,118,.5)" strokeWidth="1" strokeDasharray="4"/>
                    <text x="4" y="46" fill="#FF4560" fontSize="9">Resistance</text>
                    <text x="4" y="136" fill="#00E676" fontSize="9">Support</text>
                  </svg>
                </div>
                {/* Indicators */}
                <div className="grid grid-cols-4 gap-2 mt-3">
                  {[{l:'RSI',v:'58.3',c:'text-yellow-400'},{l:'MACD',v:'+0.82',c:'text-green-400'},{l:'VWAP',v:'$210.40',c:''},{l:'ATR',v:'$3.42',c:'text-cyan-400'}].map(ind => (
                    <div key={ind.l} className="bg-[#060D1A] rounded-lg p-2 text-center border border-[#1E2E4A]">
                      <div className="text-xs text-[#4A5F7A]">{ind.l}</div>
                      <div className={`text-sm font-bold font-mono ${ind.c || 'text-[#E8F0FF]'}`}>{ind.v}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Order Book */}
              <div className="bg-[#0F1C30] border border-[#1E2E4A] rounded-xl p-4">
                <div className="text-xs text-[#4A5F7A] uppercase tracking-widest mb-3 font-semibold">{t('สมุดคำสั่ง','Order Book')}</div>
                <div className="space-y-0.5 mb-2">
                  {[['109,200','2.841',72],['108,950','1.420',45],['108,700','0.920',28]].map(([p,s,w],i) => (
                    <div key={i} className="flex justify-between text-xs font-mono py-1 px-2 rounded relative overflow-hidden cursor-pointer hover:opacity-80">
                      <div className="absolute right-0 top-0 h-full bg-red-500/12 rounded" style={{width:`${w}%`}}></div>
                      <span className="text-red-400 relative z-10">{p}</span>
                      <span className="relative z-10 text-[#7A8FA6]">{s}</span>
                    </div>
                  ))}
                </div>
                <div className="text-center text-base font-bold font-mono text-green-400 py-1 bg-[#060D1A] rounded-lg border border-[#1E2E4A] my-1">
                  {market === 'crypto' ? '107,842' : market === 'stock' ? '211.80' : '1.0834'}
                </div>
                <div className="space-y-0.5 mt-2">
                  {[['107,600','3.200',60],['107,400','4.100',80],['107,100','1.800',35]].map(([p,s,w],i) => (
                    <div key={i} className="flex justify-between text-xs font-mono py-1 px-2 rounded relative overflow-hidden cursor-pointer hover:opacity-80">
                      <div className="absolute right-0 top-0 h-full bg-green-500/12 rounded" style={{width:`${w}%`}}></div>
                      <span className="text-green-400 relative z-10">{p}</span>
                      <span className="relative z-10 text-[#7A8FA6]">{s}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Order Panel */}
              <div className="bg-[#0F1C30] border border-[#1E2E4A] rounded-xl p-4">
                <div className="flex gap-1 bg-[#060D1A] rounded-lg p-1 mb-4 border border-[#1E2E4A]">
                  {(['market','limit'] as const).map(ot => (
                    <button key={ot} onClick={() => setOrderType(ot)}
                      className={`flex-1 py-1.5 rounded-md text-xs font-bold transition-all ${orderType===ot?'bg-[#0F1C30] text-[#E8F0FF] shadow':'text-[#7A8FA6]'}`}>
                      {ot === 'market' ? t('ราคาตลาด','Market') : t('กำหนดราคา','Limit')}
                    </button>
                  ))}
                </div>

                <div className="space-y-2 mb-3">
                  <div>
                    <label className="text-xs text-[#4A5F7A] uppercase tracking-wider font-semibold">{t('จำนวน','Qty')}</label>
                    <input value={qty} onChange={e=>setQty(e.target.value)} type="number"
                      className="w-full mt-1 bg-[#060D1A] border border-[#1E2E4A] text-[#E8F0FF] px-3 py-2 rounded-lg text-sm font-mono focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/30"/>
                  </div>
                  {orderType === 'limit' && (
                    <div>
                      <label className="text-xs text-[#4A5F7A] uppercase tracking-wider font-semibold">{t('ราคา','Price')}</label>
                      <input value={price} onChange={e=>setPrice(e.target.value)} type="number"
                        className="w-full mt-1 bg-[#060D1A] border border-[#1E2E4A] text-[#E8F0FF] px-3 py-2 rounded-lg text-sm font-mono focus:border-blue-500 focus:outline-none"/>
                    </div>
                  )}
                  <div>
                    <label className="text-xs text-[#4A5F7A] uppercase tracking-wider font-semibold">Stop Loss</label>
                    <input value={sl} onChange={e=>setSl(e.target.value)} type="number"
                      className="w-full mt-1 bg-[#060D1A] border border-[#1E2E4A] text-red-400 px-3 py-2 rounded-lg text-sm font-mono focus:border-red-500 focus:outline-none"/>
                  </div>
                  <div>
                    <label className="text-xs text-[#4A5F7A] uppercase tracking-wider font-semibold">Take Profit</label>
                    <input value={tp} onChange={e=>setTp(e.target.value)} type="number"
                      className="w-full mt-1 bg-[#060D1A] border border-[#1E2E4A] text-green-400 px-3 py-2 rounded-lg text-sm font-mono focus:border-green-500 focus:outline-none"/>
                  </div>
                </div>

                {/* Summary */}
                <div className="bg-[#060D1A] rounded-lg p-3 mb-3 border border-[#1E2E4A] text-xs font-mono space-y-1">
                  <div className="flex justify-between"><span className="text-[#4A5F7A]">Risk $</span><span className="text-red-400">-${riskAmt.toFixed(0)}</span></div>
                  <div className="flex justify-between"><span className="text-[#4A5F7A]">Risk %</span><span className="text-yellow-400">1.00%</span></div>
                  <div className="flex justify-between"><span className="text-[#4A5F7A]">R:R</span><span className="text-green-400">1 : {rr}</span></div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => { setSide('buy'); placeOrder() }}
                    className="py-2.5 rounded-lg text-sm font-bold bg-gradient-to-r from-green-600 to-green-500 text-black hover:opacity-90 transition-all shadow-lg shadow-green-500/25 active:scale-95">
                    {t('ซื้อ Long','Buy Long')}
                  </button>
                  <button onClick={() => { setSide('sell'); placeOrder() }}
                    className="py-2.5 rounded-lg text-sm font-bold bg-gradient-to-r from-red-600 to-red-500 text-white hover:opacity-90 transition-all shadow-lg shadow-red-500/25 active:scale-95">
                    {t('ขาย Short','Sell Short')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── PORTFOLIO ── */}
        {page === 'portfolio' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <MetricCard label={t('มูลค่ารวม','Total Value')} value="$847,320" color="text-blue-400"/>
              <MetricCard label={t('กำไรรวม','Total Gain')} value="+$147,320" color="text-green-400"/>
              <MetricCard label={t('เงินสด','Cash')} value="$212,450"/>
              <MetricCard label="Beta" value="0.84" color="text-cyan-400"/>
            </div>
            <div className="bg-[#0F1C30] border border-[#1E2E4A] rounded-xl p-4">
              <div className="text-xs text-[#4A5F7A] uppercase tracking-widest mb-4 font-semibold flex items-center gap-1">
                <span className="w-0.5 h-3 bg-blue-500 rounded"></span>
                {t('สัดส่วนสินทรัพย์','Asset Allocation')}
              </div>
              <div className="space-y-4">
                {[
                  { label: '📈 '+t('หุ้น','Stocks'), pct: 45, value: '$381,294', color: '#3D7BFF' },
                  { label: '₿ Crypto',               pct: 30, value: '$254,196', color: '#A855F7' },
                  { label: '💱 Forex',                pct: 15, value: '$127,098', color: '#FFB700' },
                  { label: '💰 '+t('เงินสด','Cash'), pct: 10, value: '$84,732',  color: '#7A8FA6' },
                ].map(a => (
                  <div key={a.label}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-semibold">{a.label}</span>
                      <span className="font-mono" style={{color: a.color}}>{a.pct}% · {a.value}</span>
                    </div>
                    <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{width:`${a.pct}%`, background: a.color}}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── RISK ── */}
        {page === 'risk' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-[#0F1C30] border border-[#1E2E4A] rounded-xl p-4">
                <div className="text-xs text-[#4A5F7A] uppercase tracking-widest mb-4 font-semibold flex items-center gap-1">
                  <span className="w-0.5 h-3 bg-blue-500 rounded"></span>
                  🛡️ {t('ศูนย์ควบคุมความเสี่ยง','Risk Control Center')}
                </div>
                <div className="grid grid-cols-3 gap-3 mb-4">
                  {[
                    { label: t('ต่อเทรด','Per Trade'), val: '1.0%', max: 50, color: '#FFB700' },
                    { label: 'Daily Limit', val: '0.4/2%', max: 20, color: '#00E676' },
                    { label: 'Weekly Limit', val: '1.1/5%', max: 22, color: '#00E676' },
                  ].map(r => (
                    <div key={r.label} className="bg-[#060D1A] rounded-lg p-3 border border-[#1E2E4A] text-center">
                      <div className="text-xs text-[#4A5F7A] mb-1">{r.label}</div>
                      <div className="text-lg font-bold font-mono" style={{color:r.color}}>{r.val}</div>
                      <div className="h-1 bg-white/5 rounded-full mt-2 overflow-hidden">
                        <div className="h-full rounded-full" style={{width:`${r.max}%`,background:r.color}}></div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="space-y-2 mb-4">
                  {[
                    { label: t('สถานะการเทรด','Trading Status'), status: 'NORMAL', ok: true },
                    { label: t('ขาดทุนต่อเนื่อง','Consecutive Losses'), status: '0/3', ok: true },
                    { label: t('Drawdown ปัจจุบัน','Current Drawdown'), status: '-3.2%', ok: false },
                  ].map(s => (
                    <div key={s.label} className={`flex items-center justify-between p-3 rounded-lg border ${s.ok ? 'border-green-500/20 bg-green-500/5' : 'border-yellow-500/20 bg-yellow-500/5'}`}>
                      <span className="text-sm">{s.label}</span>
                      <Badge type={s.ok ? 'buy' : 'gold'}>{s.status}</Badge>
                    </div>
                  ))}
                </div>
                <button onClick={toggleKillSwitch}
                  className={`w-full py-3 rounded-xl font-bold text-sm transition-all ${killActive ? 'bg-gradient-to-r from-red-900 to-red-600 text-white shadow-lg shadow-red-500/30' : 'bg-gradient-to-r from-red-800/50 to-red-600/50 text-red-300 border border-red-500/30'}`}>
                  {killActive ? '🔴 KILL SWITCH — ON (คลิกเพื่อปิด)' : '🛑 '+t('ปิดทุกโพซิชัน Kill Switch','Close All — Kill Switch')}
                </button>
              </div>

              {/* Position calc */}
              <div className="bg-[#0F1C30] border border-[#1E2E4A] rounded-xl p-4">
                <div className="text-xs text-[#4A5F7A] uppercase tracking-widest mb-4 font-semibold flex items-center gap-1">
                  <span className="w-0.5 h-3 bg-blue-500 rounded"></span>
                  {t('คำนวณขนาดโพซิชัน','Position Size Calculator')}
                </div>
                <div className="space-y-3">
                  {[
                    { label: t('เงินทุน ($)','Capital ($)'), val: '847320' },
                    { label: 'Risk % (max 3%)', val: '1' },
                    { label: 'Stop Loss Distance ($)', val: '500' },
                  ].map(f => (
                    <div key={f.label}>
                      <label className="text-xs text-[#4A5F7A] uppercase tracking-wider font-semibold">{f.label}</label>
                      <input defaultValue={f.val} type="number" className="w-full mt-1 bg-[#060D1A] border border-[#1E2E4A] text-[#E8F0FF] px-3 py-2 rounded-lg text-sm font-mono focus:border-blue-500 focus:outline-none"/>
                    </div>
                  ))}
                  <div className="bg-[#060D1A] rounded-lg p-3 border border-[#1E2E4A] space-y-2 text-sm font-mono">
                    <div className="flex justify-between"><span className="text-[#4A5F7A]">{t('ความเสี่ยงสูงสุด','Max Risk')}</span><span className="text-red-400">-$8,473</span></div>
                    <div className="flex justify-between"><span className="text-[#4A5F7A]">{t('จำนวนหน่วย','Units')}</span><span className="text-blue-400">16.95 units</span></div>
                    <div className="flex justify-between"><span className="text-[#4A5F7A]">R:R</span><span className="text-green-400">1 : 3.0</span></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── BOT ── */}
        {page === 'bot' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-[#0F1C30] border border-[#1E2E4A] rounded-xl p-4">
                <div className="text-xs text-[#4A5F7A] uppercase tracking-widest mb-4 font-semibold flex items-center gap-1">
                  <span className="w-0.5 h-3 bg-blue-500 rounded"></span>
                  🤖 {t('บอทเทรดอัตโนมัติ','Automated Trading Bot')}
                </div>
                <div className="flex gap-1 bg-[#060D1A] border border-[#1E2E4A] rounded-lg p-1 mb-4">
                  {(['conservative','balanced','aggressive'] as const).map(m => (
                    <button key={m} onClick={() => setBotMode(m)}
                      className={`flex-1 py-1.5 rounded-md text-xs font-bold transition-all ${botMode===m?'bg-[#0F1C30] text-[#E8F0FF] shadow':'text-[#7A8FA6]'}`}>
                      {m === 'conservative' ? t('อนุรักษ์','Conservative') : m === 'balanced' ? t('สมดุล','Balanced') : t('เชิงรุก','Aggressive')}
                    </button>
                  ))}
                </div>
                <div className="bg-[#060D1A] border border-[#1E2E4A] rounded-lg p-3 mb-4">
                  <div className="text-xs text-cyan-400 font-bold uppercase tracking-widest mb-2">{t('กฎการเข้าเทรด','Entry Rules')}</div>
                  {(botMode === 'conservative'
                    ? ['EMA20 > EMA50 > EMA200','RSI: 45–65','Volume > Avg Volume','MACD Bullish Cross']
                    : botMode === 'balanced'
                    ? ['EMA Trend Aligned','Volume Confirmation','Price Action Break']
                    : ['Momentum Breakout','Relative Volume > 3x','ATR Expansion']
                  ).map(r => (
                    <div key={r} className="flex items-center gap-2 py-1.5 border-b border-[#1E2E4A]/40 last:border-0 text-sm">
                      <span className="text-green-400 text-base">✓</span>{r}
                    </div>
                  ))}
                  <div className="mt-2 pt-2 border-t border-[#1E2E4A] flex justify-between text-xs">
                    <span className="text-[#4A5F7A]">{t('ความเสี่ยงต่อเทรด','Risk/trade')}</span>
                    <span className="font-mono text-yellow-400">{botMode==='conservative'?'0.5%':botMode==='balanced'?'1.0%':'2.0%'}</span>
                  </div>
                </div>
                <div className="flex gap-2 mb-3">
                  <button onClick={() => setBotActive(true)}
                    className="flex-1 py-2 rounded-lg text-sm font-bold bg-gradient-to-r from-green-600 to-green-500 text-black hover:opacity-90 transition-all">
                    ▶ {t('เริ่มบอท','Start Bot')}
                  </button>
                  <button onClick={() => setBotActive(false)}
                    className="flex-1 py-2 rounded-lg text-sm font-bold bg-[#060D1A] border border-[#1E2E4A] text-[#7A8FA6] hover:text-white hover:border-[#263850] transition-all">
                    ■ {t('หยุด','Stop')}
                  </button>
                </div>
                {botActive && (
                  <div className="bg-green-500/5 border border-green-500/20 rounded-lg p-3 text-xs text-green-400 font-semibold">
                    ● {t('บอทกำลังทำงาน — สแกนตลาด 24/7 รอสัญญาณเข้า...','Bot running — scanning markets 24/7, waiting for entry signal...')}
                  </div>
                )}
              </div>

              {/* AI Chat */}
              <div className="bg-[#0F1C30] border border-[#1E2E4A] rounded-xl p-4">
                <div className="text-xs text-[#4A5F7A] uppercase tracking-widest mb-3 font-semibold flex items-center gap-1">
                  <span className="w-0.5 h-3 bg-blue-500 rounded"></span>
                  🤖 APEX AI {t('วิเคราะห์','Analysis')}
                </div>
                <div className="h-52 overflow-y-auto mb-3 space-y-2 pr-1">
                  {aiMessages.map((m, i) => (
                    <div key={i} className={`p-3 rounded-xl text-xs whitespace-pre-line leading-relaxed ${m.role==='bot' ? 'bg-[#060D1A] border border-[#1E2E4A] mr-8' : 'bg-blue-500/10 border border-blue-500/20 ml-8 text-right'}`}>
                      <div className={`text-xs font-bold uppercase tracking-widest mb-1 opacity-60 ${m.role==='bot'?'text-cyan-400':'text-blue-400'}`}>{m.role==='bot'?'APEX AI':'YOU'}</div>
                      {m.text}
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 mb-2">
                  <input value={aiInput} onChange={e=>setAiInput(e.target.value)}
                    onKeyDown={e=>e.key==='Enter'&&runAI()}
                    placeholder={t('พิมพ์ NVDA, BTC, EUR/USD...','Type NVDA, BTC, EUR/USD...')}
                    className="flex-1 bg-[#060D1A] border border-[#1E2E4A] text-[#E8F0FF] px-3 py-2 rounded-lg text-xs font-mono focus:border-blue-500 focus:outline-none"/>
                  <button onClick={runAI} className="px-3 py-2 bg-blue-600 rounded-lg text-white hover:bg-blue-500 transition-all text-xs font-bold">→</button>
                </div>
                <div className="flex gap-1 flex-wrap">
                  {['NVDA','BTC','ETH','EURUSD','SOL'].map(s => (
                    <button key={s} onClick={()=>{setAiInput(s);}} className="text-xs px-2 py-1 bg-[#060D1A] border border-[#1E2E4A] rounded text-[#7A8FA6] hover:text-blue-400 hover:border-blue-500 transition-all font-mono">{s}</button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  )
}
function DeployPlaceholder() {
  return (
    <main style={{background:'#060D1A',minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',color:'#E8F0FF',fontFamily:'sans-serif'}}>
      <div style={{textAlign:'center'}}>
        <h1 style={{fontSize:'2rem',fontWeight:'bold',color:'#3D7BFF'}}>⬡ APEX TRADE</h1>
        <p style={{color:'#7A8FA6',marginTop:'8px'}}>Professional Trading Platform</p>
        <p style={{color:'#00E676',marginTop:'16px',fontSize:'0.875rem'}}>✅ Deploy สำเร็จ!</p>
      </div>
    </main>
  )
}
