import React, { useState, useEffect } from "react";
import {
  X,
  Smartphone,
  Download,
  CheckCircle,
  Share2,
  PlusSquare,
  MoreVertical,
  ExternalLink,
  Copy,
  Check,
  ShieldCheck,
  Zap,
  Maximize,
  RefreshCw,
} from "lucide-react";
import { pwaService, getIsIOS, getIsAndroid, getIsStandalone, getIsInAppBrowser } from "../../services/pwaService";
import { copyToClipboard } from "../../services/clipboard";

interface AddToHomeScreenModalProps {
  isOpen: boolean;
  onClose: () => void;
  flash?: (msg: string) => void;
}

export const AddToHomeScreenModal: React.FC<AddToHomeScreenModalProps> = ({
  isOpen,
  onClose,
  flash,
}) => {
  const isIOS = getIsIOS();
  const isAndroid = getIsAndroid();
  const isStandalone = getIsStandalone();
  const isInApp = getIsInAppBrowser();

  const [activeTab, setActiveTab] = useState<"ios" | "android">(() => {
    if (isAndroid) return "android";
    return "ios"; // default to iOS for iPhone or fallback
  });

  const [canPrompt, setCanPrompt] = useState(pwaService.canPrompt);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  useEffect(() => {
    const unsub = pwaService.subscribe(() => {
      setCanPrompt(pwaService.canPrompt);
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (isOpen) {
      if (isAndroid) setActiveTab("android");
      else setActiveTab("ios");
    }
  }, [isOpen, isAndroid]);

  if (!isOpen) return null;

  const handleCopyLink = () => {
    const url = window.location.origin;
    copyToClipboard(url);
    setCopiedLink(true);
    if (flash) flash("Axiom Wallet link copied to clipboard!");
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleTriggerNativeInstall = async () => {
    setIsInstalling(true);
    const res = await pwaService.promptNativeInstall();
    setIsInstalling(false);
    if (res.outcome === "accepted") {
      if (flash) flash("🎉 Axiom Wallet installed to your Home Screen!");
      onClose();
    } else if (res.outcome === "dismissed") {
      if (flash) flash("Installation cancelled. You can install anytime from Profile!");
    } else {
      if (flash) flash("Please follow the manual steps below to add to home screen.");
    }
  };

  return (
    <div
      className="modal-scrim"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100000,
        background: "rgba(3, 4, 8, 0.82)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
        boxSizing: "border-box",
        animation: "modalFadeIn 0.2s ease-out",
      }}
      onClick={onClose}
    >
      <div
        className="modal-box"
        style={{
          width: "100%",
          maxWidth: 480,
          maxHeight: "90vh",
          background: "linear-gradient(180deg, #131224 0%, #0B0D17 100%)",
          border: "1px solid rgba(124, 58, 237, 0.35)",
          borderRadius: 20,
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 24px 64px rgba(0, 0, 0, 0.85), 0 0 30px rgba(124, 58, 237, 0.25)",
          overflow: "hidden",
          position: "relative",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Glow & Decorative Bar */}
        <div
          style={{
            height: 3,
            width: "100%",
            background: "linear-gradient(90deg, #7C3AED, #06B6D4, #7C3AED)",
          }}
        />

        {/* Modal Header */}
        <div
          style={{
            padding: "18px 20px 14px",
            borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                background: "linear-gradient(135deg, rgba(124, 58, 237, 0.3) 0%, rgba(6, 182, 212, 0.2) 100%)",
                border: "1px solid rgba(124, 58, 237, 0.4)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
                boxShadow: "0 0 16px rgba(124, 58, 237, 0.35)",
              }}
            >
              <img src="/axiom-icon.png" alt="Axiom" style={{ width: 28, height: 28, objectFit: "contain" }} />
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: "#FFFFFF", letterSpacing: "-0.01em" }}>
                Add to Home Screen
              </div>
              <div style={{ fontSize: 11.5, color: "#94A3B8" }}>
                Install Axiom Wallet as a native mobile app
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "rgba(255, 255, 255, 0.06)",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              color: "#94A3B8",
              cursor: "pointer",
              borderRadius: "50%",
              width: 32,
              height: 32,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 150ms",
            }}
            title="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div
          style={{
            padding: "18px 20px 24px",
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          {/* Standalone Status Badge (if already installed) */}
          {isStandalone && (
            <div
              style={{
                background: "linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(6, 182, 212, 0.1) 100%)",
                border: "1px solid rgba(16, 185, 129, 0.4)",
                borderRadius: 14,
                padding: "14px 16px",
                display: "flex",
                alignItems: "flex-start",
                gap: 12,
              }}
            >
              <CheckCircle size={22} color="#10B981" style={{ flexShrink: 0, marginTop: 2 }} />
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#34D399" }}>
                  Axiom is Installed & Running Standalone!
                </div>
                <div style={{ fontSize: 12, color: "#94A3B8", marginTop: 4, lineHeight: 1.45 }}>
                  You are already enjoying full-screen native performance, persistent login sessions, and offline balance caching.
                </div>
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  style={{
                    marginTop: 10,
                    background: "rgba(16, 185, 129, 0.2)",
                    border: "1px solid rgba(16, 185, 129, 0.45)",
                    color: "#A7F3D0",
                    borderRadius: 8,
                    padding: "6px 12px",
                    fontSize: 11.5,
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <RefreshCw size={12} /> Sync & Reload App
                </button>
              </div>
            </div>
          )}

          {/* OS Switcher Tabs */}
          <div
            style={{
              display: "flex",
              background: "rgba(255, 255, 255, 0.05)",
              padding: 4,
              borderRadius: 12,
              border: "1px solid rgba(255, 255, 255, 0.08)",
            }}
          >
            <button
              type="button"
              onClick={() => setActiveTab("ios")}
              style={{
                flex: 1,
                padding: "9px 12px",
                borderRadius: 9,
                border: "none",
                background: activeTab === "ios" ? "linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%)" : "transparent",
                color: activeTab === "ios" ? "#FFFFFF" : "#94A3B8",
                fontWeight: 700,
                fontSize: 13,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                transition: "all 150ms",
                boxShadow: activeTab === "ios" ? "0 2px 10px rgba(124, 58, 237, 0.4)" : "none",
              }}
            >
              <Smartphone size={16} />
              <span>iPhone (iOS)</span>
              {isIOS && (
                <span
                  style={{
                    fontSize: 9,
                    background: activeTab === "ios" ? "rgba(255,255,255,0.25)" : "rgba(124,58,237,0.3)",
                    color: "#fff",
                    padding: "1px 6px",
                    borderRadius: 6,
                    fontWeight: 800,
                  }}
                >
                  THIS DEVICE
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("android")}
              style={{
                flex: 1,
                padding: "9px 12px",
                borderRadius: 9,
                border: "none",
                background: activeTab === "android" ? "linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%)" : "transparent",
                color: activeTab === "android" ? "#FFFFFF" : "#94A3B8",
                fontWeight: 700,
                fontSize: 13,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                transition: "all 150ms",
                boxShadow: activeTab === "android" ? "0 2px 10px rgba(124, 58, 237, 0.4)" : "none",
              }}
            >
              <Download size={16} />
              <span>Android</span>
              {isAndroid && (
                <span
                  style={{
                    fontSize: 9,
                    background: activeTab === "android" ? "rgba(255,255,255,0.25)" : "rgba(124,58,237,0.3)",
                    color: "#fff",
                    padding: "1px 6px",
                    borderRadius: 6,
                    fontWeight: 800,
                  }}
                >
                  THIS DEVICE
                </span>
              )}
            </button>
          </div>

          {/* TAB 1: IPHONE (iOS) GUIDE */}
          {activeTab === "ios" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {isInApp && (
                <div
                  style={{
                    background: "rgba(245, 158, 11, 0.12)",
                    border: "1px solid rgba(245, 158, 11, 0.35)",
                    borderRadius: 12,
                    padding: "10px 14px",
                    fontSize: 12,
                    color: "#FCD34D",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <ExternalLink size={16} style={{ flexShrink: 0 }} />
                  <span>
                    You appear to be inside an in-app browser. Open Axiom in <strong>Safari</strong> for full home screen installation.
                  </span>
                </div>
              )}

              {/* Step 1 */}
              <div
                style={{
                  background: "rgba(255, 255, 255, 0.03)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  borderRadius: 14,
                  padding: "14px 16px",
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                }}
              >
                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 10,
                    background: "rgba(124, 58, 237, 0.18)",
                    border: "1px solid rgba(124, 58, 237, 0.35)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#C4B5FD",
                    fontWeight: 800,
                    fontSize: 15,
                    flexShrink: 0,
                  }}
                >
                  1
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: "#FFFFFF" }}>
                    Tap the Safari Share button
                  </div>
                  <div style={{ fontSize: 12, color: "#94A3B8", marginTop: 2 }}>
                    Located at the bottom toolbar of Safari (or top bar on iPad).
                  </div>
                </div>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 8,
                    background: "rgba(59, 130, 246, 0.15)",
                    border: "1px solid rgba(59, 130, 246, 0.35)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#60A5FA",
                    flexShrink: 0,
                  }}
                  title="iOS Safari Share Icon"
                >
                  <Share2 size={18} />
                </div>
              </div>

              {/* Step 2 */}
              <div
                style={{
                  background: "rgba(255, 255, 255, 0.03)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  borderRadius: 14,
                  padding: "14px 16px",
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                }}
              >
                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 10,
                    background: "rgba(124, 58, 237, 0.18)",
                    border: "1px solid rgba(124, 58, 237, 0.35)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#C4B5FD",
                    fontWeight: 800,
                    fontSize: 15,
                    flexShrink: 0,
                  }}
                >
                  2
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: "#FFFFFF" }}>
                    Select "Add to Home Screen"
                  </div>
                  <div style={{ fontSize: 12, color: "#94A3B8", marginTop: 2 }}>
                    Scroll down the options list and tap <strong>Add to Home Screen</strong>.
                  </div>
                </div>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 8,
                    background: "rgba(16, 185, 129, 0.15)",
                    border: "1px solid rgba(16, 185, 129, 0.35)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#34D399",
                    flexShrink: 0,
                  }}
                  title="Add to Home Screen Icon"
                >
                  <PlusSquare size={18} />
                </div>
              </div>

              {/* Step 3 */}
              <div
                style={{
                  background: "rgba(255, 255, 255, 0.03)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  borderRadius: 14,
                  padding: "14px 16px",
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                }}
              >
                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 10,
                    background: "rgba(124, 58, 237, 0.18)",
                    border: "1px solid rgba(124, 58, 237, 0.35)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#C4B5FD",
                    fontWeight: 800,
                    fontSize: 15,
                    flexShrink: 0,
                  }}
                >
                  3
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: "#FFFFFF" }}>
                    Tap "Add" in Top-Right
                  </div>
                  <div style={{ fontSize: 12, color: "#94A3B8", marginTop: 2 }}>
                    Confirm the name Axiom and tap <strong>Add</strong> to place the icon on your screen.
                  </div>
                </div>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 800,
                    color: "#38BDF8",
                    padding: "6px 10px",
                    background: "rgba(56, 189, 248, 0.12)",
                    borderRadius: 6,
                    border: "1px solid rgba(56, 189, 248, 0.3)",
                  }}
                >
                  ADD
                </div>
              </div>

              {/* Copy URL helper for Safari */}
              <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  style={{
                    flex: 1,
                    background: "rgba(255, 255, 255, 0.06)",
                    border: "1px solid rgba(255, 255, 255, 0.12)",
                    borderRadius: 10,
                    padding: "10px",
                    color: "#C4B5FD",
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    transition: "all 150ms",
                  }}
                >
                  {copiedLink ? <Check size={14} color="#10B981" /> : <Copy size={14} />}
                  <span>{copiedLink ? "Link Copied!" : "Copy Link to Open in Safari"}</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: ANDROID GUIDE */}
          {activeTab === "android" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {/* Native 1-Tap Install Button if prompt captured */}
              {canPrompt && (
                <button
                  type="button"
                  onClick={handleTriggerNativeInstall}
                  disabled={isInstalling}
                  style={{
                    background: "linear-gradient(135deg, #7C3AED 0%, #06B6D4 100%)",
                    border: "none",
                    borderRadius: 14,
                    padding: "14px 18px",
                    color: "#FFFFFF",
                    fontSize: 14,
                    fontWeight: 800,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 10,
                    boxShadow: "0 4px 20px rgba(124, 58, 237, 0.4)",
                    transition: "transform 150ms",
                  }}
                >
                  <Download size={18} />
                  <span>{isInstalling ? "Opening Install Dialog..." : "Install Axiom App Now (1-Tap)"}</span>
                </button>
              )}

              {/* Step 1 */}
              <div
                style={{
                  background: "rgba(255, 255, 255, 0.03)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  borderRadius: 14,
                  padding: "14px 16px",
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                }}
              >
                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 10,
                    background: "rgba(124, 58, 237, 0.18)",
                    border: "1px solid rgba(124, 58, 237, 0.35)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#C4B5FD",
                    fontWeight: 800,
                    fontSize: 15,
                    flexShrink: 0,
                  }}
                >
                  1
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: "#FFFFFF" }}>
                    Tap the Chrome Menu (⋮)
                  </div>
                  <div style={{ fontSize: 12, color: "#94A3B8", marginTop: 2 }}>
                    Located at the top-right corner of Google Chrome or Samsung Internet.
                  </div>
                </div>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 8,
                    background: "rgba(255, 255, 255, 0.08)",
                    border: "1px solid rgba(255, 255, 255, 0.12)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#E2E8F0",
                    flexShrink: 0,
                  }}
                >
                  <MoreVertical size={18} />
                </div>
              </div>

              {/* Step 2 */}
              <div
                style={{
                  background: "rgba(255, 255, 255, 0.03)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  borderRadius: 14,
                  padding: "14px 16px",
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                }}
              >
                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 10,
                    background: "rgba(124, 58, 237, 0.18)",
                    border: "1px solid rgba(124, 58, 237, 0.35)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#C4B5FD",
                    fontWeight: 800,
                    fontSize: 15,
                    flexShrink: 0,
                  }}
                >
                  2
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: "#FFFFFF" }}>
                    Select "Install app" or "Add to Home screen"
                  </div>
                  <div style={{ fontSize: 12, color: "#94A3B8", marginTop: 2 }}>
                    Tap <strong>Install app</strong> from the browser menu options.
                  </div>
                </div>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 8,
                    background: "rgba(6, 182, 212, 0.15)",
                    border: "1px solid rgba(6, 182, 212, 0.35)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#22D3EE",
                    flexShrink: 0,
                  }}
                >
                  <Download size={18} />
                </div>
              </div>

              {/* Step 3 */}
              <div
                style={{
                  background: "rgba(255, 255, 255, 0.03)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  borderRadius: 14,
                  padding: "14px 16px",
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                }}
              >
                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 10,
                    background: "rgba(124, 58, 237, 0.18)",
                    border: "1px solid rgba(124, 58, 237, 0.35)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#C4B5FD",
                    fontWeight: 800,
                    fontSize: 15,
                    flexShrink: 0,
                  }}
                >
                  3
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: "#FFFFFF" }}>
                    Tap "Install" to Confirm
                  </div>
                  <div style={{ fontSize: 12, color: "#94A3B8", marginTop: 2 }}>
                    Axiom Wallet will be added to your app drawer and home screen.
                  </div>
                </div>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 800,
                    color: "#34D399",
                    padding: "6px 10px",
                    background: "rgba(16, 185, 129, 0.12)",
                    borderRadius: 6,
                    border: "1px solid rgba(16, 185, 129, 0.3)",
                  }}
                >
                  INSTALL
                </div>
              </div>
            </div>
          )}

          {/* Benefits Feature Pill Strip */}
          <div
            style={{
              marginTop: 4,
              padding: "12px 14px",
              background: "rgba(255, 255, 255, 0.02)",
              borderRadius: 12,
              border: "1px solid rgba(255, 255, 255, 0.06)",
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 8,
              textAlign: "center",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <Maximize size={15} color="#06B6D4" />
              <span style={{ fontSize: 10.5, fontWeight: 700, color: "#FFFFFF" }}>Full Screen</span>
              <span style={{ fontSize: 9.5, color: "#94A3B8" }}>No browser bars</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <Zap size={15} color="#F59E0B" />
              <span style={{ fontSize: 10.5, fontWeight: 700, color: "#FFFFFF" }}>Instant Launch</span>
              <span style={{ fontSize: 9.5, color: "#94A3B8" }}>Direct 1-tap app</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <ShieldCheck size={15} color="#10B981" />
              <span style={{ fontSize: 10.5, fontWeight: 700, color: "#FFFFFF" }}>Secure Session</span>
              <span style={{ fontSize: 9.5, color: "#94A3B8" }}>Encrypted ledger</span>
            </div>
          </div>

          {/* Done / Close Button */}
          <button
            type="button"
            onClick={onClose}
            style={{
              width: "100%",
              background: "rgba(255, 255, 255, 0.08)",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              borderRadius: 12,
              padding: "12px",
              color: "#FFFFFF",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              transition: "all 150ms",
            }}
          >
            Got it, Close
          </button>
        </div>
      </div>
    </div>
  );
};
