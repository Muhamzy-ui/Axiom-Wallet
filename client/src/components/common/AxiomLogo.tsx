import React from "react";

interface AxiomLogoProps {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
  withGlow?: boolean;
}

/**
 * Official Axiom Brand Logo — Concept 01: Isometric Prism "A"
 * Features electric violet to cyan geometric facets with subtle neon edge glow.
 */
export const AxiomLogo: React.FC<AxiomLogoProps> = ({
  size = 32,
  className = "",
  style = {},
  withGlow = true,
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{
        display: "inline-block",
        verticalAlign: "middle",
        filter: withGlow ? "drop-shadow(0 0 10px rgba(168, 85, 247, 0.45)) drop-shadow(0 0 4px rgba(6, 182, 212, 0.4))" : "none",
        ...style,
      }}
    >
      <defs>
        {/* Left Upper Facet: Radiant Violet / Magenta */}
        <linearGradient id="axm-v1" x1="20" y1="15" x2="65" y2="70" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#E9D5FF" />
          <stop offset="25%" stopColor="#C084FC" />
          <stop offset="70%" stopColor="#9333EA" />
          <stop offset="100%" stopColor="#6B21A8" />
        </linearGradient>

        {/* Right Lower Facet: Electric Cyan / Sky Blue */}
        <linearGradient id="axm-c1" x1="45" y1="35" x2="85" y2="85" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#BAE6FD" />
          <stop offset="35%" stopColor="#38BDF8" />
          <stop offset="75%" stopColor="#0284C7" />
          <stop offset="100%" stopColor="#1E3A8A" />
        </linearGradient>

        {/* Bevel Outer Stroke Highlight */}
        <linearGradient id="axm-edge" x1="20" y1="15" x2="85" y2="85" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#F5D0FE" />
          <stop offset="40%" stopColor="#A855F7" />
          <stop offset="75%" stopColor="#38BDF8" />
          <stop offset="100%" stopColor="#06B6D4" />
        </linearGradient>

        {/* Inner Prism Intersect Crossbar */}
        <linearGradient id="axm-cross" x1="30" y1="60" x2="80" y2="45" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#A855F7" />
          <stop offset="50%" stopColor="#06B6D4" />
          <stop offset="100%" stopColor="#38BDF8" />
        </linearGradient>

        {/* Ambient Dark Core Shadow for Isometric Depth */}
        <linearGradient id="axm-depth" x1="40" y1="40" x2="60" y2="75" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#1E1035" />
          <stop offset="100%" stopColor="#0B132B" />
        </linearGradient>
      </defs>

      {/* ── Outer Isometric Prism "A" Structure ── */}

      {/* Left Rising Band (Outer Isometric Flange) */}
      <path
        d="M 50 14 L 50 24 L 27 69 L 19 63 Z"
        fill="url(#axm-v1)"
      />

      {/* Left Main Arm Front Face */}
      <path
        d="M 50 14 L 29 58 L 37 68 L 50 42 Z"
        fill="url(#axm-v1)"
        fillOpacity="0.95"
      />

      {/* Apex Fold & Right Descending Upper Band */}
      <path
        d="M 50 14 L 75 62 L 67 68 L 50 34 Z"
        fill="url(#axm-c1)"
      />

      {/* Right Lower Arm Outer Bevel Face */}
      <path
        d="M 50 24 L 75 62 L 81 74 L 62 74 L 50 50 Z"
        fill="url(#axm-c1)"
        fillOpacity="0.9"
      />

      {/* Intersecting Dynamic Isometric Crossbar (Center Fold) */}
      <path
        d="M 33 55 L 70 38 L 81 60 L 64 69 L 52 47 L 41 57 Z"
        fill="url(#axm-cross)"
      />

      {/* Inner Negative Space Shadow Facet */}
      <path
        d="M 44 48 L 50 36 L 59 54 L 46 60 Z"
        fill="url(#axm-depth)"
        fillOpacity="0.85"
      />

      {/* Sharp Crisp Edge Stroke for High-Definition Finish */}
      <path
        d="M 19 63 L 50 14 L 75 62 L 81 74 L 62 74 L 50 50 L 37 68 L 27 69 Z"
        stroke="url(#axm-edge)"
        strokeWidth="1.6"
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {/* Center Crossbar Outline */}
      <path
        d="M 33 55 L 70 38 L 81 60 L 64 69"
        stroke="url(#axm-c1)"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  );
};

export default AxiomLogo;
