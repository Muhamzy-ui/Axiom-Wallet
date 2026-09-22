import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { ArrowDownUp, Settings, Zap, CheckCircle2, AlertCircle } from 'lucide-react';
import { api } from '../../services/api';
import { WalletBalance, MemeToken } from '../../types';

interface TrustSwapWidgetProps {
  walletAddress: string;
  balances: WalletBalance[];
  tokens: MemeToken[];
  onSwapSuccess: () => void;
}

export const TrustSwapWidget: React.FC<TrustSwapWidgetProps> = ({
  walletAddress,
  balances,
  tokens,
  onSwapSuccess,
}) => {
  const [fromToken, setFromToken] = useState('SOL');
  const [toToken, setToToken] = useState('AXIOM');
  const [fromAmount, setFromAmount] = useState('1.0');
  const [estimatedTo, setEstimatedTo] = useState('0.00');
  const [rate, setRate] = useState('0.00');
  const [slippage, setSlippage] = useState('1.0%');
  const [loadingQuote, setLoadingQuote] = useState(false);
  const [swapping, setSwapping] = useState(false);
  const [error, setError] = useState('');
  const [txSuccess, setTxSuccess] = useState<string | null>(null);

  const availableTokens = ['SOL', 'ETH', 'USDT', ...tokens.map((t) => t.symbol)];

  const fromBal = balances.find((b) => b.currency === fromToken);
  const availableFrom = fromBal ? parseFloat(fromBal.available_amount) : 0;

  useEffect(() => {
    fetchQuote();
  }, [fromToken, toToken, fromAmount]);

  const fetchQuote = async () => {
    if (!fromAmount || parseFloat(fromAmount) <= 0 || fromToken === toToken) {
      setEstimatedTo('0.00');
      return;
    }
    try {
      setLoadingQuote(true);
      const quote = await api.getSwapQuote(fromToken, toToken, fromAmount);
      setEstimatedTo(quote.estimated_to_amount);
      setRate(quote.rate);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingQuote(false);
    }
  };

  const flipTokens = () => {
    const temp = fromToken;
    setFromToken(toToken);
    setToToken(temp);
  };

  const handleExecuteSwap = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setTxSuccess(null);

    const amt = parseFloat(fromAmount);
    if (!amt || amt <= 0) {
      setError('Please enter a valid swap amount.');
      return;
    }

    if (amt > availableFrom) {
      setError(`Insufficient ${fromToken} balance (${availableFrom.toFixed(4)} available).`);
      return;
    }

    try {
      setSwapping(true);
      const res = await api.executeSwap(walletAddress, fromToken, toToken, fromAmount);
      setTxSuccess(`Swapped ${fromAmount} ${fromToken} for ${parseFloat(res.to_amount).toLocaleString(undefined, { maximumFractionDigits: 4 })} ${toToken}!`);
      confetti({ particleCount: 75, spread: 80, origin: { y: 0.6 } });
      onSwapSuccess();
    } catch (err: any) {
      setError(err.message || 'Swap failed.');
    } finally {
      setSwapping(false);
    }
  };

  return (
    <div className="glass-card" style={{ padding: '1.75rem', maxWidth: '480px', margin: '0 auto' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
        <div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Token Swapper</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
            Instant, zero-gas decentralized routing
          </p>
        </div>
        <button
          type="button"
          style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
        >
          <Settings size={18} />
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
          padding: '0.75rem',
          fontSize: '0.82rem',
          color: '#10B981',
          marginBottom: '1rem',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.4rem',
        }}>
          <CheckCircle2 size={16} />
          <span>{txSuccess}</span>
        </div>
      )}

      <form onSubmit={handleExecuteSwap}>
        {/* You Pay Box */}
        <div style={{
          background: 'var(--surface2)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          padding: '1rem',
          marginBottom: '0.5rem',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>You Pay</span>
            <span style={{ fontSize: '0.78rem', color: 'var(--text)' }}>
              Balance: {availableFrom.toFixed(4)} {fromToken}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <input
              type="number"
              step="any"
              className="axiom-input"
              style={{ fontSize: '1.4rem', fontWeight: 800, border: 'none', background: 'transparent', padding: '0', color: 'var(--text)' }}
              value={fromAmount}
              onChange={(e) => setFromAmount(e.target.value)}
              placeholder="0.0"
              required
            />

            <select
              value={fromToken}
              onChange={(e) => setFromToken(e.target.value)}
              className="axiom-input"
              style={{ width: 'auto', padding: '0.5rem 0.75rem', fontWeight: 700, cursor: 'pointer', background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)' }}
            >
              {availableTokens.map((t) => (
                <option key={t} value={t} style={{ background: 'var(--surface)', color: 'var(--text)' }}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', gap: '0.35rem', marginTop: '0.5rem' }}>
            <button
              type="button"
              onClick={() => setFromAmount((availableFrom * 0.5).toFixed(4))}
              style={{ background: 'var(--badge-bg)', border: '1px solid var(--border)', color: 'var(--text)', borderRadius: '4px', padding: '0.2rem 0.5rem', fontSize: '0.72rem', cursor: 'pointer' }}
            >
              50%
            </button>
            <button
              type="button"
              onClick={() => setFromAmount(availableFrom.toFixed(4))}
              style={{ background: 'var(--violet-g)', border: '1px solid var(--border-p)', color: 'var(--violet)', borderRadius: '4px', padding: '0.2rem 0.5rem', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}
            >
              MAX
            </button>
          </div>
        </div>

        {/* Directional Flip Button */}
        <div style={{ display: 'flex', justifyContent: 'center', margin: '-10px 0', position: 'relative', zIndex: 2 }}>
          <button
            type="button"
            onClick={flipTokens}
            title="Switch Token Direction"
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              background: 'var(--surface)',
              border: '2px solid var(--violet)',
              color: 'var(--violet)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 2px 10px rgba(124, 58, 237, 0.25)',
              transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = 'rotate(180deg) scale(1.1)')}
            onMouseLeave={(e) => (e.currentTarget.style.transform = 'rotate(0deg) scale(1.0)')}
          >
            <ArrowDownUp size={16} />
          </button>
        </div>

        {/* You Receive Box */}
        <div style={{
          background: 'var(--surface2)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          padding: '1rem',
          marginTop: '0.5rem',
          marginBottom: '1.25rem',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>You Receive</span>
            <span style={{ fontSize: '0.78rem', color: 'var(--violet)' }}>
              {loadingQuote ? 'Fetching rate...' : `1 ${fromToken} ≈ ${parseFloat(rate).toLocaleString(undefined, { maximumFractionDigits: 4 })} ${toToken}`}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <input
              type="text"
              readOnly
              className="axiom-input"
              style={{ fontSize: '1.4rem', fontWeight: 800, border: 'none', background: 'transparent', padding: '0', color: 'var(--green)' }}
              value={estimatedTo}
            />

            <select
              value={toToken}
              onChange={(e) => setToToken(e.target.value)}
              className="axiom-input"
              style={{ width: 'auto', padding: '0.5rem 0.75rem', fontWeight: 700, cursor: 'pointer', background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)' }}
            >
              {availableTokens.map((t) => (
                <option key={t} value={t} style={{ background: 'var(--surface)', color: 'var(--text)' }}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Swap Details Card */}
        <div style={{
          background: 'var(--surface2)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          padding: '0.85rem',
          fontSize: '0.78rem',
          marginBottom: '1.25rem',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
            <span>Slippage Tolerance</span>
            <span style={{ color: 'var(--violet)', fontWeight: 600 }}>{slippage}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
            <span>Network Routing Fee</span>
            <span>$0.35 USD</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
            <span>Route</span>
            <span style={{ color: 'var(--green)', fontWeight: 600 }}>Axiom Instant Pool</span>
          </div>
        </div>

        {/* Swap Button */}
        <button
          type="submit"
          disabled={swapping || fromToken === toToken}
          className="pill-btn pill-btn-phantom"
          style={{ width: '100%', padding: '0.9rem', fontSize: '1rem' }}
        >
          <Zap size={18} />
          <span>{swapping ? 'Executing Swapper...' : `Swap ${fromToken} → ${toToken}`}</span>
        </button>
      </form>
    </div>
  );
};
