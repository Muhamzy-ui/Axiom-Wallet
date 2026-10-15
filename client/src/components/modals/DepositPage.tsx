import React, { useState, useEffect, useMemo } from "react";
import {
  ChevronLeft, Copy, Check, ShieldCheck, RefreshCw,
  ExternalLink, AlertTriangle, Clock, ChevronDown, ChevronUp, ArrowRight, Sparkles, Zap
} from "lucide-react";
import { api } from "../../services/api";
import { type PlatformDepositWallet } from "../../types";
import { marketStore } from "../../services/marketStore";
import { copyToClipboard } from "../../services/clipboard";
import { type AuthUser } from "../../services/authService";
import { notificationService } from "../../services/notificationService";
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

const COIN_NETWORKS: Record<DepositCoin, { label: string; networkKey: string; note: string }[]> = {
  USDT: [
    { label: "TRC-20", networkKey: "TRON (TRC-20)", note: "Tron Network • Low $5.00 Min • 0% Fee" },
    { label: "BEP-20", networkKey: "BNB Chain (BEP-20)", note: "BNB Smart Chain • Low fee" },
    { label: "Solana", networkKey: "Solana (SPL)", note: "Solana SPL • Instant settlement" },
    { label: "ERC-20", networkKey: "Ethereum (ERC-20)", note: "Ethereum Mainnet • Institutional" },
  ],
  SOL: [
    { label: "Solana Native", networkKey: "Solana (SPL)", note: "Solana Mainnet-Beta" },
  ],
  USDC: [
    { label: "Solana (SPL)", networkKey: "Solana (SPL)", note: "Solana SPL Circle USD Coin" },
    { label: "ERC-20", networkKey: "Ethereum (ERC-20)", note: "Ethereum ERC-20 USD Coin" },
  ],
  BTC: [
    { label: "Bitcoin Native", networkKey: "Bitcoin (BTC)", note: "Bitcoin SegWit (bc1) & Legacy" },
  ],
  ETH: [
    { label: "ERC-20", networkKey: "Ethereum (ERC-20)", note: "Ethereum Mainnet Native" },
  ],
};

const BTC_VAULT_ADDRESSES = [
  "bc1qejrhpwau5kw5yuv5mg6grvny2ezzd06xqvdrh3",
  "bc1qc3gpaf9ve3crg7p92q55m5afar8v5rqck3ldxj",
  "bc1q7ngavwcymaw6vyywxc7dffpntjv73cfqy7mjkz",
  "bc1ql2vreymfjvm2tgsh8ymlclehr0yz46hdklcjt2",
  "bc1qeswlarfqyaf8kgnjqa5ct3jayap3lmt7v32zag",
];

const BEP20_VAULT_ADDRESSES = [
  "0x8425659A85b2d3fbea3866b4d87E5411076Ee86C",
  "0x12511C86b0613F6eF26Db0A685Bc012E70D0bD80",
  "0x20fFA10142c7DD6f3382A8fe037FFC48C510DAD5",
  "0xE1Af5D79f9F29F5ACa0Efa3FA40bA2AcAd823eC1",
  "0x1AB8ab2CD87E4F09140ced079cC62d0bAe83CA6F",
];

const TRC20_VAULT_ADDRESSES = [
  "TJpieRWnh9KkKT5ch6CmfLDaHwU5cTT3t7",
  "TP8adsNSxAtr6Er7FgcGKR99EgxKj4n5sw",
  "THUqWqgov8Pi4Bc5ByMc3PaidGnLr5U9Sf",
  "TP8adsNSxAtr6Er7FgcGKR99EgxKj4n5sw",
  "TJpieRWnh9KkKT5ch6CmfLDaHwU5cTT3t7",
];

const SOL_VAULT_ADDRESSES = [
  "BPFJfq7jYCeu7vAo1PJx9GDLnoJo6BNnkhPCGTrRvJWi",
  "8hLG4k5K8y5k39xX6owJXkDnu1ScnsW7tfGenPp9cV8k",
  "DiYfaZxHnC4Hf48E8qHxSA4dLe9gRwey6NdFmMiCy11G",
  "AE5g1aVsRAoWAqTaFQVxC3uomWNCsAyauQesPVcn4RVc",
  "7xzCEtZzywDimHzbNNSjaRRaPEbpJkztT5JdhhaQmwVk",
];

const ERC20_VAULT_ADDRESSES = [
  "0x36b25000587762425F2682d721A57eD7d74671F0",
  "0x28C6c06298d514Db089934071355E5743bf21d60",
  "0x21a31Ee1afC51d94C2eFcCAa2092aD1028285549",
  "0x8425659A85b2d3fbea3866b4d87E5411076Ee86C",
  "0x12511C86b0613F6eF26Db0A685Bc012E70D0bD80",
];

export const isMatchingNetwork = (walletNet?: string, targetNet?: string) => {
  if (!walletNet || !targetNet) return false;
  const w = walletNet.toLowerCase();
  const t = targetNet.toLowerCase();
  if (w === t) return true;
  if (t.includes("tron") && w.includes("tron")) return true;
  if ((t.includes("bep") || t.includes("bnb")) && (w.includes("bep") || w.includes("bnb"))) return true;
  if (t.includes("sol") && w.includes("sol")) return true;
  if ((t.includes("btc") || t.includes("bitcoin")) && (w.includes("btc") || w.includes("bitcoin"))) return true;
  if ((t.includes("erc") || t.includes("eth") || t.includes("ethereum")) && (w.includes("erc") || w.includes("eth") || w.includes("ethereum"))) return true;
  return false;
};

export const isValidAddressForCoinAndNetwork = (
  addr?: string,
  coin?: string,
  net?: string,
  userWithdrawalAddr?: string
): boolean => {
  if (!addr || typeof addr !== "string") return false;
  const cleanAddr = addr.trim();
  if (userWithdrawalAddr && cleanAddr.toLowerCase() === userWithdrawalAddr.trim().toLowerCase()) {
    return false; // Platform deposit vault must NEVER be user's personal withdrawal address
  }

  const coinUpper = (coin || "").toUpperCase();
  const netLower = (net || "").toLowerCase();

  const isSol = coinUpper === "SOL" || netLower.includes("sol");
  const isBtc = coinUpper === "BTC" || netLower.includes("btc") || netLower.includes("bitcoin");
  const isBep = (netLower.includes("bep") || netLower.includes("bnb") || netLower.includes("bsc")) && !isSol;
  const isEth = (coinUpper === "ETH" || netLower.includes("eth") || netLower.includes("erc")) && !isSol && !isBep;
  const isTron = netLower.includes("tron") || netLower.includes("trc") || coinUpper === "TRX";

  if (isSol) {
    return (
      !cleanAddr.startsWith("0x") &&
      !cleanAddr.startsWith("T") &&
      !cleanAddr.startsWith("bc1") &&
      cleanAddr.length >= 32 &&
      cleanAddr.length <= 44
    );
  }
  if (isBtc) {
    return cleanAddr.startsWith("bc1") || cleanAddr.startsWith("1") || cleanAddr.startsWith("3");
  }
  if (isBep || isEth) {
    return cleanAddr.startsWith("0x") && cleanAddr.length === 42;
  }
  if (isTron) {
    return cleanAddr.startsWith("T") && cleanAddr.length === 34;
  }
  return true;
};

export const DepositPage: React.FC<DepositPageProps> = ({
  onClose,
  onDone,
  flash,
  authUser,
}) => {
  // Step State: "form" (select coin & amount) -> "address" (copy wallet & scan) -> "success"
  const [depositStep, setDepositStep] = useState<"form" | "address" | "success">("form");

  const [depositCoin, setDepositCoin] = useState<DepositCoin>("USDT");
  const [depositNetwork, setDepositNetwork] = useState<string>("TRON (TRC-20)");
  const [depositAmt, setDepositAmt] = useState<string>("25");
  const [assignedWallet, setAssignedWallet] = useState<PlatformDepositWallet | null>(null);
  const [verifySuccess, setVerifySuccess] = useState<{
    amount: string;
    usdAmount?: string;
    currency: string;
    newBalance: string;
    txHash: string;
  } | null>(null);
  const [copiedAddr, setCopiedAddr] = useState<boolean>(false);
  const [timeLeft, setTimeLeft] = useState<number>(300); // 5 minutes window
  const [availableWallets, setAvailableWallets] = useState<PlatformDepositWallet[]>([]);

  // Automatically assign 1 wallet address from the 5-wallet pool to each individual user
  const userIdentifier =
    authUser?.user_id ||
    authUser?.email ||
    authUser?.wallet_address ||
    (typeof window !== "undefined" ? window.localStorage.getItem("axiom_user_id") : "") ||
    "axiom_user_default";

  const getFallbackAddress = (net: string, coin: DepositCoin = depositCoin) => {
    const netLower = net.toLowerCase();
    const coinUpper = (coin || "").toUpperCase();
    if (coinUpper === "SOL" || netLower.includes("sol")) {
      const idx = Math.floor(Math.random() * SOL_VAULT_ADDRESSES.length);
      return SOL_VAULT_ADDRESSES[idx];
    } else if (coinUpper === "BTC" || netLower.includes("bitcoin") || netLower.includes("btc")) {
      const idx = Math.floor(Math.random() * BTC_VAULT_ADDRESSES.length);
      return BTC_VAULT_ADDRESSES[idx];
    } else if (netLower.includes("bnb") || netLower.includes("bep")) {
      const idx = Math.floor(Math.random() * BEP20_VAULT_ADDRESSES.length);
      return BEP20_VAULT_ADDRESSES[idx];
    } else if (coinUpper === "ETH" || netLower.includes("eth") || netLower.includes("erc")) {
      const idx = Math.floor(Math.random() * ERC20_VAULT_ADDRESSES.length);
      return ERC20_VAULT_ADDRESSES[idx];
    } else if (netLower.includes("tron") || netLower.includes("trc") || coinUpper === "USDT") {
      const idx = Math.floor(Math.random() * TRC20_VAULT_ADDRESSES.length);
      return TRC20_VAULT_ADDRESSES[idx];
    }
    return TRC20_VAULT_ADDRESSES[0];
  };

  const [fallbackAddress, setFallbackAddress] = useState<string>(() => getFallbackAddress(depositNetwork, depositCoin));

  useEffect(() => {
    setFallbackAddress(getFallbackAddress(depositNetwork, depositCoin));
  }, [depositNetwork, depositCoin]);

  const activeDepositAddress = useMemo(() => {
    if (
      assignedWallet &&
      isMatchingNetwork(assignedWallet.network, depositNetwork) &&
      isValidAddressForCoinAndNetwork(assignedWallet.address, depositCoin, depositNetwork, authUser?.wallet_address)
    ) {
      return assignedWallet.address;
    }
    if (isValidAddressForCoinAndNetwork(fallbackAddress, depositCoin, depositNetwork, authUser?.wallet_address)) {
      return fallbackAddress;
    }
    return getFallbackAddress(depositNetwork, depositCoin);
  }, [assignedWallet, depositNetwork, depositCoin, fallbackAddress, authUser?.wallet_address]);

  useEffect(() => {
    if (depositStep !== "address") return;
    if (timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft((t) => Math.max(0, t - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft, depositStep]);

  // Automated on-chain deposit scanner: continuously polls backend detector and auto-credits & redirects upon detection
  useEffect(() => {
    if (depositStep !== "address" || timeLeft <= 0) return;
    const detector = setInterval(async () => {
      try {
        const res = await api.autoDetectDeposit({
          address: userIdentifier,
          deposit_wallet: activeDepositAddress,
          currency: depositCoin,
          network: depositNetwork,
          amount: depositAmt,
        });
        if (res && res.detected && (res.status === "CONFIRMED" || res.status === "COMPLETED")) {
          const creditedTokenAmt = parseFloat(res.credited_amount || depositAmt);
          marketStore.depositFunds(depositCoin, creditedTokenAmt);
          setVerifySuccess({
            amount: res.credited_amount || depositAmt,
            usdAmount: res.usd_amount || depositAmt,
            currency: res.currency || depositCoin,
            newBalance: res.new_balance || "",
            txHash: res.tx_hash || "on-chain-auto-detected",
          });
          setDepositStep("success");
          flash(`🎉 Deposit auto-detected! +$${depositAmt} USD credited to your wallet!`);
          try {
            notificationService.sendLocalNotification(
              `Deposit Confirmed 💰 (+${creditedTokenAmt} ${depositCoin})`,
              `Received +${creditedTokenAmt} ${depositCoin} ($${depositAmt} USD). Credited instantly to your Axiom Wallet.`
            );
            notificationService.triggerImmediateSync();
          } catch {}
          setTimeout(() => {
            onDone(`✅ Credited +$${depositAmt} USD to your Axiom Wallet!`);
          }, 1800);
        }
      } catch {
        // Continue scanning
      }
    }, 4000);
    return () => clearInterval(detector);
  }, [depositStep, timeLeft, userIdentifier, activeDepositAddress, depositCoin, depositNetwork, depositAmt, onDone, flash]);


  const handleRefreshOrder = () => {
    setTimeLeft(300);
    const matching = availableWallets.filter(
      (w) =>
        isMatchingNetwork(w.network, depositNetwork) &&
        w.is_active &&
        isValidAddressForCoinAndNetwork(w.address, depositCoin, depositNetwork, authUser?.wallet_address)
    );
    if (matching.length > 0) {
      setAssignedWallet(matching[Math.floor(Math.random() * matching.length)]);
    } else {
      setAssignedWallet(null);
      setFallbackAddress(getFallbackAddress(depositNetwork, depositCoin));
    }
    api
      .getDepositWallets(userIdentifier, depositNetwork, depositCoin)
      .then((res) => {
        if (res?.wallets && res.wallets.length > 0) {
          setAvailableWallets(res.wallets);
          const freshMatching = res.wallets.filter(
            (w: any) =>
              isMatchingNetwork(w.network, depositNetwork) &&
              w.is_active &&
              isValidAddressForCoinAndNetwork(w.address, depositCoin, depositNetwork, authUser?.wallet_address)
          );
          if (freshMatching.length > 0) {
            setAssignedWallet(freshMatching[Math.floor(Math.random() * freshMatching.length)]);
          } else if (
            res.assigned_wallet &&
            isMatchingNetwork(res.assigned_wallet.network, depositNetwork) &&
            isValidAddressForCoinAndNetwork(res.assigned_wallet.address, depositCoin, depositNetwork, authUser?.wallet_address)
          ) {
            setAssignedWallet(res.assigned_wallet);
          }
        }
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
    const defaultNet = availableNets && availableNets.length > 0 ? availableNets[0].networkKey : "TRON (TRC-20)";
    setDepositNetwork(defaultNet);
    setFallbackAddress(getFallbackAddress(defaultNet, sym));
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

  useEffect(() => {
    api
      .getDepositWallets(userIdentifier, depositNetwork, depositCoin)
      .then((res) => {
        if (res) {
          if (res.wallets && res.wallets.length > 0) {
            setAvailableWallets(res.wallets);
          }
          const matching = (res.wallets || []).filter(
            (w: any) =>
              isMatchingNetwork(w.network, depositNetwork) &&
              w.is_active &&
              isValidAddressForCoinAndNetwork(w.address, depositCoin, depositNetwork, authUser?.wallet_address)
          );
          if (
            res.assigned_wallet &&
            isMatchingNetwork(res.assigned_wallet.network, depositNetwork) &&
            isValidAddressForCoinAndNetwork(res.assigned_wallet.address, depositCoin, depositNetwork, authUser?.wallet_address)
          ) {
            setAssignedWallet(res.assigned_wallet);
          } else if (matching.length > 0) {
            setAssignedWallet(matching[Math.floor(Math.random() * matching.length)]);
          } else {
            setAssignedWallet(null);
            setFallbackAddress(getFallbackAddress(depositNetwork, depositCoin));
          }
        }
      })
      .catch(() => {});
  }, [depositCoin, depositNetwork, userIdentifier, authUser?.wallet_address]);

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

  const handleProceedToAddress = () => {
    const amtNum = parseFloat(depositAmt) || 0;
    if (isNaN(amtNum) || amtNum < 5.0) {
      flash("⚠️ Minimum deposit is $5.00 USD");
      return;
    }
    const matching = availableWallets.filter(
      (w) =>
        isMatchingNetwork(w.network, depositNetwork) &&
        w.is_active &&
        isValidAddressForCoinAndNetwork(w.address, depositCoin, depositNetwork, authUser?.wallet_address)
    );
    if (matching.length > 0) {
      setAssignedWallet(matching[Math.floor(Math.random() * matching.length)]);
    } else {
      setAssignedWallet(null);
      setFallbackAddress(getFallbackAddress(depositNetwork, depositCoin));
    }
    setTimeLeft(300);
    setDepositStep("address");
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
        <button
          type="button"
          className="fullpage-back-btn"
          onClick={() => {
            if (depositStep === "address") {
              setDepositStep("form");
            } else {
              onClose();
            }
          }}
        >
          <ChevronLeft size={16} />
          <span>{depositStep === "address" ? "Back" : "Close"}</span>
        </button>

        <div className="fullpage-header-title">
          <h1>Deposit Crypto</h1>
          <span>
            {depositStep === "form"
              ? "Step 1 of 2: Select Coin & Amount"
              : depositStep === "address"
              ? "Step 2 of 2: Copy Address & Send"
              : "Deposit Complete"}
          </span>
        </div>

        <div style={{ width: 68 }} />
      </header>

      {/* Main Scrollable Body */}
      <div className="fullpage-modal-body">
        {depositStep === "success" && verifySuccess ? (
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
              onClick={() => onDone(`✅ Credited +$${verifySuccess.usdAmount || depositAmt} USD (${verifySuccess.currency})!`)}
            >
              Go to Axiom Wallet →
            </button>
          </div>
        ) : depositStep === "form" ? (
          /* STEP 1: Select Coin, Network & Amount */
          <>
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
                          {net.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="card-divider" />

              {/* 2. Deposit Amount & Conversion Calculator Section */}
              <div className="card-section">
                <div className="pro-card-header">
                  <span className="pro-card-label">2. Expected Deposit Amount ($ USD)</span>
                  <span style={{ fontSize: 11, color: "#10B981", fontWeight: 700 }}>
                    Min: $5.00 USD • 0% Fee
                  </span>
                </div>

                <div className="converter-box">
                  <div className="converter-input-row">
                    <span className="converter-currency-sym">$</span>
                    <input
                      type="number"
                      min="5"
                      step="1"
                      className="converter-input"
                      value={depositAmt}
                      onChange={(e) => {
                        setDepositAmt(e.target.value);
                      }}
                      placeholder="25.00"
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
                  {[5, 10, 25, 50, 100, 200, 500].map((val) => (
                    <button
                      key={val}
                      type="button"
                      className={`preset-chip-btn ${parseFloat(depositAmt) === val ? "active" : ""}`}
                      onClick={() => {
                        setDepositAmt(String(val));
                      }}
                    >
                      ${val}
                    </button>
                  ))}
                </div>
              </div>

              <div className="card-divider" />

              {/* 3. Security Guarantee Section */}
              <div className="card-section">
                <div
                  style={{
                    background: "rgba(124, 58, 237, 0.08)",
                    border: "1px solid rgba(124, 58, 237, 0.22)",
                    borderRadius: 12,
                    padding: "12px 14px",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <ShieldCheck size={22} color="#10B981" style={{ flexShrink: 0 }} />
                  <div style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.4 }}>
                    <strong style={{ color: "#fff" }}>Non-Custodial Vault Protection:</strong> Next, you will receive your dedicated multi-sig wallet address and QR code to copy and fund.
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Action CTA */}
            <div className="mobile-sticky-action-bar">
              <button
                type="button"
                className="pro-submit-btn"
                onClick={handleProceedToAddress}
              >
                <span>Proceed to Deposit Address (${depositAmt} USD)</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </>
        ) : (
          /* STEP 2: Dedicated Copy Wallet & QR Code Page */
          <>
            <div className="pro-card">
              {/* Order Summary Header Banner */}
              <div
                style={{
                  background: "rgba(124, 58, 237, 0.12)",
                  border: "1px solid rgba(124, 58, 237, 0.3)",
                  borderRadius: 14,
                  padding: "14px 16px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 16,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <img
                    src={COIN_METAS[depositCoin].iconUrl}
                    alt={depositCoin}
                    style={{ width: 32, height: 32, borderRadius: "50%" }}
                  />
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: "var(--text, #fff)" }}>
                      Send ${depositAmt} USD ({depositCoin})
                    </div>
                    <div style={{ fontSize: 11.5, color: "#C4B5FD", marginTop: 2 }}>
                      Network: <b>{depositNetwork}</b>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setDepositStep("form")}
                  style={{
                    background: "rgba(255, 255, 255, 0.08)",
                    border: "1px solid rgba(255, 255, 255, 0.15)",
                    color: "#fff",
                    borderRadius: 8,
                    padding: "6px 12px",
                    fontSize: 11.5,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  ← Edit
                </button>
              </div>

              {/* 5-Minute Expiration Order Card */}
              {timeLeft > 0 ? (
                <div
                  style={{
                    background: "rgba(10, 11, 20, 0.65)",
                    border: "1px solid rgba(245, 158, 11, 0.25)",
                    borderRadius: 12,
                    padding: "12px 14px",
                    marginBottom: 16,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <Clock size={15} color="#F59E0B" />
                      <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--text, #fff)" }}>
                        Order Expires In:
                      </span>
                    </div>
                    <span
                      style={{
                        fontFamily: "monospace",
                        color: timeLeft <= 60 ? "#EF4444" : "#F59E0B",
                        fontSize: 15,
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

                  <p style={{ fontSize: 11.5, color: "var(--muted, #94A3B8)", margin: "0 0 8px 0", lineHeight: 1.4 }}>
                    Send <strong style={{ color: "#fff" }}>{depositAmt} USD</strong> ({cryptoEquivalent.toFixed(depositCoin === "USDT" || depositCoin === "USDC" ? 2 : 4)} {depositCoin}) to your dedicated address below.
                  </p>

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
                    marginBottom: 16,
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

              {/* QR Code Section */}
              <div className="card-section" style={{ textAlign: "center" }}>
                <div className="pro-card-header">
                  <span className="pro-card-label">Deposit Address & QR Code</span>
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

                {/* Monospace Address with Big Copy Button */}
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
                    <span>{timeLeft <= 0 ? "Expired" : copiedAddr ? "Copied!" : "Copy Address"}</span>
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
            </div>

            {/* Back to Step 1 Button */}
            <div style={{ padding: "0 4px 16px" }}>
              <button
                type="button"
                onClick={() => setDepositStep("form")}
                style={{
                  width: "100%",
                  background: "rgba(255, 255, 255, 0.05)",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  color: "var(--muted)",
                  padding: "12px",
                  borderRadius: 12,
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                ← Back to Step 1 (Change Amount or Coin)
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
