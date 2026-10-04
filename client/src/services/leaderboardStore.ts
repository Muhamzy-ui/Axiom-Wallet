// Leaderboard Store — Top 100 Traders, 2-Day Epoch Shuffling, and Admin Control
import { marketStore } from "./marketStore";
import { api } from "./api";

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
    topCoins: ["MASK", "POPCAT", "BONK"],
    openPositions: [
      { symbol: "MASK", side: "long", leverage: "25x", size: "$580,000", entryPrice: "$1.1200", markPrice: "$1.2893", unrealizedPnl: "+$87,400", roi: "+378%" },
      { symbol: "POPCAT", side: "long", leverage: "20x", size: "$420,000", entryPrice: "$0.2410", markPrice: "$0.2717", unrealizedPnl: "+$53,500", roi: "+254%" },
      { symbol: "BONK", side: "long", leverage: "15x", size: "$290,000", entryPrice: "$0.00002140", markPrice: "$0.00002510", unrealizedPnl: "+$25,100", roi: "+129%" },
      { symbol: "STONKEX", side: "long", leverage: "20x", size: "$180,000", entryPrice: "$0.00790", markPrice: "$0.00991", unrealizedPnl: "+$36,600", roi: "+203%" }
    ],
    recentTrades: [
      { symbol: "MASK", side: "long", pnl: "+$94,200", roi: "+410%", time: "3m ago", type: "closed" },
      { symbol: "HOOKED", side: "long", pnl: "+$46,800", roi: "+325%", time: "18m ago", type: "closed" },
      { symbol: "POPCAT", side: "long", pnl: "+$38,400", roi: "+280%", time: "42m ago", type: "closed" },
      { symbol: "CATE", side: "long", pnl: "+$31,500", roi: "+256%", time: "1h ago", type: "closed" },
      { symbol: "JUGGERNAUT", side: "long", pnl: "+$24,800", roi: "+185%", time: "2h ago", type: "closed" },
      { symbol: "BONK", side: "long", pnl: "+$19,200", roi: "+140%", time: "3h ago", type: "closed" },
      { symbol: "MANIFEST", side: "long", pnl: "+$17,300", roi: "+130%", time: "5h ago", type: "closed" },
      { symbol: "WIF", side: "long", pnl: "+$14,100", roi: "+115%", time: "7h ago", type: "closed" }
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
    topCoins: ["STONKEX", "CATE", "WIF"],
    openPositions: [
      { symbol: "STONKEX", side: "long", leverage: "20x", size: "$310,000", entryPrice: "$0.00810", markPrice: "$0.00991", unrealizedPnl: "+$44,600", roi: "+223%" },
      { symbol: "CATE", side: "long", leverage: "25x", size: "$240,000", entryPrice: "$0.000325", markPrice: "$0.000429", unrealizedPnl: "+$38,800", roi: "+320%" },
      { symbol: "WIF", side: "long", leverage: "15x", size: "$280,000", entryPrice: "$2.10", markPrice: "$2.38", unrealizedPnl: "+$37,300", roi: "+133%" },
      { symbol: "BREW", side: "long", leverage: "10x", size: "$160,000", entryPrice: "$0.0380", markPrice: "$0.0465", unrealizedPnl: "+$18,400", roi: "+115%" }
    ],
    recentTrades: [
      { symbol: "CATE", side: "long", pnl: "+$52,100", roi: "+345%", time: "8m ago", type: "closed" },
      { symbol: "STONKEX", side: "long", pnl: "+$36,400", roi: "+240%", time: "25m ago", type: "closed" },
      { symbol: "HOOKED", side: "long", pnl: "+$29,800", roi: "+210%", time: "55m ago", type: "closed" },
      { symbol: "MEME", side: "long", pnl: "+$24,500", roi: "+180%", time: "1h ago", type: "closed" },
      { symbol: "WIF", side: "long", pnl: "+$21,200", roi: "+155%", time: "2h ago", type: "closed" },
      { symbol: "POPCAT", side: "long", pnl: "+$18,700", roi: "+135%", time: "4h ago", type: "closed" },
      { symbol: "BONK", side: "long", pnl: "+$15,600", roi: "+110%", time: "6h ago", type: "closed" }
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
    pnl24h: 85833.26,
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
    topCoins: ["POPCAT", "BONK", "MASK"],
    openPositions: [
      { symbol: "POPCAT", side: "long", leverage: "20x", size: "$180,000", entryPrice: "$0.2580", markPrice: "$0.2717", unrealizedPnl: "+$19,100", roi: "+212%" },
      { symbol: "MASK", side: "long", leverage: "25x", size: "$240,000", entryPrice: "$1.1420", markPrice: "$1.2893", unrealizedPnl: "+$48,900", roi: "+181.8%" },
      { symbol: "STONKEX", side: "long", leverage: "15x", size: "$125,000", entryPrice: "$0.00845", markPrice: "$0.00991", unrealizedPnl: "+$22,400", roi: "+173.2%" },
      { symbol: "CATE", side: "long", leverage: "20x", size: "$95,000", entryPrice: "$0.000342", markPrice: "$0.000429", unrealizedPnl: "+$34,100", roi: "+256.2%" }
    ],
    recentTrades: [
      { symbol: "POPCAT", side: "long", pnl: "+$31,200", roi: "+280%", time: "18m ago", type: "closed" },
      { symbol: "BONK", side: "long", pnl: "+$16,800", roi: "+125%", time: "1h ago", type: "closed" },
      { symbol: "HOOKED", side: "long", pnl: "+$42,500", roi: "+325%", time: "2h ago", type: "closed" },
      { symbol: "MANIFEST", side: "long", pnl: "+$18,900", roi: "+145%", time: "3h ago", type: "closed" },
      { symbol: "JUGGERNAUT", side: "long", pnl: "+$27,300", roi: "+192%", time: "4h ago", type: "closed" },
      { symbol: "BREW", side: "long", pnl: "+$14,200", roi: "+110%", time: "6h ago", type: "closed" },
      { symbol: "MEME", side: "long", pnl: "+$38,600", roi: "+240%", time: "7h ago", type: "closed" },
      { symbol: "WIF", side: "long", pnl: "+$21,500", roi: "+165%", time: "9h ago", type: "closed" }
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
    topCoins: ["HOOKED", "MANIFEST", "BREW"],
    openPositions: [
      { symbol: "HOOKED", side: "long", leverage: "30x", size: "$220,000", entryPrice: "$0.00410", markPrice: "$0.00543", unrealizedPnl: "+$41,800", roi: "+325%" },
      { symbol: "MANIFEST", side: "long", leverage: "15x", size: "$175,000", entryPrice: "$0.0125", markPrice: "$0.0143", unrealizedPnl: "+$25,200", roi: "+144%" },
      { symbol: "BREW", side: "long", leverage: "20x", size: "$130,000", entryPrice: "$0.0395", markPrice: "$0.0465", unrealizedPnl: "+$23,000", roi: "+177%" }
    ],
    recentTrades: [
      { symbol: "HOOKED", side: "long", pnl: "+$34,600", roi: "+295%", time: "14m ago", type: "closed" },
      { symbol: "BREW", side: "long", pnl: "+$26,100", roi: "+210%", time: "45m ago", type: "closed" },
      { symbol: "MANIFEST", side: "long", pnl: "+$19,400", roi: "+155%", time: "2h ago", type: "closed" },
      { symbol: "MASK", side: "long", pnl: "+$31,200", roi: "+240%", time: "3h ago", type: "closed" },
      { symbol: "STONKEX", side: "long", pnl: "+$17,500", roi: "+135%", time: "5h ago", type: "closed" },
      { symbol: "CATE", side: "long", pnl: "+$15,800", roi: "+120%", time: "8h ago", type: "closed" }
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
    topCoins: ["JUGGERNAUT", "MEME", "POPCAT"],
    openPositions: [
      { symbol: "JUGGERNAUT", side: "long", leverage: "20x", size: "$190,000", entryPrice: "$0.00510", markPrice: "$0.00608", unrealizedPnl: "+$36,500", roi: "+192%" },
      { symbol: "MEME", side: "long", leverage: "25x", size: "$165,000", entryPrice: "$0.0142", markPrice: "$0.0176", unrealizedPnl: "+$39,500", roi: "+239%" },
      { symbol: "POPCAT", side: "long", leverage: "15x", size: "$140,000", entryPrice: "$0.2450", markPrice: "$0.2717", unrealizedPnl: "+$18,300", roi: "+131%" }
    ],
    recentTrades: [
      { symbol: "MEME", side: "long", pnl: "+$35,100", roi: "+265%", time: "20m ago", type: "closed" },
      { symbol: "JUGGERNAUT", side: "long", pnl: "+$28,400", roi: "+215%", time: "1h ago", type: "closed" },
      { symbol: "HOOKED", side: "long", pnl: "+$22,600", roi: "+175%", time: "2h ago", type: "closed" },
      { symbol: "POPCAT", side: "long", pnl: "+$16,900", roi: "+130%", time: "4h ago", type: "closed" },
      { symbol: "BONK", side: "long", pnl: "+$14,200", roi: "+110%", time: "7h ago", type: "closed" }
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
    topCoins: ["MASK", "STONKEX", "CATE"],
    openPositions: [
      { symbol: "MASK", side: "long", leverage: "20x", size: "$175,000", entryPrice: "$1.1550", markPrice: "$1.2893", unrealizedPnl: "+$29,400", roi: "+168%" },
      { symbol: "STONKEX", side: "long", leverage: "15x", size: "$130,000", entryPrice: "$0.00860", markPrice: "$0.00991", unrealizedPnl: "+$19,800", roi: "+152%" },
      { symbol: "CATE", side: "long", leverage: "20x", size: "$110,000", entryPrice: "$0.000350", markPrice: "$0.000429", unrealizedPnl: "+$24,800", roi: "+225%" }
    ],
    recentTrades: [
      { symbol: "MASK", side: "long", pnl: "+$32,400", roi: "+245%", time: "35m ago", type: "closed" },
      { symbol: "CATE", side: "long", pnl: "+$26,700", roi: "+205%", time: "1h ago", type: "closed" },
      { symbol: "STONKEX", side: "long", pnl: "+$20,100", roi: "+160%", time: "3h ago", type: "closed" },
      { symbol: "BREW", side: "long", pnl: "+$17,300", roi: "+135%", time: "5h ago", type: "closed" },
      { symbol: "WIF", side: "long", pnl: "+$13,800", roi: "+105%", time: "8h ago", type: "closed" }
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
    topCoins: ["BREW", "HOOKED", "BONK"],
    openPositions: [
      { symbol: "BREW", side: "long", leverage: "25x", size: "$160,000", entryPrice: "$0.0385", markPrice: "$0.0465", unrealizedPnl: "+$33,200", roi: "+207%" },
      { symbol: "HOOKED", side: "long", leverage: "30x", size: "$140,000", entryPrice: "$0.00425", markPrice: "$0.00543", unrealizedPnl: "+$38,900", roi: "+278%" },
      { symbol: "BONK", side: "long", leverage: "20x", size: "$115,000", entryPrice: "$0.00002180", markPrice: "$0.00002510", unrealizedPnl: "+$17,400", roi: "+151%" }
    ],
    recentTrades: [
      { symbol: "HOOKED", side: "long", pnl: "+$39,800", roi: "+310%", time: "15m ago", type: "closed" },
      { symbol: "BREW", side: "long", pnl: "+$28,500", roi: "+225%", time: "50m ago", type: "closed" },
      { symbol: "BONK", side: "long", pnl: "+$19,600", roi: "+160%", time: "2h ago", type: "closed" },
      { symbol: "MANIFEST", side: "long", pnl: "+$16,100", roi: "+125%", time: "4h ago", type: "closed" },
      { symbol: "POPCAT", side: "long", pnl: "+$14,300", roi: "+115%", time: "7h ago", type: "closed" }
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
    topCoins: ["MANIFEST", "JUGGERNAUT", "WIF"],
    openPositions: [
      { symbol: "MANIFEST", side: "long", leverage: "20x", size: "$145,000", entryPrice: "$0.0121", markPrice: "$0.0143", unrealizedPnl: "+$26,400", roi: "+182%" },
      { symbol: "JUGGERNAUT", side: "long", leverage: "20x", size: "$120,000", entryPrice: "$0.00520", markPrice: "$0.00608", unrealizedPnl: "+$20,300", roi: "+169%" },
      { symbol: "WIF", side: "long", leverage: "15x", size: "$110,000", entryPrice: "$2.12", markPrice: "$2.38", unrealizedPnl: "+$15,600", roi: "+123%" }
    ],
    recentTrades: [
      { symbol: "MANIFEST", side: "long", pnl: "+$27,200", roi: "+210%", time: "30m ago", type: "closed" },
      { symbol: "JUGGERNAUT", side: "long", pnl: "+$21,500", roi: "+170%", time: "1h ago", type: "closed" },
      { symbol: "WIF", side: "long", pnl: "+$16,800", roi: "+130%", time: "3h ago", type: "closed" },
      { symbol: "MEME", side: "long", pnl: "+$14,500", roi: "+115%", time: "5h ago", type: "closed" },
      { symbol: "CATE", side: "long", pnl: "+$12,900", roi: "+102%", time: "9h ago", type: "closed" }
    ]
  }
];

// ── Generator for Ranks 9 to 100 ────────────────────────────────────────────
const TRADER_SEEDS = [
  { name: "FlashTrader", handle: "@flashtrader", badge: "SNIPER", avatar: "⚡", coins: ["MASK", "POPCAT", "BONK"] },
  { name: "DiamondHands_X", handle: "@diamondhands", badge: "PRO", avatar: "💎", coins: ["STONKEX", "CATE", "WIF"] },
  { name: "RaydiumWhale", handle: "@raydiumwhale", badge: "WHALE", avatar: "🐋", coins: ["HOOKED", "MANIFEST", "BREW"] },
  { name: "BonkBaron", handle: "@bonkbaron", badge: "DEGEN", avatar: "🐕", coins: ["BONK", "POPCAT", "MEME"] },
  { name: "JupiterArbitrage", handle: "@jup_arbitrage", badge: "ALGO", avatar: "🪐", coins: ["MASK", "STONKEX", "JUGGERNAUT"] },
  { name: "SolSurfer_99", handle: "@solsurfer", badge: "PRO", avatar: "🏄", coins: ["CATE", "BREW", "HOOKED"] },
  { name: "ApexLiquidator", handle: "@apexliquidator", badge: "SNIPER", avatar: "🎯", coins: ["WIF", "MANIFEST", "POPCAT"] },
  { name: "PumpMaster69", handle: "@pumpmaster", badge: "DEGEN", avatar: "🚀", coins: ["POPCAT", "BONK", "MEME"] },
  { name: "ShadowTrader", handle: "@shadowtrader", badge: "PRO", avatar: "🥷", coins: ["MASK", "HOOKED", "STONKEX"] },
  { name: "DriftRunner", handle: "@driftrunner", badge: "ALGO", avatar: "🏎️", coins: ["BREW", "JUGGERNAUT", "CATE"] },
  { name: "ZeroSlippage", handle: "@zeroslippage", badge: "ALGO", avatar: "🛡️", coins: ["MANIFEST", "WIF", "BONK"] },
  { name: "CyberQuant", handle: "@cyberquant", badge: "ALGO", avatar: "🤖", coins: ["MASK", "MEME", "POPCAT"] },
  { name: "PepeMaxi_Sol", handle: "@pepemaxi", badge: "DEGEN", avatar: "🐸", coins: ["PEPE", "STONKEX", "BONK"] },
  { name: "MoonMission", handle: "@moonmission", badge: "DEGEN", avatar: "🌕", coins: ["BONK", "WIF", "HOOKED"] },
  { name: "SolanaSensei", handle: "@solsensei", badge: "PRO", avatar: "🥋", coins: ["CATE", "MASK", "BREW"] },
  { name: "PerpScalper", handle: "@perpscalper", badge: "SNIPER", avatar: "✂️", coins: ["POPCAT", "MANIFEST", "STONKEX"] },
  { name: "NeonSniper", handle: "@neonsniper", badge: "SNIPER", avatar: "🔮", coins: ["WIF", "JUGGERNAUT", "MEME"] },
  { name: "BullMarketGod", handle: "@bullgod", badge: "WHALE", avatar: "🐂", coins: ["MASK", "BREW", "BONK"] },
  { name: "FalconPerps", handle: "@falconperps", badge: "PRO", avatar: "🦅", coins: ["HOOKED", "WIF", "POPCAT"] },
  { name: "BlockBeast", handle: "@blockbeast", badge: "WHALE", avatar: "🦍", coins: ["STONKEX", "CATE", "MANIFEST"] },
  { name: "TitanSwap", handle: "@titanswap", badge: "ALGO", avatar: "🏛️", coins: ["MEME", "JUGGERNAUT", "MASK"] },
  { name: "OrbitAlpha", handle: "@orbitalpha", badge: "PRO", avatar: "🛰️", coins: ["BREW", "POPCAT", "BONK"] },
  { name: "MatrixTrader", handle: "@matrixtrader", badge: "ALGO", avatar: "💻", coins: ["HOOKED", "STONKEX", "WIF"] },
  { name: "ZenithCapital", handle: "@zenithcap", badge: "WHALE", avatar: "🏔️", coins: ["MASK", "MANIFEST", "CATE"] },
  { name: "ViperDEX", handle: "@viperdex", badge: "SNIPER", avatar: "🐍", coins: ["WIF", "POPCAT", "MEME"] },
  { name: "EchoWhale", handle: "@echowhale", badge: "WHALE", avatar: "🔊", coins: ["BONK", "JUGGERNAUT", "BREW"] },
  { name: "SolStrat_HQ", handle: "@solstrat", badge: "PRO", avatar: "♟️", coins: ["STONKEX", "HOOKED", "MASK"] },
  { name: "QuantumSwap", handle: "@quantumswap", badge: "ALGO", avatar: "⚛️", coins: ["CATE", "MANIFEST", "POPCAT"] },
  { name: "KronosSniper", handle: "@kronossniper", badge: "SNIPER", avatar: "⏳", coins: ["MEME", "WIF", "BONK"] },
  { name: "AlphaDog_SOL", handle: "@alphadog", badge: "DEGEN", avatar: "🐕‍🦺", coins: ["BONK", "POPCAT", "MASK"] },
  { name: "DeltaNeutral_Bot", handle: "@deltaneutral", badge: "ALGO", avatar: "⚖️", coins: ["BREW", "STONKEX", "HOOKED"] },
  { name: "SolRunner_42", handle: "@solrunner", badge: "PRO", avatar: "🏃", coins: ["JUGGERNAUT", "CATE", "WIF"] },
  { name: "ApexHunter", handle: "@apexhunter", badge: "SNIPER", avatar: "🏹", coins: ["WIF", "MANIFEST", "MEME"] },
  { name: "CryptoSamurai", handle: "@samurai_sol", badge: "PRO", avatar: "⚔️", coins: ["MASK", "POPCAT", "BREW"] },
  { name: "NovaPerp", handle: "@novaperp", badge: "ALGO", avatar: "🌟", coins: ["HOOKED", "BONK", "STONKEX"] },
  { name: "LiquidityKing", handle: "@liquidityking", badge: "WHALE", avatar: "👑", coins: ["CATE", "JUGGERNAUT", "MANIFEST"] },
  { name: "MemeMaven", handle: "@mememaven", badge: "DEGEN", avatar: "🦄", coins: ["POPCAT", "BONK", "MEME"] },
  { name: "SolanaWizard", handle: "@solwizard", badge: "PRO", avatar: "🧙", coins: ["MASK", "WIF", "HOOKED"] },
  { name: "VortexTrader", handle: "@vortextrader", badge: "SNIPER", avatar: "🌀", coins: ["STONKEX", "BREW", "POPCAT"] },
  { name: "GoldenCross", handle: "@goldencross", badge: "PRO", avatar: "✝️", coins: ["CATE", "MANIFEST", "BONK"] },
  { name: "BullRunProphet", handle: "@bullprophet", badge: "DEGEN", avatar: "📜", coins: ["JUGGERNAUT", "MEME", "WIF"] },
  { name: "SolGhost", handle: "@solghost", badge: "SNIPER", avatar: "👻", coins: ["POPCAT", "MASK", "HOOKED"] },
  { name: "IronHands", handle: "@ironhands", badge: "PRO", avatar: "🦾", coins: ["BREW", "BONK", "STONKEX"] },
  { name: "DEXInfiltrator", handle: "@dexinfiltrator", badge: "SNIPER", avatar: "🕵️", coins: ["WIF", "CATE", "MANIFEST"] },
  { name: "OmegaQuant", handle: "@omegaquant", badge: "ALGO", avatar: "Ω", coins: ["MEME", "JUGGERNAUT", "POPCAT"] },
  { name: "SolanaGigaChad", handle: "@solgigachad", badge: "WHALE", avatar: "🗿", coins: ["MASK", "HOOKED", "BONK"] },
  { name: "PhoenixTrades", handle: "@phoenixtrades", badge: "PRO", avatar: "🔥", coins: ["STONKEX", "BREW", "WIF"] },
  { name: "CosmicSwap", handle: "@cosmicswap", badge: "DEGEN", avatar: "🌌", coins: ["WIF", "BONK", "CATE"] },
  { name: "TrenchWarrior", handle: "@trenchwarrior", badge: "DEGEN", avatar: "🪖", coins: ["MANIFEST", "POPCAT", "MEME"] },
  { name: "PerpOverlord", handle: "@perpoverlord", badge: "PRO", avatar: "👑", coins: ["HOOKED", "MASK", "JUGGERNAUT"] }
];

const MEME_COIN_PRICE_DEFAULTS: Record<string, { entry: string; mark: string; lev: string }> = {
  MASK: { entry: "$1.1450", mark: "$1.2893", lev: "25x" },
  POPCAT: { entry: "$0.2460", mark: "$0.2717", lev: "20x" },
  BONK: { entry: "$0.00002160", mark: "$0.00002510", lev: "20x" },
  STONKEX: { entry: "$0.00820", mark: "$0.00991", lev: "15x" },
  CATE: { entry: "$0.000335", mark: "$0.000429", lev: "25x" },
  HOOKED: { entry: "$0.00418", mark: "$0.00543", lev: "30x" },
  MANIFEST: { entry: "$0.0123", mark: "$0.0143", lev: "20x" },
  JUGGERNAUT: { entry: "$0.00525", mark: "$0.00608", lev: "20x" },
  BREW: { entry: "$0.0390", mark: "$0.0465", lev: "20x" },
  MEME: { entry: "$0.0145", mark: "$0.0176", lev: "25x" },
  WIF: { entry: "$2.14", mark: "$2.38", lev: "15x" },
  PEPE: { entry: "$0.0000085", mark: "$0.0000098", lev: "20x" }
};

function generateTraderRanks9to50(): Trader[] {
  const result: Trader[] = [];
  const basePnl = 34000;
  const baseRoi = 380;
  const baseVolume = 8500000;

  for (let i = 9; i <= 50; i++) {
    const seed = TRADER_SEEDS[(i - 9) % TRADER_SEEDS.length];
    const suffix = i > 40 ? `_${i}` : "";
    const name = `${seed.name}${suffix}`;
    const handle = `${seed.handle}${suffix}`;
    const hex = Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, "0");
    const address = `${hex.slice(0, 4)}...${hex.slice(-4)}`;

    const pnlMultiplier = Math.max(0.18, 1 - (i - 9) * 0.018);
    const pnl24h = Math.round(basePnl * pnlMultiplier * (0.85 + ((i * 17) % 30) / 100));
    const roi24h = Math.round(baseRoi * pnlMultiplier * (0.8 + ((i * 13) % 40) / 100));
    const winRate = Number((74 + ((i * 19) % 16) - ((i * 7) % 4)).toFixed(1));
    const volume = Math.round(baseVolume * pnlMultiplier * (0.9 + ((i * 23) % 25) / 100));

    // Dynamic 2-3 realistic open meme coin positions with massive green unrealized PnL
    const openPositions: any[] = [];
    const posCount = (i % 2 === 0) ? 3 : 2;
    for (let p = 0; p < posCount; p++) {
      const sym = seed.coins[p % seed.coins.length];
      const coinInfo = MEME_COIN_PRICE_DEFAULTS[sym] || { entry: "$0.100", mark: "$0.125", lev: "20x" };
      const sizeUsd = Math.round(75000 + ((i * 37 + p * 23) % 85) * 1000);
      const gainPct = Math.round(110 + ((i * 29 + p * 43) % 190));
      const pnlVal = Math.round(sizeUsd * (gainPct / 100) * 0.05);

      openPositions.push({
        symbol: sym,
        side: "long",
        leverage: coinInfo.lev,
        size: `$${sizeUsd.toLocaleString()}`,
        entryPrice: coinInfo.entry,
        markPrice: coinInfo.mark,
        unrealizedPnl: `+$${pnlVal.toLocaleString()}`,
        roi: `+${gainPct}%`
      });
    }

    // Dynamic 5-7 closed profitable trade executions
    const recentTrades: any[] = [];
    const tradeCount = 5 + (i % 3);
    for (let t = 0; t < tradeCount; t++) {
      const sym = seed.coins[t % seed.coins.length];
      const gainPct = Math.round(95 + ((i * 19 + t * 31) % 230));
      const pnlVal = Math.round(8500 + ((i * 13 + t * 27) % 28000));
      const timeStr = t === 0 ? `${(i % 25) + 5}m ago` : t === 1 ? `${(i % 45) + 30}m ago` : `${t}h ago`;

      recentTrades.push({
        symbol: sym,
        side: "long",
        pnl: `+$${pnlVal.toLocaleString()}`,
        roi: `+${gainPct}%`,
        time: timeStr,
        type: "closed"
      });
    }

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
      openPositions,
      recentTrades
    });
  }

  return result;
}

// ── 24-Hour Daily Epoch Pseudo-Random Deterministic Shuffler ─────────────────
function getDailyEpoch(): number {
  return Math.floor(Date.now() / (86400 * 1000));
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
  private baseRanks9to50: Trader[] = generateTraderRanks9to50();
  private listeners: Set<() => void> = new Set();
  private cachedTop8: Trader[] | null = null;
  private liveTickerTimer: any = null;

  constructor() {
    // 1. Immediately restore cached top 8 from localStorage
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("axiom_admin_top_8");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length === 8) {
            this.cachedTop8 = parsed;
          }
        }
      } catch {}

      // Listen to localStorage changes across browser tabs
      window.addEventListener("storage", (e) => {
        if (e.key === "axiom_admin_top_8" || e.key === "axiom_admin_trade_control") {
          if (e.key === "axiom_admin_top_8" && e.newValue) {
            try { this.cachedTop8 = JSON.parse(e.newValue); } catch {}
          }
          this.notify();
        }
      });
    }

    // 2. Sync Top 8 with backend server so admin edits reflect for all users
    this.syncBackendTop8();

    // 3. Start gentle live ticker: calm organic micro-movement every ~20s
    this.startLiveTicker();
  }

  public subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private notify() {
    this.listeners.forEach((fn) => fn());
  }

  public async syncBackendTop8(): Promise<void> {
    try {
      const remote = await api.getLeaderboardTop8();
      if (Array.isArray(remote) && remote.length === 8) {
        this.cachedTop8 = remote;
        if (typeof window !== "undefined") {
          localStorage.setItem("axiom_admin_top_8", JSON.stringify(remote));
        }
        this.notify();
      }
    } catch {}
  }

  private startLiveTicker() {
    if (typeof window === "undefined") return;
    if (this.liveTickerTimer) clearInterval(this.liveTickerTimer);

    // Subtle, calm live market micro-movement every 20 seconds (gentle, not jumpy)
    this.liveTickerTimer = setInterval(() => {
      const isTop8Target = Math.random() < 0.35;
      if (isTop8Target) {
        // Nudge one of the Top 8 traders slightly
        const top8 = [...this.getTop8()];
        const idx = Math.floor(Math.random() * top8.length);
        const t = top8[idx];
        if (t) {
          const winDrift = Math.random() > 0.45 ? 0.1 : -0.1;
          const pnlDelta = Math.round(40 + Math.random() * 120);
          t.winRate = Math.min(99.2, Math.max(76.5, Number((t.winRate + winDrift).toFixed(1))));
          t.pnl24h = Math.round(t.pnl24h + pnlDelta);
          t.volume += pnlDelta * 2;
          this.saveTop8(top8);
        }
      } else {
        // Nudge one of ranks 9 to 50
        const rIdx = Math.floor(Math.random() * this.baseRanks9to50.length);
        const trader = this.baseRanks9to50[rIdx];
        if (trader) {
          const winDrift = Math.random() > 0.45 ? 0.1 : -0.1;
          const deltaUsd = Math.round(25 + Math.random() * 95);
          trader.winRate = Math.min(98.5, Math.max(72.0, Number((trader.winRate + winDrift).toFixed(1))));
          trader.pnl24h += deltaUsd;
          trader.volume += deltaUsd * 2;
          trader.totalTrades += 1;
          trader.winTrades += 1;
          this.notify();
        }
      }
    }, 20000);
  }

  // ── Top 8 Admin Controls ──────────────────────────────────────────────────
  public getTop8(): Trader[] {
    if (this.cachedTop8 && this.cachedTop8.length === 8) {
      return this.cachedTop8;
    }
    if (typeof window === "undefined") return DEFAULT_TOP_8;
    try {
      const saved = localStorage.getItem("axiom_admin_top_8");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length === 8) {
          this.cachedTop8 = parsed;
          return parsed;
        }
      }
    } catch {
      // fallback
    }
    return DEFAULT_TOP_8;
  }

  public async saveTop8(top8: Trader[]): Promise<void> {
    this.cachedTop8 = top8;
    if (typeof window !== "undefined") {
      localStorage.setItem("axiom_admin_top_8", JSON.stringify(top8));
    }
    this.notify();
    try {
      await api.saveLeaderboardTop8(top8);
    } catch (e) {
      console.warn("Failed to persist Top 8 to backend:", e);
    }
  }

  public async adjustTraderPnl(traderId: string, deltaUsd: number): Promise<void> {
    const top8 = this.getTop8();
    const updated = top8.map((t) => {
      if (t.id === traderId) {
        const newPnl = Math.max(0, Math.round(t.pnl24h + deltaUsd));
        const newRoi = Number(Math.max(0, t.roi24h + (deltaUsd / 200)).toFixed(1));
        return { ...t, pnl24h: newPnl, roi24h: newRoi };
      }
      return t;
    });
    await this.saveTop8(updated);
  }

  public async resetTop8ToDefault(): Promise<void> {
    this.cachedTop8 = [...DEFAULT_TOP_8];
    if (typeof window !== "undefined") {
      localStorage.removeItem("axiom_admin_top_8");
    }
    this.notify();
    try {
      await api.saveLeaderboardTop8(DEFAULT_TOP_8);
    } catch {}
  }

  // ── Time helper for 24-Hour Daily Epoch countdown ────────────────────────
  public getTimeUntilNextEpoch(): { hours: number; minutes: number; seconds: number; formatted: string } {
    const now = Date.now();
    const nextEpochMs = (getDailyEpoch() + 1) * 86400 * 1000;
    const diff = Math.max(0, nextEpochMs - now);
    const hours = Math.floor(diff / (3600 * 1000));
    const minutes = Math.floor((diff % (3600 * 1000)) / (60 * 1000));
    const seconds = Math.floor((diff % (60 * 1000)) / 1000);
    const formatted = `${String(hours).padStart(2, "0")}h ${String(minutes).padStart(2, "0")}m ${String(seconds).padStart(2, "0")}s`;
    return { hours, minutes, seconds, formatted };
  }

  // ── Top 50 Traders with 24-Hour Daily Epoch Rotation ───────────────────────
  // Top 8 Accounts: ALWAYS stay at the top (never leave ranks 1-8), but change positions and 24h P&L every 24h
  // Ranks 9 to 50: Deterministically shuffle positions and 24h P&L every 24h
  public getAll50Traders(): Trader[] {
    const top8 = this.getTop8();
    const epoch = getDailyEpoch();
    const prevEpoch = epoch - 1;

    // 1. Top 8 Accounts: Deterministically shuffle among ranks 1..8 every 24 hours
    // INVARIANT: They NEVER leave top 8!
    const currentTop8Shifted = seededShuffle(top8, epoch * 1337);
    const prevTop8Shifted = seededShuffle(top8, prevEpoch * 1337);

    const prevTop8RankMap = new Map<string, number>();
    prevTop8Shifted.forEach((trader, idx) => {
      prevTop8RankMap.set(trader.id, idx + 1);
    });

    const shiftedTop8: Trader[] = currentTop8Shifted.map((t, idx) => {
      const currentRank = idx + 1; // Always 1 to 8
      const prevRank = prevTop8RankMap.get(t.id) ?? currentRank;
      const rankDelta = prevRank - currentRank; // positive = climbed, negative = dropped

      // Deterministic 24-hour PnL & ROI drift so stats change naturally every 24 hours
      const topHash = (epoch * 29 + (idx + 1) * 73) % 1000;
      const topFactor = 0.95 + (topHash % 11) / 100; // 0.95x to 1.05x drift
      const dailyPnl = Number((t.pnl24h * topFactor).toFixed(2));
      const dailyRoi = Number((t.roi24h * topFactor).toFixed(1));

      return {
        ...t,
        rank: currentRank,
        rankDelta,
        pnl24h: dailyPnl,
        roi24h: dailyRoi
      };
    });

    // 2. Deterministically shuffle ranks 9 to 50 for current epoch & previous epoch
    const currentShifted = seededShuffle(this.baseRanks9to50, epoch * 7919);
    const prevShifted = seededShuffle(this.baseRanks9to50, prevEpoch * 7919);

    const prevRankMap = new Map<string, number>();
    prevShifted.forEach((trader, idx) => {
      prevRankMap.set(trader.id, 9 + idx);
    });

    const ranks9to50: Trader[] = currentShifted.map((t, idx) => {
      const currentRank = 9 + idx; // 9 to 50
      const prevRank = prevRankMap.get(t.id) ?? currentRank;
      const rankDelta = prevRank - currentRank; // positive = moved up in rank

      // Realistic 24-hour deterministic daily performance drift
      const dayHash = (epoch * 37 + (idx + 9) * 101) % 1000;
      const pnlFactor = 0.90 + (dayHash % 22) / 100; // 0.90x to 1.11x
      const dailyPnl = Number((t.pnl24h * pnlFactor).toFixed(2));
      const dailyRoi = Number((t.roi24h * pnlFactor).toFixed(1));

      return {
        ...t,
        pnl24h: dailyPnl,
        roi24h: dailyRoi,
        rank: currentRank,
        rankDelta
      };
    });

    return [...shiftedTop8, ...ranks9to50];
  }

  // Alias for backward compatibility
  public getAll100Traders(): Trader[] {
    return this.getAll50Traders();
  }

  // ── Active Copy Trading System ────────────────────────────────────────────
  public getCopiedTradersMap(): Record<string, boolean> {
    if (typeof window === "undefined" || !window.localStorage) return {};
    try {
      const saved = localStorage.getItem("axiom_copied_traders_v1");
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  }

  public setCopiedTrader(traderId: string, isCopying: boolean, config?: { name: string; amount: string; sl: string }): void {
    if (typeof window === "undefined" || !window.localStorage) return;
    try {
      const map = this.getCopiedTradersMap();
      if (isCopying) {
        map[traderId] = true;
        if (config) {
          localStorage.setItem(`axiom_copy_config_${traderId}`, JSON.stringify(config));
        }
      } else {
        delete map[traderId];
        localStorage.removeItem(`axiom_copy_config_${traderId}`);
      }
      localStorage.setItem("axiom_copied_traders_v1", JSON.stringify(map));
      this.notify();
    } catch {}
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
