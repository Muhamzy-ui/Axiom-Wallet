import React, { useState } from 'react';
import { Download, ArrowLeft } from 'lucide-react';
import { api } from '../../services/api';

interface ImportWalletModalProps {
  onSuccess: (address: string) => void;
  onBackToCreate: () => void;
}

export const ImportWalletModal: React.FC<ImportWalletModalProps> = ({
  onSuccess,
  onBackToCreate,
}) => {
  const [seedPhrase, setSeedPhrase] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const words = seedPhrase.trim().split(/\s+/);
    if (words.length !== 12 && words.length !== 24) {
      setError('Seed phrase must be 12 or 24 words.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    try {
      setLoading(true);
      const res = await api.registerWallet(words.join(' '), password);
      localStorage.setItem('axiom_wallet_address', res.wallet_address);
      onSuccess(res.wallet_address);
    } catch (err: any) {
      setError(err.message || 'Failed to import wallet.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ padding: '2rem', maxWidth: '480px' }}>
        <button
          type="button"
          onClick={onBackToCreate}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', marginBottom: '1rem', fontSize: '0.85rem' }}
        >
          <ArrowLeft size={16} /> Back
        </button>

        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{
            width: '50px',
            height: '50px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, #7f5af0 0%, #ab9ff2 100%)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '0.75rem',
          }}>
            <Download size={24} color="#0d0d12" />
          </div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>Import Secret Phrase</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Enter your 12-word recovery phrase to restore your wallet.
          </p>
        </div>

        {error && (
          <div style={{
            background: 'rgba(255, 77, 109, 0.15)',
            border: '1px solid var(--accent-red)',
            borderRadius: 'var(--radius-md)',
            padding: '0.75rem',
            fontSize: '0.85rem',
            color: 'var(--accent-red)',
            marginBottom: '1rem',
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleImport}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem', marginBottom: '1.25rem' }}>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.35rem' }}>
                Secret Recovery Phrase (12 Words)
              </label>
              <textarea
                className="axiom-input"
                rows={3}
                placeholder="word1 word2 word3 ... word12"
                value={seedPhrase}
                onChange={(e) => setSeedPhrase(e.target.value)}
                style={{ resize: 'none', lineHeight: 1.5 }}
                required
              />
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.35rem' }}>
                New Password
              </label>
              <input
                type="password"
                className="axiom-input"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.35rem' }}>
                Confirm Password
              </label>
              <input
                type="password"
                className="axiom-input"
                placeholder="Confirm password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="pill-btn pill-btn-phantom"
            style={{ width: '100%', padding: '0.8rem', fontSize: '0.95rem' }}
          >
            {loading ? 'Restoring...' : 'Restore & Access Wallet'}
          </button>
        </form>
      </div>
    </div>
  );
};
