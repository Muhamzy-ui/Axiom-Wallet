import React, { useId } from 'react';

export interface SparklineProps {
  pts?: number[];
  isUp?: boolean;
  width?: number;
  height?: number;
  strokeWidth?: number;
}

export function Sparkline({
  pts,
  isUp = true,
  width = 72,
  height = 24,
  strokeWidth = 1.6,
}: SparklineProps) {
  const reactId = useId();
  if (!pts || pts.length < 2) return <div style={{ width, height }} />;
  
  const min = Math.min(...pts);
  const max = Math.max(...pts);
  const range = max - min || (min * 0.01) || 1;
  const padX = 2;
  const padY = 2;
  const h = height - padY * 2;
  const w = width - padX * 2;

  const points = pts.map((p, i) => {
    const x = padX + (i / (pts.length - 1)) * w;
    const y = padY + h - ((p - min) / range) * h;
    return { x, y };
  });

  const coords = points.map(pt => `${pt.x.toFixed(1)},${pt.y.toFixed(1)}`);
  const linePath = `M ${coords.join(" L ")}`;
  const color = isUp ? "#10B981" : "#EF4444";
  const cleanId = reactId.replace(/[^a-zA-Z0-9]/g, '');
  const gradId = `spk-${cleanId}-${isUp ? "g" : "r"}`;
  const areaPath = `${linePath} L ${(padX + w).toFixed(1)},${(height - 1).toFixed(1)} L ${padX.toFixed(1)},${(height - 1).toFixed(1)} Z`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{ display: "block", overflow: "hidden", flexShrink: 0, borderRadius: 4 }}
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.32" />
          <stop offset="100%" stopColor={color} stopOpacity="0.0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gradId})`} />
      <path
        d={linePath}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
