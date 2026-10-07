import React, { useState, useEffect } from "react";
import {
  ChevronLeft, ShieldCheck, RefreshCw,
  CreditCard, Building2, CheckCircle2, ArrowRight, Clock,
  Copy, Check
} from "lucide-react";
import { api } from "../../services/api";
import { type PlatformDepositWallet } from "../../types";
import { marketStore } from "../../services/marketStore";
import { copyToClipboard } from "../../services/clipboard";
import { type AuthUser } from "../../services/authService";
import { CountryInfo, getCountryByCode } from "../../constants/countries";
import { CountryFlag } from "../common/CountryFlag";
import { CountrySelectModal } from "./CountrySelectModal";
import "./Modals.css";

interface BuyPageProps {
  onClose: () => void;
  onDone: (msg: string) => void;
  flash: (msg: string) => void;
  authUser?: AuthUser | null;
  onNavigateToProfile?: () => void;
}

type BuyCoin = "USDT" | "SOL" | "USDC" | "BTC" | "ETH";

const COIN_METAS: Record<BuyCoin, { name: string; iconUrl: string }> = {
  USDT: { name: "Tether USD", iconUrl: "https://coin-images.coingecko.com/coins/images/325/large/Tether.png" },
  SOL: { name: "Solana", iconUrl: "https://coin-images.coingecko.com/coins/images/4128/large/solana.png" },
  USDC: { name: "USD Coin", iconUrl: "https://coin-images.coingecko.com/coins/images/6319/large/usdc.png" },
  BTC: { name: "Bitcoin", iconUrl: "https://coin-images.coingecko.com/coins/images/1/large/bitcoin.png" },
  ETH: { name: "Ethereum", iconUrl: "https://coin-images.coingecko.com/coins/images/279/large/ethereum.png" },
};

const COIN_NETWORKS: Record<BuyCoin, { label: string; networkKey: string; note: string }[]> = {
  USDT: [
    { label: "TRC-20", networkKey: "TRON (TRC-20)", note: "Tron TRC-20 • Low Fee & Fast" },
    { label: "BEP-20", networkKey: "BNB Chain (BEP-20)", note: "BNB Smart Chain • Low Fee" },
    { label: "Solana", networkKey: "Solana (SPL)", note: "Solana SPL • Instant Settlement" },
    { label: "ERC-20", networkKey: "Ethereum (ERC-20)", note: "Ethereum ERC-20 • High Security" },
  ],
  SOL: [
    { label: "Solana Native", networkKey: "Solana (SPL)", note: "Solana Mainnet" },
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

export const BuyPage: React.FC<BuyPageProps> = ({
  onClose,
  onDone,
  flash,
  authUser,
}) => {
  // Selected Country & Fiat Currency
  const [selectedCountry, setSelectedCountry] = useState<CountryInfo>(() => {
    const savedCode = localStorage.getItem("axiom_user_country") || "US";
    return getCountryByCode(savedCode);
  });
  const [isCountryModalOpen, setIsCountryModalOpen] = useState<boolean>(false);

  const handleSelectCountry = (country: CountryInfo) => {
    setSelectedCountry(country);
    localStorage.setItem("axiom_user_country", country.code);
    setIsCountryModalOpen(false);
    const baseUsd = 50;
    const newRate = country.rateToUsd || 1;
    setFiatAmount(String(Math.round(baseUsd * newRate)));
    if (country.code === "NG") {
      setPaymentMethod("bank_transfer");
    } else {
      setPaymentMethod("card");
    }
  };

  useEffect(() => {
    const handleRateChange = () => {
      const savedCode = localStorage.getItem("axiom_user_country") || "US";
      setSelectedCountry(getCountryByCode(savedCode));
    };
    window.addEventListener("axiom_dollar_rate_updated", handleRateChange);
    return () => window.removeEventListener("axiom_dollar_rate_updated", handleRateChange);
  }, []);

  // Buy Crypto Form State
  const [buyCoin, setBuyCoin] = useState<BuyCoin>("USDT");
  const [buyNetwork, setBuyNetwork] = useState<string>("TRON (TRC-20)");
  const [fiatAmount, setFiatAmount] = useState<string>(() => {
    const savedCode = localStorage.getItem("axiom_user_country") || "US";
    const initialCountry = getCountryByCode(savedCode);
    return String(Math.round(50 * (initialCountry.rateToUsd || 1)));
  });
  const [paymentMethod, setPaymentMethod] = useState<string>(() => {
    const savedCode = localStorage.getItem("axiom_user_country") || "US";
    return savedCode === "NG" ? "bank_transfer" : "card";
  });

  useEffect(() => {
    if (selectedCountry.code !== "NG") {
      setPaymentMethod("card");
    }
  }, [selectedCountry.code]);

  // Step state: "form" (select coin, amount & method) -> "checkout" (order summary & buy/copy wallet) -> "success"
  const [buyStep, setBuyStep] = useState<"form" | "checkout" | "success">("form");
  const [assignedBuyWallet, setAssignedBuyWallet] = useState<PlatformDepositWallet | null>(null);

  // Verification & Order State
  const [orderId, setOrderId] = useState<string>("");
  const [txHash] = useState<string>("");
  const [isVerifyingBuy, setIsVerifyingBuy] = useState<boolean>(false);
  const [buyVerifyError, setBuyVerifyError] = useState<string | null>(null);
  const [buySuccessData, setBuySuccessData] = useState<any>(null);
  const [copiedBankAcc, setCopiedBankAcc] = useState<boolean>(false);
  const [copiedWalletAddr, setCopiedWalletAddr] = useState<boolean>(false);

  // Redirection & Processing State
  const [paymentPhase, setPaymentPhase] = useState<"idle" | "redirecting">("idle");

  // Switch network when buyCoin changes
  const handleSelectBuyCoin = (sym: BuyCoin) => {
    setBuyCoin(sym);
    const availableNets = COIN_NETWORKS[sym];
    if (availableNets && availableNets.length > 0) {
      setBuyNetwork(availableNets[0].networkKey);
    }
  };

  // Fetch platform deposit vault for chosen network
  useEffect(() => {
    const userAddr = authUser?.wallet_address || "AxB8s9sHynawdTUeioAgqcQKQ7Y6LvrdiN6ybE6YSrWU";
    api
      .getDepositWallets(userAddr, buyNetwork, buyCoin)
      .then((res) => {
        if (res && res.wallets && res.wallets.length > 0) {
          const initial = res.assigned_wallet || res.wallets[0];
          setAssignedBuyWallet(initial);
        }
      })
      .catch(() => {});
  }, [buyCoin, buyNetwork, authUser?.wallet_address]);

  const getFallbackAddress = (net: string) => {
    if (net.includes("TRON")) return "TYD9yZ7G8gM2tY9vK8nP7wE6rT5yU4iO3p";
    if (net.includes("BNB") || net.includes("Ethereum")) return "0x71C836e522F5b8Fbe40d34341A5a507E78e1215B";
    if (net.includes("Bitcoin")) return "bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq";
    return "8ZgC8Q3f8sC9b9T4vB2nK8mP7wE6rT5yU4iO3pA2sD1f";
  };

  const activeBuyDepositAddress = assignedBuyWallet?.address || getFallbackAddress(buyNetwork);

  // Price & Conversion math
  const buyTokenObj = marketStore.getToken(buyCoin);
  const buyPriceUsd =
    buyCoin === "USDT" || buyCoin === "USDC"
      ? 1.0
      : buyTokenObj && buyTokenObj.numericPrice > 0
      ? buyTokenObj.numericPrice
      : buyCoin === "SOL"
      ? 121.69
      : buyCoin === "BTC"
      ? 77724.0
      : 2650.0;

  // Custom rate or default rate
  const rateToUsd = selectedCountry.rateToUsd || 1;
  const parsedFiat = parseFloat(fiatAmount) || 0;
  const equivalentUsd = rateToUsd > 0 ? parsedFiat / rateToUsd : parsedFiat;
  const tokensReceived = buyPriceUsd > 0 ? equivalentUsd / buyPriceUsd : 0;

  const [swiftsatsBaseUrl, setSwiftsatsBaseUrl] = useState<string>(() => {
    return (typeof window !== "undefined" && window.localStorage ? window.localStorage.getItem("swiftsats_base_url") : null) || "http://localhost:5173";
  });

  useEffect(() => {
    api.getPlatformSettings().then((res) => {
      if (res && res.swiftsats_url) {
        setSwiftsatsBaseUrl(res.swiftsats_url);
        if (typeof window !== "undefined" && window.localStorage) {
          window.localStorage.setItem("swiftsats_base_url", res.swiftsats_url);
        }
      }
    }).catch(() => {});
  }, []);

  const handleStartCheckout = () => {
    if (equivalentUsd < 5.0) {
      flash("⚠️ Minimum purchase is $5.00 USD");
      return;
    }

    const autoOrderId = `AXM-${selectedCountry.currency}-${Math.floor(100000 + Math.random() * 900000)}`;
    setOrderId(autoOrderId);
    setBuyStep("checkout");
  };

  const handleCopyWalletAddress = () => {
    copyToClipboard(activeBuyDepositAddress);
    setCopiedWalletAddr(true);
    flash(`✅ Copied destination ${buyCoin} wallet address!`);
    setTimeout(() => setCopiedWalletAddr(false), 2000);
  };

  const handleVerifyPayment = async () => {
    if (equivalentUsd < 5.0) {
      setBuyVerifyError("Minimum purchase is $5.00 USD.");
      return;
    }

    setIsVerifyingBuy(true);
    setBuyVerifyError(null);

    try {
      const userAddr = authUser?.wallet_address || authUser?.email || "AxB8s9sHynawdTUeioAgqcQKQ7Y6LvrdiN6ybE6YSrWU";
      const result = await api.creditSwiftsatsOrder({
        address: userAddr,
        order_id: orderId,
        tx_hash: txHash.trim() || undefined,
        amount_usd: equivalentUsd.toFixed(2),
        currency: buyCoin,
        deposit_wallet: activeBuyDepositAddress,
      });

      marketStore.depositFunds(buyCoin, parseFloat(result.credited_amount || String(tokensReceived)));
      setBuySuccessData(result);
      setBuyStep("success");
      flash(`✅ Verified! Credited +$${equivalentUsd.toFixed(2)} USD (${buyCoin}).`);
    } catch (err: any) {
      setBuyVerifyError(err.message || "Payment verification pending. Please confirm bank transfer.");
    } finally {
      setIsVerifyingBuy(false);
    }
  };

  // Redirect to external payment gateway (Swiftsats hosted checkout)
  const handleProceedToGateway = () => {
    setPaymentPhase("redirecting");
    const swiftsatsBase = swiftsatsBaseUrl || (typeof window !== "undefined" && window.localStorage ? window.localStorage.getItem("swiftsats_base_url") : null) || "http://localhost:5173";
    const activeOrder = orderId || `AXM-${selectedCountry.currency}-${Math.floor(100000 + Math.random() * 900000)}`;
    const returnUrl = encodeURIComponent(
      `${window.location.origin}/#wallet?payment=success&orderId=${activeOrder}&coin=${buyCoin}&amount=${tokensReceived.toFixed(4)}`
    );
    const checkoutUrl = `${swiftsatsBase.replace(/\/$/, "")}/checkout?order_id=${activeOrder}&amount=${parsedFiat}&currency=${selectedCountry.currency}&crypto=${buyCoin}&wallet=${activeBuyDepositAddress}&return_url=${returnUrl}`;

    flash("Redirecting to Swiftsats checkout gateway...");
    setTimeout(() => {
      window.location.href = checkoutUrl;
    }, 300);
  };

  return (
    <div className="fullpage-modal-wrap">
      {/* Sticky Header */}
      <header className="fullpage-modal-header">
        <button
          type="button"
          className="fullpage-back-btn"
          onClick={() => {
            if (buyStep === "checkout") {
              setBuyStep("form");
            } else {
              onClose();
            }
          }}
        >
          <ChevronLeft size={16} />
          <span>{buyStep === "checkout" ? "Back" : "Close"}</span>
        </button>

        <div className="fullpage-header-title">
          <h1>Buy Crypto</h1>
          <span>
            {buyStep === "form"
              ? "Step 1 of 2: Select Coin & Amount"
              : buyStep === "checkout"
              ? "Step 2 of 2: Order Summary & Checkout"
              : "Purchase Confirmed"}
          </span>
        </div>

        <div style={{ width: 68 }} />
      </header>

      {/* Main Body */}
      <div className="fullpage-modal-body">
        {buyStep === "success" ? (
          /* Success Screen */
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
              Purchase Confirmed & Credited!
            </h2>
            <p style={{ fontSize: 13, color: "var(--muted)", margin: "0 0 20px" }}>
              Your {selectedCountry.currency} payment has been confirmed and crypto delivered to your wallet balance.
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
                <span style={{ color: "var(--muted)" }}>Credited Amount:</span>
                <span style={{ fontWeight: 800, color: "#10B981" }}>
                  +${buySuccessData?.usd_amount || equivalentUsd.toFixed(2)} USD ({buySuccessData?.credited_amount || tokensReceived.toFixed(4)} {buyCoin})
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                <span style={{ color: "var(--muted)" }}>Fiat Paid:</span>
                <span style={{ fontWeight: 700, color: "#C4B5FD" }}>
                  {selectedCountry.currencySymbol}{parsedFiat.toLocaleString()} {selectedCountry.currency}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                <span style={{ color: "var(--muted)" }}>Delivery Network:</span>
                <span style={{ fontWeight: 600 }}>{buyNetwork}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                <span style={{ color: "var(--muted)" }}>Order Reference:</span>
                <span style={{ fontFamily: "monospace", color: "#C4B5FD" }}>{orderId}</span>
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
                  ${Number(buySuccessData?.new_balance || equivalentUsd).toFixed(2)} USD
                </span>
              </div>
            </div>

            <button
              type="button"
              className="pro-submit-btn"
              onClick={() => onDone(`✅ Purchased +$${equivalentUsd.toFixed(2)} USD (${buyCoin})!`)}
            >
              Done • Return to Dashboard
            </button>
          </div>
        ) : buyStep === "checkout" ? (
          /* STEP 2: Dedicated Order Summary & Gateway / Bank Checkout Screen */
          <div className="pro-card">
            {paymentMethod === "card" ? (
              /* Step 2A: Apple Pay & Debit/Credit Card Checkout View */
              <>
                <div className="card-section">
                  <div
                    style={{
                      background: "rgba(124, 58, 237, 0.12)",
                      border: "1px solid rgba(124, 58, 237, 0.3)",
                      borderRadius: 14,
                      padding: "14px 16px",
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                    }}
                  >
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: "50%",
                        background: "rgba(124, 58, 237, 0.25)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#C4B5FD",
                        flexShrink: 0,
                      }}
                    >
                      <CreditCard size={20} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 800, color: "var(--text, #fff)" }}>
                        Pay with Apple Pay or Debit Card
                      </div>
                      <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 2 }}>
                        Instant fiat onramp · Visa, Mastercard & Apple Pay.
                      </div>
                    </div>
                  </div>
                </div>

                <div className="card-divider" />

                {/* Purchase Summary Box */}
                <div className="card-section">
                  <div className="pro-card-header">
                    <span className="pro-card-label">Purchase Summary</span>
                    <span style={{ fontSize: 11, color: "#10B981", fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}>
                      <ShieldCheck size={12} /> Guaranteed Rate
                    </span>
                  </div>

                  <div
                    style={{
                      background: "rgba(0, 0, 0, 0.3)",
                      border: "1px solid rgba(255, 255, 255, 0.08)",
                      borderRadius: 12,
                      padding: "14px",
                      display: "flex",
                      flexDirection: "column",
                      gap: 10,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                      <span style={{ color: "var(--muted)" }}>Total to Charge:</span>
                      <span style={{ fontWeight: 800, color: "var(--violet, #7C3AED)", fontSize: 15 }}>
                        {selectedCountry.currencySymbol}{parsedFiat.toLocaleString()} {selectedCountry.currency}
                        <span style={{ fontSize: 11, color: "var(--muted)", fontWeight: 500, marginLeft: 6 }}>
                          (≈ ${equivalentUsd.toFixed(2)} USD)
                        </span>
                      </span>
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                      <span style={{ color: "var(--muted)" }}>Receiving Crypto:</span>
                      <span style={{ fontWeight: 800, color: "#10B981", fontSize: 14 }}>
                        +{tokensReceived < 1 ? tokensReceived.toFixed(6) : tokensReceived.toFixed(4)} {buyCoin}
                      </span>
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                      <span style={{ color: "var(--muted)" }}>Delivery Network:</span>
                      <span style={{ fontWeight: 600 }}>{buyNetwork}</span>
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, paddingTop: 6, borderTop: "1px solid rgba(255, 255, 255, 0.08)" }}>
                      <span style={{ color: "var(--muted)" }}>Order Reference:</span>
                      <span style={{ fontFamily: "monospace", color: "#C4B5FD", fontWeight: 700 }}>{orderId}</span>
                    </div>

                    {/* Receiving Wallet with Copy Option */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, paddingTop: 6, borderTop: "1px solid rgba(255, 255, 255, 0.08)" }}>
                      <span style={{ color: "var(--muted)" }}>Receiving Wallet:</span>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontFamily: "monospace", color: "#C4B5FD", fontSize: 11 }}>
                          {activeBuyDepositAddress.slice(0, 6)}...{activeBuyDepositAddress.slice(-4)}
                        </span>
                        <button
                          type="button"
                          onClick={handleCopyWalletAddress}
                          style={{
                            background: "rgba(255, 255, 255, 0.08)",
                            border: "none",
                            color: "#fff",
                            borderRadius: 6,
                            padding: "2px 6px",
                            fontSize: 10.5,
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: 3,
                          }}
                        >
                          {copiedWalletAddr ? <Check size={10} /> : <Copy size={10} />}
                          {copiedWalletAddr ? "Copied" : "Copy"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="card-divider" />

                {/* Gateway Redirection Section */}
                <div className="card-section">
                  <div
                    style={{
                      background: "rgba(255, 255, 255, 0.03)",
                      border: "1px solid rgba(255, 255, 255, 0.08)",
                      borderRadius: 12,
                      padding: "16px",
                      display: "flex",
                      flexDirection: "column",
                      gap: 12,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 22, lineHeight: 1 }}></span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>Swiftsats Card & Apple Pay Gateway</span>
                      </div>
                      <span style={{ fontSize: 10, fontWeight: 800, padding: "2px 8px", borderRadius: 6, background: "rgba(59, 130, 246, 0.15)", color: "#60A5FA" }}>
                        SECURE CHECKOUT
                      </span>
                    </div>

                    <div style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.5 }}>
                      Click below to proceed to the secure <b>Swiftsats</b> checkout portal to complete payment via <b>Apple Pay</b> or <b>Debit / Credit Card</b>. No card details are ever stored on Axiom.
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#10B981", fontSize: 11.5, fontWeight: 600 }}>
                      <CheckCircle2 size={14} /> Automatic return and instant crypto credit upon authorization
                    </div>
                  </div>

                  {/* Primary Action Button */}
                  <button
                    type="button"
                    onClick={handleProceedToGateway}
                    disabled={paymentPhase === "redirecting"}
                    className="pro-submit-btn"
                    style={{
                      marginTop: 16,
                      height: 48,
                      fontSize: 15,
                      fontWeight: 700,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                    }}
                  >
                    {paymentPhase === "redirecting" ? (
                      <>
                        <RefreshCw size={18} className="animate-spin" />
                        <span>Redirecting to Swiftsats Gateway...</span>
                      </>
                    ) : (
                      <>
                        <span>Proceed to Swiftsats Gateway (Click to Pay)</span>
                        <ArrowRight size={16} />
                      </>
                    )}
                  </button>
                </div>

                <div style={{ padding: "0 16px 16px" }}>
                  <button
                    type="button"
                    onClick={() => setBuyStep("form")}
                    style={{
                      width: "100%",
                      background: "rgba(255, 255, 255, 0.05)",
                      border: "1px solid rgba(255, 255, 255, 0.09)",
                      color: "var(--muted)",
                      padding: "10px",
                      borderRadius: 10,
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    ← Back to Step 1 (Change Amount or Coin)
                  </button>
                </div>
              </>
            ) : (
              /* Step 2B: Nigerian Bank Transfer Checkout */
              <>
                <div className="card-section">
                  <div
                    style={{
                      background: "rgba(124, 58, 237, 0.12)",
                      border: "1px solid rgba(124, 58, 237, 0.3)",
                      borderRadius: 14,
                      padding: "14px 16px",
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                    }}
                  >
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: "50%",
                        background: "rgba(124, 58, 237, 0.25)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#C4B5FD",
                        flexShrink: 0,
                      }}
                    >
                      <Building2 size={20} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 800, color: "var(--text, #fff)" }}>
                        Transfer {selectedCountry.currencySymbol}{parsedFiat.toLocaleString()} {selectedCountry.currency}
                      </div>
                      <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 2 }}>
                        Send via your banking app or Swiftsats to receive +{tokensReceived < 1 ? tokensReceived.toFixed(6) : tokensReceived.toFixed(4)} {buyCoin}.
                      </div>
                    </div>
                  </div>
                </div>

                <div className="card-divider" />

                {/* Bank Payment Details Section */}
                <div className="card-section">
                  <div className="pro-card-header">
                    <span className="pro-card-label">Bank Payment Details</span>
                    <span style={{ fontSize: 11, color: "#10B981", fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}>
                      <Clock size={12} /> Active for 29:59
                    </span>
                  </div>

                  <div
                    style={{
                      background: "rgba(0, 0, 0, 0.3)",
                      border: "1px solid rgba(255, 255, 255, 0.08)",
                      borderRadius: 12,
                      padding: "14px",
                      display: "flex",
                      flexDirection: "column",
                      gap: 10,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                      <span style={{ color: "var(--muted)" }}>Bank Name:</span>
                      <span style={{ fontWeight: 800, color: "var(--text)" }}>
                        Moniepoint / Wema Bank
                      </span>
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13 }}>
                      <span style={{ color: "var(--muted)" }}>Account Number:</span>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontWeight: 800, fontFamily: "monospace", fontSize: 15, color: "#10B981" }}>
                          8241092831
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            copyToClipboard("8241092831");
                            setCopiedBankAcc(true);
                            flash("✅ Copied Bank Account Number!");
                            setTimeout(() => setCopiedBankAcc(false), 2000);
                          }}
                          style={{
                            background: "rgba(255, 255, 255, 0.08)",
                            border: "none",
                            color: "#fff",
                            borderRadius: 6,
                            padding: "3px 8px",
                            fontSize: 11,
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          {copiedBankAcc ? <Check size={11} /> : <Copy size={11} />}
                          {copiedBankAcc ? "Copied" : "Copy"}
                        </button>
                      </div>
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                      <span style={{ color: "var(--muted)" }}>Account Name:</span>
                      <span style={{ fontWeight: 700 }}>Axiom Pay / Swiftsats Nigeria</span>
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                      <span style={{ color: "var(--muted)" }}>Amount to Send:</span>
                      <span style={{ fontWeight: 800, color: "var(--violet, #7C3AED)", fontSize: 15 }}>
                        {selectedCountry.currencySymbol}{parsedFiat.toLocaleString()} {selectedCountry.currency}
                      </span>
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, paddingTop: 6, borderTop: "1px solid rgba(255, 255, 255, 0.08)" }}>
                      <span style={{ color: "var(--muted)" }}>Order Reference:</span>
                      <span style={{ fontFamily: "monospace", color: "#C4B5FD", fontWeight: 700 }}>{orderId}</span>
                    </div>

                    {/* Receiving Wallet with Copy Option */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, paddingTop: 6, borderTop: "1px solid rgba(255, 255, 255, 0.08)" }}>
                      <span style={{ color: "var(--muted)" }}>Receiving Wallet:</span>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontFamily: "monospace", color: "#C4B5FD", fontSize: 11 }}>
                          {activeBuyDepositAddress.slice(0, 6)}...{activeBuyDepositAddress.slice(-4)}
                        </span>
                        <button
                          type="button"
                          onClick={handleCopyWalletAddress}
                          style={{
                            background: "rgba(255, 255, 255, 0.08)",
                            border: "none",
                            color: "#fff",
                            borderRadius: 6,
                            padding: "2px 6px",
                            fontSize: 10.5,
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: 3,
                          }}
                        >
                          {copiedWalletAddr ? <Check size={10} /> : <Copy size={10} />}
                          {copiedWalletAddr ? "Copied" : "Copy"}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div style={{ marginTop: 12, fontSize: 11.5, color: "var(--muted)", textAlign: "center" }}>
                    💡 Funds will be credited directly to your <b>{buyCoin}</b> balance automatically upon receipt.
                  </div>
                </div>

                <div className="card-divider" />

                {/* Check Status & Gateway CTA */}
                <div className="card-section">
                  <button
                    type="button"
                    className="pro-submit-btn"
                    onClick={handleProceedToGateway}
                    disabled={paymentPhase === "redirecting"}
                    style={{
                      height: 48,
                      fontSize: 15,
                      fontWeight: 700,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                      marginBottom: 10,
                    }}
                  >
                    {paymentPhase === "redirecting" ? (
                      <>
                        <RefreshCw size={18} className="animate-spin" />
                        <span>Redirecting to Swiftsats...</span>
                      </>
                    ) : (
                      <>
                        <span>Proceed to Swiftsats Gateway Checkout</span>
                        <ArrowRight size={16} />
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleVerifyPayment}
                    disabled={isVerifyingBuy}
                    style={{
                      width: "100%",
                      background: "rgba(255, 255, 255, 0.05)",
                      border: "1px solid rgba(255, 255, 255, 0.12)",
                      color: "var(--text, #fff)",
                      padding: "10px",
                      borderRadius: 10,
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                    }}
                  >
                    {isVerifyingBuy ? (
                      <>
                        <RefreshCw size={14} className="animate-spin" />
                        <span>Checking Banking Rails...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={14} color="#10B981" />
                        <span>I Have Made This Transfer • Check Status</span>
                      </>
                    )}
                  </button>

                  {buyVerifyError && (
                    <div
                      style={{
                        marginTop: 10,
                        padding: "8px 12px",
                        borderRadius: 8,
                        background: "rgba(239, 68, 68, 0.12)",
                        border: "1px solid rgba(239, 68, 68, 0.3)",
                        color: "#F87171",
                        fontSize: 11.5,
                        fontWeight: 600,
                      }}
                    >
                      ⚠️ {buyVerifyError}
                    </div>
                  )}

                  <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
                    <button
                      type="button"
                      onClick={() => setBuyStep("form")}
                      style={{
                        flex: 1,
                        background: "rgba(255, 255, 255, 0.05)",
                        border: "1px solid rgba(255, 255, 255, 0.09)",
                        color: "var(--muted)",
                        padding: "9px",
                        borderRadius: 10,
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      ← Back to Step 1 (Change Amount or Coin)
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        ) : (
          /* STEP 1: Select Crypto to Buy & Purchase Amount & Payment Method */
          <>
            <div className="pro-card">
              {/* 1. Crypto Asset Selector */}
              <div className="card-section">
                <div className="pro-card-header">
                  <span className="pro-card-label">1. Select Crypto to Buy</span>
                  <span style={{ fontSize: 11, color: "#10B981", fontWeight: 700 }}>
                    Vault Delivery
                  </span>
                </div>

                <div className="asset-selector-grid">
                  {(["USDT", "SOL", "USDC", "BTC", "ETH"] as const).map((sym) => {
                    const isActive = buyCoin === sym;
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
                        onClick={() => handleSelectBuyCoin(sym)}
                      >
                        <img src={tokenMeta.iconUrl} alt={sym} style={{ width: 24, height: 24, borderRadius: "50%" }} />
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
                    Delivery Network:
                  </div>
                  <div className="network-pills-row">
                    {(COIN_NETWORKS[buyCoin] || []).map((net) => {
                      const isNetActive = buyNetwork === net.networkKey;
                      return (
                        <button
                          key={net.networkKey}
                          type="button"
                          className={`network-pill ${isNetActive ? "active" : ""}`}
                          onClick={() => setBuyNetwork(net.networkKey)}
                        >
                          {net.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="card-divider" />

              {/* 2. Dual Converter (You Pay Fiat ⟷ You Receive Crypto) */}
              <div className="card-section">
                <div className="pro-card-header">
                  <span className="pro-card-label">2. Purchase Amount</span>
                  <span style={{ fontSize: 11, color: "#10B981", fontWeight: 700 }}>
                    Min: $5.00 USD
                  </span>
                </div>

                {/* You Pay Fiat Box */}
                <div className="converter-box" style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase" }}>
                    You Pay ({selectedCountry.currency})
                  </div>
                  <div className="converter-row">
                    <div style={{ display: "flex", alignItems: "center", gap: 6, flex: 1 }}>
                      <span style={{ fontSize: 20, fontWeight: 800, color: "var(--text)" }}>
                        {selectedCountry.currencySymbol}
                      </span>
                      <input
                        type="number"
                        className="converter-input"
                        value={fiatAmount}
                        onChange={(e) => setFiatAmount(e.target.value)}
                        placeholder="50"
                      />
                    </div>
                    <div className="converter-badge" onClick={() => setIsCountryModalOpen(true)} style={{ cursor: "pointer" }}>
                      <CountryFlag code={selectedCountry.code} flag={selectedCountry.flag} size={18} />
                      <span>{selectedCountry.currency}</span>
                    </div>
                  </div>
                </div>

                {/* Preset Chips (USD-denominated, auto-converts into selected local fiat currency) */}
                <div className="preset-chips-row" style={{ marginBottom: 12 }}>
                  {[5, 10, 25, 50, 100, 200, 250, 500].map((usdAmt) => {
                    const convertedFiat = Math.round(usdAmt * rateToUsd);
                    const isActive = Math.round(parseFloat(fiatAmount || "0")) === convertedFiat;
                    return (
                      <button
                        key={usdAmt}
                        type="button"
                        className={`preset-chip-btn ${isActive ? "active" : ""}`}
                        onClick={() => setFiatAmount(String(convertedFiat))}
                        title={`$${usdAmt} USD ≈ ${selectedCountry.currencySymbol}${convertedFiat.toLocaleString()} ${selectedCountry.currency}`}
                      >
                        ${usdAmt}
                      </button>
                    );
                  })}
                </div>

                {/* You Receive Crypto Box */}
                <div className="converter-box" style={{ background: "rgba(124, 58, 237, 0.08)", borderColor: "rgba(124, 58, 237, 0.25)" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#C4B5FD", textTransform: "uppercase" }}>
                    You Receive ({buyCoin})
                  </div>
                  <div className="converter-row">
                    <div style={{ fontSize: 22, fontWeight: 900, color: "#10B981" }}>
                      ≈ {tokensReceived < 1 ? tokensReceived.toFixed(6) : tokensReceived.toFixed(4)} {buyCoin}
                    </div>
                    <div className="converter-badge" style={{ background: "rgba(124, 58, 237, 0.2)" }}>
                      <img src={COIN_METAS[buyCoin].iconUrl} width={18} height={18} alt={buyCoin} style={{ borderRadius: "50%" }} />
                      <span style={{ color: "#C4B5FD" }}>${equivalentUsd.toFixed(2)} USD</span>
                    </div>
                  </div>
                </div>

                <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 8, display: "flex", justifyContent: "space-between" }}>
                  <span>Rate: 1 USD ≈ {selectedCountry.currencySymbol}{rateToUsd >= 100 ? rateToUsd.toLocaleString() : rateToUsd} {selectedCountry.currency}</span>
                  <span style={{ color: "#10B981", fontWeight: 700 }}>0% Processing Markup</span>
                </div>
              </div>

              <div className="card-divider" />

              {/* 3. Payment Method Selection */}
              <div className="card-section">
                <div className="pro-card-header">
                  <span className="pro-card-label">3. Payment Method</span>
                  <span style={{ fontSize: 11, color: "#10B981", fontWeight: 700 }}>Instant</span>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {/* Bank transfer strictly for Nigerian accounts */}
                  {selectedCountry.code === "NG" && (
                    <label
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: "12px 14px",
                        borderRadius: 12,
                        border: paymentMethod === "bank_transfer" ? "1.5px solid var(--violet, #7C3AED)" : "1px solid rgba(255, 255, 255, 0.08)",
                        background: paymentMethod === "bank_transfer" ? "rgba(124, 58, 237, 0.15)" : "rgba(255, 255, 255, 0.03)",
                        cursor: "pointer",
                      }}
                      onClick={() => setPaymentMethod("bank_transfer")}
                    >
                      <Building2 size={20} color="#C4B5FD" />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>
                          Instant Nigerian Bank Transfer (NIBSS / Swiftsats)
                        </div>
                        <div style={{ fontSize: 11, color: "var(--muted)" }}>
                          Direct transfer from any Nigerian bank app. Immediate vault credit.
                        </div>
                      </div>
                      <span style={{ fontSize: 10.5, fontWeight: 800, padding: "2px 6px", borderRadius: 6, background: "rgba(16, 185, 129, 0.15)", color: "#10B981" }}>
                        RECOMMENDED
                      </span>
                    </label>
                  )}

                  {/* Debit / Credit Card & Apple Pay: Shown for all, recommended for non-NG */}
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "12px 14px",
                      borderRadius: 12,
                      border: paymentMethod === "card" ? "1.5px solid var(--violet, #7C3AED)" : "1px solid rgba(255, 255, 255, 0.08)",
                      background: paymentMethod === "card" ? "rgba(124, 58, 237, 0.15)" : "rgba(255, 255, 255, 0.03)",
                      cursor: "pointer",
                    }}
                    onClick={() => setPaymentMethod("card")}
                  >
                    <CreditCard size={20} color="#60A5FA" />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", display: "flex", alignItems: "center", gap: 6 }}>
                        <span>Debit / Credit Card & Apple Pay</span>
                        {selectedCountry.code !== "NG" && (
                          <span style={{ fontSize: 10, fontWeight: 800, padding: "1px 6px", borderRadius: 6, background: "rgba(16, 185, 129, 0.15)", color: "#10B981" }}>
                            RECOMMENDED
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--muted)" }}>
                        Visa, Mastercard, AMEX & 1-Click Apple Pay via Swiftsats.
                      </div>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            {/* Action CTA with Mobile Sticky Bar */}
            <div className="mobile-sticky-action-bar">
              <button
                type="button"
                className="pro-submit-btn"
                onClick={handleStartCheckout}
              >
                <span>Continue to Buy {selectedCountry.currencySymbol}{parsedFiat.toLocaleString()} {selectedCountry.currency}</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </>
        )}
      </div>

      {/* Country Select Modal */}
      <CountrySelectModal
        isOpen={isCountryModalOpen}
        onClose={() => setIsCountryModalOpen(false)}
        onSelect={handleSelectCountry}
        selectedCode={selectedCountry.code}
        title="Select Country & Payment Region"
      />
    </div>
  );
};
