import React, { useState, useEffect } from "react";
import {
  ChevronLeft, Send, CheckCircle2, Clock, AlertTriangle,
  Wallet, ShieldCheck, ArrowRight, Copy, Check
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

type WithdrawCoin = "USDT" | "USDC" | "SOL";

const SEND_NETWORKS: Record<WithdrawCoin, { label: string; networkKey: string; fee: string; note: string }[]> = {
  USDT: [
    { label: "TRC-20", networkKey: "TRON (TRC-20)", fee: "$0.00", note: "Tron TRC-20 • Fast & Zero Fee" },
    { label: "BEP-20", networkKey: "BNB Chain (BEP-20)", fee: "$0.00", note: "BNB Smart Chain" },
    { label: "Solana", networkKey: "Solana (SPL)", fee: "$0.00", note: "Solana SPL • Instant Settlement" },
    { label: "ERC-20", networkKey: "Ethereum (ERC-20)", fee: "$1.50", note: "Ethereum ERC-20" },
  ],
  USDC: [
    { label: "Solana", networkKey: "Solana (SPL)", fee: "$0.00", note: "Solana SPL Circle USD Coin" },
    { label: "ERC-20", networkKey: "Ethereum (ERC-20)", fee: "$1.50", note: "Ethereum ERC-20 USD Coin" },
  ],
  SOL: [
    { label: "Solana Native", networkKey: "Solana (SPL)", fee: "$0.00", note: "Solana Mainnet Native" },
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

  // Available Balances
  const balances = marketStore.getBalances();
  const availableCoinBalance = balances[sendCoin]?.bal || 0;

  const handleSelectCoin = (sym: WithdrawCoin) => {
    setSendCoin(sym);
    const nets = SEND_NETWORKS[sym];
    if (nets && nets.length > 0) {
      setSendNetwork(nets[0].networkKey);
    }
  };

  useEffect(() => {
    const userAddr = authUser?.wallet_address || "AxB8s9sHynawdTUeioAgqcQKQ7Y6LvrdiN6ybE6YSrWU";
    api.getWithdrawalEligibility(userAddr).then((res) => {
      setEligibility(res);
    }).catch(() => {});
  }, [authUser]);

  const numAmt = parseFloat(sendAmt) || 0;

  const handleReview = () => {
    setError(null);
    if (isNaN(numAmt) || numAmt < 10.0) {
      setError("Minimum withdrawal amount is $10.00 USD.");
      return;
    }

    if (numAmt > availableCoinBalance) {
      setError(`Insufficient ${sendCoin} balance! Available: $${availableCoinBalance.toFixed(2)}`);
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

    const userAddr = authUser?.wallet_address || "AxB8s9sHynawdTUeioAgqcQKQ7Y6LvrdiN6ybE6YSrWU";
    const userTradeCount = marketStore.getUserTradeCount();
    const hasTraded = Boolean(eligibility?.has_trading_activity || userTradeCount > 0);
    const destination = recipientAddress.trim();
    const rail = sendNetwork;

    try {
      const res = await api.requestWithdrawal({
        address: userAddr,
        currency: sendCoin,
        amount: numAmt.toFixed(2),
        destination_address: destination,
        network: rail,
        has_traded: hasTraded,
        trade_count: (eligibility?.trades_count || 0) + userTradeCount,
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
      if (res.is_instant) {
        flash(`Withdrawal processed successfully! +$${numAmt.toFixed(2)} sent`);
      } else {
        flash(`Withdrawal #${res.withdrawal_id} submitted for vault dispatch`);
      }
    } catch (err: any) {
      setError(err.message || "Failed to process withdrawal. Please try again.");
      setStep("form");
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentNetworks = SEND_NETWORKS[sendCoin] || [];

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
                background: resultData.is_instant ? "rgba(16, 185, 129, 0.15)" : "rgba(245, 158, 11, 0.15)",
                border: `2px solid ${resultData.is_instant ? "#10B981" : "#F59E0B"}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 16px",
                boxShadow: resultData.is_instant
                  ? "0 0 24px rgba(16, 185, 129, 0.35)"
                  : "0 0 24px rgba(245, 158, 11, 0.35)",
              }}
            >
              {resultData.is_instant ? (
                <CheckCircle2 size={36} color="#10B981" />
              ) : (
                <Clock size={36} color="#F59E0B" />
              )}
            </div>

            <h2 style={{ fontSize: 20, fontWeight: 800, margin: "0 0 6px" }}>
              {resultData.is_instant ? "Withdrawal Dispatched Instantly!" : "Withdrawal Submitted for Vault Processing"}
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
                  ${resultData.amount} {resultData.currency}
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
                    background: resultData.is_instant ? "rgba(16, 185, 129, 0.15)" : "rgba(245, 158, 11, 0.15)",
                    color: resultData.is_instant ? "#10B981" : "#F59E0B",
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
                <span style={{ color: "var(--muted)" }}>Payout Method:</span>
                <span style={{ fontWeight: 700, color: "var(--text)" }}>Crypto Wallet</span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                <span style={{ color: "var(--muted)" }}>Amount to Send:</span>
                <span style={{ fontWeight: 800, fontSize: 16, color: "var(--text)" }}>
                  ${numAmt.toFixed(2)} {sendCoin}
                </span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                <span style={{ color: "var(--muted)" }}>Destination Address:</span>
                <span style={{ fontFamily: "monospace", color: "#C4B5FD", fontWeight: 700, fontSize: 12 }}>
                  {recipientAddress}
                </span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                <span style={{ color: "var(--muted)" }}>Network:</span>
                <span style={{ fontWeight: 600 }}>{sendNetwork}</span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                <span style={{ color: "var(--muted)" }}>Estimated Network Gas:</span>
                <span style={{ color: "#10B981", fontWeight: 700 }}>$0.00 (Zero Fee)</span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                <span style={{ color: "var(--muted)" }}>Settlement Dispatch:</span>
                <span style={{ color: "#10B981", fontWeight: 700 }}>Instant Ledger Routing</span>
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
            {/* Header: Available Balance Banner */}
            <div
              style={{
                background: "rgba(124, 58, 237, 0.1)",
                border: "1px solid rgba(124, 58, 237, 0.25)",
                borderRadius: 14,
                padding: "14px 16px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase" }}>
                  Available {sendCoin} Balance
                </div>
                <div style={{ fontSize: 22, fontWeight: 900, color: "var(--text)", marginTop: 2 }}>
                  ${availableCoinBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <span style={{ fontSize: 10, fontWeight: 800, padding: "3px 8px", borderRadius: 10, background: "rgba(16, 185, 129, 0.15)", color: "#10B981" }}>
                  INSTANT PAYOUT ACTIVE
                </span>
              </div>
            </div>

            <div className="card-divider" />

            {/* 1. Asset & Network Section */}
            <div className="card-section">
              <div className="pro-card-header">
                <span className="pro-card-label">1. Asset & Network</span>
              </div>

              <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                {(["USDT", "USDC", "SOL"] as const).map((sym) => (
                  <button
                    key={sym}
                    type="button"
                    className={`asset-pill ${sendCoin === sym ? "active" : ""}`}
                    style={{ flex: 1, padding: "8px" }}
                    onClick={() => handleSelectCoin(sym)}
                  >
                    <span className="asset-pill-sym">{sym}</span>
                    <span className="asset-pill-price">${(balances[sym]?.bal || 0).toFixed(2)}</span>
                  </button>
                ))}
              </div>

              {/* Network Select Dropdown */}
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)" }}>
                  Select Transfer Network:
                </label>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 6 }}>
                  {currentNetworks.map((net) => {
                    const isSel = sendNetwork === net.networkKey;
                    return (
                      <button
                        key={net.networkKey}
                        type="button"
                        onClick={() => setSendNetwork(net.networkKey)}
                        style={{
                          background: isSel ? "rgba(124, 58, 237, 0.25)" : "rgba(255, 255, 255, 0.04)",
                          border: isSel ? "1.5px solid #8B5CF6" : "1px solid rgba(255, 255, 255, 0.08)",
                          borderRadius: 10,
                          padding: "8px 10px",
                          textAlign: "left",
                          cursor: "pointer",
                          display: "flex",
                          flexDirection: "column",
                          gap: 2,
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: isSel ? "#fff" : "var(--text)" }}>
                            {net.label}
                          </span>
                          <span style={{ fontSize: 10, color: "#10B981", fontWeight: 700 }}>
                            {net.fee}
                          </span>
                        </div>
                        <span style={{ fontSize: 10, color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {net.note}
                        </span>
                      </button>
                    );
                  })}
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
                  Min: $10.00 USD
                </span>
              </div>

              <div className="converter-box">
                <div className="converter-row">
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flex: 1 }}>
                    <span style={{ fontSize: 20, fontWeight: 800, color: "var(--text)" }}>$</span>
                    <input
                      type="number"
                      min="10"
                      className="converter-input"
                      value={sendAmt}
                      onChange={(e) => {
                        setSendAmt(e.target.value);
                        setError(null);
                      }}
                      placeholder="10.00"
                    />
                  </div>
                  <div className="converter-badge">
                    <span>{sendCoin}</span>
                  </div>
                </div>
              </div>

              {/* Percentage Chips */}
              <div className="preset-chips-row">
                {["25%", "50%", "75%", "MAX"].map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    className="preset-chip-btn"
                    onClick={() => {
                      const maxBal = availableCoinBalance;
                      const fraction = pct === "25%" ? 0.25 : pct === "50%" ? 0.5 : pct === "75%" ? 0.75 : 1.0;
                      setSendAmt((maxBal * fraction).toFixed(2));
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
