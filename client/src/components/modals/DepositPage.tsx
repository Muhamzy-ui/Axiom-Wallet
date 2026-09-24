import React, { useState, useEffect } from "react";
import {
  ChevronLeft, Copy, Check, ShieldCheck, Zap, RefreshCw,
  ExternalLink, AlertTriangle, ArrowDownToLine, Clock
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

  // Load platform deposit wallets from backend
  useEffect(() => {
    const userAddr = authUser?.wallet_address || authUser?.email || "AxB8s9sHynawdTUeioAgqcQKQ7Y6LvrdiN6ybE6YSrWU";
    api
      .getDepositWallets(userAddr, depositNetwork, depositCoin)
      .then((res) => {
        if (res && res.wallets && res.wallets.length > 0) {
          const initial = res.assigned_wallet || res.wallets[0];
          setAssignedWallet(initial);
        }
      })
      .catch(() => {});
  }, [depositCoin, depositNetwork, authUser?.wallet_address, authUser?.email]);

  const getFallbackAddress = (net: string) => {
    if (net.includes("TRON")) return "TYD9yZ7G8gM2tY9vK8nP7wE6rT5yU4iO3p";
    if (net.includes("BNB") || net.includes("Ethereum")) return "0x71C836e522F5b8Fbe40d34341A5a507E78e1215B";
    if (net.includes("Bitcoin")) return "bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq";
    return "8ZgC8Q3f8sC9b9T4vB2nK8mP7wE6rT5yU4iO3pA2sD1f";
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
      const userAddr = authUser?.wallet_address || authUser?.email || "AxB8s9sHynawdTUeioAgqcQKQ7Y6LvrdiN6ybE6YSrWU";
      const res = await api.verifyOnChainDeposit(
        userAddr,
        cleanHash,
        depositCoin,
        activeDepositAddress,
        String(amtNum)
      );

      if (res.success) {
        if (res.pending) {
          setPendingMsg(res.message || "Deposit queued for block confirmation. Your digits will be automatically released once confirmed on-chain or approved by vault admin.");
          flash("⏳ Deposit queued! Digits release once confirmed on-chain or by admin.");
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
          flash(`🎉 Verified! +$${amtNum.toFixed(2)} USD digits credited immediately!`);
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
      <header className="fullpage-modal-header" style={{ padding: "0.75rem 1.25rem" }}>
        <button type="button" className="fullpage-back-btn" onClick={onClose}>
          <ChevronLeft size={16} />
          <span>Back</span>
        </button>

        <div className="fullpage-header-title">
          <h1 style={{ fontSize: 15 }}>Deposit Crypto</h1>
          <span style={{ fontSize: 10.5 }}>Vault Multi-Sig Inflow</span>
        </div>

        <div className="fullpage-status-badge">
          <span className="pulse-dot" />
          <span>VAULT ACTIVE</span>
        </div>
      </header>

      {/* Main Single-Page Body */}
      <div className="deposit-onepage-body">
        {verifySuccess ? (
          /* Success Receipt Card */
          <div className="deposit-subcard" style={{ textAlign: "center", padding: "28px 20px", maxWidth: 520, margin: "20px auto" }}>
            <div
              style={{
                width: 58,
                height: 58,
                borderRadius: "50%",
                background: "rgba(16, 185, 129, 0.15)",
                border: "2px solid #10B981",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 14px",
                boxShadow: "0 0 20px rgba(16, 185, 129, 0.35)",
              }}
            >
              <ShieldCheck size={32} color="#10B981" />
            </div>

            <h2 style={{ fontSize: 19, fontWeight: 800, margin: "0 0 6px" }}>
              Deposit Verified & Credited!
            </h2>
            <p style={{ fontSize: 12.5, color: "var(--muted)", margin: "0 0 16px" }}>
              Funds confirmed on {depositNetwork.split(" ")[0]} and released into your trading balance.
            </p>

            <div
              style={{
                background: "rgba(0, 0, 0, 0.35)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: 12,
                padding: "14px",
                display: "flex",
                flexDirection: "column",
                gap: 8,
                textAlign: "left",
                marginBottom: 16,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5 }}>
                <span style={{ color: "var(--muted)" }}>Digits Credited:</span>
                <span style={{ fontWeight: 800, color: "#10B981" }}>
                  +${verifySuccess.usdAmount || "50.00"} USD ({verifySuccess.amount} {verifySuccess.currency})
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5 }}>
                <span style={{ color: "var(--muted)" }}>Network:</span>
                <span style={{ fontWeight: 600 }}>{depositNetwork}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5 }}>
                <span style={{ color: "var(--muted)" }}>Tx Hash:</span>
                <span style={{ fontFamily: "monospace", color: "#C4B5FD" }}>
                  {verifySuccess.txHash.slice(0, 10)}...{verifySuccess.txHash.slice(-8)}
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 12.5,
                  paddingTop: 8,
                  borderTop: "1px solid rgba(255, 255, 255, 0.08)",
                }}
              >
                <span style={{ color: "var(--muted)" }}>Available Balance:</span>
                <span style={{ fontWeight: 800, color: "var(--violet, #7C3AED)" }}>
                  ${Number(verifySuccess.newBalance).toFixed(2)} USD
                </span>
              </div>
            </div>

            <button
              type="button"
              className="deposit-verify-btn"
              onClick={() => onDone(`✅ Credited +$${verifySuccess.usdAmount || "50.00"} USD (${verifySuccess.currency})!`)}
            >
              Done • Return to Dashboard
            </button>
          </div>
        ) : (
          /* Unified Single-Page 2-Column Grid (No Scrolling) */
          <div className="deposit-single-grid">
            {/* LEFT PANEL: Asset Selector & Vault Deposit Address */}
            <div className="deposit-panel">
              {/* 1. Asset & Network Selection */}
              <div className="deposit-subcard">
                <div className="deposit-subcard-title">
                  <span>1. Select Asset</span>
                  <span className="deposit-badge-green">0% Fee • Instant Digits</span>
                </div>

                <div className="deposit-assets-compact-row">
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
                        className={`deposit-asset-pill ${isActive ? "active" : ""}`}
                        onClick={() => handleSelectCoin(sym)}
                      >
                        <img src={tokenMeta.iconUrl} alt={sym} />
                        <div className="deposit-asset-pill-text">
                          <span className="sym">{sym}</span>
                          <span className="price">${tokenPrice >= 100 ? tokenPrice.toLocaleString(undefined, { maximumFractionDigits: 0 }) : tokenPrice.toFixed(2)}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Chain Network Selector */}
                <div className="deposit-network-row">
                  {(COIN_NETWORKS[depositCoin] || []).map((net) => {
                    const isNetActive = depositNetwork === net.networkKey;
                    return (
                      <button
                        key={net.networkKey}
                        type="button"
                        className={`deposit-network-pill ${isNetActive ? "active" : ""}`}
                        onClick={() => setDepositNetwork(net.networkKey)}
                      >
                        <span>{net.label}</span>
                        <span className="speed">{net.speed}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Platform Deposit Vault Address & QR */}
              <div className="deposit-subcard">
                <div className="deposit-subcard-title">
                  <span>2. Vault Deposit Address</span>
                  <span className="deposit-badge-network">{depositNetwork.split(" ")[0]}</span>
                </div>

                <div className="vault-address-flex">
                  <div className="vault-qr-box">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(
                        activeDepositAddress
                      )}&margin=2`}
                      width={92}
                      height={92}
                      alt="Deposit QR"
                      style={{ display: "block", borderRadius: 6 }}
                    />
                  </div>
                  <div className="vault-addr-info">
                    <div className="vault-addr-label">Multi-Sig Vault Address</div>
                    <div className="vault-addr-code">{activeDepositAddress}</div>
                    <div className="vault-actions-row">
                      <button
                        type="button"
                        className={`vault-copy-btn ${copiedAddr ? "copied" : ""}`}
                        onClick={handleCopyAddress}
                      >
                        {copiedAddr ? <Check size={13} /> : <Copy size={13} />}
                        <span>{copiedAddr ? "Copied!" : "Copy Address"}</span>
                      </button>
                      <a
                        href={getExplorerLink()}
                        target="_blank"
                        rel="noreferrer"
                        className="vault-explorer-btn"
                      >
                        <ExternalLink size={12} />
                        <span>Explorer</span>
                      </a>
                    </div>
                  </div>
                </div>

                <div className="deposit-warning-bar">
                  <AlertTriangle size={13} style={{ flexShrink: 0 }} />
                  <span>Send only <b>{depositCoin}</b> via <b>{depositNetwork}</b>. Transferring other assets will result in loss.</span>
                </div>
              </div>
            </div>

            {/* RIGHT PANEL: Expected Amount & Auto-Release Verification */}
            <div className="deposit-panel">
              {/* 3. Expected Amount */}
              <div className="deposit-subcard">
                <div className="deposit-subcard-title">
                  <span>3. Expected Amount</span>
                  <span style={{ fontSize: 10.5, color: "var(--muted)" }}>Min: $5.00 USD</span>
                </div>

                <div className="deposit-amount-input-box">
                  <span className="currency-prefix">$</span>
                  <input
                    type="number"
                    min="5"
                    step="5"
                    value={depositAmt}
                    onChange={(e) => {
                      setDepositAmt(e.target.value);
                      setVerifyError(null);
                      setPendingMsg(null);
                    }}
                    placeholder="50.00"
                  />
                  <span className="currency-suffix">USD</span>
                  <div className="crypto-approx-tag">
                    ≈ {cryptoEquivalent < 1 ? cryptoEquivalent.toFixed(6) : cryptoEquivalent.toFixed(2)} {depositCoin}
                  </div>
                </div>

                <div className="deposit-preset-row">
                  {[10, 25, 50, 100, 250, 500, 1000].map((val) => (
                    <button
                      key={val}
                      type="button"
                      className={`deposit-preset-chip ${parseFloat(depositAmt) === val ? "active" : ""}`}
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

              {/* 4. Instant Auto-Release TxID Verification */}
              <div className="deposit-subcard deposit-verify-subcard">
                <div className="deposit-subcard-title">
                  <span style={{ color: "var(--text)", display: "flex", alignItems: "center", gap: 5 }}>
                    <Zap size={13} color="#C4B5FD" />
                    4. Auto-Release Digits (TxID)
                  </span>
                  <span className="deposit-badge-network">On-Chain Verified</span>
                </div>

                <p className="deposit-verify-hint">
                  After transferring from your wallet or exchange (Binance, Phantom, Trust Wallet), paste your TxID / Signature below to verify and release trading digits.
                </p>

                <div className="deposit-txid-input-wrap">
                  <input
                    type="text"
                    value={txHash}
                    onChange={(e) => {
                      setTxHash(e.target.value);
                      setVerifyError(null);
                      setPendingMsg(null);
                    }}
                    placeholder="Paste on-chain TxID / signature hash..."
                  />
                </div>

                <button
                  type="button"
                  className="deposit-verify-btn"
                  onClick={handleVerifyOnChainDeposit}
                  disabled={isVerifying || !txHash.trim()}
                >
                  {isVerifying ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      <span>Verifying On-Chain...</span>
                    </>
                  ) : (
                    <>
                      <Zap size={14} />
                      <span>Verify & Release Digits</span>
                    </>
                  )}
                </button>

                {/* Status feedback */}
                {pendingMsg && (
                  <div className="deposit-feedback-pending">
                    <Clock size={16} style={{ flexShrink: 0 }} />
                    <div>
                      <div style={{ fontWeight: 700 }}>Deposit Submitted • Queued</div>
                      <div style={{ fontSize: 10.5, opacity: 0.9 }}>{pendingMsg}</div>
                    </div>
                  </div>
                )}

                {verifyError && (
                  <div className="deposit-feedback-error">
                    <AlertTriangle size={15} style={{ flexShrink: 0 }} />
                    <span>{verifyError}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
