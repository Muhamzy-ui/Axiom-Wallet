import React, { useState, useEffect } from "react";
import {
  ChevronLeft, Send, CheckCircle2, Clock, AlertTriangle,
  Wallet, ShieldCheck, ArrowRight, Copy, Check, Info, Lock,
  ArrowDownUp, FileText
} from "lucide-react";
import { api } from "../../services/api";
import { marketStore } from "../../services/marketStore";
import { copyToClipboard } from "../../services/clipboard";
import { type AuthUser } from "../../services/authService";
import { WithdrawalReceiptModal, type WithdrawalReceiptData } from "./WithdrawalReceiptModal";
import "./Modals.css";

interface WithdrawPageProps {
  onClose: () => void;
  onDone: (msg: string) => void;
  flash: (msg: string) => void;
  authUser?: AuthUser | null;
  initialMode?: "crypto";
  onNavigateToProfile?: () => void;
}

type WithdrawCoin = "USDT" | "SOL" | "USDC" | "BTC" | "ETH";

const COIN_METAS: Record<WithdrawCoin, { name: string; iconUrl: string }> = {
  USDT: { name: "Tether USD", iconUrl: "https://coin-images.coingecko.com/coins/images/325/large/Tether.png" },
  SOL: { name: "Solana", iconUrl: "https://coin-images.coingecko.com/coins/images/4128/large/solana.png" },
  USDC: { name: "USD Coin", iconUrl: "https://coin-images.coingecko.com/coins/images/6319/large/usdc.png" },
  BTC: { name: "Bitcoin", iconUrl: "https://coin-images.coingecko.com/coins/images/1/large/bitcoin.png" },
  ETH: { name: "Ethereum", iconUrl: "https://coin-images.coingecko.com/coins/images/279/large/ethereum.png" },
};

const SEND_NETWORKS: Record<WithdrawCoin, { label: string; networkKey: string; fee: string; note: string }[]> = {
  USDT: [
    { label: "TRC-20", networkKey: "TRON (TRC-20)", fee: "$0.00", note: "Tron TRC-20 • Low fee • Instant" },
    { label: "BEP-20", networkKey: "BNB Chain (BEP-20)", fee: "$0.00", note: "BNB Smart Chain • Low fee" },
    { label: "Solana", networkKey: "Solana (SPL)", fee: "$0.00", note: "Solana SPL • Instant Settlement" },
    { label: "ERC-20", networkKey: "Ethereum (ERC-20)", fee: "$1.50", note: "Ethereum ERC-20" },
  ],
  SOL: [
    { label: "Solana Native", networkKey: "Solana (SPL)", fee: "$0.00", note: "Solana Mainnet Native" },
  ],
  USDC: [
    { label: "Solana", networkKey: "Solana (SPL)", fee: "$0.00", note: "Solana SPL Circle USD Coin" },
    { label: "ERC-20", networkKey: "Ethereum (ERC-20)", fee: "$1.50", note: "Ethereum ERC-20 USD Coin" },
    { label: "BEP-20", networkKey: "BNB Chain (BEP-20)", fee: "$0.00", note: "BNB Smart Chain" },
  ],
  BTC: [
    { label: "Bitcoin Native", networkKey: "Bitcoin (BTC)", fee: "$0.00", note: "Bitcoin SegWit (bc1) & Legacy" },
  ],
  ETH: [
    { label: "ERC-20", networkKey: "Ethereum (ERC-20)", fee: "$1.50", note: "Ethereum Mainnet Native" },
  ],
};

export const WithdrawPage: React.FC<WithdrawPageProps> = ({
  onClose,
  onDone,
  flash,
  authUser,
  onNavigateToProfile,
}) => {
  // Crypto Withdrawal Form State
  const [sendCoin, setSendCoin] = useState<WithdrawCoin>("USDT");
  const [sendNetwork, setSendNetwork] = useState<string>("TRON (TRC-20)");
  const [recipientAddress, setRecipientAddress] = useState<string>("");
  const [sendAmt, setSendAmt] = useState<string>("");

  // Execution & UI state
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [eligibility, setEligibility] = useState<any>(null);
  const [step, setStep] = useState<"form" | "confirm" | "result">("form");
  const [resultData, setResultData] = useState<any>(null);
  const [showReceiptModal, setShowReceiptModal] = useState<boolean>(false);

  // Balances & Live Token Prices
  const balances = marketStore.getBalances();
  const availableCoinBalance = balances[sendCoin]?.bal || 0;

  const tokenPrice =
    sendCoin === "USDT" || sendCoin === "USDC"
      ? 1.0
      : marketStore.getToken(sendCoin)?.numericPrice ||
        (sendCoin === "SOL" ? 121.69 : sendCoin === "BTC" ? 77724 : 2650);

  const numAmt = parseFloat(sendAmt) || 0;
  const usdValue = numAmt * tokenPrice;

  const getMinAmount = (coin: WithdrawCoin): number => {
    switch (coin) {
      case "USDT":
      case "USDC":
        return 1.0;
      case "SOL":
        return 0.001;
      case "BTC":
        return 0.00001;
      case "ETH":
        return 0.0005;
      default:
        return 1.0;
    }
  };

  const minAmt = getMinAmount(sendCoin);

  const handleSelectCoin = (sym: WithdrawCoin) => {
    setSendCoin(sym);
    const nets = SEND_NETWORKS[sym];
    if (nets && nets.length > 0) {
      setSendNetwork(nets[0].networkKey);
    }
    setSendAmt("");
    setError(null);
  };

  useEffect(() => {
    const userAddr = authUser?.wallet_address || "AxB8s9sHynawdTUeioAgqcQKQ7Y6LvrdiN6ybE6YSrWU";
    api.getWithdrawalEligibility(userAddr).then((res) => {
      setEligibility(res);
    }).catch(() => {});
  }, [authUser]);

  const handleReview = () => {
    setError(null);
    if (isNaN(numAmt) || numAmt < minAmt) {
      setError(`Minimum withdrawal amount is ${minAmt} ${sendCoin}.`);
      return;
    }

    if (numAmt > availableCoinBalance) {
      const dec = sendCoin === "USDT" || sendCoin === "USDC" ? 2 : 4;
      setError(`Insufficient ${sendCoin} balance! Available: ${availableCoinBalance.toFixed(dec)} ${sendCoin}`);
      return;
    }
    if (!recipientAddress.trim() || recipientAddress.trim().length < 15) {
      setError("Please enter a valid destination crypto address.");
      return;
    }

    setStep("confirm");
  };

  const handleExecuteWithdrawal = async () => {
    setIsSubmitting(true);
    setError(null);

    const userAddr = authUser?.wallet_address || authUser?.email || authUser?.user_id || (typeof window !== "undefined" ? localStorage.getItem("axiom_wallet_address") || "" : "") || "AxB8s9sHynawdTUeioAgqcQKQ7Y6LvrdiN6ybE6YSrWU";
    const userTradeCount = marketStore.getUserTradeCount();
    const hasTraded = Boolean(eligibility?.has_trading_activity || userTradeCount > 0);
    const destination = recipientAddress.trim();
    const rail = sendNetwork;

    try {
      const res = await api.requestWithdrawal({
        address: userAddr,
        currency: sendCoin,
        amount: String(numAmt),
        destination_address: destination,
        network: rail,
        has_traded: hasTraded,
        trade_count: (eligibility?.trades_count || 0) + userTradeCount,
        balances: marketStore.getBalances(),
        available_balance: availableCoinBalance,
      });

      // Deduct balance locally and record in user's Recent Activity
      marketStore.withdrawFunds(numAmt, sendCoin, {
        network: rail,
        destinationAddress: destination,
        withdrawalId: res.withdrawal_id,
        txHash: res.tx_hash,
        status: res.is_instant || res.status === "APPROVED" ? "APPROVED" : "PROCESSING",
        fee: "$0.00",
      });

      setResultData({
        is_instant: res.is_instant,
        status: res.status || "PROCESSING",
        withdrawal_id: res.withdrawal_id,
        tx_hash: res.tx_hash,
        amount: res.amount || String(numAmt),
        currency: sendCoin,
        network: rail,
        destination_address: destination,
        message: res.message || "Withdrawal successfully submitted for on-chain network dispatch.",
      });

      setStep("result");
      flash(`✅ Withdrawal Submitted! ${numAmt} ${sendCoin} queued for ${rail} dispatch.`);
    } catch (err: any) {
      setError(err.message || "Failed to process withdrawal. Please try again.");
      setStep("form");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fullpage-modal-wrap">
      {/* Sticky Header */}
      <header className="fullpage-header">
        <button
          type="button"
          className="fullpage-back-btn"
          onClick={() => {
            if (step === "confirm") setStep("form");
            else onClose();
          }}
        >
          <ChevronLeft size={20} />
          <span>{step === "confirm" ? "Back to Edit" : "Close"}</span>
        </button>

        <div className="fullpage-header-title">
          <h1>Withdraw Crypto</h1>
          <span>Fast & secure on-chain cryptocurrency withdrawal</span>
        </div>
      </header>

      {/* Main Body */}
      <div className="fullpage-modal-body">
        {step === "result" && resultData ? (
          /* Step 3: Success Screen */
          <div className="pro-card" style={{ textAlign: "center", padding: "32px 20px" }}>
            {(() => {
              const isApproved = (resultData.status === "APPROVED" || resultData.status === "COMPLETED") && !!resultData.tx_hash;
              const isPaused = resultData.status === "PAUSED";
              const isRejected = resultData.status === "REJECTED";

              return (
                <>
                  <div
                    style={{
                      width: 64,
                      height: 64,
                      borderRadius: "50%",
                      background: isApproved
                        ? "rgba(16, 185, 129, 0.16)"
                        : isPaused
                        ? "rgba(245, 158, 11, 0.16)"
                        : isRejected
                        ? "rgba(239, 68, 68, 0.16)"
                        : "rgba(124, 58, 237, 0.16)",
                      border: `2px solid ${
                        isApproved ? "#10B981" : isPaused ? "#F59E0B" : isRejected ? "#EF4444" : "#A78BFA"
                      }`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      margin: "0 auto 16px",
                      boxShadow: isApproved ? "0 0 28px rgba(16, 185, 129, 0.4)" : "0 0 28px rgba(245, 158, 11, 0.35)",
                    }}
                  >
                    {isApproved ? (
                      <CheckCircle2 size={40} color="#10B981" />
                    ) : isPaused ? (
                      <Clock size={40} color="#F59E0B" />
                    ) : isRejected ? (
                      <AlertTriangle size={40} color="#EF4444" />
                    ) : (
                      <Clock size={40} color="#A78BFA" />
                    )}
                  </div>

                  <h2 style={{ fontSize: 22, fontWeight: 900, margin: "0 0 6px", color: "#F8FAFC" }}>
                    {isApproved
                      ? "Withdrawal Dispatched On-Chain!"
                      : isPaused
                      ? "Withdrawal Queued in Vault"
                      : isRejected
                      ? "Withdrawal Declined"
                      : "Withdrawal Submitted to Queue"}
                  </h2>
                  <p style={{ fontSize: 13, color: "var(--muted)", margin: "0 auto 20px", maxWidth: 380, lineHeight: 1.5 }}>
                    {isApproved
                      ? `Your withdrawal of ${resultData.amount} ${resultData.currency} has been broadcasted on-chain.`
                      : isPaused
                      ? `Your withdrawal of ${resultData.amount} ${resultData.currency} has been verified and queued for vault dispatch.`
                      : isRejected
                      ? `Your withdrawal request was declined. Locked funds have been restored.`
                      : `Your withdrawal of ${resultData.amount} ${resultData.currency} has been received and queued in the dispatch pipeline.`}
                  </p>
                </>
              );
            })()}

            <div
              style={{
                background: "rgba(0, 0, 0, 0.35)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: 14,
                padding: "16px",
                display: "flex",
                flexDirection: "column",
                gap: 11,
                textAlign: "left",
                marginBottom: 20,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                <span style={{ color: "var(--muted)" }}>Amount to Withdraw:</span>
                <span style={{ fontWeight: 900, color: "#10B981" }}>
                  {resultData.amount} {resultData.currency}
                </span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                <span style={{ color: "var(--muted)" }}>Destination Network:</span>
                <span style={{ fontWeight: 700, color: "#60A5FA" }}>{resultData.network}</span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", fontSize: 12.5 }}>
                <span style={{ color: "var(--muted)", flexShrink: 0 }}>Destination Address:</span>
                <span style={{ fontFamily: "monospace", color: "var(--text)", wordBreak: "break-all", textAlign: "right", maxWidth: "60%" }}>
                  {resultData.destination_address}
                </span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                <span style={{ color: "var(--muted)" }}>Estimated Delivery:</span>
                <span style={{ color: "#34D399", fontWeight: 700 }}>~1 - 3 Minutes</span>
              </div>

              {resultData.tx_hash && (
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                  <span style={{ color: "var(--muted)" }}>Transaction Hash:</span>
                  <span style={{ fontFamily: "monospace", color: "#A78BFA" }}>
                    {resultData.tx_hash.slice(0, 10)}...{resultData.tx_hash.slice(-8)}
                  </span>
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, paddingTop: 8, borderTop: "1px solid rgba(255, 255, 255, 0.08)" }}>
                <span style={{ color: "var(--muted)" }}>Status:</span>
                <span
                  style={{
                    fontWeight: 800,
                    fontSize: 11,
                    padding: "3px 10px",
                    borderRadius: 12,
                    background:
                      resultData.status === "APPROVED"
                        ? "rgba(16, 185, 129, 0.15)"
                        : resultData.status === "PAUSED"
                        ? "rgba(245, 158, 11, 0.15)"
                        : resultData.status === "REJECTED"
                        ? "rgba(239, 68, 68, 0.15)"
                        : "rgba(124, 58, 237, 0.15)",
                    color:
                      resultData.status === "APPROVED"
                        ? "#10B981"
                        : resultData.status === "PAUSED"
                        ? "#FBBF24"
                        : resultData.status === "REJECTED"
                        ? "#F87171"
                        : "#C4B5FD",
                    border: `1px solid ${
                      resultData.status === "APPROVED"
                        ? "rgba(16, 185, 129, 0.35)"
                        : resultData.status === "PAUSED"
                        ? "rgba(245, 158, 11, 0.35)"
                        : resultData.status === "REJECTED"
                        ? "rgba(239, 68, 68, 0.35)"
                        : "rgba(167, 139, 250, 0.35)"
                    }`,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                  }}
                >
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background:
                        resultData.status === "APPROVED"
                          ? "#10B981"
                          : resultData.status === "PAUSED"
                          ? "#FBBF24"
                          : resultData.status === "REJECTED"
                          ? "#F87171"
                          : "#C4B5FD",
                    }}
                  />
                  {resultData.status === "APPROVED"
                    ? "Completed On-Chain"
                    : resultData.status === "PAUSED"
                    ? "Queued in Vault"
                    : resultData.status === "REJECTED"
                    ? "Declined"
                    : "In Dispatch Queue"}
                </span>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <button
                type="button"
                className="pro-submit-btn"
                onClick={() => setShowReceiptModal(true)}
                style={{
                  background: "linear-gradient(135deg, #10B981 0%, #059669 100%)",
                  boxShadow: "0 4px 16px rgba(16, 185, 129, 0.4)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                }}
              >
                <FileText size={16} />
                <span>View Official Withdrawal Receipt</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (onNavigateToProfile) {
                    onNavigateToProfile();
                  } else {
                    onDone("Withdrawal submitted");
                  }
                }}
                style={{
                  background: "rgba(124, 58, 237, 0.15)",
                  border: "1px solid rgba(167, 139, 250, 0.3)",
                  borderRadius: 12,
                  color: "#C4B5FD",
                  padding: "12px",
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                }}
              >
                <span>📊 Track in Recent Activities</span>
              </button>

              <button
                type="button"
                onClick={() => onDone("Withdrawal submitted")}
                style={{
                  background: "rgba(255, 255, 255, 0.06)",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  borderRadius: 12,
                  color: "var(--text)",
                  padding: "12px",
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: "pointer",
                  transition: "background 150ms",
                }}
              >
                Done • Return to Wallet
              </button>
            </div>
          </div>
        ) : step === "confirm" ? (
          /* Step 2: Confirmation Review Slip */
          <div className="pro-card">
            <div className="pro-card-header">
              <span className="pro-card-label">Withdrawal Confirmation</span>
              <span style={{ fontSize: 11, color: "var(--muted)" }}>Verify recipient network and address</span>
            </div>

            <div
              style={{
                background: "rgba(0, 0, 0, 0.25)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: 14,
                padding: "16px",
                display: "flex",
                flexDirection: "column",
                gap: 12,
                marginBottom: 16,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                <span style={{ color: "var(--muted)" }}>Asset Selected:</span>
                <span style={{ fontWeight: 700, color: "var(--text)", display: "flex", alignItems: "center", gap: 6 }}>
                  <img src={COIN_METAS[sendCoin].iconUrl} alt={sendCoin} style={{ width: 18, height: 18, borderRadius: "50%" }} />
                  {sendCoin} ({COIN_METAS[sendCoin].name})
                </span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                <span style={{ color: "var(--muted)" }}>Amount to Withdraw:</span>
                <span style={{ fontWeight: 800, fontSize: 16, color: "var(--text)" }}>
                  {numAmt} {sendCoin}
                  {sendCoin !== "USDT" && sendCoin !== "USDC" && (
                    <span style={{ fontSize: 12, color: "var(--muted)", fontWeight: 500, marginLeft: 6 }}>
                      (≈ ${usdValue.toFixed(2)} USD)
                    </span>
                  )}
                </span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: "var(--muted)" }}>Destination Address:</span>
                  <span style={{ fontSize: 11, color: "#10B981", fontWeight: 700 }}>Recipient Verified</span>
                </div>
                <div
                  style={{
                    fontFamily: "monospace",
                    color: "#C4B5FD",
                    fontWeight: 700,
                    fontSize: 12,
                    wordBreak: "break-all",
                    background: "rgba(255, 255, 255, 0.04)",
                    padding: "10px 12px",
                    borderRadius: 10,
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    lineHeight: 1.5,
                  }}
                >
                  {recipientAddress}
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                <span style={{ color: "var(--muted)" }}>Chain Network:</span>
                <span style={{ fontWeight: 600 }}>{sendNetwork}</span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                <span style={{ color: "var(--muted)" }}>Estimated Network Gas:</span>
                <span style={{ color: "#10B981", fontWeight: 700 }}>$0.00 (Zero Fee • Covered)</span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                <span style={{ color: "var(--muted)" }}>Settlement Dispatch:</span>
                <span style={{ color: "#10B981", fontWeight: 700 }}>Direct Network Dispatch</span>
              </div>
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button
                type="button"
                className="pro-submit-btn"
                style={{ flex: 1 }}
                onClick={handleExecuteWithdrawal}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Processing Withdrawal..." : `Withdraw ${numAmt ? numAmt : ""} ${sendCoin}`}
              </button>
              <button
                type="button"
                onClick={() => setStep("form")}
                style={{
                  background: "rgba(255, 255, 255, 0.06)",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  borderRadius: 12,
                  color: "var(--muted)",
                  padding: "0 16px",
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          /* Step 1: Form View */
          <div className="pro-card">
            {/* 1. Crypto Asset Selector Section (Matching Deposit Page) */}
            <div className="card-section">
              <div className="pro-card-header">
                <span className="pro-card-label">1. Select Withdrawal Asset</span>
                <span style={{ fontSize: 11, color: "#10B981", fontWeight: 700 }}>
                  0% Fee • Instant
                </span>
              </div>

              {/* 5-Asset Selector Grid */}
              <div className="asset-selector-grid">
                {(["USDT", "SOL", "USDC", "BTC", "ETH"] as const).map((sym) => {
                  const isActive = sendCoin === sym;
                  const tokenMeta = COIN_METAS[sym];
                  const price =
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
                        ${price >= 100 ? price.toLocaleString(undefined, { maximumFractionDigits: 0 }) : price.toFixed(2)}
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
                  {(SEND_NETWORKS[sendCoin] || []).map((net) => {
                    const isNetActive = sendNetwork === net.networkKey;
                    return (
                      <button
                        key={net.networkKey}
                        type="button"
                        className={`network-pill ${isNetActive ? "active" : ""}`}
                        onClick={() => setSendNetwork(net.networkKey)}
                      >
                        <span>{net.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Automated Cross-Chain Liquidity Bridge Banner */}
                {sendCoin === "USDT" && (
                  <div style={{
                    background: "linear-gradient(135deg, rgba(124, 58, 237, 0.14) 0%, rgba(59, 130, 246, 0.12) 100%)",
                    border: "1px solid rgba(167, 139, 250, 0.3)",
                    borderRadius: 12,
                    padding: "11px 14px",
                    marginTop: 12,
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 10,
                  }}>
                    <ArrowDownUp size={18} color="#A78BFA" style={{ flexShrink: 0, marginTop: 2 }} />
                    <div style={{ fontSize: 11.5, color: "#DDD6FE", lineHeight: 1.45 }}>
                      <strong style={{ color: "#FFFFFF" }}>🔄 Automated Multi-Chain Swap & Bridge:</strong> Your available USDT balance (<strong>{availableCoinBalance.toFixed(2)} USDT</strong>) is unified. You can withdraw directly to <strong>BEP-20, TRC-20, Solana SPL, or ERC-20</strong>. Axiom automatically bridges and converts to your chosen network with 0% slippage and zero fees.
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="card-divider" />

            {/* Available Balance Indicator */}
            <div
              style={{
                background: "rgba(124, 58, 237, 0.08)",
                border: "1px solid rgba(124, 58, 237, 0.2)",
                borderRadius: 12,
                padding: "12px 14px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                margin: "12px 0",
              }}
            >
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase" }}>
                  Available {sendCoin} Balance
                </div>
                <div style={{ fontSize: 18, fontWeight: 900, color: "var(--text)", marginTop: 2 }}>
                  {availableCoinBalance.toLocaleString(undefined, {
                    minimumFractionDigits: sendCoin === "USDT" || sendCoin === "USDC" ? 2 : 4,
                    maximumFractionDigits: sendCoin === "USDT" || sendCoin === "USDC" ? 2 : 6,
                  })}{" "}
                  {sendCoin}
                  {sendCoin !== "USDT" && sendCoin !== "USDC" && (
                    <span style={{ fontSize: 12, color: "var(--muted)", fontWeight: 500, marginLeft: 6 }}>
                      (≈ ${(availableCoinBalance * tokenPrice).toFixed(2)})
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="card-divider" />

            {/* 2. Destination Wallet Address Section */}
            <div className="card-section">
              <div className="pro-card-header">
                <span className="pro-card-label">2. Destination Address</span>
              </div>

              <div style={{ position: "relative" }}>
                <input
                  type="text"
                  className="modal-input"
                  placeholder={
                    sendNetwork.includes("BEP-20")
                      ? "Paste your BNB Chain (BEP-20) address (starts with 0x...)"
                      : sendNetwork.includes("TRC-20")
                      ? "Paste your TRON (TRC-20) address (starts with T...)"
                      : sendNetwork.includes("Solana")
                      ? "Paste your Solana (SPL) address (base58...)"
                      : sendNetwork.includes("ERC-20")
                      ? "Paste your Ethereum (ERC-20) address (starts with 0x...)"
                      : sendCoin === "SOL"
                      ? "Paste your Solana recipient address"
                      : sendCoin === "BTC"
                      ? "Paste your Bitcoin (BTC) address (bc1... or 1...)"
                      : `Paste your ${sendNetwork} address`
                  }
                  value={recipientAddress}
                  onChange={(e) => {
                    setRecipientAddress(e.target.value);
                    setError(null);
                  }}
                  style={{
                    margin: 0,
                    paddingRight: 75,
                    fontFamily: "monospace",
                    fontSize: 12.5,
                  }}
                />
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const text = await navigator.clipboard.readText();
                      if (text) setRecipientAddress(text.trim());
                    } catch {}
                  }}
                  style={{
                    position: "absolute",
                    right: 8,
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "rgba(124, 58, 237, 0.2)",
                    border: "1px solid rgba(124, 58, 237, 0.4)",
                    borderRadius: 6,
                    color: "#C4B5FD",
                    fontSize: 11,
                    fontWeight: 700,
                    padding: "4px 8px",
                    cursor: "pointer",
                  }}
                >
                  PASTE
                </button>
              </div>
            </div>

            <div className="card-divider" />

            {/* 3. Amount Section */}
            <div className="card-section">
              <div className="pro-card-header">
                <span className="pro-card-label">3. Amount to Withdraw</span>
                <span style={{ fontSize: 11, color: "#10B981", fontWeight: 700 }}>
                  Min: {minAmt} {sendCoin}
                </span>
              </div>

              <div className="converter-box">
                <div className="converter-row">
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flex: 1 }}>
                    {sendCoin === "USDT" || sendCoin === "USDC" ? (
                      <span style={{ fontSize: 20, fontWeight: 800, color: "var(--text)" }}>$</span>
                    ) : null}
                    <input
                      type="number"
                      step="any"
                      min={minAmt}
                      className="converter-input"
                      value={sendAmt}
                      onChange={(e) => {
                        setSendAmt(e.target.value);
                        setError(null);
                      }}
                      placeholder={`${minAmt}`}
                    />
                  </div>
                  <div className="converter-badge">
                    <span>{sendCoin}</span>
                  </div>
                </div>
              </div>

              {sendCoin !== "USDT" && sendCoin !== "USDC" && numAmt > 0 && (
                <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>
                  ≈ ${usdValue.toFixed(2)} USD based on live market rate
                </div>
              )}

              {/* Percentage Chips */}
              <div className="preset-chips-row" style={{ marginTop: 8 }}>
                {["25%", "50%", "75%", "MAX"].map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    className="preset-chip-btn"
                    onClick={() => {
                      const maxBal = availableCoinBalance;
                      const fraction = pct === "25%" ? 0.25 : pct === "50%" ? 0.5 : pct === "75%" ? 0.75 : 1.0;
                      const val = maxBal * fraction;
                      setSendAmt(sendCoin === "USDT" || sendCoin === "USDC" ? val.toFixed(2) : val.toFixed(4));
                      setError(null);
                    }}
                  >
                    {pct}
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <div
                style={{
                  background: "rgba(239, 68, 68, 0.12)",
                  border: "1px solid rgba(239, 68, 68, 0.3)",
                  borderRadius: 10,
                  padding: "10px 14px",
                  color: "#FCA5A5",
                  fontSize: 12.5,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginTop: 14,
                }}
              >
                <AlertTriangle size={15} style={{ flexShrink: 0 }} />
                <span>{error}</span>
              </div>
            )}

            <button
              type="button"
              className="pro-submit-btn"
              style={{ marginTop: 20 }}
              onClick={handleReview}
              disabled={isSubmitting}
            >
              Review Withdrawal <ArrowRight size={16} />
            </button>
          </div>
        )}
      </div>

      {/* Official Transaction Receipt Modal */}
      {showReceiptModal && resultData && (
        <WithdrawalReceiptModal
          receipt={{
            withdrawalId: resultData.withdrawal_id,
            amount: resultData.amount,
            currency: resultData.currency,
            network: resultData.network,
            destinationAddress: resultData.destination_address,
            txHash: resultData.tx_hash,
            status: resultData.status,
            fee: "$0.00 (Covered by Axiom)",
            timestamp: Date.now(),
          }}
          onClose={() => setShowReceiptModal(false)}
        />
      )}
    </div>
  );
};
