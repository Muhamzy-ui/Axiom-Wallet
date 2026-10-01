import { useState, useRef, useEffect, useMemo } from "react";
import {
  ArrowDownUp, ArrowUpRight, BarChart3, Bell, Check, CheckCircle, ChevronDown, ChevronLeft, ChevronRight, ChevronUp,
  Copy, LayoutDashboard, LineChart, Menu, Plus, Search,
  Send, Settings, Shield, ShieldCheck, Target, Star, Wallet, X, TrendingUp, TrendingDown,
  AlertTriangle, Coins, Users, ArrowDownToLine, ArrowUpToLine, Skull, LogOut, Sliders, Zap, Globe, Lock, ShoppingBag, RotateCcw, ExternalLink,
  Sun, Moon, CreditCard, RefreshCw, Clock, Crown, Flame, Activity, Trophy, Eye, EyeOff, Camera, Share
} from "lucide-react";
import "./index.css";
import { AdminDashboard } from "./components/admin/AdminDashboard";
import { AdminPortal } from "./components/admin/AdminPortal";
import { JuniorAdminPortal } from "./components/junior-admin/JuniorAdminPortal";
import { LeaderboardView } from "./components/leaderboard/LeaderboardView";
import { marketStore, MarketToken, LiveTrade, OrderBookEntry, UserOrder, generateSparkline } from "./services/marketStore";
import { CandleChart } from "./components/trading/CandleChart";
import { PhantomAuth } from "./components/auth/PhantomAuth";
import { getMe, login, logout, resendVerification, changePassword, updateUserProfile, type AuthUser } from "./services/authService";
import { api } from "./services/api";
import { PlatformDepositWallet } from "./types";
import { ThemeProvider, useTheme } from "./services/themeContext";
import { copyToClipboard } from "./services/clipboard";
import { DepositPage } from "./components/modals/DepositPage";
import { BuyPage } from "./components/modals/BuyPage";
import { WithdrawPage } from "./components/modals/WithdrawPage";
import { SendPage } from "./components/modals/SendPage";
import { ProfitShareModal } from "./components/modals/ProfitShareModal";
import { CountrySelectModal } from "./components/modals/CountrySelectModal";
import { getCountryByCode, CountryInfo, syncDollarRateFromBackend } from "./constants/countries";
import { CountryFlag } from "./components/common/CountryFlag";
import { AxiomLogo } from "./components/common/AxiomLogo";
import { formatCoinPrice, formatRawPrice, formatPercentage, formatUsdAmount } from "./services/formatters";
import { generatePhantomAvatar, generatePresetAvatar, PHANTOM_AVATAR_PRESETS, type AvatarPreset } from "./utils/avatar";

type View = "trade" | "wallet" | "swap" | "admin" | "profile" | "leaderboard";
type Modal = "deposit" | "send" | "confirm" | "create" | "buy" | "withdraw" | "profit" | "";

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
  const [hasError, setHasError] = useState(false);
  const s = (sym || "").toUpperCase();
  const token = marketStore.getToken(s);
  const tokenImg = (token && token.sym.toUpperCase() === s) ? (token.imageUrl || (token as any).logo_url) : undefined;
  const src = url || tokenImg || COIN_IMGS[s] || `/coins/${s.toLowerCase()}.png`;

  useEffect(() => {
    setHasError(false);
  }, [src, s]);

  if (hasError || !src) {
    return (
      <span
        className="coin"
        style={{
          width: n,
          height: n,
          borderRadius: "50%",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #2A2438 0%, #171520 100%)",
          border: "1px solid rgba(139, 92, 246, 0.35)",
          color: "#A78BFA",
          fontSize: Math.max(9, Math.round(n * 0.38)),
          fontWeight: 800,
          flexShrink: 0,
        }}
      >
        {s.slice(0, 3)}
      </span>
    );
  }

  return (
    <span
      className="coin"
      style={{
        width: n,
        height: n,
        borderRadius: "50%",
        overflow: "hidden",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#1F222E",
        flexShrink: 0,
      }}
    >
      <img
        src={src}
        alt={sym}
        referrerPolicy="no-referrer"
        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        onError={() => setHasError(true)}
      />
    </span>
  );
}

function Delta({ n, size = 10 }: { n: string; size?: number }) {
  if (!n) return null;
  const isNeg = n.startsWith("-");
  const num = parseFloat(n.replace(/[+%,]/g, "")) || 0;
  let displayStr = formatPercentage(isNeg ? -num : num);
  if (!isNeg && num > 999999) displayStr = "+999,999%";
  else if (isNeg && num > 99.99) displayStr = "-99.99%";
  const cls = isNeg || num < 0 ? "down" : num > 0 ? "up" : "neutral";
  return (
    <span className={cls} style={{ fontSize: size, whiteSpace: "nowrap" }}>
      {displayStr}
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

  const fmtVol = (n: number) => {
    if (!n || isNaN(n) || n < 0) return "$0.00";
    let valUsd = n >= 1e5 ? n : n * 1e6;
    if (valUsd > 1e12) valUsd = 9.99e11;
    if (valUsd >= 1e9) return `$${(valUsd / 1e9).toFixed(1)}B`;
    if (valUsd >= 1e6) return `$${(valUsd / 1e6).toFixed(1)}M`;
    if (valUsd >= 1e3) return `$${(valUsd / 1e3).toFixed(1)}K`;
    return `$${valUsd.toFixed(2)}`;
  };

  const fmtNum = (n: number) => {
    if (!n || isNaN(n) || n < 0) return "0";
    if (n > 9999999) return "9.9M+";
    if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
    if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
    return n.toLocaleString();
  };

  return (
    <div className="token-snapshot">

      {/* ── Token logo banner ── */}
      <div className="snap-banner">
        <div
          className="snap-banner-bg"
          style={{ backgroundImage: `url(${d.bannerUrl || d.imageUrl || COIN_IMGS[sym] || `/coins/${sym.toLowerCase()}.png`})` }}
        />
        <div className="snap-banner-vignette" />
        <img
          src={d.imageUrl || COIN_IMGS[sym] || `/coins/${sym.toLowerCase()}.png`}
          alt={sym}
          referrerPolicy="no-referrer"
          className="snap-banner-avatar"
          onError={(e) => {
            (e.target as any).src = "https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/generic.png";
          }}
        />
        <div className="snap-banner-label">LAUNCH COINS</div>
      </div>

      {/* ── Header: pair + chain ── */}
      <div className="snap-header">
        <CoinImg sym={sym} n={22} url={d.imageUrl} />
        <div>
          <div className="snap-pair">{sym} / {d.pair_currency || (d.isMajor ? "USDT" : "SOL")}</div>
          <div className="snap-chain">
            {d.isMajor ? (
              <>
                <span className="chain-dot sol" />
                <span>Spot Market</span>
              </>
            ) : (
              <>
                <span className={`chain-dot ${d.network === "eth" ? "eth" : "sol"}`} />
                <span>{d.network === "eth" ? "Ethereum" : "Solana"}</span>
                <span style={{ margin: "0 4px", color: "var(--muted)" }}>›</span>
                <span className="chain-dot ray" />
                <span>{d.network === "eth" ? "Uniswap" : "Raydium"}</span>
              </>
            )}
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
              {marketStore.isTokenLiquidityLocked(sym) && !d.is_rugged && (
                <span className="snap-lock-badge" title="Liquidity Locked">
                  <Lock size={10} />
                </span>
              )}
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
              <div className="snap-val">{fmtNum(txns)}</div>
            </div>
            <div className="snap-flow-right">
              <div className="snap-flow-header">
                <span className="snap-label">BUYS</span>
                <span className="snap-label">SELLS</span>
              </div>
              <div className="snap-flow-nums">
                <span className="snap-val">{fmtNum(buys)}</span>
                <span className="snap-val">{fmtNum(sells)}</span>
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
              <div className="snap-val">{fmtVol(vol)}</div>
            </div>
            <div className="snap-flow-right">
              <div className="snap-flow-header">
                <span className="snap-label">BUY VOL</span>
                <span className="snap-label">SELL VOL</span>
              </div>
              <div className="snap-flow-nums">
                <span className="snap-val">{fmtVol(buyVol)}</span>
                <span className="snap-val">{fmtVol(sellVol)}</span>
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
              <div className="snap-val">{fmtNum(traders)}</div>
            </div>
            <div className="snap-flow-right">
              <div className="snap-flow-header">
                <span className="snap-label">BUYERS</span>
                <span className="snap-label">SELLERS</span>
              </div>
              <div className="snap-flow-nums">
                <span className="snap-val">{fmtNum(buyers)}</span>
                <span className="snap-val">{fmtNum(sellers)}</span>
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
            <span>{formatRawPrice(a.price)}</span>
            <span>{a.amount >= 1000 ? a.amount.toLocaleString(undefined, { maximumFractionDigits: 0 }) : a.amount.toFixed(2)}</span>
            <span>${a.total >= 1000 ? a.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : a.total.toFixed(2)}</span>
          </div>
        ))}
      </div>
      <div className="ob-mid">
        <div className="ob-mid-price">
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: (!token.is_rugged && token.pos) ? "var(--green)" : "var(--red)", display: "inline-block" }} />
          <span>{formatCoinPrice(token.price)}</span>
          <Delta n={(token.is_rugged || token.numericPrice <= 0.00000001) ? "-99.99%" : token.change} size={9} />
        </div>
        <div className="ob-spread">
          Spread: {ob.spread}
        </div>
      </div>
      <div className="ob-rows">
        {ob.bids.map((b, i) => (
          <div key={`bid-${i}`} className="ob-row bid">
            <div className="ob-depth-bar bid" style={{ width: `${b.depthPct}%` }} />
            <span>{formatRawPrice(b.price)}</span>
            <span>{b.amount >= 1000 ? b.amount.toLocaleString(undefined, { maximumFractionDigits: 0 }) : b.amount.toFixed(2)}</span>
            <span>${b.total >= 1000 ? b.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : b.total.toFixed(2)}</span>
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
            <th className="dex-th"><span className="dex-th-content">DATE</span></th>
            <th className="dex-th"><span className="dex-th-content">TYPE</span></th>
            <th className="dex-th"><span className="dex-th-content">USD</span></th>
            <th className="dex-th"><span className="dex-th-content">{sym}</span></th>
            <th className="dex-th"><span className="dex-th-content">SOL</span></th>
            <th className="dex-th"><span className="dex-th-content">PRICE</span></th>
            <th className="dex-th"><span className="dex-th-content">TRADER</span></th>
            <th className="dex-th" style={{ textAlign: "center", width: 34 }}>TXN</th>
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
                  {(Number(t.usd) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td className={`dex-td ${numClass}`}>
                  {(() => {
                    const amt = Number(t.tokenAmt) || 0;
                    return amt >= 1000 ? amt.toLocaleString(undefined, { maximumFractionDigits: 1 }) : amt.toFixed(3);
                  })()}
                </td>
                <td className={`dex-td ${numClass}`}>
                  {(Number(t.solAmt) || 0).toFixed(4)}
                </td>
                <td className={`dex-td ${numClass}`} style={{ minWidth: 72, whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>
                  {formatCoinPrice(t.price)}
                </td>
                <td className="dex-td">
                  <div className="dex-trader-wrap" style={{ maxWidth: 85, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    <span>{t.traderEmoji}</span>
                    <span className={`dex-trader-badge${t.isUser ? " is-user" : ""}`}>
                      {t.isUser ? "You" : t.trader}
                    </span>
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

/* ── Axiom Bybit-Style Set Take Profit & Stop Loss Modal ─────────── */
function SetTpSlModal({
  isOpen,
  onClose,
  sym,
  pos,
  curPrice,
  flash,
}: {
  isOpen: boolean;
  onClose: () => void;
  sym: string;
  pos: {
    bal: number;
    currentVal: number;
    avgBuyPrice: number;
    activeTpSl?: any;
  };
  curPrice: number;
  flash?: (m: string) => void;
}) {
  if (!isOpen) return null;
  const existing = pos.activeTpSl;
  const token = marketStore.getToken(sym);
  const livePrice = curPrice > 0 ? curPrice : (token?.numericPrice || 1);
  const entryPrice = pos.avgBuyPrice > 0 ? pos.avgBuyPrice : livePrice;

  // Format helper for prices of different magnitudes
  const fmtP = (p: number) => {
    if (isNaN(p) || p <= 0) return "0.00";
    if (p < 0.00001) return p.toFixed(8);
    if (p < 0.001) return p.toFixed(6);
    if (p < 1) return p.toFixed(4);
    if (p < 10) return p.toFixed(3);
    return p.toFixed(2);
  };

  // Initial values
  const initTpPrice = existing?.tpPrice || entryPrice * 1.25;
  const initSlPrice = existing?.slPrice || entryPrice * 0.90;

  const [enableTp, setEnableTp] = useState<boolean>(existing ? !!existing.tpPrice : true);
  const [enableSl, setEnableSl] = useState<boolean>(existing ? !!existing.slPrice : true);
  const [tpPriceInput, setTpPriceInput] = useState<string>(fmtP(initTpPrice));
  const [slPriceInput, setSlPriceInput] = useState<string>(fmtP(initSlPrice));
  const [selectedTpChip, setSelectedTpChip] = useState<number | null>(existing?.tpPct || 25);
  const [selectedSlChip, setSelectedSlChip] = useState<number | null>(existing?.slPct || 10);

  // Derived current values
  const numTpPrice = parseFloat(tpPriceInput) || 0;
  const numSlPrice = parseFloat(slPriceInput) || 0;

  // Dynamic % ROI and Est profit/loss calculations
  const calcTpPct = entryPrice > 0 && numTpPrice > 0 ? ((numTpPrice - entryPrice) / entryPrice) * 100 : 0;
  const calcSlPct = entryPrice > 0 && numSlPrice > 0 ? ((entryPrice - numSlPrice) / entryPrice) * 100 : 0;

  const estProfitUsd = pos.bal > 0 && numTpPrice > 0 ? pos.bal * (numTpPrice - entryPrice) : 0;
  const estLossUsd = pos.bal > 0 && numSlPrice > 0 ? pos.bal * (entryPrice - numSlPrice) : 0;

  const handleTpChipClick = (pct: number) => {
    setSelectedTpChip(pct);
    const target = entryPrice * (1 + pct / 100);
    setTpPriceInput(fmtP(target));
  };

  const handleSlChipClick = (pct: number) => {
    setSelectedSlChip(pct);
    const target = entryPrice * (1 - pct / 100);
    setSlPriceInput(fmtP(target));
  };

  const handleTpInputChange = (val: string) => {
    setTpPriceInput(val);
    setSelectedTpChip(null);
  };

  const handleSlInputChange = (val: string) => {
    setSlPriceInput(val);
    setSelectedSlChip(null);
  };

  const handleConfirm = () => {
    if (!enableTp && !enableSl) {
      if (flash) flash("Enable at least Take Profit or Stop Loss");
      return;
    }
    if (enableTp && (numTpPrice <= 0 || isNaN(numTpPrice))) {
      if (flash) flash("Please enter a valid Take Profit target price");
      return;
    }
    if (enableSl && (numSlPrice <= 0 || isNaN(numSlPrice))) {
      if (flash) flash("Please enter a valid Stop Loss trigger price");
      return;
    }
    const finalTpPct = enableTp ? Math.round(calcTpPct) : undefined;
    const finalSlPct = enableSl ? Math.round(calcSlPct) : undefined;

    const res = marketStore.placeTpSlOrder({
      sym,
      amountTokens: pos.bal,
      tpPrice: enableTp ? numTpPrice : undefined,
      slPrice: enableSl ? numSlPrice : undefined,
      tpPct: finalTpPct,
      slPct: finalSlPct,
    });
    if (flash) flash(res.message);
    onClose();
  };

  const handleRemove = () => {
    if (existing?.id) {
      const res = marketStore.cancelPendingOrder(existing.id);
      if (flash) flash(res.message);
    }
    onClose();
  };

  return (
    <div className="tpsl-modal-backdrop" onClick={onClose}>
      <div className="tpsl-modal-card" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="tpsl-modal-header">
          <div className="tpsl-modal-title">
            <div className="tpsl-icon-badge">
              <Target size={16} />
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span>Take Profit & Stop Loss</span>
                <span className="tpsl-sym-pill">{sym}</span>
                <span className="tpsl-long-pill">LONG</span>
              </div>
              <span style={{ fontSize: 10, color: "var(--muted)", fontWeight: 500 }}>
                Bybit conditional market trigger on open position
              </span>
            </div>
          </div>
          <button type="button" className="tpsl-modal-close" onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </div>

        {/* Position Metrics Bar */}
        <div className="tpsl-pos-summary-bar">
          <div className="tpsl-summary-item">
            <span className="tpsl-summary-label">Position Size</span>
            <span className="tpsl-summary-val">
              {pos.bal >= 1000 ? pos.bal.toLocaleString(undefined, { maximumFractionDigits: 1 }) : pos.bal.toFixed(livePrice < 0.001 ? 0 : 4)} {sym}
            </span>
          </div>
          <div className="tpsl-summary-item">
            <span className="tpsl-summary-label">Avg Entry</span>
            <span className="tpsl-summary-val">${fmtP(entryPrice)}</span>
          </div>
          <div className="tpsl-summary-item">
            <span className="tpsl-summary-label">Last Mark Price</span>
            <span className="tpsl-summary-val" style={{ color: "#C4B5FD" }}>${fmtP(livePrice)}</span>
          </div>
          <div className="tpsl-summary-item">
            <span className="tpsl-summary-label">Position Value</span>
            <span className="tpsl-summary-val">${pos.currentVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
        </div>

        {/* Body */}
        <div className="tpsl-modal-body">
          {/* Take Profit Card */}
          <div className={`tpsl-section ${enableTp ? "section-active-tp" : "section-disabled"}`}>
            <div className="tpsl-section-head">
              <span className="tpsl-section-label">
                <Target size={14} color="#A78BFA" />
                <span>Take Profit (TP)</span>
              </span>
              <div
                className={`tpsl-toggle-switch ${enableTp ? "on" : "off"}`}
                onClick={() => setEnableTp(!enableTp)}
                role="switch"
                aria-checked={enableTp}
              >
                <div className="tpsl-toggle-knob" />
              </div>
            </div>

            {enableTp ? (
              <>
                <div className="tpsl-input-row">
                  <div className="tpsl-input-wrap">
                    <span className="tpsl-input-prefix">$</span>
                    <input
                      className="tpsl-input"
                      type="number"
                      step="any"
                      placeholder="Target trigger price"
                      value={tpPriceInput}
                      onChange={e => handleTpInputChange(e.target.value)}
                    />
                  </div>
                  <div className="tpsl-roi-badge tp">
                    +{calcTpPct > 0 ? calcTpPct.toFixed(1) : "0.0"}% ROI
                  </div>
                </div>

                <div className="tpsl-chips-row">
                  {[10, 25, 50, 100, 200].map(pct => (
                    <button
                      key={pct}
                      type="button"
                      className={`tpsl-chip ${selectedTpChip === pct ? "active-tp" : ""}`}
                      onClick={() => handleTpChipClick(pct)}
                    >
                      +{pct}%
                    </button>
                  ))}
                </div>

                <div className="tpsl-est-box">
                  <span style={{ color: "var(--muted)" }}>Est. Profit (at trigger):</span>
                  <span className="tpsl-est-gain">
                    +${Math.max(0, estProfitUsd).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT
                  </span>
                </div>
              </>
            ) : (
              <div className="tpsl-disabled-hint">
                Take Profit is disabled. Enable switch above to set an automated profit-taking trigger.
              </div>
            )}
          </div>

          {/* Stop Loss Card */}
          <div className={`tpsl-section ${enableSl ? "section-active-sl" : "section-disabled"}`}>
            <div className="tpsl-section-head">
              <span className="tpsl-section-label">
                <ShieldCheck size={14} color="#F87171" />
                <span>Stop Loss (SL)</span>
              </span>
              <div
                className={`tpsl-toggle-switch ${enableSl ? "on sl" : "off"}`}
                onClick={() => setEnableSl(!enableSl)}
                role="switch"
                aria-checked={enableSl}
              >
                <div className="tpsl-toggle-knob" />
              </div>
            </div>

            {enableSl ? (
              <>
                <div className="tpsl-input-row">
                  <div className="tpsl-input-wrap">
                    <span className="tpsl-input-prefix">$</span>
                    <input
                      className="tpsl-input"
                      type="number"
                      step="any"
                      placeholder="Stop trigger price"
                      value={slPriceInput}
                      onChange={e => handleSlInputChange(e.target.value)}
                    />
                  </div>
                  <div className="tpsl-roi-badge sl">
                    -{calcSlPct > 0 ? calcSlPct.toFixed(1) : "0.0"}% Loss
                  </div>
                </div>

                <div className="tpsl-chips-row">
                  {[5, 10, 15, 25, 50].map(pct => (
                    <button
                      key={pct}
                      type="button"
                      className={`tpsl-chip ${selectedSlChip === pct ? "active-sl" : ""}`}
                      onClick={() => handleSlChipClick(pct)}
                    >
                      -{pct}%
                    </button>
                  ))}
                </div>

                <div className="tpsl-est-box">
                  <span style={{ color: "var(--muted)" }}>Est. Loss (at trigger):</span>
                  <span className="tpsl-est-loss">
                    -${Math.abs(estLossUsd).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT
                  </span>
                </div>
              </>
            ) : (
              <div className="tpsl-disabled-hint">
                Stop Loss is disabled. Enable switch above to guard this position against drawdowns.
              </div>
            )}
          </div>

          {/* Explanatory notice */}
          <div className="tpsl-info-banner">
            <span style={{ color: "#A78BFA" }}>ℹ</span>
            <span>
              Orders execute automatically at Market Price once the Last Mark Price reaches your trigger. Tokens remain fully liquid in your wallet until executed.
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="tpsl-modal-foot">
          {existing && (
            <button type="button" className="tpsl-btn-remove" onClick={handleRemove}>
              Disarm TP/SL
            </button>
          )}
          <button type="button" className="tpsl-btn-cancel" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="tpsl-btn-confirm" onClick={handleConfirm}>
            Confirm TP/SL Triggers
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── User Executed Orders Component (Bybit Layout) ─────────────────── */
function UserOrdersList({
  sym,
  flash,
  onSelectCoin,
  onOpenProfitCard,
}: {
  sym?: string;
  flash?: (m: string) => void;
  onSelectCoin?: (s: string) => void;
  onOpenProfitCard?: (s: string) => void;
}) {
  const [, setTick] = useState(0);
  const [subTab, setSubTab] = useState<"positions" | "open" | "history">("positions");
  const [filterCurrentPair, setFilterCurrentPair] = useState<boolean>(false);
  const [modalTarget, setModalTarget] = useState<{ sym: string; pos: any; curPrice: number } | null>(null);

  useEffect(() => {
    return marketStore.subscribe(() => setTick(t => t + 1));
  }, [sym]);

  // Build real positions list from wallet balances
  const allBalances = marketStore.balances || {};
  const positionSyms = (filterCurrentPair && sym)
    ? [sym]
    : Object.keys(allBalances).filter(s => {
        const b = allBalances[s];
        return b && b.bal > 0.000001 && s !== "USDT" && s !== "USDC";
      });

  const positions = positionSyms
    .map(s => ({ sym: s, pos: marketStore.getUserPosition(s) }))
    .filter(({ pos }) => pos.hasPosition && pos.bal > 0.000001);

  // Filter open orders and history
  const pendingOrders = marketStore.getPendingOrders((filterCurrentPair && sym) ? sym : undefined);
  const orders = marketStore.getUserOrders((filterCurrentPair && sym) ? sym : undefined);

  // Total unrealized PnL
  const totalPnlUsd = positions.reduce((acc, curr) => acc + curr.pos.pnlUsd, 0);

  const fmtP = (p: number) => (p < 0.001 ? p.toFixed(8) : p < 1 ? p.toFixed(4) : p.toFixed(2));

  return (
    <div className="dex-orders-container">
      {modalTarget && (
        <SetTpSlModal
          isOpen={true}
          onClose={() => setModalTarget(null)}
          sym={modalTarget.sym}
          pos={modalTarget.pos}
          curPrice={modalTarget.curPrice}
          flash={flash}
        />
      )}

      <div className="dex-orders-subtabs" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", gap: 2 }}>
          <button
            className={`dex-orders-subtab ${subTab === "positions" ? "active" : ""}`}
            onClick={() => setSubTab("positions")}
          >
            Positions {positions.length > 0 && <span className="tab-count-badge">{positions.length}</span>}
          </button>
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

        {/* Toolbar: filter toggle and total PnL */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, paddingRight: 8 }}>
          {positions.length > 0 && subTab === "positions" && (
            <div style={{ fontSize: 11, fontWeight: 700 }}>
              <span style={{ color: "var(--muted)", marginRight: 4 }}>Total PnL:</span>
              <span style={{ color: totalPnlUsd >= -0.005 ? "var(--green)" : "var(--red)" }}>
                {totalPnlUsd >= -0.005 ? "+" : "-"}${Math.abs(totalPnlUsd).toFixed(2)}
              </span>
            </div>
          )}
          {sym && (
            <label className="bybit-filter-check" title="Toggle between all account positions vs current coin">
              <input
                type="checkbox"
                checked={filterCurrentPair}
                onChange={e => setFilterCurrentPair(e.target.checked)}
              />
              <span>{sym} only</span>
            </label>
          )}
        </div>
      </div>

      {subTab === "positions" ? (
        positions.length === 0 ? (
          <div className="orders-empty-state">
            <Coins size={24} color="var(--muted)" style={{ opacity: 0.5, marginBottom: 6 }} />
            <b>No open positions {filterCurrentPair && sym ? `for ${sym}` : ""}</b>
            <p>
              {filterCurrentPair && sym
                ? `You don't hold any ${sym}. Uncheck "${sym} only" above to see all your active trades.`
                : "Buy any token to open a position. Real holdings, live PnL, and Bybit TP/SL triggers will appear here."}
            </p>
          </div>
        ) : (
          <div className="bybit-positions-wrap">
            <table className="dex-table">
              <thead>
                <tr className="dex-th-row">
                  <th className="dex-th">COIN</th>
                  <th className="dex-th">SIZE</th>
                  <th className="dex-th">AVG ENTRY</th>
                  <th className="dex-th">MARKET PRICE</th>
                  <th className="dex-th">VALUE</th>
                  <th className="dex-th">UNREALISED PNL</th>
                  <th className="dex-th">TP / SL</th>
                  <th className="dex-th">ACTION</th>
                </tr>
              </thead>
              <tbody>
                {positions.map(({ sym: s, pos }) => {
                  const token = marketStore.getToken(s);
                  const curP = token?.numericPrice || 0;
                  const pnlPositive = pos.pnlUsd >= -0.005;
                  const tpSl = pos.activeTpSl;
                  return (
                    <tr key={s} className="dex-tr">
                      <td className="dex-td">
                        <div
                          style={{ display: "flex", alignItems: "center", gap: 6, cursor: onSelectCoin ? "pointer" : "default" }}
                          onClick={() => onSelectCoin?.(s)}
                          title="Click to view market chart"
                        >
                          <CoinImg sym={s} n={20} />
                          <div>
                            <div style={{ fontWeight: 800, color: "var(--text)", fontSize: 12, display: "flex", alignItems: "center", gap: 4 }}>
                              <span>{s}</span>
                              <span style={{ fontSize: 8.5, padding: "1px 5px", borderRadius: 3, background: "rgba(124, 58, 237, 0.18)", color: "#C4B5FD", fontWeight: 800 }}>LONG</span>
                            </div>
                            <div style={{ fontSize: 9.5, color: "var(--muted)" }}>{token?.name || s}</div>
                          </div>
                        </div>
                      </td>
                      <td className="dex-td" style={{ fontWeight: 700, color: "var(--text)" }}>
                        {pos.bal >= 1000
                          ? pos.bal.toLocaleString(undefined, { maximumFractionDigits: 1 })
                          : pos.bal.toFixed(curP < 0.001 ? 0 : 4)} {s}
                      </td>
                      <td className="dex-td" style={{ color: "var(--muted)", fontFamily: "monospace", fontSize: 11 }}>
                        ${fmtP(pos.avgBuyPrice)}
                      </td>
                      <td className="dex-td" style={{ color: "var(--text)", fontFamily: "monospace", fontSize: 11, fontWeight: 700 }}>
                        ${fmtP(curP)}
                      </td>
                      <td className="dex-td" style={{ fontWeight: 700, color: "var(--text)" }}>
                        ${pos.currentVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="dex-td">
                        <div style={{ display: "flex", flexDirection: "column" }}>
                          <span style={{ fontWeight: 800, color: pnlPositive ? "var(--green)" : "var(--red)", fontSize: 11 }}>
                            {pnlPositive ? "+" : "-"}${Math.abs(pos.pnlUsd).toFixed(2)}
                          </span>
                          <span style={{ fontSize: 9.5, color: pnlPositive ? "var(--green)" : "var(--red)", opacity: 0.85 }}>
                            {pnlPositive ? "+" : ""}{pos.pnlPct.toFixed(2)}%
                          </span>
                        </div>
                      </td>
                      <td className="dex-td">
                        {tpSl ? (
                          <div
                            className="bybit-tpsl-active-pill"
                            onClick={() => setModalTarget({ sym: s, pos, curPrice: curP })}
                            title="Click to adjust TP/SL settings"
                          >
                            <div className="bybit-tpsl-row">
                              {tpSl.tpPrice && (
                                <span style={{ color: "#34D399", fontWeight: 700 }}>
                                  🎯 TP: ${fmtP(tpSl.tpPrice)} (+{tpSl.tpPct}%)
                                </span>
                              )}
                              <button
                                type="button"
                                className="bybit-tpsl-cancel-btn"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const res = marketStore.cancelPendingOrder(tpSl.id);
                                  if (flash) flash(res.message);
                                }}
                                title="Disarm TP/SL"
                              >
                                ✕
                              </button>
                            </div>
                            {tpSl.slPrice && (
                              <div className="bybit-tpsl-row">
                                <span style={{ color: "#F87171", fontWeight: 700 }}>
                                  🛡️ SL: ${fmtP(tpSl.slPrice)} (-{tpSl.slPct}%)
                                </span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <button
                            type="button"
                            className="bybit-set-tpsl-btn"
                            onClick={() => setModalTarget({ sym: s, pos, curPrice: curP })}
                            title="Set Take Profit and Stop Loss triggers like Bybit"
                          >
                            <Target size={11} />
                            <span>+ Set TP/SL</span>
                          </button>
                        )}
                      </td>
                      <td className="dex-td">
                        <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
                          <button
                            type="button"
                            className="bybit-pos-close-btn"
                            onClick={() => {
                              const res = marketStore.placeOrder({ sym: s, side: "Sell", amount: pos.bal });
                              if (flash) flash(res.message);
                            }}
                            title="Close entire position at market price"
                          >
                            Close
                          </button>
                          {onOpenProfitCard && (
                            <button
                              type="button"
                              className="bybit-pos-pnl-btn"
                              onClick={() => onOpenProfitCard(s)}
                              title="Share PnL card"
                            >
                              <Share size={11} />
                              <span>PnL</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      ) : subTab === "open" ? (
        pendingOrders.length === 0 ? (
          <div className="orders-empty-state">
            <Coins size={24} color="var(--muted)" style={{ opacity: 0.5, marginBottom: 6 }} />
            <b>No open orders {filterCurrentPair && sym ? `for ${sym}` : ""}</b>
            <p>Place a Limit or TP/SL order to see it pending trigger here.</p>
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
                            Target: ${o.targetPrice && fmtP(o.targetPrice)}
                          </span>
                        ) : (
                          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                            {o.tpPrice && <span style={{ color: "var(--green)", fontWeight: 700 }}>TP: ${fmtP(o.tpPrice)} (+{o.tpPct}%)</span>}
                            {o.slPrice && <span style={{ color: "var(--red)", fontWeight: 700 }}>SL: ${fmtP(o.slPrice)} (-{o.slPct}%)</span>}
                          </div>
                        )}
                      </td>
                      <td className="dex-td" style={{ color: "var(--muted)", fontFamily: "monospace", fontSize: 11 }}>
                        ${fmtP(curP)}
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
            <b>No trade history yet {filterCurrentPair && sym ? `for ${sym}` : ""}</b>
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
                        ${(Number(o.amountUsd) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="dex-td" style={{ color: "var(--text)" }}>
                        {(() => {
                          const amt = Number(o.tokenAmt) || 0;
                          const p = Number(o.price) || 0;
                          return amt >= 1000 ? amt.toLocaleString(undefined, { maximumFractionDigits: 1 }) : amt.toFixed(p < 0.001 ? 0 : 4);
                        })()} {o.sym}
                      </td>
                      <td className="dex-td" style={{ color: "var(--muted)", fontFamily: "monospace", fontSize: 11 }}>
                        ${fmtP(o.price)}
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
function Trade({ flash, onOpenProfitCard }: { flash: (x: string) => void; onOpenProfitCard?: (sym: string) => void }) {
  const [selectedSym, setSelectedSym] = useState(() => {
    if (typeof localStorage !== "undefined") {
      const saved = localStorage.getItem("axiom_selected_sym");
      if (saved && saved !== "POPCAT" && marketStore.getToken(saved)) return saved;
    }
    return "BTC"; // BTC is the top coin!
  });
  const [side, setSide] = useState<"Buy" | "Sell">("Buy");
  const [orderExpanded, setOrderExpanded] = useState(true); // Keep order panel open and ready to trade
  const [orderType, setOrderType] = useState<"Market" | "Limit">("Market");
  const [limitPriceInput, setLimitPriceInput] = useState<string>("");
  const [tpSlTarget, setTpSlTarget] = useState<{ sym: string; pos: any; curPrice: number } | null>(null);
  const [mobilePosFilter, setMobilePosFilter] = useState<"all" | "current">("all");
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

  // Real user balances (support both USDT and USDC, plus native rails like SOL, ETH, BNB)
  const balances = marketStore.getBalances();
  const pairCurrency = (m.pair_currency || (m.isMajor ? "USDT" : "SOL")).toUpperCase();
  const isCash = pairCurrency === "USDT" || pairCurrency === "USDC" || pairCurrency === "USD";
  const availableUsdt = balances["USDT"]?.bal || 0;
  const availableUsdc = balances["USDC"]?.bal || 0;
  const availableCash = availableUsdt + availableUsdc;
  const availablePair = isCash ? availableCash : (balances[pairCurrency]?.bal || 0);
  const availableToken = balances[m.sym]?.bal || 0;
  const basePriceUsd = marketStore.getBasePriceUsd(pairCurrency);

  const handleQuickPct = (v: string) => {
    setQuickPct(v);
    const pct = v === "MAX" ? 100 : parseInt(v);
    if (side === "Buy") {
      const val = (availablePair * (pct / 100)).toFixed(isCash ? 2 : 4);
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
        pairCurrency,
      });
      flash(res.message);
      if (res.success) {
        setBelowChartTab("myOrders");
      }
      return;
    }

    const res = marketStore.placeOrder({
      sym: m.sym,
      side,
      amount: numAmt,
      pairCurrency,
    });
    flash(res.message);
  };

  // Live dynamic calculation for "You receive" based on base pair currency
  const numAmt = parseFloat(amountInput) || 0;
  const limitTargetP = parseFloat(limitPriceInput) || m.numericPrice;
  const buyTokensReceived = m.numericPrice > 0 ? (numAmt * basePriceUsd) / m.numericPrice : 0;
  const sellPairReceived = basePriceUsd > 0 ? (numAmt * m.numericPrice) / basePriceUsd : 0;

  const youReceiveStr = orderType === "Limit"
    ? side === "Buy"
      ? limitTargetP > 0 ? ((numAmt * basePriceUsd) / limitTargetP).toLocaleString(undefined, { maximumFractionDigits: limitTargetP < 0.001 ? 0 : 3 }) : "0"
      : isCash
        ? `$${(numAmt * limitTargetP).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        : `${((numAmt * limitTargetP) / basePriceUsd).toFixed(4)} ${pairCurrency}`
    : side === "Buy"
      ? buyTokensReceived.toLocaleString(undefined, { maximumFractionDigits: m.numericPrice < 0.001 ? 0 : 3 })
      : isCash
        ? `$${(numAmt * m.numericPrice).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        : `${sellPairReceived.toFixed(4)} ${pairCurrency}`;

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
                <i><b>{x.price}</b><Delta n={(x.is_rugged || x.numericPrice <= 0.00000001) ? "-99.99%" : x.change} size={9} /></i>
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
                  <b>{m.sym} / {m.pair_currency || (m.isMajor ? "USDT" : "SOL")}</b>
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
              <span className="dex-hero-price">{currMode === "USD" ? formatCoinPrice(m.price) : m.solPrice}</span>
              <span className="dex-live-pulse" />
            </div>
            <div className={`dex-hero-delta-badge ${m.changeNum >= 0 ? "up" : "down"}`}>
              {m.changeNum >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
              <span>{formatPercentage(m.change)}</span>
            </div>
          </div>

          {/* DexScreener 4-Timeframe Performance Bar (5M, 1H, 6H, 24H) */}
          <div className="dex-timeframe-strip">
            <div className={`dex-tf-chip ${m.m5.up ? "up" : "down"}`}>
              <span className="dex-tf-lbl">5M</span>
              <span className="dex-tf-val">{formatPercentage(m.m5.val)}</span>
            </div>
            <div className={`dex-tf-chip ${m.h1.up ? "up" : "down"}`}>
              <span className="dex-tf-lbl">1H</span>
              <span className="dex-tf-val">{formatPercentage(m.h1.val)}</span>
            </div>
            <div className={`dex-tf-chip ${m.h6.up ? "up" : "down"}`}>
              <span className="dex-tf-lbl">6H</span>
              <span className="dex-tf-val">{formatPercentage(m.h6.val)}</span>
            </div>
            <div className={`dex-tf-chip ${m.h24.up ? "up" : "down"}`}>
              <span className="dex-tf-lbl">24H</span>
              <span className="dex-tf-val">{formatPercentage(m.h24.val)}</span>
            </div>
          </div>

          {/* DexScreener High-Density Metrics Bar */}
          <div className="dex-metrics-scroll-track">
            <div className="dex-metric-card">
              <span className="dex-metric-label">LIQUIDITY</span>
              <span className="dex-metric-val" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                <span>{m.liq || "$28.4M"}</span>
                {marketStore.isTokenLiquidityLocked(m.sym) && !m.is_rugged && (
                  <span className="snap-lock-badge" title="Liquidity Locked" style={{ display: 'inline-flex', alignItems: 'center' }}>
                    <Lock size={10} />
                  </span>
                )}
              </span>
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
                {m.sym} / {m.pair_currency || (m.isMajor ? "USDT" : "SOL")}
                {marketStore.isTokenVerified(m.sym) && (
                  <span className="dex-verified-tag-sm">✓ Verified</span>
                )}
                {m.is_rugged && (
                  <span style={{ fontSize: 9, padding: "1px 6px", borderRadius: 4, background: "rgba(239,68,68,0.25)", color: "#EF4444", fontWeight: 800, border: "1px solid rgba(239,68,68,0.5)" }}>
                    ⚠️ RUGPULLED / DUMPED
                  </span>
                )}
              </b>
              <small style={{ display: "inline-flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                <span>{m.name}</span>
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
            <span>24h change<Delta n={(m.is_rugged || m.numericPrice <= 0.00000001) ? "-99.99%" : m.change} size={10} /></span>
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
                  flash(`Chart timeframe switched to ${tf === "1s" ? "LIVE" : tf}`);
                }}
              >
                {tf === "1s" ? (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#10B981", boxShadow: "0 0 6px #10B981", display: "inline-block" }} />
                    LIVE
                  </span>
                ) : tf}
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
          style={{ touchAction: "pan-y" }}
          title="Board height controls"
        >
          <div className="chart-bottom-arrows-wrap" style={{ touchAction: "pan-y" }}>
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
          <span
            className="resize-handle-bar"
            onMouseDown={(e) => {
              if (e.button === 0) handleStartResize(e);
            }}
            title="Drag to resize height"
            style={{ cursor: "ns-resize" }}
          />
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
                  Positions & Orders {(() => {
                    const posCount = Object.keys(marketStore.balances || {}).filter(s => {
                      const b = marketStore.balances[s];
                      return b && b.bal > 0.000001 && s !== "USDT" && s !== "USDC";
                    }).length;
                    const tot = posCount + marketStore.getPendingOrders().length;
                    return tot > 0 ? <span className="tab-count-badge">{tot}</span> : null;
                  })()}
                </button>
              </div>
              <small className="live-indicator">
                <span className="live-indicator-dot" />
                {belowChartTab === "trades" ? "Stream" : "Live Positions & Orders"}
              </small>
            </div>
            {belowChartTab === "trades" ? (
              <DexRecentTrades sym={m.sym} flash={flash} />
            ) : (
              <UserOrdersList
                sym={m.sym}
                flash={flash}
                onSelectCoin={selectCoin}
                onOpenProfitCard={onOpenProfitCard}
              />
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
              {Object.keys(marketStore.balances || {}).some(s => s !== "USDT" && s !== "USDC" && (marketStore.balances[s]?.bal || 0) > 0.000001) && (
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
                        {(["Market", "Limit"] as const).map(t => (
                          <button
                            key={t}
                            type="button"
                            className={orderType === t ? "active" : ""}
                            onClick={() => setOrderType(t)}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                      <span className="order-rate">1 {m.sym} = <b>{formatCoinPrice(m.numericPrice)}</b></span>
                    </div>

                    <label>
                      {side === "Buy" ? `Amount (${pairCurrency})` : `Amount (${m.sym})`}
                      <small>
                        {side === "Buy"
                          ? (isCash ? `Available: $${availableCash.toFixed(2)} (USDT/USDC)` : `Available: ${availablePair.toFixed(4)} ${pairCurrency}`)
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
                      <span>{side === "Buy" ? pairCurrency : m.sym}</span>
                    </div>
                    {/* Real-time USD conversion subtitle */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11, color: "var(--muted)", margin: "4px 2px 8px" }}>
                      <span>USD Value</span>
                      <b style={{ color: "#E2E8F0" }}>
                        ≈ ${(() => {
                          const val = parseFloat(amountInput) || 0;
                          const usdVal = side === "Buy"
                            ? (isCash ? val : val * (pairCurrency === "SOL" ? (marketStore.getToken("SOL")?.numericPrice || 179.84) : 1))
                            : val * m.numericPrice;
                          return usdVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                        })()} USD
                      </b>
                    </div>
                    <div className="quick-size">
                      {["25%", "50%", "75%", "MAX"].map(v => (
                        <button key={v} type="button" className={quickPct === v ? "active" : ""} onClick={() => handleQuickPct(v)}>{v}</button>
                      ))}
                    </div>

                    <label>Estimated Receive</label>
                    <div className="receive-input">
                      <b>{youReceiveStr}</b>
                      <span><CoinImg sym={side === "Buy" ? m.sym : pairCurrency} n={16} />{side === "Buy" ? m.sym : pairCurrency}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11, color: "var(--muted)", margin: "4px 2px 10px" }}>
                      <span>Equivalent Value</span>
                      <b style={{ color: "#10B981" }}>
                        ≈ ${(() => {
                          const val = parseFloat(amountInput) || 0;
                          const usdVal = side === "Buy"
                            ? (isCash ? val : val * (pairCurrency === "SOL" ? (marketStore.getToken("SOL")?.numericPrice || 179.84) : 1))
                            : val * m.numericPrice;
                          return usdVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                        })()} USD
                      </b>
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
                  const allBalances = marketStore.balances || {};
                  const allOpenPos = Object.keys(allBalances)
                    .filter(s => {
                      const b = allBalances[s];
                      return b && b.bal > 0.000001 && s !== "USDT" && s !== "USDC";
                    })
                    .map(s => {
                      const p = marketStore.getUserPosition(s);
                      const t = marketStore.getToken(s);
                      return { sym: s, pos: p, token: t, curPrice: t?.numericPrice || 0 };
                    })
                    .filter(({ pos }) => pos.hasPosition && pos.bal > 0.000001);

                  const filteredList = mobilePosFilter === "current"
                    ? allOpenPos.filter(item => item.sym.toUpperCase() === m.sym.toUpperCase())
                    : allOpenPos;

                  const totalPnl = allOpenPos.reduce((sum, item) => sum + item.pos.pnlUsd, 0);

                  const fmtP = (p: number) => (p < 0.00001 ? p.toFixed(8) : p < 0.001 ? p.toFixed(6) : p < 1 ? p.toFixed(4) : p.toFixed(2));

                  return (
                    <div className="mobile-positions-container">
                      {/* Filter & Summary Header */}
                      <div className="mobile-pos-filter-bar">
                        <div style={{ display: "flex", gap: 6 }}>
                          <button
                            type="button"
                            className={`mobile-pos-filter-pill ${mobilePosFilter === "all" ? "active" : ""}`}
                            onClick={() => setMobilePosFilter("all")}
                          >
                            All Positions {allOpenPos.length > 0 && <span className="tab-count-badge">{allOpenPos.length}</span>}
                          </button>
                          <button
                            type="button"
                            className={`mobile-pos-filter-pill ${mobilePosFilter === "current" ? "active" : ""}`}
                            onClick={() => setMobilePosFilter("current")}
                          >
                            {m.sym} Only
                          </button>
                        </div>
                        {allOpenPos.length > 0 && (
                          <div style={{ fontSize: 11, fontWeight: 700 }}>
                            <span style={{ color: "var(--muted)", marginRight: 4 }}>Total PnL:</span>
                            <span style={{ color: totalPnl >= -0.005 ? "#34D399" : "#F87171" }}>
                              {totalPnl >= -0.005 ? "+" : "-"}${Math.abs(totalPnl).toFixed(2)}
                            </span>
                          </div>
                        )}
                      </div>

                      {filteredList.length === 0 ? (
                        <div className="orders-empty-state" style={{ padding: "30px 16px" }}>
                          <Coins size={26} color="var(--muted)" style={{ opacity: 0.6, marginBottom: 8 }} />
                          <b style={{ fontSize: 13, color: "#F3F4F6" }}>
                            {mobilePosFilter === "current" ? `No open position for ${m.sym}` : "No open positions"}
                          </b>
                          <p style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 4, lineHeight: 1.5 }}>
                            {mobilePosFilter === "current"
                              ? `You don't hold any ${m.sym}. Switch to "All Positions" or place an order below.`
                              : "Execute a Market or Limit trade to open a position. Real holdings, live PnL, and Bybit TP/SL triggers will appear here."}
                          </p>
                          <button
                            type="button"
                            className="btn-primary"
                            style={{
                              marginTop: 14,
                              padding: "8px 24px",
                              fontSize: 12,
                              background: "linear-gradient(135deg, #7C3AED, #6366F1)",
                              border: "none",
                              borderRadius: 8,
                              color: "#fff",
                              fontWeight: 700,
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 6
                            }}
                            onClick={() => { setSide("Buy"); setMobileSubTab("order"); }}
                          >
                            <Zap size={13} /> Buy {m.sym} Now
                          </button>
                        </div>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                          {filteredList.map(({ sym: posSym, pos, curPrice: curP }) => {
                            const pnlPositive = pos.pnlUsd >= -0.005;
                            const isDipping = pos.pnlPct < -0.4;
                            const isPumping = pos.pnlPct > 0.4;
                            const tpSl = pos.activeTpSl;
                            return (
                              <div key={posSym} className="mobile-pos-card">
                                {/* Top Header */}
                                <div className="mobile-pos-header">
                                  <div
                                    style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}
                                    onClick={() => selectCoin(posSym)}
                                    title="Click to view chart"
                                  >
                                    <CoinImg sym={posSym} n={24} />
                                    <div>
                                      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                                        <b style={{ color: "#F3F4F6", fontSize: 13 }}>{posSym}</b>
                                        <span className="mobile-pos-long-tag">LONG</span>
                                      </div>
                                      <span style={{ fontSize: 10, color: "var(--muted)" }}>
                                        ${fmtP(curP)}
                                      </span>
                                    </div>
                                  </div>
                                  <div style={{ textAlign: "right" }}>
                                    <div style={{ fontWeight: 800, fontSize: 12, color: pnlPositive ? "#34D399" : "#F87171" }}>
                                      {pnlPositive ? "+" : "-"}${Math.abs(pos.pnlUsd).toFixed(2)}
                                    </div>
                                    <div style={{ fontSize: 10, fontWeight: 700, color: pnlPositive ? "#34D399" : "#F87171" }}>
                                      {pnlPositive ? "+" : ""}{pos.pnlPct.toFixed(2)}%
                                    </div>
                                  </div>
                                </div>

                                {/* Metrics Grid */}
                                <div className="mobile-pos-grid">
                                  <div className="mobile-pos-cell">
                                    <span className="mobile-pos-k">Coin Owned</span>
                                    <span className="mobile-pos-v">
                                      {pos.bal >= 1000 ? pos.bal.toLocaleString(undefined, { maximumFractionDigits: 1 }) : pos.bal.toFixed(curP < 0.001 ? 0 : 4)} {posSym}
                                    </span>
                                  </div>
                                  <div className="mobile-pos-cell">
                                    <span className="mobile-pos-k">Avg Entry</span>
                                    <span className="mobile-pos-v">${fmtP(pos.avgBuyPrice)}</span>
                                  </div>
                                  <div className="mobile-pos-cell">
                                    <span className="mobile-pos-k">Position Value</span>
                                    <span className="mobile-pos-v">${pos.currentVal.toFixed(2)}</span>
                                  </div>
                                  <div className="mobile-pos-cell">
                                    <span className="mobile-pos-k">Status</span>
                                    <span className={`mobile-pos-v ${isPumping ? "up" : isDipping ? "down" : ""}`} style={{ fontSize: 10 }}>
                                      {isPumping ? "🔥 Pumping" : isDipping ? "🔻 Dipping" : "● Holding"}
                                    </span>
                                  </div>
                                </div>

                                {/* Bybit-Style TP/SL Row */}
                                {tpSl ? (
                                  <div className="mobile-pos-tpsl-armed-card">
                                    <div className="mobile-pos-tpsl-info">
                                      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                                        <Target size={12} color="#A78BFA" />
                                        <span style={{ fontSize: 11, fontWeight: 700, color: "#C4B5FD" }}>TP/SL Armed</span>
                                      </div>
                                      <div style={{ display: "flex", gap: 8, fontSize: 10.5, marginTop: 2, flexWrap: "wrap" }}>
                                        {tpSl.tpPrice && (
                                          <span style={{ color: "#34D399", fontWeight: 700 }}>
                                            🎯 TP: ${fmtP(tpSl.tpPrice)} (+{tpSl.tpPct}%)
                                          </span>
                                        )}
                                        {tpSl.slPrice && (
                                          <span style={{ color: "#F87171", fontWeight: 700 }}>
                                            🛡️ SL: ${fmtP(tpSl.slPrice)} (-{tpSl.slPct}%)
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                    <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
                                      <button
                                        type="button"
                                        className="mobile-pos-tpsl-btn-edit"
                                        onClick={() => setTpSlTarget({ sym: posSym, pos, curPrice: curP })}
                                        title="Adjust TP/SL triggers"
                                      >
                                        Edit
                                      </button>
                                      <button
                                        type="button"
                                        className="mobile-pos-tpsl-btn-del"
                                        onClick={() => {
                                          const res = marketStore.cancelPendingOrder(tpSl.id);
                                          flash(res.message);
                                        }}
                                        title="Disarm TP/SL"
                                      >
                                        ✕
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    className="mobile-pos-set-tpsl-btn"
                                    onClick={() => setTpSlTarget({ sym: posSym, pos, curPrice: curP })}
                                    title="Set Take Profit and Stop Loss triggers like Bybit"
                                  >
                                    <Target size={13} color="#C4B5FD" />
                                    <span>+ Set Take Profit & Stop Loss (TP/SL)</span>
                                  </button>
                                )}

                                {/* Quick Actions */}
                                <div className="user-pos-quick-actions" style={{ marginTop: 8, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                                  <button
                                    type="button"
                                    className="user-pos-quick-btn"
                                    style={{ padding: "7px 0", fontSize: 11, fontWeight: 700, borderRadius: 7 }}
                                    onClick={() => {
                                      const sellAmt = pos.bal * 0.5;
                                      const res = marketStore.placeOrder({ sym: posSym, side: "Sell", amount: sellAmt });
                                      flash(res.message);
                                    }}
                                  >
                                    Sell 50%
                                  </button>
                                  <button
                                    type="button"
                                    className="user-pos-quick-btn user-pos-close-btn"
                                    style={{ padding: "7px 0", fontSize: 11, fontWeight: 700, borderRadius: 7 }}
                                    onClick={() => {
                                      const res = marketStore.placeOrder({ sym: posSym, side: "Sell", amount: pos.bal });
                                      flash(res.message);
                                    }}
                                  >
                                    Close Position
                                  </button>
                                </div>

                                {onOpenProfitCard && (
                                  <button
                                    type="button"
                                    onClick={() => onOpenProfitCard(posSym)}
                                    className="pos-share-pnl-btn"
                                    style={{ marginTop: 6, padding: "6px 0", fontSize: 11 }}
                                  >
                                    <Share size={12} />
                                    <span>Share PnL Card</span>
                                  </button>
                                )}
                              </div>
                            );
                          })}
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
                      <span className="user-pos-k">Avg Entry</span>
                      <span className="user-pos-v highlight-spent">
                        {formatCoinPrice(pos.avgBuyPrice)}
                        <small>Invested: ${pos.invested.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</small>
                      </span>
                    </div>
                    <div className="user-pos-row pos-pnl-row">
                      <span className="user-pos-k">Unrealized P&L</span>
                      <span className={`user-pos-v ${pos.pnlUsd >= -0.005 ? "up" : "down"}`}>
                        <b>{pos.pnlUsd >= -0.005 ? "+" : ""}${Math.max(0, pos.pnlUsd).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</b>
                        <small>({pos.pnlPct >= -0.005 ? "+" : ""}{pos.pnlPct.toFixed(2)}%)</small>
                      </span>
                    </div>

                    {/* TP/SL armed indicator or Set button linked to Bybit modal */}
                    {pos.activeTpSl ? (
                      <div
                        className="pos-tpsl-armed-badge"
                        onClick={() => setTpSlTarget({ sym: m.sym, pos, curPrice: m.numericPrice })}
                        style={{ cursor: "pointer" }}
                        title="Click to view and adjust TP/SL settings"
                      >
                        <Target size={11} color="#A78BFA" />
                        <span>TP/SL Armed — 🎯 {pos.activeTpSl.tpPct ? `+${pos.activeTpSl.tpPct}%` : "Off"} · 🛡️ {pos.activeTpSl.slPct ? `-${pos.activeTpSl.slPct}%` : "Off"}</span>
                        <span style={{ marginLeft: "auto", fontSize: 9.5, color: "#C4B5FD" }}>Edit →</span>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="bybit-set-tpsl-btn"
                        style={{ width: "100%", justifyContent: "center", padding: "6px 0", marginTop: 4 }}
                        onClick={() => setTpSlTarget({ sym: m.sym, pos, curPrice: m.numericPrice })}
                        title="Set Take Profit & Stop Loss triggers like Bybit"
                      >
                        <Target size={11} />
                        <span>+ Set Take Profit & Stop Loss (TP/SL)</span>
                      </button>
                    )}

                    {/* Quick Sell buttons */}
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
                        className="user-pos-quick-btn user-pos-close-btn"
                        onClick={() => {
                          const res = marketStore.placeOrder({ sym: m.sym, side: "Sell", amount: pos.bal });
                          flash(res.message);
                        }}
                        title="Close full position at market price"
                      >
                        Close Position
                      </button>
                    </div>

                    {/* Share PnL Card */}
                    <button
                      type="button"
                      onClick={() => onOpenProfitCard && onOpenProfitCard(m.sym)}
                      className="pos-share-pnl-btn"
                    >
                      <Share size={13} />
                      <span>Share PnL Card</span>
                    </button>
                  </div>
                ) : (
                  <div className="user-pos-empty">
                    You haven't bought any {m.sym} yet. Use the form below to open a position.
                  </div>
                )}
              </div>
            );
          })()}

          {/* Collapsible Buy / Sell Order Panel */}
          <div className="order-panel-container">
            <div className="side-tabs">
              <button
                type="button"
                className={`buy ${side === "Buy" ? "active" : ""}`}
                onClick={() => {
                  setSide("Buy");
                  setOrderExpanded(true);
                }}
                title={`Buy ${m.sym}`}
              >
                <span>Buy {m.sym}</span>
              </button>
              <button
                type="button"
                className={`sell ${side === "Sell" ? "active" : ""}`}
                onClick={() => {
                  setSide("Sell");
                  setOrderExpanded(true);
                }}
                title={`Sell ${m.sym}`}
              >
                <span>Sell {m.sym}</span>
              </button>
            </div>

            <div className="order-form-collapsible expanded">
              <div className="order-form-inner">
                <div className="order-form-top-row">
                  <div className="order-type">
                    {(["Market", "Limit"] as const).map(t => (
                      <button
                        key={t}
                        className={orderType === t ? "active" : ""}
                        onClick={() => {
                          setOrderType(t);
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
                      {side === "Buy" ? `Spend ${pairCurrency}` : `Sell ${m.sym}`}
                      <small>
                        Available: {side === "Buy"
                          ? (isCash ? `$${availableCash.toFixed(2)} (USDT/USDC)` : `${availablePair.toFixed(4)} ${pairCurrency}`)
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
                      <span>{side === "Buy" ? pairCurrency : m.sym}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--muted)", margin: "3px 2px 6px" }}>
                      <span>USD Value:</span>
                      <b style={{ color: "#E2E8F0" }}>
                        ≈ ${(() => {
                          const val = parseFloat(amountInput) || 0;
                          const usdVal = side === "Buy"
                            ? (isCash ? val : val * (pairCurrency === "SOL" ? (marketStore.getToken("SOL")?.numericPrice || 179.84) : 1))
                            : val * m.numericPrice;
                          return usdVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                        })()} USD
                      </b>
                    </div>
                    <div className="quick-size">
                      {["25%", "50%", "75%", "MAX"].map(v => (
                        <button key={v} className={quickPct === v ? "active" : ""} onClick={() => handleQuickPct(v)}>{v}</button>
                      ))}
                    </div>

                    <label>Estimated Receive (at Target Price)</label>
                    <div className="receive-input">
                      <b>{youReceiveStr}</b>
                      <span><CoinImg sym={side === "Buy" ? m.sym : pairCurrency} n={16} />{side === "Buy" ? m.sym : pairCurrency}</span>
                    </div>

                    <div className="order-summary">
                      <span>Order Type<b>Limit {side}</b></span>
                      <span>Target Price<b>{formatCoinPrice(limitTargetP)}</b></span>
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
                ) : (
                  <>
                    <label>
                      {side === "Buy" ? `Pay with ${pairCurrency}` : `Sell ${m.sym}`}
                      <small>
                        Available: {side === "Buy"
                          ? (isCash ? `$${availableCash.toFixed(2)} (USDT/USDC)` : `${availablePair.toFixed(4)} ${pairCurrency}`)
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
                      <span>{side === "Buy" ? pairCurrency : m.sym}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--muted)", margin: "3px 2px 6px" }}>
                      <span>USD Value:</span>
                      <b style={{ color: "#E2E8F0" }}>
                        ≈ ${(() => {
                          const val = parseFloat(amountInput) || 0;
                          const usdVal = side === "Buy"
                            ? (isCash ? val : val * (pairCurrency === "SOL" ? (marketStore.getToken("SOL")?.numericPrice || 179.84) : 1))
                            : val * m.numericPrice;
                          return usdVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                        })()} USD
                      </b>
                    </div>
                    <div className="quick-size">
                      {["25%", "50%", "75%", "MAX"].map(v => (
                        <button key={v} className={quickPct === v ? "active" : ""} onClick={() => handleQuickPct(v)}>{v}</button>
                      ))}
                    </div>
                    <label>You receive</label>
                    <div className="receive-input">
                      <b>{youReceiveStr}</b>
                      <span><CoinImg sym={side === "Buy" ? m.sym : pairCurrency} n={16} />{side === "Buy" ? m.sym : pairCurrency}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--muted)", margin: "3px 2px 6px" }}>
                      <span>Equivalent Value:</span>
                      <b style={{ color: "#10B981" }}>
                        ≈ ${(() => {
                          const val = parseFloat(amountInput) || 0;
                          const usdVal = side === "Buy"
                            ? (isCash ? val : val * (pairCurrency === "SOL" ? (marketStore.getToken("SOL")?.numericPrice || 179.84) : 1))
                            : val * m.numericPrice;
                          return usdVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                        })()} USD
                      </b>
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

      {/* Axiom Bybit-Style Set Take Profit & Stop Loss Modal */}
      {tpSlTarget && (
        <SetTpSlModal
          isOpen={true}
          onClose={() => setTpSlTarget(null)}
          sym={tpSlTarget.sym}
          pos={tpSlTarget.pos}
          curPrice={tpSlTarget.curPrice}
          flash={flash}
        />
      )}
    </div>
  );
}

function WalletView({ modal, flash, onSelectCoin, onNavigate, authUser, onOpenProfitCard }: { modal: (m: Modal) => void; flash?: (x: string) => void; onSelectCoin?: (sym: string) => void; onNavigate?: (v: View) => void; authUser?: AuthUser; onOpenProfitCard?: (sym: string) => void }) {
  const [searchQ, setSearchQ] = useState("");
  const [copied, setCopied] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    return marketStore.subscribe(() => setTick(t => t + 1));
  }, []);

  const userAddress = authUser?.wallet_address || "AxB8s9sHynawdTUeioAgqcQKQ7Y6LvrdiN6ybE6YSrWU";
  const userUid = authUser?.user_id
    ? `AXM-${authUser.user_id.replace(/[^a-zA-Z0-9]/g, "").slice(0, 8).toUpperCase()}`
    : (userAddress ? `AXM-${userAddress.replace(/[^a-zA-Z0-9]/g, "").slice(0, 8).toUpperCase()}` : "AXM-8F2A9C");

  const handleCopy = () => {
    copyToClipboard(userUid);
    setCopied(true);
    if (flash) flash(`Axiom UID copied: ${userUid}`);
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

    // Include major tokens and stablecoins
    const candidateTokens = [...default8Syms, "USDT", "USDC"];
    candidateTokens.forEach(sym => {
      const t = marketStore.getToken(sym);
      if (t) {
        list.push(t);
        added.add(sym.toUpperCase());
        added.add(sym.toUpperCase().replace(/^\$/, ""));
      }
    });

    // If user holds any other coin (e.g. USDT, USDC, or a bought/created meme coin), include it in the roll
    Object.entries(rawBalances).forEach(([sym, b]) => {
      const rawSym = (sym || "").toUpperCase().trim();
      const cleanSym = rawSym.replace(/^\$/, "");
      if (b.bal > 0.000001 && !added.has(cleanSym) && !added.has(rawSym)) {
        let t = marketStore.getToken(cleanSym);
        if (!t) {
          t = {
            sym: cleanSym,
            name: b.name || cleanSym,
            price: b.avgBuyPrice ? `$${b.avgBuyPrice.toFixed(2)}` : "$1.00",
            numericPrice: b.avgBuyPrice || 1.0,
            solPrice: "0.0055 SOL",
            change: "+0.00%",
            changeNum: 0,
            cap: "$1M",
            fdv: "$1M",
            liq: "$100K",
            pos: true,
            supply: 1000000000,
            m5: { val: "0%", up: true },
            h1: { val: "0%", up: true },
            h6: { val: "0%", up: true },
            h24: { val: "0%", up: true },
            txns: 0, buys: 0, sells: 0, vol: 0, buyVol: 0, sellVol: 0, traders: 0, buyers: 0, sellers: 0,
            imageUrl: cleanSym === "USDT" ? COIN_IMGS.USDT : undefined,
          };
        }
        list.push(t);
        added.add(cleanSym);
        added.add(rawSym);
      }
    });

    const mapped = list.map(token => {
      const rawSym = (token.sym || "").toUpperCase().trim();
      const cleanSym = rawSym.replace(/^\$/, "");
      const isStable = cleanSym === "USDC" || cleanSym === "USDT";
      const b = rawBalances[token.sym] || rawBalances[cleanSym] || rawBalances[`$${cleanSym}`] || rawBalances[rawSym];
      const balNum = b?.bal || 0;
      const impliedPrice = (b && b.bal > 0 && b.usdValue > 0) ? (b.usdValue / b.bal) : (b?.avgBuyPrice || 0);
      const effectivePrice = token.numericPrice > 0 ? token.numericPrice : (impliedPrice || (isStable ? 1.0 : 0));
      const userUsd = isStable ? balNum : (b?.usdValue !== undefined && b?.usdValue > 0 ? b.usdValue : (balNum * effectivePrice));
      const invested = b?.totalInvested !== undefined && b?.totalInvested > 0 ? b.totalInvested : (balNum * (b?.avgBuyPrice || effectivePrice));
      const pnlUsd = isStable ? 0 : (userUsd - invested);
      const pnlPct = isStable || invested <= 0 ? 0 : (pnlUsd / invested) * 100;
      const sparkline = isStable ? [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1] : (token.sparkline || generateSparkline(effectivePrice, token.pos));

      return {
        sym: cleanSym,
        name: cleanSym === "USDC" ? "USD Coin" : cleanSym === "USDT" ? "Tether USD" : cleanSym === "SOL" ? "Solana" : (token.name || b?.name || cleanSym),
        imageUrl: token.imageUrl || (cleanSym === "USDT" ? COIN_IMGS.USDT : undefined),
        poolAddress: token.poolAddress,
        price: formatCoinPrice(token.price),
        numericPrice: effectivePrice,
        chg: isStable ? "+0.00%" : formatPercentage(token.change),
        pos: isStable ? true : token.pos,
        sparkline,
        balNum,
        userUsd,
        invested,
        pnlUsd,
        pnlPct,
        isStable,
        isRugged: !!token.is_rugged,
      };
    });

    // Requirement 7: Any coin where user has a balance (e.g. USDT, SOL, or bought coin) MUST BE AT THE VERY TOP!
    // Sorted descending by userUsd value so highest balance is #1.
    mapped.sort((a, b) => {
      const aHasMoney = a.userUsd > 0.005 || a.balNum > 0.000001;
      const bHasMoney = b.userUsd > 0.005 || b.balNum > 0.000001;
      if (aHasMoney && !bHasMoney) return -1;
      if (!aHasMoney && bHasMoney) return 1;
      if (aHasMoney && bHasMoney) {
        return b.userUsd - a.userUsd;
      }
      return 0;
    });

    return mapped;
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
  const stableBalanceSum = (rawBalances["USDT"]?.bal || 0) + (rawBalances["USDC"]?.bal || 0);
  const calculatedTotalWithBuys = stableBalanceSum + totalValueOfBought;
  const totalPortfolioValue = Math.max(portfolioMetrics.totalValue, calculatedTotalWithBuys > 0 ? calculatedTotalWithBuys : 0);
  const effectiveDiffUsd = totalBoughtPnl > 0.005 ? (totalBoughtPnl + (marketStore.realizedProfit24h || 0)) : portfolioMetrics.diffUsd;
  const isUp = effectiveDiffUsd >= -0.0049;
  const effectiveDiffPct = totalMoneyInvestedInBought > 0 ? totalBoughtPnlPct : portfolioMetrics.diffPct;

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
          price: formatCoinPrice(token.price),
          numericPrice: token.numericPrice,
          chg: isStable ? "+0.00%" : formatPercentage(token.change),
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
      {/* UID & Universal Search strip */}
      <div className="wallet-topbar">
        <button className="addr-chip" onClick={handleCopy} title="Click to copy your Axiom UID">
          <span className="addr-dot" />
          <span style={{ fontFamily: "monospace", fontSize: 10, fontWeight: 700 }}>
            {copied ? <span style={{ color: "var(--green)" }}>Copied!</span> : `UID: ${userUid}`}
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
            {isUp ? "+" : "-"}${Math.abs(effectiveDiffUsd).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <span style={{ color: "var(--muted)", fontSize: 12 }}>·</span>
          {isUp ? (
            <TrendingUp size={14} color="var(--green)" />
          ) : (
            <TrendingDown size={14} color="var(--red)" />
          )}
          <span style={{ color: isUp ? "var(--green)" : "var(--red)" }}>
            {isUp ? "+" : ""}{effectiveDiffPct.toFixed(2)}% today
          </span>
        </div>

        {/* 5 Core Action buttons */}
        <div className="wallet-actions">
          {[
            { label: "Deposit", icon: <ArrowDownToLine size={20} />, primary: true, action: () => modal("deposit") },
            { label: "Buy", icon: <CreditCard size={20} />, primary: false, action: () => modal("buy") },
            { label: "Send", icon: <Send size={20} />, primary: false, action: () => modal("send") },
            { label: "Swap", icon: <ArrowDownUp size={20} />, primary: false, action: () => onNavigate ? onNavigate("swap") : modal("confirm") },
            { label: "Withdraw", icon: <ArrowUpToLine size={20} />, primary: false, action: () => modal("withdraw") },
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
              <div className="major-coin-price">{formatCoinPrice(c.price)}</div>
              <div className={`major-coin-chg ${c.pos ? "up" : "down"}`}>
                {formatPercentage(c.change)}
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
      </div>

      {/* Permanent Clean Assets Roll (Matching user screenshot: Clean 2-column layout) */}
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
                  <div className="asset-fullname" title={b.name}>{b.name}</div>
                </div>
              </div>

              <div className="asset-right">
                <div className="asset-price">
                  {b.balNum > 0.000001
                    ? `$${b.userUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                    : b.price}
                </div>
                <div className="asset-sub-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
                  {b.balNum > 0.000001 && (
                    <span style={{ fontSize: 12, color: "var(--muted)", fontWeight: 500 }}>
                      {b.balNum >= 1000 ? b.balNum.toLocaleString(undefined, { maximumFractionDigits: 1 }) : b.balNum.toFixed(b.numericPrice < 0.001 ? 0 : 4)} {b.sym}
                    </span>
                  )}
                  {(() => {
                    const hasHolding = b.balNum > 0.000001 && !b.isStable && b.invested > 0;
                    if (assetTab === "buys" || hasHolding) {
                      const isProfit = b.pnlUsd >= -0.005;
                      const pnlText = `${isProfit ? "+" : "-"}${Math.abs(b.pnlPct).toFixed(2)}%`;
                      return (
                        <span className={`asset-change ${isProfit ? "up" : "down"}`} title="Position return (PnL %)">
                          {pnlText}
                        </span>
                      );
                    }
                    return (
                      <span className={`asset-change ${b.pos ? "up" : "down"}`}>
                        {b.chg}
                      </span>
                    );
                  })()}
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
    name: "USD Coin (USDC Dollar)",
    price: "$1.00",
    numPrice: 1.0,
    bal: balances["USDC"]?.bal || 0,
  });
  allAvailable.push({
    sym: "USDT",
    name: "Tether USD (USDT Dollar)",
    price: "$1.00",
    numPrice: 1.0,
    bal: balances["USDT"]?.bal || 0,
  });
  allAvailable.push({
    sym: "USD",
    name: "US Dollar (Fiat / Cash)",
    price: "$1.00",
    numPrice: 1.0,
    bal: balances["USD"]?.bal || 0,
  });

  // All tokens from marketStore
  tokens.forEach(t => {
    if (["USDC", "USDT", "USD"].includes(t.sym.toUpperCase())) return;
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
  const isDollarQuery = q === "dollar" || q === "dollars" || q === "usd";
  const filtered = allAvailable.filter(t => {
    if (!q) return true;
    if (isDollarQuery && (t.sym === "USDT" || t.sym === "USDC" || t.sym === "USD")) return true;
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
  const [paySym, setPaySym] = useState<string>("USDT");
  const [receiveSym, setReceiveSym] = useState<string>("SOL");
  const [payAmt, setPayAmt] = useState<string>("");
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
          <div className="swap-header-badge">
            <Zap size={11} /> Solana DEX Aggregator
          </div>
          <h1>Instant swap</h1>
          <small>Direct routing with lowest slippage and 0% protocol markup.</small>
        </div>
        <button
          type="button"
          onClick={() => setShowSettings(!showSettings)}
          className="header-icon-btn"
          title="Swap settings"
          style={{ width: 38, height: 38, borderRadius: 12, marginBottom: 4 }}
        >
          <Sliders size={16} color={showSettings ? "#A78BFA" : "var(--muted)"} />
        </button>
      </div>

      {showSettings && (
        <div style={{
          background: "rgba(22, 19, 38, 0.8)",
          border: "1px solid rgba(139, 92, 246, 0.25)",
          borderRadius: 18,
          padding: 16,
          marginBottom: 16,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          backdropFilter: "blur(12px)",
        }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text)" }}>Slippage Tolerance</div>
            <div style={{ fontSize: 11, color: "var(--muted)" }}>Transaction auto-reverts if price moves unfavorably</div>
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
                  borderRadius: 9999,
                  padding: "4px 10px",
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
              placeholder="0"
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
              <CoinImg sym={paySym} n={24} url={payToken?.imageUrl} />
              <span>{paySym}</span>
              <ChevronDown size={14} />
            </button>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
            <div className="swap-usd-val">
              ≈ ${payUsdVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
            </div>
            {/* Quick balance percentage chips */}
            <div style={{ display: "flex", gap: 5 }}>
              {[0.25, 0.5, 0.75, 1.0].map((pct, idx) => (
                <button
                  key={idx}
                  type="button"
                  className="swap-quick-chip"
                  onClick={() => handleQuickPct(pct)}
                >
                  {pct === 1.0 ? "MAX" : `${pct * 100}%`}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Switch Tokens Invert Button (Circular Floating Switch) */}
        <div className="swap-switch-wrap">
          <button
            type="button"
            className="swap-switch"
            onClick={flipTokens}
            title="Invert tokens"
          >
            <ArrowDownUp size={17} />
          </button>
        </div>

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
              <CoinImg sym={receiveSym} n={24} url={receiveToken?.imageUrl} />
              <span>{receiveSym}</span>
              <ChevronDown size={14} />
            </button>
          </div>
          <div className="swap-usd-val">
            ≈ ${receiveUsdVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
          </div>
        </div>

        {/* Swap Metrics & Rates */}
        <div className="swap-data">
          <div className="swap-route-visualizer">
            <span>{paySym}</span>
            <span style={{ display: "flex", alignItems: "center", gap: 5, color: "#10B981", fontWeight: 700 }}>
              <i style={{ width: 6, height: 6, borderRadius: "50%", background: "#10B981", display: "inline-block" }} />
              Jupiter V6 Direct SPL
            </span>
            <span>{receiveSym}</span>
          </div>
          <div style={{ height: 1, background: "rgba(255, 255, 255, 0.05)", margin: "3px 0" }} />
          <span>
            <span>Exchange rate</span>
            <b>1 {paySym} ≈ {exchangeRate >= 1000 ? exchangeRate.toLocaleString(undefined, { maximumFractionDigits: 2 }) : exchangeRate < 0.0001 ? exchangeRate.toFixed(8) : exchangeRate.toFixed(4)} {receiveSym}</b>
          </span>
          <span>
            <span>Inverse rate</span>
            <b>1 {receiveSym} ≈ {invRate >= 1000 ? invRate.toLocaleString(undefined, { maximumFractionDigits: 2 }) : invRate < 0.0001 ? invRate.toFixed(8) : invRate.toFixed(4)} {paySym}</b>
          </span>
          <span>
            <span>Network gas fee</span>
            <span className="swap-data-pill">0.000005 SOL (~$0.0009)</span>
          </span>
          <span>
            <span>Slippage tolerance</span>
            <b style={{ color: "#A78BFA" }}>{slippage} (Auto)</b>
          </span>
        </div>

        {/* Action Button */}
        {isInsufficient ? (
          <button
            type="button"
            className="btn-primary"
            style={{ opacity: 0.65, cursor: "not-allowed", background: "linear-gradient(135deg, #EF4444 0%, #DC2626 100%)" }}
            disabled
          >
            Insufficient {paySym} balance ({payBal.toFixed(4)} available)
          </button>
        ) : payNum <= 0 ? (
          <button
            type="button"
            className="btn-primary"
            style={{ opacity: 0.65, cursor: "not-allowed" }}
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
            <Zap size={16} /> Review instant swap
          </button>
        )}
      </div>



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
function ModalBox({
  type,
  close,
  flash,
  authUser,
  onNavigate,
}: {
  type: Modal;
  close: () => void;
  flash: (x: string) => void;
  authUser?: AuthUser;
  onNavigate?: (v: View) => void;
}) {
  const done = (x: string) => { close(); flash(x); };

  if (type === "deposit") {
    return <DepositPage onClose={close} onDone={done} flash={flash} authUser={authUser} />;
  }

  if (type === "buy") {
    return (
      <BuyPage
        onClose={close}
        onDone={done}
        flash={flash}
        authUser={authUser}
        onNavigateToProfile={() => {
          close();
          onNavigate?.("profile");
        }}
      />
    );
  }

  if (type === "send") {
    return (
      <SendPage
        onClose={close}
        onDone={done}
        flash={flash}
        authUser={authUser}
      />
    );
  }

  if (type === "withdraw") {
    return (
      <WithdrawPage
        onClose={close}
        onDone={done}
        flash={flash}
        authUser={authUser}
        initialMode="crypto"
        onNavigateToProfile={() => {
          close();
          onNavigate?.("profile");
        }}
      />
    );
  }

  if (type === "profit") {
    return (
      <ProfitShareModal
        isOpen={true}
        onClose={close}
        authUser={authUser}
        flash={flash}
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

  // Country & Currency preferences (Defaults to US, requires password to change)
  const [userCountryCode, setUserCountryCode] = useState<string>(() => {
    return localStorage.getItem("axiom_user_country") || "US";
  });
  const [showCountryModal, setShowCountryModal] = useState<boolean>(false);
  const [rateTick, setRateTick] = useState<number>(0);

  // Password verification modal for country change
  const [showPwModal, setShowPwModal] = useState<boolean>(false);
  const [pwVerifyInput, setPwVerifyInput] = useState<string>("");
  const [pwVerifyLoading, setPwVerifyLoading] = useState<boolean>(false);
  const [pwVerifyError, setPwVerifyError] = useState<string | null>(null);
  const [showPwVerifyText, setShowPwVerifyText] = useState<boolean>(false);

  const selectedCountry = useMemo(() => {
    return getCountryByCode(userCountryCode);
  }, [userCountryCode, rateTick]);

  useEffect(() => {
    syncDollarRateFromBackend();
    const handleRateChange = () => {
      const savedCode = localStorage.getItem("axiom_user_country") || "US";
      setUserCountryCode(savedCode);
      setRateTick((t) => t + 1);
    };
    window.addEventListener("axiom_dollar_rate_updated", handleRateChange);
    return () => window.removeEventListener("axiom_dollar_rate_updated", handleRateChange);
  }, []);

  const handleOpenCountryChange = () => {
    setPwVerifyInput("");
    setPwVerifyError(null);
    setShowPwModal(true);
  };

  const handleVerifyPasswordForCountry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pwVerifyInput) {
      setPwVerifyError("Please enter your account password to authorize changing your country.");
      return;
    }
    setPwVerifyLoading(true);
    setPwVerifyError(null);
    try {
      if (authUser?.email) {
        const res = await login({
          email: authUser.email,
          password: pwVerifyInput,
          remember_me: false,
        });
        if (res.success) {
          setShowPwModal(false);
          setPwVerifyInput("");
          setShowCountryModal(true);
          flash("Password verified! Choose your new country and currency.");
        } else {
          setPwVerifyError(res.error || "Incorrect password. Verification failed.");
        }
      } else {
        setShowPwModal(false);
        setPwVerifyInput("");
        setShowCountryModal(true);
        flash("Password confirmed! Choose your new country.");
      }
    } catch (err: any) {
      setPwVerifyError(err.message || "Failed to verify password. Please try again.");
    } finally {
      setPwVerifyLoading(false);
    }
  };

  const handleSelectCountry = (c: CountryInfo) => {
    setUserCountryCode(c.code);
    localStorage.setItem("axiom_user_country", c.code);
    setShowCountryModal(false);
    window.dispatchEvent(new Event("axiom_dollar_rate_updated"));
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

  // User Profile Identity state (Avatar & Username)
  const initialUsername = authUser.username || (typeof localStorage !== "undefined" ? localStorage.getItem("axiom_user_username") : "") || authUser.full_name || authUser.email?.split("@")[0] || "Trader";
  const initialAvatar = authUser.avatar_url || (typeof localStorage !== "undefined" ? localStorage.getItem("axiom_user_avatar") : "") || generatePhantomAvatar(initialUsername);

  const [profileUsername, setProfileUsername] = useState(initialUsername);
  const [profileAvatarUrl, setProfileAvatarUrl] = useState(initialAvatar);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSavedMsg, setProfileSavedMsg] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      setProfileError("Image must be smaller than 15MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          const size = 256; // High-resolution retina avatar square
          canvas.width = size;
          canvas.height = size;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            setProfileAvatarUrl(event.target?.result as string);
            return;
          }

          // Center-crop to square
          const minDim = Math.min(img.width, img.height);
          const startX = (img.width - minDim) / 2;
          const startY = (img.height - minDim) / 2;

          ctx.drawImage(img, startX, startY, minDim, minDim, 0, 0, size, size);
          const compressed = canvas.toDataURL("image/jpeg", 0.88);
          setProfileAvatarUrl(compressed);
          setProfileError(null);
          setProfileSavedMsg(null);
        } catch {
          setProfileAvatarUrl(event.target?.result as string);
        }
      };
      img.onerror = () => {
        setProfileError("Could not process this image. Please select another picture.");
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleRandomizeAvatar = () => {
    const randomSeed = Math.random().toString(36).substring(2, 9);
    const newAvatar = generatePhantomAvatar(randomSeed);
    setProfileAvatarUrl(newAvatar);
    setProfileError(null);
    setProfileSavedMsg(null);
  };

  const handleSelectPreset = (preset: AvatarPreset) => {
    const newAvatar = generatePresetAvatar(preset);
    setProfileAvatarUrl(newAvatar);
    setProfileError(null);
    setProfileSavedMsg(null);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileUsername.trim()) {
      setProfileError("Username cannot be empty.");
      return;
    }
    setProfileSaving(true);
    setProfileError(null);
    setProfileSavedMsg(null);

    const cleanUser = profileUsername.trim();

    // 1. Optimistically commit to local state & storage immediately
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("axiom_user_username", cleanUser);
      if (profileAvatarUrl) {
        localStorage.setItem("axiom_user_avatar", profileAvatarUrl);
      }
    }
    authUser.username = cleanUser;
    authUser.full_name = cleanUser;
    if (profileAvatarUrl) {
      authUser.avatar_url = profileAvatarUrl;
    }
    window.dispatchEvent(new Event("axiom_profile_updated"));

    // 2. Sync with cloud backend
    try {
      const res = await updateUserProfile({
        username: cleanUser,
        avatar_url: profileAvatarUrl,
        wallet_address: authUser.wallet_address,
      });
      if (res.success) {
        setProfileSavedMsg("Profile and avatar successfully updated!");
        flash("Profile identity saved!");
      } else {
        setProfileSavedMsg("Profile updated and saved to your device!");
        flash("Profile identity saved!");
      }
    } catch {
      setProfileSavedMsg("Profile updated and saved to your device!");
      flash("Profile identity saved!");
    } finally {
      setProfileSaving(false);
    }
  };

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
          <div style={{ position: "relative", width: 78, height: 78, flexShrink: 0 }}>
            <div
              className="profile-avatar-large"
              style={{
                width: "100%",
                height: "100%",
                borderRadius: "50%",
                overflow: "hidden",
                cursor: "pointer",
                border: "2.5px solid rgba(167, 139, 250, 0.5)",
                boxShadow: "0 0 20px rgba(124, 58, 237, 0.35)",
                background: "linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              onClick={() => fileInputRef.current?.click()}
              title="Click to change your avatar image"
            >
              {profileAvatarUrl ? (
                <img
                  src={profileAvatarUrl}
                  alt="Profile Avatar"
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  onError={(e) => { (e.target as any).src = generatePhantomAvatar(profileUsername); }}
                />
              ) : (
                <span style={{ fontSize: 24, fontWeight: 800, color: "#fff" }}>{userInitials}</span>
              )}
            </div>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
              title="Upload new avatar image"
              style={{
                position: "absolute",
                bottom: -2,
                right: -2,
                width: 26,
                height: 26,
                borderRadius: "50%",
                background: "linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%)",
                border: "2px solid #0B0D17",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                cursor: "pointer",
                boxShadow: "0 2px 8px rgba(0,0,0,0.5)",
                padding: 0,
                zIndex: 2,
              }}
            >
              <Camera size={12} />
            </button>
          </div>
          <div className="profile-hero-info">
            <div className="profile-name-row">
              <span className="profile-name">{profileUsername || displayName}</span>
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
                onClick={handleOpenCountryChange}
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
        {/* ── Trader Identity & Custom Avatar Card ── */}
        <div className="profile-card profile-identity-card" style={{ gridColumn: "1 / -1", overflow: "hidden" }}>
          <div className="profile-card-title">
            <Users size={18} />
            <span>Trader Identity & Avatar</span>
            <span style={{ fontSize: 10, background: "rgba(124, 58, 237, 0.18)", color: "#C4B5FD", padding: "2px 8px", borderRadius: 10, fontWeight: 700, marginLeft: "auto" }}>
              PUBLIC LEADERBOARD IDENTITY
            </span>
          </div>
          <p style={{ fontSize: 11, color: "var(--muted)", margin: "0 0 14px 0" }}>
            Customize your public trader username and avatar. Your avatar and username are shown on the global Leaderboard and DEX terminals.
          </p>

          {profileError && (
            <div style={{ background: "rgba(239, 68, 68, 0.12)", border: "1px solid rgba(239, 68, 68, 0.3)", borderRadius: 8, padding: "8px 12px", color: "#FCA5A5", fontSize: 12, marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
              <AlertTriangle size={14} />
              <span>{profileError}</span>
            </div>
          )}

          {profileSavedMsg && (
            <div style={{ background: "rgba(16, 185, 129, 0.12)", border: "1px solid rgba(16, 185, 129, 0.3)", borderRadius: 8, padding: "8px 12px", color: "#6EE7B7", fontSize: 12, marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
              <CheckCircle size={14} />
              <span>{profileSavedMsg}</span>
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 16, width: "100%", minWidth: 0 }}>
            {/* Top row: Avatar + Floating Edit Badge + Username input + Save */}
            <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap", width: "100%", minWidth: 0 }}>
              <div style={{ position: "relative", width: 72, height: 72, flexShrink: 0 }}>
                <div
                  style={{
                    width: "100%",
                    height: "100%",
                    borderRadius: "50%",
                    overflow: "hidden",
                    border: "2.5px solid #7C3AED",
                    boxShadow: "0 0 16px rgba(124, 58, 237, 0.4)",
                    cursor: "pointer",
                    background: "#1E1B2E",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  title="Click to upload custom avatar"
                >
                  <img
                    src={profileAvatarUrl}
                    alt="Avatar"
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    onError={(e) => { (e.target as any).src = generatePhantomAvatar(profileUsername); }}
                  />
                </div>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                  title="Upload photo"
                  style={{
                    position: "absolute",
                    bottom: -2,
                    right: -2,
                    width: 26,
                    height: 26,
                    borderRadius: "50%",
                    background: "linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%)",
                    border: "2px solid #0B0D17",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#fff",
                    cursor: "pointer",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.5)",
                    padding: 0,
                  }}
                >
                  <Camera size={12} />
                </button>
              </div>

              <div style={{ flex: "1 1 180px", minWidth: 0, maxWidth: "100%" }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: "var(--text)", display: "block", marginBottom: 6 }}>
                  Trader Username
                </label>
                <div style={{ display: "flex", gap: 8, alignItems: "center", width: "100%", minWidth: 0 }}>
                  <input
                    type="text"
                    value={profileUsername}
                    onChange={(e) => setProfileUsername(e.target.value)}
                    maxLength={30}
                    placeholder="Enter trader username"
                    style={{
                      flex: 1,
                      minWidth: 0,
                      background: "rgba(255, 255, 255, 0.05)",
                      border: "1px solid rgba(255, 255, 255, 0.12)",
                      borderRadius: 8,
                      padding: "8px 12px",
                      color: "var(--text)",
                      fontSize: 13,
                      fontFamily: "inherit"
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleSaveProfile}
                    disabled={profileSaving || !profileUsername.trim()}
                    style={{
                      flexShrink: 0,
                      background: "linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%)",
                      border: "none",
                      borderRadius: 8,
                      padding: "8px 16px",
                      color: "#fff",
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: profileSaving ? "wait" : "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                      whiteSpace: "nowrap"
                    }}
                  >
                    {profileSaving ? "Saving..." : "Save"}
                  </button>
                </div>
              </div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={handleAvatarFileUpload}
            />

            {/* Avatar Presets Row */}
            <div style={{ marginTop: 6 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: 0.5 }}>
                  Choose Identity Preset
                </span>
                <button
                  type="button"
                  onClick={handleRandomizeAvatar}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#C4B5FD",
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    padding: 0
                  }}
                >
                  <RefreshCw size={11} /> 🎲 Randomize
                </button>
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                {PHANTOM_AVATAR_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleSelectPreset(preset)}
                    style={{
                      background: preset.gradient,
                      border: "2px solid rgba(255,255,255,0.2)",
                      borderRadius: "50%",
                      width: 40,
                      height: 40,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 18,
                      cursor: "pointer",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
                      transition: "transform 150ms",
                    }}
                    title={preset.name}
                  >
                    {preset.icon}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    border: "1.5px dashed rgba(255,255,255,0.25)",
                    borderRadius: "50%",
                    width: 40,
                    height: 40,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--muted)",
                    cursor: "pointer"
                  }}
                  title="Upload photo from device"
                >
                  <Camera size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>

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
              onClick={handleOpenCountryChange}
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
              title="Change trading region & currency (requires password verification)"
            >
              <Lock size={13} /> Change
            </button>
          </div>
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

        {/* Account Session Card */}
        <div className="profile-card">
          <div className="profile-card-title">
            <LogOut size={18} color="#F87171" />
            <span>Account Session</span>
          </div>
          <p style={{ fontSize: 11, color: "var(--muted)", margin: "0 0 14px 0" }}>
            End your active trading session and securely sign out of your wallet on this device.
          </p>

          <button
            type="button"
            onClick={onLogout}
            style={{
              width: "100%",
              background: "rgba(239, 68, 68, 0.12)",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              color: "#F87171",
              borderRadius: 10,
              padding: "12px",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              transition: "all 150ms"
            }}
          >
            <LogOut size={16} /> Sign Out of Axiom Wallet
          </button>
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
                  const isP2P = o.orderType === "P2P Transfer" || o.triggerNote?.includes("UID") || o.triggerNote?.includes("P2P");
                  return (
                    <tr key={o.id} className="dex-tr">
                      <td className="dex-td">
                        <span className={`dex-badge ${isP2P ? "" : isSwap ? "dex-badge-buy" : isBuy ? "dex-badge-buy" : "dex-badge-sell"}`}
                          style={
                            isP2P
                              ? { background: "rgba(139, 92, 246, 0.2)", color: "#C4B5FD", borderColor: "rgba(139, 92, 246, 0.45)" }
                              : isSwap
                              ? { background: "rgba(6, 182, 212, 0.2)", color: "#67E8F9", borderColor: "rgba(6, 182, 212, 0.45)" }
                              : undefined
                          }
                        >
                          {isP2P ? "P2P SEND" : isSwap ? "SWAP" : o.side.toUpperCase()}
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
                        {(() => {
                          const amt = Number(o.tokenAmt) || 0;
                          return amt >= 1000 ? amt.toLocaleString(undefined, { maximumFractionDigits: 1 }) : amt.toFixed(4);
                        })()}
                      </td>
                      <td className="dex-td" style={{ fontFamily: "monospace", fontSize: 11, color: "#10B981", fontWeight: 700 }}>
                        ${(Number(o.amountUsd) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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

      {/* Password Authorization Modal for Country Change */}
      {showPwModal && (
        <div className="overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowPwModal(false); }}>
          <div className="modal" style={{ maxWidth: 420 }}>
            <button className="close-btn" onClick={() => setShowPwModal(false)}>
              <X size={14} />
            </button>
            <div style={{ textAlign: "center", marginBottom: 16 }}>
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: "50%",
                  background: "rgba(124, 58, 237, 0.18)",
                  border: "1.5px solid rgba(167, 139, 250, 0.4)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 12px",
                  color: "#C4B5FD",
                }}
              >
                <Lock size={26} />
              </div>
              <h2 style={{ fontSize: 18, fontWeight: 800, margin: "0 0 6px" }}>
                Verify Account Password
              </h2>
              <p style={{ fontSize: 12, color: "var(--muted)", margin: 0, lineHeight: 1.5 }}>
                To change your registered trading country and local currency, please confirm your identity by entering your account password.
              </p>
            </div>

            <form onSubmit={handleVerifyPasswordForCountry} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div className="profile-input-group">
                <label style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)" }}>
                  Account Password
                </label>
                <div style={{ position: "relative" }}>
                  <input
                    type={showPwVerifyText ? "text" : "password"}
                    placeholder="Enter your account password"
                    value={pwVerifyInput}
                    onChange={(e) => setPwVerifyInput(e.target.value)}
                    autoFocus
                    style={{
                      width: "100%",
                      padding: "11px 40px 11px 12px",
                      background: "rgba(0, 0, 0, 0.35)",
                      border: "1px solid rgba(255, 255, 255, 0.12)",
                      borderRadius: 10,
                      color: "#fff",
                      fontSize: 13,
                      outline: "none",
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwVerifyText(!showPwVerifyText)}
                    style={{
                      position: "absolute",
                      right: 12,
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "none",
                      border: "none",
                      color: "var(--muted)",
                      cursor: "pointer",
                      padding: 0,
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
                    {showPwVerifyText ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {pwVerifyError && (
                <div
                  style={{
                    padding: "8px 12px",
                    borderRadius: 8,
                    background: "rgba(239, 68, 68, 0.14)",
                    border: "1px solid rgba(239, 68, 68, 0.3)",
                    color: "#F87171",
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  ⚠️ {pwVerifyError}
                </div>
              )}

              <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={pwVerifyLoading}
                  style={{ flex: 1, padding: "11px" }}
                >
                  {pwVerifyLoading ? "Verifying..." : "Verify & Unlock"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowPwModal(false)}
                  style={{
                    padding: "11px 16px",
                    background: "rgba(255, 255, 255, 0.06)",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    borderRadius: 10,
                    color: "var(--muted)",
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
      const rawHash = window.location.hash.toLowerCase().replace("#", "");
      const hash = rawHash.split("?")[0];
      if (hash === "admin") return "admin";
      if (hash === "profile") {
        try { window.location.hash = "wallet"; } catch {}
        return "wallet";
      }
      if (hash === "trade" || hash === "swap" || hash === "wallet" || hash === "leaderboard") return hash as View;
      const saved = localStorage.getItem("axiom_active_view") as View;
      if (saved === "admin") return "admin";
      if (saved === "profile") return "wallet";
      if (saved && ["wallet", "trade", "swap", "leaderboard"].includes(saved)) return saved;
    }
    return "wallet";
  };

  const [view, setView] = useState<View>(getInitialView);
  const [modal, setModal] = useState<Modal>("");
  const [profitModalSym, setProfitModalSym] = useState<string | null>(null);
  const [toast, setToast] = useState("");
  const [menu, setMenu] = useState(false);
  const [resendingVerif, setResendingVerif] = useState(false);
  const [resendSent, setResendSent] = useState(false);
  const { toggleTheme, isLight } = useTheme();

  useEffect(() => {
    const handleHashChange = () => {
      const rawHash = window.location.hash.toLowerCase().replace("#", "");
      const hash = rawHash.split("?")[0];
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

  // Intercept payment gateway return callback (from Swiftsats)
  useEffect(() => {
    if (typeof window === "undefined") return;

    const parsePaymentCallback = () => {
      const searchParams = new URLSearchParams(window.location.search);
      const hash = window.location.hash;
      const hashQuery = hash.includes("?") ? hash.substring(hash.indexOf("?") + 1) : "";
      const hashParams = new URLSearchParams(hashQuery);

      const payment = searchParams.get("payment") || hashParams.get("payment");
      const orderId = searchParams.get("orderId") || hashParams.get("orderId") || searchParams.get("order_id") || hashParams.get("order_id");
      const coin = (searchParams.get("coin") || hashParams.get("coin") || searchParams.get("crypto") || hashParams.get("crypto") || "USDT").toUpperCase();
      const amountStr = searchParams.get("amount") || hashParams.get("amount");

      if (payment === "success" && orderId) {
        const creditedAmount = parseFloat(amountStr || "0");
        if (creditedAmount > 0) {
          marketStore.depositFunds(coin, creditedAmount);
        }

        const userAddr = authUser?.wallet_address || authUser?.email || localStorage.getItem("axiom_wallet_address") || "axiom_user";
        api.creditSwiftsatsOrder({
          address: userAddr,
          order_id: orderId,
          amount_usd: amountStr || "10.0",
          currency: coin,
        }).catch(() => {});

        // Clean query parameters from URL without reloading
        const cleanUrl = window.location.pathname + "#wallet";
        window.history.replaceState({}, document.title, cleanUrl);
      }
    };

    parsePaymentCallback();
    window.addEventListener("hashchange", parsePaymentCallback);
    return () => window.removeEventListener("hashchange", parsePaymentCallback);
  }, [authUser]);

  const navigateTo = (v: View) => {
    setView(v);
    window.location.hash = v;
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("axiom_active_view", v);
    }
  };

  const [islandToast, setIslandToast] = useState<{ id: number; message: string } | null>(null);
  const islandTimerRef = useRef<any>(null);

  const flash = (msg: string) => {
    if (!msg) return;
    if (islandTimerRef.current) clearTimeout(islandTimerRef.current);
    setIslandToast({ id: Date.now(), message: msg });
    islandTimerRef.current = setTimeout(() => {
      setIslandToast(null);
    }, 4000);
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

  const [profileTick, setProfileTick] = useState(0);
  useEffect(() => {
    const handleProfileUpdate = () => setProfileTick((t) => t + 1);
    window.addEventListener("axiom_profile_updated", handleProfileUpdate);
    return () => window.removeEventListener("axiom_profile_updated", handleProfileUpdate);
  }, []);

  const cleanFullName = (typeof localStorage !== "undefined" ? localStorage.getItem("axiom_user_username") : null) || authUser.username || authUser.full_name || authUser.email?.split("@")[0] || "Account 1";
  const userInitials = cleanFullName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() || "A1";
  const displayName = cleanFullName;
  const userAvatar = (typeof localStorage !== "undefined" ? localStorage.getItem("axiom_user_avatar") : null) || authUser.avatar_url;

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

      {/* ── iOS 26 Dynamic Island Top Floating Toast ── */}
      {islandToast && (
        <div
          className="ios26-dynamic-island"
          onClick={() => setIslandToast(null)}
          title="Click to dismiss notification"
        >
          <div className="ios26-island-content">
            <div className="ios26-icon-wrap">
              <AxiomLogo size={22} withGlow={false} />
            </div>
            <div className="ios26-text-wrap">
              <span className="ios26-title">
                {islandToast.message.toLowerCase().includes("swap")
                  ? "Instant Swap Filled"
                  : islandToast.message.toLowerCase().includes("take profit") || islandToast.message.toLowerCase().includes("tp/sl")
                  ? "Take-Profit Target Set"
                  : islandToast.message.toLowerCase().includes("sent") || islandToast.message.toLowerCase().includes("transfer")
                  ? "Axiom Ledger Transfer"
                  : islandToast.message.toLowerCase().includes("bought") || islandToast.message.toLowerCase().includes("buy")
                  ? "Order Executed (Buy)"
                  : islandToast.message.toLowerCase().includes("sold") || islandToast.message.toLowerCase().includes("sell")
                  ? "Order Executed (Sell)"
                  : islandToast.message.toLowerCase().includes("withdr")
                  ? "Withdrawal Dispatched"
                  : islandToast.message.toLowerCase().includes("deposit")
                  ? "Deposit Confirmed"
                  : "Axiom Notification"}
              </span>
              <span className="ios26-msg">{islandToast.message.replace(/^[✅❌🚀💸⚡\s]+/, "")}</span>
            </div>
            <div className="ios26-pulse-indicator">
              <span className="ios26-pulse-dot" />
            </div>
          </div>
        </div>
      )}

      <header className="app-header">
        <button className="app-brand" onClick={() => navigateTo("wallet")} style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <AxiomLogo size={32} />
          <span>AXIOM</span>
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

          {/* User profile chip clickable for all users */}
          <button
            type="button"
            className={`user-chip ${view === "profile" ? "active" : ""}`}
            onClick={() => navigateTo("profile")}
            title="User Profile & Settings"
          >
            <div className="user-avatar" style={{ overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {userAvatar ? (
                <img src={userAvatar} alt="Avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                userInitials
              )}
            </div>
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
        {view === "trade" && <Trade flash={flash} onOpenProfitCard={(sym) => setProfitModalSym(sym)} />}
        {view === "wallet" && <WalletView authUser={authUser} modal={setModal} flash={flash} onNavigate={navigateTo} onSelectCoin={(sym) => { marketStore.setActiveSym(sym); navigateTo("trade"); }} onOpenProfitCard={(sym) => setProfitModalSym(sym)} />}
        {view === "swap" && <SwapView modal={setModal} flash={flash} />}
        {view === "leaderboard" && <LeaderboardView authUser={authUser} onNavigate={navigateTo} onSelectCoin={(sym) => { marketStore.setActiveSym(sym); navigateTo("trade"); }} flash={flash} modal={(m: any) => setModal(m)} onOpenDeposit={() => setModal("deposit")} />}
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

      {modal && <ModalBox authUser={authUser} type={modal} close={() => setModal("")} flash={flash} onNavigate={navigateTo} />}

      {profitModalSym && (
        <ProfitShareModal
          isOpen={Boolean(profitModalSym)}
          onClose={() => setProfitModalSym(null)}
          initialSym={profitModalSym}
          authUser={authUser}
          flash={flash}
        />
      )}


    </div>
  );
}


/* ── ROOT APP ────────────────────────────────────────────────────────────── */
export default function App() {
  const [authUser, setAuthUser] = useState<AuthUser | null>(() => {
    if (typeof window === "undefined" || !window.localStorage) return null;
    const isUnlocked = localStorage.getItem("axiom_unlocked_session") === "true";
    const raw = localStorage.getItem("axiom_auth_user");
    if (isUnlocked && raw) {
      try {
        const u = JSON.parse(raw);
        if (u && (u.wallet_address || u.user_id || u.email)) {
          try { marketStore.setUser(u); } catch {}
          return u;
        }
      } catch {}
    }
    return null;
  });
  const [authChecked, setAuthChecked] = useState<boolean>(() => {
    if (typeof window === "undefined" || !window.localStorage) return false;
    const isUnlocked = localStorage.getItem("axiom_unlocked_session") === "true";
    const raw = localStorage.getItem("axiom_auth_user");
    return Boolean(isUnlocked && raw);
  });

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
    try {
      syncDollarRateFromBackend().catch(() => {});
    } catch {}

    const safetyTimer = setTimeout(() => {
      setAuthChecked(true);
    }, 1200);

    getMe()
      .then((user) => {
        if (user) {
          setAuthUser(user);
          if (typeof localStorage !== "undefined") {
            localStorage.setItem("axiom_unlocked_session", "true");
            localStorage.setItem("axiom_auth_user", JSON.stringify(user));
          }
          try {
            marketStore.setUser(user);
          } catch (e) {
            console.warn("marketStore.setUser error:", e);
          }
          if (user?.wallet_address) {
            try {
              localStorage.setItem("axiom_wallet_address", user.wallet_address);
            } catch {}
          }
        } else {
          // If server didn't return user, keep local unlocked session so reload never asks for password
          const raw = typeof localStorage !== "undefined" ? localStorage.getItem("axiom_auth_user") : null;
          if (raw) {
            try {
              const u = JSON.parse(raw);
              if (u && (u.wallet_address || u.user_id || u.email)) {
                setAuthUser(u);
                try { marketStore.setUser(u); } catch {}
              }
            } catch {}
          }
        }
      })
      .catch((err) => {
        console.warn("Backend session check offline/error, keeping local session active:", err);
      })
      .finally(() => {
        clearTimeout(safetyTimer);
        setAuthChecked(true);
      });

    return () => clearTimeout(safetyTimer);
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
    try {
      await logout();
    } catch {}
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem("axiom_unlocked_session");
      localStorage.removeItem("axiom_auth_user");
    }
    setAuthUser(null);
    marketStore.setUser(null);
  };

  if (!authChecked) {
    return (
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        height: "100vh", background: "var(--bg, #0A0B14)", flexDirection: "column", gap: 18,
        position: "fixed", inset: 0, zIndex: 99999
      }}>
        <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{
            position: "absolute",
            width: 90, height: 90,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(124,58,237,0.35) 0%, rgba(6,182,212,0.15) 50%, transparent 70%)",
            filter: "blur(8px)",
            pointerEvents: "none"
          }} />
          <AxiomLogo size={64} withGlow={true} />
        </div>
        <div style={{
          fontFamily: "'Outfit', 'Inter', system-ui, sans-serif",
          fontWeight: 800,
          fontSize: 18,
          letterSpacing: "0.16em",
          color: "var(--text, #FFFFFF)",
          textTransform: "uppercase"
        }}>
          AXIOM WALLET
        </div>
        <div style={{
          fontSize: 12,
          color: "var(--text-muted, #94A3B8)",
          fontFamily: "'Inter', system-ui, sans-serif",
          letterSpacing: "0.04em"
        }}>
          Loading Axiom Wallet...
        </div>
        <div style={{
          width: 140, height: 3,
          background: "var(--border, rgba(255,255,255,0.08))",
          borderRadius: 999, overflow: "hidden", position: "relative"
        }}>
          <div style={{
            position: "absolute", top: 0, left: 0, height: "100%", width: "40%",
            background: "linear-gradient(90deg, #7C3AED, #06B6D4)",
            borderRadius: 999,
            animation: "axiomPulseBar 1.4s ease-in-out infinite"
          }} />
        </div>
        <style>{`
          @keyframes axiomPulseBar {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(250%); }
          }
        `}</style>
      </div>
    );
  }

  if (!authUser) {
    return (
      <PhantomAuth
        onAuth={(user) => {
          if (typeof localStorage !== "undefined") {
            localStorage.setItem("axiom_unlocked_session", "true");
            localStorage.setItem("axiom_auth_user", JSON.stringify(user));
            localStorage.setItem("axiom_active_view", "wallet");
          }
          if (typeof window !== "undefined") {
            window.location.hash = "wallet";
          }
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
