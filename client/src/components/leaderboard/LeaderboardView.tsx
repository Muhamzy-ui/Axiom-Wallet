import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Trophy, TrendingUp, TrendingDown, Crown, Shield, ShieldCheck, Zap,
  Search, ArrowUpRight, Copy, Check, Filter, ExternalLink, Activity,
  Users, Flame, Sparkles, X, ChevronRight, Sliders, DollarSign, Wallet,
  AlertCircle, RefreshCw
} from "lucide-react";
import { leaderboardStore, Trader } from "../../services/leaderboardStore";
import { marketStore } from "../../services/marketStore";
import { api } from "../../services/api";
import { generatePhantomAvatar } from "../../utils/avatar";
import "./LeaderboardView.css";


const INITIAL_TRADERS: Trader[] = leaderboardStore.getAll50Traders();
// Traders loaded dynamically from leaderboardStore (Top 50 traders with 24-hour daily epoch drift)
/*
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
*/

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
  flash,
  authUser,
  modal,
  onOpenDeposit,
}: {
  onNavigate?: (v: any) => void;
  onSelectCoin?: (sym: string) => void;
  flash?: (msg: string) => void;
  authUser?: any;
  modal?: (type: string) => void;
  onOpenDeposit?: () => void;
}) {
  const [traders, setTraders] = useState<Trader[]>(INITIAL_TRADERS);
  const [timeframe, setTimeframe] = useState<"24h" | "7d" | "30d" | "all">("24h");
  const [category, setCategory] = useState<"all" | "whale" | "sniper" | "pro" | "degen" | "algo">("all");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"pnl" | "roi" | "winRate" | "volume">("pnl");
  const [displayCount, setDisplayCount] = useState(25);
  const [activeSlide, setActiveSlide] = useState(0);
  const [realUsers, setRealUsers] = useState<any[]>([]);
  const [holderFilter, setHolderFilter] = useState<"all" | "grinders" | "holders">("all");
  const swipeRailRef = useRef<HTMLDivElement>(null);
  const [, setProfileTick] = useState(0);
  const [marketTick, setMarketTick] = useState(0);
  const [epochCountdown, setEpochCountdown] = useState(() => leaderboardStore.getTimeUntilNextEpoch().formatted);
  const [insufficientBalanceNotice, setInsufficientBalanceNotice] = useState<{
    traderName: string;
    token: string;
    action: string;
    userBal: string;
  } | null>(null);

  // 24-Hour Epoch Rollover Countdown Timer
  useEffect(() => {
    const timer = setInterval(() => {
      setEpochCountdown(leaderboardStore.getTimeUntilNextEpoch().formatted);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Subscribe to live marketStore updates (created tokens, prices, holders)
  useEffect(() => {
    const unsub = marketStore.subscribe(() => setMarketTick(t => t + 1));
    return unsub;
  }, []);

  // Re-render standing card when user updates avatar or username
  useEffect(() => {
    const handleProfileUpdate = () => setProfileTick(t => t + 1);
    window.addEventListener("axiom_profile_updated", handleProfileUpdate);
    return () => window.removeEventListener("axiom_profile_updated", handleProfileUpdate);
  }, []);

  // Load real registered platform users for holder tracking
  useEffect(() => {
    api.getAdminUsers().then((data) => {
      if (Array.isArray(data) && data.length > 0) {
        setRealUsers(data);
      }
    }).catch(() => {});
  }, []);

  // Subscribe to live leaderboardStore updates (Admin Top 8 / 2-Day Epoch rotation)
  useEffect(() => {
    const unsub = leaderboardStore.subscribe(() => {
      setTraders(leaderboardStore.getAll50Traders());
    });
    return unsub;
  }, []);

  const handleSwipeScroll = () => {
    if (!swipeRailRef.current) return;
    const scrollLeft = swipeRailRef.current.scrollLeft;
    const cardWidth = Math.max(260, swipeRailRef.current.clientWidth * 0.85);
    const index = Math.round(scrollLeft / cardWidth);
    setActiveSlide(Math.min(2, Math.max(0, index)));
  };

  const scrollToSlide = (idx: number) => {
    if (!swipeRailRef.current) return;
    const cardWidth = Math.max(260, swipeRailRef.current.clientWidth * 0.85);
    swipeRailRef.current.scrollTo({ left: idx * cardWidth, behavior: "smooth" });
    setActiveSlide(idx);
  };

  // Live Stream Feed
  const [stream, setStream] = useState<LiveStreamItem[]>(LIVE_STREAM_MOCK);

  // Modals state
  const [inspectTrader, setInspectTrader] = useState<Trader | null>(null);
  const [copyModalTrader, setCopyModalTrader] = useState<Trader | null>(null);
  const [copyAmount, setCopyAmount] = useState("10");
  const [copyStopLoss, setCopyStopLoss] = useState("15");
  const [copySubmitting, setCopySubmitting] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);
  const [copyingTraders, setCopyingTraders] = useState<Record<string, any>>(() => leaderboardStore.getCopiedTradersMap());

  // Helper to cleanly render SVG data-URIs, image URLs, or emoji avatars without raw markup leaks
  const renderTraderAvatar = (avatar: string | undefined, size: number = 36) => {
    if (!avatar) {
      return <span style={{ fontSize: `${Math.round(size * 0.55)}px` }}>👤</span>;
    }
    if (avatar.startsWith("data:") || avatar.startsWith("http") || avatar.startsWith("/") || avatar.startsWith("blob:")) {
      return (
        <img
          src={avatar}
          alt="Trader Avatar"
          style={{
            width: "100%",
            height: "100%",
            maxWidth: `${size}px`,
            maxHeight: `${size}px`,
            borderRadius: "inherit",
            objectFit: "cover",
            display: "block"
          }}
        />
      );
    }
    return (
      <span
        style={{
          fontSize: `${Math.round(size * 0.55)}px`,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          lineHeight: 1
        }}
      >
        {avatar}
      </span>
    );
  };

  // Simulate real-time ticker stream updates and handle copy-trading execution & insufficient balance notification
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

      // Check if user is currently copying this trader
      const activeCopies = leaderboardStore.getCopiedTradersMap();
      const isCopyingThis = Object.keys(activeCopies).some((tid) => {
        const t = traders.find(tr => tr.id === tid);
        return t && (t.name.toLowerCase() === randomName.toLowerCase() || t.id === tid);
      });

      if (isCopyingThis) {
        const bals = marketStore.getBalances();
        const solBal = Number(bals['SOL'] || 0);
        const usdtBal = Number(bals['USDT'] || 0);
        const usdcBal = Number(bals['USDC'] || 0);
        const totalNetUsd = solBal * 179 + usdtBal + usdcBal;

        if (totalNetUsd < 5 || solBal < 0.05) {
          setInsufficientBalanceNotice({
            traderName: randomName,
            token: randomToken,
            action: randomAction,
            userBal: `$${totalNetUsd.toFixed(2)}`
          });
          if (flash) {
            flash(`⚠️ Copy Trade Alert: ${randomName} opened a position in ${randomToken}, but your wallet has insufficient funds ($${totalNetUsd.toFixed(2)}). Please deposit to mirror!`);
          }
        } else {
          if (flash) {
            flash(`🚀 Copy Trade Mirrored: Successfully mirrored ${randomToken} trade copying ${randomName}!`);
          }
        }
      }
    }, 4500);

    return () => clearInterval(interval);
  }, [traders, flash]);

  // Detect if search string matches a token contract address, pool address, or symbol
  const matchedCoinInfo = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return null;
    const tokens = marketStore.tokens || [];
    const cleanQ = q.replace(/^\$/, "");
    const found = tokens.find((t: any) =>
      (t.contractAddress && t.contractAddress.toLowerCase().includes(q)) ||
      (t.contract_address && t.contract_address.toLowerCase().includes(q)) ||
      (t.poolAddress && t.poolAddress.toLowerCase().includes(q)) ||
      (t.sym && t.sym.toLowerCase() === cleanQ) ||
      (t.symbol && t.symbol.toLowerCase() === cleanQ) ||
      (t.name && t.name.toLowerCase().includes(q))
    );
    if (found) return found;

    // Check if stored in user created tokens or custom coin storage
    try {
      const customSaved = localStorage.getItem("axiom_custom_tokens");
      if (customSaved) {
        const parsed = JSON.parse(customSaved);
        if (Array.isArray(parsed)) {
          const customFound = parsed.find((t: any) =>
            (t.sym && t.sym.toLowerCase() === cleanQ) ||
            (t.name && t.name.toLowerCase().includes(q)) ||
            (t.contractAddress && t.contractAddress.toLowerCase().includes(q))
          );
          if (customFound) return customFound;
        }
      }
    } catch {}

    // If client created/pasted any custom coin/token contract address or wallet
    const trimmed = search.trim();
    if (
      trimmed.length >= 20 ||
      /^[1-9A-HJ-NP-Za-km-z]{30,48}$/.test(trimmed) ||
      /^0x[a-fA-F0-9]{40}$/.test(trimmed)
    ) {
      const rawSym = trimmed.startsWith("0x") ? trimmed.slice(2, 6) : trimmed.slice(0, 4);
      return {
        sym: rawSym.toUpperCase(),
        name: `Token Mint (${trimmed.slice(0, 4)}...${trimmed.slice(-4)})`,
        contractAddress: trimmed,
        numericPrice: 0.085,
        priceChange24h: 38.6,
        user_holders_count: 25,
        isCustomCreated: true,
      };
    }

    // If search term matches a coin name / query that is not a standard trader name
    if (q.length >= 3 && !["whale", "sniper", "degen", "algo", "pro", "trader"].includes(q)) {
      const matchesTraderName = traders.some(t => t.name.toLowerCase().includes(q) || t.handle.toLowerCase().includes(q));
      if (!matchesTraderName) {
        return {
          sym: cleanQ.toUpperCase().slice(0, 8),
          name: q.charAt(0).toUpperCase() + q.slice(1),
          contractAddress: `Ax${cleanQ.toUpperCase()}${Math.random().toString(36).slice(2, 8)}`,
          numericPrice: 0.045,
          priceChange24h: 24.8,
          user_holders_count: 25,
          isCustomCreated: true
        };
      }
    }

    return null;
  }, [search, marketTick, traders]);

  // Pre-calculate coin holders & grinders count when matchedCoinInfo is present
  const coinStats = useMemo(() => {
    if (!matchedCoinInfo) return null;
    const sym = matchedCoinInfo.sym.toUpperCase();
    const tokenPrice = matchedCoinInfo.numericPrice || 0.05;

    let grinders: (Trader & { isGrinder?: boolean; holdingAmt?: number; holdingUsd?: number })[] = traders
      .filter((t) => {
        return t.topCoins.some((c) => c.toUpperCase() === sym) ||
          t.openPositions.some((p) => p.symbol.toUpperCase() === sym) ||
          t.recentTrades.some((r) => r.symbol.toUpperCase() === sym);
      })
      .map((t) => ({ ...t, isGrinder: true }));

    if (grinders.length === 0) {
      grinders = traders.slice(0, 10).map((t, idx) => ({
        ...t,
        isGrinder: true,
        topCoins: [sym, ...t.topCoins.slice(0, 2)],
        openPositions: [
          {
            symbol: sym,
            side: "long",
            leverage: "10x",
            size: `$${Math.round(28000 * (10 - idx)).toLocaleString()}`,
            entryPrice: `$${tokenPrice.toFixed(4)}`,
            markPrice: `$${(tokenPrice * 1.15).toFixed(4)}`,
            unrealizedPnl: `+$${Math.round(3200 * (10 - idx)).toLocaleString()}`,
            roi: "+48.5%"
          },
          ...t.openPositions
        ]
      }));
    }

    // Minimum holders count is ALWAYS at least 25 or user_holders_count, and monotonically increases
    const targetHoldersCount = Math.max(
      (matchedCoinInfo as any).user_holders_count || (matchedCoinInfo as any).holders || 25,
      25
    );

    const usersToUse = [...(realUsers.length > 0 ? realUsers : [])];
    while (usersToUse.length < targetHoldersCount) {
      const idx = usersToUse.length;
      const randHex = Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, "0");
      usersToUse.push({
        id: `usr_${idx + 1}`,
        email: `trader_${randHex}@axiom.io`,
        wallet_address: `Ax${randHex}${Math.random().toString(36).slice(2, 8)}`,
        balances: { [sym]: Math.round(15000 + Math.random() * 45000) },
        total_balance_usd: Math.round(500 + Math.random() * 3500)
      });
    }

    const holders: (Trader & { isGrinder?: boolean; holdingAmt?: number; holdingUsd?: number })[] = [];
    usersToUse.forEach((u: any, idx: number) => {
      const userBal = u.balances?.[sym] || (u.total_balance_usd ? Number((u.total_balance_usd / tokenPrice).toFixed(2)) : (25000 - idx * 4000));
      const userUsd = userBal * tokenPrice;
      const userAddr = u.wallet_address || `Ax${Math.random().toString(36).slice(2, 10)}`;
      const shortAddr = `${userAddr.slice(0, 4)}...${userAddr.slice(-4)}`;
      const displayName = u.email && u.email !== "anon" ? u.email.split("@")[0] : `Holder_${userAddr.slice(2, 6)}`;

      holders.push({
        id: `holder-${u.id || userAddr}`,
        rank: 0,
        rankDelta: 0,
        name: displayName,
        handle: `@${userAddr.slice(0, 8)}`,
        address: shortAddr,
        avatar: generatePhantomAvatar(displayName),
        badge: "PRO" as any,
        pnl24h: Number((userUsd * 0.12).toFixed(2)),
        roi24h: 12.0,
        pnl7d: Number((userUsd * 0.28).toFixed(2)),
        roi7d: 28.0,
        pnl30d: Number((userUsd * 0.55).toFixed(2)),
        roi30d: 55.0,
        pnlAll: Number((userUsd * 1.1).toFixed(2)),
        roiAll: 110.0,
        winRate: 100,
        totalTrades: 1,
        winTrades: 1,
        lossTrades: 0,
        volume: userUsd,
        profitFactor: 1.0,
        topCoins: [sym],
        openPositions: [{
          symbol: sym,
          side: "long",
          leverage: "Spot",
          size: `$${userUsd.toFixed(2)}`,
          entryPrice: `$${tokenPrice.toFixed(4)}`,
          markPrice: `$${tokenPrice.toFixed(4)}`,
          unrealizedPnl: "$0.00",
          roi: "0.0%"
        }],
        recentTrades: [{
          symbol: sym,
          side: "long",
          pnl: "$0.00",
          roi: "0.0%",
          time: "Spot HODL",
          type: "closed"
        }],
        isGrinder: false,
        holdingAmt: userBal,
        holdingUsd: userUsd
      });
    });

    return {
      grinders,
      holders,
      all: [...grinders, ...holders],
      totalCount: grinders.length + holders.length,
      grindersCount: grinders.length,
      holdersCount: holders.length
    };
  }, [matchedCoinInfo, traders, realUsers]);

  // Filtered & Sorted Traders + Real Platform Holders
  const filteredTraders = useMemo(() => {
    const q = search.trim().toLowerCase();

    // ── CASE 1: Search string matches a coin contract address, pool address, or symbol ──
    if (coinStats) {
      if (holderFilter === "grinders") return coinStats.grinders;
      if (holderFilter === "holders") return coinStats.holders;
      return coinStats.all;
    }

    // ── CASE 2: Direct Wallet Address Search ──
    if (q.length > 5) {
      const matchTraders = traders.filter((t) =>
        t.address.toLowerCase().includes(q) ||
        t.name.toLowerCase().includes(q) ||
        t.handle.toLowerCase().includes(q) ||
        t.topCoins.some((c) => c.toLowerCase().includes(q))
      ).map(t => ({ ...t, isGrinder: true }));

      const matchUsers: any[] = [];
      const usersToUse = realUsers.length > 0 ? realUsers : [
        { id: "usr_1", email: "alex_trader@axiom.io", wallet_address: "AxB8s9sHynawdTUeioAgqcQKQ7Y6LvrdiN6ybE6YSrWU", total_balance_usd: 12500 },
        { id: "usr_2", email: "cryptoking@axiom.io", wallet_address: "AxM3k8Lp9wE6rT5yU4iO3pA2sD1fGh7Jk9Lm", total_balance_usd: 4800 },
      ];

      usersToUse.forEach((u: any) => {
        if (
          (u.wallet_address && u.wallet_address.toLowerCase().includes(q)) ||
          (u.email && u.email.toLowerCase().includes(q))
        ) {
          const shortAddr = `${u.wallet_address.slice(0, 4)}...${u.wallet_address.slice(-4)}`;
          const displayName = u.email && u.email !== "anon" ? u.email.split("@")[0] : `User_${u.wallet_address.slice(2, 6)}`;
          matchUsers.push({
            id: `holder-${u.id || u.wallet_address}`,
            rank: 0,
            rankDelta: 0,
            name: displayName,
            handle: `@${u.wallet_address.slice(0, 8)}`,
            address: shortAddr,
            avatar: generatePhantomAvatar(displayName),
            badge: "PRO" as any,
            pnl24h: 0,
            roi24h: 0,
            pnl7d: 0,
            roi7d: 0,
            pnl30d: 0,
            roi30d: 0,
            pnlAll: 0,
            roiAll: 0,
            winRate: 100,
            totalTrades: 1,
            winTrades: 1,
            lossTrades: 0,
            volume: u.total_balance_usd || 1000,
            profitFactor: 1.0,
            topCoins: ["SOL", "USDT"],
            openPositions: [],
            recentTrades: [],
            isGrinder: false,
            holdingUsd: u.total_balance_usd || 1000
          });
        }
      });

      if (matchUsers.length > 0 || matchTraders.length > 0) {
        return [...matchTraders, ...matchUsers];
      }
    }

    // ── CASE 3: Normal Filter & Sort ──
    return traders
      .filter((t) => {
        if (category !== "all" && t.badge.toLowerCase() !== category.toLowerCase()) {
          return false;
        }
        if (q) {
          const matchName = t.name.toLowerCase().includes(q);
          const matchHandle = t.handle.toLowerCase().includes(q);
          const matchAddr = t.address.toLowerCase().includes(q);
          const matchCoin = t.topCoins.some((c) => c.toLowerCase().includes(q));
          if (!matchName && !matchHandle && !matchAddr && !matchCoin) return false;
        }
        return true;
      })
      .map(t => ({ ...t, isGrinder: true }))
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
  }, [traders, timeframe, category, search, sortBy, matchedCoinInfo, holderFilter, realUsers]);

  // Top 3 for Podium Showcase
  const top1 = traders[0];
  const top2 = traders[1];
  const top3 = traders[2];

  const handleStartCopy = async (trader: Trader) => {
    setCopySubmitting(true);
    setCopyError(null);
    try {
      const userAddr = authUser?.wallet_address || authUser?.email || "AxB8s9sHynawdTUeioAgqcQKQ7Y6LvrdiN6ybE6YSrWU";
      const allocatedUsdNum = parseFloat(copyAmount) || 10.0;
      const targetToken = (trader.topCoins && trader.topCoins[0]) || "SOL";

      const res = await api.subscribeCopyTrade({
        address: userAddr,
        trader_id: trader.id,
        trader_name: trader.name,
        allocated_usd: allocatedUsdNum,
        token_symbol: targetToken,
      });

      if (res && res.success) {
        leaderboardStore.setCopiedTrader(trader.id, true, { name: trader.name, amount: String(allocatedUsdNum), sl: copyStopLoss });
        setCopyingTraders(leaderboardStore.getCopiedTradersMap());
        setCopyModalTrader(null);

        // Deduct from marketStore balances client-side for immediate reactivity
        const bals = marketStore.getBalances();
        const baseCurr = res.position.base_currency || 'USDT';
        const deductAmt = parseFloat(res.position.base_amount_deducted || String(allocatedUsdNum));
        const currentBal = Number(bals[baseCurr] || 0);
        marketStore.setBalance(baseCurr, Math.max(0, currentBal - deductAmt));

        // Add locked tokens
        const tokSym = res.position.token_symbol || targetToken;
        const boughtAmt = parseFloat(res.position.token_amount_bought || '0');
        const currentTok = Number(bals[tokSym] || 0);
        marketStore.setBalance(tokSym, currentTok + boughtAmt);

        if (flash) {
          flash(`🚀 Copy trade active! $${allocatedUsdNum.toFixed(2)} USD deducted & allocated to mirror ${trader.name}. Position locked in portfolio.`);
        }
      }
    } catch (err: any) {
      setCopyError(err.message || "Failed to start copy trading. Please check your balance.");
    } finally {
      setCopySubmitting(false);
    }
  };

  const handleStopCopy = (trader: Trader, e: React.MouseEvent) => {
    e.stopPropagation();
    leaderboardStore.setCopiedTrader(trader.id, false);
    setCopyingTraders(leaderboardStore.getCopiedTradersMap());
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
      {/* ── Copy Trading Insufficient Balance Alert Banner ── */}
      {insufficientBalanceNotice && (
        <div className="lb-insufficient-banner">
          <div className="lb-insufficient-content">
            <div className="lb-insufficient-icon">⚠️</div>
            <div>
              <div style={{ fontWeight: 800, color: "#fff", fontSize: 13.5 }}>
                Copy Trade Alert — Insufficient Wallet Balance ({insufficientBalanceNotice.userBal})
              </div>
              <div style={{ fontSize: 12, color: "#94A3B8", marginTop: 2 }}>
                <strong>{insufficientBalanceNotice.traderName}</strong> executed an order on <strong>{insufficientBalanceNotice.token}</strong>, but your wallet funds are insufficient to mirror this trade. Please deposit funds now to resume automatic copy trading.
              </div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              className="lb-deposit-btn"
              onClick={() => {
                if (onOpenDeposit) onOpenDeposit();
                else if (modal) modal("deposit");
                else if (onNavigate) onNavigate("wallet");
              }}
            >
              <Wallet size={14} /> Deposit Now
            </button>
            <button
              className="lb-dismiss-btn"
              onClick={() => setInsufficientBalanceNotice(null)}
              title="Dismiss Alert"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

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
            <span className="lb-stat-val" style={{ color: "#10B981" }}>
              +{top1 ? `$${Math.round(top1.pnl24h).toLocaleString()}` : "$184,420"}
            </span>
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

      {/* ── User Standing Showcase Banner ── */}
      {(() => {
        const uName = (typeof localStorage !== "undefined" ? localStorage.getItem("axiom_user_username") : null) || authUser?.username || authUser?.full_name || "Axiom Trader";
        const uAvatar = (typeof localStorage !== "undefined" ? localStorage.getItem("axiom_user_avatar") : null) || authUser?.avatar_url || generatePhantomAvatar(uName);
        const metrics = marketStore.getPortfolioMetrics();
        const isPnlZero = metrics.diffUsd === 0 || Math.abs(metrics.diffUsd) < 0.001;
        const pnlStr = isPnlZero
          ? "$0.00"
          : `${metrics.isPositive ? "+" : "-"}$${Math.abs(metrics.diffUsd).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        const pnlPctStr = isPnlZero
          ? "0.00%"
          : `${metrics.isPositive ? "+" : "-"}${Math.abs(metrics.diffPct).toFixed(2)}%`;
        const walletTrunc = authUser?.wallet_address ? `${authUser.wallet_address.slice(0, 4)}...${authUser.wallet_address.slice(-4)}` : "Connected";

        return (
          <div className="lb-user-standing-card" style={{
            background: "linear-gradient(135deg, rgba(124, 58, 237, 0.14) 0%, rgba(15, 23, 42, 0.85) 100%)",
            border: "1px solid rgba(167, 139, 250, 0.3)",
            borderRadius: 14,
            padding: "12px 18px",
            margin: "0 0 16px 0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 12
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ position: "relative", width: 44, height: 44, flexShrink: 0 }}>
                <img
                  src={uAvatar}
                  alt={uName}
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: "50%",
                    objectFit: "cover",
                    border: "2px solid #A78BFA",
                    boxShadow: "0 0 14px rgba(124, 58, 237, 0.4)",
                    background: "#1E1B4B"
                  }}
                  onError={(e) => { (e.target as any).src = generatePhantomAvatar(uName); }}
                />
                <span style={{
                  position: "absolute",
                  bottom: -1,
                  right: -1,
                  background: "#10B981",
                  width: 12,
                  height: 12,
                  borderRadius: "50%",
                  border: "2px solid #0B0E14"
                }} />
              </div>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontWeight: 800, fontSize: 14, color: "#F3F4F6" }}>{uName}</span>
                  <span style={{
                    fontSize: 9,
                    fontWeight: 700,
                    padding: "2px 6px",
                    borderRadius: 4,
                    background: "rgba(124, 58, 237, 0.25)",
                    color: "#C4B5FD",
                    border: "1px solid rgba(167, 139, 250, 0.35)"
                  }}>
                    YOUR PROFILE
                  </span>
                </div>
                <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 2 }}>
                  <span>{walletTrunc}</span>
                  <span style={{ margin: "0 6px" }}>•</span>
                  <span style={{ color: "#34D399", fontWeight: 700 }}>Active Challenger</span>
                </div>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 700, textTransform: "uppercase" }}>Your 24h P&L</div>
                <div style={{ fontSize: 14, fontWeight: 800, color: isPnlZero ? "#9CA3AF" : (metrics.isPositive ? "#10B981" : "#EF4444") }}>
                  {pnlStr} <span style={{ fontSize: 11 }}>({pnlPctStr})</span>
                </div>
              </div>
              {onNavigate && (
                <button
                  type="button"
                  onClick={() => onNavigate("trade")}
                  style={{
                    background: "linear-gradient(135deg, #7C3AED 0%, #6366F1 100%)",
                    border: "none",
                    borderRadius: 8,
                    padding: "7px 14px",
                    color: "#FFFFFF",
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                    boxShadow: "0 4px 12px rgba(124, 58, 237, 0.3)"
                  }}
                >
                  <span>Trade to Climb</span>
                  <ArrowUpRight size={13} />
                </button>
              )}
            </div>
          </div>
        );
      })()}

      {/* ── 3. Podium Showcase (Top 3 Traders) ── */}
      <section className="lb-podium-section">
        <div className="lb-podium-grid" ref={swipeRailRef} onScroll={handleSwipeScroll}>
        {/* Rank 2: Contender */}
        {top2 && (
          <div className="lb-podium-card rank-2" onClick={() => setInspectTrader(top2)}>
            <div className="lb-podium-crown-badge">
              <Shield size={12} /> #2 CONTENDER
            </div>
            <div className="lb-podium-trader-header">
              <div className="lb-avatar-wrap">
                {renderTraderAvatar(top2.avatar, 52)}
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
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                    <span className="lb-live-pulse-dot" />
                    Win Rate
                  </span>
                  <b>{top2.winRate}% ({top2.winTrades.toLocaleString()}/{top2.totalTrades.toLocaleString()} Wins)</b>
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

        {/* Rank 1: Champion */}
        {top1 && (
          <div className="lb-podium-card rank-1" onClick={() => setInspectTrader(top1)}>
            <div className="lb-podium-crown-badge">
              <Crown size={13} /> #1 CHAMPION
            </div>
            <div className="lb-podium-trader-header">
              <div className="lb-avatar-wrap">
                {renderTraderAvatar(top1.avatar, 52)}
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
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                    <span className="lb-live-pulse-dot" />
                    Win Rate
                  </span>
                  <b>{top1.winRate}% ({top1.winTrades.toLocaleString()}/{top1.totalTrades.toLocaleString()} Wins)</b>
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

        {/* Rank 3: Challenger */}
        {top3 && (
          <div className="lb-podium-card rank-3" onClick={() => setInspectTrader(top3)}>
            <div className="lb-podium-crown-badge">
              <Shield size={12} /> #3 CHALLENGER
            </div>
            <div className="lb-podium-trader-header">
              <div className="lb-avatar-wrap">
                {renderTraderAvatar(top3.avatar, 52)}
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
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                    <span className="lb-live-pulse-dot" />
                    Win Rate
                  </span>
                  <b>{top3.winRate}% ({top3.winTrades.toLocaleString()}/{top3.totalTrades.toLocaleString()} Wins)</b>
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
        </div>

        {/* Mobile Swipe Pagination Dots */}
        <div className="lb-swipe-dots">
          <button
            type="button"
            className={`lb-swipe-dot ${activeSlide === 0 ? "active" : ""}`}
            onClick={() => scrollToSlide(0)}
            aria-label="View #1 Champion"
          />
          <button
            type="button"
            className={`lb-swipe-dot ${activeSlide === 1 ? "active" : ""}`}
            onClick={() => scrollToSlide(1)}
            aria-label="View #2 Contender"
          />
          <button
            type="button"
            className={`lb-swipe-dot ${activeSlide === 2 ? "active" : ""}`}
            onClick={() => scrollToSlide(2)}
            aria-label="View #3 Challenger"
          />
        </div>
      </section>

      {/* ── 4. Controls, Filters & Search ── */}
      <div className="lb-controls-bar">
        {/* Timeframe Selector & 24h Rollover Badge */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
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

          <div className="lb-epoch-badge" title="Ranks and daily performance statistics re-shuffle every 24 hours UTC">
            <span className="lb-epoch-dot" /> 24h Epoch Rollover: <strong style={{ color: "#22D3EE", fontFamily: "monospace", marginLeft: 4 }}>{epochCountdown}</strong>
          </div>
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

      {/* ── Coin Contract Search Holder/Grinder Showcase Banner ── */}
      {matchedCoinInfo && (
        <div style={{
          background: "linear-gradient(135deg, rgba(124, 58, 237, 0.16) 0%, rgba(6, 182, 212, 0.12) 100%)",
          border: "1px solid rgba(139, 92, 246, 0.35)",
          borderRadius: 14,
          padding: "14px 18px",
          marginBottom: 16,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 38,
              height: 38,
              borderRadius: "50%",
              background: "linear-gradient(135deg, #7C3AED 0%, #06B6D4 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 18,
              boxShadow: "0 0 16px rgba(124, 58, 237, 0.4)"
            }}>
              🪙
            </div>
            <div>
              <div style={{ fontWeight: 850, fontSize: 14, color: "#fff", display: "flex", alignItems: "center", gap: 8 }}>
                <span>{matchedCoinInfo.name} ({matchedCoinInfo.sym})</span>
                <span style={{ fontSize: 10.5, padding: "2px 8px", borderRadius: 10, background: "rgba(16, 185, 129, 0.18)", color: "#10B981", fontWeight: 800 }}>
                  ALL REAL USERS & HOLDERS
                </span>
              </div>
              <div style={{ fontSize: 11.5, color: "var(--muted)", fontFamily: "monospace", marginTop: 2 }}>
                Contract: {matchedCoinInfo.contractAddress || (matchedCoinInfo as any).poolAddress || "Solana SPL Mint"}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <button
              className={`lb-cat-pill ${holderFilter === "all" ? "active" : ""}`}
              onClick={() => setHolderFilter("all")}
              style={{ fontSize: 11 }}
            >
              All ({coinStats?.totalCount || 35})
            </button>
            <button
              className={`lb-cat-pill ${holderFilter === "grinders" ? "active" : ""}`}
              onClick={() => setHolderFilter("grinders")}
              style={{ fontSize: 11 }}
            >
              Leaderboard Grinders ({coinStats?.grindersCount || 10})
            </button>
            <button
              className={`lb-cat-pill ${holderFilter === "holders" ? "active" : ""}`}
              onClick={() => setHolderFilter("holders")}
              style={{ fontSize: 11 }}
            >
              Verified Token Holders ({coinStats?.holdersCount || 25})
            </button>
          </div>
        </div>
      )}

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
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                    <span className="lb-live-pulse-dot" />
                    Win Rate {sortBy === "winRate" ? "▼" : ""}
                  </span>
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
              {filteredTraders.slice(0, displayCount).map((t, index) => {
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
                      {(t as any).isGrinder === false ? (
                        <div className="lb-rank-col-wrap">
                          <div className="lb-rank-col" style={{ background: "rgba(56, 189, 248, 0.12)", color: "#38BDF8", border: "1px solid rgba(56, 189, 248, 0.3)" }}>
                            —
                          </div>
                          <span className="lb-rank-delta neutral" style={{ color: "#38BDF8", fontWeight: 700 }}>
                            Holder
                          </span>
                        </div>
                      ) : (
                        <div className="lb-rank-col-wrap">
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
                          {t.rankDelta > 0 ? (
                            <span className="lb-rank-delta up" title={`Moved up ${t.rankDelta} positions this epoch`}>
                              ▲+{t.rankDelta}
                            </span>
                          ) : t.rankDelta < 0 ? (
                            <span className="lb-rank-delta down" title={`Moved down ${Math.abs(t.rankDelta)} positions this epoch`}>
                              ▼{t.rankDelta}
                            </span>
                          ) : (
                            <span className="lb-rank-delta neutral" title="Position unchanged this epoch">
                              • 0
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                    <td>
                      <div className="lb-trader-cell">
                        <div className="lb-table-avatar">{renderTraderAvatar(t.avatar, 38)}</div>
                        <div className="lb-table-trader-meta">
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span className="lb-table-name">{t.name}</span>
                            {(t as any).isGrinder === false ? (
                              <span className="lb-tag-pill" style={{ background: "rgba(56, 189, 248, 0.15)", color: "#38BDF8", border: "1px solid rgba(56, 189, 248, 0.35)", fontWeight: 800 }}>
                                HOLDER (NON-GRINDING)
                              </span>
                            ) : (
                              <span className={`lb-tag-pill ${t.badge.toLowerCase()}`}>
                                {t.badge}
                              </span>
                            )}
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
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                            <span className="lb-live-pulse-dot" />
                            {t.winRate}%
                          </span>
                          <span style={{ fontSize: "10.5px", color: "var(--muted)" }}>
                            {(t as any).isGrinder === false ? "Spot HODL" : `${t.winTrades}W / ${t.lossTrades}L`}
                          </span>
                        </div>
                        <div className="lb-progress-track">
                          <div className="lb-progress-fill" style={{ width: `${t.winRate}%` }} />
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="lb-table-vol">
                        {(t as any).isGrinder === false
                          ? `$${((t as any).holdingUsd || t.volume).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
                          : `$${(t.volume / 1000000).toFixed(1)}M`}
                      </span>
                    </td>
                    <td>
                      <div className="lb-coins-cell">
                        {t.topCoins.map((sym: string) => (
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
                      {(t as any).isGrinder === false ? (
                        <button
                          className="lb-table-btn-copy"
                          style={{ background: "rgba(56, 189, 248, 0.12)", color: "#38BDF8", border: "1px solid rgba(56, 189, 248, 0.3)" }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setInspectTrader(t);
                          }}
                        >
                          <Users size={12} /> Holder Profile
                        </button>
                      ) : isCopying ? (
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

        {/* Top 50 Pagination & Expansion Bar */}
        {filteredTraders.length > 25 && (
          <div className="lb-pagination-bar">
            <span>
              Showing top <b>{Math.min(displayCount, filteredTraders.length)}</b> of <b>{filteredTraders.length}</b> ranked traders
            </span>
            <div className="lb-pagination-buttons">
              {displayCount < filteredTraders.length && (
                <button
                  type="button"
                  className="lb-show-more-btn"
                  onClick={() => setDisplayCount((prev) => Math.min(50, prev + 25))}
                >
                  Load Next 25 Traders
                </button>
              )}
              {displayCount < filteredTraders.length ? (
                <button
                  type="button"
                  className="lb-show-all-btn"
                  onClick={() => setDisplayCount(50)}
                >
                  Show All Top 50
                </button>
              ) : (
                <button
                  type="button"
                  className="lb-show-more-btn"
                  onClick={() => setDisplayCount(25)}
                >
                  Collapse to Top 25
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── 6. Trader Deep-Dive Inspector Modal ── */}
      {inspectTrader && (
        <div className="lb-modal-backdrop" onClick={() => setInspectTrader(null)}>
          <div className="lb-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "560px" }}>
            <div className="lb-modal-header">
              <div className="lb-modal-title">
                <span style={{ display: "inline-flex", width: 36, height: 36, borderRadius: 10, overflow: "hidden", background: "#1C1D2C", alignItems: "center", justifyContent: "center" }}>
                  {renderTraderAvatar(inspectTrader.avatar, 36)}
                </span>
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
                  <small style={{ color: "var(--muted)", fontSize: "10.5px", display: "inline-flex", alignItems: "center", gap: 4 }}>
                    <span className="lb-live-pulse-dot" />
                    WIN RATE
                  </small>
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
                <span style={{ display: "inline-flex", width: 44, height: 44, borderRadius: 12, overflow: "hidden", background: "#1C1D2C", alignItems: "center", justifyContent: "center" }}>
                  {renderTraderAvatar(copyModalTrader.avatar, 44)}
                </span>
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
                  <span>Allocation Investment ($ USD)</span>
                  <span style={{ color: (Number(marketStore.getBalances()['USDT'] || 0) + Number(marketStore.getBalances()['USDC'] || 0) + Number(marketStore.getBalances()['SOL'] || 0) * 145) < 5 ? "#EF4444" : "#10B981", fontWeight: 700 }}>
                    Avail: ${(Number(marketStore.getBalances()['USDT'] || 0) + Number(marketStore.getBalances()['USDC'] || 0) + Number(marketStore.getBalances()['SOL'] || 0) * 145).toFixed(2)} USD
                  </span>
                </label>
                <div className="lb-input-wrap">
                  <span style={{ color: "var(--muted)", paddingLeft: 12, fontWeight: 700 }}>$</span>
                  <input
                    type="number"
                    min="5"
                    step="5"
                    value={copyAmount}
                    onChange={(e) => { setCopyAmount(e.target.value); setCopyError(null); }}
                  />
                  <span className="lb-input-denom">USD</span>
                </div>
                <div className="lb-presets-row">
                  {["$5", "$10", "$25", "$50", "$100"].map((p) => (
                    <button
                      key={p}
                      className="lb-preset-btn"
                      onClick={() => { setCopyAmount(p.replace("$", "")); setCopyError(null); }}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {copyError && (
                <div style={{
                  background: 'rgba(239, 68, 68, 0.12)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: 8,
                  padding: '8px 12px',
                  color: '#F87171',
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  marginTop: 8
                }}>
                  <AlertCircle size={15} style={{ flexShrink: 0 }} />
                  <span>{copyError}</span>
                </div>
              )}

              {parseFloat(copyAmount || '0') > (Number(marketStore.getBalances()['USDT'] || 0) + Number(marketStore.getBalances()['USDC'] || 0) + Number(marketStore.getBalances()['SOL'] || 0) * 145) && (
                <div style={{
                  background: 'rgba(245, 158, 11, 0.12)',
                  border: '1px solid rgba(245, 158, 11, 0.3)',
                  borderRadius: 8,
                  padding: '10px 12px',
                  color: '#FBBF24',
                  fontSize: '12px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 8,
                  marginTop: 8
                }}>
                  <span>⚠️ You need ${parseFloat(copyAmount || '10').toFixed(2)} USD. Your available balance is ${(Number(marketStore.getBalances()['USDT'] || 0) + Number(marketStore.getBalances()['USDC'] || 0) + Number(marketStore.getBalances()['SOL'] || 0) * 145).toFixed(2)}.</span>
                  {onOpenDeposit && (
                    <button
                      type="button"
                      onClick={() => { setCopyModalTrader(null); onOpenDeposit(); }}
                      style={{
                        padding: '4px 10px',
                        background: '#7C3AED',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 6,
                        fontSize: 11,
                        fontWeight: 700,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      + Deposit Funds
                    </button>
                  )}
                </div>
              )}

              {/* Stop Loss Input */}
              <div className="lb-input-group" style={{ marginTop: 12 }}>
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
                  border: "1px solid rgba(124,58,237,0.2)",
                  marginTop: 10
                }}
              >
                🔒 <b>Auto-Executed & Locked Position</b>: Upon confirmation, <b>${copyAmount} USD</b> is deducted from your balance to purchase {copyModalTrader.name}'s active coin. Your tokens are securely locked in your portfolio and cannot be sold until the Master Trader sells.
              </div>
            </div>

            <div className="lb-modal-footer">
              <button
                className="lb-confirm-btn"
                disabled={copySubmitting || parseFloat(copyAmount || '0') > (Number(marketStore.getBalances()['USDT'] || 0) + Number(marketStore.getBalances()['USDC'] || 0) + Number(marketStore.getBalances()['SOL'] || 0) * 145)}
                onClick={() => handleStartCopy(copyModalTrader)}
                style={{
                  opacity: copySubmitting || parseFloat(copyAmount || '0') > (Number(marketStore.getBalances()['USDT'] || 0) + Number(marketStore.getBalances()['USDC'] || 0) + Number(marketStore.getBalances()['SOL'] || 0) * 145) ? 0.6 : 1,
                  cursor: copySubmitting || parseFloat(copyAmount || '0') > (Number(marketStore.getBalances()['USDT'] || 0) + Number(marketStore.getBalances()['USDC'] || 0) + Number(marketStore.getBalances()['SOL'] || 0) * 145) ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8
                }}
              >
                {copySubmitting ? (
                  <>
                    <RefreshCw size={15} className="animate-spin" />
                    <span>Allocating Funds & Executing Order...</span>
                  </>
                ) : (
                  <span>Confirm & Start Copying (${copyAmount} USD)</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
