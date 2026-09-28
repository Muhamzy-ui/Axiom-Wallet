import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  X, Download, Copy, Share2, Sparkles, TrendingUp,
  Coins, Camera, ShieldCheck, Check, Zap, Sliders, ExternalLink
} from "lucide-react";
import { marketStore } from "../../services/marketStore";
import { type AuthUser } from "../../services/authService";
import "./Modals.css";

interface ProfitShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialSym?: string;
  authUser?: AuthUser | null;
  flash?: (msg: string) => void;
}

type CardTheme = "photon" | "degen";

export const ProfitShareModal: React.FC<ProfitShareModalProps> = ({
  isOpen,
  onClose,
  initialSym = "SOL",
  authUser,
  flash,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [selectedSym, setSelectedSym] = useState<string>(initialSym.toUpperCase());
  const [theme, setTheme] = useState<CardTheme>("photon");
  const [timeframe, setTimeframe] = useState<string>("7D");
  const [copied, setCopied] = useState<boolean>(false);
  const [isCustomMode, setIsCustomMode] = useState<boolean>(false);

  // Custom simulation overrides (prefilled with exact numbers from reference screenshot)
  const [customInvested, setCustomInvested] = useState<string>("3355.30");
  const [customCurrentVal, setCustomCurrentVal] = useState<string>("69675.76");
  const [customCoinAmount, setCustomCoinAmount] = useState<string>("27.6M");
  const [customAvgEntry, setCustomAvgEntry] = useState<string>("$103K MC");

  // Keep sym synchronized if initialSym changes
  useEffect(() => {
    if (initialSym) setSelectedSym(initialSym.toUpperCase());
  }, [initialSym]);

  const userAddress = authUser?.wallet_address || "AxB8s9sHynawdTUeioAgqcQKQ7Y6LvrdiN6ybE6YSrWU";
  const userUid = authUser?.user_id
    ? `AXM-${authUser.user_id.replace(/[^a-zA-Z0-9]/g, "").slice(0, 8).toUpperCase()}`
    : (userAddress ? `AXM-${userAddress.replace(/[^a-zA-Z0-9]/g, "").slice(0, 8).toUpperCase()}` : "AXM-8F2A9C");
  const userName = authUser?.username || authUser?.email?.split("@")[0] || "AYUBTOMI";

  // Available tokens for quick switching
  const tokens = marketStore.tokens || [];
  const availableSyms = useMemo(() => {
    const list = ["BTC", "ETH", "SOL", "HOLDOWEEN", "BONK", "WIF", "PEPE", "POPCAT", "DOGE"];
    tokens.forEach((t: any) => {
      if (!list.includes(t.sym)) list.push(t.sym);
    });
    return list;
  }, [tokens]);

  const tokenData = marketStore.getToken(selectedSym) || {
    sym: selectedSym,
    name: selectedSym === "HOLDOWEEN" ? "HOLDOWEEN" : selectedSym,
    price: "$2.40",
    numericPrice: 2.4,
    cap: "$2.4M",
  };

  // Position calculation
  // Position calculation
  const pos = marketStore.getUserPosition(selectedSym);
  const hasRealPosition = !!(pos && pos.hasPosition && pos.invested > 0);

  // Resolved numbers for the card
  const metrics = useMemo(() => {
    if (isCustomMode) {
      const inv = parseFloat(customInvested) || 3355.30;
      const cur = parseFloat(customCurrentVal) || 69675.76;
      const profit = cur - inv;
      const pct = inv > 0 ? (profit / inv) * 100 : 0;
      const mult = inv > 0 ? cur / inv : 1;
      return {
        hasPosition: true,
        invested: inv,
        currentVal: cur,
        profitUsd: profit,
        profitPct: pct,
        multiplier: mult,
        coinAmount: customCoinAmount || `${(cur / (tokenData.numericPrice || 1)).toFixed(1)} ${selectedSym}`,
        avgEntry: customAvgEntry || "$103K MC",
      };
    }

    if (!hasRealPosition) {
      return {
        hasPosition: false,
        invested: 0,
        currentVal: 0,
        profitUsd: 0,
        profitPct: 0,
        multiplier: 0,
        coinAmount: `0.00 ${selectedSym}`,
        avgEntry: "—",
      };
    }

    const inv = pos.invested;
    const cur = pos.currentVal;
    const profit = pos.pnlUsd;
    const pct = pos.pnlPct;
    const mult = inv > 0 ? cur / inv : 1;
    return {
      hasPosition: true,
      invested: inv,
      currentVal: cur,
      profitUsd: profit,
      profitPct: pct,
      multiplier: mult,
      coinAmount: `${pos.bal >= 1000000 ? (pos.bal / 1000000).toFixed(1) + "M" : pos.bal.toFixed(2)} ${selectedSym}`,
      avgEntry: `$${(pos.invested / (pos.bal || 1)).toFixed(4)}`,
    };
  }, [isCustomMode, hasRealPosition, customInvested, customCurrentVal, customCoinAmount, customAvgEntry, pos, tokenData, selectedSym]);

  // Redraw Canvas when anything changes
  useEffect(() => {
    if (!isOpen) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Retina 2x scale
    const width = 880;
    const height = 980;
    canvas.width = width * 2;
    canvas.height = height * 2;
    ctx.scale(2, 2);

    const isPhoton = theme === "photon";
    const isLoss = metrics.hasPosition && (metrics.profitPct < 0 || metrics.profitUsd < 0);
    const brandColor = isLoss ? "#EF4444" : "#10B981";
    const brandGlow = isLoss ? "#EF4444" : "#00FFA3";

    // 1. Background
    if (isPhoton) {
      const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
      bgGrad.addColorStop(0, "#090A11");
      bgGrad.addColorStop(0.5, "#0D0E17");
      bgGrad.addColorStop(1, "#07080E");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Subtle mesh glow at top right
      const glowGrad = ctx.createRadialGradient(width - 80, 100, 10, width - 80, 100, 360);
      glowGrad.addColorStop(0, isLoss ? "rgba(239, 68, 68, 0.12)" : "rgba(16, 185, 129, 0.12)");
      glowGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = glowGrad;
      ctx.fillRect(0, 0, width, height);
    } else {
      // Degen Poster Theme
      const bgGrad = ctx.createLinearGradient(0, 0, width, height);
      bgGrad.addColorStop(0, isLoss ? "#1A0505" : "#03140C");
      bgGrad.addColorStop(0.4, isLoss ? "#2B0909" : "#062215");
      bgGrad.addColorStop(1, isLoss ? "#0E0202" : "#020B07");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      const aura = ctx.createRadialGradient(width / 2, height / 2 - 40, 50, width / 2, height / 2 - 40, 420);
      aura.addColorStop(0, isLoss ? "rgba(239, 68, 68, 0.22)" : "rgba(0, 255, 163, 0.18)");
      aura.addColorStop(0.7, isLoss ? "rgba(239, 68, 68, 0.06)" : "rgba(16, 185, 129, 0.05)");
      aura.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = aura;
      ctx.fillRect(0, 0, width, height);
    }

    // Card border
    ctx.strokeStyle = isPhoton
      ? (isLoss ? "rgba(239, 68, 68, 0.2)" : "rgba(255, 255, 255, 0.08)")
      : (isLoss ? "rgba(239, 68, 68, 0.4)" : "rgba(0, 255, 163, 0.25)");
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, width - 2, height - 2);

    if (isPhoton) {
      // ──────────────── PHOTON / TERMINAL THEME ────────────────
      // Top Brand Bar: Axiom Logo & Status
      ctx.fillStyle = "rgba(124, 58, 237, 0.15)";
      ctx.beginPath();
      ctx.roundRect(40, 40, 130, 32, 16);
      ctx.fill();
      ctx.strokeStyle = "rgba(124, 58, 237, 0.4)";
      ctx.stroke();

      ctx.fillStyle = "#A78BFA";
      ctx.font = "bold 13px Inter, -apple-system, sans-serif";
      ctx.fillText("⚡ AXIOM PRO", 54, 61);

      // Top Right: Live Market Cap
      ctx.textAlign = "right";
      ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
      ctx.font = "bold 13px Inter, -apple-system, sans-serif";
      ctx.fillText("Market Cap", width - 40, 52);
      ctx.fillStyle = "#FFFFFF";
      ctx.font = "bold 20px Inter, -apple-system, sans-serif";
      ctx.fillText(tokenData.cap || "$2.4M", width - 40, 76);
      ctx.textAlign = "left";

      // Token Header
      // Token Icon circle
      ctx.fillStyle = brandColor;
      ctx.beginPath();
      ctx.arc(66, 126, 26, 0, Math.PI * 2);
      ctx.fill();

      // Icon symbol text
      ctx.fillStyle = "#FFFFFF";
      ctx.font = "bold 18px Inter, -apple-system, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(selectedSym.slice(0, 3), 66, 132);
      ctx.textAlign = "left";

      // Token Name & Open Pill
      ctx.fillStyle = "#FFFFFF";
      ctx.font = "bold 26px Inter, -apple-system, sans-serif";
      ctx.fillText(`${selectedSym}  ›`, 104, 126);

      // Open badge
      ctx.fillStyle = metrics.hasPosition ? "rgba(59, 130, 246, 0.2)" : "rgba(148, 163, 184, 0.15)";
      ctx.beginPath();
      ctx.roundRect(104, 136, 100, 22, 6);
      ctx.fill();
      ctx.strokeStyle = metrics.hasPosition ? "rgba(59, 130, 246, 0.5)" : "rgba(148, 163, 184, 0.3)";
      ctx.stroke();
      ctx.fillStyle = metrics.hasPosition ? "#60A5FA" : "#94A3B8";
      ctx.font = "bold 11px Inter, -apple-system, sans-serif";
      ctx.fillText(metrics.hasPosition ? "Position Open •" : "No Position •", 112, 151);

      // Chart Box Area (Height: ~300px)
      const chartTop = 190;
      const chartBottom = 490;
      const chartLeft = 40;
      const chartRight = width - 40;
      const chartW = chartRight - chartLeft;

      if (!metrics.hasPosition) {
        // CLEAN NO OPEN POSITION STATE
        ctx.fillStyle = "rgba(255, 255, 255, 0.02)";
        ctx.beginPath();
        ctx.roundRect(chartLeft, chartTop, chartW, 290, 16);
        ctx.fill();
        ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
        ctx.stroke();

        ctx.textAlign = "center";
        ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
        ctx.font = "bold 22px Inter, -apple-system, sans-serif";
        ctx.fillText(`No Active Position in $${selectedSym}`, width / 2, chartTop + 120);

        ctx.fillStyle = "rgba(255, 255, 255, 0.45)";
        ctx.font = "500 14px Inter, -apple-system, sans-serif";
        ctx.fillText(`Buy or Swap $${selectedSym} on Axiom DEX to activate your verified PnL share card`, width / 2, chartTop + 155);
        ctx.textAlign = "left";
      } else {
        // Price target line
        ctx.strokeStyle = isLoss ? "rgba(239, 68, 68, 0.25)" : "rgba(16, 185, 129, 0.25)";
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(chartLeft, 270);
        ctx.lineTo(chartRight - 90, 270);
        ctx.stroke();
        ctx.setLineDash([]);

        // Price pill on the right
        ctx.fillStyle = brandColor;
        ctx.beginPath();
        ctx.roundRect(chartRight - 84, 258, 84, 24, 6);
        ctx.fill();
        ctx.fillStyle = "#FFFFFF";
        ctx.font = "bold 12px Inter, -apple-system, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(tokenData.cap || "$2.4M", chartRight - 42, 274);
        ctx.textAlign = "left";

        // Generate smooth bezier curve path
        const pts = isLoss ? [
          { x: chartLeft, y: 270 },
          { x: chartLeft + chartW * 0.15, y: 280 },
          { x: chartLeft + chartW * 0.28, y: 275 },
          { x: chartLeft + chartW * 0.40, y: 310 },
          { x: chartLeft + chartW * 0.52, y: 340 },
          { x: chartLeft + chartW * 0.62, y: 360 },
          { x: chartLeft + chartW * 0.72, y: 410 },
          { x: chartLeft + chartW * 0.82, y: 430 },
          { x: chartLeft + chartW * 0.90, y: 442 },
          { x: chartRight, y: 450 }
        ] : [
          { x: chartLeft, y: 440 },
          { x: chartLeft + chartW * 0.15, y: 436 },
          { x: chartLeft + chartW * 0.28, y: 442 },
          { x: chartLeft + chartW * 0.40, y: 438 },
          { x: chartLeft + chartW * 0.52, y: 432 },
          { x: chartLeft + chartW * 0.62, y: 420 },
          { x: chartLeft + chartW * 0.72, y: 380 },
          { x: chartLeft + chartW * 0.82, y: 310 },
          { x: chartLeft + chartW * 0.90, y: 282 },
          { x: chartRight, y: 268 }
        ];

        // Fill area under curve
        const areaGrad = ctx.createLinearGradient(0, 250, 0, chartBottom);
        areaGrad.addColorStop(0, isLoss ? "rgba(239, 68, 68, 0.35)" : "rgba(16, 185, 129, 0.35)");
        areaGrad.addColorStop(0.5, isLoss ? "rgba(239, 68, 68, 0.12)" : "rgba(16, 185, 129, 0.12)");
        areaGrad.addColorStop(1, isLoss ? "rgba(239, 68, 68, 0.0)" : "rgba(16, 185, 129, 0.0)");

        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 0; i < pts.length - 1; i++) {
          const xc = (pts[i].x + pts[i + 1].x) / 2;
          const yc = (pts[i].y + pts[i + 1].y) / 2;
          ctx.quadraticCurveTo(pts[i].x, pts[i].y, xc, yc);
        }
        ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
        ctx.lineTo(chartRight, chartBottom);
        ctx.lineTo(chartLeft, chartBottom);
        ctx.closePath();
        ctx.fillStyle = areaGrad;
        ctx.fill();

        // Draw curve with glow
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 0; i < pts.length - 1; i++) {
          const xc = (pts[i].x + pts[i + 1].x) / 2;
          const yc = (pts[i].y + pts[i + 1].y) / 2;
          ctx.quadraticCurveTo(pts[i].x, pts[i].y, xc, yc);
        }
        ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
        ctx.strokeStyle = brandColor;
        ctx.lineWidth = 4;
        ctx.shadowColor = brandColor;
        ctx.shadowBlur = 12;
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Entry bubble points
        const buyBubbleIndices = [1, 2, 4, 6, 7, 8];
        buyBubbleIndices.forEach((idx) => {
          const pt = pts[idx];
          const bubbleY = pt.y - 18;
          ctx.fillStyle = brandColor;
          ctx.beginPath();
          ctx.arc(pt.x, bubbleY, 12, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = "#000000";
          ctx.lineWidth = 2;
          ctx.stroke();

          ctx.strokeStyle = "#000000";
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(pt.x - 5, bubbleY);
          ctx.lineTo(pt.x + 5, bubbleY);
          if (!isLoss) {
            ctx.moveTo(pt.x, bubbleY - 5);
            ctx.lineTo(pt.x, bubbleY + 5);
          }
          ctx.stroke();
        });
      }

      // Timeframe Pills Row (LIVE, 1H, 4H, 1D, 7D, ALL)
      const tfY = 520;
      const tfs = ["LIVE", "1H", "4H", "1D", "7D", "ALL"];
      tfs.forEach((tf, i) => {
        const tfX = 40 + i * 54;
        const isSel = tf === timeframe;
        if (isSel) {
          ctx.fillStyle = "rgba(255, 255, 255, 0.15)";
          ctx.beginPath();
          ctx.roundRect(tfX, tfY, 46, 26, 6);
          ctx.fill();
        }
        ctx.fillStyle = isSel ? "#FFFFFF" : "rgba(255, 255, 255, 0.4)";
        ctx.font = "bold 12px Inter, -apple-system, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(tf, tfX + 23, tfY + 17);
      });
      ctx.textAlign = "left";

      // Divider Line
      ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(40, 570);
      ctx.lineTo(width - 40, 570);
      ctx.stroke();

      // Big Numbers Section
      // Left: Total Position Value
      ctx.fillStyle = "#FFFFFF";
      ctx.font = "900 46px Inter, -apple-system, sans-serif";
      ctx.fillText(`$${metrics.currentVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 40, 630);

      ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
      ctx.font = "600 16px Inter, -apple-system, sans-serif";
      ctx.fillText(metrics.coinAmount, 40, 662);

      // Right: Profit Amount & Percentage
      ctx.textAlign = "right";
      ctx.fillStyle = !metrics.hasPosition ? "rgba(255, 255, 255, 0.4)" : brandColor;
      ctx.font = "900 40px Inter, -apple-system, sans-serif";
      const sign = metrics.profitUsd > 0 ? "+" : metrics.profitUsd < 0 ? "-" : "";
      ctx.fillText(`${sign}$${Math.abs(metrics.profitUsd).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, width - 40, 630);

      // Percentage pill
      ctx.font = "bold 20px Inter, -apple-system, sans-serif";
      if (!metrics.hasPosition) {
        ctx.fillText(`0.00% PnL`, width - 40, 664);
      } else {
        const arrow = metrics.profitPct >= 0 ? "▲ +" : "▼ ";
        ctx.fillText(`${arrow}${metrics.profitPct.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`, width - 40, 664);
      }
      ctx.textAlign = "left";

      // Sub-metrics Box (Invested & Avg Entry)
      ctx.fillStyle = "rgba(255, 255, 255, 0.03)";
      ctx.beginPath();
      ctx.roundRect(40, 700, width - 80, 110, 16);
      ctx.fill();
      ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
      ctx.stroke();

      // Invested
      ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
      ctx.font = "600 14px Inter, -apple-system, sans-serif";
      ctx.fillText("Invested", 65, 742);
      ctx.fillStyle = "#FFFFFF";
      ctx.font = "bold 24px Inter, -apple-system, sans-serif";
      ctx.fillText(`$${metrics.invested.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 65, 778);

      // Vertical line
      ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
      ctx.beginPath();
      ctx.moveTo(width / 2 - 20, 720);
      ctx.lineTo(width / 2 - 20, 790);
      ctx.stroke();

      // Avg Entry
      ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
      ctx.font = "600 14px Inter, -apple-system, sans-serif";
      ctx.fillText("Avg. entry", width / 2 + 10, 742);
      ctx.fillStyle = "#FFFFFF";
      ctx.font = "bold 24px Inter, -apple-system, sans-serif";
      ctx.fillText(metrics.avgEntry, width / 2 + 10, 778);

      // Footer: Trader Info & Verified Axiom Watermark
      const footerY = 850;
      ctx.fillStyle = "rgba(255, 255, 255, 0.02)";
      ctx.beginPath();
      ctx.roundRect(40, footerY, width - 80, 80, 14);
      ctx.fill();

      // Trader Avatar & Name
      ctx.fillStyle = "#7C3AED";
      ctx.beginPath();
      ctx.arc(75, footerY + 40, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#FFFFFF";
      ctx.font = "bold 13px Inter, -apple-system, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(userName.slice(0, 2).toUpperCase(), 75, footerY + 45);
      ctx.textAlign = "left";

      ctx.fillStyle = "#FFFFFF";
      ctx.font = "bold 15px Inter, -apple-system, sans-serif";
      ctx.fillText(`Trader: @${userName}`, 108, footerY + 36);

      ctx.fillStyle = "#A78BFA";
      ctx.font = "bold 12px monospace";
      ctx.fillText(`UID: ${userUid}`, 108, footerY + 54);

      // Verified Axiom P2P Settlement
      ctx.textAlign = "right";
      ctx.fillStyle = brandColor;
      ctx.font = "bold 13px Inter, -apple-system, sans-serif";
      ctx.fillText("✓ Verified On Axiom", width - 65, footerY + 36);

      ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
      ctx.font = "600 12px Inter, -apple-system, sans-serif";
      ctx.fillText("axiom.trade • High-Speed DEX", width - 65, footerY + 54);
      ctx.textAlign = "left";

    } else {
      // ──────────────── DEGEN MULTIPLIER POSTER (Image 2 Style) ────────────────
      // Top Mascot / Badge
      ctx.fillStyle = brandGlow;
      ctx.beginPath();
      ctx.roundRect(width / 2 - 95, 45, 190, 36, 18);
      ctx.fill();
      ctx.fillStyle = "#000000";
      ctx.font = "900 14px Inter, -apple-system, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(isLoss ? "⚡ AXIOM PNL" : "⚡ AXIOM DEGEN", width / 2, 68);

      // Big Title (Token Symbol)
      ctx.fillStyle = "#FFFFFF";
      ctx.font = "900 58px Inter, -apple-system, sans-serif";
      ctx.fillText(selectedSym, width / 2, 160);

      // MULTIPLIER OR NO POSITION TEXT (NO FAKE 2.X WHEN NO POSITION!)
      if (!metrics.hasPosition) {
        ctx.fillStyle = "rgba(255, 255, 255, 0.45)";
        ctx.font = "900 80px Inter, -apple-system, sans-serif";
        ctx.fillText("NO POSITION", width / 2, 290);

        // Subtitle badge
        ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
        ctx.beginPath();
        ctx.roundRect(width / 2 - 180, 340, 360, 52, 26);
        ctx.fill();
        ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
        ctx.font = "bold 20px Inter, -apple-system, sans-serif";
        ctx.fillText(`0.00% PnL • Trade to Activate`, width / 2, 373);
      } else {
        const multText = `${metrics.multiplier < 1 ? metrics.multiplier.toFixed(2) : metrics.multiplier.toFixed(1)}X`;
        ctx.fillStyle = brandGlow;
        ctx.font = "900 130px Inter, -apple-system, sans-serif";
        ctx.shadowColor = brandGlow;
        ctx.shadowBlur = 28;
        ctx.fillText(multText, width / 2, 310);
        ctx.shadowBlur = 0;

        // Profit / Loss PnL Badge
        ctx.fillStyle = isLoss ? "rgba(239, 68, 68, 0.18)" : "rgba(0, 255, 163, 0.15)";
        ctx.beginPath();
        ctx.roundRect(width / 2 - 190, 350, 380, 56, 28);
        ctx.fill();
        ctx.strokeStyle = brandGlow;
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = brandGlow;
        ctx.font = "bold 28px Inter, -apple-system, sans-serif";
        const signStr = metrics.profitPct >= 0 ? `+${metrics.profitPct.toFixed(1)}% GAIN` : `${metrics.profitPct.toFixed(1)}% LOSS`;
        ctx.fillText(signStr, width / 2, 388);
      }

      // Middle Stats Grid (Invested, Value, Return)
      const statTop = 450;
      ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
      ctx.beginPath();
      ctx.roundRect(60, statTop, width - 120, 260, 20);
      ctx.fill();
      ctx.strokeStyle = isLoss ? "rgba(239, 68, 68, 0.3)" : "rgba(0, 255, 163, 0.2)";
      ctx.stroke();

      // Row 1: Total Profit / Loss
      ctx.textAlign = "left";
      ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
      ctx.font = "600 16px Inter, -apple-system, sans-serif";
      ctx.fillText(isLoss ? "Net Loss:" : "Net Profit:", 90, statTop + 45);
      ctx.textAlign = "right";
      ctx.fillStyle = !metrics.hasPosition ? "rgba(255, 255, 255, 0.4)" : brandGlow;
      ctx.font = "900 28px Inter, -apple-system, sans-serif";
      const pnlSign = metrics.profitUsd > 0 ? "+" : metrics.profitUsd < 0 ? "-" : "";
      ctx.fillText(`${pnlSign}$${Math.abs(metrics.profitUsd).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, width - 90, statTop + 46);

      // Row 2: Portfolio Value
      ctx.textAlign = "left";
      ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
      ctx.font = "600 16px Inter, -apple-system, sans-serif";
      ctx.fillText("Current Value:", 90, statTop + 105);
      ctx.textAlign = "right";
      ctx.fillStyle = "#FFFFFF";
      ctx.font = "bold 24px Inter, -apple-system, sans-serif";
      ctx.fillText(`$${metrics.currentVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, width - 90, statTop + 105);

      // Row 3: Initial Capital
      ctx.textAlign = "left";
      ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
      ctx.font = "600 16px Inter, -apple-system, sans-serif";
      ctx.fillText("Money In:", 90, statTop + 165);
      ctx.textAlign = "right";
      ctx.fillStyle = "#FFFFFF";
      ctx.font = "bold 24px Inter, -apple-system, sans-serif";
      ctx.fillText(`$${metrics.invested.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, width - 90, statTop + 165);

      // Row 4: Entry MC
      ctx.textAlign = "left";
      ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
      ctx.font = "600 16px Inter, -apple-system, sans-serif";
      ctx.fillText("Called at Entry:", 90, statTop + 225);
      ctx.textAlign = "right";
      ctx.fillStyle = "#C4B5FD";
      ctx.font = "bold 20px Inter, -apple-system, sans-serif";
      ctx.fillText(metrics.avgEntry, width - 90, statTop + 225);

      // Trader Brag Footer (Matching reference)
      const footY = 760;
      ctx.textAlign = "center";
      ctx.fillStyle = "#FFFFFF";
      ctx.font = "900 32px Inter, -apple-system, sans-serif";
      ctx.fillText(`👤 ${userName.toUpperCase()}`, width / 2, footY);

      ctx.fillStyle = brandGlow;
      ctx.font = "bold 16px monospace";
      ctx.fillText(`UID: ${userUid}`, width / 2, footY + 36);

      ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
      ctx.font = "600 14px Inter, -apple-system, sans-serif";
      ctx.fillText("⚡ Verified On Axiom Wallet • @axiom_wallet", width / 2, footY + 70);
    }
  }, [isOpen, theme, selectedSym, timeframe, metrics, userUid, userName, tokenData]);

  if (!isOpen) return null;

  // Download Handler (Saves high-res PNG directly to device)
  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      const link = document.createElement("a");
      link.download = `Axiom-Profit-${selectedSym}-${Date.now().toString(36)}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      if (flash) flash(`Downloaded ${selectedSym} profit screenshot!`);
    } catch {
      if (flash) flash("Failed to download image.");
    }
  };

  // Copy Image to Clipboard (For instant paste into Telegram / Twitter / Discord)
  const handleCopyImage = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      canvas.toBlob(async (blob) => {
        if (blob && navigator.clipboard && (window as any).ClipboardItem) {
          await navigator.clipboard.write([
            new (window as any).ClipboardItem({ "image/png": blob })
          ]);
          setCopied(true);
          if (flash) flash("Profit card copied to clipboard! Paste directly into Telegram or Discord.");
          setTimeout(() => setCopied(false), 2500);
        } else {
          handleDownload();
        }
      });
    } catch {
      handleDownload();
    }
  };

  // Share to Twitter/X
  const handleShareX = () => {
    const text = `Just locked in +${metrics.profitPct.toFixed(1)}% on $${selectedSym} with @AxiomWallet! 🚀🔥\n\nProfit: +$${metrics.profitUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\nMultiplier: ${metrics.multiplier.toFixed(1)}X\nTrader UID: ${userUid}\n\nTrade instantly on https://axiom.trade`;
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  };

  return (
    <div
      className="overlay"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
        zIndex: 9999,
        background: "rgba(3, 4, 8, 0.88)",
        backdropFilter: "blur(14px)",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="modal"
        style={{
          width: "100%",
          maxWidth: "540px",
          maxHeight: "92vh",
          overflowY: "auto",
          padding: "20px 22px",
          background: "#0C0D16",
          borderRadius: "22px",
          border: "1px solid rgba(255, 255, 255, 0.12)",
          boxShadow: "0 20px 60px rgba(0, 0, 0, 0.7), 0 0 40px rgba(16, 185, 129, 0.15)",
        }}
      >
        {/* Header Bar */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 10,
              background: metrics.hasPosition && metrics.profitPct < 0 ? "rgba(239, 68, 68, 0.15)" : "rgba(16, 185, 129, 0.15)",
              border: `1px solid ${metrics.hasPosition && metrics.profitPct < 0 ? "rgba(239, 68, 68, 0.3)" : "rgba(16, 185, 129, 0.3)"}`,
              display: "flex", alignItems: "center", justifyContent: "center"
            }}>
              <Share2 size={16} color={metrics.hasPosition && metrics.profitPct < 0 ? "#EF4444" : "#10B981"} />
            </div>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0, color: "#fff" }}>
                PnL Share Card
              </h2>
              <span style={{ fontSize: 11, color: "var(--muted)" }}>
                Generate & share your verified trade PnL card
              </span>
            </div>
          </div>

          <button
            type="button"
            className="close-btn"
            onClick={onClose}
            style={{ background: "rgba(255, 255, 255, 0.08)", borderRadius: "50%", width: 32, height: 32 }}
          >
            <X size={15} />
          </button>
        </div>

        {/* Style / Theme Switcher (Photon / Terminal vs Degen Poster) */}
        <div style={{ display: "flex", gap: 8, marginBottom: 14, background: "rgba(255, 255, 255, 0.04)", padding: 4, borderRadius: 12 }}>
          <button
            type="button"
            style={{
              flex: 1,
              padding: "7px 10px",
              borderRadius: 8,
              border: "none",
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
              background: theme === "photon" ? "#10B981" : "transparent",
              color: theme === "photon" ? "#000" : "var(--muted)",
              transition: "all 0.15s ease",
            }}
            onClick={() => setTheme("photon")}
          >
            📈 Photon / Terminal Style
          </button>
          <button
            type="button"
            style={{
              flex: 1,
              padding: "7px 10px",
              borderRadius: 8,
              border: "none",
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
              background: theme === "degen" ? "#10B981" : "transparent",
              color: theme === "degen" ? "#000" : "var(--muted)",
              transition: "all 0.15s ease",
            }}
            onClick={() => setTheme("degen")}
          >
            🔥 Degen Multiplier Poster
          </button>
        </div>

        {/* Coin Selector Pills */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", marginBottom: 6, display: "flex", justifyContent: "space-between" }}>
            <span>SELECT TOKEN:</span>
            <span>{hasRealPosition ? "✅ Live Position Found" : "⚡ Flex / Simulation Mode"}</span>
          </div>
          <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 4 }}>
            {availableSyms.slice(0, 7).map((sym) => (
              <button
                key={sym}
                type="button"
                onClick={() => setSelectedSym(sym)}
                style={{
                  padding: "5px 12px",
                  borderRadius: 16,
                  border: selectedSym === sym ? "1px solid #10B981" : "1px solid rgba(255, 255, 255, 0.08)",
                  background: selectedSym === sym ? "rgba(16, 185, 129, 0.18)" : "rgba(255, 255, 255, 0.03)",
                  color: selectedSym === sym ? "#10B981" : "#E2E8F0",
                  fontSize: 11.5,
                  fontWeight: 700,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                ${sym}
              </button>
            ))}
          </div>
        </div>

        {/* Interactive Custom Mode Toggle */}
        <div style={{ marginBottom: 14 }}>
          <button
            type="button"
            onClick={() => setIsCustomMode(!isCustomMode)}
            style={{
              background: "none",
              border: "none",
              color: "#A78BFA",
              fontSize: 11.5,
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 5,
              padding: 0,
            }}
          >
            <Sliders size={13} />
            <span>{isCustomMode ? "Hide Custom Flex Numbers" : "Custom Flex Numbers (Customize $ Amount & Multiplier)"}</span>
          </button>

          {isCustomMode && (
            <div style={{
              marginTop: 8,
              padding: 12,
              borderRadius: 12,
              background: "rgba(124, 58, 237, 0.08)",
              border: "1px solid rgba(124, 58, 237, 0.2)",
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 8,
            }}>
              <div>
                <label style={{ fontSize: 10, color: "var(--muted)", fontWeight: 700, display: "block", marginBottom: 3 }}>
                  Invested ($ USD)
                </label>
                <input
                  type="text"
                  className="modal-input"
                  value={customInvested}
                  onChange={(e) => setCustomInvested(e.target.value)}
                  style={{ margin: 0, height: 36, fontSize: 12 }}
                />
              </div>
              <div>
                <label style={{ fontSize: 10, color: "var(--muted)", fontWeight: 700, display: "block", marginBottom: 3 }}>
                  Current Value ($ USD)
                </label>
                <input
                  type="text"
                  className="modal-input"
                  value={customCurrentVal}
                  onChange={(e) => setCustomCurrentVal(e.target.value)}
                  style={{ margin: 0, height: 36, fontSize: 12 }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Live Canvas Preview */}
        <div
          style={{
            position: "relative",
            width: "100%",
            borderRadius: "16px",
            overflow: "hidden",
            boxShadow: "0 12px 36px rgba(0, 0, 0, 0.6)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            background: "#08090E",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            marginBottom: 16,
          }}
        >
          <canvas
            ref={canvasRef}
            style={{
              width: "100%",
              height: "auto",
              display: "block",
            }}
          />
        </div>

        {/* Action Buttons: Download PNG, Copy Image, Share */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <button
              type="button"
              className="pro-submit-btn"
              onClick={handleDownload}
              style={{
                margin: 0,
                height: 44,
                background: "#10B981",
                color: "#000",
                fontWeight: 800,
                fontSize: 13,
                boxShadow: "0 4px 18px rgba(16, 185, 129, 0.35)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
              }}
            >
              <Download size={16} />
              <span>Download Screenshot</span>
            </button>

            <button
              type="button"
              onClick={handleCopyImage}
              style={{
                margin: 0,
                height: 44,
                background: "rgba(255, 255, 255, 0.08)",
                border: "1px solid rgba(255, 255, 255, 0.15)",
                borderRadius: 12,
                color: "#FFFFFF",
                fontWeight: 700,
                fontSize: 13,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                transition: "all 0.15s ease",
              }}
            >
              {copied ? <Check size={16} color="#10B981" /> : <Copy size={16} />}
              <span>{copied ? "Copied Image!" : "Copy Image"}</span>
            </button>
          </div>

          <button
            type="button"
            onClick={handleShareX}
            style={{
              width: "100%",
              height: 38,
              borderRadius: 10,
              background: "rgba(29, 155, 240, 0.12)",
              border: "1px solid rgba(29, 155, 240, 0.3)",
              color: "#38BDF8",
              fontWeight: 700,
              fontSize: 12,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
            }}
          >
            <Share2 size={14} />
            <span>Share Profit on X (Twitter)</span>
            <ExternalLink size={12} />
          </button>
        </div>

        <div style={{ textAlign: "center", marginTop: 10, fontSize: 11, color: "var(--muted)" }}>
          High-resolution 2x retina screenshot • Ready to paste into Telegram, WhatsApp, or Twitter
        </div>
      </div>
    </div>
  );
};
