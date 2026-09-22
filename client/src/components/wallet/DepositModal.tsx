import React, { useState, useEffect } from 'react';
import { X, Copy, Check, QrCode, Zap, Info } from 'lucide-react';
import { api } from '../../services/api';
import { copyToClipboard } from '../../services/clipboard';

interface DepositModalProps {
  walletAddress: string;
  onClose: () => void;
  onBalanceUpdated: () => void;
}

export const DepositModal: React.FC<DepositModalProps> = ({
  walletAddress,
  onClose,
  onBalanceUpdated,
}) => {
  const [currency, setCurrency] = useState<'SOL' | 'ETH' | 'USDT'>('SOL');
  const [depositAddress, setDepositAddress] = useState('');
  const [copied, setCopied] = useState(false);
  const [faucetLoading, setFaucetLoading] = useState(false);
  const [faucetSuccess, setFaucetSuccess] = useState(false);

  useEffect(() => {
    fetchDepositAddress();
  }, [currency]);

  const fetchDepositAddress = async () => {
    try {
      const data = await api.getDepositAddress(walletAddress, currency);
      setDepositAddress(data.deposit_address);
    } catch (err) {
      console.error(err);
    }
  };

  const copyAddress = () => {
    copyToClipboard(depositAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleTestFaucet = async () => {
    try {
      setFaucetLoading(true);
      const amount = currency === 'SOL' ? 2.0 : currency === 'ETH' ? 0.5 : 500.0;
      await api.faucetDeposit(walletAddress, currency, amount);
      setFaucetSuccess(true);
      onBalanceUpdated();
      setTimeout(() => setFaucetSuccess(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setFaucetLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ padding: '1.75rem', maxWidth: '440px' }}>
        {/* Top Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Deposit Crypto</h3>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Currency Tabs */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '0.5rem',
          background: 'rgba(0, 0, 0, 0.4)',
          padding: '0.35rem',
          borderRadius: 'var(--radius-md)',
          marginBottom: '1.25rem',
        }}>
          {(['SOL', 'ETH', 'USDT'] as const).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCurrency(c)}
              style={{
                padding: '0.6rem',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                background: currency === c ? 'rgba(171, 159, 242, 0.2)' : 'transparent',
                color: currency === c ? 'var(--accent-phantom)' : 'var(--text-secondary)',
                fontWeight: 700,
                fontSize: '0.85rem',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              {c}
            </button>
          ))}
        </div>

        {/* QR Code Container */}
        <div style={{
          background: '#ffffff',
          padding: '1.25rem',
          borderRadius: 'var(--radius-md)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 1.25rem',
          width: '180px',
          height: '180px',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)',
        }}>
          {/* High contrast QR code mock vector */}
          <svg viewBox="0 0 100 100" width="150" height="150">
            <rect width="100" height="100" fill="white" />
            <rect x="10" y="10" width="30" height="30" fill="#0d0d12" rx="4" />
            <rect x="16" y="16" width="18" height="18" fill="white" rx="2" />
            <rect x="20" y="20" width="10" height="10" fill="#0d0d12" />
            
            <rect x="60" y="10" width="30" height="30" fill="#0d0d12" rx="4" />
            <rect x="66" y="16" width="18" height="18" fill="white" rx="2" />
            <rect x="70" y="20" width="10" height="10" fill="#0d0d12" />

            <rect x="10" y="60" width="30" height="30" fill="#0d0d12" rx="4" />
            <rect x="16" y="66" width="18" height="18" fill="white" rx="2" />
            <rect x="20" y="70" width="10" height="10" fill="#0d0d12" />

            {/* Matrix Data dots */}
            <circle cx="50" cy="20" r="3" fill="#0d0d12" />
            <circle cx="50" cy="35" r="3" fill="#0d0d12" />
            <circle cx="45" cy="50" r="4" fill="#7f5af0" />
            <circle cx="55" cy="50" r="4" fill="#ab9ff2" />
            <circle cx="20" cy="50" r="3" fill="#0d0d12" />
            <circle cx="35" cy="50" r="3" fill="#0d0d12" />
            <circle cx="65" cy="55" r="3" fill="#0d0d12" />
            <circle cx="80" cy="55" r="3" fill="#0d0d12" />
            <circle cx="50" cy="70" r="3" fill="#0d0d12" />
            <circle cx="65" cy="75" r="3" fill="#0d0d12" />
            <circle cx="80" cy="75" r="3" fill="#0d0d12" />
            <circle cx="50" cy="85" r="3" fill="#0d0d12" />
          </svg>
        </div>

        {/* Address Box */}
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem' }}>
            Your Dedicated {currency} Deposit Address
          </label>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(0, 0, 0, 0.4)',
            border: '1px solid var(--border-dark)',
            borderRadius: 'var(--radius-md)',
            padding: '0.65rem 0.85rem',
          }}>
            <span style={{ fontSize: '0.8rem', fontFamily: 'monospace', color: 'var(--accent-phantom)', wordBreak: 'break-all' }}>
              {depositAddress || 'Loading...'}
            </span>
            <button
              onClick={copyAddress}
              style={{ background: 'none', border: 'none', color: copied ? 'var(--accent-green)' : 'var(--text-secondary)', cursor: 'pointer', padding: '4px', flexShrink: 0, marginLeft: '8px' }}
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
            </button>
          </div>
        </div>

        {/* Network Notice */}
        <div style={{
          display: 'flex',
          gap: '0.5rem',
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid var(--border-dark)',
          borderRadius: 'var(--radius-md)',
          padding: '0.65rem 0.85rem',
          marginBottom: '1.25rem',
          fontSize: '0.75rem',
          color: 'var(--text-secondary)',
          lineHeight: 1.4,
        }}>
          <Info size={16} color="var(--accent-phantom)" style={{ flexShrink: 0, marginTop: '1px' }} />
          <span>Send only {currency} to this address. Funds credit instantly to your platform balance.</span>
        </div>

        {/* Development Instant Test Faucet */}
        <div style={{
          background: 'rgba(127, 90, 240, 0.1)',
          border: '1px dashed var(--accent-phantom)',
          borderRadius: 'var(--radius-md)',
          padding: '0.85rem 1rem',
          textAlign: 'center',
        }}>
          <p style={{ fontSize: '0.78rem', color: '#7C3AED', fontWeight: 600, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}>
            <Zap size={14} color="#7C3AED" />
            <span>Instant Development Test Faucet</span>
          </p>
          <button
            type="button"
            onClick={handleTestFaucet}
            disabled={faucetLoading}
            className="pill-btn pill-btn-phantom"
            style={{ width: '100%', padding: '0.55rem', fontSize: '0.82rem' }}
          >
            <Zap size={14} />
            <span>
              {faucetLoading
                ? 'Crediting Balance...'
                : faucetSuccess
                ? `Credited! Balance Updated`
                : `Simulate Deposit: Add ${currency === 'SOL' ? '2 SOL' : currency === 'ETH' ? '0.5 ETH' : '500 USDT'}`}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
