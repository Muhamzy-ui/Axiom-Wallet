// Leaderboard Store — Top 100 Traders, 2-Day Epoch Shuffling, and Admin Control
import { marketStore } from "./marketStore";

export interface Trader {
  id: string;
  rank: number;
  rankDelta: number; // positive = moved up, negative = moved down, 0 = unchanged
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

export interface AdminTradeControl {
  mode: "balanced" | "heavy_buy" | "heavy_sell" | "only_buy" | "only_sell";
  buyRatio: number; // 0 to 100
  minUsd: number;
  maxUsd: number;
  frequencySeconds: number;
  lastUpdated: number;
}

// ── Default Top 8 Traders (Admin controllable) ──────────────────────────────
export const DEFAULT_TOP_8: Trader[] = [
  {
    id: "trader-1",
    rank: 1,
    rankDelta: 0,
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
    rankDelta: 1,
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
    rankDelta: -1,
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
    rankDelta: 2,
    name: "WhaleWatcher_99",
    handle: "@whalewatcher",
    address: "8f42...99c1",
    avatar: "🐋",
    badge: "WHALE",
    pnl24h: 72400.00,
    roi24h: 512.0,
    pnl7d: 198000.00,
    roi7d: 1210.0,
    pnl30d: 540000.00,
    roi30d: 2300.0,
    pnlAll: 1620000.00,
    roiAll: 5800.0,
    winRate: 81.5,
    totalTrades: 840,
    winTrades: 685,
    lossTrades: 155,
    volume: 16200000,
    profitFactor: 4.9,
    topCoins: ["SOL", "BTC"],
    openPositions: [],
    recentTrades: [
      { symbol: "SOL", side: "long", pnl: "+$18,900", roi: "+140%", time: "30m ago", type: "closed" }
    ]
  },
  {
    id: "trader-5",
    rank: 5,
    rankDelta: 0,
    name: "AlphaHunter",
    handle: "@alphahunter",
    address: "44da...11e2",
    avatar: "⚔️",
    badge: "PRO",
    pnl24h: 61800.00,
    roi24h: 460.0,
    pnl7d: 175000.00,
    roi7d: 1100.0,
    pnl30d: 480000.00,
    roi30d: 2100.0,
    pnlAll: 1450000.00,
    roiAll: 5200.0,
    winRate: 79.8,
    totalTrades: 780,
    winTrades: 622,
    lossTrades: 158,
    volume: 14100000,
    profitFactor: 4.6,
    topCoins: ["WIF", "BONK"],
    openPositions: [],
    recentTrades: [
      { symbol: "WIF", side: "long", pnl: "+$12,400", roi: "+115%", time: "50m ago", type: "closed" }
    ]
  },
  {
    id: "trader-6",
    rank: 6,
    rankDelta: -2,
    name: "PhantomQuant",
    handle: "@phantomquant",
    address: "11cb...884a",
    avatar: "🤖",
    badge: "ALGO",
    pnl24h: 53200.00,
    roi24h: 395.5,
    pnl7d: 156000.00,
    roi7d: 980.0,
    pnl30d: 420000.00,
    roi30d: 1850.0,
    pnlAll: 1300000.00,
    roiAll: 4700.0,
    winRate: 86.4,
    totalTrades: 1150,
    winTrades: 994,
    lossTrades: 156,
    volume: 19400000,
    profitFactor: 5.1,
    topCoins: ["BTC", "ETH", "SOL"],
    openPositions: [],
    recentTrades: [
      { symbol: "BTC", side: "long", pnl: "+$9,400", roi: "+85%", time: "1h ago", type: "closed" }
    ]
  },
  {
    id: "trader-7",
    rank: 7,
    rankDelta: 1,
    name: "MemeLord_Pump",
    handle: "@memelord",
    address: "55bc...3399",
    avatar: "🚀",
    badge: "DEGEN",
    pnl24h: 46900.00,
    roi24h: 580.0,
    pnl7d: 138000.00,
    roi7d: 890.0,
    pnl30d: 370000.00,
    roi30d: 1650.0,
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
    rankDelta: -1,
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
  }
];

// ── Generator for Ranks 9 to 100 ────────────────────────────────────────────
const TRADER_SEEDS = [
  { name: "FlashTrader", handle: "@flashtrader", badge: "SNIPER", avatar: "⚡", coins: ["SOL", "WIF"] },
  { name: "DiamondHands_X", handle: "@diamondhands", badge: "PRO", avatar: "💎", coins: ["SOL", "POPCAT"] },
  { name: "RaydiumWhale", handle: "@raydiumwhale", badge: "WHALE", avatar: "🐋", coins: ["RAY", "SOL"] },
  { name: "BonkBaron", handle: "@bonkbaron", badge: "DEGEN", avatar: "🐕", coins: ["BONK", "SOL"] },
  { name: "JupiterArbitrage", handle: "@jup_arbitrage", badge: "ALGO", avatar: "🪐", coins: ["JUP", "SOL"] },
  { name: "SolSurfer_99", handle: "@solsurfer", badge: "PRO", avatar: "🏄", coins: ["SOL", "BONK"] },
  { name: "ApexLiquidator", handle: "@apexliquidator", badge: "SNIPER", avatar: "🎯", coins: ["SOL", "WIF"] },
  { name: "PumpMaster69", handle: "@pumpmaster", badge: "DEGEN", avatar: "🚀", coins: ["POPCAT", "BONK"] },
  { name: "ShadowTrader", handle: "@shadowtrader", badge: "PRO", avatar: "🥷", coins: ["BTC", "SOL"] },
  { name: "DriftRunner", handle: "@driftrunner", badge: "ALGO", avatar: "🏎️", coins: ["SOL", "ETH"] },
  { name: "ZeroSlippage", handle: "@zeroslippage", badge: "ALGO", avatar: "🛡️", coins: ["SOL", "USDC"] },
  { name: "CyberQuant", handle: "@cyberquant", badge: "ALGO", avatar: "🤖", coins: ["ETH", "SOL"] },
  { name: "PepeMaxi_Sol", handle: "@pepemaxi", badge: "DEGEN", avatar: "🐸", coins: ["PEPE", "SOL"] },
  { name: "MoonMission", handle: "@moonmission", badge: "DEGEN", avatar: "🌕", coins: ["BONK", "WIF"] },
  { name: "SolanaSensei", handle: "@solsensei", badge: "PRO", avatar: "🥋", coins: ["SOL", "JUP"] },
  { name: "PerpScalper", handle: "@perpscalper", badge: "SNIPER", avatar: "✂️", coins: ["SOL", "POPCAT"] },
  { name: "NeonSniper", handle: "@neonsniper", badge: "SNIPER", avatar: "🔮", coins: ["WIF", "SOL"] },
  { name: "BullMarketGod", handle: "@bullgod", badge: "WHALE", avatar: "🐂", coins: ["SOL", "BTC"] },
  { name: "FalconPerps", handle: "@falconperps", badge: "PRO", avatar: "🦅", coins: ["SOL", "WIF"] },
  { name: "BlockBeast", handle: "@blockbeast", badge: "WHALE", avatar: "🦍", coins: ["SOL", "BONK"] },
  { name: "TitanSwap", handle: "@titanswap", badge: "ALGO", avatar: "🏛️", coins: ["SOL", "ETH"] },
  { name: "OrbitAlpha", handle: "@orbitalpha", badge: "PRO", avatar: "🛰️", coins: ["JUP", "SOL"] },
  { name: "MatrixTrader", handle: "@matrixtrader", badge: "ALGO", avatar: "💻", coins: ["BTC", "SOL"] },
  { name: "ZenithCapital", handle: "@zenithcap", badge: "WHALE", avatar: "🏔️", coins: ["SOL", "BTC"] },
  { name: "ViperDEX", handle: "@viperdex", badge: "SNIPER", avatar: "🐍", coins: ["WIF", "POPCAT"] },
  { name: "EchoWhale", handle: "@echowhale", badge: "WHALE", avatar: "🔊", coins: ["SOL", "BONK"] },
  { name: "SolStrat_HQ", handle: "@solstrat", badge: "PRO", avatar: "♟️", coins: ["SOL", "RAY"] },
  { name: "QuantumSwap", handle: "@quantumswap", badge: "ALGO", avatar: "⚛️", coins: ["SOL", "ETH"] },
  { name: "KronosSniper", handle: "@kronossniper", badge: "SNIPER", avatar: "⏳", coins: ["SOL", "WIF"] },
  { name: "AlphaDog_SOL", handle: "@alphadog", badge: "DEGEN", avatar: "🐕‍🦺", coins: ["BONK", "POPCAT"] },
  { name: "DeltaNeutral_Bot", handle: "@deltaneutral", badge: "ALGO", avatar: "⚖️", coins: ["SOL", "USDC"] },
  { name: "SolRunner_42", handle: "@solrunner", badge: "PRO", avatar: "🏃", coins: ["SOL", "BONK"] },
  { name: "ApexHunter", handle: "@apexhunter", badge: "SNIPER", avatar: "🏹", coins: ["WIF", "SOL"] },
  { name: "CryptoSamurai", handle: "@samurai_sol", badge: "PRO", avatar: "⚔️", coins: ["SOL", "JUP"] },
  { name: "NovaPerp", handle: "@novaperp", badge: "ALGO", avatar: "🌟", coins: ["SOL", "ETH"] },
  { name: "LiquidityKing", handle: "@liquidityking", badge: "WHALE", avatar: "👑", coins: ["SOL", "RAY"] },
  { name: "MemeMaven", handle: "@mememaven", badge: "DEGEN", avatar: "🦄", coins: ["POPCAT", "BONK"] },
  { name: "SolanaWizard", handle: "@solwizard", badge: "PRO", avatar: "🧙", coins: ["SOL", "WIF"] },
  { name: "VortexTrader", handle: "@vortextrader", badge: "SNIPER", avatar: "🌀", coins: ["BONK", "SOL"] },
  { name: "GoldenCross", handle: "@goldencross", badge: "PRO", avatar: "✝️", coins: ["BTC", "SOL"] },
  { name: "BullRunProphet", handle: "@bullprophet", badge: "DEGEN", avatar: "📜", coins: ["SOL", "WIF"] },
  { name: "SolGhost", handle: "@solghost", badge: "SNIPER", avatar: "👻", coins: ["POPCAT", "SOL"] },
  { name: "IronHands", handle: "@ironhands", badge: "PRO", avatar: "🦾", coins: ["SOL", "BONK"] },
  { name: "DEXInfiltrator", handle: "@dexinfiltrator", badge: "SNIPER", avatar: "🕵️", coins: ["WIF", "JUP"] },
  { name: "OmegaQuant", handle: "@omegaquant", badge: "ALGO", avatar: "Ω", coins: ["SOL", "ETH"] },
  { name: "SolanaGigaChad", handle: "@solgigachad", badge: "WHALE", avatar: "🗿", coins: ["SOL", "BONK"] },
  { name: "PhoenixTrades", handle: "@phoenixtrades", badge: "PRO", avatar: "🔥", coins: ["SOL", "POPCAT"] },
  { name: "CosmicSwap", handle: "@cosmicswap", badge: "DEGEN", avatar: "🌌", coins: ["WIF", "BONK"] },
  { name: "TrenchWarrior", handle: "@trenchwarrior", badge: "DEGEN", avatar: "🪖", coins: ["SOL", "POPCAT"] },
  { name: "PerpOverlord", handle: "@perpoverlord", badge: "PRO", avatar: "👑", coins: ["SOL", "WIF"] }
];

function generateTraderRanks9to100(): Trader[] {
  const result: Trader[] = [];
  const basePnl = 34000;
  const baseRoi = 380;
  const baseVolume = 8500000;

  for (let i = 9; i <= 100; i++) {
    const seed = TRADER_SEEDS[(i - 9) % TRADER_SEEDS.length];
    const suffix = i > 58 ? `_${i}` : "";
    const name = `${seed.name}${suffix}`;
    const handle = `${seed.handle}${suffix}`;
    const hex = Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, "0");
    const address = `${hex.slice(0, 4)}...${hex.slice(-4)}`;

    const pnlMultiplier = Math.max(0.12, 1 - (i - 9) * 0.0095);
    const pnl24h = Math.round(basePnl * pnlMultiplier * (0.85 + ((i * 17) % 30) / 100));
    const roi24h = Math.round(baseRoi * pnlMultiplier * (0.8 + ((i * 13) % 40) / 100));
    const winRate = Number((72 + ((i * 19) % 18) - ((i * 7) % 5)).toFixed(1));
    const volume = Math.round(baseVolume * pnlMultiplier * (0.9 + ((i * 23) % 25) / 100));

    result.push({
      id: `trader-${i}`,
      rank: i,
      rankDelta: 0,
      name,
      handle,
      address,
      avatar: seed.avatar,
      badge: seed.badge as any,
      pnl24h,
      roi24h,
      pnl7d: Math.round(pnl24h * 2.8),
      roi7d: Math.round(roi24h * 2.2),
      pnl30d: Math.round(pnl24h * 7.5),
      roi30d: Math.round(roi24h * 5.4),
      pnlAll: Math.round(pnl24h * 22),
      roiAll: Math.round(roi24h * 14),
      winRate: Math.min(94, Math.max(68, winRate)),
      totalTrades: 350 + (i * 11) % 600,
      winTrades: Math.round((350 + (i * 11) % 600) * (winRate / 100)),
      lossTrades: Math.round((350 + (i * 11) % 600) * (1 - winRate / 100)),
      volume,
      profitFactor: Number((2.8 + ((i * 7) % 22) / 10).toFixed(1)),
      topCoins: seed.coins,
      openPositions: [],
      recentTrades: [
        {
          symbol: seed.coins[0],
          side: "long",
          pnl: `+$${Math.round(pnl24h * 0.22).toLocaleString()}`,
          roi: `+${Math.round(roi24h * 0.35)}%`,
          time: `${(i % 12) + 1}h ago`,
          type: "closed"
        }
      ]
    });
  }

  return result;
}

// ── 2-Day Epoch Pseudo-Random Deterministic Shuffler ─────────────────────────
function get2DayEpoch(): number {
  return Math.floor(Date.now() / (2 * 86400 * 1000));
}

function seededShuffle<T>(arr: T[], seed: number): T[] {
  const result = [...arr];
  let s = seed;
  for (let i = result.length - 1; i > 0; i--) {
    s = (s * 9301 + 49297) % 233280;
    const j = Math.floor((s / 233280) * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

class LeaderboardStore {
  private baseRanks9to100: Trader[] = generateTraderRanks9to100();
  private listeners: Set<() => void> = new Set();

  constructor() {
    // Listen to localStorage changes across browser tabs
    if (typeof window !== "undefined") {
      window.addEventListener("storage", (e) => {
        if (e.key === "axiom_admin_top_8" || e.key === "axiom_admin_trade_control") {
          this.notify();
        }
      });
    }
  }

  public subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private notify() {
    this.listeners.forEach((fn) => fn());
  }

  // ── Top 8 Admin Controls ──────────────────────────────────────────────────
  public getTop8(): Trader[] {
    if (typeof window === "undefined") return DEFAULT_TOP_8;
    try {
      const saved = localStorage.getItem("axiom_admin_top_8");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length === 8) {
          return parsed;
        }
      }
    } catch {
      // fallback
    }
    return DEFAULT_TOP_8;
  }

  public saveTop8(top8: Trader[]): void {
    if (typeof window !== "undefined") {
      localStorage.setItem("axiom_admin_top_8", JSON.stringify(top8));
      this.notify();
    }
  }

  public resetTop8ToDefault(): void {
    if (typeof window !== "undefined") {
      localStorage.removeItem("axiom_admin_top_8");
      this.notify();
    }
  }

  // ── 100 Traders with 2-Day Epoch Rotation ──────────────────────────────────
  public getAll100Traders(): Trader[] {
    const top8 = this.getTop8();
    const epoch = get2DayEpoch();
    const prevEpoch = epoch - 1;

    // Deterministically shuffle ranks 9 to 100 for current epoch & previous epoch
    const currentShifted = seededShuffle(this.baseRanks9to100, epoch * 7919);
    const prevShifted = seededShuffle(this.baseRanks9to100, prevEpoch * 7919);

    // Map previous rank index for delta computation
    const prevRankMap = new Map<string, number>();
    prevShifted.forEach((trader, idx) => {
      prevRankMap.set(trader.id, 9 + idx);
    });

    const ranks9to100: Trader[] = currentShifted.map((t, idx) => {
      const currentRank = 9 + idx;
      const prevRank = prevRankMap.get(t.id) ?? currentRank;
      const rankDelta = prevRank - currentRank; // positive = moved up in rank

      return {
        ...t,
        rank: currentRank,
        rankDelta
      };
    });

    return [...top8, ...ranks9to100];
  }

  // ── Admin Live Buy/Sell Trade Stream Controls ─────────────────────────────
  public getTradeControl(): AdminTradeControl {
    const defaultCtrl: AdminTradeControl = {
      mode: "balanced",
      buyRatio: 50,
      minUsd: 25,
      maxUsd: 1200,
      frequencySeconds: 1.5,
      lastUpdated: Date.now()
    };

    if (typeof window === "undefined") return defaultCtrl;
    try {
      const saved = localStorage.getItem("axiom_admin_trade_control");
      if (saved) {
        return { ...defaultCtrl, ...JSON.parse(saved) };
      }
    } catch {
      // fallback
    }
    return defaultCtrl;
  }

  public saveTradeControl(ctrl: AdminTradeControl): void {
    if (typeof window !== "undefined") {
      localStorage.setItem("axiom_admin_trade_control", JSON.stringify(ctrl));
      this.notify();
    }
  }

  // ── Manual Instant Whale Trade Injection ───────────────────────────────────
  public triggerManualTrade(sym: string, side: "Buy" | "Sell", usdAmount?: number): void {
    const token = marketStore.getToken(sym) || marketStore.tokens[0];
    if (!token) return;

    const usd = usdAmount || (side === "Buy" ? 45000 : 38000);
    const price = token.numericPrice || 1.0;
    const tokenAmt = Number((usd / price).toFixed(price < 0.001 ? 0 : 2));

    const whaleRosters = [
      { addr: "9a8f...4e1b", emoji: "👑" },
      { addr: "3c2a...88ff", emoji: "🎯" },
      { addr: "71e9...b204", emoji: "⚡" },
      { addr: "8f42...99c1", emoji: "🐋" }
    ];
    const r = whaleRosters[Math.floor(Math.random() * whaleRosters.length)];

    marketStore.addTrade({
      sym: token.sym,
      type: side,
      usd,
      tokenAmt,
      price,
      trader: r.addr,
      traderEmoji: r.emoji
    });
  }
}

export const leaderboardStore = new LeaderboardStore();
