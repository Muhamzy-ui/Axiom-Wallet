import React, { useState, useEffect } from "react";
import {
  ChevronLeft, Copy, Check, ShieldCheck, Zap, RefreshCw,
  ExternalLink, AlertTriangle, Clock
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

  const handleSelectCoin = (sym: DepositCoin) => {
    setDepositCoin(sym);
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
      ? 179.84
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
        if (res && res.wallets && res.wallets.length > 0) {
          setAvailableWallets(res.wallets);
          const initial = res.assigned_wallet || res.wallets[0];
          setAssignedWallet(initial);
        }
      })
      .catch(() => {});
  }, [depositCoin, depositNetwork, userIdentifier]);

  const getFallbackAddress = (net: string) => {
    const key = Object.keys(NETWORK_POOLS).find((k) => net.includes(k.split(" ")[0])) || "TRON (TRC-20)";
    const pool = NETWORK_POOLS[key] || NETWORK_POOLS["TRON (TRC-20)"];
    let hash = 0;
    for (let i = 0; i < userIdentifier.length; i++) {
      hash = (hash * 31 + userIdentifier.charCodeAt(i)) >>> 0;
    }
    return pool[hash % pool.length];
  };

  const activeDepositAddress = assignedWallet?.address || getFallbackAddress(depositNetwork);

  const handleCopyAddress = () => {
    copyToClipboard(activeDepositAddress);
    setCopiedAddr(true);
    flash(`✅ Copied ${depositCoin} (${depositNetwork.split(" ")[0]}) deposit address!`);
    setTimeout(() => setCopiedAddr(false), 2200);
  };

  const handleVerifyOnChainDeposit = async () => {
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

        <div className="fullpage-status-badge">
          <span className="pulse-dot" />
          <span>MAINNET ACTIVE</span>
        </div>
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
                        (sym === "SOL" ? 179.84 : sym === "BTC" ? 77724 : 2650);

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
                        onClick={() => setDepositNetwork(net.networkKey)}
                      >
                        <span>{net.label}</span>
                        <span style={{ fontSize: 9.5, opacity: 0.8 }}>({net.speed})</span>
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
                <div className="qr-frame">
                  <div className="qr-scanner-line" />
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(
                      activeDepositAddress
                    )}&margin=2`}
                    width={140}
                    height={140}
                    alt="Deposit Address QR"
                    style={{ display: "block", borderRadius: 8 }}
                  />
                </div>
                <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 10 }}>
                  Scan with Binance, Bybit, Trust Wallet, or Phantom
                </div>
              </div>

              {/* Monospace Address with Copy */}
              <div className="address-copy-row">
                <span className="address-monospace-text">{activeDepositAddress}</span>
                <button
                  type="button"
                  className={`address-copy-btn ${copiedAddr ? "copied" : ""}`}
                  onClick={handleCopyAddress}
                >
                  {copiedAddr ? <Check size={14} /> : <Copy size={14} />}
                  <span>{copiedAddr ? "Copied!" : "Copy"}</span>
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
                {[10, 25, 50, 100, 250, 500, 1000].map((val) => (
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

            {/* 4. Instant Automated Verification Section */}
            <div
              className="card-section"
              style={{
                background: "rgba(124, 58, 237, 0.08)",
                border: "1px solid rgba(124, 58, 237, 0.25)",
                borderRadius: 14,
                padding: "16px",
              }}
            >
              <div className="pro-card-header">
                <span className="pro-card-label" style={{ color: "var(--text)" }}>
                  <Zap size={14} color="#C4B5FD" />
                  Instant Auto-Credit Verification
                </span>
                <span style={{ fontSize: 10.5, color: "#C4B5FD", fontWeight: 700 }}>
                  Sub-5s Confirmation
                </span>
              </div>

              <p style={{ fontSize: 11.5, color: "var(--muted)", margin: "0 0 10px", lineHeight: 1.4 }}>
                After submitting the transfer from your external wallet or exchange, paste the Transaction ID (TxID/Signature) below to credit your account immediately.
              </p>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <input
                  type="text"
                  value={txHash}
                  onChange={(e) => {
                    setTxHash(e.target.value);
                    setVerifyError(null);
                    setPendingMsg(null);
                  }}
                  placeholder="Paste TxID / signature hash..."
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
                    minHeight: 44,
                  }}
                />
                <button
                  type="button"
                  className="pro-submit-btn"
                  onClick={handleVerifyOnChainDeposit}
                  disabled={isVerifying || !txHash.trim()}
                  style={{ flex: "1 1 140px", padding: "0 18px", minHeight: 44, fontSize: 13, margin: 0 }}
                >
                  {isVerifying ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      <span>Verifying...</span>
                    </>
                  ) : (
                    <>
                      <Zap size={14} />
                      <span>Verify Deposit</span>
                    </>
                  )}
                </button>
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
