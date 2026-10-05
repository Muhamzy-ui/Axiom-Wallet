import React, { useState } from "react";
import {
  ChevronLeft, Send, CheckCircle2, AlertTriangle,
  ShieldCheck, Zap, UserCheck, Check
} from "lucide-react";
import { api } from "../../services/api";
import { marketStore } from "../../services/marketStore";
import { type AuthUser } from "../../services/authService";
import { notificationService } from "../../services/notificationService";
import "./Modals.css";

interface SendPageProps {
  onClose: () => void;
  onDone: (msg: string) => void;
  flash: (msg: string) => void;
  authUser?: AuthUser | null;
}

type SendCoin = "USDT" | "USDC" | "SOL" | "BTC" | "ETH";

export const SendPage: React.FC<SendPageProps> = ({
  onClose,
  onDone,
  flash,
  authUser,
}) => {
  const myUid = authUser?.user_id
    ? `AXM-${authUser.user_id.replace(/[^a-zA-Z0-9]/g, "").slice(0, 8).toUpperCase()}`
    : (authUser?.wallet_address ? `AXM-${authUser.wallet_address.replace(/[^a-zA-Z0-9]/g, "").slice(0, 8).toUpperCase()}` : "AXM-8F2A9C");

  // Send Form State
  const [sendCoin, setSendCoin] = useState<SendCoin>("USDT");
  const [recipientUid, setRecipientUid] = useState<string>("");
  const [sendAmt, setSendAmt] = useState<string>("");

  // Execution & UI state
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<"form" | "confirm" | "result">("form");
  const [resultData, setResultData] = useState<any>(null);

  // Available Balances
  const balances = marketStore.getBalances();
  const availableBalance = balances[sendCoin]?.bal || 0;

  const numAmt = parseFloat(sendAmt) || 0;

  const handleReview = () => {
    setError(null);
    if (isNaN(numAmt) || numAmt <= 0) {
      setError("Please enter a valid amount to send.");
      return;
    }

    const cleanUid = recipientUid.trim().toUpperCase();
    if (!cleanUid) {
      setError("Please enter the recipient's Axiom UID.");
      return;
    }

    if (cleanUid === myUid.toUpperCase()) {
      setError("You cannot transfer funds to your own UID.");
      return;
    }

    if (cleanUid.length < 5) {
      setError("Please enter a valid Axiom UID (e.g. AXM-8F2A9C).");
      return;
    }

    if (numAmt > availableBalance) {
      setError(`Insufficient ${sendCoin} balance! Available: ${availableBalance.toFixed(sendCoin === "BTC" || sendCoin === "ETH" || sendCoin === "SOL" ? 4 : 2)} ${sendCoin}`);
      return;
    }

    setStep("confirm");
  };

  const handleExecuteTransfer = async () => {
    setIsSubmitting(true);
    setError(null);

    const userAddr =
      authUser?.wallet_address ||
      authUser?.user_id ||
      authUser?.email ||
      (typeof localStorage !== "undefined" ? localStorage.getItem("axiom_user_id") : "") ||
      "";
    const cleanUid = recipientUid.trim().toUpperCase();

    try {
      const localRes = marketStore.transferFundsToUid(sendCoin, numAmt, cleanUid);
      if (!localRes.success) {
        setError(localRes.message);
        setIsSubmitting(false);
        setStep("form");
        return;
      }

      // Backend API sync
      let txHashVal = `axm_p2p_${Date.now().toString(36)}`;
      try {
        const apiRes = await api.internalTransferUid({
          sender_address: userAddr,
          recipient_uid: cleanUid,
          currency: sendCoin,
          amount: numAmt,
        });
        if (apiRes && apiRes.tx_hash) {
          txHashVal = apiRes.tx_hash;
        }
        notificationService.triggerImmediateSync();
      } catch (err: any) {
        console.warn("Backend internal transfer sync warning:", err);
      }


      setResultData({
        status: "COMPLETED",
        tx_hash: txHashVal,
        amount: numAmt.toFixed(sendCoin === "BTC" || sendCoin === "ETH" || sendCoin === "SOL" ? 6 : 2),
        currency: sendCoin,
        network: "Axiom Internal P2P (Zero Fee)",
        destination_address: cleanUid,
        message: `Instant transfer of ${numAmt.toFixed(4)} ${sendCoin} to UID ${cleanUid} completed.`,
      });

      setStep("result");
      if (flash) flash(`Sent ${numAmt.toFixed(sendCoin === "BTC" || sendCoin === "ETH" || sendCoin === "SOL" ? 4 : 2)} ${sendCoin} to UID ${cleanUid}!`);
    } catch (err: any) {
      setError(err.message || "Failed to complete transfer. Please try again.");
      setStep("form");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fullpage-modal-wrap">
      {/* Sticky Header */}
      <header className="fullpage-modal-header">
        <button type="button" className="fullpage-back-btn" onClick={onClose}>
          <ChevronLeft size={16} />
          <span>Back</span>
        </button>

        <div className="fullpage-header-title">
          <h1>Send Crypto</h1>
          <span>Direct instant transfer to any Axiom user via UID</span>
        </div>

        <div style={{ width: 68 }} />
      </header>

      {/* Main Body */}
      <div className="fullpage-modal-body">
        {step === "result" && resultData ? (
          /* Step 3: Result Screen */
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
              <CheckCircle2 size={36} color="#10B981" />
            </div>

            <h2 style={{ fontSize: 20, fontWeight: 800, margin: "0 0 6px" }}>
              Transfer Sent Successfully!
            </h2>
            <p style={{ fontSize: 13, color: "var(--muted)", margin: "0 0 16px" }}>
              Zero admin review required — funds transferred directly via Axiom P2P ledger.
            </p>

            {/* ── 3-Stage Process Timeline ── */}
            <div className="p2p-process-rail">
              <div className="p2p-step">
                <div className="p2p-step-dot">
                  <Check size={14} />
                </div>
                <div className="p2p-step-title">Dispatched</div>
                <div className="p2p-step-sub">From your vault</div>
              </div>

              <div className="p2p-rail-line" />

              <div className="p2p-step">
                <div className="p2p-step-dot" style={{ background: "rgba(124, 58, 237, 0.2)", border: "2px solid #8B5CF6", color: "#C4B5FD" }}>
                  <ShieldCheck size={14} />
                </div>
                <div className="p2p-step-title">Ledger Settled</div>
                <div className="p2p-step-sub">Zero Admin Required</div>
              </div>

              <div className="p2p-rail-line" />

              <div className="p2p-step">
                <div className="p2p-step-dot">
                  <Check size={14} />
                </div>
                <div className="p2p-step-title">Received</div>
                <div className="p2p-step-sub">Available in UID</div>
              </div>
            </div>

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
                <span style={{ color: "var(--muted)" }}>Amount Sent:</span>
                <span style={{ fontWeight: 800, color: "#10B981" }}>
                  {resultData.amount} {resultData.currency}
                </span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                <span style={{ color: "var(--muted)" }}>Recipient UID:</span>
                <span style={{ fontFamily: "monospace", fontWeight: 700, color: "#C4B5FD" }}>
                  {resultData.destination_address}
                </span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                <span style={{ color: "var(--muted)" }}>Transfer Rail:</span>
                <span style={{ fontWeight: 600 }}>{resultData.network}</span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                <span style={{ color: "var(--muted)" }}>Transfer ID:</span>
                <span style={{ fontFamily: "monospace", color: "var(--text)" }}>
                  {resultData.tx_hash}
                </span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, paddingTop: 8, borderTop: "1px solid rgba(255, 255, 255, 0.08)" }}>
                <span style={{ color: "var(--muted)" }}>Status:</span>
                <span
                  style={{
                    fontWeight: 800,
                    fontSize: 11,
                    padding: "2px 8px",
                    borderRadius: 6,
                    background: "rgba(16, 185, 129, 0.15)",
                    color: "#10B981",
                  }}
                >
                  COMPLETED
                </span>
              </div>
            </div>

            <button
              type="button"
              className="pro-submit-btn"
              onClick={() => onDone("Transfer completed")}
            >
              Done • Return to Wallet
            </button>
          </div>
        ) : step === "confirm" ? (
          /* Step 2: Confirmation Review Slip */
          <div className="pro-card">
            <div className="pro-card-header">
              <span className="pro-card-label">Review Transfer Slip</span>
              <span style={{ fontSize: 11, color: "#10B981", fontWeight: 700 }}>Final Step</span>
            </div>

            <div
              style={{
                background: "rgba(0, 0, 0, 0.35)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                borderRadius: 14,
                padding: "16px",
                display: "flex",
                flexDirection: "column",
                gap: 12,
                marginBottom: 16,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                <span style={{ color: "var(--muted)" }}>Transfer Method:</span>
                <span style={{ fontWeight: 700, color: "var(--text)" }}>
                  Axiom Internal Transfer (UID)
                </span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                <span style={{ color: "var(--muted)" }}>Amount to Send:</span>
                <span style={{ fontWeight: 800, fontSize: 16, color: "var(--text)" }}>
                  {numAmt.toFixed(sendCoin === "BTC" || sendCoin === "ETH" || sendCoin === "SOL" ? 6 : 2)} {sendCoin}
                </span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                <span style={{ color: "var(--muted)" }}>Recipient Axiom UID:</span>
                <span style={{ fontFamily: "monospace", color: "#C4B5FD", fontWeight: 700, fontSize: 14 }}>
                  {recipientUid.toUpperCase()}
                </span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                <span style={{ color: "var(--muted)" }}>Network Fee:</span>
                <span style={{ color: "#10B981", fontWeight: 700 }}>$0.00 (Zero Fee)</span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                <span style={{ color: "var(--muted)" }}>Settlement Speed:</span>
                <span style={{ color: "#10B981", fontWeight: 700 }}>Instant P2P</span>
              </div>
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button
                type="button"
                className="pro-submit-btn"
                style={{ flex: 1 }}
                onClick={handleExecuteTransfer}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Processing Transfer..." : "Confirm & Send"}
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
                  {availableBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: sendCoin === "BTC" || sendCoin === "ETH" || sendCoin === "SOL" ? 6 : 2 })} {sendCoin}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <span style={{ fontSize: 10, fontWeight: 800, padding: "4px 9px", borderRadius: 10, background: "rgba(16, 185, 129, 0.15)", color: "#10B981", border: "1px solid rgba(16, 185, 129, 0.3)" }}>
                  ⚡ ZERO NETWORK FEE
                </span>
              </div>
            </div>

            <div className="card-divider" />

            {/* 1. Asset Section */}
            <div className="card-section">
              <div className="pro-card-header">
                <span className="pro-card-label">1. Select Asset to Send</span>
              </div>

              <div style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
                {(["USDT", "USDC", "SOL", "BTC", "ETH"] as const).map((sym) => (
                  <button
                    key={sym}
                    type="button"
                    className={`asset-pill ${sendCoin === sym ? "active" : ""}`}
                    style={{ flex: 1, minWidth: 64, padding: "8px" }}
                    onClick={() => {
                      setSendCoin(sym);
                      setError(null);
                    }}
                  >
                    <span className="asset-pill-sym">{sym}</span>
                    <span className="asset-pill-price">
                      {(balances[sym]?.bal || 0).toFixed(sym === "BTC" || sym === "ETH" || sym === "SOL" ? 4 : 2)}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="card-divider" />

            {/* 2. Recipient Axiom UID Section */}
            <div className="card-section">
              <div className="pro-card-header">
                <span className="pro-card-label">
                  <UserCheck size={14} />
                  2. Recipient Axiom UID
                </span>
                <span style={{ fontSize: 11, color: "#10B981", fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}>
                  <Zap size={12} /> Instant P2P · Zero Fee
                </span>
              </div>

              <div style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 12px",
                borderRadius: 10,
                background: "rgba(124, 58, 237, 0.12)",
                border: "1px solid rgba(124, 58, 237, 0.25)",
                fontSize: 11.5,
                color: "#C4B5FD",
                fontWeight: 600,
                marginBottom: 10
              }}>
                <ShieldCheck size={14} color="#A78BFA" />
                <span>Internal Axiom Transfer: Only sends between Axiom users via UID.</span>
              </div>

              <div style={{ position: "relative" }}>
                <input
                  type="text"
                  className="modal-input"
                  placeholder="Enter recipient Axiom UID (e.g. AXM-8F2A9C)..."
                  value={recipientUid}
                  onChange={(e) => {
                    setRecipientUid(e.target.value.toUpperCase());
                    setError(null);
                  }}
                  style={{ margin: 0, fontFamily: "monospace", fontSize: 13, fontWeight: 700 }}
                />
              </div>
              <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 6 }}>
                Your UID is <strong style={{ color: "#A78BFA" }}>{myUid}</strong> (recipient can find their UID at the top of their screen).
              </div>
            </div>

            <div className="card-divider" />

            {/* 3. Amount Section */}
            <div className="card-section">
              <div className="pro-card-header">
                <span className="pro-card-label">
                  3. Amount to Send
                </span>
                <span style={{ fontSize: 11, color: "#10B981", fontWeight: 700 }}>
                  Instant P2P
                </span>
              </div>

              <div className="converter-box">
                <div className="converter-row">
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flex: 1 }}>
                    <input
                      type="number"
                      step="any"
                      className="converter-input"
                      value={sendAmt}
                      onChange={(e) => {
                        setSendAmt(e.target.value);
                        setError(null);
                      }}
                      placeholder="0.00"
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
                      const fraction = pct === "25%" ? 0.25 : pct === "50%" ? 0.5 : pct === "75%" ? 0.75 : 1.0;
                      const val = (availableBalance * fraction);
                      setSendAmt(sendCoin === "BTC" || sendCoin === "ETH" || sendCoin === "SOL" ? val.toFixed(6) : val.toFixed(2));
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
                  marginTop: 14,
                  padding: "10px 14px",
                  borderRadius: 10,
                  background: "rgba(239, 68, 68, 0.12)",
                  border: "1px solid rgba(239, 68, 68, 0.3)",
                  color: "#F87171",
                  fontSize: 12,
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <AlertTriangle size={15} />
                <span>{error}</span>
              </div>
            )}

            {/* Submit CTA */}
            <div style={{ marginTop: 18 }}>
              <button
                type="button"
                className="pro-submit-btn"
                onClick={handleReview}
                style={{ width: "100%", margin: 0 }}
              >
                <Send size={16} />
                <span>Review & Send {sendAmt ? `${sendAmt} ${sendCoin}` : ""}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
