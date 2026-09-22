import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { Zap, AlertCircle, ArrowDownUp } from 'lucide-react';
import { api } from '../../services/api';
import { MemeToken, WalletBalance } from '../../types';

interface QuickOrderProps {
  token: MemeToken;
  walletAddress: string;
  balances: WalletBalance[];
  onTradeSuccess: () => void;
}

export const QuickOrder: React.FC<QuickOrderProps> = ({
  token,
  walletAddress,
  balances,
  onTradeSuccess,
}) => {
  const [side, setSide] = useState<'BUY' | 'SELL'>('BUY');
  const [baseCurrency, setBaseCurrency] = useState<'SOL' | 'ETH' | 'USDT'>('SOL');
  const [amount, setAmount] = useState('0.5');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [txSuccess, setTxSuccess] = useState<string | null>(null);

  const solBal = balances.find((b) => b.currency === baseCurrency);
  const availableBase = solBal ? parseFloat(solBal.available_amount) : 0;

  const tokenBal = balances.find((b) => b.currency === token.symbol);
  const availableTokens = tokenBal ? parseFloat(tokenBal.available_amount) : 0;

  const currentPrice = parseFloat(token.current_price_usd) || 0.001;
  const baseRates: Record<string, number> = { SOL: 145.0, ETH: 2650.0, USDT: 1.0 };
  const baseRate = baseRates[baseCurrency] || 1.0;

  // Calculations
  const numAmount = parseFloat(amount) || 0;
  let estimatedReceive = 0;
  let feeUsd = 0;

  if (side === 'BUY') {
    const grossUsd = numAmount * baseRate;
    feeUsd = grossUsd * 0.01;
    const netUsd = grossUsd - feeUsd;
    estimatedReceive = currentPrice > 0 ? netUsd / currentPrice : 0;
  } else {
    const grossUsd = numAmount * currentPrice;
    feeUsd = grossUsd * 0.01;
    const netUsd = grossUsd - feeUsd;
    estimatedReceive = baseRate > 0 ? netUsd / baseRate : 0;
  }

  const handleQuickPill = (val: string | number) => {
    if (side === 'BUY') {
      if (val === 'MAX') {
        setAmount(availableBase.toFixed(4));
      } else {
        setAmount(val.toString());
      }
    } else {
      // Percentage of tokens
      const pct = typeof val === 'number' ? val : 1.0;
      setAmount((availableTokens * pct).toFixed(2));
    }
  };

  const handleExecute = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setTxSuccess(null);

    if (numAmount <= 0) {
      setError('Enter an amount greater than zero.');
      return;
    }

    if (side === 'BUY' && numAmount > availableBase) {
      setError(`Insufficient ${baseCurrency} balance (${availableBase.toFixed(4)} available). Deposit funds first.`);
      return;
    }

    if (side === 'SELL' && numAmount > availableTokens) {
      setError(`Insufficient $${token.symbol} tokens (${availableTokens.toLocaleString()} available).`);
      return;
    }

    try {
      setLoading(true);
      if (side === 'BUY') {
        const res = await api.buyToken(walletAddress, token.symbol, baseCurrency, amount);
        setTxSuccess(`Bought ${parseFloat(res.tokens_received).toLocaleString(undefined, { maximumFractionDigits: 2 })} $${token.symbol}!`);
        confetti({ particleCount: 60, spread: 70, origin: { y: 0.7 } });
      } else {
        const res = await api.sellToken(walletAddress, token.symbol, baseCurrency, amount);
        setTxSuccess(`Sold for ${parseFloat(res.base_received).toFixed(4)} ${baseCurrency}!`);
      }
      onTradeSuccess();
    } catch (err: any) {
      setError(err.message || 'Trade execution failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
      {/* Buy / Sell Tabs */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        background: 'rgba(0, 0, 0, 0.4)',
        padding: '0.35rem',
        borderRadius: 'var(--radius-full)',
        marginBottom: '1.25rem',
      }}>
        <button
          type="button"
          onClick={() => { setSide('BUY'); setAmount('0.5'); setError(''); }}
          style={{
            padding: '0.65rem',
            borderRadius: 'var(--radius-full)',
            border: 'none',
            background: side === 'BUY' ? 'var(--accent-green)' : 'transparent',
            color: side === 'BUY' ? '#0d0d12' : 'var(--text-secondary)',
            fontWeight: 800,
            fontSize: '0.9rem',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          Buy ${token.symbol}
        </button>

        <button
          type="button"
          onClick={() => { setSide('SELL'); setAmount((availableTokens * 0.5).toFixed(2)); setError(''); }}
          style={{
            padding: '0.65rem',
            borderRadius: 'var(--radius-full)',
            border: 'none',
            background: side === 'SELL' ? 'var(--accent-red)' : 'transparent',
            color: side === 'SELL' ? '#ffffff' : 'var(--text-secondary)',
            fontWeight: 800,
            fontSize: '0.9rem',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          Sell ${token.symbol}
        </button>
      </div>

      {error && (
        <div style={{
          background: 'rgba(255, 77, 109, 0.15)',
          border: '1px solid var(--accent-red)',
          borderRadius: 'var(--radius-md)',
          padding: '0.65rem 0.85rem',
          fontSize: '0.8rem',
          color: 'var(--accent-red)',
          marginBottom: '1rem',
          display: 'flex',
          gap: '0.5rem',
          alignItems: 'center',
        }}>
          <AlertCircle size={16} style={{ flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      )}

      {txSuccess && (
        <div style={{
          background: 'rgba(16, 185, 129, 0.12)',
          border: '1px solid #10B981',
          borderRadius: '12px',
          padding: '0.65rem 0.85rem',
          fontSize: '0.8rem',
          color: '#10B981',
          marginBottom: '1rem',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.4rem',
        }}>
          <Zap size={14} />
          <span>{txSuccess}</span>
        </div>
      )}

      <form onSubmit={handleExecute}>
        {/* Quick Amount Pills */}
        <div style={{ marginBottom: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Quick Order Amount</span>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
              {side === 'BUY' ? `Bal: ${availableBase.toFixed(4)} ${baseCurrency}` : `Bal: ${availableTokens.toLocaleString()} ${token.symbol}`}
            </span>
          </div>

          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
            {side === 'BUY' ? (
              <>
                {['0.1', '0.5', '1.0', '5.0', 'MAX'].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => handleQuickPill(val)}
                    style={{
                      flex: 1,
                      padding: '0.45rem 0.6rem',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-dark)',
                      background: amount === val ? 'rgba(171, 159, 242, 0.25)' : 'rgba(255, 255, 255, 0.05)',
                      color: amount === val ? 'var(--accent-phantom)' : 'var(--text-secondary)',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    {val === 'MAX' ? 'MAX' : `${val} ${baseCurrency}`}
                  </button>
                ))}
              </>
            ) : (
              <>
                {[
                  { label: '25%', val: 0.25 },
                  { label: '50%', val: 0.5 },
                  { label: '75%', val: 0.75 },
                  { label: '100%', val: 1.0 },
                ].map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => handleQuickPill(item.val)}
                    style={{
                      flex: 1,
                      padding: '0.45rem 0.6rem',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-dark)',
                      background: 'rgba(255, 255, 255, 0.05)',
                      color: 'var(--text-secondary)',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    {item.label}
                  </button>
                ))}
              </>
            )}
          </div>
        </div>

        {/* Input Amount Box */}
        <div style={{ marginBottom: '1.25rem' }}>
          <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem' }}>
            {side === 'BUY' ? `Pay Amount (${baseCurrency})` : `Sell Amount ($${token.symbol})`}
          </label>
          <div style={{ position: 'relative' }}>
            <input
              type="number"
              step="any"
              className="axiom-input"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              required
            />
            {side === 'BUY' && (
              <select
                value={baseCurrency}
                onChange={(e) => setBaseCurrency(e.target.value as any)}
                style={{
                  position: 'absolute',
                  right: '8px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'rgba(0, 0, 0, 0.4)',
                  border: '1px solid var(--border-dark)',
                  color: 'var(--accent-phantom)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '0.25rem 0.5rem',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                <option value="SOL">SOL</option>
                <option value="USDT">USDT</option>
                <option value="ETH">ETH</option>
              </select>
            )}
          </div>
        </div>

        {/* Execution Summary Box */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid var(--border-dark)',
          borderRadius: 'var(--radius-md)',
          padding: '0.85rem',
          fontSize: '0.8rem',
          marginBottom: '1.25rem',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
            <span>You Receive</span>
            <span style={{ color: side === 'BUY' ? 'var(--accent-green)' : 'var(--text-primary)', fontWeight: 700 }}>
              {side === 'BUY'
                ? `≈ ${estimatedReceive.toLocaleString(undefined, { maximumFractionDigits: 2 })} $${token.symbol}`
                : `≈ ${estimatedReceive.toFixed(4)} ${baseCurrency}`}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
            <span>Platform Gas & Protocol Fee</span>
            <span>≈ ${feeUsd.toFixed(4)} USD (1.0%)</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
            <span>Execution Speed</span>
            <span style={{ color: '#10B981', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
              <Zap size={13} /> Instant (0s Gas Confirmation)
            </span>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading || token.is_rugged}
          className={`pill-btn ${side === 'BUY' ? 'pill-btn-green' : 'pill-btn-red'}`}
          style={{ width: '100%', padding: '0.9rem', fontSize: '1rem', opacity: token.is_rugged ? 0.5 : 1 }}
        >
          <Zap size={18} />
          <span>
            {token.is_rugged
              ? 'Token Rugged — Trading Halted'
              : loading
              ? 'Matching Instant Trade...'
              : side === 'BUY'
              ? `Instant Buy $${token.symbol}`
              : `Instant Sell $${token.symbol}`}
          </span>
        </button>
      </form>
    </div>
  );
};
