import { useState, useEffect } from "react";
import {
  ChevronLeft, ChevronRight, Eye, EyeOff, Copy, Check, ShieldAlert,
  Sparkles, KeyRound, ArrowRight, Loader2, CheckCircle2,
  Lock, Zap, Shield, TrendingUp, Activity, Sun, Moon, Wallet,
  ShieldCheck, Cpu, Flame, Layers, ChevronDown
} from "lucide-react";
import {
  generateSeedPhrase, registerPhantomWallet, unlockPhantomWallet,
  getStoredWalletAddress, setStoredWalletAddress, clearStoredWalletAddress,
  type AuthUser
} from "../../services/authService";
import { useTheme } from "../../services/themeContext";
import { copyToClipboard } from "../../services/clipboard";
import { CountrySelectModal } from "../modals/CountrySelectModal";
import { getCountryByCode, CountryInfo, syncDollarRateFromBackend } from "../../constants/countries";
import { CountryFlag } from "../common/CountryFlag";
import "./PhantomAuth.css";

type PhantomView =
  | "welcome"
  | "create-password"
  | "secret-phrase"
  | "complete"
  | "import"
  | "import-password"
  | "unlock";

interface PhantomAuthProps {
  onAuth: (user: AuthUser) => void;
  initialView?: PhantomView;
}

const SUPPORTED_CHAINS = [
  { name: "Solana", logo: "https://coin-images.coingecko.com/coins/images/4128/large/solana.png" },
  { name: "Ethereum", logo: "https://coin-images.coingecko.com/coins/images/279/large/ethereum.png" },
  { name: "Bitcoin", logo: "https://coin-images.coingecko.com/coins/images/1/large/bitcoin.png" },
];

// ─────────────────────────────────────────────────────────────
// Left Side Branding Showcase Panel
// ─────────────────────────────────────────────────────────────
function BrandingPanel({ view }: { view: PhantomView }) {
  const [activeTick, setActiveTick] = useState(0);
  const { toggleTheme, isLight } = useTheme();

  const mockTrades = [
    { type: "BUY", token: "POPCAT", amount: "42.5 SOL", time: "just now", val: "+$6,140" },
    { type: "SWAP", token: "BONK", amount: "18.2 SOL", time: "6s ago", val: "+$2,630" },
    { type: "BUY", token: "WIF", amount: "35.0 SOL", time: "14s ago", val: "+$5,060" },
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveTick((p) => (p + 1) % mockTrades.length);
    }, 3500);
    return () => clearInterval(interval);
  }, []);

  const taglines: Record<PhantomView, { headline: string; highlight: string; sub: string }> = {
    welcome: {
      headline: "Your Keys.",
      highlight: "Your Kingdom.",
      sub: "The premier non-custodial crypto wallet engineered for high-speed Solana & memecoin trading.",
    },
    "create-password": {
      headline: "Device-Level",
      highlight: "Encryption.",
      sub: "Your master password encrypts your keys locally using Argon2 & bcrypt. Axiom never touches your credentials.",
    },
    "secret-phrase": {
      headline: "BIP-39",
      highlight: "Self-Custody.",
      sub: "Only you hold your 12-word recovery phrase. 100% decentralized, private, and mathematically verifiable.",
    },
    complete: {
      headline: "Welcome to",
      highlight: "Axiom Terminal.",
      sub: "Your non-custodial wallet is active on Solana Mainnet. Access live Raydium liquidity and sub-second memecoin execution.",
    },
    import: {
      headline: "Instant",
      highlight: "Restoration.",
      sub: "Restore any existing Solana or EVM wallet securely using your standard 12-word Secret Recovery Phrase.",
    },
    "import-password": {
      headline: "Lock &",
      highlight: "Protect.",
      sub: "Set a local device password to keep your restored vault protected from unauthorized physical access.",
    },
    unlock: {
      headline: "Trade Smarter.",
      highlight: "Trade Faster.",
      sub: "Welcome back. Unlock your vault to access real-time charts, live order books, and institutional-grade routing.",
    },
  };

  const { headline, highlight, sub } = taglines[view] || taglines.welcome;

  return (
    <aside className="phantom-brand-panel" aria-label="Axiom Wallet Branding">
      {/* Ambient background glows */}
      <div className="phantom-brand-glow phantom-brand-glow-1" />
      <div className="phantom-brand-glow phantom-brand-glow-2" />
      <div className="phantom-brand-glow phantom-brand-glow-3" />
      <div className="phantom-grid-pattern" />

      {/* Brand Header */}
      <div className="phantom-brand-top-bar">
        <div className="phantom-brand-logo">
          <div className="phantom-brand-logo-icon">A</div>
          <span className="phantom-brand-logo-text">AXIOM</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            type="button"
            className="phantom-theme-toggle"
            onClick={toggleTheme}
            title={isLight ? "Switch to Dark Mode" : "Switch to Light Mode"}
            aria-label={isLight ? "Switch to Dark Mode" : "Switch to Light Mode"}
          >
            {isLight ? <Moon size={16} /> : <Sun size={16} />}
          </button>
          <div className="phantom-badge-live">
            <span className="phantom-live-dot" />
            <span>SOLANA MAINNET</span>
          </div>
        </div>
      </div>

      {/* Hero Showcase Card */}
      <div className="phantom-showcase-card">
        <div className="phantom-showcase-header">
          <div className="phantom-showcase-pill">
            <span className="phantom-token-avatar">🐱</span>
            <div>
              <div className="phantom-token-name">POPCAT / SOL</div>
              <div className="phantom-token-chain">Raydium Liquidity Pool</div>
            </div>
          </div>
          <div className="phantom-showcase-price-block">
            <span className="phantom-showcase-price">$0.2717</span>
            <span className="phantom-showcase-badge-green">+342.5%</span>
          </div>
        </div>

        {/* Animated Wave Chart */}
        <div className="phantom-chart-wrap">
          <svg viewBox="0 0 420 160" className="phantom-chart-svg" preserveAspectRatio="none">
            <defs>
              <linearGradient id="phantomChartGradArea" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#7C3AED" stopOpacity={isLight ? 0.25 : 0.45} />
                <stop offset="60%" stopColor="#10B981" stopOpacity={isLight ? 0.1 : 0.15} />
                <stop offset="100%" stopColor="#10B981" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="phantomChartLineGrad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#7C3AED" />
                <stop offset="45%" stopColor="#8B5CF6" />
                <stop offset="75%" stopColor="#10B981" />
                <stop offset="100%" stopColor="#34D399" />
              </linearGradient>
              <filter id="phantomNeonGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="4" result="glow" />
                <feMerge>
                  <feMergeNode in="glow" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Grid lines */}
            <line x1="0" y1="40" x2="420" y2="40" stroke={isLight ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.04)"} strokeDasharray="3 3" />
            <line x1="0" y1="80" x2="420" y2="80" stroke={isLight ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.04)"} strokeDasharray="3 3" />
            <line x1="0" y1="120" x2="420" y2="120" stroke={isLight ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.04)"} strokeDasharray="3 3" />

            {/* Area under curve */}
            <path
              d="M0,135 C40,130 70,105 110,115 C150,125 180,80 220,90 C260,100 290,40 330,50 C360,60 390,20 420,12 L420,160 L0,160 Z"
              fill="url(#phantomChartGradArea)"
            />

            {/* Dynamic Main Chart Line */}
            <path
              d="M0,135 C40,130 70,105 110,115 C150,125 180,80 220,90 C260,100 290,40 330,50 C360,60 390,20 420,12"
              fill="none"
              stroke="url(#phantomChartLineGrad)"
              strokeWidth="3.2"
              strokeLinecap="round"
              filter="url(#phantomNeonGlow)"
              className="phantom-chart-line"
            />

            {/* Pulsing Beacon at peak */}
            <g transform="translate(420, 12)">
              <circle r="12" fill="#10B981" opacity="0.2" className="phantom-beacon-ring" />
              <circle r="7" fill="#10B981" opacity="0.4" className="phantom-beacon-ring-2" />
              <circle r="4" fill="#34D399" filter="url(#phantomNeonGlow)" />
            </g>
          </svg>

          {/* Floating Metric Badges */}
          <div className="phantom-stat-card phantom-stat-1">
            <div className="phantom-stat-label">24H VOLUME</div>
            <div className="phantom-stat-val text-emerald">$2.48M</div>
            <div className="phantom-stat-sub">▲ 18.4% today</div>
          </div>

          <div className="phantom-stat-card phantom-stat-2">
            <div className="phantom-stat-label">ACTIVE TRADERS</div>
            <div className="phantom-stat-val text-purple">2,491</div>
            <div className="phantom-stat-sub">⚡ 14ms latency</div>
          </div>

          <div className="phantom-stat-card phantom-stat-3">
            <div className="phantom-stat-label">EXECUTION</div>
            <div className="phantom-stat-val text-cyan">&lt; 45ms</div>
            <div className="phantom-stat-sub">0% gas markup</div>
          </div>
        </div>

        {/* Live Simulation Ticker */}
        <div className="phantom-showcase-ticker">
          <div className="phantom-ticker-label">
            <Activity size={12} style={{ color: "#10b981" }} />
            <span>LIVE ORDER FLOW</span>
          </div>
          <div className="phantom-ticker-item" key={activeTick}>
            <span className={`phantom-ticker-pill ${mockTrades[activeTick].type === "BUY" ? "buy" : "swap"}`}>
              {mockTrades[activeTick].type}
            </span>
            <span className="phantom-ticker-token">{mockTrades[activeTick].amount} {mockTrades[activeTick].token}</span>
            <span className="phantom-ticker-val">{mockTrades[activeTick].val}</span>
            <span className="phantom-ticker-time">{mockTrades[activeTick].time}</span>
          </div>
        </div>
      </div>

      {/* Hero Content at Bottom */}
      <div className="phantom-brand-bottom">
        <h1 className="phantom-brand-headline">
          {headline} <span className="phantom-headline-gradient">{highlight}</span>
        </h1>
        <p className="phantom-brand-sub">{sub}</p>

        <div className="phantom-brand-pills">
          <div className="phantom-brand-pill">
            <Zap size={13} style={{ color: "#a78bfa" }} />
            <span>Sub-second swaps</span>
          </div>
          <div className="phantom-brand-pill">
            <ShieldCheck size={13} style={{ color: "#10b981" }} />
            <span>Non-custodial & secure</span>
          </div>
          <div className="phantom-brand-pill">
            <TrendingUp size={13} style={{ color: "#38bdf8" }} />
            <span>Rug-pull safeguard</span>
          </div>
        </div>
      </div>
    </aside>
  );
}

// ─────────────────────────────────────────────────────────────
// Main PhantomAuth Component
// ─────────────────────────────────────────────────────────────
export function PhantomAuth({ onAuth, initialView }: PhantomAuthProps) {
  const { toggleTheme, isLight } = useTheme();

  // If stored wallet exists on device, start on unlock; otherwise welcome
  const [view, setView] = useState<PhantomView>(() => {
    if (initialView) return initialView;
    const stored = getStoredWalletAddress();
    return stored ? "unlock" : "welcome";
  });

  // Partner referral tracking
  const [agentRef, setAgentRef] = useState<string>("");

  // Create Wallet State
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(true);
  const [selectedCountry, setSelectedCountry] = useState<CountryInfo>(() => {
    const saved = localStorage.getItem("axiom_user_country") || "NG";
    return getCountryByCode(saved);
  });
  const [isCountryModalOpen, setIsCountryModalOpen] = useState(false);

  // Sync dollar exchange rate on mount and listen to admin updates
  useEffect(() => {
    syncDollarRateFromBackend().then(() => {
      const saved = localStorage.getItem("axiom_user_country") || "NG";
      setSelectedCountry(getCountryByCode(saved));
    });

    const handleRateChange = () => {
      const saved = localStorage.getItem("axiom_user_country") || "NG";
      setSelectedCountry(getCountryByCode(saved));
    };

    window.addEventListener("axiom_dollar_rate_updated", handleRateChange);
    return () => window.removeEventListener("axiom_dollar_rate_updated", handleRateChange);
  }, []);

  // Secret recovery phrase state
  const [seedPhrase, setSeedPhrase] = useState("");
  const [wordList, setWordList] = useState<string[]>([]);
  const [savedPhraseChecked, setSavedPhraseChecked] = useState(false);
  const [copiedPhrase, setCopiedPhrase] = useState(false);

  // Import flow state
  const [importText, setImportText] = useState("");
  const [importWords, setImportWords] = useState<string[]>([]);

  // Unlock state
  const [unlockPassword, setUnlockPassword] = useState("");
  const [showUnlockPassword, setShowUnlockPassword] = useState(false);
  const [storedAddress, setStoredAddress] = useState<string>("");

  // Common UX
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [createdUser, setCreatedUser] = useState<AuthUser | null>(null);

  // Check stored wallet and referral on mount
  useEffect(() => {
    const stored = getStoredWalletAddress();
    if (stored) {
      setStoredAddress(stored);
    }
    const ref = localStorage.getItem("axiom_agent_ref") || "";
    if (ref) {
      setAgentRef(ref);
    }
  }, []);

  // Parse import text into words on change
  useEffect(() => {
    const cleaned = importText
      .trim()
      .toLowerCase()
      .split(/[\s,]+/)
      .filter(Boolean);
    setImportWords(cleaned);
  }, [importText]);

  // Reset errors when navigating views
  const navigateTo = (nextView: PhantomView) => {
    setError(null);
    setView(nextView);
  };

  // Password strength calculation
  const getStrength = (pw: string) => {
    if (!pw) return "";
    if (pw.length < 8) return "weak";
    let score = 0;
    if (/[A-Z]/.test(pw)) score++;
    if (/[a-z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    if (pw.length >= 12) score++;
    if (score >= 4) return "strong";
    if (score >= 2) return "medium";
    return "weak";
  };
  const pwStrength = getStrength(password);

  // ── Step 1: Create Password -> Generate Seed ──
  const handleCreatePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (!agreeTerms) {
      setError("Please agree to the Terms of Service.");
      return;
    }

    setLoading(true);
    try {
      const data = await generateSeedPhrase();
      setSeedPhrase(data.seed_phrase);
      setWordList(data.word_list || data.seed_phrase.split(" "));
      navigateTo("secret-phrase");
    } catch (err: any) {
      setError(err?.message || "Failed to generate recovery phrase. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ── Step 2: Confirm Secret Phrase -> Register Wallet ──
  const handleConfirmPhraseSubmit = async () => {
    if (!savedPhraseChecked) {
      setError("Please confirm you have saved your Secret Recovery Phrase.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const resp = await registerPhantomWallet({
        seed_phrase: seedPhrase,
        password: password,
        agent_ref: agentRef || undefined,
      });

      if (!resp.success || !resp.wallet_address) {
        throw new Error(resp.error || "Failed to create wallet");
      }

      const user: AuthUser = {
        user_id: resp.user_id || "",
        email: resp.email || "",
        wallet_address: resp.wallet_address,
        is_admin: !!resp.is_admin,
        is_email_verified: true,
        full_name: resp.full_name || "Account 1",
      };

      setStoredWalletAddress(resp.wallet_address);
      setStoredAddress(resp.wallet_address);
      setCreatedUser(user);
      navigateTo("complete");
    } catch (err: any) {
      setError(err?.message || "Failed to finalize wallet registration.");
    } finally {
      setLoading(false);
    }
  };

  // ── Copy Phrase ──
  const handleCopyPhrase = () => {
    copyToClipboard(seedPhrase);
    setCopiedPhrase(true);
    setTimeout(() => setCopiedPhrase(false), 2200);
  };

  // ── Import Phrase Step 1: Validate 12 Words ──
  const handleImportWordsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (importWords.length !== 12) {
      setError(`Please enter exactly 12 words (currently ${importWords.length}/12).`);
      return;
    }
    navigateTo("import-password");
  };

  // ── Import Phrase Step 2: Set Password & Restore ──
  const handleImportPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const phraseToRestore = importWords.join(" ");
      const resp = await registerPhantomWallet({
        seed_phrase: phraseToRestore,
        password: password,
        agent_ref: agentRef || undefined,
      });

      if (!resp.success || !resp.wallet_address) {
        throw new Error(resp.error || "Failed to restore wallet");
      }

      const user: AuthUser = {
        user_id: resp.user_id || "",
        email: resp.email || "",
        wallet_address: resp.wallet_address,
        is_admin: !!resp.is_admin,
        is_email_verified: true,
        full_name: resp.full_name || "Account 1",
      };

      setStoredWalletAddress(resp.wallet_address);
      setStoredAddress(resp.wallet_address);
      onAuth(user);
    } catch (err: any) {
      setError(err?.message || "Failed to restore wallet. Please check all 12 words.");
    } finally {
      setLoading(false);
    }
  };

  // ── Unlock Existing Wallet ──
  const handleUnlockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!unlockPassword) {
      setError("Please enter your password.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const resp = await unlockPhantomWallet({
        password: unlockPassword,
        wallet_address: storedAddress || undefined,
      });

      if (!resp.success || !resp.wallet_address) {
        throw new Error(resp.error || "Incorrect password.");
      }

      const user: AuthUser = {
        user_id: resp.user_id || "",
        email: resp.email || "",
        wallet_address: resp.wallet_address,
        is_admin: !!resp.is_admin,
        is_email_verified: true,
        full_name: resp.full_name || "Account 1",
      };

      setStoredWalletAddress(resp.wallet_address);
      onAuth(user);
    } catch (err: any) {
      setError(err?.message || "Incorrect password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ── Truncate Address Utility ──
  const truncate = (addr: string) => {
    if (!addr || addr.length < 10) return addr;
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return (
    <div className="phantom-page-container">
      {/* Mobile Top Header (< 960px) */}
      <header className="phantom-mobile-header">
        <div className="phantom-brand-logo">
          <div className="phantom-brand-logo-icon">A</div>
          <span className="phantom-brand-logo-text">AXIOM</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            type="button"
            className="phantom-theme-toggle"
            onClick={toggleTheme}
            title={isLight ? "Switch to Dark Mode" : "Switch to Light Mode"}
            aria-label={isLight ? "Switch to Dark Mode" : "Switch to Light Mode"}
          >
            {isLight ? <Moon size={16} /> : <Sun size={16} />}
          </button>
          <div className="phantom-badge-live">
            <span className="phantom-live-dot" />
            <span>SOLANA</span>
          </div>
        </div>
      </header>

      {/* Left Branding Panel (Desktop & Tablets) */}
      <BrandingPanel view={view} />

      {/* Right Form Panel (Houses the Phantom Card) */}
      <main className="phantom-form-panel">
        <div className="phantom-form-glow-1" />
        <div className="phantom-form-glow-2" />

        {/* ─── HYPER-PROFESSIONAL PHANTOM CARD ─── */}
        <div className="phantom-window">
          {/* Card Top Status Bar */}
          <div className="phantom-card-statusbar">
            <div className="phantom-status-network">
              <span className="phantom-status-dot" />
              <span>Solana Mainnet</span>
            </div>
            <button
              type="button"
              onClick={() => setIsCountryModalOpen(true)}
              title="Click to view or change currency rate"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                background: "rgba(124, 58, 237, 0.14)",
                border: "1px solid rgba(167, 139, 250, 0.3)",
                borderRadius: 12,
                padding: "2px 8px",
                color: "#E0E7FF",
                fontSize: 10,
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              <CountryFlag code={selectedCountry.code} flag={selectedCountry.flag} size={13} />
              <span>1 USD ≈ {selectedCountry.currencySymbol}{selectedCountry.rateToUsd >= 100 ? selectedCountry.rateToUsd.toLocaleString() : selectedCountry.rateToUsd} {selectedCountry.currency}</span>
              <ChevronDown size={11} color="#A78BFA" />
            </button>
            <div className="phantom-status-security">
              <ShieldCheck size={13} />
              <span>AES-256 Vault</span>
            </div>
          </div>

          {/* Navigation Bar inside Card */}
          <div className="phantom-top-bar">
            {view !== "welcome" && view !== "complete" && view !== "unlock" ? (
              <button
                type="button"
                className="phantom-back-btn"
                onClick={() => {
                  if (view === "create-password") navigateTo("welcome");
                  else if (view === "secret-phrase") navigateTo("create-password");
                  else if (view === "import") navigateTo("welcome");
                  else if (view === "import-password") navigateTo("import");
                }}
                aria-label="Back"
              >
                <ChevronLeft size={16} />
                <span>Back</span>
              </button>
            ) : (
              <div style={{ width: 28 }} />
            )}

            {view === "create-password" && (
              <span className="phantom-step-indicator">Step 1 of 2</span>
            )}
            {view === "secret-phrase" && (
              <span className="phantom-step-indicator">Step 2 of 2</span>
            )}
            {view === "import" && (
              <span className="phantom-step-indicator">Restore Vault</span>
            )}

            <div style={{ width: 28 }} />
          </div>

          {/* ─── 1. WELCOME SCREEN ─── */}
          {view === "welcome" && (
            <div className="phantom-content">
              <div>
                <div className="phantom-mascot-wrapper">
                  <div className="phantom-glow-halo" />
                  <div className="phantom-mascot-circle">
                    <Wallet size={34} className="phantom-mascot-icon" />
                  </div>
                </div>

                <h1 className="phantom-title">Welcome to Axiom</h1>
                <p className="phantom-subtitle">
                  The friendly self-custody wallet for Solana, Ethereum, and Bitcoin.
                </p>

                {/* Multi-Chain Chips */}
                <div className="phantom-chain-row">
                  {SUPPORTED_CHAINS.map((chain) => (
                    <div key={chain.name} className="phantom-chain-chip">
                      <img src={chain.logo} alt={chain.name} className="phantom-chain-logo" />
                      <span>{chain.name}</span>
                    </div>
                  ))}
                </div>

                {/* Trust & Security Row */}
                <div className="phantom-trust-banner">
                  <div className="phantom-trust-item">
                    <Shield size={12} className="phantom-trust-icon" />
                    <span>Non-Custodial</span>
                  </div>
                  <div className="phantom-trust-item">
                    <Zap size={12} className="phantom-trust-icon" />
                    <span>0% Gas Markup</span>
                  </div>
                  <div className="phantom-trust-item">
                    <Cpu size={12} className="phantom-trust-icon" />
                    <span>Raydium Direct</span>
                  </div>
                </div>

                {/* Live Dollar Rate Badge */}
                <div style={{ display: "flex", justifyContent: "center", margin: "14px 0 6px 0" }}>
                  <button
                    type="button"
                    onClick={() => setIsCountryModalOpen(true)}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 7,
                      padding: "5px 12px",
                      background: "rgba(124, 58, 237, 0.12)",
                      border: "1px solid rgba(124, 58, 237, 0.28)",
                      borderRadius: 20,
                      cursor: "pointer",
                      color: "#DDD6FE",
                      fontSize: 12,
                      fontWeight: 600,
                      transition: "all 0.2s ease",
                    }}
                  >
                    <CountryFlag code={selectedCountry.code} flag={selectedCountry.flag} size={15} />
                    <span>Rate: 1 USD ≈ {selectedCountry.currencySymbol}{selectedCountry.rateToUsd >= 100 ? selectedCountry.rateToUsd.toLocaleString() : selectedCountry.rateToUsd} {selectedCountry.currency}</span>
                    <ChevronDown size={12} color="#A78BFA" />
                  </button>
                </div>

                {agentRef && (
                  <div className="phantom-ref-badge">
                    <span className="phantom-ref-dot" />
                    <span>Referral Partner: Agent #{agentRef}</span>
                  </div>
                )}
              </div>

              <div>
                <div className="phantom-actions-group">
                  <button
                    type="button"
                    className="phantom-btn-primary"
                    onClick={() => navigateTo("create-password")}
                  >
                    <div className="phantom-btn-inner">
                      <Sparkles size={18} />
                      <span>Create a new wallet</span>
                    </div>
                    <ChevronRight size={18} opacity={0.8} />
                  </button>

                  <button
                    type="button"
                    className="phantom-btn-secondary"
                    onClick={() => navigateTo("import")}
                  >
                    <div className="phantom-btn-inner">
                      <KeyRound size={17} style={{ color: "#a78bfa" }} />
                      <span>I already have a wallet</span>
                    </div>
                    <ChevronRight size={18} opacity={0.6} />
                  </button>
                </div>

                {storedAddress && (
                  <div style={{ marginTop: 14, textAlign: "center" }}>
                    <button
                      type="button"
                      className="phantom-link-btn"
                      onClick={() => navigateTo("unlock")}
                    >
                      Unlock existing wallet ({truncate(storedAddress)})
                    </button>
                  </div>
                )}

                <p className="phantom-terms-notice">
                  By continuing, you agree to the Terms of Service & Privacy Policy.
                </p>
              </div>
            </div>
          )}

          {/* ─── 2. CREATE PASSWORD SCREEN (Step 1) ─── */}
          {view === "create-password" && (
            <form className="phantom-content" onSubmit={handleCreatePasswordSubmit}>
              <div>
                <h2 className="phantom-title">Create a password</h2>
                <p className="phantom-subtitle">
                  You will use this password to unlock your wallet on this device.
                </p>

                {error && (
                  <div className="phantom-error-banner">
                    <ShieldAlert size={16} />
                    <span>{error}</span>
                  </div>
                )}

                <div className="phantom-field">
                  <label className="phantom-field-label">Password</label>
                  <div className="phantom-input-wrap">
                    <input
                      type={showPassword ? "text" : "password"}
                      className="phantom-input"
                      placeholder="At least 8 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoFocus
                      required
                    />
                    <button
                      type="button"
                      className="phantom-eye-btn"
                      onClick={() => setShowPassword(!showPassword)}
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>
                  {password && (
                    <div className="phantom-pw-strength">
                      <div className="phantom-pw-bars">
                        <div className={`phantom-pw-bar ${pwStrength}`} />
                        <div className={`phantom-pw-bar ${pwStrength === "medium" || pwStrength === "strong" ? pwStrength : ""}`} />
                        <div className={`phantom-pw-bar ${pwStrength === "strong" ? pwStrength : ""}`} />
                      </div>
                      <span className={`phantom-pw-label ${pwStrength}`}>{pwStrength}</span>
                    </div>
                  )}
                </div>

                <div className="phantom-field">
                  <label className="phantom-field-label">Confirm Password</label>
                  <div className="phantom-input-wrap">
                    <input
                      type={showPassword ? "text" : "password"}
                      className="phantom-input"
                      placeholder="Repeat password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="phantom-field">
                  <label className="phantom-field-label">Country of Residence</label>
                  <button
                    type="button"
                    className="phantom-input"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      textAlign: "left",
                      cursor: "pointer",
                      padding: "0 14px",
                      background: "rgba(10, 11, 20, 0.85)",
                    }}
                    onClick={() => setIsCountryModalOpen(true)}
                  >
                    <CountryFlag code={selectedCountry.code} flag={selectedCountry.flag} size={20} />
                    <span style={{ flex: 1, fontWeight: 600, color: "inherit" }}>{selectedCountry.name}</span>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 1 }}>
                      <span style={{ fontSize: 11, color: "var(--muted, #94A3B8)", fontWeight: 700 }}>
                        {selectedCountry.currency}
                      </span>
                      <span style={{ fontSize: 10, color: "#A78BFA", fontWeight: 600 }}>
                        1 USD = {selectedCountry.currencySymbol}{selectedCountry.rateToUsd >= 100 ? selectedCountry.rateToUsd.toLocaleString() : selectedCountry.rateToUsd}
                      </span>
                    </div>
                    <ChevronDown size={15} color="#94A3B8" />
                  </button>
                </div>

                <label className="phantom-checkbox-label" onClick={() => setAgreeTerms(!agreeTerms)}>
                  <div className={`phantom-checkbox-custom ${agreeTerms ? "checked" : ""}`}>
                    {agreeTerms && <Check size={12} strokeWidth={3} />}
                  </div>
                  <span>I agree to the Terms of Service and acknowledge that Axiom cannot recover lost passwords.</span>
                </label>
              </div>

              <div>
                <button
                  type="submit"
                  className="phantom-btn-primary"
                  disabled={loading || password.length < 8 || password !== confirmPassword || !agreeTerms}
                >
                  {loading ? (
                    <div className="phantom-btn-inner" style={{ width: "100%", justifyContent: "center" }}>
                      <Loader2 size={18} className="animate-spin" />
                      <span>Generating BIP-39 Keys...</span>
                    </div>
                  ) : (
                    <>
                      <div className="phantom-btn-inner">
                        <Sparkles size={17} />
                        <span>Continue</span>
                      </div>
                      <ArrowRight size={17} />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* ─── 3. SECRET RECOVERY PHRASE SCREEN (Step 2) ─── */}
          {view === "secret-phrase" && (
            <div className="phantom-content">
              <div>
                <h2 className="phantom-title">Secret Recovery Phrase</h2>
                <p className="phantom-subtitle">
                  This phrase is the <strong>ONLY</strong> way to recover your wallet. Do not share it with anyone!
                </p>

                <div className="phantom-warning-box">
                  <ShieldAlert size={18} className="phantom-warning-icon" />
                  <span>Anyone with this phrase can access all your funds. Store it safely offline.</span>
                </div>

                {error && (
                  <div className="phantom-error-banner">
                    <ShieldAlert size={16} />
                    <span>{error}</span>
                  </div>
                )}

                {/* 12-word grid */}
                <div className="phantom-phrase-grid">
                  {wordList.map((word, idx) => (
                    <div key={idx} className="phantom-word-card">
                      <span className="phantom-word-num">{idx + 1}.</span>
                      <span className="phantom-word-text">{word}</span>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  className={`phantom-copy-btn ${copiedPhrase ? "copied" : ""}`}
                  onClick={handleCopyPhrase}
                >
                  {copiedPhrase ? (
                    <>
                      <Check size={15} />
                      <span>Copied to clipboard!</span>
                    </>
                  ) : (
                    <>
                      <Copy size={15} />
                      <span>Copy to clipboard</span>
                    </>
                  )}
                </button>

                <label
                  className="phantom-checkbox-label"
                  onClick={() => setSavedPhraseChecked(!savedPhraseChecked)}
                >
                  <div className={`phantom-checkbox-custom ${savedPhraseChecked ? "checked" : ""}`}>
                    {savedPhraseChecked && <Check size={12} strokeWidth={3} />}
                  </div>
                  <span>I saved my Secret Recovery Phrase in a safe place</span>
                </label>
              </div>

              <div>
                <button
                  type="button"
                  className="phantom-btn-primary"
                  onClick={handleConfirmPhraseSubmit}
                  disabled={loading || !savedPhraseChecked}
                >
                  {loading ? (
                    <div className="phantom-btn-inner" style={{ width: "100%", justifyContent: "center" }}>
                      <Loader2 size={18} className="animate-spin" />
                      <span>Creating On-Chain Vault...</span>
                    </div>
                  ) : (
                    <>
                      <div className="phantom-btn-inner">
                        <Check size={17} />
                        <span>Continue</span>
                      </div>
                      <ArrowRight size={17} />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* ─── 4. YOU'RE ALL SET! (Complete) ─── */}
          {view === "complete" && createdUser && (
            <div className="phantom-content">
              <div>
                <div className="phantom-mascot-wrapper">
                  <div className="phantom-glow-halo" />
                  <div className="phantom-mascot-circle" style={{ background: "linear-gradient(135deg, #10B981, #059669)" }}>
                    <CheckCircle2 size={36} className="phantom-mascot-icon" />
                  </div>
                </div>

                <h2 className="phantom-title">You're all set!</h2>
                <p className="phantom-subtitle">
                  Your non-custodial wallet has been created and securely derived.
                </p>

                <div className="phantom-completed-card">
                  <div className="phantom-account-row">
                    <span className="phantom-account-name">Account 1</span>
                    <span className="phantom-net-pill">Solana Mainnet</span>
                  </div>
                  <div className="phantom-address-box">
                    <span className="phantom-address-text">
                      {truncate(createdUser.wallet_address)}
                    </span>
                    <button
                      type="button"
                      className="phantom-back-btn"
                      onClick={() => {
                        copyToClipboard(createdUser.wallet_address);
                        setCopiedPhrase(true);
                        setTimeout(() => setCopiedPhrase(false), 2000);
                      }}
                      title="Copy Address"
                    >
                      {copiedPhrase ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
                    </button>
                  </div>
                </div>

                <div className="phantom-tip-card">
                  <Zap size={16} style={{ minWidth: 16, color: "#8a46ff", marginTop: 1 }} />
                  <span>
                    <strong>Pro Tip:</strong> Deposit SOL, ETH, or USDT anytime to start trading flagship memecoins with sub-second execution.
                  </span>
                </div>
              </div>

              <div>
                <button
                  type="button"
                  className="phantom-btn-primary"
                  onClick={() => onAuth(createdUser)}
                >
                  <div className="phantom-btn-inner">
                    <Sparkles size={17} />
                    <span>Get Started</span>
                  </div>
                  <ArrowRight size={17} />
                </button>
              </div>
            </div>
          )}

          {/* ─── 5. IMPORT SECRET PHRASE ─── */}
          {view === "import" && (
            <form className="phantom-content" onSubmit={handleImportWordsSubmit}>
              <div>
                <h2 className="phantom-title">Secret Recovery Phrase</h2>
                <p className="phantom-subtitle">
                  Enter your 12-word Secret Recovery Phrase to restore your wallet.
                </p>

                {error && (
                  <div className="phantom-error-banner">
                    <ShieldAlert size={16} />
                    <span>{error}</span>
                  </div>
                )}

                <textarea
                  className="phantom-textarea"
                  placeholder="Paste or type your 12 words separated by spaces..."
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  autoFocus
                  required
                />

                <div className={`phantom-words-counter ${importWords.length === 12 ? "complete" : ""}`}>
                  <span>Word count</span>
                  <span>{importWords.length} / 12 words</span>
                </div>

                {importWords.length > 0 && importWords.length <= 12 && (
                  <div className="phantom-phrase-grid" style={{ maxHeight: 150, overflowY: "auto", marginBottom: 12 }}>
                    {importWords.map((word, idx) => (
                      <div key={idx} className="phantom-word-card">
                        <span className="phantom-word-num">{idx + 1}.</span>
                        <span className="phantom-word-text">{word}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <button
                  type="submit"
                  className="phantom-btn-primary"
                  disabled={importWords.length !== 12}
                >
                  <div className="phantom-btn-inner">
                    <Check size={17} />
                    <span>Continue</span>
                  </div>
                  <ArrowRight size={17} />
                </button>
              </div>
            </form>
          )}

          {/* ─── 6. IMPORT PASSWORD SCREEN ─── */}
          {view === "import-password" && (
            <form className="phantom-content" onSubmit={handleImportPasswordSubmit}>
              <div>
                <h2 className="phantom-title">Set device password</h2>
                <p className="phantom-subtitle">
                  Create a password to lock and unlock your restored wallet on this device.
                </p>

                {error && (
                  <div className="phantom-error-banner">
                    <ShieldAlert size={16} />
                    <span>{error}</span>
                  </div>
                )}

                <div className="phantom-field">
                  <label className="phantom-field-label">Password</label>
                  <div className="phantom-input-wrap">
                    <input
                      type={showPassword ? "text" : "password"}
                      className="phantom-input"
                      placeholder="At least 8 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoFocus
                      required
                    />
                    <button
                      type="button"
                      className="phantom-eye-btn"
                      onClick={() => setShowPassword(!showPassword)}
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>
                </div>

                <div className="phantom-field">
                  <label className="phantom-field-label">Confirm Password</label>
                  <div className="phantom-input-wrap">
                    <input
                      type={showPassword ? "text" : "password"}
                      className="phantom-input"
                      placeholder="Repeat password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  className="phantom-btn-primary"
                  disabled={loading || password.length < 8 || password !== confirmPassword}
                >
                  {loading ? (
                    <div className="phantom-btn-inner" style={{ width: "100%", justifyContent: "center" }}>
                      <Loader2 size={18} className="animate-spin" />
                      <span>Restoring Wallet...</span>
                    </div>
                  ) : (
                    <>
                      <div className="phantom-btn-inner">
                        <KeyRound size={17} />
                        <span>Restore Wallet</span>
                      </div>
                      <ArrowRight size={17} />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* ─── 7. UNLOCK SCREEN (Returning User) ─── */}
          {view === "unlock" && (
            <form className="phantom-content" onSubmit={handleUnlockSubmit}>
              <div>
                <div className="phantom-mascot-wrapper">
                  <div className="phantom-glow-halo" />
                  <div className="phantom-mascot-circle">
                    <Lock size={30} className="phantom-mascot-icon" />
                  </div>
                </div>

                <h2 className="phantom-title">Welcome back</h2>
                <div className="phantom-unlock-account">
                  <span className="phantom-account-dot" />
                  <span>Account 1</span>
                  {storedAddress && (
                    <span style={{ color: "#7c8ba1", fontFamily: "monospace" }}>
                      • {truncate(storedAddress)}
                    </span>
                  )}
                </div>

                {/* Live Dollar Rate Badge */}
                <div style={{ display: "flex", justifyContent: "center", margin: "8px 0 14px 0" }}>
                  <button
                    type="button"
                    onClick={() => setIsCountryModalOpen(true)}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 7,
                      padding: "4px 11px",
                      background: "rgba(124, 58, 237, 0.12)",
                      border: "1px solid rgba(124, 58, 237, 0.28)",
                      borderRadius: 16,
                      cursor: "pointer",
                      color: "#DDD6FE",
                      fontSize: 11,
                      fontWeight: 600,
                    }}
                  >
                    <CountryFlag code={selectedCountry.code} flag={selectedCountry.flag} size={14} />
                    <span>Rate: 1 USD ≈ {selectedCountry.currencySymbol}{selectedCountry.rateToUsd >= 100 ? selectedCountry.rateToUsd.toLocaleString() : selectedCountry.rateToUsd} {selectedCountry.currency}</span>
                    <ChevronDown size={11} color="#A78BFA" />
                  </button>
                </div>

                {error && (
                  <div className="phantom-error-banner">
                    <ShieldAlert size={16} />
                    <span>{error}</span>
                  </div>
                )}

                <div className="phantom-field">
                  <label className="phantom-field-label">Password</label>
                  <div className="phantom-input-wrap">
                    <input
                      type={showUnlockPassword ? "text" : "password"}
                      className="phantom-input"
                      placeholder="Enter password"
                      value={unlockPassword}
                      onChange={(e) => setUnlockPassword(e.target.value)}
                      autoFocus
                      required
                    />
                    <button
                      type="button"
                      className="phantom-eye-btn"
                      onClick={() => setShowUnlockPassword(!showUnlockPassword)}
                      tabIndex={-1}
                    >
                      {showUnlockPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  className="phantom-btn-primary"
                  disabled={loading || !unlockPassword}
                >
                  {loading ? (
                    <div className="phantom-btn-inner" style={{ width: "100%", justifyContent: "center" }}>
                      <Loader2 size={18} className="animate-spin" />
                      <span>Unlocking...</span>
                    </div>
                  ) : (
                    <>
                      <div className="phantom-btn-inner">
                        <Lock size={17} />
                        <span>Unlock</span>
                      </div>
                      <ArrowRight size={17} />
                    </>
                  )}
                </button>

                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 14, textAlign: "center" }}>
                  <button
                    type="button"
                    className="phantom-link-btn"
                    onClick={() => navigateTo("import")}
                  >
                    Forgot password? Restore with Recovery Phrase
                  </button>
                  <button
                    type="button"
                    className="phantom-link-btn"
                    onClick={() => {
                      clearStoredWalletAddress();
                      setStoredAddress("");
                      navigateTo("welcome");
                    }}
                  >
                    Use a different wallet
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </main>

      <CountrySelectModal
        isOpen={isCountryModalOpen}
        onClose={() => setIsCountryModalOpen(false)}
        onSelect={(c) => {
          setSelectedCountry(c);
          localStorage.setItem("axiom_user_country", c.code);
          setIsCountryModalOpen(false);
        }}
        selectedCode={selectedCountry.code}
        title="Select Country & Currency"
      />
    </div>
  );
}
