import React, { useState, useMemo } from 'react';
import {
  ArrowDown, ArrowUp, ArrowLeftRight, TrendingUp, TrendingDown,
  ChevronDown, Zap, Search, Copy, Check, Sparkles, Shield, Flame, Activity, ExternalLink
} from 'lucide-react';
import { WalletBalance, MemeToken } from '../../types';
import { copyToClipboard } from '../../services/clipboard';

interface PortfolioViewProps {
  totalNetWorth: string;
  balances: WalletBalance[];
  tokens: MemeToken[];
  onOpenDeposit: () => void;
  onOpenWithdraw: () => void;
  onSelectTokenForTrading: (token: MemeToken) => void;
  onSwitchToSwap: () => void;
  walletAddress?: string;
  onFastFaucet?: (currency: string, amount: number) => Promise<void>;
}

// Crisp Vector Inlined Icons
const SolanaIcon: React.FC = () => (
  <svg width="22" height="22" viewBox="0 0 397 311" fill="none">
    <path d="M64.6 237.9c2.4-2.4 5.7-3.8 9.2-3.8h313.7c5.8 0 8.7 7 4.6 11.1l-62.7 62.7c-2.4 2.4-5.7 3.8-9.2 3.8H6.5c-5.8 0-8.7-7-4.6-11.1l62.7-62.7z" fill="url(#sol_g1)"/>
    <path d="M64.6 3.8C67 1.4 70.3 0 73.8 0h313.7c5.8 0 8.7 7 4.6 11.1l-62.7 62.7c-2.4 2.4-5.7 3.8-9.2 3.8H6.5c-5.8 0-8.7-7-4.6-11.1L64.6 3.8z" fill="url(#sol_g2)"/>
    <path d="M333.1 120.1c-2.4-2.4-5.7-3.8-9.2-3.8H10.2c-5.8 0-8.7 7-4.6 11.1l62.7 62.7c2.4 2.4 5.7 3.8 9.2 3.8h313.7c5.8 0 8.7-7 4.6-11.1l-62.7-62.7z" fill="url(#sol_g3)"/>
    <defs>
      <linearGradient id="sol_g1" x1="365.6" y1="341.2" x2="16.5" y2="242.4" gradientUnits="userSpaceOnUse"><stop stopColor="#00FFA3"/><stop offset="1" stopColor="#DC1FFF"/></linearGradient>
      <linearGradient id="sol_g2" x1="365.6" y1="107.1" x2="16.5" y2="8.3" gradientUnits="userSpaceOnUse"><stop stopColor="#00FFA3"/><stop offset="1" stopColor="#DC1FFF"/></linearGradient>
      <linearGradient id="sol_g3" x1="35.6" y1="120.4" x2="384.7" y2="219.2" gradientUnits="userSpaceOnUse"><stop stopColor="#00FFA3"/><stop offset="1" stopColor="#DC1FFF"/></linearGradient>
    </defs>
  </svg>
);

const EthereumIcon: React.FC = () => (
  <svg width="20" height="20" viewBox="0 0 256 417" fill="none">
    <path d="M127.961 0l-2.795 9.5v275.668l2.795 2.79 127.962-75.638z" fill="#8B5CF6"/>
    <path d="M127.962 0L0 212.32l127.962 75.638V0z" fill="#6B7280"/>
    <path d="M127.961 312.187l-1.571 1.915v99.35l1.571 4.58 128.038-180.207z" fill="#8B5CF6"/>
    <path d="M127.962 418.032V312.187L0 237.825z" fill="#4B5563"/>
    <path d="M127.961 287.958l127.96-75.637-127.96-58.162z" fill="#374151"/>
    <path d="M0 212.32l127.96 75.638v-133.8z" fill="#8B5CF6"/>
  </svg>
);

const TetherIcon: React.FC = () => (
  <svg width="22" height="22" viewBox="0 0 256 256" fill="none">
    <circle cx="128" cy="128" r="128" fill="#10B981"/>
    <path d="M141.5 130.5c-0.8 0.1-2.4 0.2-4.5 0.3-6.6 0.3-17.5 0.3-24.1 0-2-.1-3.6-0.2-4.4-0.3v-19.4h33v19.4zm-16.5-57c26.2 0 45 4.8 45 11.2s-18.8 11.2-45 11.2-45-4.8-45-11.2 18.8-11.2 45-11.2zm38.8 46.8c-7.2 4.1-21.7 6.8-38.8 6.8s-31.6-2.7-38.8-6.8v-11c9.4 4.5 24.3 7.3 41.3 7.3s31.9-2.8 41.3-7.3v11zm-22.3 19.9v57h-33v-57c-26.6-1.5-46.8-9.1-46.8-18.2 0-10.4 26.3-18.9 59.8-18.9s59.8 8.5 59.8 18.9c0 9.1-20.2 16.7-46.8 18.2z" fill="#FFFFFF"/>
  </svg>
);

const AxiomIcon: React.FC = () => (
  <div style={{
    width: '100%',
    height: '100%',
    background: '#7C3AED',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '50%',
  }}>
    <Shield size={18} color="#FFFFFF" />
  </div>
);

const PepeIcon: React.FC = () => (
  <div style={{
    width: '100%',
    height: '100%',
    background: '#10B981',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '50%',
  }}>
    <Flame size={18} color="#FFFFFF" />
  </div>
);

// Clean 7-Day Sparkline
const Sparkline: React.FC<{ isPositive: boolean; seed: string }> = ({ isPositive }) => {
  const color = isPositive ? '#10B981' : '#F43F5E';
  const points = isPositive
    ? [17, 14, 15, 11, 13, 9, 10, 5, 7, 3]
    : [3, 6, 5, 10, 8, 13, 11, 16, 14, 18];
  
  const width = 64;
  const step = width / (points.length - 1);
  const pathD = points.reduce((acc, y, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${(i * step).toFixed(1)} ${y}`, '');

  return (
    <svg width="64" height="22" viewBox="0 0 64 22" style={{ overflow: 'visible', flexShrink: 0 }}>
      <path
        d={pathD}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

export const PortfolioView: React.FC<PortfolioViewProps> = ({
  totalNetWorth,
  balances,
  tokens,
  onOpenDeposit,
  onOpenWithdraw,
  onSelectTokenForTrading,
  onSwitchToSwap,
  walletAddress,
  onFastFaucet,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<'all' | 'meme' | 'core'>('all');
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [faucetLoading, setFaucetLoading] = useState(false);
  const [faucetNotice, setFaucetNotice] = useState<string | null>(null);

  const numNetWorth = parseFloat(totalNetWorth) || 0;

  const shortAddr = walletAddress
    ? `${walletAddress.slice(0, 4)}...${walletAddress.slice(-4)}`
    : 'AxEP...R5oJ';

  const handleCopyAddress = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (walletAddress) {
      copyToClipboard(walletAddress);
      setCopiedAddress(true);
      setTimeout(() => setCopiedAddress(false), 2000);
    }
  };

  const handleQuickFaucet = async () => {
    if (!onFastFaucet) return;
    try {
      setFaucetLoading(true);
      await onFastFaucet('SOL', 2.0);
      setFaucetNotice('Successfully added +2.0 SOL testnet funds');
      setTimeout(() => setFaucetNotice(null), 3500);
    } catch (err: any) {
      alert(err.message || 'Faucet error');
    } finally {
      setFaucetLoading(false);
    }
  };

  const renderTokenIcon = (curr: string) => {
    const c = curr.toUpperCase();
    if (c === 'SOL') return <SolanaIcon />;
    if (c === 'ETH') return <EthereumIcon />;
    if (c === 'USDT') return <TetherIcon />;
    if (c === 'AXIOM') return <AxiomIcon />;
    if (c === 'PEPE2') return <PepeIcon />;
    return (
      <div style={{
        width: '100%',
        height: '100%',
        borderRadius: '50%',
        background: '#7C3AED',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 700,
        fontSize: '0.8rem',
        color: '#FFFFFF'
      }}>
        {c.slice(0, 3)}
      </div>
    );
  };

  // Filtered tokens
  const filteredBalances = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    const commonNames: Record<string, string> = {
      'btc': 'bitcoin',
      'eth': 'ethereum',
      'sol': 'solana',
      'usdt': 'tether usd',
      'usdc': 'usd coin',
      'axiom': 'axiom network',
      'pepe2': 'pepe 2.0',
    };

    return balances.filter(b => {
      const curr = b.currency.toLowerCase();
      const matchedToken = tokens.find(t => t.symbol.toUpperCase() === b.currency.toUpperCase());
      const tokenName = (matchedToken?.name || '').toLowerCase();
      const commonName = commonNames[curr] || '';
      const matchQuery = !q || curr.includes(q) || tokenName.includes(q) || commonName.includes(q) || String(b.total_amount || b.available_amount || '').includes(q) || String(b.usd_value || '').includes(q);

      const isMeme = tokens.some(t => t.symbol.toUpperCase() === b.currency.toUpperCase());

      if (filterCategory === 'meme' && !isMeme) return false;
      if (filterCategory === 'core' && isMeme) return false;
      return matchQuery;
    });
  }, [balances, tokens, searchQuery, filterCategory]);

  // Top gainer token for spotlight
  const topGainer = useMemo(() => {
    if (!tokens || tokens.length === 0) return null;
    return [...tokens].sort((a, b) => parseFloat(b.change_24h) - parseFloat(a.change_24h))[0];
  }, [tokens]);

  return (
    <div style={{ width: '100%', margin: '0 auto' }}>
      {/* Toast Notification */}
      {faucetNotice && (
        <div style={{
          position: 'fixed',
          top: '24px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: '#10B981',
          color: '#ffffff',
          padding: '0.6rem 1.25rem',
          borderRadius: '9999px',
          fontWeight: 600,
          fontSize: '0.85rem',
          boxShadow: '0 8px 20px rgba(16, 185, 129, 0.3)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
        }}>
          <Sparkles size={16} />
          <span>{faucetNotice}</span>
        </div>
      )}

      {/* Top Dashboard Grid: Hero Balance (Left) + Market Spotlight (Right) */}
      <div className="dashboard-grid">
        {/* Card 1: Hero Net Worth & Tactical Actions */}
        <div style={{
          background: '#13121F',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '24px',
          padding: '1.75rem',
          boxShadow: '0 12px 36px rgba(0, 0, 0, 0.4)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}>
          <div>
            {/* Account Info Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '1.5rem',
            }}>
              <div
                onClick={handleCopyAddress}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.6rem',
                  cursor: 'pointer',
                  padding: '0.35rem 0.65rem 0.35rem 0.35rem',
                  borderRadius: '9999px',
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                }}
                title="Click to copy address"
              >
                <div style={{
                  width: '26px',
                  height: '26px',
                  borderRadius: '50%',
                  background: '#7C3AED',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  color: '#FFFFFF',
                }}>
                  A1
                </div>
                <span style={{ fontSize: '0.88rem', fontWeight: 600, color: '#FFFFFF' }}>
                  Account 1
                </span>
                <ChevronDown size={14} color="#94A3B8" />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#10B981' }} />
                <button
                  onClick={handleCopyAddress}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#94A3B8',
                    fontFamily: 'monospace',
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                  }}
                >
                  {copiedAddress ? <span style={{ color: '#10B981' }}>Copied!</span> : shortAddr}
                  {!copiedAddress && <Copy size={13} />}
                </button>
              </div>
            </div>

            {/* Total Balance Amount */}
            <div style={{ marginBottom: '1.5rem' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Total Net Worth
              </span>
              <div style={{
                fontSize: '2.75rem',
                fontWeight: 900,
                letterSpacing: '-0.03em',
                lineHeight: 1.1,
                color: '#FFFFFF',
                fontFamily: 'Outfit, sans-serif',
                fontVariantNumeric: 'tabular-nums',
                marginTop: '0.25rem',
                marginBottom: '0.65rem',
              }}>
                ${numNetWorth.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>

              {/* PnL Status Badge */}
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                background: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.2)',
                padding: '0.25rem 0.75rem',
                borderRadius: '9999px',
                fontSize: '0.82rem',
                fontWeight: 600,
                color: '#10B981',
              }}>
                <span>+$342.80</span>
                <span style={{ opacity: 0.5 }}>•</span>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
                  <TrendingUp size={14} />
                  <span>+2.84% (24h)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Tactical Action Buttons Row */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '0.75rem',
            paddingTop: '1rem',
            borderTop: '1px solid rgba(255, 255, 255, 0.06)',
          }}>
            {/* Deposit */}
            <button
              onClick={onOpenDeposit}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.45rem',
                background: '#7C3AED',
                border: 'none',
                borderRadius: '16px',
                padding: '0.85rem 0.5rem',
                color: '#FFFFFF',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.82rem',
                transition: 'all 0.15s ease',
                boxShadow: '0 4px 14px rgba(124, 58, 237, 0.35)',
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#6D28D9'}
              onMouseLeave={(e) => e.currentTarget.style.background = '#7C3AED'}
            >
              <ArrowDown size={18} strokeWidth={2.5} />
              <span>Deposit</span>
            </button>

            {/* Send */}
            <button
              onClick={onOpenWithdraw}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.45rem',
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '16px',
                padding: '0.85rem 0.5rem',
                color: '#F1F5F9',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.82rem',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#191828';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.18)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
              }}
            >
              <ArrowUp size={18} strokeWidth={2.5} />
              <span>Send</span>
            </button>

            {/* Swap */}
            <button
              onClick={onSwitchToSwap}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.45rem',
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '16px',
                padding: '0.85rem 0.5rem',
                color: '#F1F5F9',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.82rem',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#191828';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.18)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
              }}
            >
              <ArrowLeftRight size={18} strokeWidth={2.5} />
              <span>Swap</span>
            </button>

            {/* +2 SOL Faucet */}
            <button
              onClick={handleQuickFaucet}
              disabled={faucetLoading}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.45rem',
                background: 'rgba(16, 185, 129, 0.08)',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                borderRadius: '16px',
                padding: '0.85rem 0.5rem',
                color: '#10B981',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.82rem',
                transition: 'all 0.15s ease',
                opacity: faucetLoading ? 0.6 : 1,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(16, 185, 129, 0.15)';
                e.currentTarget.style.borderColor = '#10B981';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(16, 185, 129, 0.08)';
                e.currentTarget.style.borderColor = 'rgba(16, 185, 129, 0.25)';
              }}
            >
              <Zap size={18} strokeWidth={2.5} />
              <span>{faucetLoading ? 'Adding...' : '+2 SOL'}</span>
            </button>
          </div>
        </div>

        {/* Card 2: Market Spotlight & Trading Alpha */}
        <div style={{
          background: '#13121F',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '24px',
          padding: '1.75rem',
          boxShadow: '0 12px 36px rgba(0, 0, 0, 0.4)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <Flame size={18} color="#F59E0B" />
                <span style={{ fontSize: '0.92rem', fontWeight: 700, color: '#FFFFFF' }}>
                  Market Spotlight
                </span>
              </div>
              <span style={{
                fontSize: '0.72rem',
                fontWeight: 700,
                background: 'rgba(16, 185, 129, 0.12)',
                color: '#10B981',
                padding: '0.2rem 0.55rem',
                borderRadius: '9999px',
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem',
              }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10B981' }} />
                Solana Live
              </span>
            </div>

            {/* Featured Meme Highlight */}
            {topGainer && (
              <div style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.07)',
                borderRadius: '16px',
                padding: '1rem',
                marginBottom: '1.25rem',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', overflow: 'hidden' }}>
                      {renderTokenIcon(topGainer.symbol)}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#FFFFFF' }}>
                        {topGainer.name}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#94A3B8' }}>
                        ${topGainer.symbol}
                      </div>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#FFFFFF' }}>
                      ${parseFloat(topGainer.current_price_usd).toFixed(6)}
                    </div>
                    <div style={{
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      color: parseFloat(topGainer.change_24h) >= 0 ? '#10B981' : '#F43F5E',
                    }}>
                      +{topGainer.change_24h}%
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem', color: '#94A3B8', marginTop: '0.75rem', paddingTop: '0.5rem', borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}>
                  <span>24h Vol: $1.24M</span>
                  <span>Solana Memes</span>
                </div>
              </div>
            )}

            {/* Institutional Network Highlights */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: '12px', padding: '0.75rem' }}>
                <div style={{ fontSize: '0.72rem', color: '#94A3B8', marginBottom: '0.2rem' }}>Solana TPS</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#FFFFFF' }}>2,845 /s</div>
              </div>
              <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: '12px', padding: '0.75rem' }}>
                <div style={{ fontSize: '0.72rem', color: '#94A3B8', marginBottom: '0.2rem' }}>Network Fee</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#10B981' }}>&lt; $0.0008</div>
              </div>
            </div>
          </div>

          {/* Quick Trade CTA */}
          <button
            onClick={() => {
              if (topGainer) onSelectTokenForTrading(topGainer);
              else if (tokens.length > 0) onSelectTokenForTrading(tokens[0]);
            }}
            style={{
              width: '100%',
              padding: '0.75rem',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '14px',
              color: '#FFFFFF',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#7C3AED';
              e.currentTarget.style.borderColor = '#7C3AED';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
            }}
          >
            <Activity size={16} />
            <span>Launch Meme Terminal</span>
          </button>
        </div>
      </div>

      {/* Main Assets & Positions Table Section */}
      <div style={{
        background: '#13121F',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '24px',
        padding: '1.75rem',
        boxShadow: '0 12px 36px rgba(0, 0, 0, 0.4)',
      }}>
        {/* Table Controls: Title, Filter Pills, and Search */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          marginBottom: '1.5rem',
        }}>
          {/* Title & Count */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.02em', margin: 0 }}>
              Assets & Holdings
            </h3>
            <span style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              background: 'rgba(255, 255, 255, 0.06)',
              color: '#94A3B8',
              padding: '0.2rem 0.55rem',
              borderRadius: '9999px',
            }}>
              {filteredBalances.length}
            </span>
          </div>

          {/* Filters & Search */}
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.75rem' }}>
            {/* Filter Pills */}
            <div style={{
              display: 'inline-flex',
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.07)',
              borderRadius: '9999px',
              padding: '0.25rem',
              gap: '0.25rem',
            }}>
              {[
                { id: 'all', label: 'All' },
                { id: 'meme', label: 'Meme Coins' },
                { id: 'core', label: 'Core' },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFilterCategory(f.id as any)}
                  style={{
                    padding: '0.35rem 0.75rem',
                    borderRadius: '9999px',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    background: filterCategory === f.id ? '#7C3AED' : 'transparent',
                    border: 'none',
                    color: filterCategory === f.id ? '#FFFFFF' : '#94A3B8',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: '#0D0D15',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '12px',
              padding: '0.4rem 0.85rem',
              width: '220px',
            }}>
              <Search size={15} color="#94A3B8" />
              <input
                type="text"
                placeholder="Search asset..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  background: 'transparent !important',
                  border: 'none !important',
                  boxShadow: 'none !important',
                  color: '#FFFFFF !important',
                  fontSize: '0.82rem',
                  width: '100%',
                  padding: 0,
                  outline: 'none',
                }}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', fontSize: '0.75rem' }}
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Table Rows */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {filteredBalances.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#64748B', fontSize: '0.9rem' }}>
              No assets found matching "{searchQuery}"
            </div>
          ) : (
            filteredBalances.map((b) => {
              const currUpper = b.currency.toUpperCase();
              const tokenMatch = tokens.find((t) => t.symbol.toUpperCase() === currUpper);
              const isMeme = !!tokenMatch;
              const changeNum = parseFloat(b.change_24h);
              const isPos = changeNum >= 0;

              let fullName = currUpper;
              if (currUpper === 'SOL') fullName = 'Solana';
              else if (currUpper === 'ETH') fullName = 'Ethereum';
              else if (currUpper === 'USDT') fullName = 'Tether USD';
              else if (tokenMatch) fullName = tokenMatch.name;

              const availableNum = parseFloat(b.available_amount);
              const usdValNum = parseFloat(b.usd_value);

              return (
                <div
                  key={b.currency}
                  onClick={() => {
                    if (isMeme && tokenMatch) {
                      onSelectTokenForTrading(tokenMatch);
                    } else {
                      onOpenDeposit();
                    }
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.95rem 1.15rem',
                    background: 'rgba(255, 255, 255, 0.02)',
                    borderRadius: '16px',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#191828';
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)';
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.05)';
                  }}
                >
                  {/* Left: Token Icon + Name + Category Tag */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flex: 1.2 }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      background: '#0D0D15',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      flexShrink: 0,
                    }}>
                      {renderTokenIcon(currUpper)}
                    </div>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#FFFFFF' }}>
                          {fullName}
                        </span>
                        {isMeme ? (
                          <span style={{
                            fontSize: '0.65rem',
                            background: 'rgba(124, 58, 237, 0.15)',
                            color: '#A78BFA',
                            border: '1px solid rgba(124, 58, 237, 0.3)',
                            padding: '0.1rem 0.4rem',
                            borderRadius: '4px',
                            fontWeight: 700,
                          }}>
                            MEME
                          </span>
                        ) : (
                          <span style={{
                            fontSize: '0.65rem',
                            background: 'rgba(255, 255, 255, 0.05)',
                            color: '#94A3B8',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                            padding: '0.1rem 0.4rem',
                            borderRadius: '4px',
                            fontWeight: 600,
                          }}>
                            CORE
                          </span>
                        )}
                      </div>

                      <div style={{ fontSize: '0.78rem', color: '#94A3B8', marginTop: '0.15rem' }}>
                        ${currUpper}
                      </div>
                    </div>
                  </div>

                  {/* Column 2: Live Price */}
                  <div style={{ flex: 1, textAlign: 'left', display: 'none' }} className="price-column">
                    <span style={{ fontSize: '0.88rem', fontWeight: 600, color: '#FFFFFF' }}>
                      ${parseFloat(b.price_usd).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}
                    </span>
                  </div>

                  {/* Column 3: 7-Day Sparkline + 24h PnL */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flex: 1, justifyContent: 'center' }}>
                    <Sparkline isPositive={isPos} seed={currUpper} />
                    <span style={{
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      color: isPos ? '#10B981' : '#F43F5E',
                    }}>
                      {isPos ? `+${b.change_24h}%` : `${b.change_24h}%`}
                    </span>
                  </div>

                  {/* Column 4: Holdings & USD Valuation */}
                  <div style={{ textAlign: 'right', flex: 1.2 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.96rem', color: '#FFFFFF', fontVariantNumeric: 'tabular-nums' }}>
                      {usdValNum > 0
                        ? `$${usdValNum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                        : '$0.00'}
                    </div>

                    <div style={{ fontSize: '0.78rem', color: '#94A3B8', marginTop: '0.15rem' }}>
                      {availableNum > 0
                        ? `${availableNum.toLocaleString(undefined, { maximumFractionDigits: 4 })} ${currUpper}`
                        : `0.00 ${currUpper}`}
                    </div>
                  </div>

                  {/* Column 5: Action Button (Trade / Deposit) */}
                  <div style={{ marginLeft: '1rem' }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isMeme && tokenMatch) {
                          onSelectTokenForTrading(tokenMatch);
                        } else {
                          onOpenDeposit();
                        }
                      }}
                      style={{
                        padding: '0.4rem 0.85rem',
                        borderRadius: '9999px',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        background: isMeme ? '#7C3AED' : 'rgba(255, 255, 255, 0.05)',
                        border: isMeme ? 'none' : '1px solid rgba(255, 255, 255, 0.1)',
                        color: '#FFFFFF',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        if (isMeme) e.currentTarget.style.background = '#6D28D9';
                        else e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                      }}
                      onMouseLeave={(e) => {
                        if (isMeme) e.currentTarget.style.background = '#7C3AED';
                        else e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                      }}
                    >
                      {isMeme ? 'Trade' : 'Deposit'}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
