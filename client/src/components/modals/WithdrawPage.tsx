import React, { useState, useEffect } from "react";
import {
  ChevronLeft, Send, Building2, CheckCircle2, Clock, AlertTriangle,
  Wallet, ShieldCheck, ArrowRight, Copy, Check, Globe
} from "lucide-react";
import { api } from "../../services/api";
import { marketStore } from "../../services/marketStore";
import { copyToClipboard } from "../../services/clipboard";
import { type AuthUser } from "../../services/authService";
import { CountrySelectModal } from "./CountrySelectModal";
import { CountryInfo, DEFAULT_COUNTRY, getCountryByCode } from "../../constants/countries";
import "./Modals.css";

interface WithdrawPageProps {
  onClose: () => void;
  onDone: (msg: string) => void;
  flash: (msg: string) => void;
  authUser?: AuthUser | null;
  initialMode?: "crypto" | "bank";
}

type WithdrawCoin = "USDT" | "USDC" | "SOL";

const SEND_NETWORKS: Record<WithdrawCoin, { label: string; networkKey: string; fee: string; note: string }[]> = {
  USDT: [
    { label: "TRC-20", networkKey: "TRON (TRC-20)", fee: "$0.00", note: "Tron TRC-20 • Fast & Low Fee" },
    { label: "BEP-20", networkKey: "BNB Chain (BEP-20)", fee: "$0.00", note: "BNB Smart Chain" },
    { label: "Solana", networkKey: "Solana (SPL)", fee: "$0.00", note: "Solana SPL • Instant Settlement" },
    { label: "ERC-20", networkKey: "Ethereum (ERC-20)", fee: "$1.50", note: "Ethereum ERC-20" },
  ],
  USDC: [
    { label: "Solana", networkKey: "Solana (SPL)", fee: "$0.00", note: "Solana SPL Circle USD Coin" },
    { label: "ERC-20", networkKey: "Ethereum (ERC-20)", fee: "$1.50", note: "Ethereum ERC-20 USD Coin" },
  ],
  SOL: [
    { label: "Solana Native", networkKey: "Solana (SPL)", fee: "$0.00", note: "Solana Mainnet" },
  ],
};

export const WithdrawPage: React.FC<WithdrawPageProps> = ({
  onClose,
  onDone,
  flash,
  authUser,
  initialMode = "crypto",
}) => {
  // Mode: "crypto" (On-chain address) vs "bank" (Local Bank Cashout)
  const [mode, setMode] = useState<"crypto" | "bank">(initialMode);

  // Country for Local Bank Cashout
  const [selectedCountry, setSelectedCountry] = useState<CountryInfo>(() => {
    const savedCode = localStorage.getItem("axiom_user_country") || "NG";
    return getCountryByCode(savedCode);
  });
  const [isCountryModalOpen, setIsCountryModalOpen] = useState(false);

  // Crypto Withdrawal Form State
  const [sendCoin, setSendCoin] = useState<WithdrawCoin>("USDT");
  const [sendNetwork, setSendNetwork] = useState<string>("TRON (TRC-20)");
  const [recipientAddress, setRecipientAddress] = useState<string>("");
  const [sendAmt, setSendAmt] = useState<string>("");

  // Bank Withdrawal Form State
  const [bankName, setBankName] = useState<string>(
    selectedCountry.banks && selectedCountry.banks.length > 0 ? selectedCountry.banks[0] : "Access Bank"
  );
  const [accountNumber, setAccountNumber] = useState<string>("");
  const [accountName, setAccountName] = useState<string>("");

  // Execution & UI state
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [eligibility, setEligibility] = useState<any>(null);
  const [step, setStep] = useState<"form" | "confirm" | "result">("form");
  const [resultData, setResultData] = useState<any>(null);

  // Available Balances
  const balances = marketStore.getBalances();
  const availableCoinBalance = balances[sendCoin]?.bal || 0;
  const cashBalance = (balances["USDT"]?.bal || 0) + (balances["USDC"]?.bal || 0);

  // If country changes, update default bank
  const handleSelectCountry = (c: CountryInfo) => {
    setSelectedCountry(c);
    localStorage.setItem("axiom_user_country", c.code);
    if (c.banks && c.banks.length > 0) {
      setBankName(c.banks[0]);
    }
  };

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
  const localPayout = Math.round(numAmt * (selectedCountry.rateToUsd || 1));

  const handleReview = () => {
    setError(null);
    if (isNaN(numAmt) || numAmt < 10.0) {
      setError("Minimum withdrawal amount is $10.00 USD.");
      return;
    }

    if (mode === "crypto") {
      if (numAmt > availableCoinBalance) {
        setError(`Insufficient ${sendCoin} balance! Available: $${availableCoinBalance.toFixed(2)}`);
        return;
      }
      if (!recipientAddress.trim()) {
        setError("Please enter a valid destination address.");
        return;
      }
    } else {
      if (numAmt > cashBalance) {
        setError(`Insufficient cash balance! Available: $${cashBalance.toFixed(2)} USD`);
        return;
      }
      if (!accountNumber.trim() || accountNumber.length < 8) {
        setError("Please enter a valid bank account number.");
        return;
      }
      if (!accountName.trim()) {
        setError("Please enter the beneficiary account name.");
        return;
      }
    }

    setStep("confirm");
  };

  const handleExecuteWithdrawal = async () => {
    setIsSubmitting(true);
    setError(null);

    const userAddr = authUser?.wallet_address || "AxB8s9sHynawdTUeioAgqcQKQ7Y6LvrdiN6ybE6YSrWU";
    const userTradeCount = marketStore.getUserTradeCount();
    const hasTraded = Boolean(eligibility?.has_trading_activity || userTradeCount > 0);

    const destination =
      mode === "crypto"
        ? recipientAddress.trim()
        : `${bankName} • ${accountNumber.trim()} (${accountName.trim()})`;

    const rail =
      mode === "crypto"
        ? sendNetwork
        : `${selectedCountry.name} Local Bank Transfer (${selectedCountry.currency})`;

    try {
      const res = await api.requestWithdrawal({
        address: userAddr,
        currency: mode === "crypto" ? sendCoin : "USDT",
        amount: numAmt.toFixed(2),
        destination_address: destination,
        network: rail,
        has_traded: hasTraded,
        trade_count: (eligibility?.trades_count || 0) + userTradeCount,
      });

      // Deduct balance locally
      marketStore.withdrawFunds(numAmt, mode === "crypto" ? sendCoin : "USDT");

      setResultData({
        is_instant: res.is_instant,
        status: res.status,
        withdrawal_id: res.withdrawal_id,
        tx_hash: res.tx_hash,
        amount: res.amount,
        currency: mode === "crypto" ? sendCoin : "USD",
        localAmount: mode === "bank" ? `${selectedCountry.currencySymbol}${localPayout.toLocaleString()} ${selectedCountry.currency}` : undefined,
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

  return (
    <div className="fullpage-modal-wrap">
      {/* Sticky Header */}
      <header className="fullpage-modal-header">
        <button type="button" className="fullpage-back-btn" onClick={onClose}>
          <ChevronLeft size={16} />
          <span>Back</span>
        </button>

        <div className="fullpage-header-title">
          <h1>Withdraw Funds</h1>
          <span>External wallet & local bank payouts</span>
        </div>

        <div className="fullpage-status-badge">
          <span className="pulse-dot" />
          <span>VAULT DISPATCH READY</span>
        </div>
      </header>

      {/* Main Body */}
      <div className="fullpage-modal-body">
        {step === "result" && resultData ? (
          /* Result Screen */
          <div className="pro-card" style={{ textAlign: "center", padding: "28px 20px" }}>
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: "50%",
                background: resultData.is_instant ? "rgba(16, 185, 129, 0.15)" : "rgba(59, 130, 246, 0.15)",
                border: `2px solid ${resultData.is_instant ? "#10B981" : "#3B82F6"}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 16px",
                boxShadow: `0 0 24px ${resultData.is_instant ? "rgba(16, 185, 129, 0.35)" : "rgba(59, 130, 246, 0.35)"}`,
              }}
            >
              {resultData.is_instant ? (
                <CheckCircle2 size={36} color="#10B981" />
              ) : (
                <Clock size={36} color="#3B82F6" />
              )}
            </div>

            <h2 style={{ fontSize: 20, fontWeight: 800, margin: "0 0 6px" }}>
              {resultData.is_instant ? "Withdrawal Processed Successfully!" : "Withdrawal Request Submitted"}
            </h2>
            <p style={{ fontSize: 13, color: "var(--muted)", margin: "0 0 20px" }}>
              {resultData.is_instant
                ? "Your funds have been dispatched from the vault."
                : "Your withdrawal has been received and queued for dispatch."}
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
                <span style={{ color: "var(--muted)" }}>Withdrawal Amount:</span>
                <span style={{ fontWeight: 800, color: resultData.is_instant ? "#10B981" : "var(--text)" }}>
                  ${resultData.amount} {resultData.currency}
                </span>
              </div>

              {resultData.localAmount && (
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                  <span style={{ color: "var(--muted)" }}>Local Payout:</span>
                  <span style={{ fontWeight: 800, color: "#C4B5FD" }}>
                    {resultData.localAmount}
                  </span>
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                <span style={{ color: "var(--muted)" }}>Network / Channel:</span>
                <span style={{ fontWeight: 600 }}>{resultData.network}</span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                <span style={{ color: "var(--muted)" }}>Destination:</span>
                <span style={{ fontFamily: "monospace", color: "var(--text)", maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {resultData.destination_address}
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
                    background: resultData.is_instant ? "rgba(16, 185, 129, 0.15)" : "rgba(59, 130, 246, 0.15)",
                    color: resultData.is_instant ? "#10B981" : "#3B82F6",
                  }}
                >
                  {resultData.is_instant ? "COMPLETED" : "PROCESSING"}
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
              <span className="pro-card-label">Review Withdrawal Slip</span>
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
                <span style={{ color: "var(--muted)" }}>Method:</span>
                <span style={{ fontWeight: 700, color: "var(--text)" }}>
                  {mode === "crypto" ? "External Crypto Address" : "Direct Local Bank Transfer"}
                </span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                <span style={{ color: "var(--muted)" }}>Amount to Send:</span>
                <span style={{ fontWeight: 800, fontSize: 16, color: "var(--text)" }}>
                  ${numAmt.toFixed(2)} {mode === "crypto" ? sendCoin : "USD"}
                </span>
              </div>

              {mode === "bank" && (
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                  <span style={{ color: "var(--muted)" }}>Local Bank Credit:</span>
                  <span style={{ fontWeight: 800, fontSize: 16, color: "#10B981" }}>
                    {selectedCountry.currencySymbol}{localPayout.toLocaleString()} {selectedCountry.currency}
                  </span>
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                <span style={{ color: "var(--muted)" }}>Destination:</span>
                <span style={{ fontFamily: "monospace", color: "#C4B5FD", fontWeight: 700, maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {mode === "crypto" ? recipientAddress : `${bankName} (${accountNumber})`}
                </span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                <span style={{ color: "var(--muted)" }}>Network Fee:</span>
                <span style={{ color: "#10B981", fontWeight: 700 }}>$0.00 (Zero Fee)</span>
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
                {isSubmitting ? "Dispatched from Vault..." : "Confirm & Send"}
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
          <>
            {/* Mode Switcher */}
            <div className="rail-mode-switch">
              <button
                type="button"
                className={`rail-mode-btn ${mode === "crypto" ? "active" : ""}`}
                onClick={() => setMode("crypto")}
              >
                <Wallet size={16} />
                <span>Crypto Wallet</span>
              </button>
              <button
                type="button"
                className={`rail-mode-btn ${mode === "bank" ? "active" : ""}`}
                onClick={() => setMode("bank")}
              >
                <Building2 size={16} />
                <span>Local Bank Cashout</span>
              </button>
            </div>

            {/* Available Balance Card */}
            <div className="pro-card" style={{ background: "rgba(124, 58, 237, 0.08)", borderColor: "rgba(124, 58, 237, 0.25)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase" }}>
                    Available {mode === "crypto" ? sendCoin : "Cash"} Balance
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: "var(--text)", marginTop: 2 }}>
                    ${(mode === "crypto" ? availableCoinBalance : cashBalance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <span style={{ fontSize: 10, fontWeight: 800, padding: "3px 8px", borderRadius: 10, background: "rgba(16, 185, 129, 0.15)", color: "#10B981" }}>
                    INSTANT PAYOUT ACTIVE
                  </span>
                </div>
              </div>
            </div>

            {mode === "crypto" ? (
              /* Crypto Mode */
              <>
                {/* 1. Asset & Network */}
                <div className="pro-card">
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

                  <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", marginBottom: 6 }}>
                    Select Rail / Chain:
                  </div>
                  <div className="network-pills-row">
                    {(SEND_NETWORKS[sendCoin] || []).map((n) => (
                      <button
                        key={n.networkKey}
                        type="button"
                        className={`network-pill ${sendNetwork === n.networkKey ? "active" : ""}`}
                        onClick={() => setSendNetwork(n.networkKey)}
                      >
                        {n.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. Recipient Address */}
                <div className="pro-card">
                  <div className="pro-card-header">
                    <span className="pro-card-label">2. Destination Address</span>
                  </div>

                  <div style={{ position: "relative" }}>
                    <input
                      type="text"
                      className="modal-input"
                      placeholder={`Paste recipient ${sendNetwork.split(" ")[0]} address...`}
                      value={recipientAddress}
                      onChange={(e) => {
                        setRecipientAddress(e.target.value);
                        setError(null);
                      }}
                      style={{ margin: 0, fontFamily: "monospace", fontSize: 12 }}
                    />
                  </div>
                </div>
              </>
            ) : (
              /* Local Bank Mode */
              <>
                {/* 1. Country Selection */}
                <div className="pro-card">
                  <div className="pro-card-header">
                    <span className="pro-card-label">
                      <Globe size={13} />
                      1. Payout Country & Currency
                    </span>
                    <span style={{ fontSize: 11, color: "var(--violet, #7C3AED)", fontWeight: 700 }}>
                      Change
                    </span>
                  </div>

                  <button
                    type="button"
                    className="country-pill-btn"
                    onClick={() => setIsCountryModalOpen(true)}
                  >
                    <span className="country-pill-flag">{selectedCountry.flag}</span>
                    <div style={{ flex: 1 }}>
                      <div className="country-pill-name">{selectedCountry.name}</div>
                      <div className="country-pill-currency">
                        Payout in {selectedCountry.currency} ({selectedCountry.currencySymbol}) · 1 USD = {selectedCountry.rateToUsd >= 100 ? selectedCountry.rateToUsd.toLocaleString() : selectedCountry.rateToUsd} {selectedCountry.currency}
                      </div>
                    </div>
                  </button>
                </div>

                {/* 2. Bank Details */}
                <div className="pro-card">
                  <div className="pro-card-header">
                    <span className="pro-card-label">2. Beneficiary Bank Details</span>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", marginBottom: 4, display: "block" }}>
                        Bank Name
                      </label>
                      <select
                        className="modal-input"
                        value={bankName}
                        onChange={(e) => setBankName(e.target.value)}
                        style={{ margin: 0, height: 42, background: "rgba(10, 11, 20, 0.85)", color: "var(--text)" }}
                      >
                        {(selectedCountry.banks || ["Access Bank", "Zenith Bank", "GTBank", "First Bank", "Kuda", "OPay"]).map((b) => (
                          <option key={b} value={b} style={{ background: "#13131F", color: "#fff" }}>
                            {b}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", marginBottom: 4, display: "block" }}>
                        Account Number
                      </label>
                      <input
                        type="text"
                        className="modal-input"
                        placeholder="e.g. 0123456789"
                        value={accountNumber}
                        onChange={(e) => {
                          setAccountNumber(e.target.value);
                          setError(null);
                        }}
                        style={{ margin: 0 }}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", marginBottom: 4, display: "block" }}>
                        Account Holder Full Name
                      </label>
                      <input
                        type="text"
                        className="modal-input"
                        placeholder="e.g. John Doe"
                        value={accountName}
                        onChange={(e) => {
                          setAccountName(e.target.value);
                          setError(null);
                        }}
                        style={{ margin: 0 }}
                      />
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* 3. Amount Section */}
            <div className="pro-card">
              <div className="pro-card-header">
                <span className="pro-card-label">
                  {mode === "crypto" ? "3. Amount to Withdraw" : "3. Cash Amount ($ USD)"}
                </span>
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
                    <span>{mode === "crypto" ? sendCoin : "USD"}</span>
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
                      const maxBal = mode === "crypto" ? availableCoinBalance : cashBalance;
                      const fraction = pct === "25%" ? 0.25 : pct === "50%" ? 0.5 : pct === "75%" ? 0.75 : 1.0;
                      setSendAmt((maxBal * fraction).toFixed(2));
                      setError(null);
                    }}
                  >
                    {pct}
                  </button>
                ))}
              </div>

              {mode === "bank" && numAmt > 0 && (
                <div
                  style={{
                    marginTop: 10,
                    padding: "8px 12px",
                    borderRadius: 10,
                    background: "rgba(16, 185, 129, 0.1)",
                    border: "1px solid rgba(16, 185, 129, 0.25)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    fontSize: 12,
                  }}
                >
                  <span style={{ color: "var(--muted)" }}>You will receive in bank:</span>
                  <span style={{ fontWeight: 800, color: "#10B981", fontSize: 14 }}>
                    ≈ {selectedCountry.currencySymbol}{localPayout.toLocaleString()} {selectedCountry.currency}
                  </span>
                </div>
              )}
            </div>

            {error && (
              <div
                style={{
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
            <button
              type="button"
              className="pro-submit-btn"
              onClick={handleReview}
            >
              <Send size={16} />
              <span>Review & Withdraw {sendAmt ? `$${sendAmt}` : "0.00"}</span>
            </button>
          </>
        )}
      </div>

      {/* Country Select Modal */}
      <CountrySelectModal
        isOpen={isCountryModalOpen}
        onClose={() => setIsCountryModalOpen(false)}
        onSelect={handleSelectCountry}
        selectedCode={selectedCountry.code}
        title="Select Payout Bank Country"
      />
    </div>
  );
};
