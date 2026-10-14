import React, { useState } from "react";
import {
  ShieldCheck, CheckCircle2, Clock, Copy, Check, Printer, X,
  ArrowRight, ExternalLink, Hash, Landmark, AlertTriangle
} from "lucide-react";
import { copyToClipboard } from "../../services/clipboard";

export interface WithdrawalReceiptData {
  withdrawalId?: string | number;
  amount: number | string;
  currency: string;
  network: string;
  destinationAddress: string;
  txHash?: string;
  status?: string;
  fee?: string;
  timestamp?: number;
  dateStr?: string;
  note?: string;
}

interface WithdrawalReceiptModalProps {
  receipt: WithdrawalReceiptData;
  onClose: () => void;
}

export const WithdrawalReceiptModal: React.FC<WithdrawalReceiptModalProps> = ({
  receipt,
  onClose,
}) => {
  const [copiedAddr, setCopiedAddr] = useState(false);
  const [copiedAll, setCopiedAll] = useState(false);

  const cleanAmt = typeof receipt.amount === "number"
    ? receipt.amount.toFixed(receipt.currency === "USDT" || receipt.currency === "USDC" ? 2 : 4)
    : receipt.amount;

  const refCode = receipt.withdrawalId
    ? `AXM-WD-${String(receipt.withdrawalId).padStart(6, "0")}`
    : `AXM-WD-${Math.abs(Date.now() % 1000000).toString().padStart(6, "0")}`;

  const dateDisplay = receipt.timestamp
    ? new Date(receipt.timestamp).toLocaleString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    : receipt.dateStr || new Date().toLocaleString();

  const isApproved = (receipt.status === "APPROVED" || receipt.status === "COMPLETED") && !!receipt.txHash;
  const isPaused = receipt.status === "PAUSED";
  const isRejected = receipt.status === "REJECTED";
  const isPending = !isApproved && !isPaused && !isRejected;

  const handleCopyAddr = () => {
    copyToClipboard(receipt.destinationAddress);
    setCopiedAddr(true);
    setTimeout(() => setCopiedAddr(false), 2000);
  };

  const handleCopyReceiptSummary = () => {
    const summary = [
      `═══════════════════════════════════════`,
      `       AXIOM WALLET OFFICIAL RECEIPT    `,
      `═══════════════════════════════════════`,
      `Reference: ${refCode}`,
      `Date: ${dateDisplay}`,
      `Type: On-Chain Cryptocurrency Withdrawal`,
      `Status: ${receipt.status || "PROCESSING ON-CHAIN"}`,
      `Amount: ${cleanAmt} ${receipt.currency}`,
      `Network: ${receipt.network}`,
      `Destination: ${receipt.destinationAddress}`,
      `Network Fee: ${receipt.fee || "$0.00 (Zero Fee • Covered by Axiom)"}`,
      `Routing: 1:1 Unified Cross-Chain Bridge`,
      receipt.txHash ? `Tx Hash: ${receipt.txHash}` : `Tx Hash: In Dispatch Queue`,
      `═══════════════════════════════════════`,
      `Verified by Axiom Secure Custody Vault`,
    ].join("\n");
    copyToClipboard(summary);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0, 0, 0, 0.78)",
        backdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 999999,
        padding: "16px",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          background: "linear-gradient(180deg, #0F172A 0%, #090D1A 100%)",
          border: "1px solid rgba(255, 255, 255, 0.14)",
          borderRadius: 20,
          width: "100%",
          maxWidth: 480,
          padding: "24px 22px",
          boxShadow: "0 24px 70px rgba(0, 0, 0, 0.8), 0 0 40px rgba(124, 58, 237, 0.15)",
          position: "relative",
          maxHeight: "92vh",
          overflowY: "auto",
        }}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          style={{
            position: "absolute",
            top: 18,
            right: 18,
            background: "rgba(255, 255, 255, 0.06)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            borderRadius: "50%",
            width: 32,
            height: 32,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#94A3B8",
            cursor: "pointer",
          }}
        >
          <X size={16} />
        </button>

        {/* Brand & Security Header */}
        <div style={{ textAlign: "center", marginBottom: 18 }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              background: "rgba(124, 58, 237, 0.15)",
              border: "1px solid rgba(167, 139, 250, 0.3)",
              borderRadius: 20,
              padding: "4px 12px",
              color: "#C4B5FD",
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: 0.5,
              marginBottom: 10,
              textTransform: "uppercase",
            }}
          >
            <ShieldCheck size={14} color="#A78BFA" />
            <span>Axiom Official Transaction Receipt</span>
          </div>

          <div
            style={{
              width: 58,
              height: 58,
              borderRadius: "50%",
              background: isApproved
                ? "rgba(16, 185, 129, 0.15)"
                : isPaused
                ? "rgba(245, 158, 11, 0.15)"
                : isRejected
                ? "rgba(239, 68, 68, 0.15)"
                : "rgba(124, 58, 237, 0.15)",
              border: `2px solid ${
                isApproved ? "#10B981" : isPaused ? "#F59E0B" : isRejected ? "#EF4444" : "#A78BFA"
              }`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 12px",
              boxShadow: isApproved
                ? "0 0 24px rgba(16, 185, 129, 0.4)"
                : isPaused
                ? "0 0 24px rgba(245, 158, 11, 0.35)"
                : "0 0 24px rgba(124, 58, 237, 0.35)",
            }}
          >
            {isApproved ? (
              <CheckCircle2 size={32} color="#10B981" />
            ) : isPaused ? (
              <Clock size={32} color="#F59E0B" />
            ) : isRejected ? (
              <AlertTriangle size={32} color="#EF4444" />
            ) : (
              <Clock size={32} color="#A78BFA" />
            )}
          </div>

          <div style={{ fontSize: 13, color: "var(--muted)", fontWeight: 600 }}>
            {isApproved
              ? "Withdrawal Completed & Dispatched"
              : isPaused
              ? "Withdrawal Queued in Vault Queue"
              : isRejected
              ? "Withdrawal Declined • Funds Refunded"
              : "Withdrawal Initiated • In Dispatch Queue"}
          </div>
          <div
            style={{
              fontSize: 26,
              fontWeight: 900,
              color: "#F8FAFC",
              letterSpacing: "-0.5px",
              marginTop: 4,
            }}
          >
            -{cleanAmt} {receipt.currency}
          </div>
        </div>

        {/* Receipt Detail Card */}
        <div
          style={{
            background: "rgba(15, 23, 42, 0.75)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: 14,
            padding: "16px",
            display: "flex",
            flexDirection: "column",
            gap: 12,
            marginBottom: 20,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12 }}>
            <span style={{ color: "#94A3B8" }}>Receipt Reference:</span>
            <span style={{ fontFamily: "monospace", color: "#F8FAFC", fontWeight: 700 }}>
              {refCode}
            </span>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12 }}>
            <span style={{ color: "#94A3B8" }}>Date & Time:</span>
            <span style={{ color: "#F8FAFC", fontWeight: 600 }}>{dateDisplay}</span>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12 }}>
            <span style={{ color: "#94A3B8" }}>Settlement Network:</span>
            <span style={{ color: "#60A5FA", fontWeight: 700 }}>{receipt.network}</span>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12 }}>
            <span style={{ color: "#94A3B8" }}>Transaction Type:</span>
            <span style={{ color: "#F8FAFC", fontWeight: 600 }}>Crypto Withdrawal (External)</span>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12 }}>
            <span style={{ color: "#94A3B8" }}>Network Gas Fee:</span>
            <span style={{ color: "#34D399", fontWeight: 700 }}>{receipt.fee || "$0.00 (Zero Fee • Covered)"}</span>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12 }}>
            <span style={{ color: "#94A3B8" }}>Liquidity Routing:</span>
            <span style={{ color: "#C4B5FD", fontWeight: 600 }}>1:1 Auto-Bridge (Zero Slippage)</span>
          </div>

          <div style={{ borderTop: "1px dashed rgba(255, 255, 255, 0.12)", paddingTop: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase" }}>
                Recipient Address:
              </span>
              <button
                type="button"
                onClick={handleCopyAddr}
                style={{
                  background: "none",
                  border: "none",
                  color: copiedAddr ? "#10B981" : "#60A5FA",
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  padding: 0,
                }}
              >
                {copiedAddr ? <Check size={12} /> : <Copy size={12} />}
                <span>{copiedAddr ? "Copied" : "Copy Address"}</span>
              </button>
            </div>
            <div
              style={{
                fontFamily: "monospace",
                color: "#E2E8F0",
                fontSize: 11.5,
                background: "rgba(0, 0, 0, 0.35)",
                padding: "8px 10px",
                borderRadius: 8,
                wordBreak: "break-all",
                lineHeight: 1.4,
                border: "1px solid rgba(255, 255, 255, 0.06)",
              }}
            >
              {receipt.destinationAddress}
            </div>
          </div>

          {receipt.txHash && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", marginBottom: 6 }}>
                Blockchain Transaction Hash:
              </div>
              <div
                style={{
                  fontFamily: "monospace",
                  color: "#A78BFA",
                  fontSize: 11,
                  background: "rgba(0, 0, 0, 0.35)",
                  padding: "8px 10px",
                  borderRadius: 8,
                  wordBreak: "break-all",
                  lineHeight: 1.4,
                  border: "1px solid rgba(255, 255, 255, 0.06)",
                }}
              >
                {receipt.txHash}
              </div>
            </div>
          )}

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              paddingTop: 10,
              borderTop: "1px solid rgba(255, 255, 255, 0.08)",
            }}
          >
            <span style={{ fontSize: 12, color: "#94A3B8" }}>Status:</span>
            <span
              style={{
                fontSize: 11,
                fontWeight: 800,
                padding: "3px 10px",
                borderRadius: 20,
                background: isApproved
                  ? "rgba(16, 185, 129, 0.2)"
                  : isPaused
                  ? "rgba(245, 158, 11, 0.2)"
                  : isRejected
                  ? "rgba(239, 68, 68, 0.2)"
                  : "rgba(124, 58, 237, 0.2)",
                color: isApproved
                  ? "#34D399"
                  : isPaused
                  ? "#FBBF24"
                  : isRejected
                  ? "#F87171"
                  : "#C4B5FD",
                border: `1px solid ${
                  isApproved
                    ? "rgba(16, 185, 129, 0.4)"
                    : isPaused
                    ? "rgba(245, 158, 11, 0.4)"
                    : isRejected
                    ? "rgba(239, 68, 68, 0.4)"
                    : "rgba(167, 139, 250, 0.4)"
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
                  background: isApproved
                    ? "#34D399"
                    : isPaused
                    ? "#FBBF24"
                    : isRejected
                    ? "#F87171"
                    : "#C4B5FD",
                  boxShadow: isApproved
                    ? "0 0 6px #34D399"
                    : isPaused
                    ? "0 0 6px #FBBF24"
                    : "0 0 6px #C4B5FD",
                }}
              />
              {isApproved
                ? "COMPLETED ON-CHAIN"
                : isPaused
                ? "QUEUED IN VAULT"
                : isRejected
                ? "DECLINED"
                : "IN DISPATCH QUEUE"}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              type="button"
              onClick={handleCopyReceiptSummary}
              style={{
                flex: 1,
                padding: "11px",
                borderRadius: 12,
                background: "rgba(255, 255, 255, 0.06)",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                color: "#F8FAFC",
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
              }}
            >
              {copiedAll ? <Check size={14} color="#10B981" /> : <Copy size={14} />}
              <span>{copiedAll ? "Receipt Copied!" : "Copy Receipt Details"}</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              style={{
                padding: "11px 16px",
                borderRadius: 12,
                background: "rgba(255, 255, 255, 0.06)",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                color: "#F8FAFC",
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
              title="Print Receipt"
            >
              <Printer size={14} />
              <span>Print</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              width: "100%",
              padding: "12px",
              borderRadius: 12,
              background: "linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%)",
              border: "none",
              color: "#FFFFFF",
              fontSize: 13,
              fontWeight: 800,
              cursor: "pointer",
              boxShadow: "0 4px 14px rgba(124, 58, 237, 0.4)",
            }}
          >
            Done • Close Receipt
          </button>
        </div>
      </div>
    </div>
  );
};
