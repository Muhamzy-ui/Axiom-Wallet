import React, { useState, useEffect } from "react";
import {
  ChevronLeft, Send, CheckCircle2, Clock, AlertTriangle,
  Wallet, ShieldCheck, ArrowRight, Copy, Check, Info, Lock
} from "lucide-react";
import { api } from "../../services/api";
import { marketStore } from "../../services/marketStore";
import { copyToClipboard } from "../../services/clipboard";
import { type AuthUser } from "../../services/authService";
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
        return 10.0;
      case "SOL":
        return 0.05;
      case "BTC":
        return 0.0001;
      case "ETH":
        return 0.003;
      default:
        return 10.0;
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

      // Deduct balance locally
      marketStore.withdrawFunds(numAmt, sendCoin);

      setResultData({
        is_instant: res.is_instant,
        status: res.status,
        withdrawal_id: res.withdrawal_id,
        tx_hash: res.tx_hash,
        amount: res.amount,
        currency: sendCoin,
        network: rail,
        destination_address: destination,
        message: res.message,
      });

      setStep("result");
      if (res.is_instant || res.status === "APPROVED") {
        flash(`Withdrawal processed successfully! +${numAmt} ${sendCoin} dispatched`);
      } else if (res.status === "PAUSED") {
        flash(`Withdrawal #${res.withdrawal_id} queued for vault dispatch verification`);
      } else {
        flash(`Withdrawal #${res.withdrawal_id} submitted for vault processing`);
      }
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
          <span>On-chain cryptocurrency withdrawal with direct vault routing</span>
        </div>
      </header>

      {/* Main Body */}
      <div className="fullpage-modal-body">
        {step === "result" && resultData ? (
          /* Step 3: Result Screen */
          <div className="pro-card" style={{ textAlign: "center", padding: "30px 20px" }}>
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: "50%",
                background: resultData.is_instant || resultData.status === "APPROVED"
                  ? "rgba(16, 185, 129, 0.15)"
                  : "rgba(245, 158, 11, 0.15)",
                border: `2px solid ${resultData.is_instant || resultData.status === "APPROVED" ? "#10B981" : "#F59E0B"}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 16px",
                boxShadow: resultData.is_instant || resultData.status === "APPROVED"
                  ? "0 0 24px rgba(16, 185, 129, 0.35)"
                  : "0 0 24px rgba(245, 158, 11, 0.35)",
              }}
            >
              {resultData.is_instant || resultData.status === "APPROVED" ? (
                <CheckCircle2 size={36} color="#10B981" />
              ) : (
                <Clock size={36} color="#F59E0B" />
              )}
            </div>

            <h2 style={{ fontSize: 20, fontWeight: 800, margin: "0 0 6px" }}>
              {resultData.is_instant || resultData.status === "APPROVED"
                ? "Withdrawal Dispatched Instantly!"
                : resultData.status === "PAUSED"
                ? "Withdrawal Queued for Vault Authorization"
                : "Withdrawal Submitted for Processing"}
            </h2>
            <p style={{ fontSize: 13, color: "var(--muted)", margin: "0 0 20px" }}>
              {resultData.message}
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
                <span style={{ color: "var(--muted)" }}>Amount:</span>
                <span style={{ fontWeight: 800, color: "#10B981" }}>
                  {resultData.amount} {resultData.currency}
                </span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                <span style={{ color: "var(--muted)" }}>Transfer Network:</span>
                <span style={{ fontWeight: 600 }}>{resultData.network}</span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                <span style={{ color: "var(--muted)" }}>Destination Address:</span>
                <span style={{ fontFamily: "monospace", color: "var(--text)" }}>
                  {resultData.destination_address.slice(0, 10)}...{resultData.destination_address.slice(-6)}
                </span>
              </div>

              {resultData.tx_hash && (
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                  <span style={{ color: "var(--muted)" }}>Transaction Hash:</span>
                  <span style={{ fontFamily: "monospace", color: "#A78BFA" }}>
                    {resultData.tx_hash}
                  </span>
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, paddingTop: 8, borderTop: "1px solid rgba(255, 255, 255, 0.08)" }}>
                <span style={{ color: "var(--muted)" }}>Status:</span>
                <span
                  style={{
                    fontWeight: 800,
                    fontSize: 11,
                    padding: "2px 8px",
                    borderRadius: 6,
                    background: resultData.is_instant || resultData.status === "APPROVED"
                      ? "rgba(16, 185, 129, 0.15)"
                      : resultData.status === "PAUSED"
                      ? "rgba(245, 158, 11, 0.2)"
                      : "rgba(245, 158, 11, 0.15)",
                    color: resultData.is_instant || resultData.status === "APPROVED"
                      ? "#10B981"
                      : resultData.status === "PAUSED"
                      ? "#FBBF24"
                      : "#F59E0B",
                  }}
                >
                  {resultData.status || "PROCESSING"}
                </span>
              </div>
            </div>

            <button
              type="button"
              className="pro-submit-btn"
              onClick={() => onDone("Withdrawal completed")}
            >
              Done • Return to Wallet
            </button>
          </div>
        ) : step === "confirm" ? (
          /* Step 2: Confirmation Review Slip */
          <div className="pro-card">
            <div className="pro-card-header">
              <span className="pro-card-label">Confirm On-Chain Withdrawal</span>
              <span style={{ fontSize: 11, color: "var(--muted)" }}>Review details carefully</span>
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
                <span style={{ color: "var(--muted)" }}>Amount to Send:</span>
                <span style={{ fontWeight: 800, fontSize: 16, color: "var(--text)" }}>
                  {numAmt} {sendCoin}
                  {sendCoin !== "USDT" && sendCoin !== "USDC" && (
                    <span style={{ fontSize: 12, color: "var(--muted)", fontWeight: 500, marginLeft: 6 }}>
                      (≈ ${usdValue.toFixed(2)} USD)
                    </span>
                  )}
                </span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                <span style={{ color: "var(--muted)" }}>Destination Address:</span>
                <span style={{ fontFamily: "monospace", color: "#C4B5FD", fontWeight: 700, fontSize: 12 }}>
                  {recipientAddress}
                </span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                <span style={{ color: "var(--muted)" }}>Chain Network:</span>
                <span style={{ fontWeight: 600 }}>{sendNetwork}</span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                <span style={{ color: "var(--muted)" }}>Estimated Network Gas:</span>
                <span style={{ color: "#10B981", fontWeight: 700 }}>$0.00 (Zero Fee)</span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                <span style={{ color: "var(--muted)" }}>Settlement Dispatch:</span>
                <span style={{ color: "#10B981", fontWeight: 700 }}>Automated Vault Dispatch</span>
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
                {isSubmitting ? "Processing Withdrawal..." : "Confirm & Send Funds"}
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
              <div style={{ textAlign: "right" }}>
                <span style={{ fontSize: 10, fontWeight: 800, padding: "3px 8px", borderRadius: 10, background: "rgba(16, 185, 129, 0.15)", color: "#10B981" }}>
                  VAULT DISPATCH ACTIVE
                </span>
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
                  placeholder={`Paste your ${sendNetwork} address`}
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
    </div>
  );
};
