import React from "react";

export interface AxiomLogoProps {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
  withGlow?: boolean;
  variant?: "icon" | "full" | "solid" | "user-crop";
}

/**
 * Official Axiom Brand Logo — Concept 01: Isometric 3D Prism "A"
 * Uses the authentic high-fidelity Concept 01 image with electric violet & cyan glow.
 */
export const AxiomLogo: React.FC<AxiomLogoProps> = ({
  size = 32,
  className = "",
  style = {},
  withGlow = true,
  variant = "icon",
}) => {
  let imageSrc = "/axiom-icon.png";
  if (variant === "full") imageSrc = "/axiom-full.png";
  else if (variant === "solid") imageSrc = "/axiom-icon-solid.png";
  else if (variant === "user-crop") imageSrc = "/axiom-user-crop.png";

  const glowStyle = withGlow
    ? "drop-shadow(0 0 14px rgba(168, 85, 247, 0.6)) drop-shadow(0 0 6px rgba(6, 182, 212, 0.45))"
    : "none";

  const isFullVariant = variant === "full" || variant === "user-crop";
  const calculatedHeight = isFullVariant ? Math.round(size * 0.76) : size;

  return (
    <img
      src={imageSrc}
      alt="Axiom Concept 01 Logo"
      width={size}
      height={calculatedHeight}
      className={`axiom-official-logo ${className}`}
      style={{
        display: "inline-block",
        verticalAlign: "middle",
        objectFit: "contain",
        filter: glowStyle,
        userSelect: "none",
        pointerEvents: "none",
        flexShrink: 0,
        ...style,
      }}
      loading="eager"
    />
  );
};

export default AxiomLogo;
