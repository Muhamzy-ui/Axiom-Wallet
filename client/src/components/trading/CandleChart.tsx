import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  createChart,
  CandlestickSeries,
  AreaSeries,
  ColorType,
  LineStyle,
  CrosshairMode,
  IChartApi,
  ISeriesApi,
  UTCTimestamp,
  CandlestickData,
  AreaData,
} from 'lightweight-charts';
import { marketStore } from '../../services/marketStore';
import { useTheme } from '../../services/themeContext';

export interface CandleChartProps {
  sym?: string;
  tokenSymbol?: string;
  timeframe?: string;
  dispMode?: 'Price' | 'Mcap';
  currMode?: 'USD' | 'SOL';
  showCandle?: boolean;
  currentPrice?: number;
  onToggleBackToLine?: () => void;
  chartHeight?: number;
  onAdjustHeight?: (delta: number) => void;
}

interface OHLCVState {
  open: string;
  high: string;
  low: string;
  close: string;
  change: string;
  isPositive: boolean;
}

export const CandleChart: React.FC<CandleChartProps> = ({
  sym,
  tokenSymbol,
  timeframe = '1s',
  dispMode = 'Price',
  currMode = 'USD',
  showCandle = false, // Line view is the default shown when a user opens Trade page
  chartHeight,
  onAdjustHeight,
}) => {
  const { isLight } = useTheme();
  const targetSym = (sym || tokenSymbol || 'BTC').toUpperCase();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const areaSeriesRef = useRef<ISeriesApi<'Area'> | null>(null);

  // Time & dataset tracking to ensure strict ascending timestamps without gaps
  const lastTimeRef = useRef<number>(0);
  const lastCandleOrigTimeRef = useRef<number>(0);
  const firstCandleOrigTimeRef = useRef<number>(0);
  const candleCountRef = useRef<number>(0);

  // OHLCV inspection state for header readout
  const [readout, setReadout] = useState<OHLCVState | null>(null);

  // Helper to format values cleanly according to active dispMode / currMode
  const formatVal = useCallback(
    (val: number) => {
      const isMcap = dispMode === 'Mcap';
      const isSol = currMode === 'SOL';
      if (isMcap) {
        if (val >= 1e9) return `$${(val / 1e9).toFixed(2)}B`;
        if (val >= 1e6) return `$${(val / 1e6).toFixed(1)}M`;
        if (val >= 1e3) return `$${(val / 1e3).toFixed(0)}K`;
        return `$${val.toFixed(0)}`;
      }
      if (isSol) return `${val.toFixed(5)} SOL`;
      if (val < 0.0001) return `$${val.toFixed(8)}`;
      if (val < 1) return `$${val.toFixed(4)}`;
      return `$${val.toFixed(2)}`;
    },
    [dispMode, currMode]
  );

  // Zoom control handlers
  const handleZoomIn = () => {
    if (!chartRef.current) return;
    const timeScale = chartRef.current.timeScale();
    const current = (timeScale.options() as any).barSpacing || 9;
    timeScale.applyOptions({ barSpacing: Math.min(36, current * 1.3) });
  };

  const handleZoomOut = () => {
    if (!chartRef.current) return;
    const timeScale = chartRef.current.timeScale();
    const current = (timeScale.options() as any).barSpacing || 9;
    timeScale.applyOptions({ barSpacing: Math.max(2.5, current * 0.75) });
  };

  const handleResetFit = () => {
    if (!chartRef.current) return;
    chartRef.current.timeScale().applyOptions({
      barSpacing: 9,
      rightOffset: 12,
    });
    chartRef.current.timeScale().scrollToRealTime();
  };

  const effectiveHeight = chartHeight || 230;

  // Load and apply full dataset on targetSym, timeframe, dispMode, or currMode change
  const applyFullData = useCallback(() => {
    const candleSeries = candleSeriesRef.current;
    const areaSeries = areaSeriesRef.current;
    const chart = chartRef.current;
    if (!candleSeries || !areaSeries || !chart) return;

    const token = marketStore.getToken(targetSym);
    const isMcap = dispMode === 'Mcap';
    const isSol = currMode === 'SOL';
    const mult = isMcap ? (token.supply || 1_000_000_000) : isSol ? 1 / 179.84 : 1;

    // Trigger background fetch if real Gecko pool token
    marketStore.loadRealCandles(targetSym, timeframe);

    const rawCandles = marketStore.getCandles(targetSym, timeframe);
    if (!rawCandles || rawCandles.length === 0) return;

    // Sort by time ascending
    const sorted = rawCandles.slice().sort((a, b) => a.time - b.time);

    let lastT = 0;
    const candleData: CandlestickData<UTCTimestamp>[] = [];
    const lineData: AreaData<UTCTimestamp>[] = [];

    sorted.forEach((c) => {
      let t = Math.floor(c.time / 1000);
      if (t <= lastT) {
        t = lastT + 1;
      }
      lastT = t;

      const o = Number((c.open * mult).toFixed(8));
      const h = Number((c.high * mult).toFixed(8));
      const l = Number((c.low * mult).toFixed(8));
      const cl = Number((c.close * mult).toFixed(8));

      candleData.push({
        time: t as UTCTimestamp,
        open: o,
        high: h,
        low: l,
        close: cl,
      });

      lineData.push({
        time: t as UTCTimestamp,
        value: cl,
      });
    });

    lastTimeRef.current = lastT;
    lastCandleOrigTimeRef.current = sorted[sorted.length - 1].time;
    firstCandleOrigTimeRef.current = sorted[0].time;
    candleCountRef.current = sorted.length;

    candleSeries.setData(candleData);
    areaSeries.setData(lineData);

    // Update Line Graph colors: Green if pumping, Red if going down (optimized for dark vs light)
    const isUp = token.pos ?? (token.changeNum >= 0);
    const lineColor = isUp ? (isLight ? '#059669' : '#10B981') : (isLight ? '#DC2626' : '#EF4444');
    const topColor = isUp ? (isLight ? 'rgba(5, 150, 105, 0.25)' : 'rgba(16, 185, 129, 0.28)') : (isLight ? 'rgba(220, 38, 38, 0.22)' : 'rgba(239, 68, 68, 0.28)');
    const bottomColor = isUp ? 'rgba(16, 185, 129, 0.00)' : 'rgba(239, 68, 68, 0.00)';

    areaSeries.applyOptions({
      lineColor,
      topColor,
      bottomColor,
      priceLineColor: lineColor,
      crosshairMarkerBackgroundColor: lineColor,
    });

    const customFormatter = (val: number) => {
      if (isMcap) {
        if (val >= 1e9) return `$${(val / 1e9).toFixed(2)}B`;
        if (val >= 1e6) return `$${(val / 1e6).toFixed(1)}M`;
        if (val >= 1e3) return `$${(val / 1e3).toFixed(0)}K`;
        return `$${val.toFixed(0)}`;
      }
      if (isSol) return `${val.toFixed(5)} SOL`;
      if (val < 0.0001) return `$${val.toFixed(8)}`;
      if (val < 1) return `$${val.toFixed(4)}`;
      return `$${val.toFixed(2)}`;
    };

    candleSeries.applyOptions({
      priceFormat: {
        type: 'custom',
        formatter: customFormatter,
      },
    });

    areaSeries.applyOptions({
      priceFormat: {
        type: 'custom',
        formatter: customFormatter,
      },
    });

    // Display healthy readable candles with right breathing room and unrestricted historical scrolling
    chart.timeScale().applyOptions({
      barSpacing: timeframe === 'D' ? 11 : timeframe === '4h' ? 10 : 9,
      rightOffset: 8,
      minBarSpacing: 1.5,
      fixLeftEdge: false,
      fixRightEdge: false,
    });
    chart.timeScale().scrollToRealTime();

    // Default readout to latest candle
    const lastRaw = sorted[sorted.length - 1];
    const isPos = lastRaw.close >= lastRaw.open;
    const diffPct = lastRaw.open > 0 ? ((lastRaw.close - lastRaw.open) / lastRaw.open) * 100 : 0;
    setReadout({
      open: formatVal(lastRaw.open * mult),
      high: formatVal(lastRaw.high * mult),
      low: formatVal(lastRaw.low * mult),
      close: formatVal(lastRaw.close * mult),
      change: `${isPos ? '+' : ''}${diffPct.toFixed(2)}%`,
      isPositive: isPos,
    });
  }, [targetSym, timeframe, dispMode, currMode, isLight, formatVal]);

  // 1. Initialize TradingView Lightweight Chart
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const chart = createChart(container, {
      width: container.clientWidth || (typeof window !== 'undefined' ? window.innerWidth : 400),
      height: effectiveHeight,
      layout: {
        background: { type: ColorType.Solid, color: isLight ? '#FFFFFF' : 'transparent' },
        textColor: isLight ? '#475569' : '#8B8B99',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        fontSize: 11,
      },
      grid: {
        vertLines: { color: isLight ? 'rgba(0, 0, 0, 0.06)' : 'rgba(255, 255, 255, 0.03)' },
        horzLines: { color: isLight ? 'rgba(0, 0, 0, 0.06)' : 'rgba(255, 255, 255, 0.03)' },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: 'rgba(124, 58, 237, 0.65)',
          width: 1,
          style: LineStyle.Dashed,
          labelBackgroundColor: '#7C3AED',
        },
        horzLine: {
          color: 'rgba(124, 58, 237, 0.65)',
          width: 1,
          style: LineStyle.Dashed,
          labelBackgroundColor: '#7C3AED',
        },
      },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: true,
      },
      handleScale: {
        axisPressedMouseMove: true,
        axisDoubleClickReset: true,
        mouseWheel: true,
        pinch: true,
      },
      timeScale: {
        borderColor: isLight ? '#E2E8F0' : 'rgba(255, 255, 255, 0.08)',
        timeVisible: true,
        secondsVisible: timeframe === '1s',
        barSpacing: 9,
        minBarSpacing: 2.5,
        rightOffset: 12,
      },
      rightPriceScale: {
        borderColor: isLight ? '#E2E8F0' : 'rgba(255, 255, 255, 0.08)',
        scaleMargins: {
          top: 0.22,
          bottom: 0.22,
        },
        autoScale: true,
      },
    });

    chartRef.current = chart;

    // Candlestick Series (#10B981 emerald up, #DC2626 / #EF4444 crimson down)
    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: isLight ? '#059669' : '#10B981',
      downColor: isLight ? '#DC2626' : '#EF4444',
      borderUpColor: isLight ? '#059669' : '#10B981',
      borderDownColor: isLight ? '#DC2626' : '#EF4444',
      wickUpColor: isLight ? '#059669' : '#10B981',
      wickDownColor: isLight ? '#DC2626' : '#EF4444',
      priceLineVisible: true,
      priceLineColor: '#7C3AED',
      priceLineWidth: 1,
      priceLineStyle: LineStyle.Dashed,
      visible: !!showCandle,
    });
    candleSeriesRef.current = candleSeries;

    // Area Series (Green when pumping, Red when going down)
    const initToken = marketStore.getToken(targetSym);
    const isUpInit = initToken.pos ?? (initToken.changeNum >= 0);
    const lineColor = isUpInit ? (isLight ? '#059669' : '#10B981') : (isLight ? '#DC2626' : '#EF4444');
    const topColor = isUpInit ? (isLight ? 'rgba(5, 150, 105, 0.25)' : 'rgba(16, 185, 129, 0.28)') : (isLight ? 'rgba(220, 38, 38, 0.22)' : 'rgba(239, 68, 68, 0.28)');
    const bottomColor = isUpInit ? 'rgba(16, 185, 129, 0.00)' : 'rgba(239, 68, 68, 0.00)';

    const areaSeries = chart.addSeries(AreaSeries, {
      topColor,
      bottomColor,
      lineColor,
      lineWidth: 2,
      priceLineVisible: true,
      priceLineColor: lineColor,
      priceLineWidth: 1,
      priceLineStyle: LineStyle.Dashed,
      crosshairMarkerVisible: true,
      crosshairMarkerRadius: 4,
      crosshairMarkerBorderColor: '#ffffff',
      crosshairMarkerBackgroundColor: lineColor,
      visible: !showCandle,
    });
    areaSeriesRef.current = areaSeries;

    // Immediately push initial data into the newly created series
    applyFullData();

    // Crosshair move handler for interactive OHLCV inspection
    chart.subscribeCrosshairMove((param) => {
      if (!param || !param.time || !param.point || param.point.x < 0 || param.point.y < 0) {
        return;
      }

      if (candleSeriesRef.current && showCandle) {
        const cData = param.seriesData.get(candleSeriesRef.current) as CandlestickData<UTCTimestamp> | undefined;
        if (cData && 'open' in cData) {
          const isPos = cData.close >= cData.open;
          const diffPct = cData.open > 0 ? ((cData.close - cData.open) / cData.open) * 100 : 0;
          setReadout({
            open: formatVal(cData.open),
            high: formatVal(cData.high),
            low: formatVal(cData.low),
            close: formatVal(cData.close),
            change: `${isPos ? '+' : ''}${diffPct.toFixed(2)}%`,
            isPositive: isPos,
          });
          return;
        }
      }

      if (areaSeriesRef.current && !showCandle) {
        const aData = param.seriesData.get(areaSeriesRef.current) as AreaData<UTCTimestamp> | undefined;
        if (aData && 'value' in aData) {
          setReadout({
            open: '-',
            high: '-',
            low: '-',
            close: formatVal(aData.value),
            change: '',
            isPositive: isUpInit,
          });
        }
      }
    });

    // Container responsiveness via ResizeObserver
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry || !chartRef.current) return;
      const { width } = entry.contentRect;
      if (width > 0) {
        chartRef.current.resize(width, effectiveHeight);
      }
    });
    ro.observe(container);

    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
      areaSeriesRef.current = null;
    };
  }, []);

  // Resize chart when chartHeight changes
  useEffect(() => {
    if (!chartRef.current || !containerRef.current) return;
    const w = containerRef.current.clientWidth || (typeof window !== 'undefined' ? window.innerWidth : 400);
    chartRef.current.resize(w, effectiveHeight);
  }, [effectiveHeight]);

  // Update timeScale options when timeframe changes
  useEffect(() => {
    if (!chartRef.current) return;
    chartRef.current.applyOptions({
      timeScale: {
        secondsVisible: timeframe === '1s',
      },
    });
  }, [timeframe]);

  // Dynamically update chart theme whenever isLight changes
  useEffect(() => {
    if (!chartRef.current) return;
    chartRef.current.applyOptions({
      layout: {
        background: { type: ColorType.Solid, color: isLight ? '#FFFFFF' : 'transparent' },
        textColor: isLight ? '#475569' : '#8B8B99',
      },
      grid: {
        vertLines: { color: isLight ? 'rgba(0, 0, 0, 0.06)' : 'rgba(255, 255, 255, 0.03)' },
        horzLines: { color: isLight ? 'rgba(0, 0, 0, 0.06)' : 'rgba(255, 255, 255, 0.03)' },
      },
      timeScale: {
        borderColor: isLight ? '#E2E8F0' : 'rgba(255, 255, 255, 0.08)',
      },
      rightPriceScale: {
        borderColor: isLight ? '#E2E8F0' : 'rgba(255, 255, 255, 0.08)',
      },
    });
    if (candleSeriesRef.current) {
      candleSeriesRef.current.applyOptions({
        upColor: isLight ? '#059669' : '#10B981',
        downColor: isLight ? '#DC2626' : '#EF4444',
        borderUpColor: isLight ? '#059669' : '#10B981',
        borderDownColor: isLight ? '#DC2626' : '#EF4444',
        wickUpColor: isLight ? '#059669' : '#10B981',
        wickDownColor: isLight ? '#DC2626' : '#EF4444',
      });
    }
    applyFullData();
  }, [isLight, applyFullData]);

  // Smooth toggle between Line and Candlestick view
  useEffect(() => {
    if (candleSeriesRef.current) {
      candleSeriesRef.current.applyOptions({ visible: !!showCandle });
    }
    if (areaSeriesRef.current) {
      areaSeriesRef.current.applyOptions({ visible: !showCandle });
    }
  }, [showCandle]);

  // Re-apply full data when token or timeframe or modes change
  useEffect(() => {
    applyFullData();
  }, [applyFullData]);

  // Subscribe to real-time ticks without re-creating the whole chart (smooth, zero-flicker)
  useEffect(() => {
    const handleTick = () => {
      const candleSeries = candleSeriesRef.current;
      const areaSeries = areaSeriesRef.current;
      if (!candleSeries || !areaSeries) return;

      const rawCandles = marketStore.getCandles(targetSym, timeframe);
      if (!rawCandles || rawCandles.length === 0) return;

      // If full dataset count changed (e.g. real candles loaded), refresh whole series without losing scroll position
      if (rawCandles.length !== candleCountRef.current) {
        const chart = chartRef.current;
        const prevRange = chart ? chart.timeScale().getVisibleLogicalRange() : null;
        applyFullData();
        if (chart && prevRange && candleCountRef.current > 0 && prevRange.to < (candleCountRef.current - 4)) {
          try {
            chart.timeScale().setVisibleLogicalRange(prevRange);
          } catch {
            // fallback
          }
        }
        return;
      }

      const token = marketStore.getToken(targetSym);
      const isMcap = dispMode === 'Mcap';
      const isSol = currMode === 'SOL';
      const mult = isMcap ? (token.supply || 1_000_000_000) : isSol ? 1 / 179.84 : 1;

      const last = rawCandles[rawCandles.length - 1];

      let t: UTCTimestamp;
      if (last.time !== lastCandleOrigTimeRef.current) {
        // A new candle interval has rolled over
        let rawT = Math.floor(last.time / 1000);
        if (rawT <= lastTimeRef.current) {
          rawT = lastTimeRef.current + 1;
        }
        lastTimeRef.current = rawT;
        lastCandleOrigTimeRef.current = last.time;
        candleCountRef.current = rawCandles.length;
        t = rawT as UTCTimestamp;
      } else {
        // Updating current active candle in place
        t = lastTimeRef.current as UTCTimestamp;
      }

      const o = Number((last.open * mult).toFixed(8));
      const h = Number((last.high * mult).toFixed(8));
      const l = Number((last.low * mult).toFixed(8));
      const cl = Number((last.close * mult).toFixed(8));

      candleSeries.update({
        time: t,
        open: o,
        high: h,
        low: l,
        close: cl,
      });

      areaSeries.update({
        time: t,
        value: cl,
      });

      // Update Line Graph colors live: Green if pumping, Red if going down
      const isUp = token.pos ?? (cl >= o);
      const lineColor = isUp ? (isLight ? '#059669' : '#10B981') : (isLight ? '#DC2626' : '#EF4444');
      const topColor = isUp ? (isLight ? 'rgba(5, 150, 105, 0.25)' : 'rgba(16, 185, 129, 0.28)') : (isLight ? 'rgba(220, 38, 38, 0.22)' : 'rgba(239, 68, 68, 0.28)');
      const bottomColor = isUp ? 'rgba(16, 185, 129, 0.00)' : 'rgba(239, 68, 68, 0.00)';

      areaSeries.applyOptions({
        lineColor,
        topColor,
        bottomColor,
        priceLineColor: lineColor,
        crosshairMarkerBackgroundColor: lineColor,
      });

      // Update readout if user is not hovering with crosshair
      const isPos = cl >= o;
      const diffPct = o > 0 ? ((cl - o) / o) * 100 : 0;
      setReadout({
        open: formatVal(o),
        high: formatVal(h),
        low: formatVal(l),
        close: formatVal(cl),
        change: `${isPos ? '+' : ''}${diffPct.toFixed(2)}%`,
        isPositive: isPos,
      });
    };

    const unsubscribe = marketStore.subscribe(handleTick);
    return unsubscribe;
  }, [targetSym, timeframe, dispMode, currMode, isLight, applyFullData, formatVal]);

  return (
    <div
      style={{
        width: '100%',
        height: `${effectiveHeight}px`,
        minHeight: `${effectiveHeight}px`,
        position: 'relative',
        display: 'block',
      }}
    >
      {/* DexScreener/TradingView-style Top Header Bar: OHLC Readout on Left + Glassmorphic Zoom Pill on Right */}
      <div
        style={{
          position: 'absolute',
          top: 6,
          left: 8,
          right: 64, // Stops before right price scale
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          pointerEvents: 'none',
          zIndex: 10,
          fontFamily: "'Inter', -apple-system, sans-serif",
          gap: 6,
        }}
      >
        {/* Interactive OHLC Readout */}
        {readout && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              flexWrap: 'nowrap',
              gap: 7,
              fontSize: '10.5px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              color: isLight ? '#475569' : '#94A3B8',
              background: isLight ? 'rgba(255, 255, 255, 0.90)' : 'rgba(15, 15, 24, 0.82)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              padding: '3px 8px',
              borderRadius: 6,
              border: isLight ? '1px solid rgba(0,0,0,0.08)' : '1px solid rgba(255, 255, 255, 0.1)',
              boxShadow: isLight ? '0 1px 3px rgba(0,0,0,0.04)' : '0 2px 6px rgba(0,0,0,0.35)',
              minWidth: 0,
            }}
          >
            {showCandle ? (
              <>
                <span>O <b style={{ color: isLight ? '#0F172A' : '#F1F5F9', fontWeight: 600 }}>{readout.open}</b></span>
                <span>H <b style={{ color: isLight ? '#059669' : '#10B981', fontWeight: 600 }}>{readout.high}</b></span>
                <span>L <b style={{ color: isLight ? '#DC2626' : '#EF4444', fontWeight: 600 }}>{readout.low}</b></span>
                <span>C <b style={{ color: isLight ? '#0F172A' : '#F1F5F9', fontWeight: 600 }}>{readout.close}</b></span>
                {readout.change && (
                  <span
                    style={{
                      color: readout.isPositive ? (isLight ? '#059669' : '#10B981') : (isLight ? '#DC2626' : '#EF4444'),
                      fontWeight: 700,
                      marginLeft: 2,
                    }}
                  >
                    {readout.change}
                  </span>
                )}
              </>
            ) : (
              <>
                <span>PRICE <b style={{ color: isLight ? '#0F172A' : '#F1F5F9', fontWeight: 600 }}>{readout.close}</b></span>
                {readout.change && (
                  <span
                    style={{
                      color: readout.isPositive ? (isLight ? '#059669' : '#10B981') : (isLight ? '#DC2626' : '#EF4444'),
                      fontWeight: 700,
                      marginLeft: 4,
                    }}
                  >
                    {readout.change}
                  </span>
                )}
              </>
            )}
          </div>
        )}

        {/* Minimalist Glassmorphic Zoom Controls: [−] [+] [Fit] */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            pointerEvents: 'auto',
            background: isLight ? 'rgba(255, 255, 255, 0.92)' : 'rgba(20, 20, 32, 0.88)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            padding: '2px 4px',
            borderRadius: 6,
            border: isLight ? '1px solid rgba(0,0,0,0.08)' : '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: isLight ? '0 1px 3px rgba(0,0,0,0.04)' : '0 2px 6px rgba(0,0,0,0.35)',
            flexShrink: 0,
          }}
        >
          <button
            onClick={handleZoomIn}
            title="Zoom In (Wider candles)"
            style={{
              background: 'transparent',
              border: 'none',
              borderRadius: 4,
              color: isLight ? '#334155' : '#CBD5E1',
              width: 20,
              height: 20,
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 0,
            }}
          >
            +
          </button>
          <button
            onClick={handleZoomOut}
            title="Zoom Out (See more past candles)"
            style={{
              background: 'transparent',
              border: 'none',
              borderRadius: 4,
              color: isLight ? '#334155' : '#CBD5E1',
              width: 20,
              height: 20,
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 0,
            }}
          >
            −
          </button>
          <button
            onClick={handleResetFit}
            title="Reset View (Focus real-time candles)"
            style={{
              background: isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255, 255, 255, 0.08)',
              border: 'none',
              borderRadius: 4,
              color: isLight ? '#0F172A' : '#F1F5F9',
              padding: '1px 6px',
              height: 19,
              cursor: 'pointer',
              fontSize: 10,
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            Fit
          </button>
        </div>
      </div>

      {/* Lightweight Chart Container */}
      <div
        ref={containerRef}
        style={{
          width: '100%',
          height: `${effectiveHeight}px`,
          minHeight: `${effectiveHeight}px`,
          position: 'relative',
        }}
      />
    </div>
  );
};
