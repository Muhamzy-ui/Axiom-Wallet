import React, { useState } from 'react';
import { Shield, Copy, Check, Lock, ChevronDown, LayoutDashboard, Wallet } from 'lucide-react';
import { copyToClipboard } from '../../services/clipboard';

interface HeaderProps {
  walletAddress: string;
  onLock: () => void;
  isAdminView: boolean;
  onToggleAdmin: () => void;
  totalNetWorth: string;
}

export const Header: React.FC<HeaderProps> = ({
  walletAddress,
  onLock,
  isAdminView,
  onToggleAdmin,
  totalNetWorth,
}) => {
  const [copied, setCopied] = useState(false);

  const copyAddress = () => {
    if (!walletAddress) return;
    copyToClipboard(walletAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shortAddress = walletAddress
    ? `${walletAddress.slice(0, 4)}...${walletAddress.slice(-4)}`
    : 'Not Connected';

  return (
    <header className="header-container" style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0.85rem 1.5rem',
      background: 'rgba(9, 10, 16, 0.9)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      borderBottom: '1px solid rgba(255, 255, 255, 0.07)',
      position: 'sticky',
      top: 0,
      zIndex: 100,
    }}>
      {/* Brand Logo & Name */}
      <div
        style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}
        onClick={() => isAdminView && onToggleAdmin()}
      >
        <div style={{
          width: '36px',
          height: '36px',
          borderRadius: '10px',
          background: '#7C3AED',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 2px 10px rgba(124, 58, 237, 0.35)',
          flexShrink: 0,
        }}>
          <Shield size={18} color="#FFFFFF" />
        </div>
        <div>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#FFFFFF', margin: 0, lineHeight: 1.1 }}>
            Axiom
          </h2>
          <span className="header-brand-sub" style={{ fontSize: '0.68rem', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
            Phantom Meme Terminal
          </span>
        </div>
      </div>

      {/* Center Network Badge */}
      <div className="header-network-badge" style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.45rem',
        padding: '0.4rem 0.85rem',
        background: '#13121F',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '9999px',
        fontSize: '0.78rem',
        fontWeight: 600,
        color: '#F1F5F9',
        flexShrink: 0,
      }}>
        <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#10B981', boxShadow: '0 0 6px #10B981' }} />
        <span className="header-network-text">Solana</span>
        <ChevronDown size={13} color="#94A3B8" className="header-network-text" />
      </div>

      {/* Right Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        {/* Wallet Address Pill with Copy */}
        {walletAddress && (
          <button
            onClick={copyAddress}
            title="Click to copy full address"
            style={{
              padding: '0.4rem 0.75rem',
              fontSize: '0.78rem',
              background: '#13121F',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '9999px',
              color: '#F1F5F9',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              cursor: 'pointer',
              fontWeight: 600,
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
              e.currentTarget.style.background = '#191828';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
              e.currentTarget.style.background = '#13121F';
            }}
          >
            {copied ? <Check size={13} color="#10B981" /> : <Copy size={13} color="#94A3B8" />}
            <span style={{ fontFamily: 'monospace' }}>{copied ? 'Copied!' : shortAddress}</span>
          </button>
        )}


        {/* Lock Wallet Button */}
        {walletAddress && !isAdminView && (
          <button
            onClick={onLock}
            title="Lock Wallet"
            style={{
              width: '34px',
              height: '34px',
              background: '#13121F',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '50%',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
              e.currentTarget.style.background = '#191828';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
              e.currentTarget.style.background = '#13121F';
            }}
          >
            <Lock size={14} color="#94A3B8" />
          </button>
        )}
      </div>
    </header>
  );
};
