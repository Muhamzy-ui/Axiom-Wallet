import React, { useState, useRef } from 'react';
import { TrendingUp, TrendingDown, BarChart2, LineChart as LineIcon } from 'lucide-react';

interface TrustLineChartProps {
  tokenSymbol: string;
  tokenName: string;
  currentPrice: number;
  change24h: number;
  points: { price: number; timestamp: string }[];
  isCandleView: boolean;
  onToggleCandleView: () => void;
}

export const TrustLineChart: React.FC<TrustLineChartProps> = ({
  tokenSymbol,
  tokenName,
  currentPrice,
  change24h,
  points,
  isCandleView,
  onToggleCandleView,
}) => {
  const [timeframe, setTimeframe] = useState<'1H' | '24H' | '1W' | '1M' | 'ALL'>('24H');
  const [hoveredPoint, setHoveredPoint] = useState<{ price: number; timestamp: string } | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const isPositive = change24h >= 0;
  const strokeColor = isPositive ? '#00e599' : '#ff4d6d';
  const gradientId = isPositive ? 'greenGradient' : 'redGradient';

  // Ensure points exist
  const chartData = points.length >= 2 ? points : [
    { price: currentPrice * 0.92, timestamp: '1' },
    { price: currentPrice * 0.95, timestamp: '2' },
    { price: currentPrice * 0.93, timestamp: '3' },
    { price: currentPrice * 0.98, timestamp: '4' },
    { price: currentPrice * 0.97, timestamp: '5' },
    { price: currentPrice * 1.02, timestamp: '6' },
    { price: currentPrice * 1.05, timestamp: '7' },
    { price: currentPrice, timestamp: '8' },
  ];

  const minPrice = Math.min(...chartData.map((d) => d.price));
  const maxPrice = Math.max(...chartData.map((d) => d.price));
  const range = maxPrice - minPrice || currentPrice * 0.05;

  const width = 600;
  const height = 260;
  const paddingY = 30;

  // Convert points to SVG coordinates
  const coords = chartData.map((pt, i) => {
    const x = (i / (chartData.length - 1)) * width;
    const y = height - paddingY - ((pt.price - minPrice) / range) * (height - paddingY * 2);
    return { x, y, pt };
  });

  // Construct smooth SVG Bezier path
  const pathD = coords.reduce((acc, curr, idx, arr) => {
    if (idx === 0) return `M ${curr.x} ${curr.y}`;
    const prev = arr[idx - 1];
    const cp1x = prev.x + (curr.x - prev.x) / 2;
    const cp1y = prev.y;
    const cp2x = prev.x + (curr.x - prev.x) / 2;
    const cp2y = curr.y;
    return `${acc} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${curr.x} ${curr.y}`;
  }, '');

  const areaD = `${pathD} L ${width} ${height} L 0 ${height} Z`;

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const mouseX = ((e.clientX - rect.left) / rect.width) * width;
    const clampedX = Math.max(0, Math.min(width, mouseX));

    // Find nearest point
    let nearest = coords[0];
    let minDist = Infinity;
    for (const c of coords) {
      const dist = Math.abs(c.x - clampedX);
      if (dist < minDist) {
        minDist = dist;
        nearest = c;
      }
    }
    setHoveredPoint(nearest.pt);
  };

  const handleMouseLeave = () => {
    setHoveredPoint(null);
  };

  const activeDisplayPrice = hoveredPoint ? hoveredPoint.price : currentPrice;

  return (
    <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '1.5rem', overflow: 'hidden' }}>
      {/* Top Header: Price & Controls */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <h3 style={{ fontSize: '1.3rem', fontWeight: 800 }}>${tokenSymbol}</h3>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{tokenName}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem' }}>
            <h2 style={{ fontSize: '2rem', fontWeight: 900, letterSpacing: '-0.02em' }}>
              ${activeDisplayPrice.toLocaleString(undefined, { minimumFractionDigits: 6, maximumFractionDigits: 8 })}
            </h2>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
              color: isPositive ? 'var(--accent-green)' : 'var(--accent-red)',
              fontSize: '0.85rem',
              fontWeight: 700,
            }}>
              {isPositive ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
              <span>{isPositive ? `+${change24h}%` : `${change24h}%`}</span>
            </div>
          </div>
        </div>

        {/* Chart View Switcher Toggle */}
        <button
          onClick={onToggleCandleView}
          className="pill-btn pill-btn-secondary"
          style={{ padding: '0.45rem 0.85rem', fontSize: '0.8rem', gap: '0.4rem' }}
        >
          {isCandleView ? <LineIcon size={14} /> : <BarChart2 size={14} />}
          <span>{isCandleView ? 'Switch to Line' : 'Switch to Candles'}</span>
        </button>
      </div>

      {/* SVG Trust Wallet Glowing Line Chart */}
      <div style={{ position: 'relative', width: '100%', height: '240px' }}>
        <svg
          ref={svgRef}
          viewBox={`0 0 ${width} ${height}`}
          style={{ width: '100%', height: '100%', overflow: 'visible', cursor: 'crosshair' }}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          <defs>
            <linearGradient id="greenGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#00e599" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#00e599" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="redGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ff4d6d" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#ff4d6d" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Area Fill */}
          <path d={areaD} fill={`url(#${gradientId})`} />

          {/* Glowing Stroke Line */}
          <path
            d={pathD}
            fill="none"
            stroke={strokeColor}
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ filter: `drop-shadow(0 0 8px ${strokeColor})` }}
          />

          {/* Crosshair & Hover Tracker */}
          {hoveredPoint && (
            (() => {
              const activeIdx = chartData.findIndex((p) => p === hoveredPoint);
              const activeCoord = coords[activeIdx >= 0 ? activeIdx : coords.length - 1];
              return (
                <g>
                  {/* Vertical Guide Line */}
                  <line
                    x1={activeCoord.x}
                    y1={0}
                    x2={activeCoord.x}
                    y2={height}
                    stroke="rgba(255, 255, 255, 0.25)"
                    strokeDasharray="4 4"
                    strokeWidth="1.5"
                  />
                  {/* Outer Pulsing Dot */}
                  <circle
                    cx={activeCoord.x}
                    cy={activeCoord.y}
                    r="8"
                    fill={strokeColor}
                    opacity="0.3"
                  />
                  {/* Center Dot */}
                  <circle
                    cx={activeCoord.x}
                    cy={activeCoord.y}
                    r="4.5"
                    fill="#ffffff"
                    stroke={strokeColor}
                    strokeWidth="2"
                  />
                </g>
              );
            })()
          )}
        </svg>
      </div>

      {/* Timeframe Selector Pills */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderTop: '1px solid var(--border-dark)',
        paddingTop: '1rem',
        marginTop: '0.5rem',
      }}>
        <div style={{ display: 'flex', gap: '0.35rem' }}>
          {(['1H', '24H', '1W', '1M', 'ALL'] as const).map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              style={{
                padding: '0.35rem 0.75rem',
                borderRadius: 'var(--radius-full)',
                border: 'none',
                background: timeframe === tf ? 'rgba(171, 159, 242, 0.2)' : 'transparent',
                color: timeframe === tf ? 'var(--accent-phantom)' : 'var(--text-muted)',
                fontWeight: 700,
                fontSize: '0.78rem',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              {tf}
            </button>
          ))}
        </div>

        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          Live Market Ticker
        </span>
      </div>
    </div>
  );
};
