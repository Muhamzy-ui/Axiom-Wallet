import React, { useState, useMemo, useEffect } from "react";
import { Search, X, Check, Globe, Sparkles } from "lucide-react";
import { COUNTRIES, CountryInfo, searchCountries } from "../../constants/countries";

interface CountrySelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (country: CountryInfo) => void;
  selectedCode?: string;
  title?: string;
}

export const CountrySelectModal: React.FC<CountrySelectModalProps> = ({
  isOpen,
  onClose,
  onSelect,
  selectedCode = "NG",
  title = "Select Country & Currency",
}) => {
  const [search, setSearch] = useState("");
  const [filterRegion, setFilterRegion] = useState<"ALL" | "POPULAR" | "AFRICA" | "AMERICAS" | "EUROPE" | "ASIA">("POPULAR");

  useEffect(() => {
    if (isOpen) {
      setSearch("");
    }
  }, [isOpen]);

  const filteredCountries = useMemo(() => {
    if (search.trim()) {
      return searchCountries(search);
    }

    if (filterRegion === "POPULAR") {
      return COUNTRIES.filter((c) => c.popular);
    }
    if (filterRegion === "AFRICA") {
      return COUNTRIES.filter((c) =>
        ["NG", "GH", "KE", "ZA", "EG", "DZ", "MA", "ET", "RW", "UG", "TZ", "CM", "CI", "SN", "ZM", "ZW", "AO", "BW", "CD", "CG", "GA", "GM", "GN", "LR", "MW", "ML", "MR", "MU", "MZ", "NA", "NE", "SL", "SO", "SD", "SZ", "TG"].includes(c.code)
      );
    }
    if (filterRegion === "AMERICAS") {
      return COUNTRIES.filter((c) =>
        ["US", "CA", "BR", "MX", "AR", "CO", "CL", "PE", "VE", "EC", "GT", "CR", "PA", "DO", "JM", "TT", "BS", "BB", "BZ", "BO", "CU", "GY", "HT", "HN", "NI", "PY", "SV", "UY"].includes(c.code)
      );
    }
    if (filterRegion === "EUROPE") {
      return COUNTRIES.filter((c) =>
        ["GB", "EU", "DE", "FR", "IT", "ES", "NL", "CH", "SE", "NO", "DK", "FI", "IE", "PL", "PT", "AT", "BE", "CZ", "GR", "RO", "HU", "UA", "TR", "RU", "IS", "LU", "MC", "ME", "RS", "SK", "SI", "EE", "LV", "LT", "BG", "HR", "CY", "AL", "AD", "BA", "BY", "MD"].includes(c.code)
      );
    }
    if (filterRegion === "ASIA") {
      return COUNTRIES.filter((c) =>
        ["AE", "IN", "PH", "JP", "CN", "SG", "KR", "ID", "MY", "VN", "TH", "PK", "BD", "SA", "QA", "KW", "BH", "OM", "IL", "HK", "TW", "KZ", "UZ", "LK", "NP", "MM", "KH", "LA", "MN", "AF", "AM", "AZ", "GE", "IQ", "IR", "JO", "KG", "LB", "MV"].includes(c.code)
      );
    }

    return COUNTRIES;
  }, [search, filterRegion]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100000,
        background: "rgba(5, 6, 12, 0.82)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
        animation: "modalFadeIn 0.2s ease-out",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          background: "var(--card-bg, #13131F)",
          border: "1px solid rgba(255, 255, 255, 0.12)",
          borderRadius: 20,
          width: "100%",
          maxWidth: 480,
          maxHeight: "88vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 24px 64px rgba(0, 0, 0, 0.75), 0 0 0 1px rgba(124, 58, 237, 0.15)",
          overflow: "hidden",
        }}
      >
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
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: "rgba(124, 58, 237, 0.18)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#C4B5FD",
              }}
            >
              <Globe size={18} />
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: "var(--text-primary, #fff)" }}>
                {title}
              </div>
              <div style={{ fontSize: 11.5, color: "var(--text-muted, #94A3B8)", marginTop: 1 }}>
                Select your local region and fiat currency
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "rgba(255, 255, 255, 0.06)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "50%",
              width: 32,
              height: 32,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--text-muted, #94A3B8)",
              cursor: "pointer",
            }}
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Search Input Box */}
        <div style={{ padding: "14px 20px 8px" }}>
          <div
            style={{
              position: "relative",
              display: "flex",
              alignItems: "center",
              background: "rgba(255, 255, 255, 0.05)",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              borderRadius: 12,
              padding: "0 12px",
            }}
          >
            <Search size={16} color="#94A3B8" style={{ flexShrink: 0, marginRight: 8 }} />
            <input
              type="text"
              placeholder="Search country, currency or code (e.g. Nigeria, NGN, USD, UK)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
              style={{
                width: "100%",
                height: 42,
                background: "transparent",
                border: "none",
                outline: "none",
                color: "var(--text-primary, #fff)",
                fontSize: 13.5,
                fontWeight: 500,
                fontFamily: "inherit",
              }}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#94A3B8",
                  cursor: "pointer",
                  padding: 4,
                }}
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Region Filter Chips */}
        {!search.trim() && (
          <div
            style={{
              display: "flex",
              gap: 6,
              padding: "0 20px 10px",
              overflowX: "auto",
              scrollbarWidth: "none",
            }}
          >
            {[
              { id: "POPULAR", label: "Popular", icon: Sparkles },
              { id: "ALL", label: "All (190+)" },
              { id: "AFRICA", label: "Africa" },
              { id: "AMERICAS", label: "Americas" },
              { id: "EUROPE", label: "Europe" },
              { id: "ASIA", label: "Asia & ME" },
            ].map((tab) => {
              const isActive = filterRegion === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFilterRegion(tab.id as any)}
                  style={{
                    padding: "5px 11px",
                    borderRadius: 20,
                    fontSize: 11.5,
                    fontWeight: 700,
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                    border: isActive
                      ? "1px solid var(--violet, #7C3AED)"
                      : "1px solid rgba(255, 255, 255, 0.08)",
                    background: isActive
                      ? "rgba(124, 58, 237, 0.22)"
                      : "rgba(255, 255, 255, 0.04)",
                    color: isActive ? "#C4B5FD" : "var(--text-muted, #94A3B8)",
                    transition: "all 0.15s ease",
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  {tab.icon && <tab.icon size={11} />}
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Countries Scrollable List */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "4px 12px 14px",
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}
        >
          {filteredCountries.length === 0 ? (
            <div style={{ padding: "32px 16px", textAlign: "center", color: "var(--text-muted, #94A3B8)" }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>🔍</div>
              <div style={{ fontSize: 14, fontWeight: 700 }}>No countries found</div>
              <div style={{ fontSize: 12, marginTop: 4 }}>Try searching with a different name or currency code</div>
            </div>
          ) : (
            filteredCountries.map((c) => {
              const isSelected = selectedCode.toUpperCase() === c.code.toUpperCase();
              return (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => {
                    onSelect(c);
                    onClose();
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "10px 14px",
                    borderRadius: 12,
                    border: isSelected
                      ? "1px solid rgba(124, 58, 237, 0.45)"
                      : "1px solid transparent",
                    background: isSelected
                      ? "rgba(124, 58, 237, 0.18)"
                      : "transparent",
                    color: "var(--text-primary, #fff)",
                    textAlign: "left",
                    cursor: "pointer",
                    transition: "background 0.12s ease",
                    width: "100%",
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.background = "transparent";
                    }
                  }}
                >
                  {/* Flag Emoji */}
                  <span style={{ fontSize: 24, lineHeight: 1, flexShrink: 0 }}>{c.flag}</span>

                  {/* Country Name & Currency Tag */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 13.5, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {c.name}
                      </span>
                      {c.popular && (
                        <span
                          style={{
                            fontSize: 9.5,
                            fontWeight: 800,
                            padding: "1px 5px",
                            borderRadius: 6,
                            background: "rgba(16, 185, 129, 0.15)",
                            color: "#10B981",
                            border: "1px solid rgba(16, 185, 129, 0.3)",
                          }}
                        >
                          HOT
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text-muted, #94A3B8)", marginTop: 2, display: "flex", gap: 8, alignItems: "center" }}>
                      <span style={{ fontWeight: 600, color: "#C4B5FD" }}>{c.currency} ({c.currencySymbol})</span>
                      <span>·</span>
                      <span>1 USD ≈ {c.rateToUsd >= 100 ? c.rateToUsd.toLocaleString() : c.rateToUsd} {c.currency}</span>
                    </div>
                  </div>

                  {/* Selected Indicator */}
                  {isSelected && (
                    <div
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: "50%",
                        background: "var(--violet, #7C3AED)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#fff",
                        flexShrink: 0,
                      }}
                    >
                      <Check size={13} strokeWidth={3} />
                    </div>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
