import React, { useState } from 'react';
import { Lock, Shield, KeyRound } from 'lucide-react';
import { api } from '../../services/api';

interface UnlockModalProps {
  savedAddress: string;
  onSuccess: (address: string) => void;
  onReset: () => void;
}

export const UnlockModal: React.FC<UnlockModalProps> = ({
  savedAddress,
  onSuccess,
  onReset,
}) => {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      setLoading(true);
      const res = await api.unlockWallet(savedAddress, password);
      onSuccess(res.wallet_address);
    } catch (err: any) {
      setError(err.message || 'Incorrect password.');
    } finally {
      setLoading(false);
    }
  };

  const shortAddr = savedAddress
    ? `${savedAddress.slice(0, 6)}...${savedAddress.slice(-4)}`
    : '';

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ padding: '2.5rem 2rem', maxWidth: '420px', textAlign: 'center' }}>
        {/* Phantom Violet Logo */}
        <div style={{
          width: '64px',
          height: '64px',
          borderRadius: '20px',
          background: 'linear-gradient(135deg, #7f5af0 0%, #ab9ff2 100%)',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '1rem',
          boxShadow: '0 0 25px rgba(171, 159, 242, 0.45)',
        }}>
          <Shield size={32} color="#0d0d12" />
        </div>

        <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Welcome Back</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.25rem', marginBottom: '1.5rem' }}>
          Wallet: <span style={{ color: 'var(--accent-phantom)', fontWeight: 600 }}>{shortAddr}</span>
        </p>

        {error && (
          <div style={{
            background: 'rgba(255, 77, 109, 0.15)',
            border: '1px solid var(--accent-red)',
            borderRadius: 'var(--radius-md)',
            padding: '0.75rem',
            fontSize: '0.85rem',
            color: 'var(--accent-red)',
            marginBottom: '1.25rem',
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleUnlock}>
          <div style={{ marginBottom: '1.5rem', textAlign: 'left' }}>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.4rem' }}>
              Password
            </label>
            <input
              type="password"
              className="axiom-input"
              placeholder="Enter wallet password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="pill-btn pill-btn-phantom"
            style={{ width: '100%', padding: '0.85rem', fontSize: '0.95rem' }}
          >
            {loading ? 'Unlocking...' : 'Unlock Wallet'}
          </button>
        </form>

        <div style={{ marginTop: '1.5rem', borderTop: '1px solid var(--border-dark)', paddingTop: '1.25rem' }}>
          <button
            type="button"
            onClick={onReset}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.8rem', cursor: 'pointer' }}
          >
            Forgot password? Reset or restore with secret phrase
          </button>
        </div>
      </div>
    </div>
  );
};
