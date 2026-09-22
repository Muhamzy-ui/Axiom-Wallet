import React, { useState, useEffect, useMemo } from "react";
import {
  Trophy, TrendingUp, TrendingDown, Crown, Shield, ShieldCheck, Zap,
  Search, ArrowUpRight, Copy, Check, Filter, ExternalLink, Activity,
  Users, Flame, Sparkles, X, ChevronRight, Sliders, DollarSign, Wallet
} from "lucide-react";
import "./LeaderboardView.css";

interface Trader {
  id: string;
  rank: number;
  name: string;
  handle: string;
  address: string;
  avatar: string;
  badge: "WHALE" | "SNIPER" | "PRO" | "DEGEN" | "ALGO";
  pnl24h: number;
  roi24h: number;
  pnl7d: number;
  roi7d: number;
  pnl30d: number;
  roi30d: number;
  pnlAll: number;
  roiAll: number;
  winRate: number;
  totalTrades: number;
  winTrades: number;
  lossTrades: number;
  volume: number;
  profitFactor: number;
  topCoins: string[];
  openPositions: {
    symbol: string;
    side: "long" | "short";
    leverage: string;
    size: string;
    entryPrice: string;
    markPrice: string;
    unrealizedPnl: string;
    roi: string;
  }[];
  recentTrades: {
    symbol: string;
    side: "long" | "short";
    pnl: string;
    roi: string;
    time: string;
    type: "closed" | "entry";
  }[];
}

const INITIAL_TRADERS: Trader[] = [
  {
    id: "trader-1",
    rank: 1,
    name: "SatoshiGems",
    handle: "@satoshigems",
    address: "9a8f...4e1b",
    avatar: "👑",
    badge: "WHALE",
    pnl24h: 184420.50,
    roi24h: 1420.5,
    pnl7d: 462100.00,
    roi7d: 2890.0,
    pnl30d: 1240500.00,
    roi30d: 5410.0,
    pnlAll: 4890200.00,
    roiAll: 14200.0,
    winRate: 91.4,
    totalTrades: 1842,
    winTrades: 1684,
    lossTrades: 158,
    volume: 34200000,
    profitFactor: 8.4,
    topCoins: ["SOL", "BONK", "POPCAT"],
    openPositions: [
      { symbol: "SOL", side: "long", leverage: "10x", size: "$450,000", entryPrice: "$172.40", markPrice: "$179.84", unrealizedPnl: "+$38,900", roi: "+86.4%" },
      { symbol: "BONK", side: "long", leverage: "5x", size: "$120,000", entryPrice: "$0.00002340", markPrice: "$0.00002510", unrealizedPnl: "+$8,710", roi: "+36.2%" }
    ],
    recentTrades: [
      { symbol: "SOL", side: "long", pnl: "+$42,800", roi: "+320%", time: "4m ago", type: "closed" },
      { symbol: "POPCAT", side: "long", pnl: "+$18,400", roi: "+145%", time: "22m ago", type: "closed" },
      { symbol: "WIF", side: "long", pnl: "+$9,120", roi: "+78%", time: "1h ago", type: "closed" }
    ]
  },
  {
    id: "trader-2",
    rank: 2,
    name: "SolanaSniper_v2",
    handle: "@solsniper",
    address: "3c2a...88ff",
    avatar: "🎯",
    badge: "SNIPER",
    pnl24h: 118920.00,
    roi24h: 885.2,
    pnl7d: 312400.00,
    roi7d: 1940.0,
    pnl30d: 890100.00,
    roi30d: 3820.0,
    pnlAll: 2940000.00,
    roiAll: 9800.0,
    winRate: 88.2,
    totalTrades: 1240,
    winTrades: 1094,
    lossTrades: 146,
    volume: 22800000,
    profitFactor: 6.8,
    topCoins: ["SOL", "WIF"],
    openPositions: [
      { symbol: "WIF", side: "long", leverage: "10x", size: "$220,000", entryPrice: "$2.14", markPrice: "$2.38", unrealizedPnl: "+$24,600", roi: "+112%" }
    ],
    recentTrades: [
      { symbol: "BONK", side: "long", pnl: "+$25,400", roi: "+210%", time: "12m ago", type: "closed" },
      { symbol: "SOL", side: "short", pnl: "+$14,300", roi: "+95%", time: "45m ago", type: "closed" }
    ]
  },
  {
    id: "trader-3",
    rank: 3,
    name: "HyperLiquidDegen",
    handle: "@hyper_degen",
    address: "71e9...b204",
    avatar: "⚡",
    badge: "DEGEN",
    pnl24h: 84150.25,
    roi24h: 640.8,
    pnl7d: 215400.00,
    roi7d: 1420.0,
    pnl30d: 610000.00,
    roi30d: 2750.0,
    pnlAll: 1850000.00,
    roiAll: 6400.0,
    winRate: 84.6,
    totalTrades: 960,
    winTrades: 812,
    lossTrades: 148,
    volume: 18500000,
    profitFactor: 5.4,
    topCoins: ["BONK", "POPCAT"],
    openPositions: [
      { symbol: "POPCAT", side: "long", leverage: "20x", size: "$180,000", entryPrice: "$0.2580", markPrice: "$0.2717", unrealizedPnl: "+$19,100", roi: "+212%" }
    ],
    recentTrades: [
      { symbol: "POPCAT", side: "long", pnl: "+$31,200", roi: "+280%", time: "18m ago", type: "closed" },
      { symbol: "BONK", side: "long", pnl: "+$16,800", roi: "+125%", time: "1h ago", type: "closed" }
    ]
  },
  {
    id: "trader-4",
    rank: 4,
    name: "AlphaHunter",
    handle: "@alphahunter",
    address: "5d91...a109",
    avatar: "🐺",
    badge: "PRO",
    pnl24h: 62400.10,
    roi24h: 495.3,
    pnl7d: 184000.00,
    roi7d: 1120.0,
    pnl30d: 520000.00,
    roi30d: 2100.0,
    pnlAll: 1420000.00,
    roiAll: 5100.0,
    winRate: 81.2,
    totalTrades: 810,
    winTrades: 658,
    lossTrades: 152,
    volume: 14600000,
    profitFactor: 4.9,
    topCoins: ["SOL", "ETH", "BTC"],
    openPositions: [
      { symbol: "SOL", side: "long", leverage: "5x", size: "$250,000", entryPrice: "$174.10", markPrice: "$179.84", unrealizedPnl: "+$16,400", roi: "+41.2%" }
    ],
    recentTrades: [
      { symbol: "BTC", side: "long", pnl: "+$12,500", roi: "+65%", time: "30m ago", type: "closed" }
    ]
  },
  {
    id: "trader-5",
    rank: 5,
    name: "WhaleWatcher_99",
    handle: "@whalewatcher99",
    address: "1f88...7e34",
    avatar: "🐋",
    badge: "WHALE",
    pnl24h: 58900.00,
    roi24h: 420.0,
    pnl7d: 172000.00,
    roi7d: 950.0,
    pnl30d: 490000.00,
    roi30d: 1850.0,
    pnlAll: 2100000.00,
    roiAll: 6800.0,
    winRate: 79.5,
    totalTrades: 640,
    winTrades: 509,
    lossTrades: 131,
    volume: 16900000,
    profitFactor: 4.6,
    topCoins: ["SOL", "BONK"],
    openPositions: [],
    recentTrades: [
      { symbol: "SOL", side: "long", pnl: "+$28,900", roi: "+180%", time: "50m ago", type: "closed" }
    ]
  },
  {
    id: "trader-6",
    rank: 6,
    name: "PhantomQuant",
    handle: "@phantomquant",
    address: "8b12...3341",
    avatar: "🤖",
    badge: "ALGO",
    pnl24h: 49200.40,
    roi24h: 360.2,
    pnl7d: 154000.00,
    roi7d: 890.0,
    pnl30d: 410000.00,
    roi30d: 1620.0,
    pnlAll: 1350000.00,
    roiAll: 4900.0,
    winRate: 85.0,
    totalTrades: 2100,
    winTrades: 1785,
    lossTrades: 315,
    volume: 28400000,
    profitFactor: 5.1,
    topCoins: ["SOL", "BTC", "ETH"],
    openPositions: [
      { symbol: "ETH", side: "long", leverage: "10x", size: "$180,000", entryPrice: "$2,580", markPrice: "$2,640", unrealizedPnl: "+$8,400", roi: "+46.6%" }
    ],
    recentTrades: [
      { symbol: "SOL", side: "long", pnl: "+$15,600", roi: "+92%", time: "1h ago", type: "closed" }
    ]
  },
  {
    id: "trader-7",
    rank: 7,
    name: "MemeLord_Pump",
    handle: "@memelord",
    address: "44cb...9191",
    avatar: "🐸",
    badge: "DEGEN",
    pnl24h: 44100.80,
    roi24h: 512.4,
    pnl7d: 139000.00,
    roi7d: 1250.0,
    pnl30d: 365000.00,
    roi30d: 2100.0,
    pnlAll: 920000.00,
    roiAll: 4200.0,
    winRate: 74.2,
    totalTrades: 720,
    winTrades: 534,
    lossTrades: 186,
    volume: 9800000,
    profitFactor: 3.8,
    topCoins: ["BONK", "POPCAT", "WIF"],
    openPositions: [],
    recentTrades: [
      { symbol: "POPCAT", side: "long", pnl: "+$22,100", roi: "+310%", time: "2h ago", type: "closed" }
    ]
  },
  {
    id: "trader-8",
    rank: 8,
    name: "DexGod_Sol",
    handle: "@dexgod",
    address: "21ee...77a8",
    avatar: "🔱",
    badge: "PRO",
    pnl24h: 38750.00,
    roi24h: 310.0,
    pnl7d: 124000.00,
    roi7d: 790.0,
    pnl30d: 320000.00,
    roi30d: 1450.0,
    pnlAll: 1100000.00,
    roiAll: 3900.0,
    winRate: 78.9,
    totalTrades: 540,
    winTrades: 426,
    lossTrades: 114,
    volume: 11200000,
    profitFactor: 4.2,
    topCoins: ["SOL", "BONK"],
    openPositions: [],
    recentTrades: [
      { symbol: "SOL", side: "long", pnl: "+$11,400", roi: "+82%", time: "2h ago", type: "closed" }
    ]
  },
  {
    id: "trader-9",
    rank: 9,
    name: "FlashTrader",
    handle: "@flashtrader",
    address: "66f4...112c",
    avatar: "⚡",
    badge: "SNIPER",
    pnl24h: 34200.00,
    roi24h: 420.5,
    pnl7d: 112000.00,
    roi7d: 840.0,
    pnl30d: 280000.00,
    roi30d: 1320.0,
    pnlAll: 850000.00,
    roiAll: 3200.0,
    winRate: 83.1,
    totalTrades: 690,
    winTrades: 573,
    lossTrades: 117,
    volume: 8900000,
    profitFactor: 4.5,
    topCoins: ["SOL", "WIF"],
    openPositions: [],
    recentTrades: [
      { symbol: "WIF", side: "long", pnl: "+$9,800", roi: "+140%", time: "3h ago", type: "closed" }
    ]
  },
  {
    id: "trader-10",
    rank: 10,
    name: "DiamondHands_X",
    handle: "@diamondhands",
    address: "99aa...5510",
    avatar: "💎",
    badge: "PRO",
    pnl24h: 29800.00,
    roi24h: 260.0,
    pnl7d: 98000.00,
    roi7d: 680.0,
    pnl30d: 245000.00,
    roi30d: 1150.0,
    pnlAll: 780000.00,
    roiAll: 2900.0,
    winRate: 76.5,
    totalTrades: 420,
    winTrades: 321,
    lossTrades: 99,
    volume: 7400000,
    profitFactor: 3.9,
    topCoins: ["SOL", "POPCAT"],
    openPositions: [],
    recentTrades: [
      { symbol: "POPCAT", side: "long", pnl: "+$8,400", roi: "+95%", time: "4h ago", type: "closed" }
    ]
  }
];

interface LiveStreamItem {
  id: string;
  user: string;
  token: string;
  action: string;
  pnl: string;
  isProfit: boolean;
  time: string;
}

const LIVE_STREAM_MOCK: LiveStreamItem[] = [
  { id: "1", user: "SatoshiGems", token: "SOL", action: "closed Long +", pnl: "$42,800", isProfit: true, time: "4s ago" },
  { id: "2", user: "SolanaSniper_v2", token: "BONK", action: "closed Long +", pnl: "$25,400", isProfit: true, time: "12s ago" },
  { id: "3", user: "HyperLiquidDegen", token: "POPCAT", action: "took profit +", pnl: "$31,200", isProfit: true, time: "28s ago" },
  { id: "4", user: "WhaleWatcher_99", token: "SOL", action: "closed Long +", pnl: "$18,900", isProfit: true, time: "45s ago" },
  { id: "5", user: "PhantomQuant", token: "BTC", action: "scalped +", pnl: "$9,400", isProfit: true, time: "1m ago" },
  { id: "6", user: "MemeLord_Pump", token: "WIF", action: "closed +", pnl: "$14,200", isProfit: true, time: "1m ago" }
];

export function LeaderboardView({
  onNavigate,
  onSelectCoin,
  flash
}: {
  onNavigate?: (v: any) => void;
  onSelectCoin?: (sym: string) => void;
  flash?: (msg: string) => void;
}) {
  const [traders, setTraders] = useState<Trader[]>(INITIAL_TRADERS);
  const [timeframe, setTimeframe] = useState<"24h" | "7d" | "30d" | "all">("24h");
  const [category, setCategory] = useState<"all" | "whale" | "sniper" | "pro" | "degen" | "algo">("all");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"pnl" | "roi" | "winRate" | "volume">("pnl");

  // Live Stream Feed
  const [stream, setStream] = useState<LiveStreamItem[]>(LIVE_STREAM_MOCK);

  // Modals state
  const [inspectTrader, setInspectTrader] = useState<Trader | null>(null);
  const [copyModalTrader, setCopyModalTrader] = useState<Trader | null>(null);
  const [copyingTraders, setCopyingTraders] = useState<Record<string, boolean>>({});
  const [copyAmount, setCopyAmount] = useState("2.5");
  const [copyStopLoss, setCopyStopLoss] = useState("15");

  // Simulate real-time ticker stream updates
  useEffect(() => {
    const tokens = ["SOL", "BONK", "POPCAT", "WIF", "BTC", "ETH"];
    const actions = ["closed Long +", "took profit +", "scalped +", "closed +"];
    const names = ["SatoshiGems", "SolanaSniper_v2", "HyperLiquidDegen", "AlphaHunter", "PhantomQuant", "MemeLord_Pump"];

    const interval = setInterval(() => {
      const randomName = names[Math.floor(Math.random() * names.length)];
      const randomToken = tokens[Math.floor(Math.random() * tokens.length)];
      const randomAction = actions[Math.floor(Math.random() * actions.length)];
      const randomAmount = Math.floor(Math.random() * 45000 + 4000);

      const newItem: LiveStreamItem = {
        id: Date.now().toString(),
        user: randomName,
        token: randomToken,
        action: randomAction,
        pnl: `$${randomAmount.toLocaleString()}`,
        isProfit: true,
        time: "Just now"
      };

      setStream((prev) => [newItem, ...prev.slice(0, 9)]);
    }, 4500);

    return () => clearInterval(interval);
  }, []);

  // Filtered & Sorted Traders
  const filteredTraders = useMemo(() => {
    return traders
      .filter((t) => {
        // Category Filter
        if (category !== "all" && t.badge.toLowerCase() !== category.toLowerCase()) {
          return false;
        }
        // Search Filter
        if (search.trim()) {
          const q = search.toLowerCase();
          const matchName = t.name.toLowerCase().includes(q);
          const matchHandle = t.handle.toLowerCase().includes(q);
          const matchAddr = t.address.toLowerCase().includes(q);
          const matchCoin = t.topCoins.some((c) => c.toLowerCase().includes(q));
          if (!matchName && !matchHandle && !matchAddr && !matchCoin) return false;
        }
        return true;
      })
      .sort((a, b) => {
        const getPnl = (t: Trader) =>
          timeframe === "24h" ? t.pnl24h : timeframe === "7d" ? t.pnl7d : timeframe === "30d" ? t.pnl30d : t.pnlAll;
        const getRoi = (t: Trader) =>
          timeframe === "24h" ? t.roi24h : timeframe === "7d" ? t.roi7d : timeframe === "30d" ? t.roi30d : t.roiAll;

        if (sortBy === "pnl") return getPnl(b) - getPnl(a);
        if (sortBy === "roi") return getRoi(b) - getRoi(a);
        if (sortBy === "winRate") return b.winRate - a.winRate;
        if (sortBy === "volume") return b.volume - a.volume;
        return 0;
      });
  }, [traders, timeframe, category, search, sortBy]);

  // Top 3 for Podium Showcase
  const top1 = traders[0];
  const top2 = traders[1];
  const top3 = traders[2];

  const handleStartCopy = (trader: Trader) => {
    setCopyingTraders((prev) => ({ ...prev, [trader.id]: true }));
    setCopyModalTrader(null);
    if (flash) {
      flash(`🚀 Now copy trading ${trader.name}! Allocated: ${copyAmount} SOL with ${copyStopLoss}% Stop-Loss.`);
    }
  };

  const handleStopCopy = (trader: Trader, e: React.MouseEvent) => {
    e.stopPropagation();
    setCopyingTraders((prev) => {
      const next = { ...prev };
      delete next[trader.id];
      return next;
    });
    if (flash) {
      flash(`Stopped copy trading ${trader.name}.`);
    }
  };

  const formatCurrency = (val: number) => {
    return "$" + val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const formatRoi = (val: number) => {
    return (val >= 0 ? "+" : "") + val.toLocaleString() + "%";
  };

  return (
    <div className="leaderboard-view">
      {/* ── 1. Hero Banner ── */}
      <section className="lb-hero">
        <div className="lb-hero-content">
          <div className="lb-badge-live">
            <span className="lb-live-pulse-dot" /> Live Verified Rankings
          </div>
          <h1 className="lb-hero-title">
            <Trophy size={32} /> Axiom Live Leaderboard
          </h1>
          <p className="lb-hero-desc">
            Real-time on-chain PnL, win-rates and automated trade execution stream from top Solana DEX & Axiom Perps traders.
          </p>
        </div>

        <div className="lb-hero-stats">
          <div className="lb-stat-box">
            <span className="lb-stat-label">24h Top PnL</span>
            <span className="lb-stat-val" style={{ color: "#10B981" }}>+$184,420</span>
          </div>
          <div className="lb-stat-box">
            <span className="lb-stat-label">Active Copiers</span>
            <span className="lb-stat-val">12,840</span>
          </div>
          <div className="lb-stat-box">
            <span className="lb-stat-label">24h Tracked Vol</span>
            <span className="lb-stat-val">$148.2M</span>
          </div>
        </div>
      </section>

      {/* ── 2. Live Execution Ribbon / Ticker Stream ── */}
      <div className="lb-ticker-wrap">
        <div className="lb-ticker-label">
          <Activity size={14} /> LIVE EXECUTION
        </div>
        <div className="lb-ticker-scroll">
          {stream.map((item) => (
            <div
              key={item.id}
              className="lb-ticker-item"
              onClick={() => {
                const found = traders.find((t) => t.name === item.user);
                if (found) setInspectTrader(found);
              }}
              title="Click to inspect trader"
            >
              <span className="lb-ticker-user">{item.user}</span>
              <span className="lb-ticker-token">{item.token}</span>
              <span className="lb-ticker-pnl profit">{item.action} {item.pnl}</span>
              <span className="lb-ticker-time">{item.time}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── 3. Podium Showcase (Top 3 Traders) ── */}
      <section className="lb-podium-grid">
        {/* Rank 2: Silver */}
        {top2 && (
          <div className="lb-podium-card rank-2" onClick={() => setInspectTrader(top2)}>
            <div className="lb-podium-crown-badge">
              <Shield size={12} /> #2 SILVER
            </div>
            <div className="lb-podium-trader-header">
              <div className="lb-avatar-wrap">
                {top2.avatar}
                <span className="lb-rank-num-badge">2</span>
              </div>
              <div className="lb-podium-info">
                <div className="lb-trader-name-row">
                  <span className="lb-trader-name">{top2.name}</span>
                  <span className="lb-tag-pill sniper">{top2.badge}</span>
                </div>
                <span className="lb-trader-wallet-addr">{top2.address}</span>
              </div>
            </div>

            <div className="lb-podium-metrics">
              <div className="lb-metric-row-main">
                <span className="lb-pnl-label">24h Profit</span>
                <div className="lb-pnl-values">
                  <span className="lb-big-pnl">+{formatCurrency(top2.pnl24h)}</span>
                  <span className="lb-big-roi">{formatRoi(top2.roi24h)}</span>
                </div>
              </div>

              <div className="lb-winrate-container">
                <div className="lb-winrate-labels">
                  <span>Win Rate</span>
                  <b>{top2.winRate}%</b>
                </div>
                <div className="lb-progress-track">
                  <div className="lb-progress-fill" style={{ width: `${top2.winRate}%` }} />
                </div>
              </div>
            </div>

            <div className="lb-podium-coins">
              <span className="lb-coins-label">Top Pairs:</span>
              {top2.topCoins.map((coin) => (
                <span
                  key={coin}
                  className="lb-coin-tag"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onSelectCoin) onSelectCoin(coin);
                  }}
                >
                  {coin}
                </span>
              ))}
            </div>

            <div className="lb-podium-actions">
              {copyingTraders[top2.id] ? (
                <button
                  className="lb-btn-copy is-copying"
                  onClick={(e) => handleStopCopy(top2, e)}
                >
                  <Check size={14} /> Copying (Click to Stop)
                </button>
              ) : (
                <button
                  className="lb-btn-copy"
                  onClick={(e) => {
                    e.stopPropagation();
                    setCopyModalTrader(top2);
                  }}
                >
                  <Sparkles size={14} /> 1-Click Copy
                </button>
              )}
              <button
                className="lb-btn-inspect"
                title="Inspect Trader"
                onClick={(e) => {
                  e.stopPropagation();
                  setInspectTrader(top2);
                }}
              >
                <ArrowUpRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Rank 1: Gold Champion */}
        {top1 && (
          <div className="lb-podium-card rank-1" onClick={() => setInspectTrader(top1)}>
            <div className="lb-podium-crown-badge">
              <Crown size={13} /> #1 CHAMPION
            </div>
            <div className="lb-podium-trader-header">
              <div className="lb-avatar-wrap">
                {top1.avatar}
                <span className="lb-rank-num-badge">1</span>
              </div>
              <div className="lb-podium-info">
                <div className="lb-trader-name-row">
                  <span className="lb-trader-name">{top1.name}</span>
                  <span className="lb-tag-pill whale">{top1.badge}</span>
                </div>
                <span className="lb-trader-wallet-addr">{top1.address}</span>
              </div>
            </div>

            <div className="lb-podium-metrics">
              <div className="lb-metric-row-main">
                <span className="lb-pnl-label">24h Profit</span>
                <div className="lb-pnl-values">
                  <span className="lb-big-pnl" style={{ fontSize: "26px", color: "#10B981" }}>
                    +{formatCurrency(top1.pnl24h)}
                  </span>
                  <span className="lb-big-roi">{formatRoi(top1.roi24h)}</span>
                </div>
              </div>

              <div className="lb-winrate-container">
                <div className="lb-winrate-labels">
                  <span>Win Rate</span>
                  <b>{top1.winRate}% (1,684/1,842 Wins)</b>
                </div>
                <div className="lb-progress-track">
                  <div className="lb-progress-fill" style={{ width: `${top1.winRate}%` }} />
                </div>
              </div>
            </div>

            <div className="lb-podium-coins">
              <span className="lb-coins-label">Top Pairs:</span>
              {top1.topCoins.map((coin) => (
                <span
                  key={coin}
                  className="lb-coin-tag"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onSelectCoin) onSelectCoin(coin);
                  }}
                >
                  {coin}
                </span>
              ))}
            </div>

            <div className="lb-podium-actions">
              {copyingTraders[top1.id] ? (
                <button
                  className="lb-btn-copy is-copying"
                  onClick={(e) => handleStopCopy(top1, e)}
                >
                  <Check size={14} /> Copying (Click to Stop)
                </button>
              ) : (
                <button
                  className="lb-btn-copy"
                  onClick={(e) => {
                    e.stopPropagation();
                    setCopyModalTrader(top1);
                  }}
                >
                  <Sparkles size={14} /> 1-Click Copy
                </button>
              )}
              <button
                className="lb-btn-inspect"
                title="Inspect Trader"
                onClick={(e) => {
                  e.stopPropagation();
                  setInspectTrader(top1);
                }}
              >
                <ArrowUpRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Rank 3: Bronze */}
        {top3 && (
          <div className="lb-podium-card rank-3" onClick={() => setInspectTrader(top3)}>
            <div className="lb-podium-crown-badge">
              <Shield size={12} /> #3 BRONZE
            </div>
            <div className="lb-podium-trader-header">
              <div className="lb-avatar-wrap">
                {top3.avatar}
                <span className="lb-rank-num-badge">3</span>
              </div>
              <div className="lb-podium-info">
                <div className="lb-trader-name-row">
                  <span className="lb-trader-name">{top3.name}</span>
                  <span className="lb-tag-pill pro">{top3.badge}</span>
                </div>
                <span className="lb-trader-wallet-addr">{top3.address}</span>
              </div>
            </div>

            <div className="lb-podium-metrics">
              <div className="lb-metric-row-main">
                <span className="lb-pnl-label">24h Profit</span>
                <div className="lb-pnl-values">
                  <span className="lb-big-pnl">+{formatCurrency(top3.pnl24h)}</span>
                  <span className="lb-big-roi">{formatRoi(top3.roi24h)}</span>
                </div>
              </div>

              <div className="lb-winrate-container">
                <div className="lb-winrate-labels">
                  <span>Win Rate</span>
                  <b>{top3.winRate}%</b>
                </div>
                <div className="lb-progress-track">
                  <div className="lb-progress-fill" style={{ width: `${top3.winRate}%` }} />
                </div>
              </div>
            </div>

            <div className="lb-podium-coins">
              <span className="lb-coins-label">Top Pairs:</span>
              {top3.topCoins.map((coin) => (
                <span
                  key={coin}
                  className="lb-coin-tag"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onSelectCoin) onSelectCoin(coin);
                  }}
                >
                  {coin}
                </span>
              ))}
            </div>

            <div className="lb-podium-actions">
              {copyingTraders[top3.id] ? (
                <button
                  className="lb-btn-copy is-copying"
                  onClick={(e) => handleStopCopy(top3, e)}
                >
                  <Check size={14} /> Copying (Click to Stop)
                </button>
              ) : (
                <button
                  className="lb-btn-copy"
                  onClick={(e) => {
                    e.stopPropagation();
                    setCopyModalTrader(top3);
                  }}
                >
                  <Sparkles size={14} /> 1-Click Copy
                </button>
              )}
              <button
                className="lb-btn-inspect"
                title="Inspect Trader"
                onClick={(e) => {
                  e.stopPropagation();
                  setInspectTrader(top3);
                }}
              >
                <ArrowUpRight size={16} />
              </button>
            </div>
          </div>
        )}
      </section>

      {/* ── 4. Controls, Filters & Search ── */}
      <div className="lb-controls-bar">
        {/* Timeframe Selector */}
        <div className="lb-timeframe-group">
          {(["24h", "7d", "30d", "all"] as const).map((tf) => (
            <button
              key={tf}
              className={`lb-tf-btn ${timeframe === tf ? "active" : ""}`}
              onClick={() => setTimeframe(tf)}
            >
              {tf.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Category Filter Pills */}
        <div className="lb-category-group">
          {[
            { id: "all", label: "All Traders", icon: Users },
            { id: "whale", label: "Whales (> $100k)", icon: DollarSign },
            { id: "sniper", label: "Snipers", icon: Zap },
            { id: "pro", label: "Pro Verified", icon: ShieldCheck },
            { id: "degen", label: "Degen Memes", icon: Flame }
          ].map((cat) => {
            const Icon = cat.icon;
            return (
              <button
                key={cat.id}
                className={`lb-cat-pill ${category === cat.id ? "active" : ""}`}
                onClick={() => setCategory(cat.id as any)}
              >
                <Icon size={13} /> {cat.label}
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="lb-search-input-wrap">
          <Search size={14} color="#64748B" />
          <input
            type="text"
            placeholder="Search trader, address or token..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* ── 5. Full Rankings Table ── */}
      <div className="lb-table-card">
        <div className="lb-table-responsive">
          <table className="lb-table">
            <thead>
              <tr>
                <th style={{ width: "60px" }}>Rank</th>
                <th>Trader</th>
                <th
                  onClick={() => setSortBy("pnl")}
                  title="Click to sort by PnL"
                  style={{ textAlign: "right" }}
                >
                  {timeframe.toUpperCase()} PnL {sortBy === "pnl" ? "▼" : ""}
                </th>
                <th
                  onClick={() => setSortBy("roi")}
                  title="Click to sort by ROI"
                  style={{ textAlign: "right" }}
                >
                  ROI % {sortBy === "roi" ? "▼" : ""}
                </th>
                <th
                  onClick={() => setSortBy("winRate")}
                  title="Click to sort by Win Rate"
                >
                  Win Rate {sortBy === "winRate" ? "▼" : ""}
                </th>
                <th
                  onClick={() => setSortBy("volume")}
                  title="Click to sort by Volume"
                >
                  Total Volume {sortBy === "volume" ? "▼" : ""}
                </th>
                <th>Top Pairs</th>
                <th style={{ textAlign: "right" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredTraders.map((t, index) => {
                const rankNum = index + 1;
                const pnl =
                  timeframe === "24h"
                    ? t.pnl24h
                    : timeframe === "7d"
                    ? t.pnl7d
                    : timeframe === "30d"
                    ? t.pnl30d
                    : t.pnlAll;
                const roi =
                  timeframe === "24h"
                    ? t.roi24h
                    : timeframe === "7d"
                    ? t.roi7d
                    : timeframe === "30d"
                    ? t.roi30d
                    : t.roiAll;

                const isCopying = copyingTraders[t.id];

                return (
                  <tr
                    key={t.id}
                    className={`lb-row ${isCopying ? "highlighted" : ""}`}
                    onClick={() => setInspectTrader(t)}
                  >
                    <td>
                      <div
                        className={`lb-rank-col ${
                          rankNum === 1
                            ? "podium-1"
                            : rankNum === 2
                            ? "podium-2"
                            : rankNum === 3
                            ? "podium-3"
                            : ""
                        }`}
                      >
                        {rankNum === 1 && <Crown size={14} color="#F59E0B" />}
                        #{rankNum}
                      </div>
                    </td>
                    <td>
                      <div className="lb-trader-cell">
                        <div className="lb-table-avatar">{t.avatar}</div>
                        <div className="lb-table-trader-meta">
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span className="lb-table-name">{t.name}</span>
                            <span className={`lb-tag-pill ${t.badge.toLowerCase()}`}>
                              {t.badge}
                            </span>
                          </div>
                          <span className="lb-table-addr">{t.address}</span>
                        </div>
                      </div>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <div className="lb-pnl-cell">
                        <span className={`lb-table-pnl ${pnl >= 0 ? "profit" : "loss"}`}>
                          {pnl >= 0 ? "+" : ""}{formatCurrency(pnl)}
                        </span>
                      </div>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <span className={`lb-table-roi ${roi >= 0 ? "profit" : "loss"}`}>
                        {formatRoi(roi)}
                      </span>
                    </td>
                    <td>
                      <div className="lb-table-wr-cell">
                        <div className="lb-wr-text">
                          <span>{t.winRate}%</span>
                          <span style={{ fontSize: "10.5px", color: "var(--muted)" }}>
                            {t.winTrades}W / {t.lossTrades}L
                          </span>
                        </div>
                        <div className="lb-progress-track">
                          <div className="lb-progress-fill" style={{ width: `${t.winRate}%` }} />
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="lb-table-vol">${(t.volume / 1000000).toFixed(1)}M</span>
                    </td>
                    <td>
                      <div className="lb-coins-cell">
                        {t.topCoins.map((sym) => (
                          <span
                            key={sym}
                            className="lb-coin-tag"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onSelectCoin) onSelectCoin(sym);
                            }}
                          >
                            {sym}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      {isCopying ? (
                        <button
                          className="lb-table-btn-copy is-copying"
                          onClick={(e) => handleStopCopy(t, e)}
                        >
                          <Check size={12} /> Copying
                        </button>
                      ) : (
                        <button
                          className="lb-table-btn-copy"
                          onClick={(e) => {
                            e.stopPropagation();
                            setCopyModalTrader(t);
                          }}
                        >
                          <Copy size={12} /> Copy
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── 6. Trader Deep-Dive Inspector Modal ── */}
      {inspectTrader && (
        <div className="lb-modal-backdrop" onClick={() => setInspectTrader(null)}>
          <div className="lb-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "560px" }}>
            <div className="lb-modal-header">
              <div className="lb-modal-title">
                <span style={{ fontSize: "20px" }}>{inspectTrader.avatar}</span>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span>{inspectTrader.name}</span>
                    <span className={`lb-tag-pill ${inspectTrader.badge.toLowerCase()}`}>
                      {inspectTrader.badge}
                    </span>
                  </div>
                  <small style={{ color: "var(--muted)", fontFamily: "monospace" }}>
                    {inspectTrader.address}
                  </small>
                </div>
              </div>
              <button className="lb-modal-close" onClick={() => setInspectTrader(null)}>
                <X size={16} />
              </button>
            </div>

            <div className="lb-modal-body">
              {/* Performance Stats Matrix */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: 10,
                  background: "rgba(0,0,0,0.25)",
                  padding: 12,
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.06)"
                }}
              >
                <div>
                  <small style={{ color: "var(--muted)", fontSize: "10.5px" }}>24H PNL</small>
                  <div style={{ fontWeight: 850, color: "#10B981", fontSize: "15px" }}>
                    +{formatCurrency(inspectTrader.pnl24h)}
                  </div>
                </div>
                <div>
                  <small style={{ color: "var(--muted)", fontSize: "10.5px" }}>WIN RATE</small>
                  <div style={{ fontWeight: 850, color: "#fff", fontSize: "15px" }}>
                    {inspectTrader.winRate}%
                  </div>
                </div>
                <div>
                  <small style={{ color: "var(--muted)", fontSize: "10.5px" }}>PROFIT FACTOR</small>
                  <div style={{ fontWeight: 850, color: "#CBD5E1", fontSize: "15px" }}>
                    {inspectTrader.profitFactor}x
                  </div>
                </div>
              </div>

              {/* Active Open Positions */}
              <div>
                <h4 style={{ fontSize: "12.5px", fontWeight: 800, margin: "0 0 8px 0", color: "#CBD5E1" }}>
                  Active Positions ({inspectTrader.openPositions.length})
                </h4>
                {inspectTrader.openPositions.length === 0 ? (
                  <div style={{ padding: "14px", background: "rgba(255,255,255,0.02)", borderRadius: 10, textAlign: "center", color: "var(--muted)", fontSize: "12px" }}>
                    No open positions right now. Waiting for next high-probability setup.
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {inspectTrader.openPositions.map((pos, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "10px 14px",
                          borderRadius: 10,
                          background: "rgba(255,255,255,0.04)",
                          border: "1px solid rgba(255,255,255,0.08)"
                        }}
                      >
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 800, color: "#fff" }}>
                            <span>{pos.symbol}</span>
                            <span style={{ fontSize: "10px", padding: "1px 5px", borderRadius: 4, background: "rgba(16,185,129,0.2)", color: "#10B981" }}>
                              {pos.side.toUpperCase()} {pos.leverage}
                            </span>
                          </div>
                          <small style={{ color: "var(--muted)", fontSize: "11px" }}>
                            Entry: {pos.entryPrice} • Size: {pos.size}
                          </small>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontWeight: 850, color: "#10B981" }}>{pos.unrealizedPnl}</div>
                          <small style={{ color: "#10B981", fontWeight: 700 }}>{pos.roi}</small>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Recent Closed Trades */}
              <div>
                <h4 style={{ fontSize: "12.5px", fontWeight: 800, margin: "0 0 8px 0", color: "#CBD5E1" }}>
                  Recent Execution History
                </h4>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {inspectTrader.recentTrades.map((t, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        padding: "8px 12px",
                        borderRadius: 8,
                        background: "rgba(0,0,0,0.2)",
                        fontSize: "12px"
                      }}
                    >
                      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        <span style={{ fontWeight: 750, color: "#DDD6FE" }}>{t.symbol}</span>
                        <span style={{ color: "var(--muted)" }}>{t.time}</span>
                      </div>
                      <div style={{ fontWeight: 800, color: "#10B981" }}>
                        {t.pnl} ({t.roi})
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="lb-modal-footer">
              <button
                className="lb-confirm-btn"
                onClick={() => {
                  setInspectTrader(null);
                  setCopyModalTrader(inspectTrader);
                }}
              >
                <Copy size={15} style={{ marginRight: 6 }} /> Copy This Trader Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 7. 1-Click Copy Trade Modal ── */}
      {copyModalTrader && (
        <div className="lb-modal-backdrop" onClick={() => setCopyModalTrader(null)}>
          <div className="lb-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="lb-modal-header">
              <div className="lb-modal-title">
                <Sparkles size={18} color="#7C3AED" />
                <span>1-Click Copy Trading</span>
              </div>
              <button className="lb-modal-close" onClick={() => setCopyModalTrader(null)}>
                <X size={16} />
              </button>
            </div>

            <div className="lb-modal-body">
              <div className="lb-target-trader-box">
                <span style={{ fontSize: "24px" }}>{copyModalTrader.avatar}</span>
                <div>
                  <div style={{ fontWeight: 850, color: "#fff", fontSize: "14px" }}>
                    Copying: {copyModalTrader.name}
                  </div>
                  <div style={{ color: "#10B981", fontSize: "11.5px", fontWeight: 700 }}>
                    Win Rate: {copyModalTrader.winRate}% • 24h PnL: +{formatCurrency(copyModalTrader.pnl24h)}
                  </div>
                </div>
              </div>

              {/* Allocation Input */}
              <div className="lb-input-group">
                <label>
                  <span>Allocation Budget (SOL)</span>
                  <span style={{ color: "var(--muted)" }}>Avail: 14.85 SOL</span>
                </label>
                <div className="lb-input-wrap">
                  <input
                    type="number"
                    step="0.5"
                    value={copyAmount}
                    onChange={(e) => setCopyAmount(e.target.value)}
                  />
                  <span className="lb-input-denom">SOL</span>
                </div>
                <div className="lb-presets-row">
                  {["1 SOL", "2.5 SOL", "5 SOL", "10 SOL"].map((p) => (
                    <button
                      key={p}
                      className="lb-preset-btn"
                      onClick={() => setCopyAmount(p.replace(" SOL", ""))}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* Stop Loss Input */}
              <div className="lb-input-group">
                <label>
                  <span>Safety Stop-Loss (%)</span>
                  <span style={{ color: "var(--muted)" }}>Max Drawdown Limit</span>
                </label>
                <div className="lb-input-wrap">
                  <input
                    type="number"
                    value={copyStopLoss}
                    onChange={(e) => setCopyStopLoss(e.target.value)}
                  />
                  <span className="lb-input-denom">%</span>
                </div>
              </div>

              <div
                style={{
                  fontSize: "11px",
                  color: "var(--muted)",
                  lineHeight: 1.5,
                  padding: "10px",
                  background: "rgba(124,58,237,0.08)",
                  borderRadius: 8,
                  border: "1px solid rgba(124,58,237,0.2)"
                }}
              >
                ⚡ <b>Zero Slippage Mirroring</b>: Whenever {copyModalTrader.name} buys or sells on Solana DEX or Axiom Perps, your account executes proportionally in real-time.
              </div>
            </div>

            <div className="lb-modal-footer">
              <button
                className="lb-confirm-btn"
                onClick={() => handleStartCopy(copyModalTrader)}
              >
                Confirm & Start Copying ({copyAmount} SOL)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
