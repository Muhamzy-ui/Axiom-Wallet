import React, { useState } from "react";

interface CountryFlagProps {
  code: string;
  flag?: string;
  size?: number; // height in px (default 18)
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Universal Country Flag component that works on ALL operating systems
 * (Windows, macOS, iOS, Android, Linux).
 * 
 * Windows native fonts (Segoe UI Emoji) do NOT render national flag emojis,
 * displaying them as plain 2-letter ISO codes (e.g. "NG", "US").
 * This component uses ultra-fast CDN SVG/PNG flag graphics with instant
 * fallback to Unicode emoji so flags are always vivid and 100% visible.
 */
export const CountryFlag: React.FC<CountryFlagProps> = ({
  code,
  flag,
  size = 18,
  className = "",
  style = {},
}) => {
  const [imgFailed, setImgFailed] = useState(false);

  // Normalize code: EU is 'eu', others are lowercase 2-letter ISO
  const cCode = (code === "EU" ? "eu" : code || "").toLowerCase().trim();
  const width = Math.round(size * 1.35);

  if (imgFailed || !cCode) {
    return (
      <span
        className={`country-flag-emoji ${className}`}
        style={{
          fontSize: `${size}px`,
          lineHeight: 1,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          ...style,
        }}
        role="img"
        aria-label={code}
      >
        {flag || "🌐"}
      </span>
    );
  }

  return (
    <span
      className={`country-flag-img-wrap ${className}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: `${width}px`,
        height: `${size}px`,
        borderRadius: "3px",
        overflow: "hidden",
        boxShadow: "0 1px 3px rgba(0, 0, 0, 0.25)",
        border: "1px solid rgba(255, 255, 255, 0.15)",
        flexShrink: 0,
        verticalAlign: "middle",
        background: "rgba(255, 255, 255, 0.05)",
        ...style,
      }}
    >
      <img
        src={`https://flagcdn.com/w40/${cCode}.png`}
        srcSet={`https://flagcdn.com/w80/${cCode}.png 2x`}
        alt={`${code} flag`}
        loading="lazy"
        onError={() => setImgFailed(true)}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          display: "block",
        }}
      />
    </span>
  );
};
