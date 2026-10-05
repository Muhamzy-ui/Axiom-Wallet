import React, { useState, useEffect, useRef } from "react";
import {
  ChevronLeft, ChevronDown, ChevronUp, X, ArrowUp, Paperclip,
  Image as ImageIcon, CheckCircle2, Send, MessageSquare,
  Clock, ShieldCheck, AlertCircle, RefreshCw, Sparkles, HelpCircle
} from "lucide-react";
import { api } from "../../services/api";
import { type AuthUser } from "../../services/authService";
import { copyToClipboard } from "../../services/clipboard";
import "./Modals.css";

interface SupportModalProps {
  isOpen: boolean;
  onClose: () => void;
  authUser?: AuthUser | null;
  flash: (msg: string) => void;
}

interface FAQItem {
  id: string;
  title: string;
  content: React.ReactNode;
}

export const SupportModal: React.FC<SupportModalProps> = ({
  isOpen,
  onClose,
  authUser,
  flash,
}) => {
  // Navigation State: "faq" | "composer" | "ticket_view"
  const [currentView, setCurrentView] = useState<"faq" | "composer" | "ticket_view">("faq");
  const [expandedFaq, setExpandedFaq] = useState<string | null>("failed_deposits");

  // User details
  const activeUserId =
    authUser?.user_id ||
    authUser?.wallet_address?.slice(0, 10) ||
    (typeof localStorage !== "undefined" ? localStorage.getItem("axiom_user_id") : "") ||
    "a646fe9d-6743-5acd-9454-e50921348d9a";

  const activeUserHandle =
    authUser?.username ||
    authUser?.full_name ||
    (typeof localStorage !== "undefined" ? localStorage.getItem("axiom_user_username") : "") ||
    "Trader";

  const activeUserEmail =
    authUser?.email ||
    (authUser?.wallet_address ? `${authUser.wallet_address.slice(0, 8)}@axiom.trade` : "trader@axiom.trade");

  // Composer Form State
  const [subject, setSubject] = useState<string>(`Support Request - User ID: ${activeUserId}`);
  const [category, setCategory] = useState<string>("Failed or Pending Deposit");
  const [issueDescription, setIssueDescription] = useState<string>("");
  const [screenshotBase64, setScreenshotBase64] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitSuccessMsg, setSubmitSuccessMsg] = useState<string | null>(null);

  // Tickets History State
  const [userTickets, setUserTickets] = useState<any[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null);
  const [replyMessage, setReplyMessage] = useState<string>("");
  const [isReplying, setIsReplying] = useState<boolean>(false);
  const [isLoadingTickets, setIsLoadingTickets] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Fetch tickets whenever opened
  useEffect(() => {
    if (!isOpen) return;
    loadTickets();
  }, [isOpen, activeUserId]);

  const loadTickets = async () => {
    setIsLoadingTickets(true);
    try {
      const res = await api.getUserSupportTickets(activeUserId);
      if (res && res.tickets) {
        setUserTickets(res.tickets);
      }
    } catch {
      // Offline fallback
    } finally {
      setIsLoadingTickets(false);
    }
  };

  const toggleFaq = (id: string) => {
    setExpandedFaq(expandedFaq === id ? null : id);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      flash("⚠️ File size must be under 5MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setScreenshotBase64(reader.result as string);
      flash("📸 Screenshot attached successfully!");
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitSupportTicket = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanMsg = issueDescription.trim();
    if (!cleanMsg) {
      flash("⚠️ Please describe your issue before sending.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.createSupportTicket({
        user_identifier: activeUserId,
        user_handle: activeUserHandle,
        user_email: activeUserEmail,
        subject: subject.trim() || `Support Request - User ID: ${activeUserId}`,
        category: category,
        message: cleanMsg,
        screenshot_url: screenshotBase64 || undefined,
      });

      flash(`✅ Ticket #${res.ticket.ticket_number} created! Our staff has been alerted.`);
      setSubmitSuccessMsg(`Support ticket #${res.ticket.ticket_number} submitted! A support agent will respond shortly.`);
      setIssueDescription("");
      setScreenshotBase64(null);
      await loadTickets();
      setSelectedTicket(res.ticket);
      setCurrentView("ticket_view");
    } catch (err: any) {
      flash(`❌ ${err.message || "Failed to submit support request"}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendReply = async () => {
    if (!selectedTicket || !replyMessage.trim()) return;
    setIsReplying(true);
    try {
      const res = await api.replySupportTicket(selectedTicket.id, {
        message: replyMessage.trim(),
        sender_name: activeUserHandle,
      });
      setSelectedTicket(res.ticket);
      setReplyMessage("");
      flash("✅ Reply sent to support desk!");
      loadTickets();
    } catch (err: any) {
      flash(`❌ ${err.message || "Failed to send reply"}`);
    } finally {
      setIsReplying(false);
    }
  };

  if (!isOpen) return null;

  const faqs: FAQItem[] = [
    {
      id: "failed_deposits",
      title: "Failed or pending deposits",
      content: (
        <div className="faq-content-body">
          <p>
            A failed or pending deposit/withdrawal request is returned to your bank account within 3 business days.
          </p>
          <p>
            To make it clear how this works, let's look at an actual example: a withdrawal request made on the evening of Jan 16, 2026 (Friday), after close of business at the bank. Jan 17 and 18 are weekend days, and Jan 19 is a USA Federal holiday.
          </p>
          <p>
            The actual 3 business days are Jan 20 to 22, and you will see the funds in your bank account on Jan 23 (7 days after the failed deposit date).
          </p>
          <p>
            Note that this applies to withdrawal requests and to failed deposits. Pending deposits also take 3 business days.
          </p>
        </div>
      ),
    },
    {
      id: "usd_deposit_unavailable",
      title: "USD deposit is not available",
      content: (
        <div className="faq-content-body">
          <p>
            Direct USD card processing may occasionally experience regional payment gateway maintenance. If your local card is declined, we recommend:
          </p>
          <ul>
            <li>Using <b>Apple Pay</b> for instant 1-click authorization without manual card entry.</li>
            <li>Depositing via <b>USDT (TRC-20 / BEP-20)</b> or <b>Solana (SPL)</b> which confirms on-chain in seconds with 0% platform fee.</li>
            <li>For Nigerian accounts, use <b>Instant Bank Transfer (NIBSS)</b> via Moniepoint or Wema Bank for immediate credit.</li>
          </ul>
        </div>
      ),
    },
    {
      id: "unable_debit_card",
      title: "Unable to deposit using debit card",
      content: (
        <div className="faq-content-body">
          <p>
            If your debit or credit card is declined during checkout:
          </p>
          <ul>
            <li>Ensure international online transactions are enabled on your card.</li>
            <li>Complete the 3D-Secure SMS/OTP verification sent by your issuing bank.</li>
            <li>Try checking out via Apple Pay or standard on-chain crypto deposit.</li>
          </ul>
        </div>
      ),
    },
    {
      id: "other_deposit_options",
      title: "Other deposit options",
      content: (
        <div className="faq-content-body">
          <p>
            Axiom supports non-custodial multi-chain funding across 5 major crypto ecosystems:
          </p>
          <ul>
            <li><b>USDT</b> on Tron (TRC-20), BNB Chain (BEP-20), Solana (SPL), and Ethereum (ERC-20).</li>
            <li><b>Solana (SOL)</b> Native Mainnet-Beta.</li>
            <li><b>USDC</b> on Solana and Ethereum.</li>
            <li><b>Bitcoin (BTC)</b> SegWit and Legacy addresses.</li>
          </ul>
        </div>
      ),
    },
    {
      id: "unsupported_blockchain",
      title: "Deposit sent on unsupported blockchain",
      content: (
        <div className="faq-content-body">
          <p>
            Always verify that you are sending tokens on the selected chain (e.g., USDT TRC-20 to a TRON address, not Arbitrum or Polygon).
          </p>
          <p>
            If you accidentally sent funds on an incompatible EVM chain, please click <b>Contact support</b> below with your transaction hash (TxID) for recovery investigation.
          </p>
        </div>
      ),
    },
    {
      id: "withdrew_not_found",
      title: "Withdrew to another app but not found",
      content: (
        <div className="faq-content-body">
          <p>
            All approved withdrawals are broadcast directly to the blockchain. You can view your transaction hash in your Activity history and verify it on Solscan or Tronscan.
          </p>
          <p>
            Some external exchanges require 12 to 30 block confirmations before reflecting incoming balances in their user interface.
          </p>
        </div>
      ),
    },
    {
      id: "perps_faq",
      title: "Perps FAQ",
      content: (
        <div className="faq-content-body">
          <p>
            Axiom Perpetual Futures allow high-speed leveraged trading with non-custodial collateral protection:
          </p>
          <ul>
            <li><b>Leverage:</b> Up to 50x leverage on SOL-PERP, BTC-PERP, and leading meme tokens.</li>
            <li><b>Stop-Loss & Take-Profit:</b> Guaranteed order execution without slippage on target triggers.</li>
            <li><b>Auto-P&L Tracking:</b> Real-time mark price feeds synced directly with institutional nodes.</li>
          </ul>
        </div>
      ),
    },
  ];

  return (
    <div className="fullpage-modal-wrap support-modal-wrap">
      {/* ─────────────────────────────────────────────────────────────
          VIEW 1: HELP AND SUPPORT FAQ (Exact replica of Image 1)
          ───────────────────────────────────────────────────────────── */}
      {currentView === "faq" && (
        <>
          {/* Header */}
          <header className="fullpage-modal-header" style={{ borderBottom: "none" }}>
            <button type="button" className="fullpage-back-btn" onClick={onClose}>
              <ChevronLeft size={16} />
              <span>Back</span>
            </button>

            <div className="fullpage-header-title">
              <h1 style={{ fontSize: 17, fontWeight: 800 }}>Help and Support</h1>
            </div>

            {userTickets.length > 0 ? (
              <button
                type="button"
                onClick={() => setCurrentView("ticket_view")}
                style={{
                  background: "rgba(124, 58, 237, 0.2)",
                  border: "1px solid rgba(124, 58, 237, 0.4)",
                  color: "#C4B5FD",
                  borderRadius: 14,
                  padding: "4px 10px",
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                My Tickets ({userTickets.length})
              </button>
            ) : (
              <div style={{ width: 68 }} />
            )}
          </header>

          {/* FAQ Accordion Body */}
          <div className="fullpage-modal-body support-faq-body" style={{ maxWidth: 540 }}>
            {/* Recent Ticket Banner if any exist */}
            {userTickets.length > 0 && (
              <div
                onClick={() => {
                  setSelectedTicket(userTickets[0]);
                  setCurrentView("ticket_view");
                }}
                style={{
                  background: "linear-gradient(135deg, rgba(124, 58, 237, 0.18) 0%, rgba(99, 102, 241, 0.12) 100%)",
                  border: "1px solid rgba(124, 58, 237, 0.35)",
                  borderRadius: 14,
                  padding: "12px 16px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  cursor: "pointer",
                  marginBottom: 8,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <MessageSquare size={18} color="#C4B5FD" />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>
                      Active Ticket #{userTickets[0].ticket_number}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--muted)" }}>
                      Status: <b style={{ color: userTickets[0].status === "RESOLVED" ? "#10B981" : "#F59E0B" }}>{userTickets[0].status}</b> · Click to view replies
                    </div>
                  </div>
                </div>
                <span style={{ fontSize: 12, color: "#C4B5FD", fontWeight: 700 }}>Open →</span>
              </div>
            )}

            <div className="faq-accordion-list">
              {faqs.map((faq) => {
                const isOpenFaq = expandedFaq === faq.id;
                return (
                  <div key={faq.id} className={`faq-accordion-item ${isOpenFaq ? "open" : ""}`}>
                    <button
                      type="button"
                      className="faq-accordion-header"
                      onClick={() => toggleFaq(faq.id)}
                    >
                      <span className="faq-title-text">{faq.title}</span>
                      {isOpenFaq ? (
                        <ChevronUp size={18} className="faq-chevron" />
                      ) : (
                        <ChevronDown size={18} className="faq-chevron" />
                      )}
                    </button>

                    {isOpenFaq && (
                      <div className="faq-accordion-content">
                        {faq.content}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Bottom Contact Support Prompt (Exact match to Image 1) */}
            <div className="faq-contact-footer">
              <span className="faq-contact-subtext">Didn't find what you're looking for?</span>
              <button
                type="button"
                className="faq-contact-link-btn"
                onClick={() => setCurrentView("composer")}
              >
                Contact support
              </button>
            </div>
          </div>
        </>
      )}

      {/* ─────────────────────────────────────────────────────────────
          VIEW 2: CONTACT SUPPORT COMPOSER (Exact replica of Image 2)
          ───────────────────────────────────────────────────────────── */}
      {currentView === "composer" && (
        <div className="support-composer-sheet">
          {/* Top Bar with X and Send Button */}
          <div className="composer-top-bar">
            <button
              type="button"
              className="composer-close-btn"
              onClick={() => setCurrentView("faq")}
            >
              <X size={20} />
            </button>

            <button
              type="button"
              className="composer-send-circle-btn"
              onClick={() => handleSubmitSupportTicket()}
              disabled={isSubmitting || !issueDescription.trim()}
              title="Send Support Request"
            >
              {isSubmitting ? (
                <RefreshCw size={18} className="animate-spin" />
              ) : (
                <ArrowUp size={22} strokeWidth={2.6} />
              )}
            </button>
          </div>

          {/* Header Title */}
          <div className="composer-header-title">
            <h2>Support Request - User ID:</h2>
            <div className="composer-uid-pill" onClick={() => { copyToClipboard(activeUserId); flash("Copied User ID!"); }}>
              <span>{activeUserId}</span>
            </div>
          </div>

          {/* Email Headers Form */}
          <div className="composer-meta-rows">
            <div className="composer-meta-row">
              <span className="composer-meta-label">To:</span>
              <span className="composer-meta-val to-email">support@axiom.trade</span>
            </div>

            <div className="composer-meta-row">
              <span className="composer-meta-label">Cc/Bcc, From:</span>
              <span className="composer-meta-val">{activeUserEmail}</span>
            </div>

            <div className="composer-meta-row">
              <span className="composer-meta-label">Category:</span>
              <select
                className="composer-category-select"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="Failed or Pending Deposit">Failed or Pending Deposit</option>
                <option value="Withdrawal Processing">Withdrawal Processing</option>
                <option value="Debit Card / Apple Pay">Debit Card / Apple Pay</option>
                <option value="Unsupported Blockchain Recovery">Unsupported Blockchain Recovery</option>
                <option value="Perpetual Futures / PnL">Perpetual Futures / PnL</option>
                <option value="Account & General Support">Account & General Support</option>
              </select>
            </div>

            <div className="composer-meta-row">
              <span className="composer-meta-label">Subject:</span>
              <input
                type="text"
                className="composer-subject-input"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>
          </div>

          {/* Main Issue Description Textarea */}
          <div className="composer-body-area">
            <textarea
              className="composer-textarea"
              placeholder="Please describe your issue below and attach at least one screenshot of your issue."
              value={issueDescription}
              onChange={(e) => setIssueDescription(e.target.value)}
              autoFocus
            />

            {/* Attached Screenshot Preview */}
            {screenshotBase64 && (
              <div className="composer-attachment-preview">
                <div style={{ position: "relative", display: "inline-block" }}>
                  <img
                    src={screenshotBase64}
                    alt="Screenshot attachment"
                    style={{
                      maxHeight: 140,
                      maxWidth: "100%",
                      borderRadius: 8,
                      border: "1px solid rgba(255, 255, 255, 0.2)",
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setScreenshotBase64(null)}
                    style={{
                      position: "absolute",
                      top: -6,
                      right: -6,
                      background: "#EF4444",
                      color: "#fff",
                      border: "none",
                      borderRadius: "50%",
                      width: 22,
                      height: 22,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                    }}
                  >
                    <X size={12} />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Attachment Toolbar Pill */}
          <div className="composer-toolbar-pill">
            <button
              type="button"
              className="composer-tool-btn"
              onClick={() => fileInputRef.current?.click()}
              title="Attach Screenshot"
            >
              <Paperclip size={18} />
              <span>{screenshotBase64 ? "Change Screenshot" : "Attach Screenshot"}</span>
            </button>
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              style={{ display: "none" }}
              onChange={handleFileChange}
            />
          </div>

          {/* Bottom User Information Footer (Exact match to Image 2) */}
          <div className="composer-footer-userinfo">
            <div style={{ borderTop: "1px dashed rgba(255, 255, 255, 0.15)", paddingTop: 10, marginTop: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", marginBottom: 3 }}>
                ---
              </div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text)" }}>
                User Information:
              </div>
              <div style={{ fontSize: 11.5, color: "rgba(255, 255, 255, 0.6)", fontFamily: "monospace", marginTop: 2 }}>
                Axiom ID: {activeUserId}
              </div>
              <div style={{ fontSize: 11.5, color: "rgba(255, 255, 255, 0.6)", marginTop: 2 }}>
                User Handle: {activeUserHandle}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          VIEW 3: USER TICKET VIEWER & THREAD CHAT
          ───────────────────────────────────────────────────────────── */}
      {currentView === "ticket_view" && (
        <>
          <header className="fullpage-modal-header">
            <button
              type="button"
              className="fullpage-back-btn"
              onClick={() => setCurrentView("faq")}
            >
              <ChevronLeft size={16} />
              <span>All FAQs</span>
            </button>

            <div className="fullpage-header-title">
              <h1 style={{ fontSize: 16 }}>Support Tickets</h1>
              <span>Live Support Desk</span>
            </div>

            <button
              type="button"
              className="fullpage-back-btn"
              onClick={() => setCurrentView("composer")}
              style={{ background: "var(--violet, #7C3AED)", borderColor: "transparent", color: "#fff" }}
            >
              + New
            </button>
          </header>

          <div className="fullpage-modal-body" style={{ maxWidth: 560 }}>
            {selectedTicket ? (
              <div className="pro-card" style={{ padding: "18px" }}>
                {/* Ticket Header Banner */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                  <div>
                    <span style={{ fontSize: 11, fontFamily: "monospace", color: "#C4B5FD", fontWeight: 700 }}>
                      #{selectedTicket.ticket_number}
                    </span>
                    <h2 style={{ fontSize: 16, fontWeight: 800, margin: "2px 0 4px" }}>
                      {selectedTicket.subject}
                    </h2>
                    <span style={{ fontSize: 11, color: "var(--muted)" }}>
                      Category: {selectedTicket.category}
                    </span>
                  </div>
                  <span
                    style={{
                      fontSize: 10.5,
                      fontWeight: 800,
                      padding: "3px 8px",
                      borderRadius: 8,
                      background: selectedTicket.status === "RESOLVED" ? "rgba(16, 185, 129, 0.15)" : "rgba(245, 158, 11, 0.15)",
                      color: selectedTicket.status === "RESOLVED" ? "#10B981" : "#F59E0B",
                      border: `1px solid ${selectedTicket.status === "RESOLVED" ? "rgba(16, 185, 129, 0.3)" : "rgba(245, 158, 11, 0.3)"}`,
                    }}
                  >
                    {selectedTicket.status}
                  </span>
                </div>

                <div className="card-divider" style={{ margin: "10px 0 14px" }} />

                {/* Messages Thread */}
                <div style={{ display: "flex", flexDirection: "column", gap: 12, maxHeight: 340, overflowY: "auto", paddingRight: 4 }}>
                  {(selectedTicket.messages || []).map((msg: any) => {
                    const isUser = msg.sender_type === "USER";
                    return (
                      <div
                        key={msg.id}
                        style={{
                          alignSelf: isUser ? "flex-end" : "flex-start",
                          maxWidth: "85%",
                          background: isUser ? "rgba(124, 58, 237, 0.25)" : "rgba(255, 255, 255, 0.05)",
                          border: isUser ? "1px solid rgba(124, 58, 237, 0.45)" : "1px solid rgba(255, 255, 255, 0.1)",
                          borderRadius: 14,
                          padding: "10px 14px",
                        }}
                      >
                        <div style={{ fontSize: 11, fontWeight: 800, color: isUser ? "#C4B5FD" : "#60A5FA", marginBottom: 3 }}>
                          {msg.sender_name || (isUser ? "You" : "Support Agent")}
                        </div>
                        <div style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.4, whiteSpace: "pre-wrap" }}>
                          {msg.message}
                        </div>
                        {msg.attachment_url && (
                          <div style={{ marginTop: 8 }}>
                            <img
                              src={msg.attachment_url}
                              alt="Attachment"
                              style={{ maxHeight: 120, borderRadius: 6, border: "1px solid rgba(255, 255, 255, 0.15)" }}
                            />
                          </div>
                        )}
                        <div style={{ fontSize: 9.5, color: "var(--muted)", marginTop: 4, textAlign: "right" }}>
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Reply Input Box */}
                <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
                  <input
                    type="text"
                    placeholder="Type your reply to support..."
                    value={replyMessage}
                    onChange={(e) => setReplyMessage(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) handleSendReply(); }}
                    style={{
                      flex: 1,
                      background: "rgba(10, 11, 20, 0.8)",
                      border: "1px solid rgba(255, 255, 255, 0.12)",
                      borderRadius: 10,
                      padding: "10px 12px",
                      color: "#fff",
                      fontSize: 12.5,
                      outline: "none",
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleSendReply}
                    disabled={isReplying || !replyMessage.trim()}
                    style={{
                      background: "var(--violet, #7C3AED)",
                      border: "none",
                      borderRadius: 10,
                      padding: "0 16px",
                      color: "#fff",
                      fontWeight: 700,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    {isReplying ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
                    <span>Send</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedTicket(null)}
                  style={{
                    width: "100%",
                    marginTop: 12,
                    background: "rgba(255, 255, 255, 0.04)",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    color: "var(--muted)",
                    padding: "8px",
                    borderRadius: 8,
                    fontSize: 11.5,
                    cursor: "pointer",
                  }}
                >
                  ← Back to Ticket List
                </button>
              </div>
            ) : (
              /* All Tickets List */
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {userTickets.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => setSelectedTicket(t)}
                    style={{
                      background: "rgba(20, 18, 34, 0.85)",
                      border: "1px solid rgba(139, 92, 246, 0.25)",
                      borderRadius: 14,
                      padding: "14px 16px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 11, fontFamily: "monospace", color: "#C4B5FD", fontWeight: 700 }}>
                          #{t.ticket_number}
                        </span>
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 800,
                            padding: "2px 6px",
                            borderRadius: 6,
                            background: t.status === "RESOLVED" ? "rgba(16, 185, 129, 0.15)" : "rgba(245, 158, 11, 0.15)",
                            color: t.status === "RESOLVED" ? "#10B981" : "#F59E0B",
                          }}
                        >
                          {t.status}
                        </span>
                      </div>
                      <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--text)", marginTop: 4 }}>
                        {t.subject}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
                        {new Date(t.updated_at).toLocaleDateString()} · {(t.messages || []).length} messages
                      </div>
                    </div>
                    <span style={{ fontSize: 13, color: "#C4B5FD" }}>→</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
