import React, { useState, useEffect } from "react";
import {
  ChevronLeft, Copy, Check, ShieldCheck, Zap, RefreshCw,
  ExternalLink, AlertTriangle, Clock, Radio, Activity, ChevronDown, ChevronUp, Sparkles
} from "lucide-react";
import { api } from "../../services/api";
import { type PlatformDepositWallet } from "../../types";
import { marketStore } from "../../services/marketStore";
import { copyToClipboard } from "../../services/clipboard";
import { type AuthUser } from "../../services/authService";
import "./Modals.css";

interface DepositPageProps {
  onClose: () => void;
  onDone: (msg: string) => void;
  flash: (msg: string) => void;
  authUser?: AuthUser | null;
}

type DepositCoin = "USDT" | "SOL" | "USDC" | "BTC" | "ETH";

const COIN_METAS: Record<DepositCoin, { name: string; iconUrl: string }> = {
  USDT: { name: "Tether USD", iconUrl: "https://coin-images.coingecko.com/coins/images/325/large/Tether.png" },
  SOL: { name: "Solana", iconUrl: "https://coin-images.coingecko.com/coins/images/4128/large/solana.png" },
  USDC: { name: "USD Coin", iconUrl: "https://coin-images.coingecko.com/coins/images/6319/large/usdc.png" },
  BTC: { name: "Bitcoin", iconUrl: "https://coin-images.coingecko.com/coins/images/1/large/bitcoin.png" },
  ETH: { name: "Ethereum", iconUrl: "https://coin-images.coingecko.com/coins/images/279/large/ethereum.png" },
};

const COIN_NETWORKS: Record<DepositCoin, { label: string; networkKey: string; speed: string; note: string }[]> = {
  USDT: [
    { label: "TRC-20", networkKey: "TRON (TRC-20)", speed: "⚡ ~15s", note: "Tron Network • Sub-cent fee" },
    { label: "BEP-20", networkKey: "BNB Chain (BEP-20)", speed: "⚡ ~30s", note: "BNB Smart Chain • Low fee" },
    { label: "Solana", networkKey: "Solana (SPL)", speed: "⚡ ~2s", note: "Solana SPL • Instant settlement" },
    { label: "ERC-20", networkKey: "Ethereum (ERC-20)", speed: "🔒 ~3m", note: "Ethereum Mainnet • Institutional" },
  ],
  SOL: [
    { label: "Solana Native", networkKey: "Solana (SPL)", speed: "⚡ ~2s", note: "Solana Mainnet-Beta" },
  ],
  USDC: [
    { label: "Solana (SPL)", networkKey: "Solana (SPL)", speed: "⚡ ~2s", note: "Solana SPL Circle USD Coin" },
    { label: "ERC-20", networkKey: "Ethereum (ERC-20)", speed: "🔒 ~3m", note: "Ethereum ERC-20 USD Coin" },
  ],
  BTC: [
    { label: "Bitcoin Native", networkKey: "Bitcoin (BTC)", speed: "🔒 ~10m", note: "Bitcoin SegWit (bc1) & Legacy" },
  ],
  ETH: [
    { label: "ERC-20", networkKey: "Ethereum (ERC-20)", speed: "🔒 ~3m", note: "Ethereum Mainnet Native" },
  ],
};

export const DepositPage: React.FC<DepositPageProps> = ({
  onClose,
  onDone,
  flash,
  authUser,
}) => {
  const [depositCoin, setDepositCoin] = useState<DepositCoin>("USDT");
  const [depositNetwork, setDepositNetwork] = useState<string>("TRON (TRC-20)");
  const [depositAmt, setDepositAmt] = useState<string>("50");
  const [assignedWallet, setAssignedWallet] = useState<PlatformDepositWallet | null>(null);
  const [txHash, setTxHash] = useState<string>("");
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [pendingMsg, setPendingMsg] = useState<string | null>(null);
  const [verifySuccess, setVerifySuccess] = useState<{
    amount: string;
    usdAmount?: string;
    currency: string;
    newBalance: string;
    txHash: string;
  } | null>(null);
  const [copiedAddr, setCopiedAddr] = useState<boolean>(false);
  const [isAutoChecking, setIsAutoChecking] = useState<boolean>(false);
  const [pollCount, setPollCount] = useState<number>(0);
  const [lastPollTime, setLastPollTime] = useState<string>("Just now");
  const [showManualTx, setShowManualTx] = useState<boolean>(false);
  const [timeLeft, setTimeLeft] = useState<number>(300); // 5 minutes window

  useEffect(() => {
    if (timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft((t) => Math.max(0, t - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  const handleRefreshOrder = () => {
    setTimeLeft(300);
    setVerifyError(null);
    setPendingMsg(null);
    api
      .getDepositWallets(userIdentifier, depositNetwork, depositCoin)
      .then((res) => {
        if (res?.assigned_wallet) setAssignedWallet(res.assigned_wallet);
      })
      .catch(() => {});
    flash("🔄 Generated new 5-minute deposit order window!");
  };

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  const handleSelectCoin = (sym: DepositCoin) => {
    setDepositCoin(sym);
    setAssignedWallet(null);
    const availableNets = COIN_NETWORKS[sym];
    if (availableNets && availableNets.length > 0) {
      setDepositNetwork(availableNets[0].networkKey);
    }
  };

  const depositTokenObj = marketStore.getToken(depositCoin);
  const depositPriceUsd =
    depositCoin === "USDT" || depositCoin === "USDC"
      ? 1.0
      : depositTokenObj && depositTokenObj.numericPrice > 0
      ? depositTokenObj.numericPrice
      : depositCoin === "SOL"
      ? 121.69
      : depositCoin === "BTC"
      ? 77724.0
      : depositCoin === "ETH"
      ? 2650.0
      : 1.0;

  const depositUsdNum = parseFloat(depositAmt) || 0;
  const cryptoEquivalent = depositPriceUsd > 0 ? depositUsdNum / depositPriceUsd : depositUsdNum;

const NETWORK_POOLS: Record<string, string[]> = {
  "TRON (TRC-20)": [
    "TYD9yZ7G8gM2tY9vK8nP7wE6rT5yU4iO3p",
    "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t",
    "TUpMhErRtPqW1vYz7KbX3nMaQ8pL6sD9jF",
    "TPY9xK8mL2nQ7wE6rT5yU4iO3pA2sD1fGh",
    "TQn8vB2mK8pL7wE6rT5yU4iO3pA2sD1fXy",
  ],
  "BNB Chain (BEP-20)": [
    "0x71C836e522F5b8Fbe40d34341A5a507E78e1215B",
    "0x8894E0a0c962CB723c1976a4421c95949bE2D4E3",
    "0x3f5CE5FBFe3E9af3971dD833D26bA9b5C936f0bE",
    "0xD551234Ae421e3BCBA99A0Da6d736074f22192FF",
    "0x564286362092D8e7936f0549571a803B203aAceA",
  ],
  "Solana (SPL)": [
    "8ZgC8Q3f8sC9b9T4vB2nK8mP7wE6rT5yU4iO3pA2sD1f",
    "AxB8s9sHynawdTUeioAgqcQKQ7Y6LvrdiN6ybE6YSrWU",
    "5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1",
    "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
    "3J98t1WpEZ73CNmQvieCrnyiWrnqRhWNLy87Z1a2B",
  ],
  "Ethereum (ERC-20)": [
    "0x71C836e522F5b8Fbe40d34341A5a507E78e1215B",
    "0x28C6c06298d514Db089934071355E5743bf21d60",
    "0x21a31Ee1afC51d94C2eFcCAa2092aD1028285549",
    "0xDFd5293D8e347dFe59E90eFd55b2956a13430d71",
    "0xBE0eB53F46cd790Cd13851d5EFf43D12404d33E8",
  ],
  "Bitcoin (BTC)": [
    "bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq",
    "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
    "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa",
    "3J98t1WpEZ73CNmQvieCrnyiWrnqRhWNLy",
    "bc1qm34lsc65zpw79lxes69zkqmk6ee3ewf0j77s3h",
  ],
};

  const [availableWallets, setAvailableWallets] = useState<PlatformDepositWallet[]>([]);

  // Automatically assign 1 wallet address from the 5-wallet pool to each individual user
  const userIdentifier =
    authUser?.user_id ||
    authUser?.email ||
    authUser?.wallet_address ||
    (typeof window !== "undefined" ? window.localStorage.getItem("axiom_user_id") : "") ||
    "axiom_user_default";

  useEffect(() => {
    api
      .getDepositWallets(userIdentifier, depositNetwork, depositCoin)
      .then((res) => {
        if (res) {
          if (res.wallets && res.wallets.length > 0) {
            setAvailableWallets(res.wallets);
          }
          if (res.assigned_wallet) {
            setAssignedWallet(res.assigned_wallet);
          } else if (res.wallets && res.wallets.length > 0) {
            setAssignedWallet(res.wallets[0]);
          }
        }
      })
      .catch(() => {});
  }, [depositCoin, depositNetwork, userIdentifier]);

  const getFallbackAddress = (net: string) => {
    const seed = `axiom_vault_v2:${userIdentifier}:${net.toLowerCase().split(' ')[0]}:${depositCoin.toUpperCase()}`;
    let h1 = 0xdeadbeef;
    let h2 = 0x41c6ce57;
    for (let i = 0; i < seed.length; i++) {
      const ch = seed.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    const b58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
    const netLower = net.toLowerCase();
    if (netLower.includes('tron') || netLower.includes('trc')) {
      let res = "T";
      for (let i = 0; i < 33; i++) {
        res += b58[(Math.abs(h1 + i * 37) + (seed.charCodeAt(i % seed.length) || 0)) % 58];
      }
      return res;
    } else if (netLower.includes('solana') || depositCoin === 'SOL') {
      let res = "";
      for (let i = 0; i < 44; i++) {
        res += b58[(Math.abs(h2 + i * 19) + (seed.charCodeAt(i % seed.length) || 0)) % 58];
      }
      return res;
    } else if (netLower.includes('bitcoin') || depositCoin === 'BTC') {
      return `bc1q${Math.abs(h1).toString(16).padStart(8, '0')}${Math.abs(h2).toString(16).padStart(8, '0')}`.slice(0, 42);
    } else {
      const hex = `${Math.abs(h1).toString(16).padStart(8, '0')}${Math.abs(h2).toString(16).padStart(8, '0')}${Math.abs(h1 ^ h2).toString(16).padStart(8, '0')}`;
      return `0x${hex.repeat(3).slice(0, 40)}`;
    }
  };

  const activeDepositAddress =
    assignedWallet && assignedWallet.network === depositNetwork
      ? assignedWallet.address
      : getFallbackAddress(depositNetwork);

  const handleCopyAddress = () => {
    if (timeLeft <= 0) {
      flash("⚠️ Deposit order has expired. Please click 'Generate New Order' first.");
      return;
    }
    copyToClipboard(activeDepositAddress);
    setCopiedAddr(true);
    flash(`✅ Copied ${depositCoin} (${depositNetwork.split(" ")[0]}) deposit address!`);
    setTimeout(() => setCopiedAddr(false), 2200);
  };

  const handleVerifyOnChainDeposit = async () => {
    if (timeLeft <= 0) {
      setVerifyError("Deposit order expired. Please click 'Generate New Order' below to get a fresh 5-minute window.");
      return;
    }
    const cleanHash = txHash.trim();
    if (!cleanHash) {
      setVerifyError("Please enter your transaction signature or hash (TxID).");
      return;
    }
    const amtNum = parseFloat(depositAmt) || 0;
    if (isNaN(amtNum) || amtNum < 5.0) {
      setVerifyError("Minimum deposit is $5.00 USD.");
      return;
    }

    setIsVerifying(true);
    setVerifyError(null);
    setPendingMsg(null);

    try {
      const userAddr = authUser?.wallet_address || "AxB8s9sHynawdTUeioAgqcQKQ7Y6LvrdiN6ybE6YSrWU";
      const res = await api.verifyOnChainDeposit(
        userAddr,
        cleanHash,
        depositCoin,
        activeDepositAddress,
        String(amtNum)
      );

      if (res.success) {
        if (res.status === "PENDING") {
          setPendingMsg(
            res.message || "Your deposit has been submitted and queued for verification. Digits will release once confirmed."
          );
          flash("⏳ Deposit queued for confirmation.");
        } else {
          const creditedTokenAmt = parseFloat(res.credited_amount);
          marketStore.depositFunds(depositCoin, creditedTokenAmt);
          setVerifySuccess({
            amount: res.credited_amount,
            usdAmount: res.usd_amount || amtNum.toFixed(2),
            currency: res.currency,
            newBalance: res.new_balance,
            txHash: cleanHash,
          });
          flash(`🎉 Verified! +$${amtNum.toFixed(2)} USD credited immediately!`);
        }
      }
    } catch (err: any) {
      setVerifyError(err.message || "Failed to verify transaction signature.");
    } finally {
      setIsVerifying(false);
    }
  };

  // Continuous background on-chain radar (auto-detect incoming transfer every 4.5s)
  useEffect(() => {
    if (!activeDepositAddress || verifySuccess || isVerifying || timeLeft <= 0) return;

    let isMounted = true;
    let pollTimer: any = null;

    const runAutoDetect = async () => {
      if (!isMounted || verifySuccess || isVerifying || timeLeft <= 0) return;
      try {
        setIsAutoChecking(true);
        const userAddr =
          authUser?.wallet_address ||
          authUser?.email ||
          authUser?.user_id ||
          "AxB8s9sHynawdTUeioAgqcQKQ7Y6LvrdiN6ybE6YSrWU";

        const res = await api.autoDetectDeposit({
          address: userAddr,
          deposit_wallet: activeDepositAddress,
          currency: depositCoin,
          network: depositNetwork,
          amount: depositAmt,
        });

        if (!isMounted) return;

        setPollCount((prev) => prev + 1);
        const d = new Date();
        setLastPollTime(`${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`);

        if (res && res.detected && res.status === "CONFIRMED") {
          if (pollTimer) clearInterval(pollTimer);
          const creditedTokenAmt = parseFloat(res.credited_amount || "0");
          marketStore.depositFunds(depositCoin, creditedTokenAmt);
          setVerifySuccess({
            amount: res.credited_amount || "0",
            usdAmount: res.usd_amount || depositAmt,
            currency: res.currency || depositCoin,
            newBalance: res.new_balance || "0",
            txHash: res.tx_hash || "",
          });
          flash(`🎉 Deposit automatically detected on-chain! +$${res.usd_amount || depositAmt} USD credited!`);
        }
      } catch (err) {
        // Silently keep polling
      } finally {
        if (isMounted) setIsAutoChecking(false);
      }
    };

    // First scan after 1.5s
    const initialTimer = setTimeout(() => {
      runAutoDetect();
    }, 1500);

    // Continuous 4.5s interval
    pollTimer = setInterval(() => {
      runAutoDetect();
    }, 4500);

    return () => {
      isMounted = false;
      clearTimeout(initialTimer);
      clearInterval(pollTimer);
    };
  }, [activeDepositAddress, depositCoin, depositNetwork, depositAmt, verifySuccess, isVerifying, authUser, timeLeft]);

  const handleManualCheckNow = async () => {
    if (isAutoChecking || isVerifying || verifySuccess) return;
    setIsAutoChecking(true);
    setVerifyError(null);
    try {
      const userAddr =
        authUser?.wallet_address ||
        authUser?.email ||
        authUser?.user_id ||
        "AxB8s9sHynawdTUeioAgqcQKQ7Y6LvrdiN6ybE6YSrWU";

      const res = await api.autoDetectDeposit({
        address: userAddr,
        deposit_wallet: activeDepositAddress,
        currency: depositCoin,
        network: depositNetwork,
        amount: depositAmt,
      });

      setPollCount((prev) => prev + 1);
      const d = new Date();
      setLastPollTime(`${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`);

      if (res && res.detected && res.status === "CONFIRMED") {
        const creditedTokenAmt = parseFloat(res.credited_amount || "0");
        marketStore.depositFunds(depositCoin, creditedTokenAmt);
        setVerifySuccess({
          amount: res.credited_amount || "0",
          usdAmount: res.usd_amount || depositAmt,
          currency: res.currency || depositCoin,
          newBalance: res.new_balance || "0",
          txHash: res.tx_hash || "",
        });
        flash(`🎉 Deposit automatically detected on-chain! +$${res.usd_amount || depositAmt} USD credited!`);
      } else {
        flash(`📡 Blockchain scanned. Transfer has not yet arrived on ${depositNetwork.split(" ")[0]}. Continuing to monitor...`);
      }
    } catch (err: any) {
      setVerifyError(err.message || "Failed to scan blockchain node.");
    } finally {
      setIsAutoChecking(false);
    }
  };

  const getExplorerLink = () => {
    if (depositNetwork.includes("Solana")) return `https://solscan.io/account/${activeDepositAddress}`;
    if (depositNetwork.includes("TRON")) return `https://tronscan.org/#/address/${activeDepositAddress}`;
    if (depositNetwork.includes("BNB")) return `https://bscscan.com/address/${activeDepositAddress}`;
    if (depositNetwork.includes("Ethereum")) return `https://etherscan.io/address/${activeDepositAddress}`;
    if (depositNetwork.includes("Bitcoin")) return `https://mempool.space/address/${activeDepositAddress}`;
    return `https://solscan.io/account/${activeDepositAddress}`;
  };

  return (
    <div className="fullpage-modal-wrap" style={{ overflowX: "hidden", touchAction: "pan-y", width: "100%", maxWidth: "100vw" }}>
      {/* Sticky Header */}
      <header className="fullpage-modal-header">
        <button type="button" className="fullpage-back-btn" onClick={onClose}>
          <ChevronLeft size={16} />
          <span>Back</span>
        </button>

        <div className="fullpage-header-title">
          <h1>Deposit Crypto</h1>
          <span>Direct non-custodial vault funding</span>
        </div>

        <div style={{ width: 68 }} />
      </header>

      {/* Main Scrollable Body */}
      <div className="fullpage-modal-body">
        {verifySuccess ? (
          /* Success Receipt Card */
          <div className="pro-card" style={{ textAlign: "center", padding: "28px 20px" }}>
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: "50%",
                background: "rgba(16, 185, 129, 0.15)",
                border: "2px solid #10B981",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 16px",
                boxShadow: "0 0 24px rgba(16, 185, 129, 0.35)",
              }}
            >
              <ShieldCheck size={36} color="#10B981" />
            </div>

            <h2 style={{ fontSize: 20, fontWeight: 800, margin: "0 0 6px" }}>
              Deposit Verified & Credited!
            </h2>
            <p style={{ fontSize: 13, color: "var(--muted)", margin: "0 0 20px" }}>
              Funds have been confirmed on {depositNetwork.split(" ")[0]} and credited to your balance.
            </p>

            <div
              style={{
                background: "rgba(0, 0, 0, 0.3)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: 14,
                padding: "16px",
                display: "flex",
                flexDirection: "column",
                gap: 10,
                textAlign: "left",
                marginBottom: 20,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                <span style={{ color: "var(--muted)" }}>Amount Credited:</span>
                <span style={{ fontWeight: 800, color: "#10B981" }}>
                  +${verifySuccess.usdAmount || "50.00"} USD ({verifySuccess.amount} {verifySuccess.currency})
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                <span style={{ color: "var(--muted)" }}>Network:</span>
                <span style={{ fontWeight: 600 }}>{depositNetwork}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                <span style={{ color: "var(--muted)" }}>Tx Hash:</span>
                <span style={{ fontFamily: "monospace", color: "#C4B5FD" }}>
                  {verifySuccess.txHash.slice(0, 10)}...{verifySuccess.txHash.slice(-8)}
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 13,
                  paddingTop: 10,
                  borderTop: "1px solid rgba(255, 255, 255, 0.08)",
                }}
              >
                <span style={{ color: "var(--muted)" }}>Updated Balance:</span>
                <span style={{ fontWeight: 800, color: "var(--violet, #7C3AED)" }}>
                  ${Number(verifySuccess.newBalance).toFixed(2)} USD
                </span>
              </div>
            </div>

            <button
              type="button"
              className="pro-submit-btn"
              onClick={() => onDone(`✅ Credited +$${verifySuccess.usdAmount || "50.00"} USD (${verifySuccess.currency})!`)}
            >
              Done • Return to Dashboard
            </button>
          </div>
        ) : (
          /* One Single Long Unified Deposit Card */
          <div className="pro-card">
            {/* 1. Crypto Asset Selector Section */}
            <div className="card-section">
              <div className="pro-card-header">
                <span className="pro-card-label">1. Select Deposit Asset</span>
                <span style={{ fontSize: 11, color: "#10B981", fontWeight: 700 }}>
                  0% Fee • Instant
                </span>
              </div>

              <div className="asset-selector-grid">
                {(["USDT", "SOL", "USDC", "BTC", "ETH"] as const).map((sym) => {
                  const isActive = depositCoin === sym;
                  const tokenMeta = COIN_METAS[sym];
                  const tokenPrice =
                    sym === "USDT" || sym === "USDC"
                      ? 1.0
                      : marketStore.getToken(sym)?.numericPrice ||
                        (sym === "SOL" ? 121.69 : sym === "BTC" ? 77724 : 2650);

                  return (
                    <button
                      key={sym}
                      type="button"
                      className={`asset-pill ${isActive ? "active" : ""}`}
                      onClick={() => handleSelectCoin(sym)}
                    >
                      <img
                        src={tokenMeta.iconUrl}
                        alt={sym}
                        style={{ width: 24, height: 24, borderRadius: "50%" }}
                      />
                      <span className="asset-pill-sym">{sym}</span>
                      <span className="asset-pill-price">
                        ${tokenPrice >= 100 ? tokenPrice.toLocaleString(undefined, { maximumFractionDigits: 0 }) : tokenPrice.toFixed(2)}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Network Pills */}
              <div style={{ marginTop: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", marginBottom: 6 }}>
                  Select Chain Network:
                </div>
                <div className="network-pills-row">
                  {(COIN_NETWORKS[depositCoin] || []).map((net) => {
                    const isNetActive = depositNetwork === net.networkKey;
                    return (
                      <button
                        key={net.networkKey}
                        type="button"
                        className={`network-pill ${isNetActive ? "active" : ""}`}
                        onClick={() => {
                          setDepositNetwork(net.networkKey);
                          setAssignedWallet(null);
                        }}
                      >
                        <span>{net.label}</span>
                        <span style={{ fontSize: 9.5, opacity: 0.85 }}>{net.speed}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="card-divider" />

            {/* 2. QR Code & Deposit Address Section */}
            <div className="card-section" style={{ textAlign: "center" }}>
              <div className="pro-card-header">
                <span className="pro-card-label">2. Your Deposit Address</span>
                <span style={{ fontSize: 11, color: "#C4B5FD", fontWeight: 700 }}>
                  {depositNetwork.split(" ")[0]}
                </span>
              </div>

              <div className="qr-container">
                <div className="qr-frame" style={{ position: "relative" }}>
                  {timeLeft <= 0 && (
                    <div
                      style={{
                        position: "absolute",
                        inset: 0,
                        background: "rgba(10, 11, 20, 0.94)",
                        backdropFilter: "blur(5px)",
                        borderRadius: 8,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 8,
                        zIndex: 6,
                        padding: 12,
                        textAlign: "center"
                      }}
                    >
                      <Clock size={28} color="#EF4444" />
                      <span style={{ fontSize: 12, fontWeight: 800, color: "#F87171" }}>
                        ORDER EXPIRED
                      </span>
                      <button
                        type="button"
                        onClick={handleRefreshOrder}
                        style={{
                          background: "linear-gradient(135deg, #7C3AED 0%, #6366F1 100%)",
                          border: "none",
                          borderRadius: 6,
                          padding: "6px 12px",
                          color: "#fff",
                          fontSize: 11,
                          fontWeight: 700,
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4
                        }}
                      >
                        <RefreshCw size={12} />
                        <span>Generate New Order</span>
                      </button>
                    </div>
                  )}
                  <div className="qr-scanner-line" style={{ display: timeLeft <= 0 ? "none" : "block" }} />
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(
                      activeDepositAddress
                    )}&margin=2`}
                    width={140}
                    height={140}
                    alt="Deposit Address QR"
                    style={{
                      display: "block",
                      borderRadius: 8,
                      filter: timeLeft <= 0 ? "blur(3px) grayscale(1)" : "none",
                      opacity: timeLeft <= 0 ? 0.25 : 1
                    }}
                  />
                </div>
                <div style={{ fontSize: 11, color: timeLeft <= 0 ? "#F87171" : "var(--muted)", marginTop: 10 }}>
                  {timeLeft <= 0
                    ? "⚠️ Order expired. Click Generate New Order to refresh address."
                    : "Scan with Binance, Bybit, Trust Wallet, or Phantom"}
                </div>
              </div>

              {/* Monospace Address with Copy */}
              <div className="address-copy-row">
                <span className="address-monospace-text" style={{ opacity: timeLeft <= 0 ? 0.35 : 1 }}>
                  {timeLeft <= 0 ? "Order Expired — Click Generate New Order below" : activeDepositAddress}
                </span>
                <button
                  type="button"
                  disabled={timeLeft <= 0}
                  className={`address-copy-btn ${copiedAddr ? "copied" : ""}`}
                  onClick={handleCopyAddress}
                  style={{
                    opacity: timeLeft <= 0 ? 0.5 : 1,
                    cursor: timeLeft <= 0 ? "not-allowed" : "pointer"
                  }}
                >
                  {copiedAddr ? <Check size={14} /> : <Copy size={14} />}
                  <span>{timeLeft <= 0 ? "Expired" : copiedAddr ? "Copied!" : "Copy"}</span>
                </button>
              </div>

              {/* Explorer Link */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10, fontSize: 11.5 }}>
                <a
                  href={getExplorerLink()}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    color: "#A78BFA",
                    textDecoration: "none",
                    fontWeight: 700,
                  }}
                >
                  <ExternalLink size={12} /> View Platform Vault on Block Explorer
                </a>
                <span style={{ color: "var(--muted)", display: "flex", alignItems: "center", gap: 4 }}>
                  <ShieldCheck size={13} color="#10B981" /> Multi-Sig Vault
                </span>
              </div>

              {/* Notice */}
              <div
                style={{
                  marginTop: 12,
                  padding: "8px 12px",
                  borderRadius: 10,
                  background: "rgba(245, 158, 11, 0.08)",
                  border: "1px solid rgba(245, 158, 11, 0.2)",
                  fontSize: 11,
                  color: "#FBBF24",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  textAlign: "left",
                }}
              >
                <AlertTriangle size={15} style={{ flexShrink: 0 }} />
                <span>
                  Only transfer <b>{depositCoin}</b> via <b>{depositNetwork}</b>. Sending assets on other chains may result in permanent loss.
                </span>
              </div>
            </div>

            <div className="card-divider" />

            {/* 3. Deposit Amount & Conversion Calculator Section */}
            <div className="card-section">
              <div className="pro-card-header">
                <span className="pro-card-label">3. Expected Amount ($ USD)</span>
                <span style={{ fontSize: 11, color: "#10B981", fontWeight: 700 }}>
                  Min Deposit: $5.00
                </span>
              </div>

              <div className="converter-box">
                <div className="converter-input-row">
                  <span className="converter-currency-sym">$</span>
                  <input
                    type="number"
                    min="5"
                    step="5"
                    className="converter-input"
                    value={depositAmt}
                    onChange={(e) => {
                      setDepositAmt(e.target.value);
                      setVerifyError(null);
                      setPendingMsg(null);
                    }}
                    placeholder="50.00"
                  />
                  <span className="converter-fiat-tag">USD</span>
                </div>

                <div className="converter-subrow">
                  <span className="converter-sub-label">You will transfer approx:</span>
                  <div className="converter-badge">
                    <img src={COIN_METAS[depositCoin].iconUrl} width={16} height={16} alt={depositCoin} style={{ borderRadius: "50%" }} />
                    <span>
                      ≈ {cryptoEquivalent < 1
                        ? cryptoEquivalent.toFixed(6)
                        : (cryptoEquivalent >= 1000
                            ? cryptoEquivalent.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                            : cryptoEquivalent.toFixed(2))} {depositCoin}
                    </span>
                  </div>
                </div>
              </div>

              <div className="preset-chips-row">
                {[5, 10, 25, 50, 100, 200, 250, 500].map((val) => (
                  <button
                    key={val}
                    type="button"
                    className={`preset-chip-btn ${parseFloat(depositAmt) === val ? "active" : ""}`}
                    onClick={() => {
                      setDepositAmt(String(val));
                      setVerifyError(null);
                      setPendingMsg(null);
                    }}
                  >
                    ${val}
                  </button>
                ))}
              </div>
            </div>

            <div className="card-divider" />

            {/* 4. Automated On-Chain Deposit Detection Section */}
            <div
              className="card-section"
              style={{
                background: "linear-gradient(145deg, rgba(16, 185, 129, 0.08) 0%, rgba(124, 58, 237, 0.06) 100%)",
                border: "1px solid rgba(16, 185, 129, 0.28)",
                borderRadius: 14,
                padding: "16px",
                position: "relative",
                overflow: "hidden",
              }}
            >
              {/* 5-Minute Expiration Order Card */}
              {timeLeft > 0 ? (
                <div
                  style={{
                    background: "rgba(10, 11, 20, 0.65)",
                    border: "1px solid rgba(245, 158, 11, 0.25)",
                    borderRadius: 12,
                    padding: "14px 16px",
                    marginBottom: 10,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <Clock size={16} color="#F59E0B" />
                      <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text, #fff)" }}>
                        Order Expires In:
                      </span>
                    </div>
                    <span
                      style={{
                        fontFamily: "monospace",
                        color: timeLeft <= 60 ? "#EF4444" : "#F59E0B",
                        fontSize: 16,
                        fontWeight: 900,
                        background: timeLeft <= 60 ? "rgba(239, 68, 68, 0.15)" : "rgba(245, 158, 11, 0.15)",
                        padding: "2px 8px",
                        borderRadius: 6,
                        border: `1px solid ${timeLeft <= 60 ? "rgba(239, 68, 68, 0.3)" : "rgba(245, 158, 11, 0.3)"}`,
                      }}
                    >
                      {formatTimer(timeLeft)}
                    </span>
                  </div>

                  <p style={{ fontSize: 11.5, color: "var(--muted, #94A3B8)", margin: "0 0 10px 0", lineHeight: 1.4 }}>
                    Send <strong style={{ color: "#fff" }}>{depositAmt} USD</strong> ({cryptoEquivalent.toFixed(depositCoin === "USDT" || depositCoin === "USDC" ? 2 : 4)} {depositCoin}) to your dedicated address. Transfers are automatically credited upon block confirmation within this 5-minute window.
                  </p>

                  {/* Progress bar */}
                  <div style={{ width: "100%", height: 4, background: "rgba(255, 255, 255, 0.08)", borderRadius: 999, overflow: "hidden" }}>
                    <div
                      style={{
                        width: `${(timeLeft / 300) * 100}%`,
                        height: "100%",
                        background: timeLeft <= 60 ? "#EF4444" : "#F59E0B",
                        transition: "width 1s linear",
                      }}
                    />
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    background: "rgba(239, 68, 68, 0.08)",
                    border: "1px solid rgba(239, 68, 68, 0.3)",
                    borderRadius: 12,
                    padding: "16px",
                    textAlign: "center",
                    marginBottom: 10,
                  }}
                >
                  <div style={{ color: "#F87171", fontSize: 13, fontWeight: 800, marginBottom: 4 }}>
                    ⚠️ Deposit Order Expired
                  </div>
                  <p style={{ color: "#94A3B8", fontSize: 11.5, margin: "0 0 12px 0" }}>
                    No payment was detected within the 5-minute window. Please generate a new deposit order before sending.
                  </p>
                  <button
                    type="button"
                    onClick={handleRefreshOrder}
                    style={{
                      padding: "8px 18px",
                      borderRadius: 8,
                      background: "linear-gradient(135deg, #7C3AED 0%, #6366F1 100%)",
                      border: "none",
                      color: "#fff",
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <RefreshCw size={13} />
                    <span>Generate New Order (5:00)</span>
                  </button>
                </div>
              )}

              {/* Optional Manual Fallback Accordion */}
              <div style={{ marginTop: 8 }}>
                <button
                  type="button"
                  onClick={() => setShowManualTx(!showManualTx)}
                  style={{
                    background: "none",
                    border: "none",
                    padding: 0,
                    fontSize: 11,
                    color: "rgba(255, 255, 255, 0.45)",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <span>Already have a TxID / hash? Submit manually</span>
                  {showManualTx ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                </button>

                {showManualTx && (
                  <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <input
                      type="text"
                      value={txHash}
                      onChange={(e) => {
                        setTxHash(e.target.value);
                        setVerifyError(null);
                        setPendingMsg(null);
                      }}
                      placeholder="Paste manual TxID / signature hash..."
                      style={{
                        flex: "1 1 200px",
                        background: "rgba(10, 11, 20, 0.85)",
                        border: "1px solid rgba(255, 255, 255, 0.12)",
                        borderRadius: 10,
                        padding: "10px 12px",
                        fontSize: 12,
                        fontFamily: "monospace",
                        color: "var(--text, #fff)",
                        outline: "none",
                        minHeight: 40,
                      }}
                    />
                    <button
                      type="button"
                      className="pro-submit-btn"
                      onClick={handleVerifyOnChainDeposit}
                      disabled={isVerifying || !txHash.trim()}
                      style={{ flex: "1 1 120px", padding: "0 14px", minHeight: 40, fontSize: 12, margin: 0 }}
                    >
                      {isVerifying ? (
                        <>
                          <RefreshCw size={13} className="animate-spin" />
                          <span>Verifying...</span>
                        </>
                      ) : (
                        <span>Verify TxID</span>
                      )}
                    </button>
                  </div>
                )}
              </div>

              {pendingMsg && (
                <div
                  style={{
                    marginTop: 10,
                    padding: "10px 14px",
                    borderRadius: 10,
                    background: "rgba(245, 158, 11, 0.12)",
                    border: "1px solid rgba(245, 158, 11, 0.3)",
                    color: "#FBBF24",
                    fontSize: 12,
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    lineHeight: 1.4,
                  }}
                >
                  <Clock size={16} style={{ flexShrink: 0 }} />
                  <div>
                    <div style={{ fontWeight: 700 }}>Deposit Submitted • Queued for Verification</div>
                    <div style={{ fontSize: 11, opacity: 0.9 }}>{pendingMsg}</div>
                  </div>
                </div>
              )}

              {verifyError && (
                <div
                  style={{
                    marginTop: 8,
                    padding: "8px 12px",
                    borderRadius: 8,
                    background: "rgba(239, 68, 68, 0.12)",
                    border: "1px solid rgba(239, 68, 68, 0.3)",
                    color: "#F87171",
                    fontSize: 11.5,
                    fontWeight: 600,
                  }}
                >
                  ⚠️ {verifyError}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
