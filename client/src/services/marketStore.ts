// Global reactive market, balance, trades, and orderbook store
import {
  fetchGeckoMajors,
  fetchGeckoTrendingSolana,
  fetchGeckoCandles,
  fetchGeckoTrades,
} from "./geckoTerminal";
import { api } from "./api";

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
  is_rugged?: boolean;
  network?: string;
  poolAddress?: string;
  contractAddress?: string;
  imageUrl?: string;
  isMajor?: boolean;
  isStablecoin?: boolean;
  sparkline?: number[];
  isNew?: boolean;
  createdAt?: number;
  isMarketMakerActive?: boolean;
  customPrice?: boolean;
  user_holders_count?: number;
  total_user_buy_volume_usd?: number;
  user_circulating_tokens?: number;
  is_verified?: boolean;
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
  orderType?: "Market" | "Limit" | "TP/SL";
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

const INITIAL_TOKENS: MarketToken[] = [
  {
    sym: "BTC",
    name: "Bitcoin",
    price: "$85,850.00",
    numericPrice: 85850.00,
    solPrice: "730.64 SOL",
    change: "+5.61%",
    changeNum: 5.61,
    cap: "$1.72T",
    fdv: "$1.80T",
    liq: "$25.4M",
    pos: true,
    supply: 19750000,
    m5: { val: "0.22%", up: true },
    h1: { val: "0.98%", up: true },
    h6: { val: "3.10%", up: true },
    h24: { val: "5.61%", up: true },
    txns: 14250,
    buys: 7540,
    sells: 6710,
    vol: 450.2,
    buyVol: 240.5,
    sellVol: 209.7,
    traders: 8890,
    buyers: 4660,
    sellers: 4230,
    network: "eth",
    poolAddress: "0x99ac8ca7087fa4a2a1fb6357269965a2014abc35",
    imageUrl: "https://coin-images.coingecko.com/coins/images/1/large/bitcoin.png",
    isMajor: true,
    sparkline: generateSparkline(85850, true),
  },
  {
    sym: "ETH",
    name: "Ethereum",
    price: "$2,750.00",
    numericPrice: 2750.00,
    solPrice: "23.40 SOL",
    change: "+4.44%",
    changeNum: 4.44,
    cap: "$335.2B",
    fdv: "$335.2B",
    liq: "$118.6M",
    pos: true,
    supply: 120400000,
    m5: { val: "0.18%", up: true },
    h1: { val: "0.80%", up: true },
    h6: { val: "2.45%", up: true },
    h24: { val: "4.44%", up: true },
    txns: 12496,
    buys: 6499,
    sells: 5997,
    vol: 210.2,
    buyVol: 112.4,
    sellVol: 97.8,
    traders: 5940,
    buyers: 3119,
    sellers: 2821,
    network: "eth",
    poolAddress: "0x88e6a0c2ddd26feeb64f039a2c41296fcb3f5640",
    imageUrl: "https://coin-images.coingecko.com/coins/images/279/large/ethereum.png",
    isMajor: true,
    sparkline: generateSparkline(2750.00, true),
  },
  {
    sym: "SOL",
    name: "Solana",
    price: "$179.84",
    numericPrice: 179.84,
    solPrice: "1.0000 SOL",
    change: "+6.84%",
    changeNum: 6.84,
    cap: "$82.6B",
    fdv: "$105.8B",
    liq: "$38.5M",
    pos: true,
    supply: 459297153,
    m5: { val: "0.27%", up: true },
    h1: { val: "1.23%", up: true },
    h6: { val: "3.75%", up: true },
    h24: { val: "6.84%", up: true },
    txns: 135006,
    buys: 71014,
    sells: 63992,
    vol: 245.5,
    buyVol: 132.4,
    sellVol: 113.1,
    traders: 18257,
    buyers: 9878,
    sellers: 8379,
    network: "solana",
    poolAddress: "Czfq3xZZDmsdGdUyrNLtRhGc47cXcZtLG4crryfu44zE",
    imageUrl: "https://coin-images.coingecko.com/coins/images/4128/large/solana.png",
    isMajor: true,
    sparkline: generateSparkline(179.84, true),
  },
  {
    sym: "BNB",
    name: "BNB",
    price: "$796.00",
    numericPrice: 796.00,
    solPrice: "6.77 SOL",
    change: "+4.36%",
    changeNum: 4.36,
    cap: "$105.9B",
    fdv: "$105.9B",
    liq: "$42.4M",
    pos: true,
    supply: 145880000,
    m5: { val: "0.17%", up: true },
    h1: { val: "0.78%", up: true },
    h6: { val: "2.40%", up: true },
    h24: { val: "4.36%", up: true },
    txns: 5410,
    buys: 2950,
    sells: 2460,
    vol: 84.2,
    buyVol: 45.1,
    sellVol: 39.1,
    traders: 3450,
    buyers: 1880,
    sellers: 1570,
    network: "bsc",
    poolAddress: "0x58f876857a02d6762e0101bb5c46a8c1ed44dc16",
    imageUrl: "https://coin-images.coingecko.com/coins/images/825/large/bnb-icon2_2x.png",
    isMajor: true,
    sparkline: generateSparkline(796.00, true),
  },
  {
    sym: "XRP",
    name: "XRP",
    price: "$1.49",
    numericPrice: 1.49,
    solPrice: "0.0127 SOL",
    change: "+6.42%",
    changeNum: 6.42,
    cap: "$93.9B",
    fdv: "$149.0B",
    liq: "$31.8M",
    pos: true,
    supply: 56810000000,
    m5: { val: "0.25%", up: true },
    h1: { val: "1.15%", up: true },
    h6: { val: "3.50%", up: true },
    h24: { val: "6.42%", up: true },
    txns: 9850,
    buys: 5420,
    sells: 4430,
    vol: 76.8,
    buyVol: 42.5,
    sellVol: 34.3,
    traders: 6200,
    buyers: 3440,
    sellers: 2760,
    network: "bsc",
    poolAddress: "0x49246143De65451Cee6368C1C8518e974C68B1e2",
    imageUrl: "https://coin-images.coingecko.com/coins/images/44/large/xrp-symbol-white-128.png",
    isMajor: true,
    sparkline: generateSparkline(1.49, true),
  },
  {
    sym: "DOGE",
    name: "Dogecoin",
    price: "$0.0975",
    numericPrice: 0.0975,
    solPrice: "0.00083 SOL",
    change: "+11.87%",
    changeNum: 11.87,
    cap: "$15.2B",
    fdv: "$15.2B",
    liq: "$28.1M",
    pos: true,
    supply: 146400000000,
    m5: { val: "0.47%", up: true },
    h1: { val: "2.10%", up: true },
    h6: { val: "6.50%", up: true },
    h24: { val: "11.87%", up: true },
    txns: 12920,
    buys: 7220,
    sells: 5700,
    vol: 68.1,
    buyVol: 38.2,
    sellVol: 29.9,
    traders: 7900,
    buyers: 4500,
    sellers: 3400,
    network: "bsc",
    poolAddress: "0x78923d8c11e2f3d79f04ddb53c155d045d6540b6",
    imageUrl: "https://coin-images.coingecko.com/coins/images/5/large/dogecoin.png",
    isMajor: true,
    sparkline: generateSparkline(0.0975, true),
  },
  {
    sym: "ADA",
    name: "Cardano",
    price: "$0.243",
    numericPrice: 0.243,
    solPrice: "0.00207 SOL",
    change: "+6.07%",
    changeNum: 6.07,
    cap: "$9.11B",
    fdv: "$10.9B",
    liq: "$18.6M",
    pos: true,
    supply: 35740000000,
    m5: { val: "0.24%", up: true },
    h1: { val: "1.09%", up: true },
    h6: { val: "3.34%", up: true },
    h24: { val: "6.07%", up: true },
    txns: 6120,
    buys: 3380,
    sells: 2740,
    vol: 42.4,
    buyVol: 23.8,
    sellVol: 18.6,
    traders: 3950,
    buyers: 2180,
    sellers: 1770,
    network: "bsc",
    poolAddress: "0x403b2901ee7c963174fb24e54823293e62f026a2",
    imageUrl: "https://coin-images.coingecko.com/coins/images/975/large/cardano.png",
    isMajor: true,
    sparkline: generateSparkline(0.243, true),
  },
  {
    sym: "AVAX",
    name: "Avalanche",
    price: "$11.02",
    numericPrice: 11.02,
    solPrice: "0.0938 SOL",
    change: "-1.63%",
    changeNum: -1.63,
    cap: "$4.87B",
    fdv: "$7.93B",
    liq: "$14.2M",
    pos: false,
    supply: 406000000,
    m5: { val: "0.08%", up: false },
    h1: { val: "0.35%", up: false },
    h6: { val: "1.10%", up: false },
    h24: { val: "1.63%", up: false },
    txns: 5890,
    buys: 2680,
    sells: 3210,
    vol: 34.6,
    buyVol: 15.1,
    sellVol: 19.5,
    traders: 3700,
    buyers: 1690,
    sellers: 2010,
    network: "avax",
    poolAddress: "0xf4003f4efbe8691b60249e6afbc61791a8c38ff6",
    imageUrl: "https://coin-images.coingecko.com/coins/images/12559/large/Avalanche_Circle_RedWhite_Trans.png",
    isMajor: true,
    sparkline: generateSparkline(11.02, false),
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
  SOL: { bal: 0.00, usdValue: 0.00, name: "Solana", totalInvested: 0.00, avgBuyPrice: 179.84 },
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
  const times = ["30s ago", "1m ago", "2m ago", "2m ago", "2m ago", "2m ago", "3m ago", "4m ago", "5m ago", "7m ago"];
  const p = token.numericPrice;

  times.forEach((tStr, i) => {
    const isBuy = i % 3 !== 0;
    const usd = isBuy
      ? Number((5 + (i * 17.5 + (i % 2) * 120)).toFixed(2))
      : Number((9 + (i * 24.3 + (i % 3) * 800)).toFixed(2));
    const tokenAmt = Number((usd / p).toFixed(p < 0.001 ? 0 : 2));
    const solAmt = Number((usd / 179.84).toFixed(p < 0.001 ? 6 : 4));
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
  private momentums: Record<string, number> = {};
  private priceAnchors: Record<string, number> = {};

  constructor() {
    this.initVerifiedTokens();
    this.tokens.forEach(t => {
      this.trades[t.sym] = generateInitialTrades(t);
      this.priceAnchors[t.sym] = t.numericPrice;
      this.momentums[t.sym] = 0;
      t.is_verified = this.isTokenVerified(t.sym);
    });
    this.initSync();
    this.syncBackendTokens();
    this.sortTokensList();
    this.startLiveTicker();
    this.fetchRealMarketData();
    if (typeof window !== "undefined") {
      // 1. Ultra-fast backend token sync every 2 seconds: ensures cross-device pump/dump reflects instantly without page reload
      setInterval(() => {
        this.syncBackendTokens();
      }, 2000);

      // 2. Periodic external market data poll
      this.pollInterval = setInterval(() => {
        this.fetchRealMarketData();
      }, 14000);
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
    this.notify();
  }

  getAllVerifiedTokens(): Record<string, boolean> {
    return { ...this.verifiedTokens };
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
    try {
      const backendTokens = await api.getTokens();
      if (!Array.isArray(backendTokens) || backendTokens.length === 0) return false;

      let hasUpdates = false;
      const formatShort = (n: number) => {
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

        const numPrice = parseFloat(bt.current_price_usd) || 0.001;
        const numSupply = parseFloat(bt.total_supply) || 1000000000;
        const numCap = parseFloat(bt.market_cap_usd) || (numPrice * numSupply);
        const numLiq = parseFloat(bt.liquidity_usd) || 50000;
        const numChange = parseFloat(bt.change_24h) || 0;
        const contractAddr = (bt.contract_address || "").trim();

        const formattedPrice = numPrice < 0.001 ? `$${numPrice.toFixed(8)}` : numPrice < 1 ? `$${numPrice.toFixed(4)}` : `$${numPrice.toFixed(2)}`;
        const changeStr = numChange >= 0 ? `+${numChange.toFixed(2)}%` : `${numChange.toFixed(2)}%`;

        const idx = this.tokens.findIndex(t => t.sym === sym);
        if (idx >= 0) {
          const current = this.tokens[idx];
          const effectivePrice = numPrice > 0 ? numPrice : current.numericPrice;
          const effectiveFormatted = numPrice > 0 ? formattedPrice : current.price;

          const updated: MarketToken = {
            ...current,
            name: bt.name || current.name,
            contractAddress: contractAddr || current.contractAddress,
            poolAddress: contractAddr || current.poolAddress,
            imageUrl: bt.logo_url || current.imageUrl,
            numericPrice: effectivePrice,
            price: effectiveFormatted,
            solPrice: `${(effectivePrice / 179.84).toFixed(6)} SOL`,
            cap: formatShort(numCap),
            fdv: formatShort(numCap),
            liq: formatShort(numLiq),
            supply: numSupply,
            change: changeStr,
            changeNum: numChange,
            pos: numChange >= 0,
            is_rugged: bt.is_rugged !== undefined ? bt.is_rugged : current.is_rugged,
            sparkline: current.sparkline && current.sparkline.length > 1 ? current.sparkline : generateSparkline(effectivePrice, numChange >= 0),
            user_holders_count: bt.user_holders_count || 0,
            total_user_buy_volume_usd: bt.total_user_buy_volume_usd || 0,
            user_circulating_tokens: bt.user_circulating_tokens || 0,
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
            price: formattedPrice,
            numericPrice: numPrice,
            solPrice: `${(numPrice / 179.84).toFixed(6)} SOL`,
            change: changeStr,
            changeNum: numChange,
            cap: formatShort(numCap),
            fdv: formatShort(numCap),
            liq: formatShort(numLiq),
            pos: numChange >= 0,
            supply: numSupply,
            m5: { val: "0%", up: true, zero: true },
            h1: { val: "0%", up: true, zero: true },
            h6: { val: "0%", up: true, zero: true },
            h24: { val: "0%", up: true, zero: true },
            txns: 1,
            buys: 1,
            sells: 0,
            vol: Number((numLiq / 1e6).toFixed(2)),
            buyVol: Number((numLiq / 1e6).toFixed(2)),
            sellVol: 0,
            traders: 1,
            buyers: 1,
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
            sparkline: generateSparkline(numPrice, numChange >= 0),
            user_holders_count: bt.user_holders_count || 0,
            total_user_buy_volume_usd: bt.total_user_buy_volume_usd || 0,
            user_circulating_tokens: bt.user_circulating_tokens || 0,
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

      if (hasUpdates) {
        this.sortTokensList();
        this.savePersistedState();
        this.notify();
      }
      return hasUpdates;
    } catch (err) {
      console.warn("syncBackendTokens error:", err);
      return false;
    }
  }

  async fetchRealMarketData() {
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
                imageUrl: m.imageUrl || current.imageUrl,
                sparkline: current.sparkline || generateSparkline(m.numericPrice, m.pos),
              };
              this.priceAnchors[m.sym] = m.numericPrice;
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

  currentUserId: string = "";
  currentUserWallet: string = "";

  async setUser(user: { user_id?: string; id?: string; email?: string; wallet_address?: string } | null) {
    const uid = user ? (user.user_id || user.id || user.email || "") : "";
    const wallet = user?.wallet_address || "";

    this.currentUserId = uid;
    this.currentUserWallet = wallet;

    if (!uid) {
      this.balances = {
        USDT: { bal: 0.00, usdValue: 0.00, name: "Tether USD", totalInvested: 0.00, avgBuyPrice: 1.0 },
        USDC: { bal: 0.00, usdValue: 0.00, name: "USD Coin", totalInvested: 0.00, avgBuyPrice: 1.0 },
        SOL: { bal: 0.00, usdValue: 0.00, name: "Solana", totalInvested: 0.00, avgBuyPrice: 179.84 },
        BTC: { bal: 0.00, usdValue: 0.00, name: "Bitcoin", totalInvested: 0.00, avgBuyPrice: 77724.00 },
        ETH: { bal: 0.00, usdValue: 0.00, name: "Ethereum", totalInvested: 0.00, avgBuyPrice: 2650.00 },
      };
      this.userOrders = [];
      this.pendingOrders = [];
      this.notify();
      return;
    }

    // Clean legacy corrupted keys from previous testing
    if (typeof window !== "undefined" && window.localStorage) {
      try {
        window.localStorage.removeItem("axiom_balances_v11");
        window.localStorage.removeItem(`axiom_user_balances_v12_${uid}`);
        window.localStorage.removeItem(`axiom_user_balances_v11_${uid}`);
        window.localStorage.removeItem(`axiom_user_balances_v10_${uid}`);
      } catch { }
    }

    const key = `axiom_user_balances_v16_${uid}`;
    const saved = typeof window !== "undefined" ? window.localStorage.getItem(key) : null;
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === "object") {
          // If corrupted 50 BTC from old bug is present, sanitize it
          if (parsed.BTC && parsed.BTC.bal >= 1.0 && (!parsed.BTC.totalInvested || parsed.BTC.totalInvested < 50000)) {
            parsed.BTC.bal = 0;
            parsed.BTC.usdValue = 0;
            parsed.BTC.totalInvested = 0;
          }
          this.balances = { ...parsed };
        }
      } catch { }
    } else {
      // New account: strictly $0.00 across all assets
      this.balances = {
        USDT: { bal: 0.00, usdValue: 0.00, name: "Tether USD", totalInvested: 0.00, avgBuyPrice: 1.0 },
        USDC: { bal: 0.00, usdValue: 0.00, name: "USD Coin", totalInvested: 0.00, avgBuyPrice: 1.0 },
        SOL: { bal: 0.00, usdValue: 0.00, name: "Solana", totalInvested: 0.00, avgBuyPrice: 179.84 },
        BTC: { bal: 0.00, usdValue: 0.00, name: "Bitcoin", totalInvested: 0.00, avgBuyPrice: 77724.00 },
        ETH: { bal: 0.00, usdValue: 0.00, name: "Ethereum", totalInvested: 0.00, avgBuyPrice: 2650.00 },
      };
      this.userOrders = [];
      this.pendingOrders = [];
      this.savePersistedStateNow();
    }

    // Also sync live balances from backend database
    if (wallet) {
      try {
        const portfolio = await api.getPortfolio(wallet);
        if (portfolio && Array.isArray(portfolio.balances)) {
          // Check if local state already has user-traded balances (e.g. bought SOL or other coins)
          const hasLocalTrades = Object.entries(this.balances).some(
            ([s, b]) => s !== "USDT" && s !== "USDC" && (b?.bal || 0) > 0.000001
          );

          portfolio.balances.forEach((item: any) => {
            const sym = item.currency.toUpperCase();
            const amt = parseFloat(item.available_amount || "0") || 0;
            const localBal = this.balances[sym]?.bal || 0;

            // Protect local non-zero holdings from being reset to 0 by backend initial state
            if (hasLocalTrades && localBal > 0.000001 && amt <= 0.000001) {
              return;
            }

            // Protect spent cash from being reset back to 20 if user spent it on trades
            if (hasLocalTrades && (sym === "USDT" || sym === "USDC") && localBal < amt && localBal >= 0) {
              return;
            }

            if (this.balances[sym]) {
              this.balances[sym].bal = amt;
              const liveP = this.getToken(sym)?.numericPrice || parseFloat(item.price_usd || "1") || 1;
              this.balances[sym].usdValue = Number((amt * liveP).toFixed(2));
            } else if (amt > 0) {
              const liveP = this.getToken(sym)?.numericPrice || parseFloat(item.price_usd || "1") || 1;
              this.balances[sym] = {
                bal: amt,
                usdValue: Number((amt * liveP).toFixed(2)),
                name: sym,
                totalInvested: 0,
                avgBuyPrice: parseFloat(item.price_usd || "1") || liveP,
              };
            }
          });

          // Sync consolidated balances to backend DB so DB is in parity
          api.syncBalances(wallet, this.balances);
          this.savePersistedStateNow();
        }
      } catch { }
    }

    this.notify();
  }

  private saveTimeout: any = null;

  private savePersistedState() {
    if (typeof window === "undefined" || !window.localStorage) return;
    if (this.saveTimeout) clearTimeout(this.saveTimeout);
    this.saveTimeout = setTimeout(() => {
      try {
        window.localStorage.setItem("axiom_tokens_v3", JSON.stringify(this.tokens));
        if (this.currentUserId) {
          window.localStorage.setItem(`axiom_user_balances_v16_${this.currentUserId}`, JSON.stringify(this.balances));
          window.localStorage.setItem(`axiom_user_orders_v5_${this.currentUserId}`, JSON.stringify(this.userOrders));
          window.localStorage.setItem(`axiom_pending_orders_v5_${this.currentUserId}`, JSON.stringify(this.pendingOrders));
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
      window.localStorage.setItem("axiom_tokens_v3", JSON.stringify(this.tokens));
      if (this.currentUserId) {
        window.localStorage.setItem(`axiom_user_balances_v16_${this.currentUserId}`, JSON.stringify(this.balances));
        window.localStorage.setItem(`axiom_user_orders_v5_${this.currentUserId}`, JSON.stringify(this.userOrders));
        window.localStorage.setItem(`axiom_pending_orders_v5_${this.currentUserId}`, JSON.stringify(this.pendingOrders));
      }
      window.localStorage.setItem("axiom_anchors_v2", JSON.stringify(this.priceAnchors));
      window.localStorage.setItem("axiom_selected_sym", this.activeSym);
    } catch { }
  }

  private loadPersistedState() {
    if (typeof window === "undefined" || !window.localStorage) return;
    try {
      const savedTokens = window.localStorage.getItem("axiom_tokens_v3");
      if (savedTokens) {
        const parsed = JSON.parse(savedTokens);
        if (Array.isArray(parsed) && parsed.length > 0) {
          parsed.forEach((pt: MarketToken) => {
            // Guarantee SOL is never corrupted by meme tokens named "swift" or crushed to $29
            if (pt.sym === "SOL") {
              pt.name = "Solana";
              if (!pt.numericPrice || pt.numericPrice < 140 || pt.changeNum < -30) {
                pt.numericPrice = 179.84;
                pt.price = "$179.84";
                pt.solPrice = "1.0000 SOL";
                pt.change = "+6.84%";
                pt.changeNum = 6.84;
                pt.pos = true;
                pt.cap = "$82.6B";
                pt.fdv = "$105.8B";
                pt.sparkline = generateSparkline(179.84, true);
              }
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
          if (it.isMajor && (exists.is_rugged || exists.numericPrice < it.numericPrice * 0.75 || !exists.numericPrice || exists.name !== it.name || exists.changeNum < -30)) {
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
            delete this.candleSeries[exists.sym];
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
          SOL: { bal: 0.00, usdValue: 0.00, name: "Solana", totalInvested: 0.00, avgBuyPrice: 179.84 },
        };
        this.userOrders = [];
        this.pendingOrders = [];
        this.savePersistedState();
      } else {
        // Clean legacy un-scoped balance keys
        try {
          window.localStorage.removeItem("axiom_balances_v11");
          window.localStorage.removeItem("axiom_user_orders_v4");
          window.localStorage.removeItem("axiom_pending_orders_v4");
        } catch { }

        const userKey = this.currentUserId ? `axiom_user_balances_v12_${this.currentUserId}` : null;
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
            SOL: { bal: 0.00, usdValue: 0.00, name: "Solana", totalInvested: 0.00, avgBuyPrice: 179.84 },
          };
        }
        const userOrdersKey = this.currentUserId ? `axiom_user_orders_v5_${this.currentUserId}` : null;
        const savedOrders = userOrdersKey ? window.localStorage.getItem(userOrdersKey) : null;
        if (savedOrders) {
          try {
            const parsed = JSON.parse(savedOrders);
            if (Array.isArray(parsed)) this.userOrders = parsed;
          } catch { }
        }
        const userPendingKey = this.currentUserId ? `axiom_pending_orders_v5_${this.currentUserId}` : null;
        const savedPending = userPendingKey ? window.localStorage.getItem(userPendingKey) : null;
        if (savedPending) {
          try {
            const parsed = JSON.parse(savedPending);
            if (Array.isArray(parsed)) this.pendingOrders = parsed;
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
    const s = (sym || "").toUpperCase();
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

    const found = this.tokens.find(t => t.sym.toUpperCase() === s);
    if (found) return found;

    return this.tokens[0];
  }

  getBalances() {
    return this.balances;
  }

  // Calculate total balance ONLY from tokens with quantity > 0 in actual holdings
  getPortfolioValue(): number {
    let total = 0;
    Object.entries(this.balances).forEach(([sym, b]) => {
      if (b.bal > 0.000001) {
        if (sym === "USDC" || sym === "USDT") {
          total += b.bal; // Always $1.00 per stablecoin
        } else if (sym === "SOL") {
          const solToken = this.getToken("SOL");
          const p = solToken ? solToken.numericPrice : 179.84;
          total += b.bal * p;
        } else {
          const token = this.getToken(sym);
          if (token && token.numericPrice > 0 && !token.is_rugged) {
            total += b.bal * token.numericPrice;
          }
        }
      }
    });
    return total;
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

    // Calculate live 24h baseline derived strictly from user's actual owned holdings
    let calculatedBaseline = 0;
    let totalInvestedCrypto = 0;
    let totalCurrentCrypto = 0;

    Object.entries(this.balances).forEach(([sym, b]) => {
      if (b.bal > 0.000001) {
        if (sym === "USDC" || sym === "USDT") {
          calculatedBaseline += b.bal; // Stablecoins 24h ago were $1.00
        } else {
          const token = this.getToken(sym);
          const p = token ? token.numericPrice : (sym === "SOL" ? 179.84 : 0);
          if (p > 0) {
            const chgPct = token?.changeNum || 6.84;
            const p24h = p / (1 + chgPct / 100);
            calculatedBaseline += b.bal * p24h;

            const invested = b.totalInvested || (b.bal * (b.avgBuyPrice || p));
            totalInvestedCrypto += invested;
            totalCurrentCrypto += b.bal * p;
          }
        }
      }
    });

    if (calculatedBaseline <= 0) {
      calculatedBaseline = totalValue;
    }

    let diffUsd = totalValue - calculatedBaseline;
    let diffPct = calculatedBaseline > 0 ? (diffUsd / calculatedBaseline) * 100 : 0;

    // If user has bought crypto holdings, prioritize their actual trade profit & holding performance
    if (totalInvestedCrypto > 0) {
      const holdingPnl = totalCurrentCrypto - totalInvestedCrypto;
      if (Math.abs(holdingPnl) > 0.001) {
        diffUsd = holdingPnl;
        diffPct = (diffUsd / totalInvestedCrypto) * 100;
      }
    } else if (Math.abs(diffUsd) < 0.001 && totalValue > 0) {
      // If user holds cash balance ($20), reflect today's active Solana/crypto market momentum (+6.23%)
      // so the green percentage is never frozen dead at +$0.00 · 0.00%!
      const solToken = this.getToken("SOL");
      const btcToken = this.getToken("BTC");
      const avgChg = ((solToken?.changeNum || 6.84) + (btcToken?.changeNum || 5.61)) / 2;
      diffPct = Number(avgChg.toFixed(2));
      diffUsd = Number(((totalValue * diffPct) / 100).toFixed(2));
    }

    return {
      totalValue,
      baseline24h: calculatedBaseline,
      diffUsd,
      diffPct,
      isPositive: diffUsd >= 0,
    };
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

  // Deposit funds (Minimum: $5.00)
  depositFunds(sym: string, amount: number): { success: boolean; message: string } {
    if (amount <= 0 || isNaN(amount)) return { success: false, message: "Enter a valid deposit amount" };
    const token = this.getToken(sym);
    const p = (sym === "USDT" || sym === "USDC")
      ? 1.0
      : token && token.numericPrice > 0
        ? token.numericPrice
        : (sym === "SOL" ? 179.84 : sym === "BTC" ? 77724.0 : sym === "ETH" ? 2650.0 : 1.0);
    const usdVal = amount * p;
    if (usdVal < 4.90) {
      return { success: false, message: "Minimum deposit is $5.00" };
    }

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
    this.balances[sym].usdValue = this.balances[sym].bal * p;
    this.balances[sym].totalInvested = (this.balances[sym].totalInvested || 0) + usdVal;
    this.balances[sym].avgBuyPrice = p;

    this.savePersistedState();
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
    const b = this.balances[sym];
    const bal = b?.bal || 0;
    const token = this.getToken(sym);
    const isRugged = !!token?.is_rugged;
    const p = isRugged ? 0 : (token ? token.numericPrice : (sym === "SOL" ? 179.84 : sym === "USDC" || sym === "USDT" ? 1 : 0));
    const currentVal = bal * p;
    const invested = b?.totalInvested ?? (bal * (b?.avgBuyPrice || p));
    const pnlUsd = isRugged ? (bal > 0.000001 ? -invested : 0) : (bal > 0.000001 ? currentVal - invested : 0);
    const pnlPct = isRugged ? (invested > 0 ? -100 : 0) : (invested > 0 ? (pnlUsd / invested) * 100 : 0);
    const activeTpSl = this.pendingOrders.find(o => o.sym.toUpperCase() === sym.toUpperCase() && o.type === "TP/SL");
    const activeLimitOrders = this.pendingOrders.filter(o => o.sym.toUpperCase() === sym.toUpperCase() && o.type === "Limit");
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
    if (!this.trades[sym]) {
      const token = this.getToken(sym);
      this.trades[sym] = generateInitialTrades(token);
    }
    return this.trades[sym];
  }

  async loadRealTrades(sym: string) {
    if (this.loadingTrades.has(sym)) return;
    const token = this.getToken(sym);
    if (!token || !token.network || !token.poolAddress) return;

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

    const token = this.getToken(sym);
    const p = Math.max(0.00000001, token.numericPrice);
    const candles: Candle[] = [];
    // Deep historical candle dataset: 365 daily, 360 4-hour, 360 1-hour, 300 minutes
    const N = tf === "D" ? 365 : tf === "4h" ? 360 : tf === "1h" ? 360 : 300;
    const now = Date.now();
    const stepMs = this.getTfStepMs(tf);
    const currentInterval = Math.floor(now / stepMs) * stepMs;

    const isMajor = this.isMajorToken(sym);

    // Natural timeframe volatility tuning
    let volMult = 1.0;
    if (tf === "1s") volMult = 0.25;
    else if (tf === "1m") volMult = 0.70;
    else if (tf === "5m") volMult = 1.15;
    else if (tf === "15m") volMult = 1.65;
    else if (tf === "1h") volMult = 2.40;
    else volMult = 3.50;

    if (isMajor) volMult *= 0.45;

    // Window coverage relative to 24h: 1m (3 hrs) only drifts a fraction of 24h change
    const windowCoverage = Math.min(0.7, (N * (stepMs / 1000)) / 86400);
    const changeNum = token.changeNum || 0;
    const trendTotal = (Math.max(-20, Math.min(20, changeNum)) / 100) * p * windowCoverage * 0.5;

    // Organic multi-harmonic market cycles:
    // Wave 1: ~26-candle cycle (creates visible swing highs & swing lows in a 40-candle window)
    // Wave 2: ~11-candle cycle (local momentum consolidation)
    // Wave 3: ~65-candle cycle (broader structural wave)
    const w1 = (2 * Math.PI) / 26;
    const w2 = (2 * Math.PI) / 11;
    const w3 = (2 * Math.PI) / 65;

    const amp1 = p * 0.0042 * volMult;
    const amp2 = p * 0.0020 * volMult;
    const amp3 = p * 0.0068 * volMult;

    // Accumulated stochastic random walk backward from current price (strictly 0 at k = 0)
    const noise = new Array(N).fill(0);
    let accumulatedNoise = 0;
    const microVol = p * 0.0011 * volMult;

    for (let k = 1; k < N; k++) {
      // Mean-revert noise towards zero to prevent runaway drift
      accumulatedNoise = accumulatedNoise * 0.94 + (Math.random() - 0.5) * microVol;
      noise[k] = accumulatedNoise;
    }

    const closes = new Array(N);
    for (let k = 0; k < N; k++) {
      const i = N - 1 - k;
      // Because sin(0) = 0 and noise[0] = 0, at k = 0 (i = N - 1), harmonic + noise = 0
      const harmonic = amp1 * Math.sin(k * w1) + amp2 * Math.sin(k * w2) + amp3 * Math.sin(k * w3);
      const trend = -trendTotal * (k / (N - 1)); // older bars were lower if trendTotal > 0
      closes[i] = Math.max(p * 0.001, p + harmonic + trend + noise[k]);
    }
    // Mathematically guarantee current candle close is exactly live token price p
    closes[N - 1] = p;

    // Construct authentic candlestick bars with strict continuity (open[i] = close[i-1]) and realistic wicks
    for (let i = 0; i < N; i++) {
      const close = closes[i];
      const open = i === 0 ? close * (1 - (Math.random() - 0.5) * 0.001 * volMult) : closes[i - 1];

      const bodyHigh = Math.max(open, close);
      const bodyLow = Math.min(open, close);
      const bodySize = bodyHigh - bodyLow;

      // Realistic market wicks: natural upper & lower shadow rejections
      const baseWick = Math.max(p * 0.0003 * volMult, bodySize * 0.35);
      const upperWick = Math.random() * baseWick * (Math.random() > 0.85 ? 2.2 : 1.1);
      const lowerWick = Math.random() * baseWick * (Math.random() > 0.85 ? 2.2 : 1.1);

      const high = bodyHigh + upperWick;
      const low = Math.max(p * 0.0005, bodyLow - lowerWick);
      const vol = 20 + Math.random() * 80;

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

  // ── Place User Order with Real Balance Deduction ──────────────────
  placeOrder(params: {
    sym: string;
    side: "Buy" | "Sell";
    amount: number; // in quote currency (USDC) for Buy, or in token units for Sell
  }): { success: boolean; message: string; tokensExchanged?: number; usdcExchanged?: number } {
    const { sym, side, amount } = params;
    const token = this.getToken(sym);
    if (!token) return { success: false, message: "Token not found" };
    if (token.is_rugged) {
      return { success: false, message: `⚠️ Cannot trade $${sym}: Market liquidity has been exhausted.` };
    }

    const p = token.numericPrice;

    if (side === "Buy") {
      // User pays cash (USDT / USDC), receives Token
      const availableUsdt = this.balances["USDT"]?.bal || 0;
      const availableUsdc = this.balances["USDC"]?.bal || 0;
      const totalCash = availableUsdt + availableUsdc;

      if (amount <= 0) return { success: false, message: "Enter an amount greater than 0" };
      if (amount > totalCash) {
        return { success: false, message: `Insufficient cash balance! Available: $${totalCash.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (USDT: $${availableUsdt.toFixed(2)}, USDC: $${availableUsdc.toFixed(2)})` };
      }

      const tokensReceived = amount / p;
      let remaining = amount;
      let usedSym = "USDT";

      // Deduct from USDT first if available, then USDC
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

      if (!this.balances[sym]) {
        this.balances[sym] = { bal: 0, usdValue: 0, name: token.name, totalInvested: 0, avgBuyPrice: p };
      }

      const prevInvested = this.balances[sym].totalInvested || 0;
      const newInvested = Number((prevInvested + amount).toFixed(2));

      this.balances[sym].bal += tokensReceived;
      this.balances[sym].usdValue = this.balances[sym].bal * p;
      this.balances[sym].totalInvested = newInvested;
      this.balances[sym].avgBuyPrice = this.balances[sym].bal > 0 ? newInvested / this.balances[sym].bal : p;

      // Add trade to Recent Trades
      this.addTrade({
        sym,
        type: "Buy",
        usd: amount,
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
        amountUsd: amount,
        tokenAmt: tokensReceived,
        price: p,
        timestamp: Date.now(),
        dateStr: "just now",
      };
      this.userOrders.unshift(userOrder);
      if (this.userOrders.length > 50) this.userOrders = this.userOrders.slice(0, 50);

      // Dynamic real-time price impact with persistent memory
      const isMajor = this.isMajorToken(sym);
      const impactRatio = isMajor
        ? Math.min(0.005, (amount / 2000000))
        : Math.min(0.12, Math.max(0.015, amount / (p * 50000 + 500)));
      const newP = p * (1 + impactRatio);

      this.priceAnchors[sym] = newP;
      this.momentums[sym] = Math.min(0.08, (this.momentums[sym] || 0) + impactRatio * 0.7);
      token.customPrice = true;
      token.isMarketMakerActive = true;
      this.applyPriceTick(sym, newP, true);

      // Update buyers counters
      token.txns += 1;
      token.buys += 1;
      token.buyers += 1;
      token.traders = token.buyers + token.sellers;
      token.buyVol = Number((token.buyVol + amount / 1e6).toFixed(2));
      token.vol = Number((token.buyVol + token.sellVol).toFixed(1));

      this.savePersistedState();
      if (this.currentUserWallet) {
        api.syncBalances(this.currentUserWallet, this.balances, {
          sym,
          type: "Buy",
          usd: amount,
          tokenAmt: tokensReceived,
          price: p,
        });
      }
      this.notify();
      return {
        success: true,
        message: `Bought ${tokensReceived >= 1000 ? tokensReceived.toLocaleString(undefined, { maximumFractionDigits: 1 }) : tokensReceived.toFixed(4)} ${sym} for $${amount.toFixed(2)} ${usedSym}!`,
        tokensExchanged: tokensReceived,
        usdcExchanged: amount,
      };
    } else {
      // User pays Token, receives cash credit
      const availableToken = this.balances[sym]?.bal || 0;
      if (amount <= 0) return { success: false, message: "Enter an amount greater than 0" };
      if (amount > availableToken) {
        return { success: false, message: `Insufficient ${sym} balance! Available: ${availableToken.toLocaleString()}` };
      }

      const usdcReceived = Number((amount * p).toFixed(2));
      const prevBal = this.balances[sym].bal;
      const prevInvested = this.balances[sym].totalInvested || (prevBal * p);
      const remainingRatio = Math.max(0, (prevBal - amount) / prevBal);
      const newInvested = Number((prevInvested * remainingRatio).toFixed(2));

      this.balances[sym].bal = Math.max(0, this.balances[sym].bal - amount);
      this.balances[sym].usdValue = Number((this.balances[sym].bal * p).toFixed(2));
      this.balances[sym].totalInvested = newInvested;
      this.balances[sym].avgBuyPrice = this.balances[sym].bal > 0 ? newInvested / this.balances[sym].bal : p;

      // Credit proceeds strictly to user's stablecoin cash balance (USDT or USDC)
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
      this.balances[settlementSym].bal = Number((this.balances[settlementSym].bal + usdcReceived).toFixed(2));
      this.balances[settlementSym].usdValue = this.balances[settlementSym].bal;
      this.balances[settlementSym].totalInvested = this.balances[settlementSym].bal;

      // Add trade to Recent Trades
      this.addTrade({
        sym,
        type: "Sell",
        usd: usdcReceived,
        tokenAmt: amount,
        price: p,
        trader: "JD...7b2",
        traderEmoji: "⚡",
        isUser: true,
      });

      // Record in User Orders
      const userOrder: UserOrder = {
        id: `order-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        sym,
        name: token.name,
        side: "Sell",
        amountUsd: usdcReceived,
        tokenAmt: amount,
        price: p,
        timestamp: Date.now(),
        dateStr: "just now",
      };
      this.userOrders.unshift(userOrder);
      if (this.userOrders.length > 50) this.userOrders = this.userOrders.slice(0, 50);

      // Dynamic real-time price impact with persistent memory
      const isMajor = this.isMajorToken(sym);
      const impactRatio = isMajor
        ? Math.min(0.005, (usdcReceived / 2000000))
        : Math.min(0.12, Math.max(0.015, usdcReceived / (p * 50000 + 500)));
      const newP = Math.max(0.00000001, p * (1 - impactRatio));

      this.priceAnchors[sym] = newP;
      this.momentums[sym] = Math.max(-0.08, (this.momentums[sym] || 0) - impactRatio * 0.7);
      token.customPrice = true;
      token.isMarketMakerActive = true;
      this.applyPriceTick(sym, newP, false);

      // Update sellers counters
      token.txns += 1;
      token.sells += 1;
      token.sellers += 1;
      token.traders = token.buyers + token.sellers;
      token.sellVol = Number((token.sellVol + usdcReceived / 1e6).toFixed(2));
      token.vol = Number((token.buyVol + token.sellVol).toFixed(1));

      this.notify();
      this.broadcast({
        type: "ORDER_PLACED",
        payload: {
          sym,
          balances: this.balances,
          trade: this.trades[sym]?.[0],
          newPrice: p * 0.998,
          isUp: false,
        },
      });
      this.savePersistedState();
      if (this.currentUserWallet) {
        api.syncBalances(this.currentUserWallet, this.balances, {
          sym,
          type: "Sell",
          usd: usdcReceived,
          tokenAmt: amount,
          price: p,
        });
      }

      return {
        success: true,
        message: `Sold ${amount >= 1000 ? amount.toLocaleString(undefined, { maximumFractionDigits: 1 }) : amount.toFixed(4)} ${sym} for $${usdcReceived.toFixed(2)} USDT!`,
        tokensExchanged: amount,
        usdcExchanged: usdcReceived,
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
  }): { success: boolean; message: string; orderId?: string } {
    const { sym, side, amount, targetPrice } = params;
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
        const orderRes = this.placeOrder({ sym, side: "Buy", amount });
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
      SOL: { bal: 0.00, usdValue: 0.00, name: "Solana", totalInvested: 0.00, avgBuyPrice: 179.84 },
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
    if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
    if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
    if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
    return `$${n.toFixed(2)}`;
  }

  pumpToken(sym: string, percent: number, fromRemote = false) {
    const token = this.getToken(sym);
    if (!token) return;
    const factor = 1 + percent / 100;
    const newPrice = token.numericPrice * factor;

    token.numericPrice = newPrice;
    token.price = newPrice < 0.001 ? `$${newPrice.toFixed(8)}` : newPrice < 1 ? `$${newPrice.toFixed(4)}` : `$${newPrice.toFixed(2)}`;
    token.solPrice = `${(newPrice / 179.84).toFixed(6)} SOL`;
    token.changeNum = Number((token.changeNum + percent).toFixed(2));
    token.change = `${token.changeNum >= 0 ? "+" : ""}${token.changeNum.toFixed(2)}%`;
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
    token.buyers = (token.buyers || 0) + 1;
    token.traders = (token.traders || 0) + 1;

    // Timeframe momentum indicators update
    token.m5 = { val: `+${Math.min(99.9, Math.abs(percent) * 0.35).toFixed(2)}%`, up: true };
    token.h1 = { val: `+${Math.min(250, Math.abs(percent) * 0.75).toFixed(2)}%`, up: true };
    token.h6 = { val: `+${Math.abs(percent).toFixed(2)}%`, up: true };
    token.h24 = { val: `${token.changeNum >= 0 ? "+" : ""}${token.changeNum.toFixed(2)}%`, up: token.changeNum >= 0 };

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

    if (this.currentUserWallet) {
      api.syncBalances(this.currentUserWallet, this.balances).catch(() => { });
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
    const token = this.getToken(sym);
    if (!token) return;
    const oldPrice = token.numericPrice || 0.001;
    const newPrice = oldPrice + dollarAmount;
    const pct = oldPrice > 0 ? ((newPrice - oldPrice) / oldPrice) * 100 : 10;
    this.pumpToken(sym, Number(pct.toFixed(4)), fromRemote);
  }

  dumpTokenDollar(sym: string, dollarAmount: number, fromRemote = false) {
    const token = this.getToken(sym);
    if (!token) return;
    const oldPrice = token.numericPrice || 0.001;
    const newPrice = Math.max(0.00000001, oldPrice - dollarAmount);
    const pct = oldPrice > 0 ? ((oldPrice - newPrice) / oldPrice) * 100 : 10;
    this.dumpToken(sym, Number(pct.toFixed(4)), fromRemote);
  }

  setTokenTargetPrice(sym: string, targetPrice: number, fromRemote = false) {
    const token = this.getToken(sym);
    if (!token) return;
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
    const token = this.getToken(sym);
    if (!token) return;
    const factor = Math.max(0.00000001, 1 - percent / 100);
    const newPrice = Math.max(0.00000001, token.numericPrice * factor);

    token.numericPrice = newPrice;
    token.price = newPrice < 0.001 ? `$${newPrice.toFixed(8)}` : newPrice < 1 ? `$${newPrice.toFixed(4)}` : `$${newPrice.toFixed(2)}`;
    token.solPrice = `${(newPrice / 179.84).toFixed(6)} SOL`;
    token.changeNum = Number((token.changeNum - percent).toFixed(2));
    token.change = `${token.changeNum >= 0 ? "+" : ""}${token.changeNum.toFixed(2)}%`;
    token.pos = token.changeNum >= 0;
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
    token.h24 = { val: `${token.changeNum >= 0 ? "+" : ""}${token.changeNum.toFixed(2)}%`, up: token.changeNum >= 0 };

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

    if (this.currentUserWallet) {
      api.syncBalances(this.currentUserWallet, this.balances).catch(() => { });
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

    token.numericPrice = 0;
    token.price = `$0.00`;
    token.solPrice = "0.00000000 SOL";
    token.change = "-100.00%";
    token.changeNum = -100.00;
    token.pos = false;
    token.liq = "$0.00";
    token.cap = "$0.00";
    token.fdv = "$0.00";
    token.is_rugged = true;
    token.isMarketMakerActive = true;
    token.customPrice = true;
    token.sparkline = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

    // Anchor locked to 0 permanently
    this.priceAnchors[sym] = 0;
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
    }
    this.savePersistedStateNow();
    if (this.currentUserWallet) {
      api.syncBalances(this.currentUserWallet, this.balances).catch(() => { });
    }

    this.notify();
  }

  setTokenPrice(sym: string, price: number, change24h?: number, fromRemote = false) {
    const token = this.getToken(sym);
    if (!token) return;
    const newPrice = Math.max(0.00000001, price);
    token.numericPrice = newPrice;
    token.price = newPrice < 0.001 ? `$${newPrice.toFixed(8)}` : newPrice < 1 ? `$${newPrice.toFixed(4)}` : `$${newPrice.toFixed(2)}`;
    token.solPrice = `${(newPrice / 179.84).toFixed(6)} SOL`;
    if (change24h !== undefined) {
      token.changeNum = Number(change24h.toFixed(2));
      token.change = `${token.changeNum >= 0 ? "+" : ""}${token.changeNum.toFixed(2)}%`;
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

    if (this.currentUserWallet) {
      api.syncBalances(this.currentUserWallet, this.balances).catch(() => { });
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
    description?: string;
  }, fromRemote = false) {
    const sym = params.symbol.toUpperCase();
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
      price: numPrice < 0.001 ? `$${numPrice.toFixed(8)}` : numPrice < 1 ? `$${numPrice.toFixed(4)}` : `$${numPrice.toFixed(2)}`,
      numericPrice: numPrice,
      solPrice: `${(numPrice / 179.84).toFixed(6)} SOL`,
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
      vol: Number((numLiq / 1e6).toFixed(2)),
      buyVol: Number((numLiq / 1e6).toFixed(2)),
      sellVol: 0,
      traders: 1,
      buyers: 1,
      sellers: 0,
      network: "solana",
      poolAddress: poolAddr,
      contractAddress: poolAddr,
      imageUrl: fallbackImg,
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
    change?: string;
    description?: string;
  }, fromRemote = false): { success: boolean; message: string } {
    const s = sym.toUpperCase();
    const token = this.getToken(s);
    if (!token) return { success: false, message: `Token $${s} not found.` };

    token.isMarketMakerActive = true;
    token.customPrice = true;

    if (updates.name && updates.name.trim()) token.name = updates.name.trim();
    if (updates.contractAddress && updates.contractAddress.trim()) {
      token.contractAddress = updates.contractAddress.trim();
      token.poolAddress = updates.contractAddress.trim();
    }
    if (updates.imageUrl && updates.imageUrl.trim()) token.imageUrl = updates.imageUrl.trim();

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
        token.price = numP < 0.001 ? `$${numP.toFixed(8)}` : numP < 1 ? `$${numP.toFixed(4)}` : `$${numP.toFixed(2)}`;
        token.solPrice = `${(numP / 179.84).toFixed(6)} SOL`;
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

    if (!fromRemote && (this.balances[fSym].bal < fromAmt || fromAmt <= 0)) {
      return {
        success: false,
        message: `Insufficient ${fSym} balance! You have ${this.balances[fSym].bal.toFixed(4)} ${fSym}.`,
      };
    }

    const fromToken = this.getToken(fSym);
    const toToken = this.getToken(tSym);
    const fromPrice = (fSym === "USDT" || fSym === "USDC") ? 1.0 : (fromToken?.numericPrice || 1.0);
    const toPrice = (tSym === "USDT" || tSym === "USDC") ? 1.0 : (toToken?.numericPrice || 1.0);
    const usdValue = Number((fromAmt * fromPrice).toFixed(2));

    // Deduct source asset
    this.balances[fSym].bal = Math.max(0, Number((this.balances[fSym].bal - fromAmt).toFixed(6)));
    this.balances[fSym].usdValue = Number((this.balances[fSym].bal * fromPrice).toFixed(2));
    if (this.balances[fSym].bal <= 0.000001) {
      this.balances[fSym].bal = 0;
      this.balances[fSym].usdValue = 0;
      this.balances[fSym].totalInvested = 0;
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
      orderType: "Market",
      triggerNote: `Instant Swap: ${fromAmt} ${fSym} ➔ ${toAmt >= 1000 ? toAmt.toLocaleString(undefined, { maximumFractionDigits: 1 }) : toAmt.toFixed(4)} ${tSym}`,
    });

    if (!fromRemote) {
      this.broadcast({ type: "SWAP_TOKENS", payload: { fromSym, toSym, fromAmt, toAmt } });
      this.savePersistedStateNow();
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
      solAmt: Number((trade.usd / 179.84).toFixed(4)),
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
    token.price = newPrice < 0.001 ? `$${newPrice.toFixed(8)}` : newPrice < 1 ? `$${newPrice.toFixed(4)}` : `$${newPrice.toFixed(2)}`;
    token.solPrice = `${(newPrice / 179.84).toFixed(6)} SOL`;
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

      // Active symbol always ticks so user sees continuous action (unless stablecoin)
      const activeToken = this.getToken(this.activeSym);
      const tokensToTick: MarketToken[] = [];
      if (activeToken && !activeToken.isStablecoin && activeToken.sym !== "USDT" && activeToken.sym !== "USDC") {
        tokensToTick.push(activeToken);
      }

      // Every other tick, pick another random token (excluding stablecoins)
      if (tickCount % 2 === 0) {
        const eligible = this.tokens.filter(t => !t.isStablecoin && t.sym !== "USDT" && t.sym !== "USDC" && t.sym !== this.activeSym);
        if (eligible.length > 0) {
          const otherToken = eligible[Math.floor(Math.random() * eligible.length)];
          tokensToTick.push(otherToken);
        }
      }

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

        // Rugged tokens stay locked at $0.00000001
        if (token.is_rugged) {
          token.numericPrice = 0.00000001;
          token.price = "$0.00000001";
          token.solPrice = "0.00000001 SOL";
          token.change = "-99.99%";
          token.changeNum = -99.99;
          token.liq = "$0.00";
          return;
        }

        if (!this.priceAnchors[token.sym]) {
          this.priceAnchors[token.sym] = token.numericPrice;
        }
        if (this.momentums[token.sym] === undefined) {
          this.momentums[token.sym] = 0;
        }

        const isMajor = this.isMajorToken(token.sym);

        // Slowly update anchor every 90 ticks so organic trends can develop
        if (tickCount % 90 === 0) {
          this.priceAnchors[token.sym] = token.numericPrice;
        }

        const anchor = this.priceAnchors[token.sym];
        const driftRatio = (token.numericPrice - anchor) / anchor;
        const revertForce = -driftRatio * (isMajor ? 0.02 : 0.005); // major coins strongly anchor to real market price

        // Real market order-flow simulation (like Bybit):
        this.momentums[token.sym] *= (isMajor ? 0.6 : 0.86);
        const microNoise = (Math.random() - 0.495) * (isMajor ? 0.00003 : 0.00018);
        let deltaPct = this.momentums[token.sym] + microNoise + revertForce;

        // Hard realistic tick clamp: max ±0.01% for majors, ±0.06% for memes
        const maxDelta = isMajor ? 0.0001 : 0.0006;
        deltaPct = Math.max(-maxDelta, Math.min(maxDelta, deltaPct));

        const newP = Math.max(0.00000001, token.numericPrice * (1 + deltaPct));
        token.numericPrice = newP;
        token.price = newP < 0.001 ? `$${newP.toFixed(8)}` : newP < 1 ? `$${newP.toFixed(4)}` : `$${newP.toFixed(2)}`;
        token.solPrice = `${(newP / 179.84).toFixed(6)} SOL`;
        if (token.sparkline && token.sparkline.length > 0) {
          token.sparkline[token.sparkline.length - 1] = newP;
        }

        // Live update user balance holding value if held
        if (this.balances[token.sym] && this.balances[token.sym].bal > 0) {
          this.balances[token.sym].usdValue = Number((this.balances[token.sym].bal * newP).toFixed(2));
        }

        // Update 24h change smoothly
        token.changeNum = Number((token.changeNum + deltaPct * 3).toFixed(2));
        token.change = `${token.changeNum >= 0 ? "+" : ""}${token.changeNum.toFixed(2)}%`;
        token.pos = token.changeNum >= 0;

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
              // Same candle interval: gentle live update
              last.close = newP;
              last.high = Math.max(last.high, newP);
              last.low = Math.min(last.low, newP);
              last.vol += 0.15;
            } else if (currentInterval > last.time) {
              // Current timeframe interval has rolled over! Open next candle
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

        // Live simulated trades with admin-controllable Buy vs. Sell direction and size
        let isBuy = Math.random() > 0.48;
        let minUsd = 15;
        let maxUsd = 240;

        try {
          const ctrlRaw = typeof window !== "undefined" ? localStorage.getItem("axiom_admin_trade_control") : null;
          if (ctrlRaw) {
            const ctrl = JSON.parse(ctrlRaw);
            if (ctrl.mode === "only_buy") isBuy = true;
            else if (ctrl.mode === "only_sell") isBuy = false;
            else if (ctrl.mode === "heavy_buy") isBuy = Math.random() < 0.88;
            else if (ctrl.mode === "heavy_sell") isBuy = Math.random() < 0.12;
            else if (typeof ctrl.buyRatio === "number") isBuy = (Math.random() * 100) < ctrl.buyRatio;

            if (ctrl.minUsd && ctrl.maxUsd) {
              minUsd = Number(ctrl.minUsd);
              maxUsd = Math.max(minUsd + 10, Number(ctrl.maxUsd));
            }
          }
        } catch {
          // fallback
        }

        if (token.sym === this.activeSym && Math.random() < 0.35) {
          // Major coins have deep liquidity, almost zero retail price impact
          this.momentums[token.sym] += isMajor
            ? (isBuy ? 0.000008 : -0.000008)
            : (isBuy ? 0.00008 : -0.00008);

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

          // Update metrics
          token.txns += 1;
          if (isBuy) {
            token.buys += 1;
            token.buyers += 1;
            token.buyVol = Number((token.buyVol + usd / 1e6).toFixed(2));
          } else {
            token.sells += 1;
            token.sellers += 1;
            token.sellVol = Number((token.sellVol + usd / 1e6).toFixed(2));
          }
          token.traders = token.buyers + token.sellers;
          token.vol = Number((token.buyVol + token.sellVol).toFixed(1));
        }
      });

      this.notify();
    }, 1000); // Realistic 1.0s interval matching Bybit / TradingView
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
