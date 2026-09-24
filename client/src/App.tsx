import { useState, useRef, useEffect, useMemo } from "react";
import {
  ArrowDownUp, ArrowUpRight, BarChart3, Bell, Check, CheckCircle, ChevronDown, ChevronLeft, ChevronRight, ChevronUp,
  Copy, LayoutDashboard, LineChart, Menu, Plus, Search,
  Send, Settings, Shield, ShieldCheck, Star, Wallet, X, TrendingUp, TrendingDown,
  AlertTriangle, Coins, Users, ArrowDownToLine, ArrowUpToLine, Skull, LogOut, Sliders, Zap, Globe, Lock, ShoppingBag, RotateCcw, ExternalLink,
  Sun, Moon, CreditCard, RefreshCw, Clock, Crown, Flame, Activity, Trophy
} from "lucide-react";
import "./index.css";
import { AdminDashboard } from "./components/admin/AdminDashboard";
import { AdminPortal } from "./components/admin/AdminPortal";
import { JuniorAdminPortal } from "./components/junior-admin/JuniorAdminPortal";
import { LeaderboardView } from "./components/leaderboard/LeaderboardView";
import { marketStore, MarketToken, LiveTrade, OrderBookEntry, UserOrder, generateSparkline } from "./services/marketStore";
import { CandleChart } from "./components/trading/CandleChart";
import { PhantomAuth } from "./components/auth/PhantomAuth";
import { getMe, logout, resendVerification, changePassword, type AuthUser } from "./services/authService";
import { api } from "./services/api";
import { PlatformDepositWallet } from "./types";
import { ThemeProvider, useTheme } from "./services/themeContext";
import { copyToClipboard } from "./services/clipboard";
import { DepositPage } from "./components/modals/DepositPage";
import { BuyPage } from "./components/modals/BuyPage";
import { WithdrawPage } from "./components/modals/WithdrawPage";
import { CountrySelectModal } from "./components/modals/CountrySelectModal";
import { getCountryByCode, CountryInfo, syncDollarRateFromBackend } from "./constants/countries";
import { CountryFlag } from "./components/common/CountryFlag";

type View = "trade" | "wallet" | "swap" | "admin" | "profile" | "leaderboard";
type Modal = "deposit" | "send" | "confirm" | "create" | "buy" | "withdraw" | "";

const COIN_IMGS: Record<string, string> = {
  BTC: "https://coin-images.coingecko.com/coins/images/1/large/bitcoin.png",
  ETH: "https://coin-images.coingecko.com/coins/images/279/large/ethereum.png",
  SOL: "https://coin-images.coingecko.com/coins/images/4128/large/solana.png",
  USDT: "https://coin-images.coingecko.com/coins/images/325/large/Tether.png",
  BNB: "https://coin-images.coingecko.com/coins/images/825/large/bnb-icon2_2x.png",
  XRP: "https://coin-images.coingecko.com/coins/images/44/large/xrp-symbol-white-128.png",
  DOGE: "https://coin-images.coingecko.com/coins/images/5/large/dogecoin.png",
  ADA: "https://coin-images.coingecko.com/coins/images/975/large/cardano.png",
  AVAX: "https://coin-images.coingecko.com/coins/images/12559/large/Avalanche_Circle_RedWhite_Trans.png",
  SUI: "https://coin-images.coingecko.com/coins/images/26375/large/sui-ocean-square.png",
  USDC: "https://coin-images.coingecko.com/coins/images/6319/large/usdc.png",
  BONK: "https://coin-images.coingecko.com/coins/images/28600/large/bonk.jpg",
  WIF: "https://coin-images.coingecko.com/coins/images/33566/large/dogwifhat.jpg",
  POPCAT: "https://coin-images.coingecko.com/coins/images/33890/large/popcat.png",
};

/* ── Utility components ─────────────────────────────────────────── */
import { Sparkline } from "./components/common/Sparkline";
export { Sparkline };

function CoinImg({ sym, n = 28, url }: { sym: string; n?: number; url?: string }) {
  const s = (sym || "").toUpperCase();
  const token = marketStore.getToken(s);
  const tokenImg = (token && token.sym.toUpperCase() === s) ? token.imageUrl : undefined;
  const src = url || COIN_IMGS[s] || tokenImg || `/coins/${s.toLowerCase()}.png`;
  return (
    <span className="coin" style={{ width: n, height: n, borderRadius: "50%", overflow: "hidden", display: "inline-flex", alignItems: "center", justifyContent: "center", background: "#1F222E", flexShrink: 0 }}>
      <img
        src={src}
        alt={sym}
        referrerPolicy="no-referrer"
        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        onError={(e) => {
          const el = e.target as HTMLImageElement;
          el.style.display = "none";
          if (el.parentElement) {
            el.parentElement.innerHTML = `<span style="font-size:${Math.round(n * 0.42)}px;font-weight:800;color:#A78BFA">${sym.slice(0, 3)}</span>`;
          }
        }}
      />
    </span>
  );
}

function Delta({ n, size = 10 }: { n: string; size?: number }) {
  return (
    <span className={n.startsWith("-") ? "down" : "up"} style={{ fontSize: size }}>
      {n}
    </span>
  );
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}



/* ── Token Snapshot — pixel-accurate DexScreener clone ─────────────── */
function TokenSnapshot({ sym, flash }: { sym: string; flash?: (m: string) => void }) {
  const [, setTick] = useState(0);
  useEffect(() => {
    return marketStore.subscribe(() => setTick(t => t + 1));
  }, [sym]);

  const d = marketStore.getToken(sym);
  const [activeTf, setActiveTf] = useState("24H");

  const solStr = d.solPrice ?? (parseFloat(d.price.replace(/[\$,]/g, "")) / 179.84).toFixed(6) + " SOL";

  const periods: { id: string; label: string; val: string; up: boolean; zero?: boolean }[] = [
    { id: "5M", label: "5M", val: d.m5.val, up: d.m5.up, zero: d.m5.zero },
    { id: "1H", label: "1H", val: d.h1.val, up: d.h1.up },
    { id: "6H", label: "6H", val: d.h6.val, up: d.h6.up },
    { id: "24H", label: "24H", val: d.h24.val, up: d.h24.up },
  ];

  const txns = d.txns;
  const buys = d.buys;
  const sells = d.sells;
  const vol = d.vol;
  const buyVol = d.buyVol;
  const sellVol = d.sellVol;
  const traders = d.traders;
  const buyers = d.buyers;
  const sellers = d.sellers;

  const notify = (msg: string) => {
    if (flash) flash(msg);
  };

  return (
    <div className="token-snapshot">

      {/* ── Token logo banner ── */}
      <div className="snap-banner">
        <div
          className="snap-banner-bg"
          style={{ backgroundImage: `url(${d.imageUrl || COIN_IMGS[sym] || `/coins/${sym.toLowerCase()}.png`})` }}
        />
        <div className="snap-banner-vignette" />
        <img
          src={d.imageUrl || COIN_IMGS[sym] || `/coins/${sym.toLowerCase()}.png`}
          alt={sym}
          referrerPolicy="no-referrer"
          className="snap-banner-avatar"
        />
        <div className="snap-banner-label">LAUNCH COINS</div>
      </div>

      {/* ── Header: pair + chain ── */}
      <div className="snap-header">
        <CoinImg sym={sym} n={22} url={d.imageUrl} />
        <div>
          <div className="snap-pair">{sym} / USDT</div>
          <div className="snap-chain">
            <span className={`chain-dot ${d.network === "eth" ? "eth" : "sol"}`} />
            {d.network === "eth" ? "Ethereum" : "Solana"}
            <span style={{ margin: "0 4px", color: "var(--muted)" }}>›</span>
            <span className="chain-dot ray" />
            {d.network === "eth" ? "Uniswap" : "Raydium"}
          </div>
        </div>
      </div>

      {/* ── Links ── */}
      <div className="token-links">
        <button onClick={() => notify(`${sym} website opened`)}><Globe size={10} />Website</button>
        <button onClick={() => notify(`Opening @${sym} on X`)}>𝕏 Twitter</button>
        <button onClick={() => notify(`Joining ${sym} Telegram community`)}>✈ Telegram</button>
        <button style={{ padding: "4px 6px" }} onClick={() => notify(`Viewing ${sym} contract on Solscan`)}><ChevronDown size={12} /></button>
      </div>

      {/* ── DEXSCREENER STATS CARDS ── */}
      <div className="snap-stats-container">

        {/* Row 1: PRICE USD | PRICE (SOL) — 2 Cards with centered text */}
        <div className="snap-cards-row2">
          <div className="snap-card snap-card-center">
            <div className="snap-label">PRICE USD</div>
            <div className="snap-val snap-price-val">{d.price}</div>
          </div>
          <div className="snap-card snap-card-center">
            <div className="snap-label">PRICE</div>
            <div className="snap-val snap-price-val">{solStr}</div>
          </div>
        </div>

        {/* Row 2: LIQUIDITY | FDV | MKT CAP — 3 Cards with Dotted Underlines & Lock Icon */}
        <div className="snap-cards-row3">
          <div className="snap-card snap-card-center">
            <div className="snap-label snap-dotted">LIQUIDITY</div>
            <div className="snap-val-with-icon">
              <span>{d.liq}</span>
              <span className="snap-lock-badge" title="Liquidity Locked">
                <Lock size={10} />
              </span>
            </div>
          </div>
          <div className="snap-card snap-card-center">
            <div className="snap-label snap-dotted">FDV</div>
            <div className="snap-val">{d.fdv}</div>
          </div>
          <div className="snap-card snap-card-center">
            <div className="snap-label snap-dotted">MKT CAP</div>
            <div className="snap-val">{d.cap}</div>
          </div>
        </div>

        {/* Big Card: Timeframes + Flow Metrics (TXNS, VOLUME, TRADERS) */}
        <div className="snap-main-card">

          {/* Timeframe Tabs: 5M, 1H, 6H, 24H */}
          <div className="snap-tf-grid">
            {periods.map(p => {
              const isActive = activeTf === p.id;
              return (
                <div
                  key={p.id}
                  className={`snap-tf-tab${isActive ? " active" : ""}`}
                  onClick={() => setActiveTf(p.id)}
                >
                  <div className="snap-tf-label">{p.label}</div>
                  <div className={`snap-tf-val ${p.zero ? "neutral" : p.up ? "up" : "down"}`}>
                    {p.zero ? "0%" : `${p.up ? "+" : "-"}${p.val.replace(/[+-]/g, "")}`}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Row 1: TXNS | BUYS & SELLS */}
          <div className="snap-flow-row">
            <div className="snap-flow-left">
              <div className="snap-label">TXNS</div>
              <div className="snap-val">{txns.toLocaleString()}</div>
            </div>
            <div className="snap-flow-right">
              <div className="snap-flow-header">
                <span className="snap-label">BUYS</span>
                <span className="snap-label">SELLS</span>
              </div>
              <div className="snap-flow-nums">
                <span className="snap-val">{buys.toLocaleString()}</span>
                <span className="snap-val">{sells.toLocaleString()}</span>
              </div>
              <div className="snap-pill-bar">
                <div className="snap-pill-buy" style={{ flex: Math.max(1, buys) }} />
                <div className="snap-pill-sell" style={{ flex: Math.max(1, sells) }} />
              </div>
            </div>
          </div>

          {/* Row 2: VOLUME | BUY VOL & SELL VOL */}
          <div className="snap-flow-row">
            <div className="snap-flow-left">
              <div className="snap-label">VOLUME</div>
              <div className="snap-val">${vol.toFixed(1)}M</div>
            </div>
            <div className="snap-flow-right">
              <div className="snap-flow-header">
                <span className="snap-label">BUY VOL</span>
                <span className="snap-label">SELL VOL</span>
              </div>
              <div className="snap-flow-nums">
                <span className="snap-val">${buyVol}M</span>
                <span className="snap-val">${sellVol}M</span>
              </div>
              <div className="snap-pill-bar">
                <div className="snap-pill-buy" style={{ flex: Math.max(1, buyVol * 10) }} />
                <div className="snap-pill-sell" style={{ flex: Math.max(1, sellVol * 10) }} />
              </div>
            </div>
          </div>

          {/* Row 3: TRADERS | BUYERS & SELLERS */}
          <div className="snap-flow-row snap-flow-last">
            <div className="snap-flow-left">
              <div className="snap-label snap-dotted">TRADERS</div>
              <div className="snap-val">{traders.toLocaleString()}</div>
            </div>
            <div className="snap-flow-right">
              <div className="snap-flow-header">
                <span className="snap-label">BUYERS</span>
                <span className="snap-label">SELLERS</span>
              </div>
              <div className="snap-flow-nums">
                <span className="snap-val">{buyers.toLocaleString()}</span>
                <span className="snap-val">{sellers.toLocaleString()}</span>
              </div>
              <div className="snap-pill-bar">
                <div className="snap-pill-buy" style={{ flex: Math.max(1, buyers) }} />
                <div className="snap-pill-sell" style={{ flex: Math.max(1, sellers) }} />
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* ── Footer: Watchlist + Alerts + full-width Trade button ── */}
      <div className="snap-footer">
        <div className="snap-footer-top">
          <button className="snap-btn-ghost" onClick={() => notify(`${sym} added to Watchlist`)}><Star size={12} />Watchlist</button>
          <button className="snap-btn-ghost" onClick={() => notify(`Price alert set for ${sym}`)}><Bell size={12} />Alerts</button>
        </div>
        <button className="snap-btn-trade-full" onClick={() => notify(`Focused trading panel on ${sym}`)}>
          <ArrowDownUp size={13} />Trade on {sym}
        </button>
      </div>

    </div>
  );
}

/* ── Live Order Book Component with Depth Bars ──────────────────────── */
function LiveOrderBook({ sym }: { sym: string }) {
  const [ob, setOb] = useState(() => marketStore.getOrderBook(sym));
  const token = marketStore.getToken(sym);

  useEffect(() => {
    const update = () => {
      setOb(marketStore.getOrderBook(sym));
    };
    update();
    const unsub = marketStore.subscribe(update);
    return unsub;
  }, [sym]);

  const totalBidVol = ob.bids.reduce((acc, b) => acc + b.amount, 0);
  const totalAskVol = ob.asks.reduce((acc, a) => acc + a.amount, 0);
  const totalVol = totalBidVol + totalAskVol || 1;
  const buyPct = Math.min(95, Math.max(5, Math.round((totalBidVol / totalVol) * 100)));
  const sellPct = 100 - buyPct;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Real-time Reading Buyers & Sellers Gauge */}
      <div className="ob-pressure-gauge">
        <div className="ob-pressure-meta">
          <span className="ob-buyer-label">
            Buyers {buyPct}%
          </span>
          <span className="ob-seller-label">
            Sellers {sellPct}%
          </span>
        </div>
        <div className="ob-pressure-track">
          <div className="ob-pressure-bar-buy" style={{ width: `${buyPct}%` }} />
          <div className="ob-pressure-bar-sell" style={{ width: `${sellPct}%` }} />
        </div>
      </div>

      <div className="ob-head">
        <span>PRICE (USDC)</span>
        <span>SIZE ({sym})</span>
        <span>TOTAL ($)</span>
      </div>
      <div className="ob-rows">
        {ob.asks.map((a, i) => (
          <div key={`ask-${i}`} className="ob-row ask">
            <div className="ob-depth-bar ask" style={{ width: `${a.depthPct}%` }} />
            <span>{a.price < 0.001 ? a.price.toFixed(8) : a.price < 1 ? a.price.toFixed(4) : a.price.toFixed(2)}</span>
            <span>{a.amount >= 1000 ? a.amount.toLocaleString(undefined, { maximumFractionDigits: 0 }) : a.amount.toFixed(2)}</span>
            <span>${a.total >= 1000 ? a.total.toLocaleString(undefined, { maximumFractionDigits: 0 }) : a.total.toFixed(2)}</span>
          </div>
        ))}
      </div>
      <div className="ob-mid">
        <div className="ob-mid-price">
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: token.pos ? "var(--green)" : "var(--red)", display: "inline-block" }} />
          <span>{token.price}</span>
          <Delta n={token.change} size={9} />
        </div>
        <div className="ob-spread">
          Spread: {ob.spread}
        </div>
      </div>
      <div className="ob-rows">
        {ob.bids.map((b, i) => (
          <div key={`bid-${i}`} className="ob-row bid">
            <div className="ob-depth-bar bid" style={{ width: `${b.depthPct}%` }} />
            <span>{b.price < 0.001 ? b.price.toFixed(8) : b.price < 1 ? b.price.toFixed(4) : b.price.toFixed(2)}</span>
            <span>{b.amount >= 1000 ? b.amount.toLocaleString(undefined, { maximumFractionDigits: 0 }) : b.amount.toFixed(2)}</span>
            <span>${b.total >= 1000 ? b.total.toLocaleString(undefined, { maximumFractionDigits: 0 }) : b.total.toFixed(2)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── DexScreener Recent Trades Component ────────────────────────────── */
function DexRecentTrades({ sym, flash }: { sym: string; flash: (m: string) => void }) {
  const [trades, setTrades] = useState<LiveTrade[]>(() => marketStore.getTrades(sym));

  useEffect(() => {
    const update = () => {
      setTrades([...marketStore.getTrades(sym)]);
    };
    update();
    const unsub = marketStore.subscribe(update);
    return unsub;
  }, [sym]);

  const formatAgo = (ts: number) => {
    const sec = Math.max(0, Math.floor((Date.now() - ts) / 1000));
    if (sec < 5) return "just now";
    if (sec < 60) return `${sec}s ago`;
    const min = Math.floor(sec / 60);
    if (min < 60) return `${min}m ago`;
    const hr = Math.floor(min / 60);
    return `${hr}h ago`;
  };

  const copyTxn = (txHash: string) => {
    copyToClipboard(`https://solscan.io/tx/${txHash}`);
    flash(`Copied Solscan transaction: ${txHash}`);
  };

  return (
    <div className="dex-trades-wrap">
      <table className="dex-table">
        <thead>
          <tr className="dex-th-row">
            <th className="dex-th"><span className="dex-th-content">DATE <span className="dex-filter-icon">▼</span></span></th>
            <th className="dex-th"><span className="dex-th-content">TYPE <span className="dex-filter-icon">▼</span></span></th>
            <th className="dex-th"><span className="dex-th-content">USD <span className="dex-filter-icon">▼</span></span></th>
            <th className="dex-th"><span className="dex-th-content">{sym} <span className="dex-filter-icon">▼</span></span></th>
            <th className="dex-th"><span className="dex-th-content">SOL <span className="dex-filter-icon">▼</span></span></th>
            <th className="dex-th"><span className="dex-th-content">PRICE <span className="dex-filter-icon">💲</span></span></th>
            <th className="dex-th"><span className="dex-th-content">TRADER <span className="dex-filter-icon">▼</span></span></th>
            <th className="dex-th" style={{ textAlign: "center" }}>TXN</th>
          </tr>
        </thead>
        <tbody>
          {trades.slice(0, 30).map((t) => {
            const isBuy = t.type === "Buy";
            const numClass = isBuy ? "dex-num-buy" : "dex-num-sell";
            const typeClass = isBuy ? "dex-type buy" : "dex-type sell";
            return (
              <tr key={t.id} className={`dex-tr${t.isUser ? " user-trade" : ""}`}>
                <td className="dex-td dex-date">{formatAgo(t.timestamp)}</td>
                <td className="dex-td">
                  <span className={typeClass}>
                    {isBuy ? "↑ Buy" : "↓ Sell"}
                  </span>
                </td>
                <td className={`dex-td ${numClass}`}>
                  {t.usd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td className={`dex-td ${numClass}`}>
                  {t.tokenAmt >= 1000
                    ? t.tokenAmt.toLocaleString(undefined, { maximumFractionDigits: 1 })
                    : t.tokenAmt.toFixed(3)}
                </td>
                <td className={`dex-td ${numClass}`}>
                  {t.solAmt.toFixed(4)}
                </td>
                <td className={`dex-td ${numClass}`}>
                  {t.price < 0.001 ? `$${t.price.toFixed(8)}` : t.price < 1 ? `$${t.price.toFixed(4)}` : `$${t.price.toFixed(2)}`}
                </td>
                <td className="dex-td">
                  <div className="dex-trader-wrap">
                    <span>{t.traderEmoji}</span>
                    <span className={`dex-trader-badge${t.isUser ? " is-user" : ""}`}>
                      {t.isUser ? "You (JD...7b2)" : t.trader}
                    </span>
                    <span className="dex-filter-icon">▼</span>
                  </div>
                </td>
                <td className="dex-td" style={{ textAlign: "center" }}>
                  <button className="dex-txn-link" onClick={() => copyTxn(t.txHash)} title="View Solscan Txn">
                    <ArrowUpRight size={12} />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ── User Executed Orders Component ────────────────────────────────── */
function UserOrdersList({ sym, flash }: { sym?: string; flash?: (m: string) => void }) {
  const [, setTick] = useState(0);
  const [subTab, setSubTab] = useState<"open" | "history">("open");

  useEffect(() => {
    return marketStore.subscribe(() => setTick(t => t + 1));
  }, [sym]);

  const orders = marketStore.getUserOrders(sym);
  const pendingOrders = marketStore.getPendingOrders(sym);

  return (
    <div className="dex-orders-container">
      <div className="dex-orders-subtabs">
        <button
          className={`dex-orders-subtab ${subTab === "open" ? "active" : ""}`}
          onClick={() => setSubTab("open")}
        >
          Open Orders {pendingOrders.length > 0 && <span className="tab-count-badge">{pendingOrders.length}</span>}
        </button>
        <button
          className={`dex-orders-subtab ${subTab === "history" ? "active" : ""}`}
          onClick={() => setSubTab("history")}
        >
          Order History {orders.length > 0 && <span className="tab-count-badge">{orders.length}</span>}
        </button>
      </div>

      {subTab === "open" ? (
        pendingOrders.length === 0 ? (
          <div className="orders-empty-state">
            <Coins size={24} color="var(--muted)" style={{ opacity: 0.5, marginBottom: 6 }} />
            <b>No open orders for {sym || "portfolio"}</b>
            <p>Place a Limit or TP/SL order in the order panel on the right to see it pending trigger here.</p>
          </div>
        ) : (
          <div className="dex-trades-wrap" style={{ overflowY: "auto" }}>
            <table className="dex-table">
              <thead>
                <tr className="dex-th-row">
                  <th className="dex-th">TYPE</th>
                  <th className="dex-th">COIN</th>
                  <th className="dex-th">AMOUNT</th>
                  <th className="dex-th">TRIGGER / TARGET</th>
                  <th className="dex-th">CURRENT</th>
                  <th className="dex-th">ACTION</th>
                </tr>
              </thead>
              <tbody>
                {pendingOrders.map(o => {
                  const token = marketStore.getToken(o.sym);
                  const curP = token?.numericPrice || 0;
                  const isLimit = o.type === "Limit";
                  return (
                    <tr key={o.id} className="dex-tr">
                      <td className="dex-td">
                        <span className={`dex-badge ${o.type === "TP/SL" ? "dex-badge-sell" : o.side === "Buy" ? "dex-badge-buy" : "dex-badge-sell"}`}>
                          {o.type === "TP/SL" ? "TP/SL" : `LIMIT ${o.side.toUpperCase()}`}
                        </span>
                      </td>
                      <td className="dex-td">
                        <div style={{ display: "flex", alignItems: "center", gap: 5, fontWeight: 700, color: "var(--text)" }}>
                          <CoinImg sym={o.sym} n={15} />
                          <span>{o.sym}</span>
                        </div>
                      </td>
                      <td className="dex-td" style={{ color: "var(--text)", fontWeight: 700 }}>
                        {isLimit && o.side === "Buy"
                          ? `$${o.amount.toFixed(2)} USD`
                          : `${o.amount >= 1000 ? o.amount.toLocaleString(undefined, { maximumFractionDigits: 1 }) : o.amount.toFixed(4)} ${o.sym}`
                        }
                      </td>
                      <td className="dex-td" style={{ fontFamily: "monospace", fontSize: 11 }}>
                        {isLimit ? (
                          <span style={{ color: "#A78BFA", fontWeight: 700 }}>
                            Target: ${o.targetPrice && (o.targetPrice < 0.001 ? o.targetPrice.toFixed(8) : o.targetPrice < 1 ? o.targetPrice.toFixed(4) : o.targetPrice.toFixed(2))}
                          </span>
                        ) : (
                          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                            {o.tpPrice && <span style={{ color: "var(--green)", fontWeight: 700 }}>TP: ${o.tpPrice < 0.001 ? o.tpPrice.toFixed(8) : o.tpPrice < 1 ? o.tpPrice.toFixed(4) : o.tpPrice.toFixed(2)} (+{o.tpPct}%)</span>}
                            {o.slPrice && <span style={{ color: "var(--red)", fontWeight: 700 }}>SL: ${o.slPrice < 0.001 ? o.slPrice.toFixed(8) : o.slPrice < 1 ? o.slPrice.toFixed(4) : o.slPrice.toFixed(2)} (-{o.slPct}%)</span>}
                          </div>
                        )}
                      </td>
                      <td className="dex-td" style={{ color: "var(--muted)", fontFamily: "monospace", fontSize: 11 }}>
                        ${curP < 0.001 ? curP.toFixed(8) : curP < 1 ? curP.toFixed(4) : curP.toFixed(2)}
                      </td>
                      <td className="dex-td">
                        <button
                          type="button"
                          className="cancel-order-btn"
                          onClick={() => {
                            const res = marketStore.cancelPendingOrder(o.id);
                            if (flash) flash(res.message);
                          }}
                          title="Cancel order and refund escrow to wallet"
                        >
                          Cancel
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      ) : (
        orders.length === 0 ? (
          <div className="orders-empty-state">
            <Coins size={24} color="var(--muted)" style={{ opacity: 0.5, marginBottom: 6 }} />
            <b>No trade history yet for {sym || "portfolio"}</b>
            <p>Executed Market, Limit, and TP/SL orders will appear here.</p>
          </div>
        ) : (
          <div className="dex-trades-wrap" style={{ overflowY: "auto" }}>
            <table className="dex-table">
              <thead>
                <tr className="dex-th-row">
                  <th className="dex-th">SIDE</th>
                  <th className="dex-th">COIN</th>
                  <th className="dex-th">TYPE</th>
                  <th className="dex-th">MONEY</th>
                  <th className="dex-th">AMOUNT</th>
                  <th className="dex-th">PRICE</th>
                  <th className="dex-th">TIME</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => {
                  const isBuy = o.side === "Buy";
                  return (
                    <tr key={o.id} className="dex-tr">
                      <td className="dex-td">
                        <span className={`dex-badge ${isBuy ? "dex-badge-buy" : "dex-badge-sell"}`}>
                          {o.side.toUpperCase()}
                        </span>
                      </td>
                      <td className="dex-td">
                        <div style={{ display: "flex", alignItems: "center", gap: 5, fontWeight: 700, color: "var(--text)" }}>
                          <CoinImg sym={o.sym} n={15} />
                          <span>{o.sym}</span>
                        </div>
                      </td>
                      <td className="dex-td">
                        <span style={{ fontSize: 9.5, fontWeight: 700, color: "#A78BFA", textTransform: "uppercase" }}>
                          {o.orderType || "Market"}
                        </span>
                      </td>
                      <td className="dex-td" style={{ fontWeight: 800, color: isBuy ? "var(--green)" : "var(--red)" }}>
                        ${o.amountUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="dex-td" style={{ color: "var(--text)" }}>
                        {o.tokenAmt >= 1000
                          ? o.tokenAmt.toLocaleString(undefined, { maximumFractionDigits: 1 })
                          : o.tokenAmt.toFixed(o.price < 0.001 ? 0 : 4)
                        } {o.sym}
                      </td>
                      <td className="dex-td" style={{ color: "var(--muted)", fontFamily: "monospace", fontSize: 11 }}>
                        ${o.price < 0.001 ? o.price.toFixed(8) : o.price < 1 ? o.price.toFixed(4) : o.price.toFixed(2)}
                      </td>
                      <td className="dex-td" style={{ color: "var(--muted)", fontSize: 10 }}>
                        {o.dateStr}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  );
}

/* ── TRADE SCREEN ───────────────────────────────────────────────── */
function Trade({ flash }: { flash: (x: string) => void }) {
  const [selectedSym, setSelectedSym] = useState(() => {
    if (typeof localStorage !== "undefined") {
      const saved = localStorage.getItem("axiom_selected_sym");
      if (saved && saved !== "POPCAT" && marketStore.getToken(saved)) return saved;
    }
    return "BTC"; // BTC is the top coin!
  });
  const [side, setSide] = useState<"Buy" | "Sell">("Buy");
  const [orderExpanded, setOrderExpanded] = useState(false); // Collapsible: collapsed by default!
  const [orderType, setOrderType] = useState<"Market" | "Limit" | "TP/SL">("Market");
  const [limitPriceInput, setLimitPriceInput] = useState<string>("");
  const [tpPctInput, setTpPctInput] = useState<number>(25);
  const [slPctInput, setSlPctInput] = useState<number>(10);
  const [timeframe, setTimeframe] = useState("15m");
  const [showCandle, setShowCandle] = useState(false); // All charts start with LINE view, exactly as requested!
  const [quickPct, setQuickPct] = useState<string | null>(null);
  const [amountInput, setAmountInput] = useState("10");
  const [dispMode, setDispMode] = useState<"Price" | "Mcap">("Price");
  const [currMode, setCurrMode] = useState<"USD" | "SOL">("USD");
  const [mobileSubTab, setMobileSubTab] = useState<"trades" | "orderbook" | "order" | "position" | "security">("trades");
  const [showPairModal, setShowPairModal] = useState(false);

  // Board Height state: default 360px on mobile, iPad, and desktop for generous readable chart
  const [chartHeight, setChartHeight] = useState<number>(() => {
    if (typeof localStorage !== "undefined") {
      const saved = localStorage.getItem("axiom_board_height");
      if (saved && saved !== "240") {
        const n = parseInt(saved);
        if (!isNaN(n) && n >= 180 && n <= 700) return n;
      }
    }
    return 360;
  });

  const handleAdjustHeight = (delta: number) => {
    const next = Math.max(180, Math.min(650, chartHeight + delta));
    setChartHeight(next);
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("axiom_board_height", String(next));
    }
    flash(`Board size: ${next}px`);
  };

  const isResizingRef = useRef(false);
  const startYRef = useRef(0);
  const startHRef = useRef(0);

  const handleStartResize = (e: React.MouseEvent) => {
    e.preventDefault();
    isResizingRef.current = true;
    startYRef.current = e.clientY;
    startHRef.current = chartHeight;

    const handleMouseMove = (ev: MouseEvent) => {
      if (!isResizingRef.current) return;
      const delta = ev.clientY - startYRef.current;
      const next = Math.max(180, Math.min(650, startHRef.current + delta));
      setChartHeight(next);
      if (typeof localStorage !== "undefined") {
        localStorage.setItem("axiom_board_height", String(next));
      }
    };

    const handleMouseUp = () => {
      isResizingRef.current = false;
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  const handleStartTouchResize = (e: React.TouchEvent) => {
    if (!e.touches[0]) return;
    isResizingRef.current = true;
    startYRef.current = e.touches[0].clientY;
    startHRef.current = chartHeight;

    const handleTouchMove = (ev: TouchEvent) => {
      if (!isResizingRef.current || !ev.touches[0]) return;
      const delta = ev.touches[0].clientY - startYRef.current;
      const next = Math.max(180, Math.min(650, startHRef.current + delta));
      setChartHeight(next);
      if (typeof localStorage !== "undefined") {
        localStorage.setItem("axiom_board_height", String(next));
      }
    };

    const handleTouchEnd = () => {
      isResizingRef.current = false;
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    };

    window.addEventListener("touchmove", handleTouchMove, { passive: true });
    window.addEventListener("touchend", handleTouchEnd);
  };

  // Markets Tab & Favorites & Search state
  const [marketTab, setMarketTab] = useState<"Favs" | "All" | "New">(() => {
    if (typeof localStorage !== "undefined") {
      const saved = localStorage.getItem("axiom_market_tab");
      if (saved === "Favs" || saved === "All" || saved === "New") return saved;
    }
    return "All";
  });
  const [favorites, setFavorites] = useState<string[]>(() => {
    if (typeof localStorage !== "undefined") {
      const saved = localStorage.getItem("axiom_fav_tokens");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        } catch { }
      }
    }
    return ["BTC", "ETH", "SOL", "BNB"];
  });
  const [marketSearch, setMarketSearch] = useState("");
  const [showMarketSearch, setShowMarketSearch] = useState(false);

  // Below-chart tab: "trades" vs "myOrders"
  const [belowChartTab, setBelowChartTab] = useState<"trades" | "myOrders">("trades");

  const toggleFavorite = (sym: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setFavorites(prev => {
      const next = prev.includes(sym) ? prev.filter(s => s !== sym) : [...prev, sym];
      if (typeof localStorage !== "undefined") {
        localStorage.setItem("axiom_fav_tokens", JSON.stringify(next));
      }
      flash(next.includes(sym) ? `⭐ Added ${sym} to favorites` : `Removed ${sym} from favorites`);
      return next;
    });
  };

  const [, setTick] = useState(0);
  useEffect(() => {
    return marketStore.subscribe(() => {
      if (marketStore.lastOrderAlert) {
        flash(marketStore.lastOrderAlert);
        marketStore.lastOrderAlert = null;
      }
      if (marketStore.activeSym && marketStore.activeSym !== selectedSym && marketStore.getToken(marketStore.activeSym)) {
        setSelectedSym(marketStore.activeSym);
      }
      setTick(t => t + 1);
    });
  }, [flash, selectedSym]);

  const tokens = marketStore.tokens;
  const m = marketStore.getToken(selectedSym) || marketStore.getToken("BTC");
  const timeframes = ["1s", "1m", "5m", "15m", "1h", "4h", "D"];

  useEffect(() => {
    if (m && m.numericPrice) {
      setLimitPriceInput(m.numericPrice < 0.001 ? m.numericPrice.toFixed(8) : m.numericPrice < 1 ? m.numericPrice.toFixed(4) : m.numericPrice.toFixed(2));
    }
  }, [m.sym, m.numericPrice, orderType]);

  const filteredTokens = useMemo(() => {
    let list = tokens;
    const rawSearch = marketSearch.trim();
    if (rawSearch) {
      const q = rawSearch.toLowerCase().replace(/^\$/, "");
      return tokens.filter(t =>
        (t.sym && t.sym.toLowerCase().includes(q)) ||
        (t.name && t.name.toLowerCase().includes(q)) ||
        (t.poolAddress && t.poolAddress.toLowerCase().includes(q)) ||
        (t.contractAddress && t.contractAddress.toLowerCase().includes(q))
      );
    }

    if (marketTab === "Favs") {
      list = tokens.filter(t => favorites.includes(t.sym));
    } else if (marketTab === "New") {
      const memeOrNew = ["POPCAT", "BONK", "WIF", "PEPE", "TRUMP", "DOGE"];
      list = tokens.filter(t => t.isNew || memeOrNew.includes(t.sym) || !["BTC", "ETH", "SOL", "BNB", "XRP", "ADA", "AVAX", "SUI"].includes(t.sym));
      // Put newly deployed coins at the top of the New tab
      list = list.slice().sort((a, b) => {
        if (a.isNew && !b.isNew) return -1;
        if (!a.isNew && b.isNew) return 1;
        return (b.createdAt || 0) - (a.createdAt || 0);
      });
    }
    return list;
  }, [tokens, marketTab, favorites, marketSearch]);

  const selectCoin = (sym: string) => {
    setSelectedSym(sym);
    marketStore.setActiveSym(sym);
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("axiom_selected_sym", sym);
    }
    setQuickPct(null);
    setShowPairModal(false);
  };

  // Real user balances (support both USDT and USDC)
  const balances = marketStore.getBalances();
  const availableUsdt = balances["USDT"]?.bal || 0;
  const availableUsdc = balances["USDC"]?.bal || 0;
  const availableCash = availableUsdt + availableUsdc;
  const availableToken = balances[m.sym]?.bal || 0;

  const handleQuickPct = (v: string) => {
    setQuickPct(v);
    const pct = v === "MAX" ? 100 : parseInt(v);
    if (side === "Buy") {
      const val = (availableCash * (pct / 100)).toFixed(2);
      setAmountInput(val);
    } else {
      const val = (availableToken * (pct / 100)).toFixed(m.numericPrice < 0.001 ? 0 : 2);
      setAmountInput(val);
    }
  };

  const handlePlaceOrder = () => {
    if (m.is_rugged) {
      flash(`⚠️ Cannot trade $${m.sym}: Token has been RUGPULLED and liquidity is zero.`);
      return;
    }
    const numAmt = parseFloat(amountInput);
    if (isNaN(numAmt) || numAmt <= 0) {
      flash("Enter a valid amount greater than 0");
      return;
    }

    if (orderType === "Limit") {
      const targetP = parseFloat(limitPriceInput);
      if (isNaN(targetP) || targetP <= 0) {
        flash("Enter a valid Limit Target Price");
        return;
      }
      const res = marketStore.placeLimitOrder({
        sym: m.sym,
        side,
        amount: numAmt,
        targetPrice: targetP,
      });
      flash(res.message);
      if (res.success) {
        setOrderExpanded(false);
        setBelowChartTab("myOrders");
      }
      return;
    }

    if (orderType === "TP/SL") {
      if (availableToken <= 0.000001) {
        flash(`You don't own any ${m.sym} yet! Buy some ${m.sym} first to arm Take Profit / Stop Loss.`);
        return;
      }
      const tpTarget = m.numericPrice * (1 + tpPctInput / 100);
      const slTarget = m.numericPrice * (1 - slPctInput / 100);
      const res = marketStore.placeTpSlOrder({
        sym: m.sym,
        amountTokens: numAmt,
        tpPrice: tpTarget,
        slPrice: slTarget,
        tpPct: tpPctInput,
        slPct: slPctInput,
      });
      flash(res.message);
      if (res.success) {
        setOrderExpanded(false);
        setBelowChartTab("myOrders");
      }
      return;
    }

    const res = marketStore.placeOrder({
      sym: m.sym,
      side,
      amount: numAmt,
    });
    flash(res.message);
  };

  // Live dynamic calculation for "You receive"
  const numAmt = parseFloat(amountInput) || 0;
  const limitTargetP = parseFloat(limitPriceInput) || m.numericPrice;
  const youReceiveStr = orderType === "Limit"
    ? side === "Buy"
      ? limitTargetP > 0 ? (numAmt / limitTargetP).toLocaleString(undefined, { maximumFractionDigits: limitTargetP < 0.001 ? 0 : 3 }) : "0"
      : `$${(numAmt * limitTargetP).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : orderType === "TP/SL"
      ? `$${(numAmt * (m.numericPrice * (1 + tpPctInput / 100))).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (at TP)`
      : side === "Buy"
        ? m.numericPrice > 0 ? (numAmt / m.numericPrice).toLocaleString(undefined, { maximumFractionDigits: m.numericPrice < 0.001 ? 0 : 3 }) : "0"
        : `$${(numAmt * m.numericPrice).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  // Candle data for OHLCV readout
  const candles = marketStore.getCandles(m.sym, timeframe);
  const lastCandle = candles[candles.length - 1] || { open: m.numericPrice, high: m.numericPrice, low: m.numericPrice, close: m.numericPrice };

  const isMcap = dispMode === "Mcap";
  const isSol = currMode === "SOL";
  const mult = isMcap ? (m.supply || 1_000_000_000) : (isSol ? (1 / 179.84) : 1);
  const fmtDisp = (p: number) => {
    const v = p * mult;
    if (isMcap) {
      if (v >= 1e9) return `$${(v / 1e9).toFixed(2)}B`;
      if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
      if (v >= 1e3) return `$${(v / 1e3).toFixed(0)}K`;
      return `$${v.toFixed(0)}`;
    }
    if (isSol) return `${v.toFixed(5)} SOL`;
    return v >= 1 ? `$${v.toFixed(2)}` : v < 0.0001 ? `$${v.toFixed(8)}` : `$${v.toFixed(4)}`;
  };

  // Dynamic time axis based on timeframe
  const getAxisLabels = () => {
    switch (timeframe) {
      case "1s": return ["30s ago", "20s ago", "15s ago", "10s ago", "5s ago", "Now (1s)"];
      case "1m": return ["25m ago", "20m ago", "15m ago", "10m ago", "5m ago", "Now (1m)"];
      case "5m": return ["2h ago", "90m ago", "60m ago", "30m ago", "15m ago", "Now"];
      case "15m": return ["6h ago", "4h ago", "3h ago", "2h ago", "1h ago", "Now"];
      case "1h": return ["12h ago", "9h ago", "6h ago", "3h ago", "1h ago", "Now"];
      case "4h": return ["2d ago", "36h ago", "24h ago", "12h ago", "4h ago", "Now"];
      case "D": return ["14d ago", "10d ago", "7d ago", "3d ago", "Yesterday", "Today"];
      default: return ["09:00", "11:00", "13:00", "15:00", "17:00", "Now"];
    }
  };

  return (
    <div className="trade-screen">
      {/* ── MOBILE ONLY: DEXSCREENER TOP TRENDING WATCHLIST TICKER ── */}
      <div className="dex-mobile-watchlist">
        <div className="dex-watchlist-scroll">
          <button
            type="button"
            className="dex-watch-chip-search"
            onClick={() => setShowPairModal(true)}
            title="Search all markets"
          >
            <Search size={12} />
            <span>Markets</span>
          </button>
          {tokens.slice(0, 10).map((t) => {
            const isPicked = t.sym === selectedSym;
            const isUp = t.changeNum >= 0;
            return (
              <button
                key={t.sym}
                type="button"
                className={`dex-watch-chip ${isPicked ? "picked" : ""}`}
                onClick={() => selectCoin(t.sym)}
              >
                <CoinImg sym={t.sym} n={16} url={t.imageUrl} />
                <span className="dex-chip-sym">{t.sym}</span>
                <span className="dex-chip-price">{t.price}</span>
                <span className={`dex-chip-delta ${isUp ? "up" : "down"}`}>
                  {t.change}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ─ Left rail ─ */}
      <aside className="market-rail">
        <div className="rail-head">
          <b>Markets</b>
          <button onClick={() => setShowMarketSearch(!showMarketSearch)} title="Search markets">
            <Search size={14} color={showMarketSearch ? "var(--violet)" : "var(--muted)"} />
          </button>
        </div>

        {showMarketSearch && (
          <div className="rail-search-box">
            <Search size={12} color="var(--muted)" />
            <input
              autoFocus
              placeholder="Search coin, symbol, or contract..."
              value={marketSearch}
              onChange={e => setMarketSearch(e.target.value)}
            />
            {marketSearch && (
              <button onClick={() => setMarketSearch("")} style={{ background: "transparent", border: "none", color: "var(--muted)", cursor: "pointer", padding: 0 }}>
                <X size={12} />
              </button>
            )}
          </div>
        )}

        <div className="market-tabs">
          <button
            className={marketTab === "Favs" ? "active" : ""}
            onClick={() => {
              setMarketTab("Favs");
              localStorage.setItem("axiom_market_tab", "Favs");
              flash("Showing favorite tokens");
            }}
          >
            Favs {favorites.length > 0 && `(${favorites.length})`}
          </button>
          <button
            className={marketTab === "All" ? "active" : ""}
            onClick={() => {
              setMarketTab("All");
              localStorage.setItem("axiom_market_tab", "All");
              flash("Showing all verified markets");
            }}
          >
            All
          </button>
          <button
            className={marketTab === "New" ? "active" : ""}
            onClick={() => {
              setMarketTab("New");
              localStorage.setItem("axiom_market_tab", "New");
              flash("Showing new & trending meme tokens");
            }}
          >
            New
          </button>
        </div>

        <div className="market-label"><span>ASSET</span><span>LAST / 24H</span></div>

        <div className="market-rows-list" style={{ flex: 1, overflowY: "auto" }}>
          {filteredTokens.length === 0 ? (
            <div style={{ padding: "24px 14px", textAlign: "center", color: "var(--muted)", fontSize: 11 }}>
              {marketTab === "Favs"
                ? "No favorites yet. Click the star ⭐ next to any coin to add it to your Favs!"
                : "No matching tokens found."}
            </div>
          ) : (
            filteredTokens.map((x) => (
              <div
                key={x.sym}
                className={`market-row${x.sym === selectedSym ? " picked" : ""}`}
                onClick={() => selectCoin(x.sym)}
                style={{ cursor: "pointer" }}
              >
                <button
                  className={`star-btn-icon ${favorites.includes(x.sym) ? "starred" : ""}`}
                  onClick={(e) => toggleFavorite(x.sym, e)}
                  title={favorites.includes(x.sym) ? "Remove from Favorites" : "Add to Favorites"}
                >
                  <Star
                    size={11}
                    fill={favorites.includes(x.sym) ? "#EAB308" : "none"}
                    color={favorites.includes(x.sym) ? "#EAB308" : "#555468"}
                  />
                </button>
                <CoinImg sym={x.sym} n={22} url={x.imageUrl} />
                <span>
                  <b style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                    {x.sym}
                    {x.isNew && <span style={{ fontSize: 8, padding: "1px 4px", borderRadius: 3, background: "rgba(16,185,129,0.2)", color: "#10B981", fontWeight: 800 }}>NEW</span>}
                  </b>
                  <small>{x.name}</small>
                </span>
                <i><b>{x.price}</b><Delta n={x.change} size={9} /></i>
              </div>
            ))
          )}
        </div>

        <button className="all-markets" onClick={() => { setMarketTab("All"); flash("Showing all verified markets"); }}>
          Browse all <ChevronRight size={12} />
        </button>
      </aside>

      {/* ─ Chart + order book ─ */}
      <section className="trade-main">
        {/* ── MOBILE ONLY: DEXSCREENER PAIR HERO BAR ── */}
        <div className="dex-mobile-pair-hero">
          <div className="dex-hero-top">
            <div className="dex-hero-token-identity" onClick={() => setShowPairModal(true)}>
              <CoinImg sym={m.sym} n={32} url={m.imageUrl} />
              <div className="dex-hero-name-wrap">
                <div className="dex-hero-pair-title">
                  <b>{m.sym} / USDT</b>
                  <span className="dex-chain-pill">{m.network === "eth" ? "ETH" : "SOL"}</span>
                  {m.is_rugged && <span className="dex-rugged-badge">DUMPED</span>}
                  <ChevronDown size={13} className="dex-switch-chevron" />
                </div>
                <div className="dex-hero-name-sub">
                  <span>{m.name}</span>
                  {marketStore.isTokenVerified(m.sym) && (
                    <>
                      <span className="dex-dot-sep">·</span>
                      <span className="dex-verified-tag">✓ Verified</span>
                    </>
                  )}
                </div>
              </div>
            </div>
            <div className="dex-hero-actions">
              <button
                type="button"
                className={`dex-star-btn ${favorites.includes(m.sym) ? "starred" : ""}`}
                onClick={() => toggleFavorite(m.sym)}
                title="Add to Favorites"
              >
                <Star
                  size={14}
                  fill={favorites.includes(m.sym) ? "#EAB308" : "none"}
                  color={favorites.includes(m.sym) ? "#EAB308" : "var(--muted)"}
                />
              </button>
              <button
                type="button"
                className="dex-action-icon-btn"
                onClick={() => {
                  const targetToCopy = m.contractAddress || m.poolAddress || m.sym;
                  copyToClipboard(targetToCopy);
                  flash(m.contractAddress ? "Token contract copied!" : `Copied ${m.sym} Pool identifier!`);
                }}
                title="Copy token address"
              >
                <Copy size={13} />
              </button>
            </div>
          </div>

          {/* Hero Price + 24h delta */}
          <div className="dex-hero-price-row">
            <div className="dex-hero-price-wrap">
              <span className="dex-hero-price">{currMode === "USD" ? m.price : m.solPrice}</span>
              <span className="dex-live-pulse" />
            </div>
            <div className={`dex-hero-delta-badge ${m.changeNum >= 0 ? "up" : "down"}`}>
              {m.changeNum >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
              <span>{m.change}</span>
            </div>
          </div>

          {/* DexScreener 4-Timeframe Performance Bar (5M, 1H, 6H, 24H) */}
          <div className="dex-timeframe-strip">
            <div className={`dex-tf-chip ${m.m5.up ? "up" : "down"}`}>
              <span className="dex-tf-lbl">5M</span>
              <span className="dex-tf-val">{m.m5.val}</span>
            </div>
            <div className={`dex-tf-chip ${m.h1.up ? "up" : "down"}`}>
              <span className="dex-tf-lbl">1H</span>
              <span className="dex-tf-val">{m.h1.val}</span>
            </div>
            <div className={`dex-tf-chip ${m.h6.up ? "up" : "down"}`}>
              <span className="dex-tf-lbl">6H</span>
              <span className="dex-tf-val">{m.h6.val}</span>
            </div>
            <div className={`dex-tf-chip ${m.h24.up ? "up" : "down"}`}>
              <span className="dex-tf-lbl">24H</span>
              <span className="dex-tf-val">{m.h24.val}</span>
            </div>
          </div>

          {/* DexScreener High-Density Metrics Bar */}
          <div className="dex-metrics-scroll-track">
            <div className="dex-metric-card">
              <span className="dex-metric-label">LIQUIDITY</span>
              <span className="dex-metric-val">{m.liq || "$28.4M"}</span>
            </div>
            <div className="dex-metric-card">
              <span className="dex-metric-label">FDV</span>
              <span className="dex-metric-val">{m.fdv || m.cap}</span>
            </div>
            <div className="dex-metric-card">
              <span className="dex-metric-label">MKT CAP</span>
              <span className="dex-metric-val">{m.cap}</span>
            </div>
            <div className="dex-metric-card">
              <span className="dex-metric-label">24H VOL</span>
              <span className="dex-metric-val">${m.vol.toFixed(1)}M</span>
            </div>
            <div className="dex-metric-card">
              <span className="dex-metric-label">BUYS / SELLS</span>
              <span className="dex-metric-val text-green">{m.buys} / {m.sells}</span>
            </div>
          </div>
        </div>

        {/* Pair bar */}
        <div className="pairbar">
          <span>
            <CoinImg sym={m.sym} n={30} url={m.imageUrl} />
            <i>
              <b style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                {m.sym} / USDT
                {marketStore.isTokenVerified(m.sym) && (
                  <span className="dex-verified-tag-sm">✓ Verified</span>
                )}
                {m.is_rugged && (
                  <span style={{ fontSize: 9, padding: "1px 6px", borderRadius: 4, background: "rgba(239,68,68,0.25)", color: "#EF4444", fontWeight: 800, border: "1px solid rgba(239,68,68,0.5)" }}>
                    ⚠️ LOW LIQUIDITY
                  </span>
                )}
              </b>
              <small style={{ display: "inline-flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                <span>{m.name} · {m.network === "eth" ? "Ethereum" : "Solana"}</span>
                {(m.contractAddress || m.poolAddress) && (
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      const target = m.contractAddress || m.poolAddress || '';
                      copyToClipboard(target);
                      flash("Token contract copied!");
                    }}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      background: "rgba(255,255,255,0.06)",
                      border: "1px solid var(--border)",
                      borderRadius: 4,
                      padding: "1px 6px",
                      fontSize: 9.5,
                      fontFamily: "monospace",
                      color: "var(--muted)",
                      cursor: "pointer",
                    }}
                    title={`Click to copy contract address: ${m.contractAddress || m.poolAddress}`}
                  >
                    <span>{(m.contractAddress || m.poolAddress || '').slice(0, 4)}...{(m.contractAddress || m.poolAddress || '').slice(-4)}</span>
                    <Copy size={9} />
                  </span>
                )}
              </small>
            </i>
            <button
              onClick={() => toggleFavorite(m.sym)}
              title={favorites.includes(m.sym) ? "Remove from Favorites" : "Add to Favorites"}
              style={{ background: "transparent", border: "none", cursor: "pointer", display: "flex", alignItems: "center" }}
            >
              <Star
                size={14}
                fill={favorites.includes(m.sym) ? "#EAB308" : "none"}
                color={favorites.includes(m.sym) ? "#EAB308" : "var(--muted)"}
              />
            </button>
          </span>
          <div className="pair-stat">
            <span>Last price<b>{currMode === "USD" ? m.price : m.solPrice}</b></span>
            <span>24h change<Delta n={m.change} size={10} /></span>
            <span>24h vol<b>${m.vol.toFixed(1)}M</b></span>
            <span>Market cap<b>{m.cap}</b></span>
          </div>
        </div>

        {/* Chart controls */}
        <div className="chart-control">
          <div>
            {timeframes.map(tf => (
              <button
                key={tf}
                className={timeframe === tf ? "on" : ""}
                onClick={() => {
                  setTimeframe(tf);
                  marketStore.setTimeframe(tf);
                  flash(`Chart timeframe switched to ${tf}`);
                }}
              >
                {tf}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {/* Price vs Mcap toggle */}
            <div className="chart-btn-seg">
              <button className={dispMode === "Price" ? "on" : ""} onClick={() => { setDispMode("Price"); flash("Display mode: Raw Price"); }}>Price</button>
              <button className={dispMode === "Mcap" ? "on" : ""} onClick={() => { setDispMode("Mcap"); flash("Display mode: Market Cap"); }}>Mcap</button>
            </div>
            {/* Currency toggle */}
            <div className="chart-btn-seg">
              <button className={currMode === "USD" ? "on" : ""} onClick={() => setCurrMode("USD")}>USD</button>
              <button className={currMode === "SOL" ? "on" : ""} onClick={() => setCurrMode("SOL")}>SOL</button>
            </div>
            {/* Line vs Candles toggle */}
            <div className="chart-btn-seg">
              <button className={!showCandle ? "on" : ""} onClick={() => { setShowCandle(false); flash("Switched to Line chart"); }} title="Line Chart">
                <LineChart size={12} style={{ marginRight: 3, verticalAlign: "middle" }} />Line
              </button>
              <button className={showCandle ? "on" : ""} onClick={() => { setShowCandle(true); flash("Switched to Candlestick chart"); }} title="Candlestick Chart">
                <BarChart3 size={12} style={{ marginRight: 3, verticalAlign: "middle" }} />Candles
              </button>
            </div>
            {/* Board Size Presets */}
            <div className="chart-btn-seg" title="Adjust Board Height">
              <button
                className={chartHeight <= 280 ? "on" : ""}
                onClick={() => {
                  setChartHeight(240);
                  localStorage.setItem("axiom_board_height", "240");
                  flash("Board size: Small (240px)");
                }}
              >
                Small
              </button>
              <button
                className={chartHeight > 280 && chartHeight <= 400 ? "on" : ""}
                onClick={() => {
                  setChartHeight(360);
                  localStorage.setItem("axiom_board_height", "360");
                  flash("Board size: Medium (360px)");
                }}
              >
                Med
              </button>
              <button
                className={chartHeight > 400 ? "on" : ""}
                onClick={() => {
                  setChartHeight(480);
                  localStorage.setItem("axiom_board_height", "480");
                  flash("Board size: Tall (480px)");
                }}
              >
                Tall
              </button>
            </div>
          </div>
        </div>

        {/* Chart stage */}
        <div
          className="chart-stage"
          style={{ height: chartHeight }}
        >
          <CandleChart
            sym={m.sym}
            timeframe={timeframe}
            dispMode={dispMode}
            currMode={currMode}
            showCandle={showCandle}
            chartHeight={chartHeight}
            onAdjustHeight={handleAdjustHeight}
          />
        </div>

        {/* Bottom border arrow controls to reduce & increase chart board */}
        <div
          className="chart-bottom-resizer"
          onMouseDown={handleStartResize}
          onTouchStart={handleStartTouchResize}
          title="Drag up to reduce board height, drag down to increase"
        >
          <div className="chart-bottom-arrows-wrap" onMouseDown={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="chart-arrow-toggle-btn"
              onClick={() => {
                const newH = Math.max(180, chartHeight - 50);
                setChartHeight(newH);
                localStorage.setItem("axiom_board_height", String(newH));
                flash(`Reduced chart to ${newH}px`);
              }}
              title="Reduce chart height (▲ Up arrow)"
            >
              <ChevronUp size={14} />
              <span>Reduce</span>
            </button>

            <button
              type="button"
              className="chart-arrow-height-indicator"
              onClick={() => {
                const newH = chartHeight >= 360 ? 240 : 420;
                setChartHeight(newH);
                localStorage.setItem("axiom_board_height", String(newH));
                flash(newH === 240 ? "Chart reduced to compact (240px)" : "Chart increased to tall (420px)");
              }}
              title="Click arrow to toggle between compact and expanded chart"
            >
              {chartHeight >= 360 ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              <span>{chartHeight}px</span>
            </button>

            <button
              type="button"
              className="chart-arrow-toggle-btn"
              onClick={() => {
                const newH = Math.min(650, chartHeight + 50);
                setChartHeight(newH);
                localStorage.setItem("axiom_board_height", String(newH));
                flash(`Increased chart to ${newH}px`);
              }}
              title="Increase chart height (▼ Down arrow)"
            >
              <ChevronDown size={14} />
              <span>Increase</span>
            </button>
          </div>
          <span className="resize-handle-bar" />
        </div>

        {/* Order book + DexScreener recent trades / My Orders */}
        <div className="below-chart">
          <section>
            <div className="section-header">
              <b>Order book</b>
              <small className="live-indicator">
                <span className="live-indicator-dot" />
                Live
              </small>
            </div>
            <LiveOrderBook sym={m.sym} />
          </section>

          <section>
            <div className="section-header">
              <div className="section-tabs-wrap">
                <button
                  className={`sec-tab-btn ${belowChartTab === "trades" ? "active" : ""}`}
                  onClick={() => setBelowChartTab("trades")}
                >
                  Recent trades
                </button>
                <button
                  className={`sec-tab-btn ${belowChartTab === "myOrders" ? "active" : ""}`}
                  onClick={() => setBelowChartTab("myOrders")}
                >
                  My Orders {(marketStore.getUserOrders(m.sym).length + marketStore.getPendingOrders(m.sym).length) > 0 && (
                    <span className="tab-count-badge">{marketStore.getUserOrders(m.sym).length + marketStore.getPendingOrders(m.sym).length}</span>
                  )}
                </button>
              </div>
              <small className="live-indicator">
                <span className="live-indicator-dot" />
                {belowChartTab === "trades" ? "Stream" : "History"}
              </small>
            </div>
            {belowChartTab === "trades" ? (
              <DexRecentTrades sym={m.sym} flash={flash} />
            ) : (
              <UserOrdersList sym={m.sym} flash={flash} />
            )}
          </section>
        </div>

        {/* ── MOBILE ONLY: DEXSCREENER SUB-TABS (Trades, OrderBook, Trade, Position, Security) ── */}
        <div className="dex-mobile-subtabs-wrap">
          <div className="dex-mobile-subtabs">
            <button
              type="button"
              className={`dex-subtab-btn ${mobileSubTab === "trades" ? "active" : ""}`}
              onClick={() => setMobileSubTab("trades")}
            >
              <Clock size={13} />
              <span>Txns</span>
            </button>
            <button
              type="button"
              className={`dex-subtab-btn ${mobileSubTab === "orderbook" ? "active" : ""}`}
              onClick={() => setMobileSubTab("orderbook")}
            >
              <BarChart3 size={13} />
              <span>Order Book</span>
            </button>
            <button
              type="button"
              className={`dex-subtab-btn ${mobileSubTab === "order" ? "active" : ""}`}
              onClick={() => setMobileSubTab("order")}
            >
              <ArrowDownUp size={13} />
              <span>Trade</span>
            </button>
            <button
              type="button"
              className={`dex-subtab-btn ${mobileSubTab === "position" ? "active" : ""}`}
              onClick={() => setMobileSubTab("position")}
            >
              <Coins size={13} />
              <span>Position</span>
              {marketStore.getUserPosition(m.sym).hasPosition && (
                <span className="dex-subtab-indicator-dot" />
              )}
            </button>
            <button
              type="button"
              className={`dex-subtab-btn ${mobileSubTab === "security" ? "active" : ""}`}
              onClick={() => setMobileSubTab("security")}
            >
              <ShieldCheck size={13} />
              <span>Security</span>
            </button>
          </div>

          <div className="dex-mobile-tab-content">
            {mobileSubTab === "trades" && (
              <div className="dex-mobile-tab-pane">
                <div className="dex-tab-header">
                  <span className="dex-tab-title">Live DEX Transactions</span>
                  <span className="live-indicator"><span className="live-indicator-dot" /> Streaming</span>
                </div>
                <DexRecentTrades sym={m.sym} flash={flash} />
              </div>
            )}
            {mobileSubTab === "orderbook" && (
              <div className="dex-mobile-tab-pane">
                <div className="dex-tab-header">
                  <span className="dex-tab-title">Market Order Book (L2 Depth)</span>
                  <span className="live-indicator"><span className="live-indicator-dot" /> Realtime</span>
                </div>
                <LiveOrderBook sym={m.sym} />
              </div>
            )}
            {mobileSubTab === "order" && (
              <div className="dex-mobile-tab-pane">
                <div className="order-panel-container mobile-embedded">
                  <div className="side-tabs">
                    <button
                      type="button"
                      className={`buy ${side === "Buy" ? "active" : ""}`}
                      onClick={() => setSide("Buy")}
                    >
                      Buy {m.sym}
                    </button>
                    <button
                      type="button"
                      className={`sell ${side === "Sell" ? "active" : ""}`}
                      onClick={() => setSide("Sell")}
                    >
                      Sell {m.sym}
                    </button>
                  </div>

                  <div className="order-form-inner" style={{ padding: "12px 14px" }}>
                    <div className="order-form-top-row">
                      <div className="order-type">
                        {(["Market", "Limit", "TP/SL"] as const).map(t => (
                          <button
                            key={t}
                            type="button"
                            className={orderType === t ? "active" : ""}
                            onClick={() => {
                              setOrderType(t);
                              if (t === "TP/SL") {
                                if (availableToken > 0) {
                                  setAmountInput(availableToken >= 1000 ? availableToken.toFixed(0) : availableToken.toFixed(m.numericPrice < 0.001 ? 0 : 2));
                                }
                              }
                            }}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                      <span className="order-rate">1 {m.sym} = <b>${m.numericPrice < 0.001 ? m.numericPrice.toFixed(8) : m.numericPrice < 1 ? m.numericPrice.toFixed(4) : m.numericPrice.toFixed(2)}</b></span>
                    </div>

                    <label>
                      {side === "Buy" ? "Amount (USD)" : `Amount (${m.sym})`}
                      <small>
                        {side === "Buy"
                          ? `Available: $${availableCash.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                          : `Available: ${availableToken.toLocaleString(undefined, { maximumFractionDigits: m.numericPrice < 0.001 ? 0 : 2 })} ${m.sym}`}
                      </small>
                    </label>
                    <div className="order-input">
                      <input
                        type="number"
                        min="0"
                        step="any"
                        placeholder="0.00"
                        value={amountInput}
                        onChange={e => { setAmountInput(e.target.value); setQuickPct(null); }}
                      />
                      <span>{side === "Buy" ? "USD" : m.sym}</span>
                    </div>
                    <div className="quick-size">
                      {["25%", "50%", "75%", "MAX"].map(v => (
                        <button key={v} type="button" className={quickPct === v ? "active" : ""} onClick={() => handleQuickPct(v)}>{v}</button>
                      ))}
                    </div>

                    <label>Estimated Receive</label>
                    <div className="receive-input">
                      <b>{youReceiveStr}</b>
                      <span><CoinImg sym={side === "Buy" ? m.sym : "USDT"} n={16} />{side === "Buy" ? m.sym : "USDT"}</span>
                    </div>

                    <button
                      type="button"
                      className={`btn-primary${side === "Buy" ? " green" : " red"}`}
                      style={{ width: "100%", opacity: m.is_rugged ? 0.5 : 1, cursor: m.is_rugged ? "not-allowed" : "pointer", marginTop: 12, padding: 13, fontSize: 14 }}
                      onClick={handlePlaceOrder}
                      disabled={m.is_rugged}
                    >
                      <Zap size={15} />Instant {side} {m.sym}
                    </button>
                  </div>
                </div>
              </div>
            )}
            {mobileSubTab === "position" && (
              <div className="dex-mobile-tab-pane">
                {(() => {
                  const pos = marketStore.getUserPosition(m.sym);
                  const isPumping = pos.pnlPct > 0.4;
                  const isDipping = pos.pnlPct < -0.4;
                  return (
                    <div className={`user-position-card ${isPumping ? "pumping-card" : ""}`} style={{ margin: 0 }}>
                      <div className="user-pos-header">
                        <div className="user-pos-title-wrap">
                          <Coins size={14} color="var(--violet)" />
                          <b>Your {m.sym} Position</b>
                        </div>
                        <span className={`user-pos-badge ${pos.hasPosition ? (isPumping ? "pumping" : isDipping ? "dipping" : "active") : "empty"}`}>
                          {pos.hasPosition ? (isPumping ? `🔥 PUMPING (+${pos.pnlPct.toFixed(1)}%)` : isDipping ? `🔻 DIPPING (${pos.pnlPct.toFixed(1)}%)` : "HOLDING") : "NO POSITION"}
                        </span>
                      </div>
                      {pos.hasPosition && pos.bal > 0 ? (
                        <>
                          <div className="user-pos-body" style={{ marginTop: 8 }}>
                            <div className="user-pos-row">
                              <span className="user-pos-k">Coin Owned</span>
                              <span className="user-pos-v"><b>{pos.bal.toFixed(4)} {m.sym}</b></span>
                            </div>
                            <div className="user-pos-row">
                              <span className="user-pos-k">Money Used</span>
                              <span className="user-pos-v highlight-spent">
                                ${pos.invested.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            </div>
                            <div className="user-pos-row">
                              <span className="user-pos-k">Position Value</span>
                              <span className="user-pos-v highlight-val">${pos.currentVal.toFixed(2)}</span>
                            </div>
                            <div className="user-pos-row">
                              <span className="user-pos-k">Unrealized PnL</span>
                              <span className={`user-pos-v ${pos.pnlUsd >= 0 ? "text-green" : "text-red"}`}>
                                <b>{pos.pnlUsd >= 0 ? `+$${pos.pnlUsd.toFixed(2)}` : `-$${Math.abs(pos.pnlUsd).toFixed(2)}`}</b> ({pos.pnlPct.toFixed(2)}%)
                              </span>
                            </div>
                          </div>

                          {/* Quick Partial & Full Exit Buttons */}
                          <div className="user-pos-quick-actions" style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                            <button
                              type="button"
                              className="user-pos-quick-btn"
                              style={{ padding: "8px 0", fontSize: 12, fontWeight: 700, borderRadius: 8 }}
                              onClick={() => {
                                const sellAmt = pos.bal * 0.5;
                                const res = marketStore.placeOrder({ sym: m.sym, side: "Sell", amount: sellAmt });
                                flash(res.message);
                              }}
                              title="Sell 50% of your holdings"
                            >
                              Sell 50%
                            </button>
                            <button
                              type="button"
                              className={`user-pos-quick-btn ${isPumping ? "profit-btn" : ""}`}
                              style={{ padding: "8px 0", fontSize: 12, fontWeight: 700, borderRadius: 8 }}
                              onClick={() => {
                                const res = marketStore.placeOrder({ sym: m.sym, side: "Sell", amount: pos.bal });
                                flash(res.message);
                              }}
                              title="Sell 100% of your holdings to lock in profit"
                            >
                              {isPumping ? "🔥 Take Profit (100%)" : "Sell 100%"}
                            </button>
                          </div>
                        </>
                      ) : (
                        <div style={{ textAlign: "center", padding: "20px 10px", color: "var(--muted)", fontSize: 12 }}>
                          <div>You don't hold any {m.sym} yet.</div>
                          <button
                            type="button"
                            className="btn-primary green"
                            style={{ marginTop: 10, padding: "8px 20px", fontSize: 12, display: "inline-flex", alignItems: "center", gap: 6 }}
                            onClick={() => { setSide("Buy"); setMobileSubTab("order"); }}
                          >
                            <Zap size={13} /> Buy {m.sym} Now
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}
            {mobileSubTab === "security" && (
              <div className="dex-mobile-tab-pane">
                <TokenSnapshot sym={m.sym} flash={flash} />
              </div>
            )}
          </div>
        </div>

        {/* ── MOBILE ONLY: DEXSCREENER STICKY QUICK ACTION DUAL BAR ── */}
        {mobileSubTab !== "order" && (
          <div className="dex-floating-trade-bar">
            <div className="dex-floating-presets">
              <button type="button" onClick={() => { setAmountInput("0.1"); setSide("Buy"); setMobileSubTab("order"); flash("Set 0.1 SOL Buy"); }}>0.1 SOL</button>
              <button type="button" onClick={() => { setAmountInput("0.5"); setSide("Buy"); setMobileSubTab("order"); flash("Set 0.5 SOL Buy"); }}>0.5 SOL</button>
              <button type="button" onClick={() => { setAmountInput("1"); setSide("Buy"); setMobileSubTab("order"); flash("Set 1.0 SOL Buy"); }}>1.0 SOL</button>
              <button type="button" onClick={() => { setAmountInput("5"); setSide("Buy"); setMobileSubTab("order"); flash("Set 5.0 SOL Buy"); }}>5.0 SOL</button>
            </div>
            <div className="dex-floating-buttons">
              <button
                type="button"
                className="dex-float-btn buy"
                onClick={() => { setSide("Buy"); setMobileSubTab("order"); }}
              >
                <Zap size={15} />
                <span>Buy {m.sym}</span>
              </button>
              <button
                type="button"
                className="dex-float-btn sell"
                onClick={() => { setSide("Sell"); setMobileSubTab("order"); }}
              >
                <Coins size={15} />
                <span>Sell {m.sym}</span>
              </button>
            </div>
          </div>
        )}

        {/* ── MOBILE ONLY: DEX PAIR SEARCH / SWITCHER MODAL ── */}
        {showPairModal && (
          <div className="dex-pair-modal-backdrop" onClick={() => setShowPairModal(false)}>
            <div className="dex-pair-modal-sheet" onClick={e => e.stopPropagation()}>
              <div className="dex-sheet-header">
                <div className="dex-sheet-title">
                  <Flame size={16} className="text-amber" />
                  <b>Select Market Pair</b>
                </div>
                <button type="button" className="dex-sheet-close" onClick={() => setShowPairModal(false)}>
                  <X size={16} />
                </button>
              </div>

              <div className="dex-sheet-search">
                <Search size={14} color="var(--muted)" />
                <input
                  autoFocus
                  placeholder="Search token name, symbol, or contract address..."
                  value={marketSearch}
                  onChange={e => setMarketSearch(e.target.value)}
                />
                {marketSearch && (
                  <button type="button" onClick={() => setMarketSearch("")}><X size={12} /></button>
                )}
              </div>

              <div className="dex-sheet-filter-tabs">
                {(["All", "Favs", "New"] as const).map(tab => (
                  <button
                    key={tab}
                    type="button"
                    className={marketTab === tab ? "active" : ""}
                    onClick={() => setMarketTab(tab)}
                  >
                    {tab} {tab === "Favs" && favorites.length > 0 && `(${favorites.length})`}
                  </button>
                ))}
              </div>

              <div className="dex-sheet-coin-list">
                {filteredTokens.map(t => (
                  <div
                    key={t.sym}
                    className={`dex-sheet-coin-row ${t.sym === selectedSym ? "picked" : ""}`}
                    onClick={() => selectCoin(t.sym)}
                  >
                    <div className="dex-coin-left">
                      <CoinImg sym={t.sym} n={26} url={t.imageUrl} />
                      <div>
                        <div className="dex-coin-sym">
                          <b>{t.sym}</b>
                          <span className="dex-coin-network-tag">{t.network === "eth" ? "ETH" : "SOL"}</span>
                          {marketStore.isTokenVerified(t.sym) && (
                            <span className="dex-verified-tag-sm">✓ Verified</span>
                          )}
                        </div>
                        <div className="dex-coin-name">{t.name}</div>
                      </div>
                    </div>
                    <div className="dex-coin-right">
                      <div className="dex-coin-price"><b>{t.price}</b></div>
                      <div className={`dex-coin-delta ${t.changeNum >= 0 ? "up" : "down"}`}>
                        {t.change}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </section>

      {/* ─ Right: Token info + order form ─ */}
      <aside className="execute">
        <TokenSnapshot sym={m.sym} flash={flash} />
        <div className="execute-inner">
          {/* ── User Position Card: Clearly showing coin bought & money used & live pumping ── */}
          {(() => {
            const pos = marketStore.getUserPosition(m.sym);
            const isPumping = pos.pnlPct > 0.4;
            const isDipping = pos.pnlPct < -0.4;
            return (
              <div className={`user-position-card ${isPumping ? "pumping-card" : ""}`}>
                <div className="user-pos-header">
                  <div className="user-pos-title-wrap">
                    <Coins size={13} color="var(--violet)" />
                    <b>Your {m.sym} Position</b>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span className={`user-pos-badge ${pos.hasPosition ? (isPumping ? "pumping" : isDipping ? "dipping" : "active") : "empty"}`}>
                      {pos.hasPosition ? (isPumping ? `🔥 PUMPING (+${pos.pnlPct.toFixed(1)}%)` : isDipping ? `🔻 DIPPING (${pos.pnlPct.toFixed(1)}%)` : "HOLDING") : "NO POSITION"}
                    </span>
                  </div>
                </div>

                {pos.hasPosition ? (
                  <div className="user-pos-body">
                    {isPumping && (
                      <div className="user-pos-pump-banner">
                        <span>🚀</span>
                        <span><b>Pumping in profit!</b> Position value is <b>+${pos.pnlUsd.toFixed(2)}</b> above entry.</span>
                      </div>
                    )}

                    {pos.activeTpSl && (
                      <div className="user-pos-tpsl-status">
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ color: "var(--violet)", fontWeight: 800, fontSize: 11, display: "flex", alignItems: "center", gap: 4 }}>
                            <ShieldCheck size={12} /> TP/SL Protection Armed
                          </span>
                          <span style={{ fontSize: 10, color: "var(--muted)" }}>{pos.activeTpSl.amount >= 1000 ? pos.activeTpSl.amount.toLocaleString(undefined, { maximumFractionDigits: 0 }) : pos.activeTpSl.amount.toFixed(2)} {m.sym}</span>
                        </div>
                        <div style={{ display: "flex", gap: 10, marginTop: 4, fontSize: 11 }}>
                          {pos.activeTpSl.tpPrice && (
                            <span style={{ color: "var(--green)", fontWeight: 700 }}>
                              🎯 TP: ${pos.activeTpSl.tpPrice < 0.001 ? pos.activeTpSl.tpPrice.toFixed(8) : pos.activeTpSl.tpPrice < 1 ? pos.activeTpSl.tpPrice.toFixed(4) : pos.activeTpSl.tpPrice.toFixed(2)} (+{pos.activeTpSl.tpPct}%)
                            </span>
                          )}
                          {pos.activeTpSl.slPrice && (
                            <span style={{ color: "var(--red)", fontWeight: 700 }}>
                              🛡️ SL: ${pos.activeTpSl.slPrice < 0.001 ? pos.activeTpSl.slPrice.toFixed(8) : pos.activeTpSl.slPrice < 1 ? pos.activeTpSl.slPrice.toFixed(4) : pos.activeTpSl.slPrice.toFixed(2)} (-{pos.activeTpSl.slPct}%)
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="user-pos-row">
                      <span className="user-pos-k">Coin Owned</span>
                      <span className="user-pos-v">
                        <b>
                          {pos.bal >= 1000
                            ? pos.bal.toLocaleString(undefined, { maximumFractionDigits: 1 })
                            : pos.bal.toFixed(m.numericPrice < 0.001 ? 0 : 4)
                          } {m.sym}
                        </b>
                        <small>≈ ${pos.currentVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</small>
                      </span>
                    </div>
                    <div className="user-pos-row">
                      <span className="user-pos-k">Money Used</span>
                      <span className="user-pos-v highlight-spent">
                        ${pos.invested.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        <small>Avg: ${pos.avgBuyPrice < 0.001 ? pos.avgBuyPrice.toFixed(8) : pos.avgBuyPrice < 1 ? pos.avgBuyPrice.toFixed(4) : pos.avgBuyPrice.toFixed(2)}</small>
                      </span>
                    </div>
                    <div className="user-pos-row pos-pnl-row">
                      <span className="user-pos-k">Unrealized P&L</span>
                      <span className={`user-pos-v ${pos.pnlUsd >= 0 ? "up" : "down"}`}>
                        <b>{pos.pnlUsd >= 0 ? "+" : ""}${pos.pnlUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</b>
                        <small>({pos.pnlPct >= 0 ? "+" : ""}{pos.pnlPct.toFixed(2)}%)</small>
                      </span>
                    </div>

                    {/* Quick Profit / Partial Exit buttons */}
                    <div className="user-pos-quick-actions">
                      <button
                        type="button"
                        className="user-pos-quick-btn"
                        onClick={() => {
                          const sellAmt = pos.bal * 0.5;
                          const res = marketStore.placeOrder({ sym: m.sym, side: "Sell", amount: sellAmt });
                          flash(res.message);
                        }}
                        title="Sell 50% of your holdings"
                      >
                        Sell 50%
                      </button>
                      <button
                        type="button"
                        className={`user-pos-quick-btn ${isPumping ? "profit-btn" : ""}`}
                        onClick={() => {
                          const res = marketStore.placeOrder({ sym: m.sym, side: "Sell", amount: pos.bal });
                          flash(res.message);
                        }}
                        title="Sell 100% of your holdings to lock in profit"
                      >
                        {isPumping ? "🔥 Take Profit (100%)" : "Sell 100%"}
                      </button>
                    </div>

                    <div className="user-pos-pump-guide">
                      <div style={{ fontWeight: 800, fontSize: 11, color: "var(--green)", display: "flex", alignItems: "center", gap: 5, marginBottom: 3 }}>
                        <span>🔥</span> How to know when {m.sym} is pumping:
                      </div>
                      <div style={{ fontSize: 10, color: "#9CA3AF", lineHeight: 1.35 }}>
                        • <b>Badge & P&L</b>: Badge turns to "🔥 PUMPING" and P&L glows neon green.<br />
                        • <b>Chart</b>: Green candles shoot up in real-time.<br />
                        • <b>Trades</b>: Green Buy transactions stream in below.<br />
                        • <b>Price Header</b>: Ticker flashes green percentage gains.
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="user-pos-empty">
                    You haven't bought any {m.sym} yet. Use the form below to buy {m.sym} with your $20 cash.
                  </div>
                )}
              </div>
            );
          })()}

          {/* Collapsible Buy / Sell Order Panel */}
          <div className="order-panel-container">
            <div className="side-tabs">
              <button
                className={`buy ${orderExpanded && side === "Buy" ? "active" : ""}`}
                onClick={() => {
                  if (orderExpanded && side === "Buy") {
                    setOrderExpanded(false);
                  } else {
                    setSide("Buy");
                    setOrderExpanded(true);
                  }
                }}
                title={orderExpanded && side === "Buy" ? "Collapse order form" : `Roll down to Buy ${m.sym}`}
              >
                <span>Buy {m.sym}</span>
                <ChevronDown size={13} className={`order-chevron ${orderExpanded && side === "Buy" ? "open" : ""}`} />
              </button>
              <button
                className={`sell ${orderExpanded && side === "Sell" ? "active" : ""}`}
                onClick={() => {
                  if (orderExpanded && side === "Sell") {
                    setOrderExpanded(false);
                  } else {
                    setSide("Sell");
                    setOrderExpanded(true);
                  }
                }}
                title={orderExpanded && side === "Sell" ? "Collapse order form" : `Roll down to Sell ${m.sym}`}
              >
                <span>Sell {m.sym}</span>
                <ChevronDown size={13} className={`order-chevron ${orderExpanded && side === "Sell" ? "open" : ""}`} />
              </button>
            </div>

            <div className={`order-form-collapsible ${orderExpanded ? "expanded" : "collapsed"}`}>
              <div className="order-form-inner">
                <div className="order-form-top-row">
                  <div className="order-type">
                    {(["Market", "Limit", "TP/SL"] as const).map(t => (
                      <button
                        key={t}
                        className={orderType === t ? "active" : ""}
                        onClick={() => {
                          setOrderType(t);
                          if (t === "TP/SL") {
                            if (availableToken > 0) {
                              setAmountInput(availableToken >= 1000 ? availableToken.toFixed(0) : availableToken.toFixed(m.numericPrice < 0.001 ? 0 : 2));
                            }
                          }
                          flash(`${t} order mode activated`);
                        }}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                  <button className="order-settings-icon" onClick={() => flash("Slippage tolerance: 0.5% (Auto)")} title="Trade Settings">
                    <Settings size={13} />
                  </button>
                </div>

                {/* Mode-specific forms */}
                {orderType === "Limit" ? (
                  <>
                    <label>
                      Target Limit Price <small>Current: {m.price}</small>
                    </label>
                    <div className="order-input">
                      <input
                        value={limitPriceInput}
                        onChange={e => setLimitPriceInput(e.target.value)}
                        type="number"
                        step="any"
                        placeholder="0.00"
                      />
                      <span>USD</span>
                    </div>
                    <div className="quick-size limit-quick-chips">
                      {[-5, -2, 0, 2, 5].map(pct => (
                        <button
                          key={pct}
                          type="button"
                          className={pct === 0 ? "chip-market" : ""}
                          onClick={() => {
                            const target = pct === 0 ? m.numericPrice : m.numericPrice * (1 + pct / 100);
                            setLimitPriceInput(target < 0.001 ? target.toFixed(8) : target < 1 ? target.toFixed(4) : target.toFixed(2));
                          }}
                        >
                          {pct === 0 ? "Market" : `${pct > 0 ? "+" : ""}${pct}%`}
                        </button>
                      ))}
                    </div>

                    <label>
                      {side === "Buy" ? "Spend Cash" : `Sell ${m.sym}`}
                      <small>
                        Available: {side === "Buy"
                          ? `$${availableCash.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (USDT/USDC)`
                          : `${availableToken.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${m.sym}`
                        }
                      </small>
                    </label>
                    <div className="order-input">
                      <input
                        value={amountInput}
                        onChange={e => setAmountInput(e.target.value)}
                        type="number"
                      />
                      <span>{side === "Buy" ? "USD" : m.sym}</span>
                    </div>
                    <div className="quick-size">
                      {["25%", "50%", "75%", "MAX"].map(v => (
                        <button key={v} className={quickPct === v ? "active" : ""} onClick={() => handleQuickPct(v)}>{v}</button>
                      ))}
                    </div>

                    <label>Estimated Receive (at Target Price)</label>
                    <div className="receive-input">
                      <b>{youReceiveStr}</b>
                      <span><CoinImg sym={side === "Buy" ? m.sym : "USDT"} n={16} />{side === "Buy" ? m.sym : "USDT"}</span>
                    </div>

                    <div className="order-summary">
                      <span>Order Type<b>Limit {side}</b></span>
                      <span>Target Price<b>${limitTargetP < 0.001 ? limitTargetP.toFixed(8) : limitTargetP < 1 ? limitTargetP.toFixed(4) : limitTargetP.toFixed(2)}</b></span>
                      <span>Trigger<b>When market hits target</b></span>
                    </div>

                    <button
                      className={`btn-primary${side === "Buy" ? " green" : " red"}`}
                      style={{ width: "100%", opacity: m.is_rugged ? 0.5 : 1, cursor: m.is_rugged ? "not-allowed" : "pointer", marginTop: 8 }}
                      onClick={handlePlaceOrder}
                      disabled={m.is_rugged}
                    >
                      <Zap size={14} />Place Limit {side}
                    </button>
                  </>
                ) : orderType === "TP/SL" ? (
                  <>
                    <label>
                      Amount of {m.sym} to Protect
                      <small>
                        Owned: {availableToken.toLocaleString(undefined, { maximumFractionDigits: 2 })} {m.sym}
                      </small>
                    </label>
                    {availableToken <= 0.000001 ? (
                      <div style={{ padding: "12px 14px", background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.25)", borderRadius: 10, fontSize: 11, color: "#FBBF24", marginBottom: 12 }}>
                        <b style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12 }}>
                          <span>⚠️</span> No {m.sym} tokens in wallet
                        </b>
                        <p style={{ margin: "5px 0 10px 0", color: "#E5E7EB", fontSize: 11, lineHeight: 1.4 }}>
                          You must buy {m.sym} first using Market Buy before arming Take Profit or Stop Loss triggers.
                        </p>
                        <button
                          type="button"
                          className="btn-primary green"
                          style={{ width: "100%", padding: "8px 0", fontSize: 12 }}
                          onClick={() => {
                            setOrderType("Market");
                            setSide("Buy");
                            flash(`Switched to Market Buy for ${m.sym}`);
                          }}
                        >
                          <Zap size={12} /> Buy {m.sym} with Cash First
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="order-input">
                          <input
                            value={amountInput}
                            onChange={e => setAmountInput(e.target.value)}
                            type="number"
                          />
                          <span>{m.sym}</span>
                        </div>
                        <div className="quick-size">
                          {["25%", "50%", "75%", "MAX"].map(v => (
                            <button key={v} className={quickPct === v ? "active" : ""} onClick={() => {
                              setQuickPct(v);
                              const pct = v === "MAX" ? 100 : parseInt(v);
                              setAmountInput((availableToken * (pct / 100)).toFixed(m.numericPrice < 0.001 ? 0 : 2));
                            }}>{v}</button>
                          ))}
                        </div>

                        <div className="tpsl-config-card">
                          <div className="tpsl-row">
                            <div className="tpsl-label">
                              <span className="tp-tag">🎯 Take Profit</span>
                              <b>${(m.numericPrice * (1 + tpPctInput / 100)).toFixed(m.numericPrice < 0.001 ? 8 : 4)} (+{tpPctInput}%)</b>
                            </div>
                            <div className="quick-size">
                              {[10, 25, 50, 100, 200].map(pct => (
                                <button
                                  key={pct}
                                  type="button"
                                  className={tpPctInput === pct ? "active" : ""}
                                  onClick={() => setTpPctInput(pct)}
                                >
                                  +{pct}%
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="tpsl-row" style={{ marginTop: 8 }}>
                            <div className="tpsl-label">
                              <span className="sl-tag">🛡️ Stop Loss</span>
                              <b>${(m.numericPrice * (1 - slPctInput / 100)).toFixed(m.numericPrice < 0.001 ? 8 : 4)} (-{slPctInput}%)</b>
                            </div>
                            <div className="quick-size">
                              {[5, 10, 15, 25, 50].map(pct => (
                                <button
                                  key={pct}
                                  type="button"
                                  className={slPctInput === pct ? "active" : ""}
                                  onClick={() => setSlPctInput(pct)}
                                >
                                  -{pct}%
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="tpsl-summary-text">
                            Auto-sells {amountInput || "0"} {m.sym} if price reaches <b>${(m.numericPrice * (1 + tpPctInput / 100)).toFixed(m.numericPrice < 0.001 ? 8 : 4)}</b> (+{tpPctInput}%) to lock profit, or drops to <b>${(m.numericPrice * (1 - slPctInput / 100)).toFixed(m.numericPrice < 0.001 ? 8 : 4)}</b> (-{slPctInput}%) to prevent losses.
                          </div>
                        </div>

                        <button
                          className="btn-primary green"
                          style={{ width: "100%", opacity: m.is_rugged ? 0.5 : 1, cursor: m.is_rugged ? "not-allowed" : "pointer", marginTop: 10 }}
                          onClick={handlePlaceOrder}
                          disabled={m.is_rugged}
                        >
                          <Zap size={14} />Arm TP/SL Protection
                        </button>
                      </>
                    )}
                  </>
                ) : (
                  <>
                    <label>
                      Pay with{" "}
                      <small>
                        Available: {side === "Buy"
                          ? `$${availableCash.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (USDT/USDC)`
                          : `${availableToken.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${m.sym}`
                        }
                      </small>
                    </label>
                    <div className="order-input">
                      <input
                        id="trade-amount-input"
                        value={amountInput}
                        onChange={e => setAmountInput(e.target.value)}
                        type="number"
                      />
                      <span>{side === "Buy" ? "USD" : m.sym}</span>
                    </div>
                    <div className="quick-size">
                      {["25%", "50%", "75%", "MAX"].map(v => (
                        <button key={v} className={quickPct === v ? "active" : ""} onClick={() => handleQuickPct(v)}>{v}</button>
                      ))}
                    </div>
                    <label>You receive</label>
                    <div className="receive-input">
                      <b>{youReceiveStr}</b>
                      <span><CoinImg sym={side === "Buy" ? m.sym : "USDC"} n={16} />{side === "Buy" ? m.sym : "USDC"}</span>
                    </div>
                    <div className="order-summary">
                      <span>Market price<b>{m.price}</b></span>
                      <span>Network fee<b>$0.01</b></span>
                      <span>Price impact<Delta n="<0.01%" size={9} /></span>
                    </div>
                    {m.is_rugged && (
                      <div style={{ padding: "6px 8px", background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.4)", borderRadius: 6, color: "#FCA5A5", fontSize: 10, marginBottom: 8 }}>
                        ⚠️ <b>LIQUIDITY DRAINED:</b> Trading suspended by market protocol.
                      </div>
                    )}
                    <button
                      className={`btn-primary${side === "Buy" ? " green" : " red"}`}
                      style={{ width: "100%", opacity: m.is_rugged ? 0.5 : 1, cursor: m.is_rugged ? "not-allowed" : "pointer" }}
                      onClick={handlePlaceOrder}
                      disabled={m.is_rugged}
                    >
                      <Zap size={14} />{m.is_rugged ? "TRADING SUSPENDED" : `${side} ${m.sym}`}
                    </button>
                  </>
                )}
                <p className="secure"><ShieldCheck size={11} />Non-custodial execution</p>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}

/* ── WALLET SCREEN ──────────────────────────────────────────────── */
function WalletView({ modal, flash, onSelectCoin, onNavigate, authUser }: { modal: (m: Modal) => void; flash?: (x: string) => void; onSelectCoin?: (sym: string) => void; onNavigate?: (v: View) => void; authUser?: AuthUser }) {
  const [searchQ, setSearchQ] = useState("");
  const [copied, setCopied] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    return marketStore.subscribe(() => setTick(t => t + 1));
  }, []);

  const userAddress = authUser?.wallet_address || "AxB8s9sHynawdTUeioAgqcQKQ7Y6LvrdiN6ybE6YSrWU";
  const shortAddress = userAddress.length > 10 ? `${userAddress.slice(0, 4)}...${userAddress.slice(-3)}` : userAddress;

  const handleCopy = () => {
    copyToClipboard(userAddress);
    setCopied(true);
    if (flash) flash("Solana wallet address copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const rawBalances = marketStore.getBalances();

  // Top 8 coins for quick market overview
  const top8Syms = ["BTC", "ETH", "SOL", "BNB", "XRP", "DOGE", "ADA", "AVAX"];
  const top8Coins = useMemo(() => {
    return top8Syms.map(sym => marketStore.getToken(sym)).filter(Boolean);
  }, [top8Syms, tick]);

  // Clean assets roll: default to 8 major coins + any user held/bought coins
  const allTokensList = useMemo(() => {
    const default8Syms = ["BTC", "ETH", "SOL", "BNB", "XRP", "DOGE", "ADA", "AVAX"];
    const list: MarketToken[] = [];
    const added = new Set<string>();

    default8Syms.forEach(sym => {
      const t = marketStore.getToken(sym);
      if (t) {
        list.push(t);
        added.add(sym.toUpperCase());
      }
    });

    // If user holds any other coin (e.g. USDT, USDC, or a bought meme coin), include it in the roll
    Object.entries(rawBalances).forEach(([sym, b]) => {
      if (b.bal > 0.000001 && !added.has(sym.toUpperCase())) {
        const t = marketStore.getToken(sym);
        if (t) {
          list.push(t);
          added.add(sym.toUpperCase());
        }
      }
    });

    return list.map(token => {
      const sym = token.sym;
      const isStable = sym.toUpperCase() === "USDC" || sym.toUpperCase() === "USDT";
      const b = rawBalances[sym];
      const balNum = b?.bal || 0;
      const userUsd = isStable ? balNum : balNum * token.numericPrice;
      const invested = b?.totalInvested !== undefined ? b.totalInvested : (b?.bal || 0) * (b?.avgBuyPrice || token.numericPrice);
      const pnlUsd = isStable ? 0 : (userUsd - invested);
      const pnlPct = isStable || invested <= 0 ? 0 : (pnlUsd / invested) * 100;
      const sparkline = isStable ? [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1] : (token.sparkline || generateSparkline(token.numericPrice, token.pos));

      return {
        sym,
        name: sym.toUpperCase() === "USDC" ? "USD Coin" : sym.toUpperCase() === "USDT" ? "Tether USD" : sym.toUpperCase() === "SOL" ? "Solana" : token.name,
        imageUrl: token.imageUrl,
        poolAddress: token.poolAddress,
        price: token.price,
        numericPrice: token.numericPrice,
        chg: isStable ? "+0.00%" : token.change,
        pos: isStable ? true : token.pos,
        sparkline,
        balNum,
        userUsd,
        invested,
        pnlUsd,
        pnlPct,
        isStable,
      };
    });
  }, [rawBalances, tick]);

  const boughtCoins = useMemo(() => {
    return allTokensList.filter(b => !b.isStable && b.balNum > 0.000001);
  }, [allTokensList]);

  const totalMoneyInvestedInBought = useMemo(() => {
    return boughtCoins.reduce((acc, b) => acc + b.invested, 0);
  }, [boughtCoins]);

  const totalValueOfBought = useMemo(() => {
    return boughtCoins.reduce((acc, b) => acc + b.userUsd, 0);
  }, [boughtCoins]);

  const totalBoughtPnl = totalValueOfBought - totalMoneyInvestedInBought;
  const totalBoughtPnlPct = totalMoneyInvestedInBought > 0 ? (totalBoughtPnl / totalMoneyInvestedInBought) * 100 : 0;

  const portfolioMetrics = marketStore.getPortfolioMetrics();
  const totalPortfolioValue = portfolioMetrics.totalValue;
  const isUp = portfolioMetrics.isPositive;

  const [assetTab, setAssetTab] = useState<"assets" | "buys">("assets");

  // Search across ALL platform tokens when user searches, or display the 8 coins when idle
  const displayedList = useMemo(() => {
    const rawQ = searchQ.trim();
    if (rawQ) {
      const q = rawQ.toLowerCase().replace(/^\$/, "");
      const allPlatformTokens: MarketToken[] = [...marketStore.tokens];
      if (!allPlatformTokens.some(t => t.sym.toUpperCase() === "USDT")) allPlatformTokens.push(marketStore.getToken("USDT"));
      if (!allPlatformTokens.some(t => t.sym.toUpperCase() === "USDC")) allPlatformTokens.push(marketStore.getToken("USDC"));

      const matches = allPlatformTokens.filter(t =>
        (t.name && t.name.toLowerCase().includes(q)) ||
        (t.sym && t.sym.toLowerCase().includes(q)) ||
        (t.poolAddress && t.poolAddress.toLowerCase().includes(q)) ||
        (t.contractAddress && t.contractAddress.toLowerCase().includes(q))
      );

      return matches.map(token => {
        const sym = token.sym;
        const isStable = sym.toUpperCase() === "USDC" || sym.toUpperCase() === "USDT";
        const b = rawBalances[sym];
        const balNum = b?.bal || 0;
        const userUsd = isStable ? balNum : balNum * token.numericPrice;
        const invested = b?.totalInvested !== undefined ? b.totalInvested : (b?.bal || 0) * (b?.avgBuyPrice || token.numericPrice);
        const pnlUsd = isStable ? 0 : (userUsd - invested);
        const pnlPct = isStable || invested <= 0 ? 0 : (pnlUsd / invested) * 100;
        const sparkline = isStable ? [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1] : (token.sparkline || generateSparkline(token.numericPrice, token.pos));

        return {
          sym,
          name: sym.toUpperCase() === "USDC" ? "USD Coin" : sym.toUpperCase() === "USDT" ? "Tether USD" : sym.toUpperCase() === "SOL" ? "Solana" : token.name,
          imageUrl: token.imageUrl,
          poolAddress: token.contractAddress || token.poolAddress,
          contractAddress: token.contractAddress || token.poolAddress,
          price: token.price,
          numericPrice: token.numericPrice,
          chg: isStable ? "+0.00%" : token.change,
          pos: isStable ? true : token.pos,
          sparkline,
          balNum,
          userUsd,
          invested,
          pnlUsd,
          pnlPct,
          isStable,
        };
      });
    }

    if (assetTab === "buys") {
      return boughtCoins;
    }
    return allTokensList;
  }, [searchQ, allTokensList, boughtCoins, assetTab, rawBalances]);

  return (
    <div className="wallet-screen">
      {/* Address & Universal Search strip */}
      <div className="wallet-topbar">
        <button className="addr-chip" onClick={handleCopy}>
          <span className="addr-dot" />
          <span style={{ fontFamily: "monospace", fontSize: 10 }}>
            {copied ? <span style={{ color: "var(--green)" }}>Copied!</span> : shortAddress}
          </span>
          <Copy size={11} />
        </button>
        <div className="wallet-search" style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <Search size={13} color="var(--muted)" />
          <input
            placeholder="Search assets or paste contract address..."
            value={searchQ}
            onChange={e => setSearchQ(e.target.value)}
            style={{ paddingRight: searchQ ? 26 : undefined }}
          />
          {searchQ && (
            <button
              type="button"
              onClick={() => setSearchQ('')}
              style={{
                position: 'absolute',
                right: 8,
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                color: 'var(--muted)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                padding: 2
              }}
              title="Clear search"
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Trust Wallet Hero: Cleanly centered on mobile with evenly distributed buttons */}
      <div className="wallet-hero trust-wallet-hero">
        <div className="wallet-hero-label">Total Portfolio Value</div>
        <div className="wallet-hero-amount">
          ${totalPortfolioValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
        <div className="wallet-hero-change">
          <span style={{ color: isUp ? "var(--green)" : "var(--red)" }}>
            {isUp ? "+" : "-"}${Math.abs(portfolioMetrics.diffUsd).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <span style={{ color: "var(--muted)", fontSize: 12 }}>·</span>
          {isUp ? (
            <TrendingUp size={14} color="var(--green)" />
          ) : (
            <TrendingDown size={14} color="var(--red)" />
          )}
          <span style={{ color: isUp ? "var(--green)" : "var(--red)" }}>
            {isUp ? "+" : ""}{portfolioMetrics.diffPct.toFixed(2)}% today
          </span>
        </div>

        {/* 5 Core Action buttons evenly distributed and balanced */}
        <div className="wallet-actions">
          {[
            { label: "Deposit", icon: <ArrowDownToLine size={20} />, primary: true, action: () => modal("deposit") },
            { label: "Buy", icon: <CreditCard size={20} />, primary: false, action: () => modal("buy") },
            { label: "Send", icon: <Send size={20} />, primary: false, action: () => modal("send") },
            { label: "Swap", icon: <ArrowDownUp size={20} />, primary: false, action: () => onNavigate ? onNavigate("swap") : modal("confirm") },
            { label: "Withdraw", icon: <ArrowUpToLine size={20} />, primary: false, action: () => modal("send") },
          ].map(btn => (
            <button key={btn.label} className="wallet-action-btn" onClick={btn.action}>
              <div className={`wallet-action-icon ${btn.primary ? "primary" : "secondary"}`}>{btn.icon}</div>
              <span>{btn.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Top 8 Crypto Markets with Sparklines (Returned as requested!) */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, marginTop: 4 }}>
        <div className="wallet-section-label" style={{ margin: 0, display: "flex", alignItems: "center", gap: 7 }}>
          <span>Top 8 Crypto Markets</span>
          <span style={{ fontSize: 9, padding: "2px 7px", borderRadius: 10, background: "rgba(16,185,129,0.15)", color: "var(--green)", fontWeight: 800, border: "1px solid rgba(16,185,129,0.3)" }}>LIVE</span>
        </div>
        <span style={{ fontSize: 11, color: "var(--muted)", fontWeight: 600 }}>Real-time 24h charts</span>
      </div>

      <div className="major-coins-grid">
        {top8Coins.map((c, idx) => (
          <div
            key={c.sym}
            className="major-coin-card"
            onClick={() => onSelectCoin && onSelectCoin(c.sym)}
            title={`Trade ${c.sym}`}
          >
            <div className="major-coin-header">
              <div className="major-coin-meta">
                <span className="major-coin-rank">#{idx + 1}</span>
                <CoinImg sym={c.sym} n={22} url={c.imageUrl} />
                <div className="major-coin-titles">
                  <div className="major-coin-sym">{c.sym}</div>
                  <div className="major-coin-name">{c.name}</div>
                </div>
              </div>
              <div className="major-coin-sparkline-wrap">
                <Sparkline pts={c.sparkline} isUp={c.pos} width={54} height={18} />
              </div>
            </div>
            <div className="major-coin-footer">
              <div className="major-coin-price">{c.price}</div>
              <div className={`major-coin-chg ${c.pos ? "up" : "down"}`}>
                {c.change}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Assets vs Buys Toggle Header */}
      <div className="wallet-assets-tabbar">
        <div className="wallet-assets-pills">
          <button
            className={`wallet-assets-pill ${assetTab === "assets" ? "active" : ""}`}
            onClick={() => setAssetTab("assets")}
          >
            Assets ({allTokensList.length})
          </button>
          <button
            className={`wallet-assets-pill ${assetTab === "buys" ? "active" : ""}`}
            onClick={() => setAssetTab("buys")}
            title="View coins you have bought"
          >
            <ShoppingBag size={12} />
            Buys ({boughtCoins.length})
          </button>
        </div>

        {assetTab === "buys" && boughtCoins.length > 0 && (
          <div className="wallet-buys-summary-strip">
            <span>Invested: <b>${totalMoneyInvestedInBought.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</b></span>
            <span style={{ color: "var(--muted)" }}>·</span>
            <span>Value: <b>${totalValueOfBought.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</b></span>
            <span style={{ color: "var(--muted)" }}>·</span>
            <span className={`wallet-buys-pnl-tag ${totalBoughtPnl >= 0 ? "up" : "down"}`}>
              {totalBoughtPnl >= 0 ? "+" : ""}${totalBoughtPnl.toFixed(2)} ({totalBoughtPnlPct >= 0 ? "+" : ""}{totalBoughtPnlPct.toFixed(2)}%)
            </span>
          </div>
        )}
      </div>

      {/* Permanent Clean Assets Roll (Matching user screenshot: Icon, Name/Symbol, Sparkline, Price/Percent) */}
      <div className="asset-list">
        {displayedList.length === 0 ? (
          <div className="wallet-empty">
            <h3>{assetTab === "buys" ? "No coins in Buys yet" : "No assets found"}</h3>
            <p>{assetTab === "buys" ? "When you buy coins in the trade terminal, they will appear here with your money spent and profit/loss." : "No matching coin or contract address found."}</p>
            {assetTab === "buys" && (
              <button
                className="btn-primary"
                onClick={() => onSelectCoin && onSelectCoin("BTC")}
              >
                <Coins size={14} /> Trade Coins
              </button>
            )}
          </div>
        ) : (
          displayedList.map(b => (
            <button
              key={b.sym}
              className="asset-row"
              onClick={() => {
                if (onSelectCoin) onSelectCoin(b.sym);
              }}
              title={`Trade ${b.sym}`}
            >
              <div className="asset-left">
                <div className="asset-icon-wrap">
                  <CoinImg sym={b.sym} n={36} url={b.imageUrl} />
                </div>
                <div className="asset-titles">
                  <div className="asset-sym">{b.sym}</div>
                  <div className="asset-fullname">{b.name}</div>
                </div>
              </div>

              <div className="asset-sparkline">
                <Sparkline pts={b.sparkline} isUp={b.pos} width={52} height={20} />
              </div>

              <div className="asset-right">
                <div className="asset-price">
                  {b.balNum > 0.000001
                    ? `$${b.userUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                    : b.price}
                </div>
                <div className={`asset-change ${b.pos ? "up" : "down"}`}>
                  {b.balNum > 0.000001 && !b.isStable ? (
                    <span>
                      {b.balNum >= 1000 ? b.balNum.toLocaleString(undefined, { maximumFractionDigits: 1 }) : b.balNum.toFixed(b.numericPrice < 0.001 ? 0 : 2)} {b.sym} · {b.chg}
                    </span>
                  ) : (
                    <span>{b.chg}</span>
                  )}
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

/* ── TOKEN SELECT MODAL ─────────────────────────────────────────── */
function TokenSelectModal({
  isOpen,
  onClose,
  onSelect,
  currentSym,
  otherSym,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (sym: string) => void;
  currentSym: string;
  otherSym: string;
}) {
  const [search, setSearch] = useState("");
  const balances = marketStore.getBalances();
  const tokens = marketStore.tokens;

  if (!isOpen) return null;

  const popularSyms = ["USDC", "SOL", "USDT", "BTC", "ETH", "BONK", "WIF", "POPCAT"];

  const allAvailable: {
    sym: string;
    name: string;
    price: string;
    numPrice: number;
    bal: number;
    isNew?: boolean;
    img?: string;
    contract?: string;
  }[] = [];

  // Stablecoins first
  allAvailable.push({
    sym: "USDC",
    name: "USD Coin",
    price: "$1.00",
    numPrice: 1.0,
    bal: balances["USDC"]?.bal || 0,
  });
  allAvailable.push({
    sym: "USDT",
    name: "Tether USD",
    price: "$1.00",
    numPrice: 1.0,
    bal: balances["USDT"]?.bal || 0,
  });

  // All tokens from marketStore
  tokens.forEach(t => {
    if (t.sym.toUpperCase() === "USDC" || t.sym.toUpperCase() === "USDT") return;
    const b = balances[t.sym]?.bal || 0;
    allAvailable.push({
      sym: t.sym,
      name: t.name,
      price: t.price,
      numPrice: t.numericPrice,
      bal: b,
      isNew: t.isNew,
      img: t.imageUrl,
      contract: t.contractAddress || t.poolAddress,
    });
  });

  const q = search.toLowerCase().trim().replace(/^\$/, "");
  const filtered = allAvailable.filter(t => {
    if (!q) return true;
    return (
      (t.sym && t.sym.toLowerCase().includes(q)) ||
      (t.name && t.name.toLowerCase().includes(q)) ||
      (t.contract && t.contract.toLowerCase().includes(q))
    );
  });

  return (
    <div className="overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="token-select-modal">
        <button className="close-btn" onClick={onClose}><X size={14} /></button>
        <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>Select a Token</h2>
        <small style={{ fontSize: 12, color: "var(--muted)", margin: "4px 0 12px", display: "block" }}>
          Search by token name, ticker, or paste contract address
        </small>

        <div className="token-select-search">
          <Search size={15} color="var(--muted)" />
          <input
            autoFocus
            placeholder="Search name, symbol, or address..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", padding: 0 }}
            >
              <X size={13} />
            </button>
          )}
        </div>

        {/* Popular Token Quick Chips */}
        <div className="token-chips-row">
          {popularSyms.map(sym => (
            <button
              key={sym}
              type="button"
              className={`token-chip-btn ${currentSym === sym ? "active" : ""}`}
              onClick={() => {
                onSelect(sym);
                onClose();
              }}
            >
              <CoinImg sym={sym} n={16} />
              <span>{sym}</span>
            </button>
          ))}
        </div>

        {/* Scrollable Token Directory */}
        <div className="token-list-scroll">
          {filtered.length === 0 ? (
            <div style={{ padding: "30px 0", textAlign: "center", color: "var(--muted)", fontSize: 13 }}>
              No tokens found matching "{search}"
            </div>
          ) : (
            filtered.map(t => {
              const isSelected = t.sym === currentSym;
              return (
                <button
                  key={t.sym}
                  type="button"
                  className={`token-list-item ${isSelected ? "selected" : ""}`}
                  onClick={() => {
                    onSelect(t.sym);
                    onClose();
                  }}
                >
                  <div className="token-item-left">
                    <CoinImg sym={t.sym} n={32} url={t.img} />
                    <div className="token-item-info">
                      <div className="token-item-sym-row">
                        <span className="token-item-sym">{t.sym}</span>
                        {t.isNew && (
                          <span style={{ fontSize: 9, fontWeight: 800, padding: "1px 5px", borderRadius: 4, background: "rgba(16, 185, 129, 0.2)", color: "#34D399" }}>
                            NEW
                          </span>
                        )}
                        {isSelected && (
                          <span style={{ fontSize: 9, color: "#A78BFA", fontWeight: 700 }}>Active</span>
                        )}
                      </div>
                      <span className="token-item-name">{t.name}</span>
                    </div>
                  </div>
                  <div className="token-item-right">
                    <span className="token-item-price">{t.price}</span>
                    <span className="token-item-bal">
                      {t.bal > 0 ? `${t.bal >= 1000 ? t.bal.toLocaleString(undefined, { maximumFractionDigits: 1 }) : t.bal.toFixed(4)} ${t.sym}` : "0.00"}
                    </span>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

/* ── SWAP SCREEN ────────────────────────────────────────────────── */
function SwapView({ modal, flash }: { modal: (m: Modal) => void; flash?: (msg: string) => void }) {
  const [paySym, setPaySym] = useState<string>("USDC");
  const [receiveSym, setReceiveSym] = useState<string>("SOL");
  const [payAmt, setPayAmt] = useState<string>("10");
  const [selectingSide, setSelectingSide] = useState<"pay" | "receive" | null>(null);
  const [showConfirm, setShowConfirm] = useState<boolean>(false);
  const [slippage, setSlippage] = useState<string>("0.5%");
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [isSwapping, setIsSwapping] = useState<boolean>(false);
  const [, setTick] = useState(0);

  // Subscribe to live market updates & balances
  useEffect(() => {
    return marketStore.subscribe(() => setTick(t => t + 1));
  }, []);

  const balances = marketStore.getBalances();
  const payBal = balances[paySym]?.bal || 0;
  const receiveBal = balances[receiveSym]?.bal || 0;

  const payToken = marketStore.getToken(paySym);
  const receiveToken = marketStore.getToken(receiveSym);

  const payPrice = (paySym === "USDT" || paySym === "USDC") ? 1.0 : (payToken?.numericPrice || 1.0);
  const receivePrice = (receiveSym === "USDT" || receiveSym === "USDC") ? 1.0 : (receiveToken?.numericPrice || 1.0);

  const payNum = parseFloat(payAmt) || 0;
  const payUsdVal = payNum * payPrice;
  const receiveNum = (receivePrice > 0 && payPrice > 0 && payNum > 0) ? (payNum * payPrice) / receivePrice : 0;
  const receiveUsdVal = receiveNum * receivePrice;

  const exchangeRate = (receivePrice > 0) ? payPrice / receivePrice : 0;
  const invRate = (payPrice > 0) ? receivePrice / payPrice : 0;

  const formatAmt = (num: number, isPay = false) => {
    if (num <= 0) return isPay ? "" : "0.00";
    if (num >= 1000) return num.toLocaleString(undefined, { maximumFractionDigits: 2 });
    if (num < 0.00001) return num.toFixed(8);
    if (num < 0.001) return num.toFixed(6);
    return num.toFixed(4);
  };

  const receiveFormatted = formatAmt(receiveNum);

  const flipTokens = () => {
    const oldPay = paySym;
    const oldRec = receiveSym;
    setPaySym(oldRec);
    setReceiveSym(oldPay);
    if (receiveNum > 0) {
      setPayAmt(receiveNum >= 1000 ? receiveNum.toFixed(2) : receiveNum < 0.001 ? receiveNum.toFixed(6) : receiveNum.toFixed(4));
    }
  };

  const handleSelectToken = (sym: string) => {
    if (selectingSide === "pay") {
      if (sym === receiveSym) {
        setReceiveSym(paySym);
      }
      setPaySym(sym);
    } else if (selectingSide === "receive") {
      if (sym === paySym) {
        setPaySym(receiveSym);
      }
      setReceiveSym(sym);
    }
    setSelectingSide(null);
  };

  const handleQuickPct = (pct: number) => {
    if (payBal <= 0) {
      setPayAmt("0");
      return;
    }
    const val = payBal * pct;
    setPayAmt(val >= 1000 ? val.toFixed(2) : val < 0.001 ? val.toFixed(6) : val.toFixed(4));
  };

  const isInsufficient = payNum > payBal;

  const handleExecuteSwap = () => {
    if (payNum <= 0) {
      if (flash) flash("Please enter a valid swap amount");
      return;
    }
    if (isInsufficient) {
      if (flash) flash(`Insufficient ${paySym} balance! Available: ${payBal.toFixed(4)} ${paySym}`);
      return;
    }
    setIsSwapping(true);
    setTimeout(() => {
      const res = marketStore.swapTokens(paySym, receiveSym, payNum, receiveNum);
      setIsSwapping(false);
      setShowConfirm(false);
      if (res.success) {
        if (flash) flash(`✅ ${res.message}`);
        setPayAmt("");
      } else {
        if (flash) flash(`❌ ${res.message}`);
      }
    }, 450);
  };

  return (
    <div className="swap-screen">
      <div className="swap-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <p>SWAP</p>
          <h1>Instant swap</h1>
          <small>Sharp live pricing across Solana liquidity pools.</small>
        </div>
        <button
          type="button"
          onClick={() => setShowSettings(!showSettings)}
          className="header-icon-btn"
          title="Swap settings"
          style={{ width: 34, height: 34, borderRadius: 10, marginBottom: 6 }}
        >
          <Sliders size={16} color={showSettings ? "#A78BFA" : "var(--muted)"} />
        </button>
      </div>

      {showSettings && (
        <div style={{
          background: "var(--surface2)",
          border: "1px solid var(--border)",
          borderRadius: 14,
          padding: 14,
          marginBottom: 14,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text)" }}>Slippage Tolerance</div>
            <div style={{ fontSize: 10, color: "var(--muted)" }}>Transaction auto-reverts if price moves unfavorably</div>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            {["0.1%", "0.5%", "1.0%"].map(s => (
              <button
                key={s}
                type="button"
                className={`deposit-quick-chip ${slippage === s ? "active" : ""}`}
                style={{
                  background: slippage === s ? "#7C3AED" : undefined,
                  color: slippage === s ? "#fff" : undefined,
                  borderColor: slippage === s ? "#7C3AED" : undefined,
                }}
                onClick={() => setSlippage(s)}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="swap-card">
        {/* You Pay Box */}
        <div className="swap-token-box">
          <div className="swap-token-label">
            <span>You pay</span>
            <small>
              Balance: <b>{payBal >= 1000 ? payBal.toLocaleString(undefined, { maximumFractionDigits: 1 }) : payBal.toFixed(4)} {paySym}</b>
            </small>
          </div>
          <div className="swap-token-row">
            <input
              type="number"
              placeholder="0.00"
              value={payAmt}
              onChange={(e) => setPayAmt(e.target.value)}
              id="swap-from-input"
            />
            <button
              type="button"
              className="swap-token-btn"
              onClick={() => setSelectingSide("pay")}
              title="Click to select source currency"
            >
              <CoinImg sym={paySym} n={22} url={payToken?.imageUrl} />
              <span style={{ fontWeight: 800 }}>{paySym}</span>
              <ChevronDown size={14} />
            </button>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6 }}>
            <div className="swap-usd-val">
              ≈ ${payUsdVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
            </div>
            {/* Quick balance percentage chips */}
            <div style={{ display: "flex", gap: 4 }}>
              {[0.25, 0.5, 0.75, 1.0].map((pct, idx) => (
                <button
                  key={idx}
                  type="button"
                  style={{
                    background: "rgba(255, 255, 255, 0.05)",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    borderRadius: 4,
                    color: "var(--muted)",
                    fontSize: 9,
                    fontWeight: 700,
                    padding: "2px 5px",
                    cursor: "pointer"
                  }}
                  onClick={() => handleQuickPct(pct)}
                >
                  {pct === 1.0 ? "MAX" : `${pct * 100}%`}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Switch Tokens Invert Button */}
        <button
          type="button"
          className="swap-switch"
          onClick={flipTokens}
          title="Invert tokens"
        >
          <ArrowDownUp size={15} />
        </button>

        {/* You Receive Box */}
        <div className="swap-token-box">
          <div className="swap-token-label">
            <span>You receive</span>
            <small>
              Balance: <b>{receiveBal >= 1000 ? receiveBal.toLocaleString(undefined, { maximumFractionDigits: 1 }) : receiveBal.toFixed(4)} {receiveSym}</b>
            </small>
          </div>
          <div className="swap-token-row">
            <input
              readOnly
              placeholder="0.00"
              value={receiveFormatted}
              id="swap-to-input"
            />
            <button
              type="button"
              className="swap-token-btn"
              onClick={() => setSelectingSide("receive")}
              title="Click to select target currency"
            >
              <CoinImg sym={receiveSym} n={22} url={receiveToken?.imageUrl} />
              <span style={{ fontWeight: 800 }}>{receiveSym}</span>
              <ChevronDown size={14} />
            </button>
          </div>
          <div className="swap-usd-val">
            ≈ ${receiveUsdVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
          </div>
        </div>

        {/* Swap Metrics & Rates */}
        <div className="swap-data">
          <span>
            Rate
            <b>
              1 {paySym} = {exchangeRate >= 1000 ? exchangeRate.toLocaleString(undefined, { maximumFractionDigits: 2 }) : exchangeRate < 0.0001 ? exchangeRate.toFixed(8) : exchangeRate.toFixed(4)} {receiveSym}
            </b>
          </span>
          <span>
            Inverse
            <b>
              1 {receiveSym} = {invRate >= 1000 ? invRate.toLocaleString(undefined, { maximumFractionDigits: 2 }) : invRate < 0.0001 ? invRate.toFixed(8) : invRate.toFixed(4)} {paySym}
            </b>
          </span>
          <span>
            Network fee
            <b style={{ color: "#10B981" }}>0.000005 SOL (~$0.0009)</b>
          </span>
          <span>
            Routing
            <b><i />Jupiter V6 Direct Pool</b>
          </span>
        </div>

        {/* Action Button */}
        {isInsufficient ? (
          <button
            type="button"
            className="btn-primary"
            style={{ opacity: 0.6, cursor: "not-allowed", background: "#EF4444" }}
            disabled
          >
            Insufficient {paySym} balance ({payBal.toFixed(4)} available)
          </button>
        ) : payNum <= 0 ? (
          <button
            type="button"
            className="btn-primary"
            style={{ opacity: 0.6, cursor: "not-allowed" }}
            disabled
          >
            Enter an amount
          </button>
        ) : (
          <button
            type="button"
            className="btn-primary"
            onClick={() => setShowConfirm(true)}
          >
            <Zap size={15} /> Review swap
          </button>
        )}
      </div>

      <p className="swap-foot">
        <ShieldCheck size={15} />Atomic swap executed with instant Solana SPL settlement.
      </p>

      {/* Token Selector Modal */}
      <TokenSelectModal
        isOpen={selectingSide !== null}
        onClose={() => setSelectingSide(null)}
        onSelect={handleSelectToken}
        currentSym={selectingSide === "pay" ? paySym : receiveSym}
        otherSym={selectingSide === "pay" ? receiveSym : paySym}
      />

      {/* Review & Confirm Swap Modal */}
      {showConfirm && (
        <div className="overlay" onClick={(e) => { if (e.target === e.currentTarget && !isSwapping) setShowConfirm(false); }}>
          <div className="modal" style={{ maxWidth: 440 }}>
            {!isSwapping && (
              <button className="close-btn" onClick={() => setShowConfirm(false)}>
                <X size={14} />
              </button>
            )}
            <h2>Confirm Instant Swap</h2>
            <small>Review swap quote before final execution</small>

            <div className="confirm-swap-box" style={{ flexDirection: "column", gap: 10, alignItems: "stretch" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <CoinImg sym={paySym} n={28} url={payToken?.imageUrl} />
                  <div>
                    <b style={{ fontSize: 16 }}>{payNum} {paySym}</b>
                    <div style={{ fontSize: 10, color: "var(--muted)" }}>You Pay (${payUsdVal.toFixed(2)})</div>
                  </div>
                </div>
                <div style={{ color: "var(--muted)" }}>➔</div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, textAlign: "right" }}>
                  <div>
                    <b style={{ fontSize: 16, color: "#10B981" }}>{receiveFormatted} {receiveSym}</b>
                    <div style={{ fontSize: 10, color: "var(--muted)" }}>You Receive (${receiveUsdVal.toFixed(2)})</div>
                  </div>
                  <CoinImg sym={receiveSym} n={28} url={receiveToken?.imageUrl} />
                </div>
              </div>
            </div>

            <div className="modal-info">
              <span>
                Rate
                <b>1 {paySym} = {exchangeRate >= 1000 ? exchangeRate.toLocaleString(undefined, { maximumFractionDigits: 2 }) : exchangeRate < 0.0001 ? exchangeRate.toFixed(8) : exchangeRate.toFixed(4)} {receiveSym}</b>
              </span>
              <span>
                Minimum received ({slippage})
                <b>{(receiveNum * (1 - parseFloat(slippage) / 100)).toFixed(receiveNum < 0.001 ? 6 : 4)} {receiveSym}</b>
              </span>
              <span>
                Network fee
                <b style={{ color: "#10B981" }}>$0.0009 (0.000005 SOL)</b>
              </span>
              <span>
                Price impact
                <b style={{ color: "#10B981" }}>&lt; 0.01%</b>
              </span>
              <span>
                Route
                <b>Jupiter V6 (Direct AMM)</b>
              </span>
            </div>

            <button
              type="button"
              className="btn-primary"
              onClick={handleExecuteSwap}
              disabled={isSwapping}
              style={{ marginTop: 14 }}
            >
              {isSwapping ? (
                <span>Executing swap on Solana...</span>
              ) : (
                <>
                  <Zap size={15} /> Confirm & Execute Swap
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── MODAL BOX ──────────────────────────────────────────────────── */
function ModalBox({ type, close, flash, authUser }: { type: Modal; close: () => void; flash: (x: string) => void; authUser?: AuthUser }) {
  const done = (x: string) => { close(); flash(x); };

  if (type === "deposit") {
    return <DepositPage onClose={close} onDone={done} flash={flash} authUser={authUser} />;
  }

  if (type === "buy") {
    return <BuyPage onClose={close} onDone={done} flash={flash} authUser={authUser} />;
  }

  if (type === "send" || type === "withdraw") {
    return (
      <WithdrawPage
        onClose={close}
        onDone={done}
        flash={flash}
        authUser={authUser}
        initialMode={type === "send" ? "crypto" : "bank"}
      />
    );
  }

  const meta: Record<string, { title: string; sub: string }> = {
    confirm: { title: "Confirm Swap", sub: "Review before confirming." },
    create: { title: "Create Asset", sub: "Create a new token listing draft." },
  };
  const { title, sub } = meta[type] ?? { title: "Action", sub: "" };

  // Fallback for confirm/create: classic card overlay
  return (
    <div className="overlay" onClick={e => { if (e.target === e.currentTarget) close(); }}>
      <div className="modal">
        <button className="close-btn" onClick={close}><X size={14} /></button>
        <h2>{title}</h2>
        <small>{sub}</small>
        {type === "confirm" && (
          <>
            <div className="confirm-swap-box">
              <b>100 USDC</b><ArrowDownUp size={16} color="var(--muted)" /><b>0.569 SOL</b>
            </div>
            <div className="modal-info">
              <span>Rate<b>1 SOL = 175.63 USDC</b></span>
              <span>Network fee<b>$0.01</b></span>
              <span>Price impact<b style={{ color: "var(--green)" }}>&lt;0.01%</b></span>
            </div>
            <button className="btn-primary" onClick={() => done("Swap submitted")}>
              <Zap size={15} />Confirm swap
            </button>
          </>
        )}
        {type === "create" && (
          <>
            <label className="modal-label">Token name</label>
            <input className="modal-input" placeholder="e.g. Pixel Pug" />
            <label className="modal-label">Ticker</label>
            <input className="modal-input" placeholder="PUG" />
            <label className="modal-label">Liquidity ($)</label>
            <input className="modal-input" placeholder="25,000" type="number" />
            <button className="btn-primary" onClick={() => done("Asset draft created")}>
              <Plus size={15} />Create draft
            </button>
          </>
        )}
      </div>
    </div>
  );
}


/* ── USER PROFILE SCREEN ─────────────────────────────────────────── */
function ProfileView({
  authUser,
  modal,
  flash,
  onNavigate,
  onLogout,
}: {
  authUser: AuthUser;
  modal: (m: Modal) => void;
  flash: (msg: string) => void;
  onNavigate: (v: View) => void;
  onLogout: () => void;
}) {
  const [, setTick] = useState(0);
  const [resendingVerif, setResendingVerif] = useState(false);
  const [resendSent, setResendSent] = useState(false);
  const [copiedAddr, setCopiedAddr] = useState(false);

  // Change password form state
  const [curPw, setCurPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwLoading, setPwLoading] = useState(false);
  const [pwFeedback, setPwFeedback] = useState<{ msg: string; isError: boolean } | null>(null);

  // Country & Currency preferences
  const [userCountryCode, setUserCountryCode] = useState<string>(() => {
    return localStorage.getItem("axiom_user_country") || "NG";
  });
  const [showCountryModal, setShowCountryModal] = useState<boolean>(false);
  const [rateTick, setRateTick] = useState<number>(0);

  const selectedCountry = useMemo(() => {
    return getCountryByCode(userCountryCode);
  }, [userCountryCode, rateTick]);

  useEffect(() => {
    syncDollarRateFromBackend();
    const handleRateChange = () => setRateTick((t) => t + 1);
    window.addEventListener("axiom_dollar_rate_updated", handleRateChange);
    return () => window.removeEventListener("axiom_dollar_rate_updated", handleRateChange);
  }, []);

  const handleSelectCountry = (c: CountryInfo) => {
    setUserCountryCode(c.code);
    localStorage.setItem("axiom_user_country", c.code);
    setShowCountryModal(false);
    flash(`Trading country updated to ${c.name} (${c.currency})`);
  };

  useEffect(() => {
    return marketStore.subscribe(() => setTick(t => t + 1));
  }, []);

  const portfolioMetrics = marketStore.getPortfolioMetrics();
  const totalUsd = portfolioMetrics.totalValue;
  const solToken = marketStore.getToken("SOL");
  const solPrice = solToken?.numericPrice || 179.84;
  const solEquiv = solPrice > 0 ? (totalUsd / solPrice).toFixed(4) : "0.0000";

  const balances = marketStore.getBalances();
  const cashBal = (balances["USDT"]?.bal || 0) + (balances["USDC"]?.bal || 0);
  const userOrders = marketStore.getUserOrders();

  const cleanFullName = authUser.full_name || authUser.email?.split("@")[0] || "Account 1";
  const userInitials = cleanFullName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() || "A1";
  const displayName = cleanFullName;

  const solAddress = authUser.wallet_address || "";

  const handleCopyAddress = () => {
    if (!solAddress) return;
    copyToClipboard(solAddress);
    setCopiedAddr(true);
    flash("Solana deposit address copied to clipboard!");
    setTimeout(() => setCopiedAddr(false), 2500);
  };

  const handleResendVerif = async () => {
    if (!authUser.email || resendingVerif) return;
    setResendingVerif(true);
    await resendVerification(authUser.email);
    setResendSent(true);
    setResendingVerif(false);
    flash("Verification email link dispatched!");
    setTimeout(() => setResendSent(false), 5000);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwFeedback(null);

    if (!curPw || !newPw || !confirmPw) {
      setPwFeedback({ msg: "All password fields are required.", isError: true });
      return;
    }
    if (newPw !== confirmPw) {
      setPwFeedback({ msg: "New passwords do not match.", isError: true });
      return;
    }
    if (newPw.length < 8) {
      setPwFeedback({ msg: "New password must be at least 8 characters with letters, numbers, and special characters.", isError: true });
      return;
    }

    setPwLoading(true);
    try {
      const res = await changePassword({
        current_password: curPw,
        new_password: newPw,
        confirm_password: confirmPw,
      });
      if (res.success) {
        setPwFeedback({ msg: "✅ Password successfully changed! Your account is safe.", isError: false });
        setCurPw("");
        setNewPw("");
        setConfirmPw("");
        flash("Password successfully updated!");
      } else {
        setPwFeedback({ msg: res.error || "Failed to update password. Check your current password.", isError: true });
      }
    } catch (err: any) {
      setPwFeedback({ msg: err.message || "Failed to update password.", isError: true });
    } finally {
      setPwLoading(false);
    }
  };

  return (
    <div className="profile-screen">
      {/* ── User Identity Banner ── */}
      <div className="profile-hero">
        <div className="profile-hero-glow" />
        <div className="profile-hero-top">
          <div className="profile-avatar-large">
            {userInitials}
          </div>
          <div className="profile-hero-info">
            <div className="profile-name-row">
              <span className="profile-name">{displayName}</span>
              {authUser.is_email_verified ? (
                <span className="profile-badge profile-badge-verified">
                  <Check size={12} /> Verified Trader
                </span>
              ) : (
                <span className="profile-badge profile-badge-unverified">
                  <AlertTriangle size={12} /> Unverified Email
                </span>
              )}
              <span className="profile-badge profile-badge-vip">
                <ShieldCheck size={12} /> Tier 1 Pro
              </span>
              <button
                type="button"
                onClick={() => setShowCountryModal(true)}
                className="profile-badge"
                style={{
                  background: "rgba(124, 58, 237, 0.16)",
                  border: "1px solid rgba(167, 139, 250, 0.35)",
                  color: "#DDD6FE",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  padding: "4px 9px",
                  borderRadius: 14,
                  fontSize: 11,
                  fontWeight: 700
                }}
                title="Click to change your trading region & currency"
              >
                <CountryFlag code={selectedCountry.code} flag={selectedCountry.flag} size={15} />
                <span>{selectedCountry.name} ({selectedCountry.currency})</span>
              </button>
            </div>

            <div className="profile-email">
              <span>{authUser.email}</span>
              <span>·</span>
              <span style={{ fontFamily: "monospace", color: "#A78BFA" }}>
                UID: AXM-{authUser.user_id ? authUser.user_id.slice(0, 8).toUpperCase() : "8F2A9C"}
              </span>
            </div>

            {!authUser.is_email_verified && (
              <div style={{ marginTop: 8 }}>
                {resendSent ? (
                  <span style={{ color: "#10B981", fontSize: 11, fontWeight: 700 }}>
                    ✓ Verification email sent! Please check your inbox.
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={handleResendVerif}
                    disabled={resendingVerif}
                    style={{
                      background: "rgba(245, 158, 11, 0.15)",
                      border: "1px solid rgba(245, 158, 11, 0.3)",
                      borderRadius: 6,
                      color: "#FBBF24",
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: "pointer",
                      padding: "4px 8px"
                    }}
                  >
                    {resendingVerif ? "Sending..." : "Resend Verification Link"}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Financial metrics bar */}
        <div className="profile-stats-grid">
          <div className="profile-stat-box">
            <div className="profile-stat-label">Net Worth (USD)</div>
            <div className="profile-stat-val">
              ${totalUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="profile-stat-sub">Across all crypto & meme balances</div>
          </div>
          <div className="profile-stat-box">
            <div className="profile-stat-label">SOL Value Equivalent</div>
            <div className="profile-stat-val">{solEquiv} SOL</div>
            <div className="profile-stat-sub">@ ${solPrice.toFixed(2)} / SOL</div>
          </div>
          <div className="profile-stat-box">
            <div className="profile-stat-label">Cash Reserves (USDT/USDC)</div>
            <div className="profile-stat-val">
              ${cashBal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="profile-stat-sub">Available for instant trading</div>
          </div>
          <div className="profile-stat-box">
            <div className="profile-stat-label">Lifetime Orders</div>
            <div className="profile-stat-val">{userOrders.length}</div>
            <div className="profile-stat-sub">Swaps, limits & executed trades</div>
          </div>
        </div>
      </div>

      {/* ── 4 Quick Actions ── */}
      <div className="profile-quick-actions">
        <button
          type="button"
          className="profile-action-card"
          onClick={() => modal("deposit")}
        >
          <ArrowDownToLine size={20} color="#10B981" />
          <span>Deposit Funds</span>
        </button>

        <button
          type="button"
          className="profile-action-card"
          onClick={() => modal("send")}
        >
          <Send size={20} color="#60A5FA" />
          <span>Withdraw Cash</span>
        </button>

        <button
          type="button"
          className="profile-action-card"
          onClick={() => onNavigate("swap")}
        >
          <ArrowDownUp size={20} color="#A78BFA" />
          <span>Instant Swap</span>
        </button>

        <button
          type="button"
          className="profile-action-card"
          onClick={() => onNavigate("trade")}
        >
          <LineChart size={20} color="#F59E0B" />
          <span>Trade DEX</span>
        </button>
      </div>

      {/* ── Grid: Security & Settings | Session Info ── */}
      <div className="profile-sections-grid">
        {/* Trading Region & Local Fiat Currency Card */}
        <div className="profile-card">
          <div className="profile-card-title">
            <Globe size={18} />
            <span>Trading Region & Local Fiat</span>
          </div>
          <p style={{ fontSize: 11, color: "var(--muted)", margin: 0 }}>
            Sets your local currency conversions, banking checkout rails, and instant fiat-to-crypto deposit methods.
          </p>

          <div style={{
            background: "rgba(255, 255, 255, 0.03)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: 12,
            padding: "14px 16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            marginTop: 4
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <CountryFlag code={selectedCountry.code} flag={selectedCountry.flag} size={30} />
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text)" }}>
                  {selectedCountry.name}
                </div>
                <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
                  Fiat Currency: <strong style={{ color: "#A78BFA" }}>{selectedCountry.currency} ({selectedCountry.currencySymbol})</strong>
                  {" · "}
                  Rate: <strong>{selectedCountry.currencySymbol}{selectedCountry.rateToUsd.toLocaleString()} / $1 USD</strong>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowCountryModal(true)}
              style={{
                background: "rgba(124, 58, 237, 0.2)",
                border: "1px solid rgba(167, 139, 250, 0.4)",
                color: "#C4B5FD",
                borderRadius: 8,
                padding: "8px 14px",
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
                transition: "all 150ms",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                flexShrink: 0
              }}
            >
              <Globe size={14} /> Change
            </button>
          </div>

          {selectedCountry.paymentMethods && selectedCountry.paymentMethods.length > 0 && (
            <div style={{ marginTop: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "var(--muted)", marginBottom: 6 }}>
                Supported Local Payment Rails:
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {selectedCountry.paymentMethods.map((pm, idx) => (
                  <span
                    key={idx}
                    style={{
                      fontSize: 10.5,
                      padding: "4px 8px",
                      borderRadius: 6,
                      background: "rgba(16, 185, 129, 0.08)",
                      border: "1px solid rgba(16, 185, 129, 0.2)",
                      color: "#34D399"
                    }}
                  >
                    ✓ {pm}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Password Update Card */}
        <div className="profile-card">
          <div className="profile-card-title">
            <Lock size={18} />
            <span>Change Account Password</span>
          </div>
          <p style={{ fontSize: 11, color: "var(--muted)", margin: 0 }}>
            Ensure your account is using a long, random password to stay secure.
          </p>

          <form onSubmit={handleChangePassword} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div className="profile-input-group">
              <label>Current Password</label>
              <input
                type="password"
                placeholder="Enter current password"
                value={curPw}
                onChange={(e) => setCurPw(e.target.value)}
              />
            </div>

            <div className="profile-input-group">
              <label>New Password</label>
              <input
                type="password"
                placeholder="Min 8 chars, uppercase, number & symbol"
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
              />
            </div>

            <div className="profile-input-group">
              <label>Confirm New Password</label>
              <input
                type="password"
                placeholder="Re-type new password"
                value={confirmPw}
                onChange={(e) => setConfirmPw(e.target.value)}
              />
            </div>

            {pwFeedback && (
              <div style={{
                fontSize: 11,
                padding: "8px 10px",
                borderRadius: 8,
                background: pwFeedback.isError ? "rgba(239, 68, 68, 0.12)" : "rgba(16, 185, 129, 0.12)",
                color: pwFeedback.isError ? "#F87171" : "#34D399",
                border: `1px solid ${pwFeedback.isError ? "rgba(239, 68, 68, 0.3)" : "rgba(16, 185, 129, 0.3)"}`
              }}>
                {pwFeedback.msg}
              </div>
            )}

            <button
              type="submit"
              className="btn-primary"
              disabled={pwLoading}
              style={{ marginTop: 4, padding: "10px" }}
            >
              {pwLoading ? "Updating Password..." : "Update Password"}
            </button>
          </form>
        </div>

        {/* Security & Sessions Card */}
        <div className="profile-card">
          <div className="profile-card-title">
            <ShieldCheck size={18} />
            <span>Security & Session</span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div className="session-info-item">
              <span>Two-Factor Protection</span>
              <b style={{ color: "#10B981", display: "flex", alignItems: "center", gap: 4 }}>
                <Check size={13} /> Email OTP Enabled
              </b>
            </div>

            <div className="session-info-item">
              <span>Current Device</span>
              <b>Windows Desktop · Edge / Chrome</b>
            </div>

            <div className="session-info-item">
              <span>IP Address</span>
              <b>127.0.0.1 (Local Session)</b>
            </div>

            <div className="session-info-item">
              <span>Session Status</span>
              <b style={{ color: "#10B981" }}>Active Now</b>
            </div>

            <div className="session-info-item">
              <span>Security Level</span>
              <b style={{ color: "#60A5FA" }}>High (bcrypt + httpOnly JWT)</b>
            </div>

            <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 2 }}>
                Administrative Portals
              </div>
              <button
                type="button"
                onClick={() => { window.location.href = "/admin"; }}
                style={{
                  width: "100%",
                  background: "rgba(124, 58, 237, 0.12)",
                  border: "1px solid rgba(124, 58, 237, 0.35)",
                  color: "#C4B5FD",
                  borderRadius: 10,
                  padding: "10px 12px",
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  transition: "all 150ms"
                }}
              >
                <Shield size={14} color="#A78BFA" /> Open Super Admin Portal (/admin)
              </button>

              <button
                type="button"
                onClick={() => { window.location.href = "/junior-admin"; }}
                style={{
                  width: "100%",
                  background: "rgba(34, 209, 248, 0.10)",
                  border: "1px solid rgba(34, 209, 248, 0.30)",
                  color: "#67E8F9",
                  borderRadius: 10,
                  padding: "10px 12px",
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  transition: "all 150ms"
                }}
              >
                <Zap size={14} color="#22D1F8" /> Open Junior Admin Portal (/junior-admin)
              </button>
            </div>

            <div style={{ marginTop: 14 }}>
              <button
                type="button"
                onClick={onLogout}
                style={{
                  width: "100%",
                  background: "rgba(239, 68, 68, 0.12)",
                  border: "1px solid rgba(239, 68, 68, 0.25)",
                  color: "#F87171",
                  borderRadius: 10,
                  padding: "10px",
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  transition: "all 150ms"
                }}
              >
                <LogOut size={14} /> Sign Out of Axiom Wallet
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Recent Activity Table ── */}
      <div className="profile-card">
        <div className="profile-card-title">
          <LineChart size={18} />
          <span>Recent Activity & Trade History</span>
        </div>

        {userOrders.length === 0 ? (
          <div style={{ textAlign: "center", padding: "30px 10px", color: "var(--muted)" }}>
            <Coins size={28} style={{ opacity: 0.4, marginBottom: 8 }} />
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>No trade activity recorded yet</div>
            <div style={{ fontSize: 11, marginTop: 4 }}>
              Your instant swaps, market orders, and limit fills will be cataloged here.
            </div>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="dex-table" style={{ width: "100%", textAlign: "left" }}>
              <thead>
                <tr className="dex-th-row">
                  <th className="dex-th">TYPE</th>
                  <th className="dex-th">ASSET</th>
                  <th className="dex-th">NOTE</th>
                  <th className="dex-th">AMOUNT</th>
                  <th className="dex-th">VALUE</th>
                  <th className="dex-th">TIME</th>
                </tr>
              </thead>
              <tbody>
                {userOrders.slice(0, 10).map((o) => {
                  const isBuy = o.side === "Buy";
                  const isSwap = o.triggerNote?.includes("Instant Swap");
                  return (
                    <tr key={o.id} className="dex-tr">
                      <td className="dex-td">
                        <span className={`dex-badge ${isSwap ? "dex-badge-buy" : isBuy ? "dex-badge-buy" : "dex-badge-sell"}`}
                          style={isSwap ? { background: "rgba(124, 58, 237, 0.2)", color: "#C4B5FD", borderColor: "rgba(124, 58, 237, 0.4)" } : undefined}
                        >
                          {isSwap ? "SWAP" : o.side.toUpperCase()}
                        </span>
                      </td>
                      <td className="dex-td">
                        <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 700, color: "var(--text)" }}>
                          <CoinImg sym={o.sym} n={18} />
                          <span>{o.sym}</span>
                        </div>
                      </td>
                      <td className="dex-td" style={{ fontSize: 11, color: "var(--muted)", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {o.triggerNote || o.orderType}
                      </td>
                      <td className="dex-td" style={{ fontFamily: "monospace", fontSize: 11, color: "var(--text)" }}>
                        {o.tokenAmt >= 1000 ? o.tokenAmt.toLocaleString(undefined, { maximumFractionDigits: 1 }) : o.tokenAmt.toFixed(4)}
                      </td>
                      <td className="dex-td" style={{ fontFamily: "monospace", fontSize: 11, color: "#10B981", fontWeight: 700 }}>
                        ${o.amountUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="dex-td" style={{ fontSize: 10, color: "var(--muted)" }}>
                        {o.dateStr}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showCountryModal && (
        <CountrySelectModal
          isOpen={showCountryModal}
          onClose={() => setShowCountryModal(false)}
          onSelect={handleSelectCountry}
          selectedCode={userCountryCode}
          title="Select Trading Country & Currency"
        />
      )}
    </div>
  );
}


/* ── AUTHENTICATED APP SHELL ─────────────────────────────────────────────── */
function AppShell({
  authUser,
  onLogout,
}: {
  authUser: AuthUser;
  onLogout: () => void;
}) {
  const getInitialView = (): View => {
    if (typeof window !== "undefined") {
      const hash = window.location.hash.toLowerCase().replace("#", "");
      if (hash === "admin") return "admin";
      if (hash === "trade" || hash === "swap" || hash === "wallet" || hash === "profile" || hash === "leaderboard") return hash as View;
      const saved = localStorage.getItem("axiom_active_view") as View;
      if (saved === "admin") return "admin";
      if (saved && ["wallet", "trade", "swap", "profile", "leaderboard"].includes(saved)) return saved;
    }
    return "wallet";
  };

  const [view, setView] = useState<View>(getInitialView);
  const [modal, setModal] = useState<Modal>("");
  const [toast, setToast] = useState("");
  const [menu, setMenu] = useState(false);
  const [resendingVerif, setResendingVerif] = useState(false);
  const [resendSent, setResendSent] = useState(false);
  const { toggleTheme, isLight } = useTheme();

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.toLowerCase().replace("#", "");
      if (hash === "admin" || hash === "trade" || hash === "swap" || hash === "wallet" || hash === "profile" || hash === "leaderboard") {
        setView(hash as View);
        if (typeof localStorage !== "undefined") {
          localStorage.setItem("axiom_active_view", hash);
        }
      }
    };
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, [authUser.is_admin]);

  const navigateTo = (v: View) => {
    setView(v);
    window.location.hash = v;
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("axiom_active_view", v);
    }
  };

  const flash = (x: string) => {
    setToast(x);
    setTimeout(() => setToast(""), 2800);
  };

  const handleResendVerification = async () => {
    if (!authUser.email || resendingVerif) return;
    setResendingVerif(true);
    await resendVerification(authUser.email);
    setResendSent(true);
    setResendingVerif(false);
    setTimeout(() => setResendSent(false), 5000);
  };

  const links: [View, string, React.ElementType][] = [
    ["wallet", "Wallet", Wallet],
    ["trade", "Trade", LineChart],
    ["swap", "Swap", ArrowDownUp],
    ["leaderboard", "Leaderboard", Trophy],
    ["profile", "Profile", Users],
  ];

  const cleanFullName = authUser.full_name || authUser.email?.split("@")[0] || "Account 1";
  const userInitials = cleanFullName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() || "A1";
  const displayName = cleanFullName;

  return (
    <div className="axiom-app">
      {/* Unverified email banner */}
      {!authUser.is_email_verified && (
        <div style={{
          background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)",
          padding: "10px 20px", display: "flex", alignItems: "center", gap: 10,
          fontSize: 13, color: "#FCD34D", flexWrap: "wrap"
        }}>
          <AlertTriangle size={15} />
          <span>Please verify your email to unlock trading and deposits.</span>
          {resendSent
            ? <span style={{ color: "#10B981", fontWeight: 700, marginLeft: "auto" }}>&#10003; Verification email sent!</span>
            : <button
              onClick={handleResendVerification}
              disabled={resendingVerif}
              style={{
                background: "rgba(245,158,11,0.2)", border: "1px solid rgba(245,158,11,0.3)",
                borderRadius: 6, color: "#F59E0B", fontSize: 12, fontWeight: 700,
                cursor: "pointer", padding: "4px 10px", fontFamily: "inherit", marginLeft: "auto"
              }}
            >
              {resendingVerif ? "Sending..." : "Resend verification"}
            </button>
          }
        </div>
      )}

      <header className="app-header">
        <button className="app-brand" onClick={() => navigateTo("wallet")}>
          <div className="app-brand-icon">A</div>AXIOM
        </button>
        <nav className="app-nav">
          {links.map(([id, label, Icon]) => (
            <button key={id} className={view === id ? "active" : ""} onClick={() => { navigateTo(id); setMenu(false); }}>
              <Icon size={14} />{label}
            </button>
          ))}
        </nav>
        <div className="header-right">
          <div className="network-chip">
            <span className="network-dot" />Solana<ChevronDown size={12} />
          </div>

          {/* Theme Toggle Button */}
          <button
            type="button"
            className="header-icon-btn theme-toggle-btn"
            onClick={toggleTheme}
            title={isLight ? "Switch to Dark Mode" : "Switch to Light Mode"}
            aria-label={isLight ? "Switch to Dark Mode" : "Switch to Light Mode"}
          >
            {isLight ? <Moon size={16} /> : <Sun size={16} />}
          </button>

          <button className="header-icon-btn" aria-label="Notifications"><Bell size={16} /></button>

          {/* User profile chip clickable for all users */}
          <button
            type="button"
            className={`user-chip ${view === "profile" ? "active" : ""}`}
            onClick={() => navigateTo("profile")}
            title="User Profile & Settings"
          >
            <div className="user-avatar">{userInitials}</div>
            <b className="user-name-label">{displayName}</b>
            <span className="dex-role-badge pro" title="Verified Trader">
              <ShieldCheck size={11} /> PRO
            </span>
          </button>

          <button className="header-icon-btn" onClick={onLogout} title="Sign out" aria-label="Sign out">
            <LogOut size={16} />
          </button>
          <button className="menu-btn" onClick={() => setMenu(!menu)} aria-label="Menu">
            <Menu size={18} />
          </button>
        </div>
      </header>

      <div className={`menu-pop${menu ? " open" : ""}`}>
        {links.map(([id, label, Icon]) => (
          <button key={id} onClick={() => { navigateTo(id); setMenu(false); }}>
            <Icon size={16} />{label}
          </button>
        ))}
        <button onClick={() => { toggleTheme(); setMenu(false); }} style={{ borderTop: "1px solid var(--border)", marginTop: 4, paddingTop: 8 }}>
          {isLight ? <Moon size={16} /> : <Sun size={16} />}
          {isLight ? "Dark Mode" : "Light Mode"}
        </button>
      </div>

      <main className="app-main">
        {view === "trade" && <Trade flash={flash} />}
        {view === "wallet" && <WalletView authUser={authUser} modal={setModal} flash={flash} onNavigate={navigateTo} onSelectCoin={(sym) => { marketStore.setActiveSym(sym); navigateTo("trade"); }} />}
        {view === "swap" && <SwapView modal={setModal} flash={flash} />}
        {view === "leaderboard" && <LeaderboardView onNavigate={navigateTo} onSelectCoin={(sym) => { marketStore.setActiveSym(sym); navigateTo("trade"); }} flash={flash} />}
        {view === "profile" && <ProfileView authUser={authUser} modal={setModal} flash={flash} onNavigate={navigateTo} onLogout={onLogout} />}
      </main>

      {!modal && (
        <>
          <div className="phone-nav-scrim" aria-hidden="true" />
          <nav className="phone-nav" aria-label="Floating Mobile Navigation">
          {links.map(([id, label, Icon]) => {
            const isActive = view === id;
            return (
              <button
                key={id}
                className={`phone-nav-btn ${isActive ? "active" : ""}`}
                onClick={() => navigateTo(id)}
                type="button"
              >
                <div className="phone-nav-icon-wrap">
                  <Icon size={20} strokeWidth={isActive ? 2.4 : 1.9} />
                </div>
                <span className="phone-nav-label">{label}</span>
                {isActive && <span className="phone-nav-glow-dot" />}
              </button>
            );
          })}
          </nav>
        </>
      )}

      {modal && <ModalBox authUser={authUser} type={modal} close={() => setModal("")} flash={flash} />}

      {toast && (
        <div className="toast"><Check size={15} />{toast}</div>
      )}
    </div>
  );
}


/* ── ROOT APP ────────────────────────────────────────────────────────────── */
export default function App() {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  const checkIsAdminPath = () => {
    if (typeof window === "undefined") return false;
    const p = window.location.pathname.toLowerCase();
    const h = window.location.hash.toLowerCase().replace("#", "");
    return p === "/admin" || p.startsWith("/admin/") || h === "admin";
  };

  const checkIsJuniorAdminPath = () => {
    if (typeof window === "undefined") return false;
    const p = window.location.pathname.toLowerCase();
    const h = window.location.hash.toLowerCase().replace("#", "");
    return p === "/junior-admin" || p.startsWith("/junior-admin/") || h === "junior-admin";
  };

  const [isAdminRoute, setIsAdminRoute] = useState<boolean>(checkIsAdminPath);
  const [isJuniorAdminRoute, setIsJuniorAdminRoute] = useState<boolean>(checkIsJuniorAdminPath);

  // Capture Referral Link Slug (e.g. /1, /alpha, /agent1)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const path = window.location.pathname;
    const segments = path.split("/").filter(Boolean);
    if (segments.length === 1) {
      const seg = segments[0].toLowerCase();
      const reserved = ["admin", "junior-admin", "api", "reset-password", "verify-email", "trade", "wallet", "swap", "profile", "leaderboard"];
      if (!reserved.includes(seg)) {
        localStorage.setItem("axiom_agent_ref", seg);
        console.log(`[Referral] Activated Junior Admin referral slug: /${seg}`);
      }
    }
  }, []);

  useEffect(() => {
    const handleRoute = () => {
      setIsAdminRoute(checkIsAdminPath());
      setIsJuniorAdminRoute(checkIsJuniorAdminPath());
    };
    window.addEventListener("popstate", handleRoute);
    window.addEventListener("hashchange", handleRoute);
    return () => {
      window.removeEventListener("popstate", handleRoute);
      window.removeEventListener("hashchange", handleRoute);
    };
  }, []);

  useEffect(() => {
    syncDollarRateFromBackend();
    getMe().then((user) => {
      setAuthUser(user);
      setAuthChecked(true);
      marketStore.setUser(user);
      if (user?.wallet_address) {
        localStorage.setItem("axiom_wallet_address", user.wallet_address);
      }
    });
  }, []);

  // Dedicated Junior Admin Portal route at /junior-admin
  if (isJuniorAdminRoute) {
    return <JuniorAdminPortal />;
  }

  // Dedicated Super Admin Portal route at /admin or /#admin
  if (isAdminRoute) {
    return (
      <AdminPortal
        onExit={() => {
          setIsAdminRoute(false);
          window.location.href = "/#wallet";
        }}
      />
    );
  }

  const handleLogout = async () => {
    await logout();
    setAuthUser(null);
    marketStore.setUser(null);
  };

  if (!authChecked) {
    return (
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        height: "100vh", background: "var(--bg)", flexDirection: "column", gap: 16
      }}>
        <div style={{
          width: 44, height: 44, borderRadius: 12,
          background: "linear-gradient(135deg, #7C3AED, #5B21B6)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 22, fontWeight: 900, color: "#fff",
          boxShadow: "0 0 24px rgba(124,58,237,0.4)"
        }}>A</div>
        <div style={{ fontSize: 13, color: "var(--text-muted)", fontFamily: "Inter, system-ui" }}>Loading Axiom Wallet...</div>
      </div>
    );
  }

  if (!authUser) {
    return (
      <PhantomAuth
        onAuth={(user) => {
          setAuthUser(user);
          marketStore.setUser(user);
          if (user?.wallet_address) {
            localStorage.setItem("axiom_wallet_address", user.wallet_address);
          }
        }}
      />
    );
  }

  return <AppShell authUser={authUser} onLogout={handleLogout} />;
}
