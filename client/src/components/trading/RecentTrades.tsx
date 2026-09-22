import React, { useEffect, useState } from 'react';
import { ExternalLink, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { api } from '../../services/api';
import { Trade } from '../../types';

interface RecentTradesProps {
  tokenSymbol: string;
}

export const RecentTrades: React.FC<RecentTradesProps> = ({ tokenSymbol }) => {
  const [trades, setTrades] = useState<Trade[]>([]);

  useEffect(() => {
    fetchTrades();
    const interval = setInterval(fetchTrades, 6000);
    return () => clearInterval(interval);
  }, [tokenSymbol]);

  const fetchTrades = async () => {
    try {
      const data = await api.getRecentTrades(tokenSymbol);
      setTrades(data);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="glass-card" style={{ padding: '1.25rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <h4 style={{ fontSize: '1rem', fontWeight: 700 }}>Live Trade Stream</h4>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: 'var(--accent-solana)' }}>
          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent-solana)', boxShadow: '0 0 6px var(--accent-solana)' }} />
          <span>Real-time</span>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '260px', overflowY: 'auto' }}>
        {trades.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textAlign: 'center', padding: '1rem 0' }}>
            No trades executed yet. Be the first to buy!
          </p>
        ) : (
          trades.map((t) => {
            const isBuy = t.side === 'BUY';
            const shortAddr = t.user_address
              ? `${t.user_address.slice(0, 4)}...${t.user_address.slice(-3)}`
              : 'Anonymous';

            return (
              <div
                key={t.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.6rem 0.75rem',
                  background: 'rgba(255, 255, 255, 0.02)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-dark)',
                  fontSize: '0.8rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <span
                    style={{
                      padding: '0.2rem 0.45rem',
                      borderRadius: '4px',
                      fontWeight: 800,
                      fontSize: '0.7rem',
                      background: isBuy ? 'var(--accent-green-bg)' : 'var(--accent-red-bg)',
                      color: isBuy ? 'var(--accent-green)' : 'var(--accent-red)',
                    }}
                  >
                    {t.side}
                  </span>
                  <span style={{ color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                    {shortAddr}
                  </span>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                    {parseFloat(t.token_amount).toLocaleString(undefined, { maximumFractionDigits: 1 })} ${t.token_symbol}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    {parseFloat(t.base_amount).toFixed(3)} {t.base_currency} (≈ ${(parseFloat(t.price_usd) * parseFloat(t.token_amount)).toFixed(2)})
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
