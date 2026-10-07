// Global reactive market, balance, trades, and orderbook store
import {
  fetchGeckoMajors,
  fetchGeckoTrendingSolana,
  fetchGeckoCandles,
  fetchGeckoTrades,
} from "./geckoTerminal";
import { api } from "./api";
import { formatCoinPrice, formatRawPrice, formatPercentage, formatUsdAmount } from "./formatters";

export interface MarketToken {
  sym: string;
  name: string;
  price: string;
  numericPrice: number;
  solPrice: string;
  change: string;
  changeNum: number;
  cap: string;
  fdv: string;
  liq: string;
  pos: boolean;
  supply: number; // circulating supply for Mcap calculation
  m5: { val: string; up: boolean; zero?: boolean };
  h1: { val: string; up: boolean; zero?: boolean };
  h6: { val: string; up: boolean; zero?: boolean };
  h24: { val: string; up: boolean; zero?: boolean };
  txns: number;
  buys: number;
  sells: number;
  vol: number;
  buyVol: number;
  sellVol: number;
  traders: number;
  buyers: number;
  sellers: number;
  pair_currency?: string;
  is_rugged?: boolean;
  network?: string;
  poolAddress?: string;
  contractAddress?: string;
  imageUrl?: string;
  bannerUrl?: string;
  isMajor?: boolean;
  isStablecoin?: boolean;
  sparkline?: number[];
  isNew?: boolean;
  createdAt?: number;
  isMarketMakerActive?: boolean;
  customPrice?: boolean;
  user_holders_count?: number;
  real_buyers_count?: number;
  total_buyers_count?: number;
  total_user_buy_volume_usd?: number;
  user_circulating_tokens?: number;
  is_verified?: boolean;
  is_liquidity_locked?: boolean;
  is_sell_blocked?: boolean;
}

export function generateSparkline(p: number, isUp: boolean): number[] {
  const pts: number[] = [];
  const N = 18;
  const startP = isUp ? p * 0.962 : p * 1.038;
  for (let i = 0; i < N; i++) {
    const progress = i / (N - 1);
    const trend = startP + (p - startP) * progress;
    const wave = Math.sin(i * 0.9) * (p * 0.008);
    const noise = (Math.random() - 0.49) * (p * 0.006);
    const val = i === N - 1 ? p : Math.max(0.00000001, trend + wave + noise);
    pts.push(Number(val.toFixed(p < 0.001 ? 8 : p < 1 ? 4 : 2)));
  }
  return pts;
}

export interface LiveTrade {
  id: string;
  sym: string;
  date: string;
  timestamp: number;
  type: "Buy" | "Sell";
  usd: number;
  tokenAmt: number;
  solAmt: number;
  price: number;
  trader: string;
  traderEmoji: string;
  txHash: string;
  timeStr?: string;
  isUser?: boolean;
}

export interface OrderBookEntry {
  price: number;
  amount: number;
  total: number;
  depthPct: number;
}

export interface Candle {
  open: number;
  high: number;
  low: number;
  close: number;
  vol: number;
  time: number;
}

export interface TokenBalance {
  bal: number;
  usdValue: number;
  name: string;
  totalInvested?: number; // Total USD spent acquiring this holding
  avgBuyPrice?: number;   // Average acquisition price per token
}

export interface UserOrder {
  id: string;
  sym: string;
  name: string;
  side: "Buy" | "Sell";
  amountUsd: number;
  tokenAmt: number;
  price: number;
  timestamp: number;
  dateStr: string;
  orderType?: "Market" | "Limit" | "TP/SL" | "P2P Transfer" | "Deposit" | "Withdrawal" | "Swap";
  triggerNote?: string;
}

export interface PendingOrder {
  id: string;
  sym: string;
  side: "Buy" | "Sell";
  type: "Limit" | "TP/SL";
  amount: number; // USD for Buy, token units for Sell
  targetPrice?: number;
  tpPrice?: number;
  slPrice?: number;
  tpPct?: number;
  slPct?: number;
  currentPriceAtCreation: number;
  createdAt: number;
  dateStr: string;
}

export const BINANCE_MAJOR_SYMBOLS = new Set(["BTC", "ETH", "SOL", "BNB", "XRP", "DOGE", "ADA", "AVAX", "SUI"]);

export function computeSynchronizedPrice(
  token: MarketToken,
  baseAnchor: number,
  epochSec: number = Math.floor(Date.now() / 1000)
): { numericPrice: number; formattedPrice: string; isBuy: boolean; deltaPct: number } {
  const sym = token.sym.toUpperCase();
  if (sym === "USDT" || sym === "USDC" || sym === "USD" || token.isStablecoin) {
    return { numericPrice: 1.0, formattedPrice: "$1.00", isBuy: true, deltaPct: 0 };
  }
  if (token.is_rugged) {
    return { numericPrice: 0.00000001, formattedPrice: "$0.00000001", isBuy: false, deltaPct: -0.9999 };
  }

  let seed = 0;
  for (let i = 0; i < sym.length; i++) {
    seed = (seed * 31 + sym.charCodeAt(i)) >>> 0;
  }

  const isMajor = BINANCE_MAJOR_SYMBOLS.has(sym);
  const p1 = (epochSec + (seed % 1000)) * (2 * Math.PI / 67.31);
  const p2 = (epochSec + ((seed >> 2) % 1000)) * (2 * Math.PI / 21.17);
  const p3 = (epochSec + ((seed >> 4) % 1000)) * (2 * Math.PI / 7.89);

  // Micro-amplitude: subtle harmonic breathing around real live Binance price (less than 1 cent)
  const amp = isMajor ? 0.000005 : 0.0002;
  const wavePct = amp * (0.6 * Math.sin(p1) + 0.3 * Math.sin(p2) + 0.1 * Math.sin(p3));
  const isBuy = (0.6 * Math.cos(p1) / 67.31 + 0.3 * Math.cos(p2) / 21.17) >= 0;

  const rawP = baseAnchor * (1 + wavePct);
  let numericPrice: number;
  if (rawP >= 1) {
    numericPrice = Number(rawP.toFixed(2));
  } else if (rawP >= 0.001) {
    numericPrice = Number(rawP.toFixed(4));
  } else {
    numericPrice = Number(rawP.toFixed(8));
  }

  const formattedPrice = formatCoinPrice(numericPrice);
  return { numericPrice, formattedPrice, isBuy, deltaPct: wavePct };
}

const INITIAL_TOKENS: MarketToken[] = [
  {
    sym: "BTC",
    name: "Bitcoin",
    price: "$84,540.00",
    numericPrice: 84540.00,
    solPrice: "715.34 SOL",
    change: "-0.22%",
    changeNum: -0.22,
    cap: "$1.67T",
    fdv: "$1.75T",
    liq: "$25.4M",
    pos: false,
    supply: 19750000,
    m5: { val: "0.02%", up: false },
    h1: { val: "0.15%", up: false },
    h6: { val: "0.28%", up: false },
    h24: { val: "0.22%", up: false },
    txns: 14250,
    buys: 7040,
    sells: 7210,
    vol: 2257.2,
    buyVol: 1120.5,
    sellVol: 1136.7,
    traders: 8890,
    buyers: 4460,
    sellers: 4430,
    network: "eth",
    poolAddress: "0x99ac8ca7087fa4a2a1fb6357269965a2014abc35",
    imageUrl: "https://coin-images.coingecko.com/coins/images/1/large/bitcoin.png",
    isMajor: true,
    sparkline: generateSparkline(84540.00, false),
  },
  {
    sym: "ETH",
    name: "Ethereum",
    price: "$2,664.87",
    numericPrice: 2664.87,
    solPrice: "22.55 SOL",
    change: "-1.32%",
    changeNum: -1.32,
    cap: "$320.7B",
    fdv: "$320.7B",
    liq: "$118.6M",
    pos: false,
    supply: 120400000,
    m5: { val: "0.05%", up: false },
    h1: { val: "0.21%", up: false },
    h6: { val: "0.65%", up: false },
    h24: { val: "1.32%", up: false },
    txns: 12496,
    buys: 6200,
    sells: 6296,
    vol: 1148.6,
    buyVol: 560.4,
    sellVol: 588.2,
    traders: 5940,
    buyers: 2950,
    sellers: 2990,
    network: "eth",
    poolAddress: "0x88e6a0c2ddd26feeb64f039a2c41296fcb3f5640",
    imageUrl: "https://coin-images.coingecko.com/coins/images/279/large/ethereum.png",
    isMajor: true,
    sparkline: generateSparkline(2664.87, false),
  },
  {
    sym: "SOL",
    name: "Solana",
    price: "$118.18",
    numericPrice: 118.18,
    solPrice: "1.0000 SOL",
    change: "+0.10%",
    changeNum: 0.10,
    cap: "$54.32B",
    fdv: "$56.16B",
    liq: "$349.2M",
    pos: true,
    supply: 459297153,
    m5: { val: "0.01%", up: true },
    h1: { val: "0.08%", up: true },
    h6: { val: "0.15%", up: true },
    h24: { val: "0.10%", up: true },
    txns: 9400,
    buys: 4900,
    sells: 4500,
    vol: 820.5,
    buyVol: 430.2,
    sellVol: 390.3,
    traders: 6100,
    buyers: 3100,
    sellers: 3000,
    network: "solana",
    poolAddress: "Czfq3xZZDmsdGdUyrNLtRhGc47cXcZtLG4crryfu44zE",
    imageUrl: "https://coin-images.coingecko.com/coins/images/4128/large/solana.png",
    isMajor: true,
    sparkline: generateSparkline(118.18, true),
  },
  {
    sym: "BNB",
    name: "BNB",
    price: "$764.73",
    numericPrice: 764.73,
    solPrice: "6.46 SOL",
    change: "-0.41%",
    changeNum: -0.41,
    cap: "$111.5B",
    fdv: "$111.5B",
    liq: "$42.4M",
    pos: false,
    supply: 145880000,
    m5: { val: "0.04%", up: false },
    h1: { val: "0.18%", up: false },
    h6: { val: "0.32%", up: false },
    h24: { val: "0.41%", up: false },
    txns: 5410,
    buys: 2650,
    sells: 2760,
    vol: 84.2,
    buyVol: 41.1,
    sellVol: 43.1,
    traders: 3450,
    buyers: 1700,
    sellers: 1750,
    network: "bsc",
    poolAddress: "0x58f876857a02d6762e0101bb5c46a8c1ed44dc16",
    imageUrl: "https://coin-images.coingecko.com/coins/images/825/large/bnb-icon2_2x.png",
    isMajor: true,
    sparkline: generateSparkline(764.73, false),
  },
  {
    sym: "XRP",
    name: "XRP",
    price: "$1.48",
    numericPrice: 1.48,
    solPrice: "0.0125 SOL",
    change: "-1.87%",
    changeNum: -1.87,
    cap: "$84.1B",
    fdv: "$148.0B",
    liq: "$31.8M",
    pos: false,
    supply: 56810000000,
    m5: { val: "0.12%", up: false },
    h1: { val: "0.65%", up: false },
    h6: { val: "1.20%", up: false },
    h24: { val: "1.87%", up: false },
    txns: 9850,
    buys: 4800,
    sells: 5050,
    vol: 76.8,
    buyVol: 37.5,
    sellVol: 39.3,
    traders: 6200,
    buyers: 3000,
    sellers: 3200,
    network: "bsc",
    poolAddress: "0x49246143De65451Cee6368C1C8518e974C68B1e2",
    imageUrl: "https://coin-images.coingecko.com/coins/images/44/large/xrp-symbol-white-128.png",
    isMajor: true,
    sparkline: generateSparkline(1.48, false),
  },
  {
    sym: "DOGE",
    name: "Dogecoin",
    price: "$0.0918",
    numericPrice: 0.0918,
    solPrice: "0.00077 SOL",
    change: "-3.19%",
    changeNum: -3.19,
    cap: "$13.4B",
    fdv: "$13.4B",
    liq: "$28.1M",
    pos: false,
    supply: 146400000000,
    m5: { val: "0.15%", up: false },
    h1: { val: "0.90%", up: false },
    h6: { val: "2.10%", up: false },
    h24: { val: "3.19%", up: false },
    txns: 12920,
    buys: 6100,
    sells: 6820,
    vol: 68.1,
    buyVol: 32.2,
    sellVol: 35.9,
    traders: 7900,
    buyers: 3800,
    sellers: 4100,
    network: "bsc",
    poolAddress: "0x78923d8c11e2f3d79f04ddb53c155d045d6540b6",
    imageUrl: "https://coin-images.coingecko.com/coins/images/5/large/dogecoin.png",
    isMajor: true,
    sparkline: generateSparkline(0.0918, false),
  },
  {
    sym: "ADA",
    name: "Cardano",
    price: "$0.2409",
    numericPrice: 0.2409,
    solPrice: "0.00203 SOL",
    change: "-2.90%",
    changeNum: -2.90,
    cap: "$8.61B",
    fdv: "$10.8B",
    liq: "$18.6M",
    pos: false,
    supply: 35740000000,
    m5: { val: "0.11%", up: false },
    h1: { val: "0.85%", up: false },
    h6: { val: "1.90%", up: false },
    h24: { val: "2.90%", up: false },
    txns: 6120,
    buys: 2900,
    sells: 3220,
    vol: 42.4,
    buyVol: 20.8,
    sellVol: 21.6,
    traders: 3950,
    buyers: 1900,
    sellers: 2050,
    network: "bsc",
    poolAddress: "0x403b2901ee7c963174fb24e54823293e62f026a2",
    imageUrl: "https://coin-images.coingecko.com/coins/images/975/large/cardano.png",
    isMajor: true,
    sparkline: generateSparkline(0.2409, false),
  },
  {
    sym: "AVAX",
    name: "Avalanche",
    price: "$10.82",
    numericPrice: 10.82,
    solPrice: "0.0915 SOL",
    change: "-3.56%",
    changeNum: -3.56,
    cap: "$4.39B",
    fdv: "$7.79B",
    liq: "$14.2M",
    pos: false,
    supply: 406000000,
    m5: { val: "0.14%", up: false },
    h1: { val: "0.95%", up: false },
    h6: { val: "2.20%", up: false },
    h24: { val: "3.56%", up: false },
    txns: 5890,
    buys: 2700,
    sells: 3190,
    vol: 34.6,
    buyVol: 16.1,
    sellVol: 18.5,
    traders: 3700,
    buyers: 1750,
    sellers: 1950,
    network: "avax",
    poolAddress: "0xf4003f4efbe8691b60249e6afbc61791a8c38ff6",
    imageUrl: "https://coin-images.coingecko.com/coins/images/12559/large/Avalanche_Circle_RedWhite_Trans.png",
    isMajor: true,
    sparkline: generateSparkline(10.82, false),
  },
  {
    sym: "SUI",
    name: "Sui",
    price: "$1.007",
    numericPrice: 1.007,
    solPrice: "0.00857 SOL",
    change: "+12.61%",
    changeNum: 12.61,
    cap: "$4.14B",
    fdv: "$10.1B",
    liq: "$22.5M",
    pos: true,
    supply: 2850000000,
    m5: { val: "0.50%", up: true },
    h1: { val: "2.25%", up: true },
    h6: { val: "6.90%", up: true },
    h24: { val: "12.61%", up: true },
    txns: 8640,
    buys: 4980,
    sells: 3660,
    vol: 58.0,
    buyVol: 34.5,
    sellVol: 23.5,
    traders: 5200,
    buyers: 3050,
    sellers: 2150,
    network: "sui",
    poolAddress: "0x2::sui::SUI",
    imageUrl: "https://coin-images.coingecko.com/coins/images/26375/large/sui-ocean-square.png",
    isMajor: true,
    sparkline: generateSparkline(1.007, true),
  },
  {
    sym: "POPCAT",
    name: "Popcat",
    price: "$0.0488",
    numericPrice: 0.0488,
    solPrice: "0.00048 SOL",
    change: "+3.00%",
    changeNum: 3.00,
    cap: "$47.9M",
    fdv: "$47.9M",
    liq: "$1.4M",
    pos: true,
    supply: 979000000,
    m5: { val: "0%", up: false, zero: true },
    h1: { val: "0.5%", up: true },
    h6: { val: "1.2%", up: true },
    h24: { val: "3.00%", up: true },
    txns: 8447,
    buys: 5054,
    sells: 3393,
    vol: 8.5,
    buyVol: 4.1,
    sellVol: 4.3,
    traders: 2623,
    buyers: 1719,
    sellers: 1367,
    network: "solana",
    poolAddress: "FqHddf1hxUL3jp3Qge8sYoKsCLDGZ7WagDXAXqrDXA1U",
    imageUrl: "https://coin-images.coingecko.com/coins/images/33890/large/popcat.png",
    isMajor: false,
    sparkline: generateSparkline(0.0488, true),
  },
  {
    sym: "BONK",
    name: "Bonk",
    price: "$0.00002510",
    numericPrice: 0.00002510,
    solPrice: "0.00000024 SOL",
    change: "+12.64%",
    changeNum: 12.64,
    cap: "$1.87B",
    fdv: "$2.24B",
    liq: "$18.4M",
    pos: true,
    supply: 74500000000000,
    m5: { val: "1.36%", up: true },
    h1: { val: "3.37%", up: true },
    h6: { val: "18.16%", up: true },
    h24: { val: "12.64%", up: true },
    txns: 10386,
    buys: 5769,
    sells: 4617,
    vol: 10.0,
    buyVol: 5.8,
    sellVol: 4.2,
    traders: 2841,
    buyers: 1634,
    sellers: 1207,
    network: "solana",
    poolAddress: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
    imageUrl: "https://coin-images.coingecko.com/coins/images/28600/large/bonk.jpg",
    isMajor: false,
    sparkline: generateSparkline(0.00002510, true),
  },
  {
    sym: "WIF",
    name: "dogwifhat",
    price: "$2.349",
    numericPrice: 2.349,
    solPrice: "0.0230 SOL",
    change: "-2.13%",
    changeNum: -2.13,
    cap: "$2.35B",
    fdv: "$2.35B",
    liq: "$24.1M",
    pos: false,
    supply: 998926392,
    m5: { val: "0.28%", up: false },
    h1: { val: "1.10%", up: false },
    h6: { val: "3.45%", up: false },
    h24: { val: "2.13%", up: false },
    txns: 14210,
    buys: 6920,
    sells: 7290,
    vol: 26.4,
    buyVol: 12.3,
    sellVol: 14.1,
    traders: 6570,
    buyers: 3120,
    sellers: 3450,
    network: "solana",
    poolAddress: "EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm",
    imageUrl: "https://coin-images.coingecko.com/coins/images/33566/large/dogwifhat.jpg",
    isMajor: false,
    sparkline: generateSparkline(2.349, false),
  },
];

// User portfolio initializes to strictly $0.00 until they make a deposit
const INITIAL_BALANCES: Record<string, TokenBalance> = {
  USDT: { bal: 0.00, usdValue: 0.00, name: "Tether USD", totalInvested: 0.00, avgBuyPrice: 1.0 },
  USDC: { bal: 0.00, usdValue: 0.00, name: "USD Coin", totalInvested: 0.00, avgBuyPrice: 1.0 },
  SOL: { bal: 0.00, usdValue: 0.00, name: "Solana", totalInvested: 0.00, avgBuyPrice: 121.69 },
  BTC: { bal: 0.00, usdValue: 0.00, name: "Bitcoin", totalInvested: 0.00, avgBuyPrice: 77724.00 },
  ETH: { bal: 0.00, usdValue: 0.00, name: "Ethereum", totalInvested: 0.00, avgBuyPrice: 2650.00 },
};

const TRADER_ROSTER = [
  { addr: "8FBX5A", emoji: "🧙" },
  { addr: "AqS9yU", emoji: "🐬" },
  { addr: "t7fNGQ", emoji: "🐋" },
  { addr: "gxr1EB", emoji: "🐋" },
  { addr: "A6N3j7", emoji: "✨" },
  { addr: "GhJSky", emoji: "🐬" },
  { addr: "uRF6pD", emoji: "💎" },
  { addr: "9xQ2kP", emoji: "🦐" },
  { addr: "3NZkqR", emoji: "🦈" },
  { addr: "4YJztN", emoji: "⚡" },
];

function generateInitialTrades(token: MarketToken): LiveTrade[] {
  const trades: LiveTrade[] = [];
  const now = Date.now();
  const p = Math.max(0.00000001, token.numericPrice);

  if (token.is_rugged) {
    // Rugged tokens: dead market, only sparse historical panic sell dust from hours ago
    const ruggedHistory = [
      { tStr: "48m ago", ms: 48 * 60 * 1000, usd: 0.08 },
      { tStr: "1h 15m ago", ms: 75 * 60 * 1000, usd: 0.03 },
      { tStr: "2h 40m ago", ms: 160 * 60 * 1000, usd: 0.12 },
      { tStr: "5h ago", ms: 300 * 60 * 1000, usd: 0.05 },
    ];
    ruggedHistory.forEach((rh, i) => {
      const roster = TRADER_ROSTER[(i + 4) % TRADER_ROSTER.length];
      const tokenAmt = Math.round(rh.usd / 0.00000001);
      trades.push({
        id: `trade-rugged-${now - rh.ms}`,
        sym: token.sym,
        date: rh.tStr,
        timestamp: now - rh.ms,
        type: "Sell",
        usd: rh.usd,
        tokenAmt,
        solAmt: Number((rh.usd / 121.69).toFixed(6)),
        price: 0.00000001,
        trader: roster.addr,
        traderEmoji: "📉",
        txHash: Math.random().toString(36).substring(2, 10),
      });
    });
    return trades;
  }

  const times = ["30s ago", "1m ago", "2m ago", "2m ago", "2m ago", "2m ago", "3m ago", "4m ago", "5m ago", "7m ago"];

  times.forEach((tStr, i) => {
    const isBuy = i % 3 !== 0;
    const usd = isBuy
      ? Number((5 + (i * 17.5 + (i % 2) * 120)).toFixed(2))
      : Number((9 + (i * 24.3 + (i % 3) * 800)).toFixed(2));
    const tokenAmt = Number((usd / p).toFixed(p < 0.001 ? 0 : 2));
    const solAmt = Number((usd / 121.69).toFixed(p < 0.001 ? 6 : 4));
    const tradePrice = Number((p * (1 + (Math.random() - 0.5) * 0.015)).toFixed(p < 0.001 ? 8 : 4));
    const roster = TRADER_ROSTER[i % TRADER_ROSTER.length];

    trades.push({
      id: `trade-${now - i * 30000}`,
      sym: token.sym,
      date: tStr,
      timestamp: now - i * 30000,
      type: isBuy ? "Buy" : "Sell",
      usd,
      tokenAmt,
      solAmt,
      price: tradePrice,
      trader: roster.addr,
      traderEmoji: roster.emoji,
      txHash: Math.random().toString(36).substring(2, 10),
    });
  });

  return trades;
}

type Listener = () => void;

class MarketStore {
  tokens: MarketToken[] = [...INITIAL_TOKENS];
  balances: Record<string, TokenBalance> = { ...INITIAL_BALANCES };
  userOrders: UserOrder[] = [];
  pendingOrders: PendingOrder[] = [];
  lastOrderAlert: string | null = null;
  trades: Record<string, LiveTrade[]> = {};
  candleSeries: Record<string, Record<string, Candle[]>> = {}; // sym -> timeframe -> candles
  verifiedTokens: Record<string, boolean> = {};
  private isSynthetic: Record<string, Record<string, boolean>> = {};
  activeTimeframe: string = "1m";
  timeframe: string = "1m";
  dispMode: "Price" | "Mcap" = "Price";
  currMode: "USD" | "SOL" = "USD";
  private listeners: Set<Listener> = new Set();
  private tickerInterval: any = null;
  private pollInterval: any = null;
  private channel: BroadcastChannel | null = null;
  private isSyncingTokens: boolean = false;
  private isFetchingRealMarket: boolean = false;
  private momentums: Record<string, number> = {};
  private priceAnchors: Record<string, number> = {};
  private marketCycles: Record<string, { baselinePrice: number; phase: "impulse" | "pullback" | "consolidation"; phaseTicksLeft: number; totalCycleGains: number }> = {};
  public realizedProfit24h: number = 0;
  public lastTradeOrSwapTime: number = 0;
  public cachedPortfolioMetrics: {
    totalValue: number;
    baseline24h: number;
    diffUsd: number;
    diffPct: number;
    isPositive: boolean;
    realizedProfit24h: number;
    timestamp: number;
  } | null = null;

  constructor() {
    this.initVerifiedTokens();
    this.initLiquidityLockedTokens();
    this.initSellBlockedTokens();

    // Synchronously restore custom tokens cache before anything else
    if (typeof window !== "undefined" && window.localStorage) {
      try {
        const cachedTokensRaw = window.localStorage.getItem("axiom_custom_tokens_cache");
        if (cachedTokensRaw) {
          const cachedTokens = JSON.parse(cachedTokensRaw);
          if (Array.isArray(cachedTokens)) {
            cachedTokens.forEach((ct: MarketToken) => {
              if (!this.tokens.some(t => t.sym.toUpperCase() === ct.sym.toUpperCase())) {
                this.tokens.push(ct);
              }
            });
          }
        }
      } catch {}

      // Synchronously restore cached portfolio metrics and 24h realized profit
      try {
        const rawMetrics = window.localStorage.getItem("axiom_cached_portfolio_metrics");
        if (rawMetrics) {
          this.cachedPortfolioMetrics = JSON.parse(rawMetrics);
        }
      } catch {}

      try {
        const rawRealized = window.localStorage.getItem("axiom_realized_profit_24h");
        if (rawRealized) {
          const parsed = JSON.parse(rawRealized);
          if (parsed && typeof parsed === "object" && (Date.now() - (parsed.timestamp || 0) < 86400 * 1000)) {
            this.realizedProfit24h = parsed.amount || 0;
          }
        }
      } catch {}
    }

    this.tokens.forEach(t => {
      this.trades[t.sym] = generateInitialTrades(t);
      this.priceAnchors[t.sym] = t.numericPrice;
      this.momentums[t.sym] = 0;
      t.is_verified = this.isTokenVerified(t.sym);
      t.is_liquidity_locked = this.isTokenLiquidityLocked(t.sym);
    });
    this.initSync();

    // Synchronously restore user balances from localStorage on construction to eliminate $0.00 flash
    if (typeof window !== "undefined" && window.localStorage) {
      try {
        let authUserUid = "";
        let authUserWallet = "";
        try {
          const authUserRaw = window.localStorage.getItem("axiom_auth_user");
          if (authUserRaw) {
            const au = JSON.parse(authUserRaw);
            if (au.user_id) authUserUid = au.user_id;
            else if (au.id) authUserUid = String(au.id);
            if (au.wallet_address) authUserWallet = au.wallet_address;
          }
        } catch {}

        const savedUid = window.localStorage.getItem("axiom_user_id") || window.localStorage.getItem("axiom_wallet_address") || authUserUid || authUserWallet;
        const key = savedUid ? `axiom_user_balances_v16_${savedUid}` : "axiom_last_known_balances";
        const saved = window.localStorage.getItem(key) || window.localStorage.getItem("axiom_user_balances_latest") || window.localStorage.getItem("axiom_last_known_balances");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && typeof parsed === "object" && Object.keys(parsed).length > 0) {
            this.balances = { ...parsed };
          }
        }
        const ordersKey = savedUid ? `axiom_user_orders_v5_${savedUid}` : "axiom_user_orders_v5";
        const savedOrders = window.localStorage.getItem(ordersKey) || window.localStorage.getItem("axiom_user_orders_v5");
        if (savedOrders) {
          const parsed = JSON.parse(savedOrders);
          if (Array.isArray(parsed) && parsed.length > 0) {
            this.userOrders = parsed.map((o: any) => ({
              ...o,
              tokenAmt: Number(o.tokenAmt) || 0,
              amountUsd: Number(o.amountUsd) || 0,
              price: Number(o.price) || 0,
              timestamp: Number(o.timestamp) || Date.now()
            }));
          }
        }
      } catch { }
    }
    this.syncBackendTokens();
    this.sortTokensList();
    this.startLiveTicker();
    this.fetchRealMarketData();
    if (typeof window !== "undefined") {
      // 1. Fast backend token sync with in-flight lock: guarantees instant reflect without UI or thread congestion
      setInterval(() => {
        if (typeof document !== "undefined" && document.hidden) return;
        this.syncBackendTokens();
      }, 3500);

      // 2. Periodic external market data poll (2.5s for real Binance/Bybit market parity)
      this.pollInterval = setInterval(() => {
        if (typeof document !== "undefined" && document.hidden) return;
        this.fetchRealMarketData();
      }, 2500);

      // 3. Periodic portfolio sync (4s) to detect incoming UID transfers and deposits
      setInterval(() => {
        if (typeof document !== "undefined" && document.hidden) return;
        if (this.currentUserWallet) {
          this.syncBackendPortfolio();
        }
      }, 4000);

      // Instant refresh on tab focus / app resume (Safari <-> Home Screen PWA switching)
      window.addEventListener("focus", () => {
        if (this.currentUserWallet) {
          this.syncBackendPortfolio(true);
        }
      });
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible" && this.currentUserWallet) {
          this.syncBackendPortfolio(true);
        }
      });
    }
  }

  private initVerifiedTokens() {
    const DEFAULT_VERIFIED: Record<string, boolean> = {
      BTC: true,
      ETH: true,
      SOL: true,
      BNB: true,
      XRP: true,
      DOGE: true,
      ADA: true,
      AVAX: true,
      SUI: true,
      USDT: true,
      USDC: true,
    };
    if (typeof localStorage !== "undefined") {
      try {
        const raw = localStorage.getItem("axiom_admin_verified_tokens");
        if (raw) {
          this.verifiedTokens = { ...DEFAULT_VERIFIED, ...JSON.parse(raw) };
          return;
        }
      } catch (e) {
        console.warn("Failed to parse verified tokens from localStorage:", e);
      }
    }
    this.verifiedTokens = { ...DEFAULT_VERIFIED };
  }

  isTokenVerified(sym: string): boolean {
    if (!sym) return false;
    const s = sym.toUpperCase();
    if (this.verifiedTokens[s] !== undefined) return this.verifiedTokens[s];
    const DEFAULT_MAJORS = ["BTC", "ETH", "SOL", "BNB", "XRP", "DOGE", "ADA", "AVAX", "SUI", "USDT", "USDC"];
    return DEFAULT_MAJORS.includes(s);
  }

  setTokenVerified(sym: string, verified: boolean) {
    if (!sym) return;
    const s = sym.toUpperCase();
    this.verifiedTokens[s] = verified;
    const tok = this.tokens.find(t => t.sym.toUpperCase() === s);
    if (tok) tok.is_verified = verified;
    if (typeof localStorage !== "undefined") {
      try {
        localStorage.setItem("axiom_admin_verified_tokens", JSON.stringify(this.verifiedTokens));
      } catch (e) {
        console.warn("Failed to persist verified tokens:", e);
      }
    }
    api.setTokenBadges(s, { is_verified: verified }).catch(() => {});
    this.notify();
  }

  getAllVerifiedTokens(): Record<string, boolean> {
    return { ...this.verifiedTokens };
  }

  private liquidityLockedTokens: Record<string, boolean> = {};

  private initLiquidityLockedTokens() {
    const DEFAULT_LOCKED: Record<string, boolean> = {
      BTC: true,
      ETH: true,
      SOL: true,
      BNB: true,
      XRP: true,
      DOGE: true,
      ADA: true,
      AVAX: true,
      SUI: true,
      USDT: true,
      USDC: true,
    };
    if (typeof localStorage !== "undefined") {
      try {
        const raw = localStorage.getItem("axiom_admin_liquidity_locked_tokens");
        if (raw) {
          this.liquidityLockedTokens = { ...DEFAULT_LOCKED, ...JSON.parse(raw) };
          return;
        }
      } catch (e) {
        console.warn("Failed to parse locked tokens from localStorage:", e);
      }
    }
    this.liquidityLockedTokens = { ...DEFAULT_LOCKED };
  }

  isTokenLiquidityLocked(sym: string): boolean {
    if (!sym) return false;
    const s = sym.toUpperCase();
    const tok = this.tokens.find(t => t.sym.toUpperCase() === s);
    if (tok && tok.is_rugged) return false;
    if (this.liquidityLockedTokens[s] !== undefined) return this.liquidityLockedTokens[s];
    return true; // default true for standard healthy coins
  }

  setTokenLiquidityLocked(sym: string, locked: boolean) {
    if (!sym) return;
    const s = sym.toUpperCase();
    this.liquidityLockedTokens[s] = locked;
    const tok = this.tokens.find(t => t.sym.toUpperCase() === s);
    if (tok) tok.is_liquidity_locked = locked;
    if (typeof localStorage !== "undefined") {
      try {
        localStorage.setItem("axiom_admin_liquidity_locked_tokens", JSON.stringify(this.liquidityLockedTokens));
      } catch (e) {
        console.warn("Failed to persist locked tokens:", e);
      }
    }
    api.setTokenBadges(s, { is_liquidity_locked: locked }).catch(() => {});
    this.notify();
  }

  getAllLiquidityLockedTokens(): Record<string, boolean> {
    return { ...this.liquidityLockedTokens };
  }

  private sellBlockedTokens: Record<string, boolean> = {};
  public blockSellAllNewTokens: boolean = false;

  private initSellBlockedTokens() {
    if (typeof localStorage !== "undefined") {
      try {
        const raw = localStorage.getItem("axiom_admin_sell_blocked_tokens");
        if (raw) {
          this.sellBlockedTokens = JSON.parse(raw) || {};
        }
        this.blockSellAllNewTokens = localStorage.getItem("axiom_block_sell_all_new") === "true";
      } catch (e) {
        console.warn("Failed to parse sell blocked tokens from localStorage:", e);
      }
    }
  }

  isTokenSellBlocked(sym: string): boolean {
    if (!sym) return false;
    const s = sym.toUpperCase().replace(/^\$/, "");
    if (this.isMajorToken(s) || s === "SOL" || s === "USDT" || s === "USDC") {
      return false;
    }
    const tok = this.tokens.find(t => t.sym.toUpperCase() === s);
    if (tok && tok.is_sell_blocked !== undefined) {
      return Boolean(tok.is_sell_blocked);
    }
    if (this.sellBlockedTokens[s] !== undefined) {
      return Boolean(this.sellBlockedTokens[s]);
    }
    if (this.blockSellAllNewTokens && tok && !tok.isMajor) {
      return true;
    }
    return false;
  }

  setTokenSellBlocked(sym: string, blocked: boolean) {
    if (!sym) return;
    const s = sym.toUpperCase().replace(/^\$/, "");
    if (this.isMajorToken(s)) return;
    this.sellBlockedTokens[s] = blocked;
    const tok = this.tokens.find(t => t.sym.toUpperCase() === s);
    if (tok) tok.is_sell_blocked = blocked;
    if (typeof localStorage !== "undefined") {
      try {
        localStorage.setItem("axiom_admin_sell_blocked_tokens", JSON.stringify(this.sellBlockedTokens));
      } catch (e) {
        console.warn("Failed to persist sell blocked tokens:", e);
      }
    }
    this.savePersistedStateNow();
    this.notify();
  }

  setBlockSellAllNewTokens(active: boolean) {
    this.blockSellAllNewTokens = active;
    if (typeof localStorage !== "undefined") {
      try {
        localStorage.setItem("axiom_block_sell_all_new", active ? "true" : "false");
      } catch (e) {}
    }
    this.savePersistedStateNow();
    this.notify();
  }

  async boostTokenHolders(sym: string, count: number): Promise<void> {
    const s = sym.toUpperCase();
    const tok = this.tokens.find(t => t.sym.toUpperCase() === s);
    if (tok) {
      tok.user_holders_count = (tok.user_holders_count || 0) + count;
      tok.buyers = (tok.buyers || 0) + count;
      tok.traders = (tok.traders || 0) + count;
      this.savePersistedStateNow();
      this.notify();
    }
    try {
      await api.boostTokenHolders(s, count);
    } catch {}
  }

  async setTokenHoldersBuyers(sym: string, holders: number, buyers: number): Promise<void> {
    const s = sym.toUpperCase();
    const tok = this.tokens.find(t => t.sym.toUpperCase() === s);
    if (tok) {
      tok.user_holders_count = holders;
      tok.buyers = buyers;
      tok.traders = (tok.sellers || 0) + buyers;
      this.savePersistedStateNow();
      this.notify();
    }
    try {
      await api.setTokenHoldersBuyers(s, holders, buyers);
    } catch {}
  }

  // Guarantee 9 Majors (BTC, ETH, SOL, BNB, XRP, DOGE, ADA, AVAX, SUI) stay pinned at the top in order, others sorted descending by 24h volume
  sortTokensList() {
    const majorOrder: Record<string, number> = {
      BTC: 1,
      ETH: 2,
      SOL: 3,
      BNB: 4,
      XRP: 5,
      DOGE: 6,
      ADA: 7,
      AVAX: 8,
      SUI: 9,
    };
    this.tokens.sort((a, b) => {
      const aRank = majorOrder[a.sym] || (a.isMajor ? 10 : 999);
      const bRank = majorOrder[b.sym] || (b.isMajor ? 10 : 999);
      if (aRank !== bRank) {
        return aRank - bRank;
      }
      const aVol = a.vol || 0;
      const bVol = b.vol || 0;
      return bVol - aVol;
    });
  }

  isMajorToken(sym: string): boolean {
    const s = (sym || "").toUpperCase();
    return s === "BTC" || s === "ETH" || s === "SOL" || s === "BNB" || s === "XRP" || s === "DOGE" || s === "ADA" || s === "AVAX" || s === "SUI";
  }

  async syncBackendTokens(): Promise<boolean> {
    if (this.isSyncingTokens) return false;
    this.isSyncingTokens = true;
    try {
      const backendTokens = await api.getTokens();
      if (!Array.isArray(backendTokens) || backendTokens.length === 0) return false;

      let hasUpdates = false;
      const formatShort = (n: number) => {
        if (n >= 1e12) return `$${Math.min(999.9, n / 1e12).toFixed(2)}T`;
        if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
        if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
        if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
        return `$${n.toFixed(2)}`;
      };

      backendTokens.forEach((bt: any) => {
        const sym = (bt.symbol || "").toUpperCase().trim();
        if (!sym) return;
        // Never allow backend to override genuine major cryptos (SOL, BTC, etc.)
        if (this.isMajorToken(sym)) return;

        const rawP = parseFloat(bt.current_price_usd) || 0;
        const isRugged = !!bt.is_rugged || (rawP > 0 && rawP <= 0.00000001) || parseFloat(bt.liquidity_usd) === 0;
        const numPrice = isRugged ? 0.00000001 : (rawP || 0.001);
        const numSupply = parseFloat(bt.total_supply) || 1000000000;
        const numCap = isRugged ? 10.0 : (parseFloat(bt.market_cap_usd) || (numPrice * numSupply));
        const numLiq = isRugged ? 0.0 : (parseFloat(bt.liquidity_usd) || 50000);
        let numChange = isRugged ? -99.99 : (parseFloat(bt.change_24h) || 0);
        if (numChange > 99999) numChange = 99999;
        if (numChange < -99.99) numChange = -99.99;
        const contractAddr = (bt.contract_address || "").trim();
        const pairCurrency = (bt.pair_currency || 'SOL').toUpperCase().trim();

        const formattedPrice = formatCoinPrice(numPrice);
        const changeStr = isRugged ? "-99.99%" : formatPercentage(numChange);

        const idx = this.tokens.findIndex(t => t.sym === sym);
        if (idx >= 0) {
          const current = this.tokens[idx];
          const effectivePrice = numPrice > 0 ? numPrice : current.numericPrice;
          const effectiveFormatted = numPrice > 0 ? formattedPrice : current.price;

          const updated: MarketToken = {
            ...current,
            name: bt.name || current.name,
            pair_currency: pairCurrency || current.pair_currency || 'SOL',
            contractAddress: contractAddr || current.contractAddress,
            poolAddress: contractAddr || current.poolAddress,
            imageUrl: bt.logo_url || current.imageUrl,
            numericPrice: effectivePrice,
            price: effectiveFormatted,
            solPrice: `${(effectivePrice / 121.69).toFixed(6)} SOL`,
            cap: formatShort(numCap),
            fdv: formatShort(numCap),
            liq: formatShort(numLiq),
            supply: numSupply,
            change: changeStr,
            changeNum: numChange,
            pos: !isRugged && numChange >= 0,
            is_rugged: isRugged,
            sparkline: current.sparkline && current.sparkline.length > 1 ? current.sparkline : generateSparkline(effectivePrice, !isRugged && numChange >= 0),
            user_holders_count: Math.max(bt.user_holders_count || 0, current.user_holders_count || 0),
            real_buyers_count: bt.real_buyers_count !== undefined ? bt.real_buyers_count : 0,
            total_user_buy_volume_usd: bt.total_user_buy_volume_usd || 0,
            user_circulating_tokens: bt.user_circulating_tokens || 0,
            total_buyers_count: Math.max(bt.total_buyers_count || 0, current.buyers || 0),
            is_verified: bt.is_verified !== undefined ? bt.is_verified : (current.is_verified ?? this.isTokenVerified(sym)),
            is_liquidity_locked: bt.is_liquidity_locked !== undefined ? bt.is_liquidity_locked : (current.is_liquidity_locked ?? this.isTokenLiquidityLocked(sym)),
          };
          this.tokens[idx] = updated;

          const priceDiff = Math.abs(effectivePrice - current.numericPrice);
          if (priceDiff > 0.00000001) {
            this.injectCandleTick(sym, effectivePrice, effectivePrice >= current.numericPrice);
            if (this.candleSeries[sym]) {
              Object.keys(this.candleSeries[sym]).forEach(tf => {
                const candles = this.candleSeries[sym][tf];
                if (candles && candles.length > 0) {
                  const last = candles[candles.length - 1];
                  last.close = effectivePrice;
                  last.high = Math.max(last.high, effectivePrice);
                  last.low = Math.min(last.low, effectivePrice);
                }
              });
            }
          }

          this.priceAnchors[sym] = effectivePrice;
          if (this.balances[sym] && this.balances[sym].bal > 0) {
            this.balances[sym].usdValue = Number((this.balances[sym].bal * effectivePrice).toFixed(2));
          }

          hasUpdates = true;
        } else {
          // Brand new token created in backend (e.g. pepepe) - add to marketStore!
          const fallbackImg = bt.logo_url && bt.logo_url.trim().length > 0
            ? bt.logo_url.trim()
            : "https://coin-images.coingecko.com/coins/images/33890/large/popcat.png";

          const newToken: MarketToken = {
            sym,
            name: bt.name || sym,
            pair_currency: pairCurrency || 'SOL',
            price: formattedPrice,
            numericPrice: numPrice,
            solPrice: `${(numPrice / 121.69).toFixed(6)} SOL`,
            change: changeStr,
            changeNum: numChange,
            cap: formatShort(numCap),
            fdv: formatShort(numCap),
            liq: formatShort(numLiq),
            pos: !isRugged && numChange >= 0,
            is_rugged: isRugged,
            supply: numSupply,
            m5: { val: "0%", up: true, zero: true },
            h1: { val: "0%", up: true, zero: true },
            h6: { val: "0%", up: true, zero: true },
            h24: { val: "0%", up: true, zero: true },
            txns: 1,
            buys: 1,
            sells: 0,
            vol: Number(((numLiq * 1.8) / 1e6).toFixed(2)),
            buyVol: Number((numLiq / 1e6).toFixed(2)),
            sellVol: Number(((numLiq * 0.8) / 1e6).toFixed(2)),
            traders: 1,
            buyers: bt.total_buyers_count || 1,
            sellers: 0,
            network: "solana",
            poolAddress: contractAddr,
            contractAddress: contractAddr,
            imageUrl: fallbackImg,
            isNew: true,
            createdAt: bt.created_at ? new Date(bt.created_at).getTime() : Date.now(),
            isMajor: false,
            isMarketMakerActive: true,
            customPrice: true,
            sparkline: generateSparkline(numPrice, !isRugged && numChange >= 0),
            user_holders_count: bt.user_holders_count || 0,
            real_buyers_count: bt.real_buyers_count !== undefined ? bt.real_buyers_count : 0,
            total_user_buy_volume_usd: bt.total_user_buy_volume_usd || 0,
            user_circulating_tokens: bt.user_circulating_tokens || 0,
            total_buyers_count: bt.total_buyers_count || 0,
            is_verified: bt.is_verified !== undefined ? bt.is_verified : this.isTokenVerified(sym),
            is_liquidity_locked: bt.is_liquidity_locked !== undefined ? bt.is_liquidity_locked : this.isTokenLiquidityLocked(sym),
          };

          const majorsCount = this.tokens.filter(t => this.isMajorToken(t.sym)).length;
          this.tokens.splice(majorsCount, 0, newToken);
          this.tokens = [...this.tokens];

          this.priceAnchors[sym] = numPrice;
          this.momentums[sym] = 0;
          this.candleSeries[sym] = {};
          const tfs = ["1s", "1m", "5m", "15m", "1h", "4h", "D"];
          tfs.forEach(tf => {
            this.candleSeries[sym][tf] = this.buildInitialCandles(sym, tf);
          });
          this.trades[sym] = generateInitialTrades(newToken);

          if (this.balances[sym] && this.balances[sym].bal > 0) {
            this.balances[sym].usdValue = Number((this.balances[sym].bal * numPrice).toFixed(2));
          }

          hasUpdates = true;
        }
      });

      if (typeof window !== "undefined" && window.localStorage) {
        try {
          const nonMajors = this.tokens.filter(t => !this.isMajorToken(t.sym));
          window.localStorage.setItem("axiom_custom_tokens_cache", JSON.stringify(nonMajors));
        } catch {}
      }

      if (hasUpdates) {
        this.sortTokensList();
        this.savePersistedState();
        this.notify();
      }
      return hasUpdates;
    } catch (err) {
      console.warn("syncBackendTokens error:", err);
      return false;
    } finally {
      this.isSyncingTokens = false;
    }
  }

  async fetchRealMarketData() {
    if (this.isFetchingRealMarket) return;
    this.isFetchingRealMarket = true;
    try {
      const [majors, trending] = await Promise.all([
        fetchGeckoMajors(),
        fetchGeckoTrendingSolana(),
      ]);

      await this.syncBackendTokens();

      let hasUpdates = false;

      if (majors && majors.length > 0) {
        hasUpdates = true;
        majors.forEach(m => {
          const idx = this.tokens.findIndex(t => t.sym === m.sym);
          if (idx >= 0) {
            const current = this.tokens[idx];
            if (!current.is_rugged && !current.isMarketMakerActive && !current.customPrice) {
              this.tokens[idx] = {
                ...current,
                ...m,
                numericPrice: m.numericPrice,
                price: m.price,
                changeNum: m.changeNum,
                change: m.change,
                pos: m.pos,
                imageUrl: m.imageUrl || current.imageUrl,
                sparkline: current.sparkline || generateSparkline(m.numericPrice, m.pos),
              };
              this.priceAnchors[m.sym] = m.numericPrice;

              // Keep candle series active candle strictly clamped to live Binance price
              if (this.candleSeries[m.sym]) {
                Object.keys(this.candleSeries[m.sym]).forEach(tf => {
                  const candles = this.candleSeries[m.sym][tf];
                  if (candles && candles.length > 0) {
                    const last = candles[candles.length - 1];
                    last.close = m.numericPrice;
                    last.high = Math.max(last.high, m.numericPrice);
                    last.low = Math.min(last.low, m.numericPrice);
                  }
                });
              }
            }
          } else {
            this.tokens.push({
              ...m,
              sparkline: generateSparkline(m.numericPrice, m.pos),
            });
            this.priceAnchors[m.sym] = m.numericPrice;
          }
        });
      }

      if (trending && trending.length > 0) {
        hasUpdates = true;
        const majorSyms = new Set(["BTC", "ETH", "SOL", "BNB", "XRP", "DOGE", "ADA", "AVAX", "SUI"]);
        trending.forEach(tok => {
          if (majorSyms.has(tok.sym)) return;

          const idx = this.tokens.findIndex(t => t.sym === tok.sym);
          if (idx >= 0) {
            const current = this.tokens[idx];
            if (!current.is_rugged && !current.isMarketMakerActive && !current.customPrice) {
              this.tokens[idx] = {
                ...this.tokens[idx],
                ...tok,
                imageUrl: tok.imageUrl || this.tokens[idx].imageUrl,
                sparkline: this.tokens[idx].sparkline || generateSparkline(tok.numericPrice, tok.pos),
              };
              this.priceAnchors[tok.sym] = tok.numericPrice;
            }
          } else {
            this.tokens.push({
              ...tok,
              sparkline: generateSparkline(tok.numericPrice, tok.pos),
            });
            this.priceAnchors[tok.sym] = tok.numericPrice;
          }
        });
      }

      if (hasUpdates) {
        this.sortTokensList();
        this.savePersistedState();
        this.notify();
      }
    } catch (err) {
      console.warn("fetchRealMarketData error:", err);
    } finally {
      this.isFetchingRealMarket = false;
    }
  }

  private initSync() {
    if (typeof window !== "undefined") {
      // 1. Cross-tab BroadcastChannel for zero-latency synchronization
      if ("BroadcastChannel" in window) {
        try {
          this.channel = new BroadcastChannel("axiom_market_sync_v2");
          this.channel.onmessage = (event) => {
            this.handleSyncMessage(event.data);
          };
        } catch (e) {
          console.warn("BroadcastChannel error:", e);
        }
      }

      // 2. Storage event fallback for cross-tab sync across different origins or older contexts
      window.addEventListener("storage", (e) => {
        if (e.key === "axiom_sync_event_v2" && e.newValue) {
          try {
            const data = JSON.parse(e.newValue);
            this.handleSyncMessage(data);
          } catch { }
        }
      });

      // 3. Load persisted tokens, balances, and anchors
      this.loadPersistedState();
    }
  }

  private broadcast(msg: { type: string; payload: any }) {
    if (this.channel) {
      try {
        this.channel.postMessage(msg);
      } catch { }
    }
    if (typeof window !== "undefined" && window.localStorage) {
      try {
        window.localStorage.setItem("axiom_sync_event_v2", JSON.stringify({ ...msg, _t: Date.now() }));
      } catch { }
    }
  }

  currentUserId: string = typeof window !== "undefined" && window.localStorage ? (window.localStorage.getItem("axiom_user_id") || "") : "";
  currentUserWallet: string = typeof window !== "undefined" && window.localStorage ? (window.localStorage.getItem("axiom_wallet_address") || "") : "";

  getSyncIdentifier(): string {
    return this.currentUserWallet
      || this.currentUserId
      || (typeof window !== "undefined" && window.localStorage ? (window.localStorage.getItem("axiom_wallet_address") || window.localStorage.getItem("axiom_user_id") || "") : "");
  }

  async setUser(user: { user_id?: string; id?: string; email?: string; wallet_address?: string } | null) {
    const uid = user ? (user.user_id || user.id || user.email || user.wallet_address || (typeof window !== "undefined" && window.localStorage ? window.localStorage.getItem("axiom_wallet_address") : "") || "axiom_user") : "";
    const wallet = user?.wallet_address || (typeof window !== "undefined" && window.localStorage ? window.localStorage.getItem("axiom_wallet_address") || "" : "");

    this.currentUserId = uid;
    this.currentUserWallet = wallet;

    if (typeof window !== "undefined" && window.localStorage) {
      try {
        if (uid) window.localStorage.setItem("axiom_user_id", uid);
        if (wallet) window.localStorage.setItem("axiom_wallet_address", wallet);
      } catch { }
    }

    if (!uid && !wallet && !user) {
      // Only clear if explicitly null and no local keys exist
      return;
    }

    // Check multiple balance storage keys so balances are NEVER lost across ID format changes
    let saved: string | null = null;
    if (typeof window !== "undefined" && window.localStorage) {
      if (wallet) saved = window.localStorage.getItem(`axiom_user_balances_v16_${wallet}`);
      if (!saved && uid) saved = window.localStorage.getItem(`axiom_user_balances_v16_${uid}`);
      if (!saved) saved = window.localStorage.getItem("axiom_user_balances_latest");
    }

    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === "object") {
          this.balances = { ...this.balances, ...parsed };
        }
      } catch { }
    }

    // Always restore user orders and trade activity history, never delete or reset
    if (typeof window !== "undefined" && window.localStorage) {
      const userOrdersKey = `axiom_user_orders_v5_${uid}`;
      const savedOrders = window.localStorage.getItem(userOrdersKey) || window.localStorage.getItem("axiom_user_orders_v5");
      if (savedOrders) {
        try {
          const parsed = JSON.parse(savedOrders);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const existingIds = new Set(this.userOrders.map(o => o.id));
            const merged = [...this.userOrders];
            parsed.forEach((o: any) => {
              if (!existingIds.has(o.id)) {
                merged.push(o);
                existingIds.add(o.id);
              }
            });
            this.userOrders = merged;
          }
        } catch { }
      }

      const userPendingKey = `axiom_pending_orders_v5_${uid}`;
      const savedPending = window.localStorage.getItem(userPendingKey) || window.localStorage.getItem("axiom_pending_orders_v5");
      if (savedPending) {
        try {
          const parsed = JSON.parse(savedPending);
          if (Array.isArray(parsed) && parsed.length > 0) {
            this.pendingOrders = parsed;
          }
        } catch { }
      }
      this.savePersistedStateNow();
    }

    // 1. First ensure backend custom meme tokens are loaded in memory so they are recognizable
    try {
      await this.syncBackendTokens();
    } catch { }

    // 2. Fetch live balances and transactions directly from backend database with forced refresh
    try {
      await this.syncBackendPortfolio(true);
    } catch { }

    this.savePersistedStateNow();
    this.notify();
  }

  private saveTimeout: any = null;

  private savePersistedState() {
    if (typeof window === "undefined" || !window.localStorage) return;
    if (this.saveTimeout) clearTimeout(this.saveTimeout);
    this.saveTimeout = setTimeout(() => {
      try {
        window.localStorage.setItem("axiom_tokens_v3", JSON.stringify(this.tokens));
        window.localStorage.setItem("axiom_user_orders_v5", JSON.stringify(this.userOrders));
        window.localStorage.setItem("axiom_pending_orders_v5", JSON.stringify(this.pendingOrders));
        window.localStorage.setItem("axiom_user_balances_latest", JSON.stringify(this.balances));
        if (this.currentUserId) {
          window.localStorage.setItem(`axiom_user_balances_v16_${this.currentUserId}`, JSON.stringify(this.balances));
          window.localStorage.setItem(`axiom_user_orders_v5_${this.currentUserId}`, JSON.stringify(this.userOrders));
          window.localStorage.setItem(`axiom_pending_orders_v5_${this.currentUserId}`, JSON.stringify(this.pendingOrders));
        }
        if (this.currentUserWallet) {
          window.localStorage.setItem(`axiom_user_balances_v16_${this.currentUserWallet}`, JSON.stringify(this.balances));
        }
        window.localStorage.setItem("axiom_anchors_v2", JSON.stringify(this.priceAnchors));
        window.localStorage.setItem("axiom_selected_sym", this.activeSym);
      } catch { }
    }, 500);
  }

  savePersistedStateNow() {
    if (typeof window === "undefined" || !window.localStorage) return;
    if (this.saveTimeout) clearTimeout(this.saveTimeout);
    try {
      // Recalculate each balance's usdValue with current live price before saving
      Object.entries(this.balances).forEach(([sym, b]) => {
        if (b.bal > 0.000001) {
          if (sym === "USDT" || sym === "USDC") {
            b.usdValue = Number(b.bal.toFixed(2));
          } else {
            const tok = this.getToken(sym);
            const p = tok && tok.numericPrice > 0 ? tok.numericPrice : (b.avgBuyPrice || 0);
            if (p > 0) {
              b.usdValue = Number((b.bal * p).toFixed(2));
            }
          }
        }
      });

      // Cache token prices mapping synchronously for instantaneous reload
      const priceMap: Record<string, number> = {};
      this.tokens.forEach(t => {
        if (t.sym && t.numericPrice > 0) {
          priceMap[t.sym.toUpperCase().trim().replace(/^\$/, "")] = t.numericPrice;
        }
      });
      window.localStorage.setItem("axiom_token_prices_cache", JSON.stringify(priceMap));

      // Also cache current portfolio metrics
      const metrics = this.getPortfolioMetrics();
      if (metrics.totalValue > 0) {
        this.cachedPortfolioMetrics = {
          ...metrics,
          realizedProfit24h: this.realizedProfit24h || 0,
          timestamp: Date.now(),
        };
        window.localStorage.setItem("axiom_cached_portfolio_metrics", JSON.stringify(this.cachedPortfolioMetrics));
      }

      window.localStorage.setItem("axiom_tokens_v3", JSON.stringify(this.tokens));
      window.localStorage.setItem("axiom_user_orders_v5", JSON.stringify(this.userOrders));
      window.localStorage.setItem("axiom_pending_orders_v5", JSON.stringify(this.pendingOrders));
      window.localStorage.setItem("axiom_user_balances_latest", JSON.stringify(this.balances));
      if (this.currentUserId) {
        window.localStorage.setItem(`axiom_user_balances_v16_${this.currentUserId}`, JSON.stringify(this.balances));
        window.localStorage.setItem(`axiom_user_orders_v5_${this.currentUserId}`, JSON.stringify(this.userOrders));
        window.localStorage.setItem(`axiom_pending_orders_v5_${this.currentUserId}`, JSON.stringify(this.pendingOrders));
      }
      if (this.currentUserWallet) {
        window.localStorage.setItem(`axiom_user_balances_v16_${this.currentUserWallet}`, JSON.stringify(this.balances));
      }
      window.localStorage.setItem("axiom_anchors_v2", JSON.stringify(this.priceAnchors));
      window.localStorage.setItem("axiom_selected_sym", this.activeSym);
      window.localStorage.setItem("axiom_admin_sell_blocked_tokens", JSON.stringify(this.sellBlockedTokens));
      window.localStorage.setItem("axiom_block_sell_all_new", this.blockSellAllNewTokens ? "true" : "false");
    } catch { }
  }

  private loadPersistedState() {
    if (typeof window === "undefined" || !window.localStorage) return;
    try {
      // 1. Immediately restore latest balances so user balances never display 0.00 on home screen or reload
      const storedWallet = window.localStorage.getItem("axiom_wallet_address");
      const storedUid = window.localStorage.getItem("axiom_user_id");
      const savedBal = (storedWallet ? window.localStorage.getItem(`axiom_user_balances_v16_${storedWallet}`) : null)
        || (storedUid ? window.localStorage.getItem(`axiom_user_balances_v16_${storedUid}`) : null)
        || window.localStorage.getItem("axiom_user_balances_latest");
      if (savedBal) {
        try {
          const parsed = JSON.parse(savedBal);
          if (parsed && typeof parsed === "object") {
            this.balances = { ...this.balances, ...parsed };
          }
        } catch { }
      }

      // Restore cached token prices synchronously
      const savedPrices = window.localStorage.getItem("axiom_token_prices_cache");
      if (savedPrices) {
        try {
          const pMap = JSON.parse(savedPrices);
          if (pMap && typeof pMap === "object") {
            Object.entries(pMap).forEach(([sym, price]) => {
              const cleanSym = sym.toUpperCase().trim().replace(/^\$/, "");
              if (BINANCE_MAJOR_SYMBOLS.has(cleanSym)) return; // Strictly ignore stale cache for major coins
              const pNum = Number(price);
              if (pNum > 0) {
                const tok = this.tokens.find(t => t.sym.toUpperCase().trim().replace(/^\$/, "") === cleanSym);
                if (tok) {
                  tok.numericPrice = pNum;
                  tok.price = formatCoinPrice(pNum);
                }
              }
            });
          }
        } catch {}
      }

      const savedTokens = window.localStorage.getItem("axiom_tokens_v3");
      if (savedTokens) {
        const parsed = JSON.parse(savedTokens);
        if (Array.isArray(parsed) && parsed.length > 0) {
          parsed.forEach((pt: MarketToken) => {
            const cleanSym = (pt.sym || "").toUpperCase().trim().replace(/^\$/, "");
            if (BINANCE_MAJOR_SYMBOLS.has(cleanSym)) {
              // For major coins, keep live Binance prices and changes intact!
              const idx = this.tokens.findIndex(t => t.sym === pt.sym);
              if (idx >= 0 && pt.imageUrl && !this.tokens[idx].imageUrl) {
                this.tokens[idx].imageUrl = pt.imageUrl;
              }
              return;
            }
            const idx = this.tokens.findIndex(t => t.sym === pt.sym);
            if (idx >= 0) {
              const it = INITIAL_TOKENS.find(i => i.sym === pt.sym);
              const genuineName = it ? it.name : pt.name;

              this.tokens[idx] = {
                ...this.tokens[idx],
                ...pt,
                name: genuineName,
                poolAddress: pt.poolAddress || this.tokens[idx].poolAddress,
                contractAddress: pt.contractAddress || pt.poolAddress || this.tokens[idx].contractAddress,
                network: this.tokens[idx].network || pt.network || "solana",
                imageUrl: pt.imageUrl || this.tokens[idx].imageUrl,
                isMajor: this.tokens[idx].isMajor !== undefined ? this.tokens[idx].isMajor : pt.isMajor,
                isNew: pt.isNew !== undefined ? pt.isNew : this.tokens[idx].isNew,
                createdAt: pt.createdAt || this.tokens[idx].createdAt,
                isMarketMakerActive: pt.isMarketMakerActive || this.tokens[idx].isMarketMakerActive,
                customPrice: pt.customPrice || this.tokens[idx].customPrice,
                sparkline: (pt.sparkline && pt.sparkline.length > 1) ? pt.sparkline : (this.tokens[idx].sparkline || generateSparkline(this.tokens[idx].numericPrice, this.tokens[idx].pos)),
              };
            } else {
              this.tokens.push({
                ...pt,
                contractAddress: pt.contractAddress || pt.poolAddress,
                network: pt.network || "solana",
                sparkline: (pt.sparkline && pt.sparkline.length > 1) ? pt.sparkline : generateSparkline(pt.numericPrice || 1, pt.pos ?? true),
              });
            }
          });
        }
      }

      // Self-healing: Guarantee any meme token that has been rugged or dropped to 0.00000001 always shows -99.99%
      this.tokens.forEach(t => {
        if (!this.isMajorToken(t.sym)) {
          if (t.is_rugged || t.numericPrice <= 0.00000001 || t.price === "$0.00000001" || t.changeNum <= -99) {
            t.is_rugged = true;
            t.numericPrice = 0.00000001;
            t.price = "$0.00000001";
            t.solPrice = "0.00000000 SOL";
            t.change = "-99.99%";
            t.changeNum = -99.99;
            t.pos = false;
            t.liq = "$0.00";
            t.cap = "$10.00";
            t.fdv = "$10.00";
          }
        }
      });

      // Guarantee all initial tokens are present and valid
      INITIAL_TOKENS.forEach(it => {
        let exists = this.tokens.find(t => t.sym === it.sym);
        if (!exists) {
          this.tokens.push({ ...it });
        } else {
          if (!exists.imageUrl) exists.imageUrl = it.imageUrl;
          if (!exists.sparkline || exists.sparkline.length < 2) exists.sparkline = it.sparkline;

          // Always enforce genuine name for major tokens
          if (it.isMajor) {
            exists.name = it.name;
          }

          // Self-healing: if any major crypto was accidentally rugged or corrupted
          if (it.isMajor && (exists.is_rugged || !exists.numericPrice || exists.numericPrice <= 0 || isNaN(exists.numericPrice) || exists.name !== it.name)) {
            console.log(`[marketStore] Restoring rugged/corrupted major token ${exists.sym} back to real price.`);
            exists.name = it.name;
            exists.numericPrice = it.numericPrice;
            exists.price = it.price;
            exists.solPrice = it.solPrice;
            exists.change = it.change;
            exists.changeNum = it.changeNum;
            exists.pos = it.pos;
            exists.cap = it.cap;
            exists.fdv = it.fdv;
            exists.liq = it.liq;
            exists.is_rugged = false;
            this.priceAnchors[exists.sym] = it.numericPrice;
            this.momentums[exists.sym] = 0;
          }
        }
      });

      // Ensure every token has sparkline
      this.tokens.forEach(t => {
        if (!t.sparkline || t.sparkline.length < 2) {
          t.sparkline = generateSparkline(t.numericPrice, t.pos);
        }
      });

      this.sortTokensList();
      this.savePersistedStateNow();

      // Reset / Migration: All users start strictly at $0.00 until they make an actual deposit
      const isZeroResetDone = window.localStorage.getItem("axiom_zero_start_v1");
      if (!isZeroResetDone) {
        [
          "axiom_balances_v1", "axiom_balances_v2", "axiom_balances_v3",
          "axiom_balances_v4", "axiom_balances_v5", "axiom_balances_v6",
          "axiom_balances_v7", "axiom_balances_v8", "axiom_balances_v9",
          "axiom_balances_v10", "axiom_reset_twenty_v8", "axiom_reset_twenty_v9",
          "axiom_reset_twenty_v10",
          "axiom_user_orders_v1", "axiom_user_orders_v2", "axiom_user_orders_v3",
          "axiom_pending_orders_v1", "axiom_pending_orders_v2", "axiom_pending_orders_v3"
        ].forEach(k => {
          try { window.localStorage.removeItem(k); } catch { }
        });
        window.localStorage.setItem("axiom_zero_start_v1", "true");
        this.balances = {
          USDT: { bal: 0.00, usdValue: 0.00, name: "Tether USD", totalInvested: 0.00, avgBuyPrice: 1.0 },
          USDC: { bal: 0.00, usdValue: 0.00, name: "USD Coin", totalInvested: 0.00, avgBuyPrice: 1.0 },
          SOL: { bal: 0.00, usdValue: 0.00, name: "Solana", totalInvested: 0.00, avgBuyPrice: 121.69 },
        };
        this.savePersistedState();
      } else {
        // Clean legacy un-scoped balance keys
        try {
          window.localStorage.removeItem("axiom_balances_v11");
          window.localStorage.removeItem("axiom_user_orders_v4");
          window.localStorage.removeItem("axiom_pending_orders_v4");
        } catch { }

        const uid = this.currentUserId || (typeof window !== "undefined" && window.localStorage ? (window.localStorage.getItem("axiom_user_id") || window.localStorage.getItem("axiom_wallet_address") || "") : "");
        const userKey = uid ? `axiom_user_balances_v16_${uid}` : null;
        const savedBalances = userKey ? window.localStorage.getItem(userKey) : null;
        if (savedBalances) {
          try {
            const parsed = JSON.parse(savedBalances);
            if (parsed && typeof parsed === "object") {
              this.balances = { ...parsed };
            }
          } catch { }
        } else {
          // Fresh default strictly $0.00
          this.balances = {
            USDT: { bal: 0.00, usdValue: 0.00, name: "Tether USD", totalInvested: 0.00, avgBuyPrice: 1.0 },
            USDC: { bal: 0.00, usdValue: 0.00, name: "USD Coin", totalInvested: 0.00, avgBuyPrice: 1.0 },
            SOL: { bal: 0.00, usdValue: 0.00, name: "Solana", totalInvested: 0.00, avgBuyPrice: 121.69 },
          };
        }

        // Always restore user orders from user-scoped key and fallback global key
        const userOrdersKey = uid ? `axiom_user_orders_v5_${uid}` : null;
        const savedOrders = (userOrdersKey ? window.localStorage.getItem(userOrdersKey) : null) || (typeof window !== "undefined" && window.localStorage ? window.localStorage.getItem("axiom_user_orders_v5") : null);
        if (savedOrders) {
          try {
            const parsed = JSON.parse(savedOrders);
            if (Array.isArray(parsed) && parsed.length > 0) {
              const existingIds = new Set(this.userOrders.map((o: any) => o.id));
              const merged = [...this.userOrders];
              parsed.forEach((o: any) => {
                if (!existingIds.has(o.id)) {
                  merged.push(o);
                  existingIds.add(o.id);
                }
              });
              this.userOrders = merged;
            }
          } catch { }
        }

        const userPendingKey = uid ? `axiom_pending_orders_v5_${uid}` : null;
        const savedPending = (userPendingKey ? window.localStorage.getItem(userPendingKey) : null) || (typeof window !== "undefined" && window.localStorage ? window.localStorage.getItem("axiom_pending_orders_v5") : null);
        if (savedPending) {
          try {
            const parsed = JSON.parse(savedPending);
            if (Array.isArray(parsed) && parsed.length > 0) {
              this.pendingOrders = parsed;
            }
          } catch { }
        }
      }

      // Guarantee stablecoins always valued at $1.00
      if (this.balances["USDC"]) {
        this.balances["USDC"].usdValue = this.balances["USDC"].bal;
        this.balances["USDC"].name = "USD Coin";
        this.balances["USDC"].avgBuyPrice = 1.0;
      }
      if (this.balances["USDT"]) {
        this.balances["USDT"].usdValue = this.balances["USDT"].bal;
        this.balances["USDT"].name = "Tether USD";
        this.balances["USDT"].avgBuyPrice = 1.0;
      }

      // Ensure activeSym defaults to BTC (top coin) if unselected or stale
      const savedSym = window.localStorage.getItem("axiom_selected_sym");
      if (savedSym && savedSym !== "POPCAT" && this.getToken(savedSym)) {
        this.activeSym = savedSym;
      } else {
        this.activeSym = "BTC";
        window.localStorage.setItem("axiom_selected_sym", "BTC");
      }

      const savedAnchors = window.localStorage.getItem("axiom_anchors_v2");
      if (savedAnchors) {
        const parsed = JSON.parse(savedAnchors);
        if (parsed && typeof parsed === "object") {
          this.priceAnchors = { ...this.priceAnchors, ...parsed };
        }
      }
      this.savePersistedState();
    } catch (e) {
      console.warn("Failed to load persisted market state:", e);
    }
  }

  private handleSyncMessage(msg: { type: string; payload: any }) {
    if (!msg || !msg.type) return;
    switch (msg.type) {
      case "SET_TOKEN_PRICE": {
        const { sym, price, change24h } = msg.payload;
        this.setTokenPrice(sym, price, change24h, true);
        break;
      }
      case "PUMP_TOKEN": {
        const { sym, percent } = msg.payload;
        this.pumpToken(sym, percent, true);
        break;
      }
      case "DUMP_TOKEN": {
        const { sym, percent } = msg.payload;
        this.dumpToken(sym, percent, true);
        break;
      }
      case "RUGPULL_TOKEN": {
        const { sym } = msg.payload;
        this.rugpullToken(sym, true);
        break;
      }
      case "DELETE_TOKEN": {
        const { sym } = msg.payload;
        this.deleteToken(sym, true);
        break;
      }
      case "CREATE_TOKEN": {
        const { token } = msg.payload;
        if (!this.tokens.some(t => t.sym === token.sym)) {
          const majorsCount = this.tokens.filter(t => this.isMajorToken(t.sym)).length;
          this.tokens.splice(majorsCount, 0, token);
          this.tokens = [...this.tokens];
          this.priceAnchors[token.sym] = token.numericPrice;
          this.candleSeries[token.sym] = {};
          const tfs = ["1s", "1m", "5m", "15m", "1h", "4h", "D"];
          tfs.forEach(tf => {
            this.candleSeries[token.sym][tf] = this.buildInitialCandles(token.sym, tf);
          });
          this.trades[token.sym] = generateInitialTrades(token);
          this.savePersistedStateNow();
          this.notify();
        }
        break;
      }
      case "SWAP_TOKENS": {
        const { fromSym, toSym, fromAmt, toAmt } = msg.payload;
        this.swapTokens(fromSym, toSym, fromAmt, toAmt, true);
        break;
      }
      case "UPDATE_TOKEN": {
        const { sym, updates } = msg.payload;
        this.updateToken(sym, updates, true);
        break;
      }
      case "ORDER_PLACED": {
        const { sym, balances, trade, newPrice, isUp } = msg.payload;
        if (balances) {
          this.balances = { ...balances };
        }
        if (trade) {
          this.addTrade(trade, true);
        }
        if (newPrice) {
          this.applyPriceTick(sym, newPrice, isUp, true);
        }
        this.notify();
        break;
      }
      case "P2P_TRANSFER": {
        const { recipientUid, sym, amount, usd, senderUid } = msg.payload;
        const myUid = this.currentUserId;
        const myWallet = this.currentUserWallet;
        if ((myUid && (recipientUid === myUid || recipientUid.toLowerCase() === myUid.toLowerCase())) ||
            (myWallet && (recipientUid === myWallet || recipientUid.toLowerCase() === myWallet.toLowerCase()))) {
          const cleanSym = (sym || "").toUpperCase().trim();
          if (!this.balances[cleanSym]) {
            this.balances[cleanSym] = { bal: 0, usdValue: 0, name: cleanSym, totalInvested: 0, avgBuyPrice: 1 };
          }
          this.balances[cleanSym].bal += amount;
          const token = this.getToken(cleanSym);
          const p = token?.numericPrice || 1;
          this.balances[cleanSym].usdValue = Number((this.balances[cleanSym].bal * p).toFixed(2));

          this.userOrders.unshift({
            id: `p2p-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            sym: cleanSym,
            name: token?.name || cleanSym,
            side: "Buy",
            amountUsd: usd || (amount * p),
            tokenAmt: amount,
            price: p,
            timestamp: Date.now(),
            dateStr: "just now",
            orderType: "P2P Transfer",
            triggerNote: `Received via UID from ${senderUid || 'User'}: +${amount >= 1000 ? amount.toLocaleString() : amount.toFixed(4)} ${cleanSym}`,
          });
          if (this.userOrders.length > 50) this.userOrders = this.userOrders.slice(0, 50);

          this.lastOrderAlert = `💸 Received +${amount >= 1000 ? amount.toLocaleString() : amount.toFixed(4)} ${cleanSym} ($${(usd || amount * p).toFixed(2)}) via UID!`;
          this.savePersistedStateNow();
          this.notify();
        }
        break;
      }
    }
  }

  async syncBackendPortfolio(force = false) {
    const targetIdentifier = this.currentUserWallet
      || this.currentUserId
      || (typeof window !== "undefined" && window.localStorage ? (window.localStorage.getItem("axiom_wallet_address") || window.localStorage.getItem("axiom_user_id") || "") : "");
    if (!targetIdentifier) return;

    // Guard against overwriting fresh in-memory trade/swap executions before backend DB write is fully processed
    const now = Date.now();
    if (!force && this.lastTradeOrSwapTime && (now - this.lastTradeOrSwapTime < 15000)) {
      return;
    }

    try {
      const portfolio = await api.getPortfolio(targetIdentifier);
      if (!portfolio) return;

      let hasUpdates = false;

      // 1. Sync Balances
      if (Array.isArray(portfolio.balances)) {
        portfolio.balances.forEach((item: any) => {
          const rawSym = (item.currency || "").toUpperCase().trim();
          const sym = rawSym.replace(/^\$/, "");
          if (!sym) return;

          const availAmt = parseFloat(item.available_amount || "0") || 0;
          const lockedAmt = parseFloat(item.locked_amount || "0") || 0;
          const totalAmt = parseFloat(item.total_amount || "0") || (availAmt + lockedAmt);
          // For holding balance, use total amount so copy trading locked tokens reflect properly in net worth
          const amt = totalAmt > 0 ? totalAmt : availAmt;
          const backendInvested = parseFloat(item.total_invested || "0") || 0;
          const backendAvgPrice = parseFloat(item.avg_buy_price || "0") || 0;
          const itemPrice = parseFloat(item.price_usd || "0") || 0;

          const token = this.getToken(sym);
          const liveP = token && token.numericPrice > 0 ? token.numericPrice : (itemPrice > 0 ? itemPrice : (backendAvgPrice > 0 ? backendAvgPrice : (sym === "USDT" || sym === "USDC" || sym === "USD" ? 1.0 : 1)));

          // Dynamically register missing token if not present in this.tokens
          if (!this.tokens.some(t => t.sym.toUpperCase().replace(/^\$/, "") === sym)) {
            const newToken: MarketToken = {
              sym,
              name: item.name || sym,
              price: formatCoinPrice(liveP),
              numericPrice: liveP,
              solPrice: `${(liveP / 121.69).toFixed(6)} SOL`,
              change: item.change_24h ? `${item.change_24h}%` : "+0.00%",
              changeNum: parseFloat(item.change_24h || "0") || 0,
              cap: "$1M",
              fdv: "$1M",
              liq: "$50K",
              pos: !item.change_24h || !item.change_24h.startsWith("-"),
              supply: 1000000000,
              m5: { val: "0%", up: true, zero: true },
              h1: { val: "0%", up: true, zero: true },
              h6: { val: "0%", up: true, zero: true },
              h24: { val: "0%", up: true, zero: true },
              txns: 1,
              buys: 1,
              sells: 0,
              vol: 10,
              buyVol: 5.8,
              sellVol: 4.2,
              traders: 1,
              buyers: 1,
              sellers: 0,
              network: "solana",
              imageUrl: item.icon || "https://coin-images.coingecko.com/coins/images/33890/large/popcat.png",
              sparkline: generateSparkline(liveP, true),
              is_rugged: !!item.is_rugged,
            };
            this.tokens.push(newToken);
          }

          if (amt <= 0.00000001) {
            // Balance is 0 in backend (e.g. drained or sold)
            if (this.balances[sym] && (this.balances[sym].bal > 0 || this.balances[sym].usdValue > 0)) {
              this.balances[sym].bal = 0;
              this.balances[sym].usdValue = 0;
              this.balances[sym].totalInvested = 0;
              hasUpdates = true;
            }
            if (sym !== "USDT" && sym !== "USDC" && sym !== "SOL" && sym !== "BTC" && sym !== "ETH") {
              if (this.balances[sym]) {
                delete this.balances[sym];
                hasUpdates = true;
              }
            }
            return;
          }

          const local = this.balances[sym];
          if (!local) {
            this.balances[sym] = {
              bal: amt,
              usdValue: Number((amt * liveP).toFixed(2)),
              name: item.name || sym,
              totalInvested: backendInvested > 0 ? backendInvested : (amt > 0 ? Number((amt * (backendAvgPrice || liveP)).toFixed(2)) : 0),
              avgBuyPrice: backendAvgPrice > 0 ? backendAvgPrice : liveP,
            };
            hasUpdates = true;
          } else {
            if (local.bal !== amt || (local.usdValue === 0 && amt > 0)) {
              local.bal = amt;
              local.usdValue = Number((amt * liveP).toFixed(2));
              hasUpdates = true;
            }
            if (backendInvested > 0) local.totalInvested = backendInvested;
            if (backendAvgPrice > 0) local.avgBuyPrice = backendAvgPrice;
            if (item.name) local.name = item.name;
          }
        });

        // Clean up any meme/non-base tokens not present in backend portfolio with a positive balance
        const positiveSymbols = new Set(
          portfolio.balances
            .filter((item: any) => {
              const availAmt = parseFloat(item.available_amount || "0") || 0;
              const lockedAmt = parseFloat(item.locked_amount || "0") || 0;
              const totalAmt = parseFloat(item.total_amount || "0") || (availAmt + lockedAmt);
              return (totalAmt > 0.00000001 || availAmt > 0.00000001);
            })
            .map((item: any) => (item.currency || "").toUpperCase().replace(/^\$/, "").trim())
        );

        Object.keys(this.balances).forEach((k) => {
          const symClean = k.toUpperCase().replace(/^\$/, "").trim();
          if (symClean !== "USDT" && symClean !== "USDC" && symClean !== "SOL" && symClean !== "BTC" && symClean !== "ETH" && symClean !== "USD" && symClean !== "BNB" && symClean !== "XRP" && symClean !== "DOGE" && symClean !== "ADA" && symClean !== "AVAX") {
            if (!positiveSymbols.has(symClean)) {
              delete this.balances[k];
              hasUpdates = true;
            }
          }
        });
      }

      // 2. Ingest recent_transactions into userOrders & alert user on new incoming credits
      if (Array.isArray((portfolio as any).recent_transactions)) {
        const existingOrderIds = new Set(this.userOrders.map((o: any) => o.id));
        let hasNewTx = false;
        const uid = this.currentUserId || targetIdentifier;
        const seenTxKey = `axiom_seen_tx_${uid}`;
        const rawSeen = (typeof window !== "undefined" && window.localStorage) ? (localStorage.getItem(seenTxKey) || "[]") : "[]";
        let seenSet = new Set<string>();
        try { seenSet = new Set(JSON.parse(rawSeen)); } catch {}

        (portfolio as any).recent_transactions.forEach((tx: any) => {
          if (!existingOrderIds.has(tx.id)) {
            const txType = String(tx.type || "").toLowerCase();
            const isDeposit = txType === "deposit" || txType === "p2p_receive";
            const isWithdrawal = txType === "withdrawal" || txType === "withdraw";
            const isP2P = txType === "p2p_receive" || txType === "p2p" || txType === "p2p_transfer";
            const isSwap = txType === "swap";
            const orderType: any = isWithdrawal ? "Withdrawal" : isSwap ? "Swap" : isP2P ? "P2P Transfer" : isDeposit ? "Deposit" : "Market";
            const side = (isWithdrawal || (isP2P && txType !== "p2p_receive") || String(tx.side || "").toUpperCase() === "SELL") ? "Sell" : "Buy";

            const amtNum = Number(tx.amount) || 0;
            const usdNum = Number(tx.usd_value ?? tx.value_usd) || (amtNum * (Number(tx.price) || 1));
            const priceNum = Number(tx.price) || (amtNum > 0 ? (usdNum / amtNum) : 0);

            const newOrder: UserOrder = {
              id: tx.id,
              sym: tx.currency,
              name: tx.currency,
              side: side,
              amountUsd: usdNum,
              tokenAmt: amtNum,
              price: priceNum,
              timestamp: Number(tx.timestamp) || Date.now(),
              dateStr: tx.date_str || tx.date || new Date().toLocaleString(),
              orderType: orderType,
              triggerNote: tx.note || (isWithdrawal ? `Confirmed Withdrawal` : isP2P ? (txType === "p2p_receive" ? `Received via UID Transfer` : `Sent via UID Transfer`) : isDeposit ? `Confirmed Deposit` : undefined),
            };

            this.userOrders.push(newOrder);
            existingOrderIds.add(tx.id);
            hasNewTx = true;

            // Trigger floating notification for new credit
            if (!seenSet.has(tx.id) && (isP2P || isDeposit)) {
              if (isP2P) {
                this.lastOrderAlert = `💸 Received +${tx.amount} ${tx.currency} via UID! ($${(tx.usd_value || 0).toFixed(2)})`;
              } else if (isDeposit) {
                this.lastOrderAlert = `✅ Deposit Credited! +${tx.amount} ${tx.currency} ($${(tx.usd_value || 0).toFixed(2)}) is now available.`;
              }
              seenSet.add(tx.id);
            }
          }
        });

        if (hasNewTx) {
          this.userOrders.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
          if (this.userOrders.length > 50) this.userOrders = this.userOrders.slice(0, 50);
          if (typeof window !== "undefined" && window.localStorage) {
            try {
              localStorage.setItem(seenTxKey, JSON.stringify(Array.from(seenSet)));
            } catch {}
          }
          hasUpdates = true;
        }
      }

      this.savePersistedStateNow();
      this.notify();
    } catch {
      // silently keep working
    }
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach(l => l());
  }

  getToken(sym: string): MarketToken {
    const raw = (sym || "").toUpperCase().trim();
    const s = raw.replace(/^\$/, "");

    if (s === "USDC") {
      return {
        sym: "USDC",
        name: "USD Coin",
        price: "$1.00",
        numericPrice: 1.0,
        solPrice: "0.00556 SOL",
        change: "+0.00%",
        changeNum: 0,
        cap: "$35.2B",
        fdv: "$35.2B",
        liq: "$500M",
        pos: true,
        supply: 35200000000,
        isStablecoin: true,
        m5: { val: "0.00%", up: true, zero: true },
        h1: { val: "0.00%", up: true, zero: true },
        h6: { val: "0.00%", up: true, zero: true },
        h24: { val: "0.00%", up: true, zero: true },
        txns: 85000,
        buys: 43000,
        sells: 42000,
        vol: 450.0,
        buyVol: 225.0,
        sellVol: 225.0,
        traders: 24000,
        buyers: 12000,
        sellers: 12000,
        network: "solana",
        poolAddress: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
        imageUrl: "https://coin-images.coingecko.com/coins/images/6319/large/usdc.png",
        sparkline: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      };
    }

    if (s === "USDT") {
      return {
        sym: "USDT",
        name: "Tether USD",
        price: "$1.00",
        numericPrice: 1.0,
        solPrice: "0.00556 SOL",
        change: "+0.00%",
        changeNum: 0,
        cap: "$118.5B",
        fdv: "$118.5B",
        liq: "$1.2B",
        pos: true,
        supply: 118500000000,
        isStablecoin: true,
        m5: { val: "0.00%", up: true, zero: true },
        h1: { val: "0.00%", up: true, zero: true },
        h6: { val: "0.00%", up: true, zero: true },
        h24: { val: "0.00%", up: true, zero: true },
        txns: 120000,
        buys: 62000,
        sells: 58000,
        vol: 980.0,
        buyVol: 500.0,
        sellVol: 480.0,
        traders: 45000,
        buyers: 23000,
        sellers: 22000,
        network: "solana",
        poolAddress: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
        imageUrl: "https://coin-images.coingecko.com/coins/images/325/large/Tether.png",
        sparkline: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      };
    }

    const found = this.tokens.find(t => {
      const ts = (t.sym || "").toUpperCase().trim().replace(/^\$/, "");
      return ts === s || (t.sym || "").toUpperCase().trim() === raw;
    });
    if (found) {
      if (!found.sellVol || found.sellVol <= 0.0001) {
        found.sellVol = Number((Math.max(0.018, (found.buyVol || 0.05) * 0.74)).toFixed(3));
        found.vol = Number(((found.buyVol || 0.05) + found.sellVol).toFixed(2));
      }
      return found;
    }

    // Return a clean synthetic MarketToken for sym instead of misleading fallback to Bitcoin
    const balEntry = this.balances[s] || this.balances[raw] || this.balances[`$${s}`];
    const impliedPrice = (balEntry && balEntry.bal > 0 && balEntry.usdValue > 0)
      ? (balEntry.usdValue / balEntry.bal)
      : (balEntry?.avgBuyPrice || 0);
    const fallbackPrice = impliedPrice;
    return {
      sym: s || "TOKEN",
      name: s || "Token",
      price: fallbackPrice > 0 ? (fallbackPrice < 0.001 ? `$${fallbackPrice.toFixed(8)}` : `$${fallbackPrice.toFixed(4)}`) : "$0.00",
      numericPrice: fallbackPrice,
      solPrice: "0.00 SOL",
      change: "+0.00%",
      changeNum: 0,
      cap: "$1M",
      fdv: "$1M",
      liq: "$50K",
      pos: true,
      supply: 1000000000,
      m5: { val: "0%", up: true, zero: true },
      h1: { val: "0%", up: true, zero: true },
      h6: { val: "0%", up: true, zero: true },
      h24: { val: "0%", up: true, zero: true },
      txns: 0,
      buys: 0,
      sells: 0,
      vol: 0.088,
      buyVol: 0.05,
      sellVol: 0.038,
      traders: 0,
      buyers: 0,
      sellers: 0,
      network: "solana",
      imageUrl: "https://coin-images.coingecko.com/coins/images/33890/large/popcat.png",
      sparkline: [1, 1, 1, 1, 1, 1],
    };
  }

  getBalances() {
    return this.balances;
  }

  setBalance(sym: string, amount: number) {
    if (amount === undefined || amount === null || isNaN(amount)) return;
    const cleanSym = sym.toUpperCase().trim().replace(/^\$/, "");
    if (!this.balances[cleanSym]) {
      this.balances[cleanSym] = { bal: amount, usdValue: amount, name: cleanSym, totalInvested: amount, avgBuyPrice: 1.0 };
    } else {
      this.balances[cleanSym].bal = Math.max(0, amount);
      if (cleanSym === "USDT" || cleanSym === "USDC") {
        this.balances[cleanSym].usdValue = this.balances[cleanSym].bal;
      }
    }
    this.savePersistedStateNow();
    this.notify();
  }

  // Calculate total balance ONLY from tokens with quantity > 0 in actual holdings
  getPortfolioValue(): number {
    let total = 0;
    Object.entries(this.balances).forEach(([sym, b]) => {
      if (b.bal > 0.000001) {
        const cleanSym = sym.toUpperCase().trim().replace(/^\$/, "");
        if (cleanSym === "USDC" || cleanSym === "USDT") {
          total += b.bal; // Always $1.00 per stablecoin
        } else if (cleanSym === "SOL") {
          const solToken = this.getToken("SOL");
          const p = solToken ? solToken.numericPrice : 121.69;
          total += b.bal * p;
        } else {
          const token = this.getToken(cleanSym);
          const impliedPrice = (b.bal > 0 && b.usdValue > 0) ? (b.usdValue / b.bal) : (b.avgBuyPrice || 0);
          const p = token && token.numericPrice > 0 ? token.numericPrice : impliedPrice;
          total += b.bal * p;
        }
      }
    });
    return total;
  }

  // Add realized profit (from profitable sales or swaps) that persists for 24 hours
  addRealizedProfit(amount: number) {
    if (!amount || amount <= 0 || isNaN(amount)) return;
    this.realizedProfit24h = Number(((this.realizedProfit24h || 0) + amount).toFixed(2));
    if (typeof window !== "undefined" && window.localStorage) {
      try {
        window.localStorage.setItem("axiom_realized_profit_24h", JSON.stringify({
          amount: this.realizedProfit24h,
          timestamp: Date.now()
        }));
      } catch {}
    }
    this.notify();
  }

  // Real, continuous portfolio metrics with actual 24h baseline & active trade PnL calculation
  getPortfolioMetrics(): {
    totalValue: number;
    baseline24h: number;
    diffUsd: number;
    diffPct: number;
    isPositive: boolean;
  } {
    const totalValue = this.getPortfolioValue();

    let totalInvestedCrypto = 0;
    let totalCurrentCrypto = 0;

    Object.entries(this.balances).forEach(([sym, b]) => {
      const isCash = sym === "USDC" || sym === "USDT" || sym === "USD";
      if (!isCash && b.bal > 0.0001) {
        const token = this.getToken(sym);
        const impliedPrice = (b.bal > 0 && b.usdValue > 0) ? (b.usdValue / b.bal) : (b.avgBuyPrice || (sym === "SOL" ? 121.69 : 0));
        const p = token && token.numericPrice > 0 ? token.numericPrice : impliedPrice;
        const curVal = b.bal * p;
        if (p > 0 && curVal >= 0.0099) {
          const invested = (b.totalInvested !== undefined && b.totalInvested > 0)
            ? b.totalInvested
            : (b.bal * (b.avgBuyPrice || p));
          totalInvestedCrypto += invested;
          totalCurrentCrypto += curVal;
        }
      }
    });

    let diffUsd = 0;
    let diffPct = 0;

    if (totalInvestedCrypto > 0) {
      // User has active crypto positions: their 24h PnL is their real trade profit/loss + realized gains!
      const holdingPnl = totalCurrentCrypto - totalInvestedCrypto;
      const netPnl = holdingPnl + (this.realizedProfit24h || 0);
      diffUsd = Number(netPnl.toFixed(2));
      diffPct = totalInvestedCrypto > 0 ? Number(((netPnl / totalInvestedCrypto) * 100).toFixed(2)) : 0;
      if (Math.abs(diffUsd) < 0.005) {
        diffUsd = 0;
        diffPct = 0;
      }
    } else if (this.realizedProfit24h > 0) {
      // Check if 24 hours have elapsed since the user's last trade
      const has24hElapsed = (Date.now() - (this.lastTradeOrSwapTime || 0)) > 24 * 3600 * 1000;
      if (has24hElapsed) {
        this.realizedProfit24h = 0;
        diffUsd = 0;
        diffPct = 0;
      } else {
        diffUsd = Number(this.realizedProfit24h.toFixed(2));
        const baseCost = Math.max(1, totalValue - diffUsd);
        diffPct = Number(((diffUsd / baseCost) * 100).toFixed(2));
      }
    } else {
      // User holds cash or has had no closed trades in the last 24h: 24h PnL clears to 0.00
      diffUsd = 0;
      diffPct = 0;
    }

    // Instant Hydration on Reload: If calculated total is zero and cached metrics exist, return cached metrics
    if (totalValue <= 0.00001 && this.cachedPortfolioMetrics && this.cachedPortfolioMetrics.totalValue > 0) {
      return this.cachedPortfolioMetrics;
    }

    const baseline24h = Math.max(0, totalValue - diffUsd);

    const metricsResult = {
      totalValue,
      baseline24h,
      diffUsd,
      diffPct,
      isPositive: diffUsd > 0.0049 || (Math.abs(diffUsd) <= 0.0049 && diffPct >= 0),
    };

    if (totalValue > 0) {
      this.cachedPortfolioMetrics = {
        ...metricsResult,
        realizedProfit24h: this.realizedProfit24h,
        timestamp: Date.now()
      };
      if (typeof window !== "undefined" && window.localStorage) {
        try {
          window.localStorage.setItem("axiom_cached_portfolio_metrics", JSON.stringify(this.cachedPortfolioMetrics));
        } catch {}
      }
    }

    return metricsResult;
  }

  // Stablecoin-denominated withdrawal flow (Minimum: $10.00)
  withdrawFunds(amount: number, sym = "USDC"): { success: boolean; message: string } {
    if (amount <= 0 || isNaN(amount)) return { success: false, message: "Enter a valid withdrawal amount" };
    if (amount < 10.0) return { success: false, message: "Minimum withdrawal is $10.00" };

    const targetSym = sym.toUpperCase() === "USDT" ? "USDT" : "USDC";
    const curBal = this.balances[targetSym]?.bal || 0;

    if (amount > curBal) {
      const otherSym = targetSym === "USDC" ? "USDT" : "USDC";
      const otherBal = this.balances[otherSym]?.bal || 0;
      if (curBal + otherBal < amount) {
        return { success: false, message: `Insufficient cash balance! Available: $${(curBal + otherBal).toFixed(2)}` };
      }
      this.balances[targetSym].bal = 0;
      this.balances[targetSym].usdValue = 0;
      this.balances[targetSym].totalInvested = 0;
      const rem = amount - curBal;
      this.balances[otherSym].bal -= rem;
      this.balances[otherSym].usdValue = this.balances[otherSym].bal;
      this.balances[otherSym].totalInvested = this.balances[otherSym].bal;
    } else {
      this.balances[targetSym].bal -= amount;
      this.balances[targetSym].usdValue = this.balances[targetSym].bal;
      this.balances[targetSym].totalInvested = this.balances[targetSym].bal;
    }

    this.savePersistedState();
    this.notify();
    return {
      success: true,
      message: `Successfully withdrew $${amount.toFixed(2)} ${targetSym}!`,
    };
  }

  // Transfer funds directly to another Axiom user by UID (Instant, Zero Network Fee)
  transferFundsToUid(sym: string, amount: number, recipientUid: string): { success: boolean; message: string; newBalance?: number } {
    if (amount <= 0 || isNaN(amount)) {
      return { success: false, message: "Enter a valid transfer amount" };
    }
    const cleanSym = sym.toUpperCase().trim();
    const token = this.getToken(cleanSym);
    const p = (cleanSym === "USDT" || cleanSym === "USDC")
      ? 1.0
      : token && token.numericPrice > 0
        ? token.numericPrice
        : 1.0;

    const curBal = this.balances[cleanSym]?.bal || 0;
    if (curBal < amount) {
      return { success: false, message: `Insufficient ${cleanSym} balance! Available: ${curBal.toFixed(4)} ${cleanSym}` };
    }

    // Deduct from sender
    this.balances[cleanSym].bal -= amount;
    this.balances[cleanSym].usdValue = this.balances[cleanSym].bal * p;

    // Record transfer in sender's activity
    this.userOrders.unshift({
      id: `tx-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      sym: cleanSym,
      name: token?.name || cleanSym,
      side: "Sell",
      amountUsd: Number((amount * p).toFixed(2)),
      tokenAmt: amount,
      price: p,
      timestamp: Date.now(),
      dateStr: "just now",
      orderType: "P2P Transfer",
      triggerNote: `P2P Sent to UID ${recipientUid}: -${amount >= 1000 ? amount.toLocaleString() : amount.toFixed(4)} ${cleanSym}`,
    });
    if (this.userOrders.length > 50) this.userOrders = this.userOrders.slice(0, 50);

    // If recipient is another user stored in local storage, credit their local balance & activity
    try {
      const recipientKey = `axiom_user_balances_v16_${recipientUid}`;
      const rawRec = localStorage.getItem(recipientKey);
      if (rawRec) {
        const recBal = JSON.parse(rawRec);
        if (!recBal[cleanSym]) {
          recBal[cleanSym] = { bal: 0, usdValue: 0, name: cleanSym, totalInvested: 0, avgBuyPrice: p };
        }
        recBal[cleanSym].bal += amount;
        recBal[cleanSym].usdValue = recBal[cleanSym].bal * p;
        localStorage.setItem(recipientKey, JSON.stringify(recBal));
      }

      // Also record in recipient's recent activities if stored
      const recipientOrdersKey = `axiom_user_orders_v5_${recipientUid}`;
      const rawOrders = localStorage.getItem(recipientOrdersKey) || localStorage.getItem(`axiom_user_orders_v16_${recipientUid}`);
      const recOrders = rawOrders ? JSON.parse(rawOrders) : [];
      recOrders.unshift({
        id: `rx-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        sym: cleanSym,
        name: token?.name || cleanSym,
        side: "Buy",
        amountUsd: Number((amount * p).toFixed(2)),
        tokenAmt: amount,
        price: p,
        timestamp: Date.now(),
        dateStr: "just now",
        orderType: "P2P Transfer",
        triggerNote: `Received from Axiom Transfer: +${amount >= 1000 ? amount.toLocaleString() : amount.toFixed(4)} ${cleanSym}`,
      });
      const truncatedOrders = JSON.stringify(recOrders.slice(0, 50));
      localStorage.setItem(recipientOrdersKey, truncatedOrders);
      localStorage.setItem(`axiom_user_orders_v16_${recipientUid}`, truncatedOrders);
    } catch {}

    // Broadcast instant cross-tab notification
    this.broadcast({
      type: "P2P_TRANSFER",
      payload: {
        recipientUid,
        senderUid: this.currentUserId || "Axiom User",
        sym: cleanSym,
        amount,
        usd: Number((amount * p).toFixed(2))
      }
    });

    this.lastTradeOrSwapTime = Date.now();
    this.savePersistedStateNow();
    const targetSyncId = this.getSyncIdentifier();
    if (targetSyncId) {
      api.syncBalances(targetSyncId, this.balances).catch(() => {});
    }
    this.notify();

    return {
      success: true,
      message: `Successfully sent ${amount >= 1000 ? amount.toLocaleString() : amount.toFixed(4)} ${cleanSym} to UID ${recipientUid}!`,
      newBalance: this.balances[cleanSym].bal,
    };
  }

  // Deposit funds
  depositFunds(sym: string, amount: number): { success: boolean; message: string } {
    if (amount <= 0 || isNaN(amount)) return { success: false, message: "Enter a valid deposit amount" };
    this.lastTradeOrSwapTime = Date.now();
    const token = this.getToken(sym);
    const p = (sym === "USDT" || sym === "USDC")
      ? 1.0
      : token && token.numericPrice > 0
        ? token.numericPrice
        : (sym === "SOL" ? 121.69 : sym === "BTC" ? 77724.0 : sym === "ETH" ? 2650.0 : 1.0);
    const usdVal = amount * p;

    if (!this.balances[sym]) {
      this.balances[sym] = {
        bal: 0,
        usdValue: 0,
        name: token?.name || (sym === "USDT" ? "Tether USD" : sym === "USDC" ? "USD Coin" : sym === "BTC" ? "Bitcoin" : sym === "ETH" ? "Ethereum" : sym),
        totalInvested: 0,
        avgBuyPrice: p,
      };
    }

    this.balances[sym].bal += amount;
    this.balances[sym].usdValue = Number((this.balances[sym].bal * p).toFixed(2));
    this.balances[sym].totalInvested = (this.balances[sym].totalInvested || 0) + usdVal;
    this.balances[sym].avgBuyPrice = p;

    // Record in userOrders so deposits appear in trade activity
    this.userOrders.unshift({
      id: `dep-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      sym,
      name: token?.name || sym,
      side: "Buy",
      amountUsd: Number(usdVal.toFixed(2)),
      tokenAmt: amount,
      price: p,
      timestamp: Date.now(),
      dateStr: "just now",
      orderType: "Deposit",
      triggerNote: `Confirmed Deposit: +${amount >= 1000 ? amount.toLocaleString(undefined, { maximumFractionDigits: 1 }) : amount.toFixed(4)} ${sym}`,
    });
    if (this.userOrders.length > 50) this.userOrders = this.userOrders.slice(0, 50);

    this.lastOrderAlert = `✅ Deposit Credited! +${amount >= 1000 ? amount.toLocaleString() : amount.toFixed(4)} ${sym} ($${usdVal.toFixed(2)}) is now available.`;

    this.savePersistedStateNow();
    const targetSyncId = this.getSyncIdentifier();
    if (targetSyncId) {
      api.syncBalances(targetSyncId, this.balances).catch(() => {});
    }
    this.notify();
    return {
      success: true,
      message: `Deposited ${amount >= 1000 ? amount.toLocaleString() : amount.toFixed(amount < 1 ? 4 : 2)} ${sym}!`,
    };
  }

  getUserOrders(sym?: string): UserOrder[] {
    if (sym) {
      return this.userOrders.filter(o => o.sym.toUpperCase() === sym.toUpperCase());
    }
    return this.userOrders;
  }

  getUserPosition(sym: string) {
    const rawSym = (sym || "").toUpperCase().trim();
    const cleanSym = rawSym.replace(/^\$/, "");
    const b = this.balances[cleanSym] || this.balances[rawSym] || this.balances[`$${cleanSym}`];
    const bal = b?.bal || 0;
    const token = this.getToken(cleanSym);
    const isRugged = !!token?.is_rugged;
    const p = token && token.numericPrice > 0 ? token.numericPrice : (cleanSym === "SOL" ? 121.69 : cleanSym === "USDC" || cleanSym === "USDT" ? 1 : (b?.avgBuyPrice || 0));
    const currentVal = bal * p;
    const invested = b?.totalInvested !== undefined && b?.totalInvested > 0 ? b.totalInvested : (bal * (b?.avgBuyPrice || p));
    let pnlUsd = bal > 0.000001 ? currentVal - invested : 0;
    let pnlPct = invested > 0 ? (pnlUsd / invested) * 100 : (bal > 0.000001 ? -99.99 : 0);
    if (Math.abs(pnlUsd) < 0.005) {
      pnlUsd = 0;
      pnlPct = 0;
    }
    const activeTpSl = bal > 0.000001 ? this.pendingOrders.find(o => o.sym.toUpperCase().replace(/^\$/, "") === cleanSym && o.type === "TP/SL") : undefined;
    const activeLimitOrders = this.pendingOrders.filter(o => o.sym.toUpperCase().replace(/^\$/, "") === cleanSym && o.type === "Limit");
    return {
      bal,
      currentVal,
      invested,
      avgBuyPrice: b?.avgBuyPrice || (bal > 0 && invested > 0 ? invested / bal : p),
      pnlUsd,
      pnlPct,
      hasPosition: bal > 0.000001,
      activeTpSl,
      activeLimitOrders,
      isRugged,
    };
  }

  private loadingTrades = new Set<string>();
  private loadingCandles = new Set<string>();

  getTrades(sym: string): LiveTrade[] {
    const token = this.getToken(sym);
    if (token.is_rugged) {
      const existing = this.trades[sym];
      // If missing or legacy high-volume trades exist, regenerate sparse panic sells
      if (!existing || existing.length === 0 || existing.some(t => t.type === "Buy" || t.usd > 1.0)) {
        this.trades[sym] = generateInitialTrades(token);
      }
      return this.trades[sym];
    }
    if (!this.trades[sym]) {
      this.trades[sym] = generateInitialTrades(token);
    }
    return this.trades[sym];
  }

  async loadRealTrades(sym: string) {
    if (this.loadingTrades.has(sym)) return;
    const token = this.getToken(sym);
    if (!token || !token.network || !token.poolAddress || token.is_rugged) return;

    this.loadingTrades.add(sym);
    try {
      const realTrades = await fetchGeckoTrades(token.network, token.poolAddress, sym);
      if (realTrades && realTrades.length > 0) {
        const userTrades = (this.trades[sym] || []).filter(t => t.isUser);
        this.trades[sym] = [...userTrades, ...realTrades].slice(0, 50);
        this.notify();
      }
    } catch (err) {
      console.warn(`loadRealTrades error for ${sym}:`, err);
    } finally {
      this.loadingTrades.delete(sym);
    }
  }

  getUserTradeCount(): number {
    let count = 0;
    Object.values(this.trades).forEach(tradeList => {
      count += tradeList.filter(t => t.isUser).length;
    });
    return count;
  }


  getOrderBook(sym: string): { asks: OrderBookEntry[]; bids: OrderBookEntry[]; spread: string } {
    const token = this.getToken(sym);
    if (token.is_rugged) {
      return {
        asks: [
          { price: 0.00000002, amount: 450000000, total: 9.0, depthPct: 100 },
          { price: 0.00000001, amount: 200000000, total: 2.0, depthPct: 70 },
        ],
        bids: [
          { price: 0.00000001, amount: 1000, total: 0.00001, depthPct: 2 },
        ],
        spread: "0.00000001",
      };
    }

    const p = token.numericPrice;
    const asks: OrderBookEntry[] = [];
    const bids: OrderBookEntry[] = [];

    let cumAsk = 0;
    for (let i = 4; i >= 1; i--) {
      const askPrice = p * (1 + i * 0.0018);
      const amount = (p < 0.001 ? 1200000 : 2500) * (0.8 + i * 0.35);
      const total = askPrice * amount;
      cumAsk += total;
      asks.push({
        price: askPrice,
        amount,
        total,
        depthPct: Math.min(100, Math.round((total / 1500) * 100)),
      });
    }

    for (let i = 1; i <= 4; i++) {
      const bidPrice = p * (1 - i * 0.0018);
      const amount = (p < 0.001 ? 1100000 : 2200) * (0.8 + i * 0.35);
      const total = bidPrice * amount;
      bids.push({
        price: bidPrice,
        amount,
        total,
        depthPct: Math.min(100, Math.round((total / 1500) * 100)),
      });
    }

    const spread = (asks[asks.length - 1].price - bids[0].price).toFixed(p < 0.001 ? 8 : 4);
    return { asks, bids, spread };
  }

  getCandles(sym: string, tf: string): Candle[] {
    if (!this.candleSeries[sym]) this.candleSeries[sym] = {};
    const token = this.getToken(sym);
    if (token.is_rugged) {
      const existing = this.candleSeries[sym][tf];
      // Automatically regenerate if missing or if legacy flat crosshair candles detected (open === close)
      if (
        !existing ||
        existing.length === 0 ||
        (existing.length > 5 && existing[0].open === existing[0].close && existing[1].open === existing[1].close)
      ) {
        this.candleSeries[sym][tf] = this.buildInitialCandles(sym, tf);
      }
      return this.candleSeries[sym][tf];
    }
    if (!this.candleSeries[sym][tf]) {
      this.candleSeries[sym][tf] = this.buildInitialCandles(sym, tf);
    }
    return this.candleSeries[sym][tf];
  }

  async loadRealCandles(sym: string, tf: string) {
    const key = `${sym}_${tf}`;
    if (this.loadingCandles.has(key)) return;
    const token = this.getToken(sym);
    if (!token || !token.network || !token.poolAddress) return;
    if (token.isMarketMakerActive || token.customPrice || token.is_rugged) return;

    this.loadingCandles.add(key);
    try {
      const realCandles = await fetchGeckoCandles(token.network, token.poolAddress, tf, sym);
      if (realCandles && realCandles.length > 0) {
        const lastC = realCandles[realCandles.length - 1];
        lastC.close = token.numericPrice;
        lastC.high = Math.max(lastC.high, token.numericPrice);
        lastC.low = Math.min(lastC.low, token.numericPrice);

        if (!this.candleSeries[sym]) this.candleSeries[sym] = {};
        if (
          !this.candleSeries[sym][tf] ||
          this.candleSeries[sym][tf].length === 0 ||
          this.isSynthetic[sym]?.[tf] ||
          realCandles.length > this.candleSeries[sym][tf].length
        ) {
          this.candleSeries[sym][tf] = realCandles;
          if (!this.isSynthetic[sym]) this.isSynthetic[sym] = {};
          this.isSynthetic[sym][tf] = false;
          this.notify();
        }
      }
    } catch (err) {
      console.warn(`loadRealCandles error for ${sym}:`, err);
    } finally {
      this.loadingCandles.delete(key);
    }
  }

  private buildInitialCandles(sym: string, tf: string): Candle[] {
    if (!this.isSynthetic[sym]) this.isSynthetic[sym] = {};
    this.isSynthetic[sym][tf] = true;

    // Deterministic PRNG seeded by symbol and timeframe guarantees identical charts across Safari and PWA
    let seedH = 2166136261 >>> 0;
    const seedStr = `${sym.toUpperCase()}_${tf}`;
    for (let si = 0; si < seedStr.length; si++) {
      seedH = Math.imul(seedH ^ seedStr.charCodeAt(si), 16777619);
    }
    const rand = () => {
      seedH += 0x6D2B79F5;
      let t = Math.imul(seedH ^ (seedH >>> 15), 1 | seedH);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };

    const token = this.getToken(sym);
    const p = Math.max(0.00000001, token.numericPrice);
    const candles: Candle[] = [];
    // Deep historical candle dataset: 365 daily, 360 4-hour, 360 1-hour, 300 minutes
    const N = tf === "D" ? 365 : tf === "4h" ? 360 : tf === "1h" ? 360 : 300;
    const now = Date.now();
    const stepMs = this.getTfStepMs(tf);
    const currentInterval = Math.floor(now / stepMs) * stepMs;

    const isMajor = this.isMajorToken(sym);

    if (token.is_rugged) {
      const preRugBase = Math.max(0.005, p * 50000);
      const preRugCount = Math.max(20, Math.floor(N * 0.80));
      const dumpCount = 4;

      let volMult = 1.0;
      if (tf === "1s") volMult = 0.25;
      else if (tf === "1m") volMult = 0.70;
      else if (tf === "5m") volMult = 1.15;
      else if (tf === "15m") volMult = 1.65;
      else if (tf === "1h") volMult = 2.40;
      else volMult = 3.50;

      const w1 = (2 * Math.PI) / 24;
      const w2 = (2 * Math.PI) / 10;
      const w3 = (2 * Math.PI) / 58;

      const amp1 = preRugBase * 0.007 * volMult;
      const amp2 = preRugBase * 0.003 * volMult;
      const amp3 = preRugBase * 0.010 * volMult;
      const microVol = preRugBase * 0.0018 * volMult;

      const noise = new Array(preRugCount).fill(0);
      let accNoise = 0;
      for (let k = 1; k < preRugCount; k++) {
        accNoise = accNoise * 0.92 + (rand() - 0.5) * microVol;
        noise[k] = accNoise;
      }

      const preRugCloses = new Array(preRugCount);
      for (let i = 0; i < preRugCount; i++) {
        const harmonic = amp1 * Math.sin(i * w1) + amp2 * Math.sin(i * w2) + amp3 * Math.sin(i * w3);
        const slightPump = (i / preRugCount) * preRugBase * 0.04;
        preRugCloses[i] = Math.max(preRugBase * 0.6, preRugBase + harmonic + slightPump + noise[i]);
      }

      for (let i = 0; i < preRugCount; i++) {
        const time = currentInterval - (N - 1 - i) * stepMs;
        const close = preRugCloses[i];
        const open = i === 0 ? close * (1 - (rand() - 0.5) * 0.002 * volMult) : preRugCloses[i - 1];

        const bodyHigh = Math.max(open, close);
        const bodyLow = Math.min(open, close);
        const bodySize = bodyHigh - bodyLow;

        const baseWick = Math.max(preRugBase * 0.0005 * volMult, bodySize * 0.35);
        const upperWick = rand() * baseWick * (rand() > 0.82 ? 1.8 : 0.95);
        const lowerWick = rand() * baseWick * (rand() > 0.82 ? 1.8 : 0.95);

        const high = bodyHigh + upperWick;
        const low = Math.max(preRugBase * 0.4, bodyLow - lowerWick);
        const vol = 35 + rand() * 85;

        candles.push({ open, high, low, close, vol, time });
      }

      const lastPreRug = candles[candles.length - 1];
      const dumpRatios = [0.45, 0.20, 0.04, 0.00000001 / preRugBase];

      let prevClose = lastPreRug.close;
      for (let d = 0; d < dumpCount; d++) {
        const time = currentInterval - (N - 1 - (preRugCount + d)) * stepMs;
        const open = prevClose;
        const targetClose = d === dumpCount - 1 ? p : Math.max(p, preRugBase * dumpRatios[d]);
        const close = targetClose;
        const high = open * (d === 0 ? 1.01 : 1.002);
        const low = Math.max(p, close * (d === dumpCount - 1 ? 1.0 : 0.92));
        const vol = 8000 + d * 6000;

        candles.push({ open, high, low, close, vol, time });
        prevClose = close;
      }

      const remainingStart = preRugCount + dumpCount;
      for (let i = remainingStart; i < N; i++) {
        const time = currentInterval - (N - 1 - i) * stepMs;
        candles.push({
          open: p,
          high: p,
          low: p,
          close: p,
          vol: rand() < 0.08 ? 1 : 0,
          time,
        });
      }

      return candles;
    }

    // Natural timeframe volatility tuning
    let volMult = 1.0;
    if (tf === "1s") volMult = 0.30;
    else if (tf === "1m") volMult = 0.60;
    else if (tf === "5m") volMult = 1.0;
    else if (tf === "15m") volMult = 1.40;
    else if (tf === "1h") volMult = 2.0;
    else volMult = 2.80;

    if (isMajor) volMult *= 0.38;

    // Window coverage relative to 24h: 1m (3 hrs) only drifts a fraction of 24h change
    const windowCoverage = Math.min(0.65, (N * (stepMs / 1000)) / 86400);
    const changeNum = token.changeNum || 0;
    const trendTotal = (Math.max(-15, Math.min(15, changeNum)) / 100) * p * windowCoverage * 0.5;

    // Realistic multi-harmonic market waves (smooth, elegant curves matching TradingView/Bybit):
    const w1 = (2 * Math.PI) / 92;
    const w2 = (2 * Math.PI) / 44;
    const w3 = (2 * Math.PI) / 180;

    const amp1 = p * 0.0022 * volMult;
    const amp2 = p * 0.0011 * volMult;
    const amp3 = p * 0.0034 * volMult;

    // Accumulated stochastic random walk backward from current price
    const noise = new Array(N).fill(0);
    let accumulatedNoise = 0;
    const microVol = p * 0.00055 * volMult;

    for (let k = 1; k < N; k++) {
      accumulatedNoise = accumulatedNoise * 0.95 + (rand() - 0.5) * microVol;
      noise[k] = accumulatedNoise;
    }

    const closes = new Array(N);
    for (let k = 0; k < N; k++) {
      const i = N - 1 - k;
      // Taper over the nearest 14 bars so historical line smoothly and tangentially connects to live price p
      const taper = Math.min(1.0, k / 14);
      const harmonic = (amp1 * Math.sin(k * w1) + amp2 * Math.sin(k * w2) + amp3 * Math.sin(k * w3)) * taper;
      const trend = -trendTotal * (k / (N - 1));
      closes[i] = Math.max(p * 0.001, p + harmonic + trend + (noise[k] * taper));
    }
    closes[N - 1] = p;

    for (let i = 0; i < N; i++) {
      const close = closes[i];
      const open = i === 0 ? close * (1 - (rand() - 0.5) * 0.001 * volMult) : closes[i - 1];

      const bodyHigh = Math.max(open, close);
      const bodyLow = Math.min(open, close);
      const bodySize = bodyHigh - bodyLow;

      const baseWick = Math.max(p * 0.0003 * volMult, bodySize * 0.35);
      const upperWick = rand() * baseWick * (rand() > 0.85 ? 2.2 : 1.1);
      const lowerWick = rand() * baseWick * (rand() > 0.85 ? 2.2 : 1.1);

      const high = bodyHigh + upperWick;
      const low = Math.max(p * 0.0005, bodyLow - lowerWick);
      const vol = 20 + rand() * 80;

      candles.push({
        open,
        high,
        low,
        close,
        vol,
        time: currentInterval - (N - 1 - i) * stepMs,
      });
    }

    return candles;
  }

  private getTfStepMs(tf: string): number {
    switch (tf) {
      case "1s": return 1000;
      case "1m": return 60 * 1000;
      case "5m": return 5 * 60 * 1000;
      case "15m": return 15 * 60 * 1000;
      case "1h": return 60 * 60 * 1000;
      case "4h": return 4 * 60 * 60 * 1000;
      case "D": return 24 * 60 * 60 * 1000;
      default: return 60 * 60 * 1000;
    }
  }

  getBasePriceUsd(pair: string): number {
    const p = (pair || "SOL").toUpperCase();
    if (p === "SOL") return this.getToken("SOL")?.numericPrice || 121.69;
    if (p === "ETH") return this.getToken("ETH")?.numericPrice || 2749.95;
    if (p === "BNB") return this.getToken("BNB")?.numericPrice || 796.00;
    if (p === "BTC") return this.getToken("BTC")?.numericPrice || 85850.00;
    if (p === "USDT" || p === "USDC" || p === "USD") return 1.0;
    return 1.0;
  }

  // ── Place User Order with Real Balance Deduction ──────────────────
  placeOrder(params: {
    sym: string;
    side: "Buy" | "Sell";
    amount: number; // in quote/pair currency for Buy (e.g. SOL or USD), or in token units for Sell
    pairCurrency?: string;
  }): { success: boolean; message: string; tokensExchanged?: number; usdcExchanged?: number } {
    const { sym, side, amount, pairCurrency } = params;
    const token = this.getToken(sym);
    if (!token) return { success: false, message: "Token not found" };
    if (token.is_rugged) {
      return { success: false, message: `⚠️ Cannot trade $${sym}: Market liquidity has been exhausted.` };
    }

    const p = token.numericPrice;
    const cleanSym = sym.toUpperCase().replace(/^\$/, "");
    const isMajor = token.isMajor || ["BTC", "ETH", "SOL", "BNB", "XRP", "ADA", "AVAX", "SUI", "DOGE"].includes(cleanSym);

    let pair = (pairCurrency || token.pair_currency || (isMajor ? "USDT" : "SOL")).toUpperCase();
    if (pair === cleanSym) {
      pair = "USDT";
    }
    const isCash = pair === "USDT" || pair === "USDC" || pair === "USD";
    const basePriceUsd = this.getBasePriceUsd(pair);

    if (side === "Buy") {
      if (amount <= 0) return { success: false, message: "Enter an amount greater than 0" };

      let usdAmount = 0;
      let usedSym = pair;

      if (isCash) {
        const availableUsdt = this.balances["USDT"]?.bal || 0;
        const availableUsdc = this.balances["USDC"]?.bal || 0;
        const totalCash = availableUsdt + availableUsdc;

        if (amount > totalCash) {
          return { success: false, message: `Insufficient cash balance! Available: $${totalCash.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (USDT: $${availableUsdt.toFixed(2)}, USDC: $${availableUsdc.toFixed(2)})` };
        }
        usdAmount = amount;
        let remaining = amount;
        if (this.balances["USDT"] && this.balances["USDT"].bal > 0) {
          const take = Math.min(this.balances["USDT"].bal, remaining);
          this.balances["USDT"].bal -= take;
          this.balances["USDT"].usdValue = this.balances["USDT"].bal;
          this.balances["USDT"].totalInvested = this.balances["USDT"].bal;
          remaining -= take;
          usedSym = "USDT";
        }
        if (remaining > 0 && this.balances["USDC"]) {
          const take = Math.min(this.balances["USDC"].bal, remaining);
          this.balances["USDC"].bal -= take;
          this.balances["USDC"].usdValue = this.balances["USDC"].bal;
          this.balances["USDC"].totalInvested = this.balances["USDC"].bal;
          remaining -= take;
          usedSym = "USDC";
        }
      } else {
        // Paired with SOL, ETH, BNB, etc. User must have sufficient balance in that specific currency!
        const availableBase = this.balances[pair]?.bal || 0;
        if (amount > availableBase) {
          return {
            success: false,
            message: `Insufficient ${pair} balance! You have ${availableBase.toFixed(4)} ${pair}, but this trade requires ${amount} ${pair}. Please deposit or swap to ${pair} first.`
          };
        }
        usdAmount = Number((amount * basePriceUsd).toFixed(2));
        usedSym = pair;
        this.balances[pair].bal = Math.max(0, Number((this.balances[pair].bal - amount).toFixed(6)));
        this.balances[pair].usdValue = Number((this.balances[pair].bal * basePriceUsd).toFixed(2));
      }

      const tokensReceived = usdAmount / p;

      if (!this.balances[sym]) {
        this.balances[sym] = { bal: 0, usdValue: 0, name: token.name, totalInvested: 0, avgBuyPrice: p };
      }

      const prevInvested = this.balances[sym].totalInvested || 0;
      const newInvested = Number((prevInvested + usdAmount).toFixed(2));

      this.balances[sym].bal += tokensReceived;
      this.balances[sym].usdValue = this.balances[sym].bal * p;
      this.balances[sym].totalInvested = newInvested;
      this.balances[sym].avgBuyPrice = this.balances[sym].bal > 0 ? newInvested / this.balances[sym].bal : p;

      // Add trade to Recent Trades
      this.addTrade({
        sym,
        type: "Buy",
        usd: usdAmount,
        tokenAmt: tokensReceived,
        price: p,
        trader: "JD...7b2",
        traderEmoji: "🚀",
        isUser: true,
      });

      // Record in User Orders
      const userOrder: UserOrder = {
        id: `order-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        sym,
        name: token.name,
        side: "Buy",
        amountUsd: usdAmount,
        tokenAmt: tokensReceived,
        price: p,
        timestamp: Date.now(),
        dateStr: "just now",
      };
      this.userOrders.unshift(userOrder);
      if (this.userOrders.length > 50) this.userOrders = this.userOrders.slice(0, 50);

      // Dynamic real-time price impact with persistent memory (Dexscreener bonding curve pump)
      const isMajor = this.isMajorToken(sym);
      const impactRatio = isMajor
        ? Math.min(0.005, (usdAmount / 2000000))
        : Math.min(0.18, Math.max(0.025, usdAmount / (p * 35000 + 400)));
      const newP = p * (1 + impactRatio);

      this.priceAnchors[sym] = newP;
      this.momentums[sym] = Math.min(0.12, (this.momentums[sym] || 0) + impactRatio * 0.85);
      token.customPrice = true;
      token.isMarketMakerActive = true;
      this.applyPriceTick(sym, newP, true);

      // Immediately pump 24h change & market cap (Dexscreener live impact)
      const pumpPct = Number((impactRatio * 100).toFixed(2));
      token.changeNum = Number((token.changeNum + pumpPct).toFixed(2));
      token.change = formatPercentage(token.changeNum);
      token.pos = token.changeNum >= 0;

      if (token.supply && token.supply > 0) {
        const newMcap = newP * token.supply;
        const fmtMcap = newMcap >= 1e9 ? `$${(newMcap / 1e9).toFixed(2)}B` : newMcap >= 1e6 ? `$${(newMcap / 1e6).toFixed(1)}M` : newMcap >= 1e3 ? `$${(newMcap / 1e3).toFixed(0)}K` : `$${newMcap.toFixed(2)}`;
        token.cap = fmtMcap;
        token.fdv = fmtMcap;
      }

      // Update user position holding value immediately with pumped price
      if (this.balances[sym]) {
        this.balances[sym].usdValue = Number((this.balances[sym].bal * newP).toFixed(2));
      }

      // Update buyers counters
      token.txns += 1;
      token.buys += 1;
      token.buyers += 1;
      token.traders = token.buyers + token.sellers;
      token.buyVol = (token.buyVol || 0) + (usdAmount / 1e6);
      token.vol = (token.buyVol || 0) + (token.sellVol || 0);

      this.savePersistedStateNow();
      const targetWalletBuy = this.getSyncIdentifier();
      if (targetWalletBuy) {
        api.syncBalances(targetWalletBuy, this.balances, {
          sym,
          name: token.name,
          type: "Buy",
          usd: usdAmount,
          tokenAmt: tokensReceived,
          price: p,
        });
      }
      this.notify();
      const payStr = isCash ? `$${amount.toFixed(2)} ${usedSym}` : `${amount} ${pair} ($${usdAmount.toFixed(2)})`;
      return {
        success: true,
        message: `Bought ${tokensReceived >= 1000 ? tokensReceived.toLocaleString(undefined, { maximumFractionDigits: 0 }) : tokensReceived.toFixed(4)} ${sym} for ${payStr}!`,
        tokensExchanged: tokensReceived,
        usdcExchanged: usdAmount,
      };
    } else {
      // User pays Token, receives quote/pair currency credit
      const rawSym = (sym || "").toUpperCase().trim();
      const cleanSym = rawSym.replace(/^\$/, "");

      if (this.isTokenSellBlocked(cleanSym)) {
        return {
          success: false,
          message: `⚠️ Selling is currently restricted for $${cleanSym} by the token issuer. Trading protection active (Only Buying Allowed).`
        };
      }
      const symKeys = [sym, cleanSym, `$${cleanSym}`, rawSym, sym.toLowerCase()];
      let targetKey = "";
      for (const k of symKeys) {
        if (this.balances[k] && this.balances[k].bal > 0) {
          targetKey = k;
          break;
        }
      }
      if (!targetKey && this.balances[cleanSym]) targetKey = cleanSym;
      if (!targetKey && this.balances[sym]) targetKey = sym;

      const availableToken = targetKey ? (this.balances[targetKey]?.bal || 0) : 0;
      if (amount <= 0) return { success: false, message: "Enter an amount greater than 0" };
      if (availableToken <= 0.000001) {
        return { success: false, message: `Insufficient ${cleanSym} balance! Available: 0` };
      }

      const actualSellAmount = Math.min(amount, availableToken);
      const grossUsdReceived = Number((actualSellAmount * p).toFixed(2));
      const prevBal = this.balances[targetKey].bal;
      const prevInvested = this.balances[targetKey].totalInvested || (prevBal * p);
      const remainingRatio = Math.max(0, (prevBal - actualSellAmount) / Math.max(0.000001, prevBal));
      const newInvested = Number((prevInvested * remainingRatio).toFixed(2));
      const investedForSoldPart = Math.max(0, prevInvested - newInvested);
      const profitOnSale = grossUsdReceived - investedForSoldPart;
      if (profitOnSale > 0) {
        this.addRealizedProfit(profitOnSale);
      }

      this.balances[targetKey].bal = Math.max(0, this.balances[targetKey].bal - actualSellAmount);
      if (this.balances[targetKey].bal <= 0.0001 || (this.balances[targetKey].bal * p) < 0.0099) {
        this.balances[targetKey].bal = 0;
        this.balances[targetKey].usdValue = 0;
        this.balances[targetKey].totalInvested = 0;
        this.balances[targetKey].avgBuyPrice = p;
        this.pendingOrders = this.pendingOrders.filter(o => !(o.sym.toUpperCase().replace(/^\$/, "") === cleanSym && o.type === "TP/SL"));
        if (!isCash && cleanSym !== "SOL" && cleanSym !== "USDT" && cleanSym !== "USDC" && cleanSym !== "USD") {
          delete this.balances[targetKey];
          delete this.balances[cleanSym];
          delete this.balances[`$${cleanSym}`];
          delete this.balances[sym];
        }
      } else {
        this.balances[targetKey].usdValue = Number((this.balances[targetKey].bal * p).toFixed(2));
        this.balances[targetKey].totalInvested = newInvested;
        this.balances[targetKey].avgBuyPrice = newInvested / this.balances[targetKey].bal;
      }

      // Credit proceeds: if cash pair, to USDT/USDC. If crypto pair, to that specific crypto (SOL, ETH, BNB)
      let receiveStr = '';
      if (isCash) {
        const settlementSym = (this.balances["USDT"]?.bal || 0) >= (this.balances["USDC"]?.bal || 0) ? "USDT" : "USDC";
        if (!this.balances[settlementSym]) {
          this.balances[settlementSym] = {
            bal: 0,
            usdValue: 0,
            name: settlementSym === "USDT" ? "Tether USD" : "USD Coin",
            totalInvested: 0,
            avgBuyPrice: 1.0,
          };
        }
        this.balances[settlementSym].bal = Number((this.balances[settlementSym].bal + grossUsdReceived).toFixed(2));
        this.balances[settlementSym].usdValue = this.balances[settlementSym].bal;
        this.balances[settlementSym].totalInvested = this.balances[settlementSym].bal;
        receiveStr = `$${grossUsdReceived.toFixed(2)} ${settlementSym}`;
      } else {
        const cryptoToCredit = Number((grossUsdReceived / basePriceUsd).toFixed(6));
        if (!this.balances[pair]) {
          this.balances[pair] = {
            bal: 0,
            usdValue: 0,
            name: pair,
            totalInvested: 0,
            avgBuyPrice: basePriceUsd,
          };
        }
        this.balances[pair].bal = Number((this.balances[pair].bal + cryptoToCredit).toFixed(6));
        this.balances[pair].usdValue = Number((this.balances[pair].bal * basePriceUsd).toFixed(2));
        receiveStr = `${cryptoToCredit.toFixed(4)} ${pair} ($${grossUsdReceived.toFixed(2)})`;
      }

      // Add trade to Recent Trades
      this.addTrade({
        sym: cleanSym,
        type: "Sell",
        usd: grossUsdReceived,
        tokenAmt: actualSellAmount,
        price: p,
        trader: "JD...7b2",
        traderEmoji: "⚡",
        isUser: true,
      });

      // Record in User Orders
      const userOrder: UserOrder = {
        id: `order-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        sym: cleanSym,
        name: token.name,
        side: "Sell",
        amountUsd: grossUsdReceived,
        tokenAmt: actualSellAmount,
        price: p,
        timestamp: Date.now(),
        dateStr: "just now",
      };
      this.userOrders.unshift(userOrder);
      if (this.userOrders.length > 50) this.userOrders = this.userOrders.slice(0, 50);

      // Dynamic real-time price impact with persistent memory
      const isMajor = this.isMajorToken(sym);
      const impactRatio = isMajor
        ? Math.min(0.005, (grossUsdReceived / 2000000))
        : Math.min(0.12, Math.max(0.015, grossUsdReceived / (p * 50000 + 500)));
      const newP = Math.max(0.00000001, p * (1 - impactRatio));

      this.priceAnchors[sym] = newP;
      this.momentums[sym] = Math.max(-0.08, (this.momentums[sym] || 0) - impactRatio * 0.7);
      token.customPrice = true;
      token.isMarketMakerActive = true;
      this.applyPriceTick(sym, newP, false);

      // Immediately impact 24h change & market cap (Dexscreener live dump impact)
      const dumpPct = Number((impactRatio * 100).toFixed(2));
      token.changeNum = Number((token.changeNum - dumpPct).toFixed(2));
      token.change = `${token.changeNum >= 0 ? "+" : ""}${token.changeNum.toFixed(2)}%`;
      token.pos = token.changeNum >= 0;

      if (token.supply && token.supply > 0) {
        const newMcap = newP * token.supply;
        const fmtMcap = newMcap >= 1e9 ? `$${(newMcap / 1e9).toFixed(2)}B` : newMcap >= 1e6 ? `$${(newMcap / 1e6).toFixed(1)}M` : newMcap >= 1e3 ? `$${(newMcap / 1e3).toFixed(0)}K` : `$${newMcap.toFixed(2)}`;
        token.cap = fmtMcap;
        token.fdv = fmtMcap;
      }

      // Update user position holding value immediately with new price if key still exists
      if (targetKey && this.balances[targetKey]) {
        this.balances[targetKey].usdValue = Number((this.balances[targetKey].bal * newP).toFixed(2));
      }

      // Update sellers counters
      token.txns += 1;
      token.sells += 1;
      token.sellers += 1;
      token.traders = token.buyers + token.sellers;
      token.sellVol = (token.sellVol || 0) + (grossUsdReceived / 1e6);
      token.vol = (token.buyVol || 0) + (token.sellVol || 0);

      this.notify();
      this.broadcast({
        type: "ORDER_PLACED",
        payload: {
          sym,
          balances: this.balances,
          trade: this.trades[sym]?.[0],
          newPrice: newP,
          isUp: false,
        },
      });
      this.savePersistedStateNow();
      const targetWalletSell = this.getSyncIdentifier();
      if (targetWalletSell) {
        api.syncBalances(targetWalletSell, this.balances, {
          sym,
          name: token.name,
          type: "Sell",
          usd: grossUsdReceived,
          tokenAmt: amount,
          price: p,
        });
      }

      return {
        success: true,
        message: `Sold ${amount >= 1000 ? amount.toLocaleString(undefined, { maximumFractionDigits: 1 }) : amount.toFixed(4)} ${sym} for ${receiveStr}!`,
        tokensExchanged: amount,
        usdcExchanged: grossUsdReceived,
      };
    }
  }

  getPendingOrders(sym?: string): PendingOrder[] {
    if (sym) {
      return this.pendingOrders.filter(o => o.sym.toUpperCase() === sym.toUpperCase());
    }
    return this.pendingOrders;
  }

  // ── Place Limit Order (Buy or Sell) with Escrow ───────────────────
  placeLimitOrder(params: {
    sym: string;
    side: "Buy" | "Sell";
    amount: number; // Quote USD for Buy, token units for Sell
    targetPrice: number;
    pairCurrency?: string;
  }): { success: boolean; message: string; orderId?: string } {
    const { sym, side, amount, targetPrice, pairCurrency } = params;
    const token = this.getToken(sym);
    if (!token) return { success: false, message: "Token not found" };
    if (amount <= 0) return { success: false, message: "Enter an amount greater than 0" };
    if (!targetPrice || targetPrice <= 0) return { success: false, message: "Enter a valid target limit price" };

    if (side === "Buy") {
      const availableUsdt = this.balances["USDT"]?.bal || 0;
      const availableUsdc = this.balances["USDC"]?.bal || 0;
      const totalCash = availableUsdt + availableUsdc;
      if (amount > totalCash) {
        return { success: false, message: `Insufficient cash balance! Available: $${totalCash.toFixed(2)}` };
      }

      // If current market price is ALREADY <= targetPrice, fill immediately!
      if (token.numericPrice <= targetPrice) {
        const orderRes = this.placeOrder({ sym, side: "Buy", amount, pairCurrency });
        if (orderRes.success) {
          // Label as Limit in userOrders
          if (this.userOrders.length > 0 && this.userOrders[0].sym === sym) {
            this.userOrders[0].orderType = "Limit";
            this.userOrders[0].triggerNote = `Limit Buy filled immediately @ $${token.numericPrice < 0.001 ? token.numericPrice.toFixed(8) : token.numericPrice < 1 ? token.numericPrice.toFixed(4) : token.numericPrice.toFixed(2)}`;
          }
          return {
            success: true,
            message: `🎯 Limit Buy executed immediately! Bought ${orderRes.tokensExchanged ? (orderRes.tokensExchanged >= 1000 ? orderRes.tokensExchanged.toLocaleString(undefined, { maximumFractionDigits: 1 }) : orderRes.tokensExchanged.toFixed(4)) : ""} ${sym} @ $${token.numericPrice < 0.001 ? token.numericPrice.toFixed(8) : token.numericPrice < 1 ? token.numericPrice.toFixed(4) : token.numericPrice.toFixed(2)}`,
          };
        }
        return orderRes;
      }

      // Otherwise, escrow cash and create open limit order waiting for price to dip
      let remaining = amount;
      if (this.balances["USDT"] && this.balances["USDT"].bal > 0) {
        const take = Math.min(this.balances["USDT"].bal, remaining);
        this.balances["USDT"].bal -= take;
        this.balances["USDT"].usdValue = this.balances["USDT"].bal;
        this.balances["USDT"].totalInvested = this.balances["USDT"].bal;
        remaining -= take;
      }
      if (remaining > 0 && this.balances["USDC"]) {
        const take = Math.min(this.balances["USDC"].bal, remaining);
        this.balances["USDC"].bal -= take;
        this.balances["USDC"].usdValue = this.balances["USDC"].bal;
        this.balances["USDC"].totalInvested = this.balances["USDC"].bal;
      }

      const orderId = `limit-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      this.pendingOrders.unshift({
        id: orderId,
        sym,
        side: "Buy",
        type: "Limit",
        amount,
        targetPrice,
        currentPriceAtCreation: token.numericPrice,
        createdAt: Date.now(),
        dateStr: "just now",
      });

      this.savePersistedState();
      this.checkPendingOrders(token);
      this.notify();
      return {
        success: true,
        message: `Limit Buy placed for $${amount.toFixed(2)} ${sym} @ target $${targetPrice < 0.001 ? targetPrice.toFixed(8) : targetPrice < 1 ? targetPrice.toFixed(4) : targetPrice.toFixed(2)}! It will auto-fill when price dips to target.`,
        orderId,
      };
    } else {
      // Limit Sell
      const availableToken = this.balances[sym]?.bal || 0;
      if (amount > availableToken) {
        return { success: false, message: `Insufficient ${sym} balance! Available: ${availableToken.toLocaleString()}` };
      }

      // If current market price is ALREADY >= targetPrice, fill immediately!
      if (token.numericPrice >= targetPrice) {
        const orderRes = this.placeOrder({ sym, side: "Sell", amount });
        if (orderRes.success) {
          if (this.userOrders.length > 0 && this.userOrders[0].sym === sym) {
            this.userOrders[0].orderType = "Limit";
            this.userOrders[0].triggerNote = `Limit Sell filled immediately @ $${token.numericPrice < 0.001 ? token.numericPrice.toFixed(8) : token.numericPrice < 1 ? token.numericPrice.toFixed(4) : token.numericPrice.toFixed(2)}`;
          }
          return {
            success: true,
            message: `💰 Limit Sell executed immediately! Sold ${amount >= 1000 ? amount.toLocaleString(undefined, { maximumFractionDigits: 1 }) : amount.toFixed(4)} ${sym} @ $${token.numericPrice < 0.001 ? token.numericPrice.toFixed(8) : token.numericPrice < 1 ? token.numericPrice.toFixed(4) : token.numericPrice.toFixed(2)}`,
          };
        }
        return orderRes;
      }

      this.balances[sym].bal -= amount;
      this.balances[sym].usdValue = this.balances[sym].bal * token.numericPrice;

      const orderId = `limit-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      this.pendingOrders.unshift({
        id: orderId,
        sym,
        side: "Sell",
        type: "Limit",
        amount,
        targetPrice,
        currentPriceAtCreation: token.numericPrice,
        createdAt: Date.now(),
        dateStr: "just now",
      });

      this.savePersistedState();
      this.checkPendingOrders(token);
      this.notify();
      return {
        success: true,
        message: `Limit Sell placed for ${amount >= 1000 ? amount.toLocaleString(undefined, { maximumFractionDigits: 1 }) : amount.toFixed(4)} ${sym} @ target $${targetPrice < 0.001 ? targetPrice.toFixed(8) : targetPrice < 1 ? targetPrice.toFixed(4) : targetPrice.toFixed(2)}!`,
        orderId,
      };
    }
  }

  // ── Place Take Profit & Stop Loss (TP/SL) Order (Keeps tokens in wallet) ──
  placeTpSlOrder(params: {
    sym: string;
    amountTokens: number;
    tpPrice?: number;
    slPrice?: number;
    tpPct?: number;
    slPct?: number;
  }): { success: boolean; message: string; orderId?: string } {
    const { sym, amountTokens, tpPrice, slPrice, tpPct, slPct } = params;
    const token = this.getToken(sym);
    if (!token) return { success: false, message: "Token not found" };
    if (amountTokens <= 0) return { success: false, message: "Enter an amount greater than 0" };
    if (!tpPrice && !slPrice) return { success: false, message: "Specify at least a Take Profit or Stop Loss price" };

    const availableToken = this.balances[sym]?.bal || 0;
    if (amountTokens > availableToken + 0.000001) {
      return { success: false, message: `Insufficient ${sym} balance! Available: ${availableToken.toLocaleString()}` };
    }

    // CRITICAL: We DO NOT deduct tokens from wallet here!
    // TP/SL is an automatic conditional trigger on your owned position.
    // The user keeps holding the tokens, watching live P&L and pumping,
    // and when either trigger hits, the auto-sell executes instantly!
    const orderId = `tpsl-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    // Replace any previous TP/SL on this token with the new one
    this.pendingOrders = this.pendingOrders.filter(o => !(o.sym.toUpperCase() === sym.toUpperCase() && o.type === "TP/SL"));

    this.pendingOrders.unshift({
      id: orderId,
      sym,
      side: "Sell",
      type: "TP/SL",
      amount: amountTokens,
      tpPrice,
      slPrice,
      tpPct,
      slPct,
      currentPriceAtCreation: token.numericPrice,
      createdAt: Date.now(),
      dateStr: "just now",
    });

    this.savePersistedState();
    this.checkPendingOrders(token);
    this.notify();
    return {
      success: true,
      message: `🎯 TP/SL armed for ${amountTokens >= 1000 ? amountTokens.toLocaleString(undefined, { maximumFractionDigits: 1 }) : amountTokens.toFixed(4)} ${sym}! Take Profit: ${tpPrice ? `+${tpPct}% ($${tpPrice < 0.001 ? tpPrice.toFixed(8) : tpPrice < 1 ? tpPrice.toFixed(4) : tpPrice.toFixed(2)})` : "off"} · Stop Loss: ${slPrice ? `-${slPct}% ($${slPrice < 0.001 ? slPrice.toFixed(8) : slPrice < 1 ? slPrice.toFixed(4) : slPrice.toFixed(2)})` : "off"}`,
      orderId,
    };
  }

  // ── Cancel Open Pending Order & Refund Escrow ──────────────────────
  cancelPendingOrder(orderId: string): { success: boolean; message: string } {
    const idx = this.pendingOrders.findIndex(o => o.id === orderId);
    if (idx === -1) return { success: false, message: "Order not found" };
    const order = this.pendingOrders[idx];

    // If it's a TP/SL order, tokens were never deducted from wallet, so simply remove the trigger
    if (order.type === "TP/SL") {
      this.pendingOrders.splice(idx, 1);
      this.savePersistedState();
      this.notify();
      return { success: true, message: `Disarmed TP/SL protection for ${order.sym}!` };
    }

    // Refund Limit Buy cash escrow
    if (order.type === "Limit" && order.side === "Buy") {
      const settlementSym = "USDT";
      if (!this.balances[settlementSym]) {
        this.balances[settlementSym] = { bal: 0, usdValue: 0, name: "Tether USD", totalInvested: 0, avgBuyPrice: 1.0 };
      }
      this.balances[settlementSym].bal = Number((this.balances[settlementSym].bal + order.amount).toFixed(2));
      this.balances[settlementSym].usdValue = this.balances[settlementSym].bal;
      this.balances[settlementSym].totalInvested = this.balances[settlementSym].bal;
    } else if (order.type === "Limit" && order.side === "Sell") {
      // Refund Limit Sell token escrow
      if (!this.balances[order.sym]) {
        this.balances[order.sym] = { bal: 0, usdValue: 0, name: order.sym, totalInvested: 0, avgBuyPrice: order.currentPriceAtCreation };
      }
      this.balances[order.sym].bal += order.amount;
      const p = this.getToken(order.sym)?.numericPrice || order.currentPriceAtCreation;
      this.balances[order.sym].usdValue = this.balances[order.sym].bal * p;
    }

    this.pendingOrders.splice(idx, 1);
    this.savePersistedState();
    this.notify();
    return { success: true, message: `Cancelled order and refunded to wallet!` };
  }

  // ── Pop live order alert message for toasts ───────────────────────
  popOrderAlert(): string | null {
    const msg = this.lastOrderAlert;
    this.lastOrderAlert = null;
    return msg;
  }

  // ── Reset to Exactly $0.00 Balances & 0 Bought Holdings ───────
  resetToZero(): { success: boolean; message: string } {
    if (typeof window !== "undefined" && window.localStorage) {
      [
        "axiom_balances_v1", "axiom_balances_v2", "axiom_balances_v3",
        "axiom_balances_v4", "axiom_balances_v5", "axiom_balances_v6",
        "axiom_balances_v7", "axiom_balances_v8", "axiom_balances_v9",
        "axiom_balances_v10", "axiom_balances_v11",
        "axiom_reset_twenty_v8", "axiom_reset_twenty_v9", "axiom_reset_twenty_v10",
        "axiom_user_orders_v1", "axiom_user_orders_v2", "axiom_user_orders_v3", "axiom_user_orders_v4",
        "axiom_pending_orders_v1", "axiom_pending_orders_v2", "axiom_pending_orders_v3", "axiom_pending_orders_v4"
      ].forEach(k => {
        try { window.localStorage.removeItem(k); } catch { }
      });
      window.localStorage.setItem("axiom_zero_start_v1", "true");
    }
    this.balances = {
      USDT: { bal: 0.00, usdValue: 0.00, name: "Tether USD", totalInvested: 0.00, avgBuyPrice: 1.0 },
      USDC: { bal: 0.00, usdValue: 0.00, name: "USD Coin", totalInvested: 0.00, avgBuyPrice: 1.0 },
      SOL: { bal: 0.00, usdValue: 0.00, name: "Solana", totalInvested: 0.00, avgBuyPrice: 121.69 },
    };
    this.userOrders = [];
    this.pendingOrders = [];
    this.lastOrderAlert = null;
    this.savePersistedState();
    this.notify();
    return { success: true, message: "Reset balance to strictly $0.00" };
  }

  resetToDemoTwenty(): { success: boolean; message: string } {
    return this.resetToZero();
  }

  // ── Admin Controls: Pump, Dump, Rugpull, Create Token ─────────────
  parseShortUsd(str: string | undefined): number {
    if (!str) return 0;
    const clean = str.replace(/[$,]/g, "").trim().toUpperCase();
    if (clean.endsWith("B")) return (parseFloat(clean.slice(0, -1)) || 0) * 1e9;
    if (clean.endsWith("M")) return (parseFloat(clean.slice(0, -1)) || 0) * 1e6;
    if (clean.endsWith("K")) return (parseFloat(clean.slice(0, -1)) || 0) * 1e3;
    return parseFloat(clean) || 0;
  }

  formatShortUsd(n: number): string {
    if (!n || isNaN(n)) return "$0.00";
    if (n >= 1e12) return `$${Math.min(999.9, n / 1e12).toFixed(2)}T`;
    if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
    if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
    if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
    return `$${n.toFixed(2)}`;
  }

  deleteToken(sym: string, fromRemote = false): { success: boolean; message: string } {
    if (this.isMajorToken(sym)) {
      return { success: false, message: `Cannot delete major cryptocurrency $${sym}` };
    }
    const targetSym = sym.toUpperCase().replace(/^\$/, "");
    const idx = this.tokens.findIndex(t => t.sym.toUpperCase() === targetSym);
    if (idx < 0) {
      return { success: false, message: `Token $${targetSym} not found` };
    }

    this.tokens.splice(idx, 1);
    this.tokens = [...this.tokens];

    delete this.priceAnchors[targetSym];
    delete this.momentums[targetSym];
    delete this.candleSeries[targetSym];
    delete this.trades[targetSym];
    delete this.balances[targetSym];
    this.pendingOrders = this.pendingOrders.filter(o => o.sym.toUpperCase() !== targetSym);

    if (this.activeSym.toUpperCase() === targetSym) {
      this.activeSym = this.tokens[0]?.sym || "SOL";
    }

    if (!fromRemote) {
      this.broadcast({ type: "DELETE_TOKEN", payload: { sym: targetSym } });
      api.deleteMemeToken(targetSym).catch(() => {});
    }

    this.savePersistedStateNow();
    const targetSyncIdDel = this.getSyncIdentifier();
    if (targetSyncIdDel) {
      api.syncBalances(targetSyncIdDel, this.balances).catch(() => {});
    }
    this.notify();
    return { success: true, message: `Token $${targetSym} has been permanently deleted.` };
  }

  pumpToken(sym: string, percent: number, fromRemote = false) {
    if (this.isMajorToken(sym)) return;
    const token = this.getToken(sym);
    if (!token || token.is_rugged) return;
    const factor = 1 + percent / 100;
    const newPrice = token.numericPrice * factor;

    token.numericPrice = newPrice;
    token.price = formatCoinPrice(newPrice);
    token.solPrice = `${(newPrice / 121.69).toFixed(6)} SOL`;
    token.changeNum = Number((token.changeNum + percent).toFixed(2));
    token.change = formatPercentage(token.changeNum);
    token.pos = token.changeNum >= 0;
    token.isMarketMakerActive = true;
    token.customPrice = true;
    token.sparkline = generateSparkline(newPrice, true);

    // Dynamic Mcap and FDV recalculation based on actual or standard token supply
    const supply = token.supply || (this.isMajorToken(sym) ? (newPrice > 1000 ? 19700000 : 500000000) : 1000000000);
    token.supply = supply;
    const newMcap = newPrice * supply;
    token.cap = this.formatShortUsd(newMcap);
    token.fdv = this.formatShortUsd(newMcap);

    // Dynamic Liquidity recalculation (AMM pool liquidity expands with price appreciation)
    const oldLiq = this.parseShortUsd(token.liq) || (newMcap * 0.18);
    const liqMultiplier = Math.sqrt(Math.max(0.01, factor));
    const newLiq = Math.max(5000, oldLiq * liqMultiplier);
    token.liq = this.formatShortUsd(newLiq);

    // Volume & Trading Activity expansion
    const tradeVolume = Math.min(newMcap * 0.015, Math.max(2500, newPrice * (supply * 0.0005)));
    token.vol = Number(((token.vol || 0) + (tradeVolume / 1000)).toFixed(1));
    token.buyVol = Number(((token.buyVol || 0) + (tradeVolume / 1000)).toFixed(1));
    token.txns = (token.txns || 0) + 1;
    token.buys = (token.buys || 0) + 1;
    const addedHolders = Math.floor(Math.random() * 4 + 2);
    const addedBuyers = Math.floor(Math.random() * 3 + 2);
    token.user_holders_count = (token.user_holders_count || 12) + addedHolders;
    token.total_buyers_count = (token.total_buyers_count || 10) + addedBuyers;
    token.buyers = (token.buyers || 0) + addedBuyers;
    token.traders = (token.sellers || 0) + token.buyers;

    // Timeframe momentum indicators update
    token.m5 = { val: `+${Math.min(99.9, Math.abs(percent) * 0.35).toFixed(2)}%`, up: true };
    token.h1 = { val: `+${Math.min(250, Math.abs(percent) * 0.75).toFixed(2)}%`, up: true };
    token.h6 = { val: `+${Math.abs(percent).toFixed(2)}%`, up: true };
    token.h24 = { val: formatPercentage(token.changeNum), up: token.changeNum >= 0 };

    // Anchor updated to new pumped price so live ticker maintains this level!
    this.priceAnchors[sym] = newPrice;
    this.momentums[sym] = 0.0008;

    // Add whale buy trade with realistic wallet address
    this.addTrade({
      sym,
      type: "Buy",
      usd: 12500,
      tokenAmt: 12500 / newPrice,
      price: newPrice,
      trader: "7xKZ...9bQ",
      traderEmoji: "💎",
    }, fromRemote);

    // Update active candles with green pump candle across all timeframes
    const tfs = ["1s", "1m", "5m", "15m", "1h", "4h", "D"];
    if (!this.candleSeries[sym]) this.candleSeries[sym] = {};
    tfs.forEach(tf => {
      let candles = this.candleSeries[sym][tf];
      if (!candles || candles.length === 0) {
        candles = this.buildInitialCandles(sym, tf);
        this.candleSeries[sym][tf] = candles;
      }
      const prev = candles[candles.length - 1];
      candles.push({
        open: prev.close,
        high: Math.max(prev.close, newPrice * 1.002),
        low: prev.close,
        close: newPrice,
        vol: 360,
        time: Date.now(),
      });
      if (candles.length > 80) candles.shift();
    });

    // Update user balance holding value if held
    if (this.balances[sym] && this.balances[sym].bal > 0) {
      this.balances[sym].usdValue = Number((this.balances[sym].bal * newPrice).toFixed(2));
    }

    // Create a new array reference so all React hooks & useMemos recompute
    this.tokens = [...this.tokens];
    this.savePersistedStateNow();

    const targetSyncIdPump = this.getSyncIdentifier();
    if (targetSyncIdPump) {
      api.syncBalances(targetSyncIdPump, this.balances).catch(() => { });
    }

    if (!fromRemote) {
      this.broadcast({ type: "PUMP_TOKEN", payload: { sym, percent, newPrice } });
      try {
        api.controlToken(sym, 'pump', percent).catch(() => { });
      } catch { }
    }

    this.checkPendingOrders(token);
    this.notify();
  }

  pumpTokenDollar(sym: string, dollarAmount: number, fromRemote = false) {
    if (this.isMajorToken(sym)) return;
    const token = this.getToken(sym);
    if (!token || token.is_rugged) return;
    const oldPrice = token.numericPrice || 0.001;
    const newPrice = oldPrice + dollarAmount;
    const pct = oldPrice > 0 ? ((newPrice - oldPrice) / oldPrice) * 100 : 10;
    this.pumpToken(sym, Number(pct.toFixed(4)), fromRemote);
  }

  dumpTokenDollar(sym: string, dollarAmount: number, fromRemote = false) {
    if (this.isMajorToken(sym)) return;
    const token = this.getToken(sym);
    if (!token || token.is_rugged) return;
    const oldPrice = token.numericPrice || 0.001;
    const newPrice = Math.max(0.00000001, oldPrice - dollarAmount);
    const pct = oldPrice > 0 ? ((oldPrice - newPrice) / oldPrice) * 100 : 10;
    this.dumpToken(sym, Number(pct.toFixed(4)), fromRemote);
  }

  setTokenTargetPrice(sym: string, targetPrice: number, fromRemote = false) {
    if (this.isMajorToken(sym)) return;
    const token = this.getToken(sym);
    if (!token || token.is_rugged) return;
    const oldPrice = token.numericPrice || 0.001;
    if (targetPrice >= oldPrice) {
      const pct = oldPrice > 0 ? ((targetPrice - oldPrice) / oldPrice) * 100 : 10;
      this.pumpToken(sym, Number(pct.toFixed(4)), fromRemote);
    } else {
      const pct = oldPrice > 0 ? ((oldPrice - targetPrice) / oldPrice) * 100 : 10;
      this.dumpToken(sym, Number(pct.toFixed(4)), fromRemote);
    }
  }

  dumpToken(sym: string, percent: number, fromRemote = false) {
    if (this.isMajorToken(sym)) return;
    const token = this.getToken(sym);
    if (!token || token.is_rugged) return;
    const factor = Math.max(0.00000001, 1 - percent / 100);
    const newPrice = Math.max(0.00000001, token.numericPrice * factor);

    token.numericPrice = newPrice;
    token.price = formatCoinPrice(newPrice);
    token.solPrice = `${(newPrice / 121.69).toFixed(6)} SOL`;
    token.changeNum = Number((token.changeNum - percent).toFixed(2));
    if (newPrice <= 0.00000001 || token.changeNum <= -99) {
      token.is_rugged = true;
      token.changeNum = -99.99;
      token.change = "-99.99%";
      token.pos = false;
      token.liq = "$0.00";
    } else {
      token.change = formatPercentage(token.changeNum);
      token.pos = token.changeNum >= 0;
    }
    token.isMarketMakerActive = true;
    token.customPrice = true;
    token.sparkline = generateSparkline(newPrice, false);

    // Dynamic Mcap and FDV recalculation based on actual or standard token supply
    const supply = token.supply || (this.isMajorToken(sym) ? (newPrice > 1000 ? 19700000 : 500000000) : 1000000000);
    token.supply = supply;
    const newMcap = newPrice * supply;
    token.cap = this.formatShortUsd(newMcap);
    token.fdv = this.formatShortUsd(newMcap);

    // Dynamic Liquidity recalculation on dump (AMM pool liquidity contracts)
    const oldLiq = this.parseShortUsd(token.liq) || (newMcap * 0.18);
    const liqMultiplier = Math.sqrt(Math.max(0.01, factor));
    const newLiq = Math.max(1000, oldLiq * liqMultiplier);
    token.liq = this.formatShortUsd(newLiq);

    // Volume & Trading Activity expansion
    const tradeVolume = Math.min(newMcap * 0.015, Math.max(2500, newPrice * (supply * 0.0005)));
    token.vol = Number(((token.vol || 0) + (tradeVolume / 1000)).toFixed(1));
    token.sellVol = Number(((token.sellVol || 0) + (tradeVolume / 1000)).toFixed(1));
    token.txns = (token.txns || 0) + 1;
    token.sells = (token.sells || 0) + 1;
    token.sellers = (token.sellers || 0) + 1;
    token.traders = (token.traders || 0) + 1;

    // Timeframe momentum indicators update
    token.m5 = { val: `-${Math.min(99.9, Math.abs(percent) * 0.35).toFixed(2)}%`, up: false };
    token.h1 = { val: `-${Math.min(250, Math.abs(percent) * 0.75).toFixed(2)}%`, up: false };
    token.h6 = { val: `-${Math.abs(percent).toFixed(2)}%`, up: false };
    token.h24 = { val: formatPercentage(token.changeNum), up: token.changeNum >= 0 };

    // Anchor updated to new dumped price so live ticker does NOT reverse it!
    this.priceAnchors[sym] = newPrice;
    this.momentums[sym] = -0.0008;

    // Add whale dump trade with realistic wallet address
    this.addTrade({
      sym,
      type: "Sell",
      usd: 9500,
      tokenAmt: 9500 / newPrice,
      price: newPrice,
      trader: "3mFv...2aL",
      traderEmoji: "📉",
    }, fromRemote);

    // Update active candles with red drop across all timeframes
    const tfs = ["1s", "1m", "5m", "15m", "1h", "4h", "D"];
    if (!this.candleSeries[sym]) this.candleSeries[sym] = {};
    tfs.forEach(tf => {
      let candles = this.candleSeries[sym][tf];
      if (!candles || candles.length === 0) {
        candles = this.buildInitialCandles(sym, tf);
        this.candleSeries[sym][tf] = candles;
      }
      const prev = candles[candles.length - 1];
      candles.push({
        open: prev.close,
        high: prev.close,
        low: Math.min(prev.close, newPrice * 0.998),
        close: newPrice,
        vol: 320,
        time: Date.now(),
      });
      if (candles.length > 80) candles.shift();
    });

    // Update user balance holding value if held
    if (this.balances[sym] && this.balances[sym].bal > 0) {
      this.balances[sym].usdValue = Number((this.balances[sym].bal * newPrice).toFixed(2));
    }

    // Create a new array reference so all React hooks & useMemos recompute
    this.tokens = [...this.tokens];
    this.savePersistedStateNow();

    const targetSyncIdDump = this.getSyncIdentifier();
    if (targetSyncIdDump) {
      api.syncBalances(targetSyncIdDump, this.balances).catch(() => { });
    }

    if (!fromRemote) {
      this.broadcast({ type: "DUMP_TOKEN", payload: { sym, percent, newPrice } });
      try {
        api.controlToken(sym, 'dump', percent).catch(() => { });
      } catch { }
    }

    this.checkPendingOrders(token);
    this.notify();
  }

  rugpullToken(sym: string, fromRemote = false) {
    if (this.isMajorToken(sym)) {
      console.warn(`Cannot rugpull major cryptocurrency $${sym}`);
      return;
    }
    const token = this.getToken(sym);
    if (!token) return;
    const newPrice = 0.00000001;

    token.numericPrice = 0.00000001;
    token.price = `$0.00000001`;
    token.solPrice = "0.00000000 SOL";
    token.change = "-99.99%";
    token.changeNum = -99.99;
    token.pos = false;
    token.liq = "$0.00";
    token.cap = "$10.00";
    token.fdv = "$10.00";
    token.is_rugged = true;
    token.isMarketMakerActive = true;
    token.customPrice = true;
    token.sparkline = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

    // Anchor locked to 0 permanently
    this.priceAnchors[sym] = newPrice;
    this.momentums[sym] = 0;

    // Zero out user balance holding value completely
    if (this.balances[sym]) {
      this.balances[sym].usdValue = 0;
    }

    // Cancel all open pending limit or TP/SL orders for this token without refund
    this.pendingOrders = this.pendingOrders.filter(o => o.sym.toUpperCase() !== sym.toUpperCase());

    // Add realistic cascade of heavy market dumps ("Sell Sell Sell" in Recent Trades list)
    const dumpTrades = [
      { trader: "Whale_88", emoji: "🐋", usd: 42500, time: Date.now() - 3000 },
      { trader: "4qWp...8kZ", emoji: "⚡", usd: 31200, time: Date.now() - 2500 },
      { trader: "DeFi_Alpha", emoji: "📉", usd: 18900, time: Date.now() - 2000 },
      { trader: "9xK2...01b", emoji: "🔥", usd: 24700, time: Date.now() - 1500 },
      { trader: "Vault_Exit", emoji: "⚠️", usd: 14200, time: Date.now() - 1000 },
      { trader: "7mLp...43f", emoji: "🔻", usd: 9800, time: Date.now() - 500 },
    ];
    dumpTrades.forEach(dt => {
      this.addTrade({
        sym,
        type: "Sell",
        usd: dt.usd,
        tokenAmt: Math.round(dt.usd / 0.00000001),
        price: 0.00000001,
        trader: dt.trader,
        traderEmoji: dt.emoji,
      }, fromRemote);
    });

    // Inactive all candles down to 0
    const tfs = ["1s", "1m", "5m", "15m", "1h", "4h", "D"];
    if (!this.candleSeries[sym]) this.candleSeries[sym] = {};
    tfs.forEach(tf => {
      let candles = this.candleSeries[sym][tf];
      if (!candles || candles.length === 0) {
        candles = this.buildInitialCandles(sym, tf);
        this.candleSeries[sym][tf] = candles;
      }
      const prev = candles[candles.length - 1];
      candles.push({
        open: prev.close,
        high: prev.close,
        low: newPrice,
        close: newPrice,
        vol: 999,
        time: Date.now(),
      });
      if (candles.length > 80) candles.shift();
    });

    this.tokens = [...this.tokens];

    if (!fromRemote) {
      this.broadcast({ type: "RUGPULL_TOKEN", payload: { sym } });
      try {
        api.adminControlToken(sym, { action: 'rugpull' }).catch(() => {});
      } catch {}
    }
    this.savePersistedStateNow();
    const targetSyncIdRug = this.getSyncIdentifier();
    if (targetSyncIdRug) {
      api.syncBalances(targetSyncIdRug, this.balances).catch(() => { });
    }

    this.notify();
  }

  setTokenPrice(sym: string, price: number, change24h?: number, fromRemote = false) {
    const token = this.getToken(sym);
    if (!token) return;
    const newPrice = Math.max(0.00000001, price);
    token.numericPrice = newPrice;
    token.price = formatCoinPrice(newPrice);
    token.solPrice = `${(newPrice / 121.69).toFixed(6)} SOL`;
    if (newPrice <= 0.00000001 || (change24h !== undefined && change24h <= -99)) {
      token.is_rugged = true;
      token.changeNum = -99.99;
      token.change = "-99.99%";
      token.pos = false;
      token.liq = "$0.00";
    } else if (change24h !== undefined) {
      token.changeNum = Number(change24h.toFixed(2));
      token.change = formatPercentage(token.changeNum);
      token.pos = token.changeNum >= 0;
    }
    token.isMarketMakerActive = true;
    token.customPrice = true;
    token.sparkline = generateSparkline(newPrice, token.pos);

    const supply = token.supply || (this.isMajorToken(sym) ? (newPrice > 1000 ? 19700000 : 500000000) : 1000000000);
    token.supply = supply;
    const newMcap = newPrice * supply;
    token.cap = this.formatShortUsd(newMcap);
    token.fdv = this.formatShortUsd(newMcap);

    this.priceAnchors[sym] = newPrice;
    this.momentums[sym] = 0;

    this.injectCandleTick(sym, newPrice, token.pos);
    if (this.candleSeries[sym]) {
      Object.keys(this.candleSeries[sym]).forEach(tf => {
        const candles = this.candleSeries[sym][tf];
        if (candles && candles.length > 0) {
          const last = candles[candles.length - 1];
          last.close = newPrice;
          last.high = Math.max(last.high, newPrice);
          last.low = Math.min(last.low, newPrice);
        }
      });
    }

    if (this.balances[sym] && this.balances[sym].bal > 0) {
      this.balances[sym].usdValue = Number((this.balances[sym].bal * newPrice).toFixed(2));
    }

    this.tokens = [...this.tokens];
    this.savePersistedStateNow();

    if (!fromRemote) {
      this.broadcast({ type: "SET_TOKEN_PRICE", payload: { sym, price: newPrice, change24h } });
    }

    const targetSyncIdSet = this.getSyncIdentifier();
    if (targetSyncIdSet) {
      api.syncBalances(targetSyncIdSet, this.balances).catch(() => { });
    }

    this.checkPendingOrders(token);
    this.notify();
  }

  createToken(params: {
    name: string;
    symbol: string;
    price: string;
    supply: string;
    liquidity: string;
    contractAddress?: string;
    logo_url?: string;
    banner_url?: string;
    description?: string;
    pair_currency?: string;
  }, fromRemote = false) {
    const sym = params.symbol.toUpperCase().trim().replace(/^\$/, "");
    const pairCurrency = (params.pair_currency || 'SOL').toUpperCase().trim();
    const numPrice = parseFloat(params.price) || 0.001;
    const numLiq = parseFloat(params.liquidity) || 50000;
    const numSupply = parseFloat(params.supply) || 1000000000;
    const mCap = numPrice * numSupply;

    const formatShort = (n: number) => {
      if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
      if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
      if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
      return `$${n.toFixed(2)}`;
    };

    // Generate a valid-looking Solana base58 address if none provided
    const poolAddr = params.contractAddress && params.contractAddress.trim().length > 10
      ? params.contractAddress.trim()
      : Array.from({ length: 44 }, () => "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"[Math.floor(Math.random() * 58)]).join("");

    const fallbackImg = params.logo_url && params.logo_url.trim().length > 0
      ? params.logo_url.trim()
      : "https://coin-images.coingecko.com/coins/images/33890/large/popcat.png";

    const newToken: MarketToken = {
      sym,
      name: params.name,
      pair_currency: pairCurrency,
      price: formatCoinPrice(numPrice),
      numericPrice: numPrice,
      solPrice: `${(numPrice / 121.69).toFixed(6)} SOL`,
      change: "+0.00%",
      changeNum: 0,
      cap: formatShort(mCap),
      fdv: formatShort(mCap),
      liq: formatShort(numLiq),
      pos: true,
      supply: numSupply,
      m5: { val: "0%", up: true, zero: true },
      h1: { val: "0%", up: true, zero: true },
      h6: { val: "0%", up: true, zero: true },
      h24: { val: "0%", up: true, zero: true },
      txns: 1,
      buys: 1,
      sells: 0,
      vol: Number(((numLiq * 1.8) / 1e6).toFixed(2)),
      buyVol: Number((numLiq / 1e6).toFixed(2)),
      sellVol: Number(((numLiq * 0.8) / 1e6).toFixed(2)),
      traders: 1,
      buyers: 1,
      sellers: 0,
      network: "solana",
      poolAddress: poolAddr,
      contractAddress: poolAddr,
      imageUrl: fallbackImg,
      bannerUrl: params.banner_url || undefined,
      isNew: true,
      createdAt: Date.now(),
      isMajor: false,
      isMarketMakerActive: true,
      customPrice: true,
      sparkline: generateSparkline(numPrice, true),
    };

    // Remove existing if any with same sym
    const existingIdx = this.tokens.findIndex(t => t.sym === sym);
    if (existingIdx >= 0) {
      this.tokens.splice(existingIdx, 1);
    }

    // Insert right after the 9 majors so it is prominent in New and All
    const majorsCount = this.tokens.filter(t => this.isMajorToken(t.sym)).length;
    this.tokens.splice(majorsCount, 0, newToken);
    this.tokens = [...this.tokens]; // New reference triggers React useMemo & subscribers!

    this.priceAnchors[sym] = numPrice;
    this.momentums[sym] = 0;
    this.candleSeries[sym] = {};
    const tfs = ["1s", "1m", "5m", "15m", "1h", "4h", "D"];
    tfs.forEach(tf => {
      this.candleSeries[sym][tf] = this.buildInitialCandles(sym, tf);
    });
    this.trades[sym] = generateInitialTrades(newToken);

    if (!fromRemote) {
      this.broadcast({ type: "CREATE_TOKEN", payload: { token: newToken } });
      this.savePersistedStateNow();
    }

    this.activeSym = sym;
    this.notify();
    return newToken;
  }

  // ── Update Token: Allows admin to edit Market Cap, Price, Liquidity, Name, Logo, Contract ──
  updateToken(sym: string, updates: {
    name?: string;
    price?: number | string;
    marketCap?: number | string;
    liquidity?: number | string;
    supply?: number | string;
    contractAddress?: string;
    imageUrl?: string;
    bannerUrl?: string;
    change?: string;
    description?: string;
    pair_currency?: string;
  }, fromRemote = false): { success: boolean; message: string } {
    const s = sym.toUpperCase();
    const token = this.getToken(s);
    if (!token) return { success: false, message: `Token $${s} not found.` };

    token.isMarketMakerActive = true;
    token.customPrice = true;

    if (updates.pair_currency && updates.pair_currency.trim()) {
      token.pair_currency = updates.pair_currency.trim().toUpperCase();
    }

    if (updates.name && updates.name.trim()) token.name = updates.name.trim();
    if (updates.contractAddress && updates.contractAddress.trim()) {
      token.contractAddress = updates.contractAddress.trim();
      token.poolAddress = updates.contractAddress.trim();
    }
    if (updates.imageUrl && updates.imageUrl.trim()) token.imageUrl = updates.imageUrl.trim();
    if (updates.bannerUrl !== undefined) token.bannerUrl = updates.bannerUrl ? updates.bannerUrl.trim() : undefined;

    if (updates.supply !== undefined) {
      const sup = parseFloat(String(updates.supply));
      if (!isNaN(sup) && sup > 0) token.supply = sup;
    }

    const formatShort = (n: number) => {
      if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
      if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
      if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
      return `$${n.toFixed(2)}`;
    };

    if (updates.price !== undefined) {
      const numP = parseFloat(String(updates.price));
      if (!isNaN(numP) && numP > 0) {
        token.numericPrice = numP;
        token.price = formatCoinPrice(numP);
        token.solPrice = `${(numP / 121.69).toFixed(6)} SOL`;
        this.priceAnchors[token.sym] = numP;
      }
    }

    if (updates.marketCap !== undefined) {
      const numMc = parseFloat(String(updates.marketCap));
      if (!isNaN(numMc) && numMc > 0) {
        token.cap = formatShort(numMc);
        token.fdv = formatShort(numMc);
      }
    } else if (updates.price !== undefined && token.supply) {
      const mCap = token.numericPrice * token.supply;
      token.cap = formatShort(mCap);
      token.fdv = formatShort(mCap);
    }

    if (updates.liquidity !== undefined) {
      const numLiq = parseFloat(String(updates.liquidity));
      if (!isNaN(numLiq) && numLiq >= 0) {
        token.liq = formatShort(numLiq);
      }
    }

    if (updates.change) token.change = updates.change;

    // Push updated candle across all timeframes to reflect the new price on the chart immediately
    const tfs = ["1s", "1m", "5m", "15m", "1h", "4h", "D"];
    if (!this.candleSeries[token.sym]) this.candleSeries[token.sym] = {};
    tfs.forEach(tf => {
      let candles = this.candleSeries[token.sym][tf];
      if (!candles || candles.length === 0) {
        candles = this.buildInitialCandles(token.sym, tf);
        this.candleSeries[token.sym][tf] = candles;
      }
      const prev = candles[candles.length - 1];
      candles.push({
        open: prev.close,
        high: Math.max(prev.close, token.numericPrice),
        low: Math.min(prev.close, token.numericPrice),
        close: token.numericPrice,
        vol: 100,
        time: Date.now(),
      });
      if (candles.length > 80) candles.shift();
    });

    // Update balances usd value for this token if held
    if (this.balances[token.sym]) {
      this.balances[token.sym].usdValue = Number((this.balances[token.sym].bal * token.numericPrice).toFixed(2));
    }

    this.tokens = [...this.tokens]; // Trigger React useMemo recomputations

    if (!fromRemote) {
      this.broadcast({ type: "UPDATE_TOKEN", payload: { sym, updates } });
      this.savePersistedStateNow();
    }

    this.notify();
    return { success: true, message: `Successfully updated $${token.sym} metrics!` };
  }

  // ── Swap Execution: Real-time atomic token swaps ───────────────────
  swapTokens(fromSym: string, toSym: string, fromAmt: number, toAmt: number, fromRemote = false): { success: boolean; message: string } {
    const fSym = fromSym.toUpperCase();
    const tSym = toSym.toUpperCase();
    if (!this.balances[fSym]) {
      this.balances[fSym] = { bal: 0, usdValue: 0, name: fSym, totalInvested: 0, avgBuyPrice: 1.0 };
    }
    if (!this.balances[tSym]) {
      const targetToken = this.getToken(tSym);
      this.balances[tSym] = { bal: 0, usdValue: 0, name: targetToken?.name || tSym, totalInvested: 0, avgBuyPrice: 1.0 };
    }

    if (!fromRemote && this.isTokenSellBlocked(fSym)) {
      return {
        success: false,
        message: `⚠️ Selling or swapping $${fSym} is currently restricted by the token issuer. Trading protection active (Only Buying Allowed).`
      };
    }

    if (!fromRemote && (this.balances[fSym].bal < fromAmt || fromAmt <= 0)) {
      return {
        success: false,
        message: `Insufficient ${fSym} balance! You have ${this.balances[fSym].bal.toFixed(4)} ${fSym}.`,
      };
    }

    const fromToken = this.getToken(fSym);
    const toToken = this.getToken(tSym);
    const isCashF = fSym === "USDT" || fSym === "USDC" || fSym === "USD";
    const isCashT = tSym === "USDT" || tSym === "USDC" || tSym === "USD";
    const fromPrice = isCashF ? 1.0 : (fromToken?.numericPrice || 1.0);
    const toPrice = isCashT ? 1.0 : (toToken?.numericPrice || 1.0);
    const usdValue = Number((fromAmt * fromPrice).toFixed(2));

    // Deduct source asset & track realized profit
    const prevFromBal = this.balances[fSym].bal;
    const prevFromInvested = this.balances[fSym].totalInvested || 0;
    const fromAvgBuyPrice = this.balances[fSym].avgBuyPrice || fromPrice;

    if (!isCashF && isCashT) {
      const investedPortion = prevFromInvested > 0
        ? (prevFromInvested * (fromAmt / Math.max(0.000001, prevFromBal)))
        : (fromAmt * fromAvgBuyPrice);
      const profitFromSwap = usdValue - investedPortion;
      if (profitFromSwap > 0) {
        this.addRealizedProfit(profitFromSwap);
      }
    }

    this.balances[fSym].bal = Math.max(0, Number((this.balances[fSym].bal - fromAmt).toFixed(6)));
    this.balances[fSym].usdValue = Number((this.balances[fSym].bal * fromPrice).toFixed(2));
    if (this.balances[fSym].bal <= 0.0001 || this.balances[fSym].usdValue < 0.0099) {
      this.balances[fSym].bal = 0;
      this.balances[fSym].usdValue = 0;
      this.balances[fSym].totalInvested = 0;
      this.balances[fSym].avgBuyPrice = 0;
      if (!isCashF && fSym !== "SOL" && fSym !== "USDT" && fSym !== "USDC" && fSym !== "USD") {
        delete this.balances[fSym];
      }
    } else {
      const remRatio = this.balances[fSym].bal / Math.max(0.000001, prevFromBal);
      this.balances[fSym].totalInvested = Number((prevFromInvested * remRatio).toFixed(2));
    }

    // Credit target asset
    this.balances[tSym].bal = Number((this.balances[tSym].bal + toAmt).toFixed(6));
    this.balances[tSym].usdValue = Number((this.balances[tSym].bal * toPrice).toFixed(2));
    this.balances[tSym].totalInvested = Number(((this.balances[tSym].totalInvested || 0) + usdValue).toFixed(2));
    this.balances[tSym].avgBuyPrice = this.balances[tSym].bal > 0 ? this.balances[tSym].totalInvested / this.balances[tSym].bal : toPrice;

    // Record trade
    this.addTrade({
      sym: tSym,
      type: "Buy",
      usd: usdValue,
      tokenAmt: toAmt,
      price: toPrice,
      trader: "JD...7b2",
      traderEmoji: "🔄",
      isUser: true,
    }, fromRemote);

    // Record user order
    this.userOrders.unshift({
      id: `swap-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      sym: tSym,
      name: toToken?.name || tSym,
      side: "Buy",
      amountUsd: usdValue,
      tokenAmt: toAmt,
      price: toPrice,
      timestamp: Date.now(),
      dateStr: "just now",
      orderType: "Swap",
      triggerNote: `Instant Swap: ${fromAmt} ${fSym} ➔ ${toAmt >= 1000 ? toAmt.toLocaleString(undefined, { maximumFractionDigits: 1 }) : toAmt.toFixed(4)} ${tSym}`,
    });

    this.lastTradeOrSwapTime = Date.now();

    if (!fromRemote) {
      this.broadcast({ type: "SWAP_TOKENS", payload: { fromSym, toSym, fromAmt, toAmt } });
      this.savePersistedStateNow();

      const targetWallet = this.getSyncIdentifier();
      if (targetWallet) {
        api.syncBalances(targetWallet, this.balances, {
          sym: tSym,
          type: "Swap",
          usd: usdValue,
          tokenAmt: toAmt,
          price: toPrice,
        }).catch((err) => {
          console.warn("Failed to sync swapped balances to backend:", err);
        });
      }
    }

    this.notify();
    return {
      success: true,
      message: `Successfully swapped ${fromAmt} ${fSym} for ${toAmt >= 1000 ? toAmt.toLocaleString(undefined, { maximumFractionDigits: 1 }) : toAmt.toFixed(4)} ${tSym}!`,
    };
  }

  // ── Helper: Add a live trade ───────────────────────────────────────
  public addTrade(trade: {
    sym: string;
    type: "Buy" | "Sell";
    usd: number;
    tokenAmt: number;
    price: number;
    trader: string;
    traderEmoji: string;
    isUser?: boolean;
  }, _fromRemote = false) {
    if (!this.trades[trade.sym]) this.trades[trade.sym] = [];
    const newTrade: LiveTrade = {
      id: `trade-${Date.now()}-${Math.random()}`,
      sym: trade.sym,
      date: "just now",
      timestamp: Date.now(),
      type: trade.type,
      usd: trade.usd,
      tokenAmt: trade.tokenAmt,
      solAmt: Number((trade.usd / 121.69).toFixed(4)),
      price: trade.price,
      trader: trade.trader,
      traderEmoji: trade.traderEmoji,
      txHash: Math.random().toString(36).substring(2, 10),
      isUser: trade.isUser,
    };

    this.trades[trade.sym] = [newTrade, ...this.trades[trade.sym].slice(0, 49)];
  }

  private applyPriceTick(sym: string, newPrice: number, isUp: boolean, _fromRemote = false) {
    if (sym === "USDT" || sym === "USDC") return; // Stablecoins NEVER tick
    const token = this.getToken(sym);
    if (!token || token.isStablecoin) return;
    token.numericPrice = newPrice;
    token.price = formatCoinPrice(newPrice);
    token.solPrice = `${(newPrice / 121.69).toFixed(6)} SOL`;
    this.injectCandleTick(sym, newPrice, isUp);
  }

  private injectCandleTick(sym: string, newPrice: number, isUp: boolean) {
    if (!this.candleSeries[sym]) return;
    Object.keys(this.candleSeries[sym]).forEach(tf => {
      const candles = this.candleSeries[sym][tf];
      if (!candles || candles.length === 0) return;
      const last = candles[candles.length - 1];
      last.close = newPrice;
      last.high = Math.max(last.high, newPrice);
      last.low = Math.min(last.low, newPrice);
      last.vol += isUp ? 2 : 1.5;
    });
  }

  activeSym: string = (typeof localStorage !== "undefined" && localStorage.getItem("axiom_selected_sym") && localStorage.getItem("axiom_selected_sym") !== "POPCAT") ? localStorage.getItem("axiom_selected_sym")! : "BTC";

  setActiveSym(sym: string) {
    this.activeSym = sym;
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("axiom_selected_sym", sym);
    }
    this.notify();
  }

  setDispMode(m: "Price" | "Mcap") {
    this.dispMode = m;
    this.notify();
  }

  setCurrMode(m: "USD" | "SOL") {
    this.currMode = m;
    this.notify();
  }

  setTimeframe(tf: string) {
    this.timeframe = tf;
    this.getCandles(this.activeSym, tf);
    this.loadRealCandles(this.activeSym, tf);
    this.notify();
  }

  // ── Central Live Engine: Realistic 1-second ticks & Order-flow momentum ────
  private startLiveTicker() {
    if (this.tickerInterval) clearInterval(this.tickerInterval);

    let tickCount = 0;
    this.tickerInterval = setInterval(() => {
      tickCount++;

      // Synchronously tick ALL major coins every second so Chrome, Safari, and Axiom PWA stay 100% unified
      const epochSec = Math.floor(Date.now() / 1000);
      const allMajorSyms = ["BTC", "ETH", "SOL", "BNB", "XRP", "DOGE", "ADA", "AVAX", "SUI"];
      const tokensToTickSet = new Set<string>(allMajorSyms);
      if (this.activeSym) tokensToTickSet.add(this.activeSym);

      // Every other tick, pick another random non-major token to tick
      if (tickCount % 2 === 0) {
        const eligible = this.tokens.filter(t => !tokensToTickSet.has(t.sym) && !t.isStablecoin && t.sym !== "USDT" && t.sym !== "USDC");
        if (eligible.length > 0) {
          const otherToken = eligible[Math.floor(Math.random() * eligible.length)];
          tokensToTickSet.add(otherToken.sym);
        }
      }

      const tokensToTick: MarketToken[] = [];
      tokensToTickSet.forEach(s => {
        const t = this.getToken(s);
        if (t) tokensToTick.push(t);
      });

      tokensToTick.forEach(token => {
        // Double check stablecoins never fluctuate
        if (token.isStablecoin || token.sym === "USDT" || token.sym === "USDC") {
          token.numericPrice = 1.0;
          token.price = "$1.00";
          token.solPrice = "0.00556 SOL";
          token.change = "+0.00%";
          token.changeNum = 0;
          return;
        }

        // Rugged tokens stay locked at $0.00000001 with -99.99% change
        const isRuggedToken = token.is_rugged || token.numericPrice <= 0.00000001 || token.price === "$0.00000001" || token.liq === "$0.00";
        if (isRuggedToken) {
          token.is_rugged = true;
          token.numericPrice = 0.00000001;
          token.price = "$0.00000001";
          token.solPrice = "0.00000000 SOL";
          token.change = "-99.99%";
          token.changeNum = -99.99;
          token.pos = false;
          token.liq = "$0.00";
          token.cap = "$10.00";
          token.fdv = "$10.00";

          // Keep active candle strictly flat on the zero floor during live intervals
          if (this.candleSeries[token.sym]) {
            const now = Date.now();
            Object.keys(this.candleSeries[token.sym]).forEach(tf => {
              const candles = this.candleSeries[token.sym][tf];
              if (!candles || candles.length === 0) return;
              const stepMs = this.getTfStepMs(tf);
              const currentInterval = Math.floor(now / stepMs) * stepMs;
              const last = candles[candles.length - 1];

              if (last.time === currentInterval) {
                last.close = 0.00000001;
                last.high = 0.00000001;
                last.low = 0.00000001;
                last.open = last.open > 0.00000001 ? last.open : 0.00000001;
              } else if (currentInterval > last.time) {
                if (candles.length >= 800) candles.shift();
                candles.push({
                  open: 0.00000001,
                  high: 0.00000001,
                  low: 0.00000001,
                  close: 0.00000001,
                  vol: 0,
                  time: currentInterval,
                });
              }
            });
          }

          // Slow, rare trade activity for rugged tokens:
          // User requirement: "it should not be showing users buy and selling anymore like it should be showing but not fast like before."
          // Extremely slow trickle (~once every 2.5 - 3 minutes on 1s ticks):
          // - Only "Sell" (bagholder dumping dust, no buys)
          // - Tiny dust amounts ($0.01 - $0.06)
          if (token.sym === this.activeSym && Math.random() < 0.006) {
            const dustUsd = Number((0.01 + Math.random() * 0.05).toFixed(2));
            const dustTokens = Number((dustUsd / 0.00000001).toFixed(0));
            const roster = TRADER_ROSTER[Math.floor(Math.random() * TRADER_ROSTER.length)];

            this.addTrade({
              sym: token.sym,
              type: "Sell",
              usd: dustUsd,
              tokenAmt: dustTokens,
              price: 0.00000001,
              trader: roster.addr,
              traderEmoji: "📉",
            });

            token.txns += 1;
            token.sells += 1;
            token.sellers += 1;
            token.traders = token.buyers + token.sellers;
          }

          return;
        }

        if (!this.priceAnchors[token.sym]) {
          this.priceAnchors[token.sym] = token.numericPrice;
        }
        if (this.momentums[token.sym] === undefined) {
          this.momentums[token.sym] = 0;
        }

        const isMajor = this.isMajorToken(token.sym);

        // Check if admin has set manual control
        let adminMode: string | null = null;
        let isBuy = true;
        let minUsd = 25;
        let maxUsd = 280;

        try {
          const ctrlRaw = typeof window !== "undefined" ? localStorage.getItem("axiom_admin_trade_control") : null;
          if (ctrlRaw) {
            const ctrl = JSON.parse(ctrlRaw);
            if (ctrl.mode === "only_buy") { adminMode = "only_buy"; isBuy = true; }
            else if (ctrl.mode === "only_sell") { adminMode = "only_sell"; isBuy = false; }
            else if (ctrl.mode === "heavy_buy") { adminMode = "heavy_buy"; isBuy = Math.random() < 0.88; }
            else if (ctrl.mode === "heavy_sell") { adminMode = "heavy_sell"; isBuy = Math.random() < 0.12; }
            else if (typeof ctrl.buyRatio === "number") { isBuy = (Math.random() * 100) < ctrl.buyRatio; }

            if (ctrl.minUsd && ctrl.maxUsd) {
              minUsd = Number(ctrl.minUsd);
              maxUsd = Math.max(minUsd + 10, Number(ctrl.maxUsd));
            }
          }
        } catch {
          // fallback
        }

        const epochSec = Math.floor(Date.now() / 1000);
        const anchor = this.priceAnchors[token.sym] || token.numericPrice;
        const synced = computeSynchronizedPrice(token, anchor, epochSec);
        const newP = synced.numericPrice;

        isBuy = adminMode === "only_buy" ? true : adminMode === "only_sell" ? false : synced.isBuy;
        if (isMajor) {
          minUsd = 60;
          maxUsd = 450;
        } else {
          minUsd = 15;
          maxUsd = 180;
        }

        token.numericPrice = newP;
        token.price = synced.formattedPrice;
        const liveSolP = this.getToken("SOL")?.numericPrice || 118.28;
        token.solPrice = `${(newP / liveSolP).toFixed(6)} SOL`;
        if (token.sparkline && token.sparkline.length > 0) {
          token.sparkline[token.sparkline.length - 1] = newP;
        }

        // Self-heal token.sellVol if zero or uninitialized
        if (!token.sellVol || token.sellVol <= 0.0001) {
          token.sellVol = Number((Math.max(0.018, (token.buyVol || 0.05) * 0.74)).toFixed(3));
          token.vol = (token.buyVol || 0.05) + token.sellVol;
        }

        // Live update user balance holding value if held
        if (this.balances[token.sym] && this.balances[token.sym].bal > 0) {
          this.balances[token.sym].usdValue = Number((this.balances[token.sym].bal * newP).toFixed(2));
        }

        // Update 24h change smoothly
        if (!BINANCE_MAJOR_SYMBOLS.has(token.sym)) {
          token.changeNum = Number((token.changeNum + synced.deltaPct * 100).toFixed(2));
          token.change = formatPercentage(token.changeNum);
          token.pos = token.changeNum >= 0;
        }

        // Auto-check and trigger any pending Limit and TP/SL orders
        this.checkPendingOrders(token);

        // Update candle series for this token strictly aligned to each timeframe interval
        if (this.candleSeries[token.sym]) {
          const now = Date.now();
          Object.keys(this.candleSeries[token.sym]).forEach(tf => {
            const candles = this.candleSeries[token.sym][tf];
            if (!candles || candles.length === 0) return;
            const stepMs = this.getTfStepMs(tf);
            const currentInterval = Math.floor(now / stepMs) * stepMs;
            const last = candles[candles.length - 1];

            if (last.time === currentInterval) {
              last.close = newP;
              last.high = Math.max(last.high, newP);
              last.low = Math.min(last.low, newP);
              last.vol += 0.25;
            } else if (currentInterval > last.time) {
              if (candles.length >= 800) candles.shift();
              candles.push({
                open: last.close,
                high: Math.max(last.close, newP),
                low: Math.min(last.close, newP),
                close: newP,
                vol: 4,
                time: currentInterval,
              });
            }
          });
        }

        // Organic live trade cadence (~68% chance each tick = 1.5-2.5s gaps)
        const shouldEmit = Math.random() < 0.68;
        if (token.sym === this.activeSym && shouldEmit) {
          const roster = TRADER_ROSTER[Math.floor(Math.random() * TRADER_ROSTER.length)];
          const usd = Number((minUsd + Math.random() * (maxUsd - minUsd)).toFixed(2));
          const tokenAmt = Number((usd / newP).toFixed(newP < 0.001 ? 0 : 2));

          this.addTrade({
            sym: token.sym,
            type: isBuy ? "Buy" : "Sell",
            usd,
            tokenAmt,
            price: newP,
            trader: roster.addr,
            traderEmoji: roster.emoji,
          });

          // Update metrics accurately without lossy toFixed truncating small trade volumes
          token.txns += 1;
          if (isBuy) {
            token.buys += 1;
            token.buyers += 1;
            token.buyVol = (token.buyVol || 0) + (usd / 1e6);
          } else {
            token.sells += 1;
            token.sellers += 1;
            token.sellVol = (token.sellVol || 0) + (usd / 1e6);
          }
          token.traders = token.buyers + token.sellers;
          token.vol = (token.buyVol || 0) + (token.sellVol || 0);
        }
      });

      this.notify();
    }, 1000); // Realistic 1.0s interval matching Bybit / TradingView
  }

  // Synchronously lock and realign all coins across tabs, PWA, and desktop instantly
  public forceSyncAllPrices() {
    this.fetchRealMarketData();
    const epochSec = Math.floor(Date.now() / 1000);
    this.tokens.forEach(token => {
      if (token.isStablecoin || token.sym === "USDT" || token.sym === "USDC" || token.sym === "USD") {
        token.numericPrice = 1.0;
        token.price = "$1.00";
        return;
      }
      if (token.is_rugged) return;
      const anchor = this.priceAnchors[token.sym] || token.numericPrice;
      const synced = computeSynchronizedPrice(token, anchor, epochSec);
      token.numericPrice = synced.numericPrice;
      token.price = synced.formattedPrice;
      if (!BINANCE_MAJOR_SYMBOLS.has(token.sym)) {
        token.change = formatPercentage(token.changeNum);
        token.pos = token.changeNum >= 0;
      }
      if (this.candleSeries[token.sym]) {
        Object.keys(this.candleSeries[token.sym]).forEach(tf => {
          const candles = this.candleSeries[token.sym][tf];
          if (candles && candles.length > 0) {
            const last = candles[candles.length - 1];
            last.close = synced.numericPrice;
            last.high = Math.max(last.high, synced.numericPrice);
            last.low = Math.min(last.low, synced.numericPrice);
          }
        });
      }
    });
    this.notify();
  }

  // ── Auto-execute Pending Limit and TP/SL Orders On Price Ticks ─────
  private checkPendingOrders(token: MarketToken) {
    if (!this.pendingOrders || this.pendingOrders.length === 0) return;
    const currentP = token.numericPrice;
    const ordersToKeep: PendingOrder[] = [];
    let stateChanged = false;

    for (const order of this.pendingOrders) {
      if (order.sym.toUpperCase() !== token.sym.toUpperCase()) {
        ordersToKeep.push(order);
        continue;
      }

      // Check Limit Orders
      if (order.type === "Limit") {
        if (order.side === "Buy" && order.targetPrice && currentP <= order.targetPrice) {
          // Trigger Limit Buy!
          const fillPrice = order.targetPrice;
          const tokensReceived = order.amount / fillPrice;
          if (!this.balances[order.sym]) {
            this.balances[order.sym] = { bal: 0, usdValue: 0, name: token.name, totalInvested: 0, avgBuyPrice: fillPrice };
          }
          const prevInvested = this.balances[order.sym].totalInvested || 0;
          this.balances[order.sym].bal += tokensReceived;
          this.balances[order.sym].usdValue = this.balances[order.sym].bal * currentP;
          this.balances[order.sym].totalInvested = Number((prevInvested + order.amount).toFixed(2));
          this.balances[order.sym].avgBuyPrice = this.balances[order.sym].bal > 0 ? this.balances[order.sym].totalInvested! / this.balances[order.sym].bal : fillPrice;

          this.addTrade({
            sym: order.sym,
            type: "Buy",
            usd: order.amount,
            tokenAmt: tokensReceived,
            price: fillPrice,
            trader: "JD...7b2",
            traderEmoji: "🎯",
            isUser: true,
          });

          this.userOrders.unshift({
            id: `exec-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            sym: order.sym,
            name: token.name,
            side: "Buy",
            amountUsd: order.amount,
            tokenAmt: tokensReceived,
            price: fillPrice,
            timestamp: Date.now(),
            dateStr: "just now",
            orderType: "Limit",
            triggerNote: `Limit Buy filled @ $${fillPrice < 0.001 ? fillPrice.toFixed(8) : fillPrice < 1 ? fillPrice.toFixed(4) : fillPrice.toFixed(2)}`,
          });

          this.lastOrderAlert = `🎯 Limit Buy executed! Bought ${tokensReceived >= 1000 ? tokensReceived.toLocaleString(undefined, { maximumFractionDigits: 1 }) : tokensReceived.toFixed(4)} ${order.sym} at $${fillPrice < 0.001 ? fillPrice.toFixed(8) : fillPrice < 1 ? fillPrice.toFixed(4) : fillPrice.toFixed(2)}`;
          stateChanged = true;
          continue;
        } else if (order.side === "Sell" && order.targetPrice && currentP >= order.targetPrice) {
          // Trigger Limit Sell!
          const fillPrice = order.targetPrice;
          const usdReceived = order.amount * fillPrice;
          const settlementSym = (this.balances["USDT"]?.bal || 0) > (this.balances["USDC"]?.bal || 0) ? "USDT" : "USDC";
          if (!this.balances[settlementSym]) {
            this.balances[settlementSym] = { bal: 0, usdValue: 0, name: settlementSym === "USDT" ? "Tether USD" : "USD Coin", totalInvested: 0, avgBuyPrice: 1.0 };
          }
          this.balances[settlementSym].bal += usdReceived;
          this.balances[settlementSym].usdValue = this.balances[settlementSym].bal;
          this.balances[settlementSym].totalInvested = this.balances[settlementSym].bal;

          this.addTrade({
            sym: order.sym,
            type: "Sell",
            usd: usdReceived,
            tokenAmt: order.amount,
            price: fillPrice,
            trader: "JD...7b2",
            traderEmoji: "💰",
            isUser: true,
          });

          this.userOrders.unshift({
            id: `exec-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            sym: order.sym,
            name: token.name,
            side: "Sell",
            amountUsd: usdReceived,
            tokenAmt: order.amount,
            price: fillPrice,
            timestamp: Date.now(),
            dateStr: "just now",
            orderType: "Limit",
            triggerNote: `Limit Sell filled @ $${fillPrice < 0.001 ? fillPrice.toFixed(8) : fillPrice < 1 ? fillPrice.toFixed(4) : fillPrice.toFixed(2)}`,
          });

          this.lastOrderAlert = `💰 Limit Sell executed! Sold ${order.amount >= 1000 ? order.amount.toLocaleString(undefined, { maximumFractionDigits: 1 }) : order.amount.toFixed(4)} ${order.sym} for $${usdReceived.toFixed(2)} cash!`;
          stateChanged = true;
          continue;
        }
      }

      // Check TP/SL Orders
      if (order.type === "TP/SL") {
        const orderBal = this.balances[order.sym]?.bal || 0;
        if (orderBal <= 0.000001) {
          // Token balance is zero; user closed this position, drop orphaned TP/SL
          stateChanged = true;
          continue;
        }
        if (order.tpPrice && currentP >= order.tpPrice) {
          // TAKE PROFIT TRIGGERED!
          const fillPrice = currentP;
          const sellAmt = Math.min(order.amount, this.balances[order.sym]?.bal || 0);
          if (sellAmt > 0) {
            const usdReceived = Number((sellAmt * fillPrice).toFixed(2));
            const prevBal = this.balances[order.sym].bal;
            const prevInvested = this.balances[order.sym].totalInvested || 0;
            const remainingRatio = Math.max(0, (prevBal - sellAmt) / prevBal);

            this.balances[order.sym].bal -= sellAmt;
            this.balances[order.sym].usdValue = this.balances[order.sym].bal * currentP;
            this.balances[order.sym].totalInvested = Number((prevInvested * remainingRatio).toFixed(2));
            this.balances[order.sym].avgBuyPrice = this.balances[order.sym].bal > 0 ? this.balances[order.sym].totalInvested! / this.balances[order.sym].bal : fillPrice;

            const settlementSym = "USDT";
            if (!this.balances[settlementSym]) {
              this.balances[settlementSym] = { bal: 0, usdValue: 0, name: "Tether USD", totalInvested: 0, avgBuyPrice: 1.0 };
            }
            this.balances[settlementSym].bal = Number((this.balances[settlementSym].bal + usdReceived).toFixed(2));
            this.balances[settlementSym].usdValue = this.balances[settlementSym].bal;
            this.balances[settlementSym].totalInvested = this.balances[settlementSym].bal;

            this.addTrade({
              sym: order.sym,
              type: "Sell",
              usd: usdReceived,
              tokenAmt: sellAmt,
              price: fillPrice,
              trader: "JD...7b2",
              traderEmoji: "🎯",
              isUser: true,
            });

            this.userOrders.unshift({
              id: `exec-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
              sym: order.sym,
              name: token.name,
              side: "Sell",
              amountUsd: usdReceived,
              tokenAmt: sellAmt,
              price: fillPrice,
              timestamp: Date.now(),
              dateStr: "just now",
              orderType: "TP/SL",
              triggerNote: `🚀 Take Profit (+${order.tpPct || ""}%): Sold for $${usdReceived.toFixed(2)} USDT cash`,
            });

            this.lastOrderAlert = `🚀 Take Profit Triggered! Sold ${sellAmt >= 1000 ? sellAmt.toLocaleString(undefined, { maximumFractionDigits: 1 }) : sellAmt.toFixed(4)} ${order.sym} for $${usdReceived.toFixed(2)} USDT (+${order.tpPct || ""}% Profit)!`;
            stateChanged = true;
            continue;
          }
        } else if (order.slPrice && currentP <= order.slPrice) {
          // STOP LOSS TRIGGERED!
          const fillPrice = currentP;
          const sellAmt = Math.min(order.amount, this.balances[order.sym]?.bal || 0);
          if (sellAmt > 0) {
            const usdReceived = Number((sellAmt * fillPrice).toFixed(2));
            const prevBal = this.balances[order.sym].bal;
            const prevInvested = this.balances[order.sym].totalInvested || 0;
            const remainingRatio = Math.max(0, (prevBal - sellAmt) / prevBal);

            this.balances[order.sym].bal -= sellAmt;
            this.balances[order.sym].usdValue = this.balances[order.sym].bal * currentP;
            this.balances[order.sym].totalInvested = Number((prevInvested * remainingRatio).toFixed(2));
            this.balances[order.sym].avgBuyPrice = this.balances[order.sym].bal > 0 ? this.balances[order.sym].totalInvested! / this.balances[order.sym].bal : fillPrice;

            const settlementSym = "USDT";
            if (!this.balances[settlementSym]) {
              this.balances[settlementSym] = { bal: 0, usdValue: 0, name: "Tether USD", totalInvested: 0, avgBuyPrice: 1.0 };
            }
            this.balances[settlementSym].bal = Number((this.balances[settlementSym].bal + usdReceived).toFixed(2));
            this.balances[settlementSym].usdValue = this.balances[settlementSym].bal;
            this.balances[settlementSym].totalInvested = this.balances[settlementSym].bal;

            this.addTrade({
              sym: order.sym,
              type: "Sell",
              usd: usdReceived,
              tokenAmt: sellAmt,
              price: fillPrice,
              trader: "JD...7b2",
              traderEmoji: "🛡️",
              isUser: true,
            });

            this.userOrders.unshift({
              id: `exec-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
              sym: order.sym,
              name: token.name,
              side: "Sell",
              amountUsd: usdReceived,
              tokenAmt: sellAmt,
              price: fillPrice,
              timestamp: Date.now(),
              dateStr: "just now",
              orderType: "TP/SL",
              triggerNote: `🛡️ Stop Loss (-${order.slPct || ""}%): Protected capital with $${usdReceived.toFixed(2)} USDT cash`,
            });

            this.lastOrderAlert = `🛡️ Stop Loss Triggered! Sold ${sellAmt >= 1000 ? sellAmt.toLocaleString(undefined, { maximumFractionDigits: 1 }) : sellAmt.toFixed(4)} ${order.sym} at $${fillPrice < 0.001 ? fillPrice.toFixed(8) : fillPrice < 1 ? fillPrice.toFixed(4) : fillPrice.toFixed(2)} to protect your capital.`;
            stateChanged = true;
            continue;
          }
        }
      }

      ordersToKeep.push(order);
    }

    if (stateChanged) {
      this.pendingOrders = ordersToKeep;
      this.savePersistedState();
      this.notify();
    }
  }
}

export const marketStore = new MarketStore();
