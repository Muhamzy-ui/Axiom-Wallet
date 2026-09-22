import React, { useState, useEffect } from 'react';
import { Shield, Copy, Check, Eye, EyeOff, AlertTriangle, KeyRound } from 'lucide-react';
import { api } from '../../services/api';
import { copyToClipboard as safeCopy } from '../../services/clipboard';

interface SeedPhraseModalProps {
  onSuccess: (address: string) => void;
  onSwitchToImport: () => void;
}

export const SeedPhraseModal: React.FC<SeedPhraseModalProps> = ({
  onSuccess,
  onSwitchToImport,
}) => {
  const [words, setWords] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const [hasSaved, setHasSaved] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchSeed();
  }, []);

  const fetchSeed = async () => {
    try {
      setLoading(true);
      const data = await api.generateSeed();
      setWords(data.word_list);
    } catch (err: any) {
      setError('Could not generate seed phrase. Please check backend connection.');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    safeCopy(words.join(' '));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!hasSaved) {
      setError('Please check the confirmation that you have saved your secret phrase.');
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
      // Save locally
      localStorage.setItem('axiom_wallet_address', res.wallet_address);
      onSuccess(res.wallet_address);
    } catch (err: any) {
      setError(err.message || 'Failed to create wallet.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ padding: '2rem', maxWidth: '520px' }}>
        {/* Header Icon & Title */}
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{
            width: '54px',
            height: '54px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, #7f5af0 0%, #ab9ff2 100%)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '0.75rem',
            boxShadow: '0 0 20px rgba(171, 159, 242, 0.4)'
          }}>
            <KeyRound size={28} color="#0d0d12" />
          </div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>Secret Recovery Phrase</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            This 12-word phrase is the only key to recover your wallet.
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

        {/* 12 Words 3x4 Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '0.6rem',
          background: 'rgba(0, 0, 0, 0.35)',
          padding: '1rem',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-dark)',
          marginBottom: '1rem',
        }}>
          {words.map((word, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                background: 'rgba(255, 255, 255, 0.05)',
                padding: '0.5rem 0.65rem',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
              }}
            >
              <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600, width: '18px' }}>
                {idx + 1}.
              </span>
              <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--accent-phantom)' }}>
                {word}
              </span>
            </div>
          ))}
        </div>

        {/* Copy Button */}
        <button
          type="button"
          onClick={copyToClipboard}
          className="pill-btn pill-btn-secondary"
          style={{ width: '100%', marginBottom: '1.25rem' }}
        >
          {copied ? <Check size={16} color="var(--accent-green)" /> : <Copy size={16} />}
          <span>{copied ? 'Copied 12 Words to Clipboard!' : 'Copy to Clipboard'}</span>
        </button>

        {/* Warning Alert */}
        <div style={{
          display: 'flex',
          gap: '0.6rem',
          background: 'rgba(245, 158, 11, 0.1)',
          border: '1px solid rgba(245, 158, 11, 0.3)',
          borderRadius: 'var(--radius-md)',
          padding: '0.75rem 1rem',
          marginBottom: '1.25rem',
        }}>
          <AlertTriangle size={18} color="#f59e0b" style={{ flexShrink: 0, marginTop: '2px' }} />
          <p style={{ fontSize: '0.8rem', color: '#f59e0b', lineHeight: 1.4 }}>
            Never disclose your recovery phrase. Anyone with this phrase can permanently take your funds.
          </p>
        </div>

        {/* Form to set password */}
        <form onSubmit={handleCreate}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', marginBottom: '1.25rem' }}>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.35rem' }}>
                Set Wallet Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="axiom-input"
                  placeholder="Enter password (min 6 chars)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.35rem' }}>
                Confirm Password
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                className="axiom-input"
                placeholder="Re-enter password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer', marginTop: '0.25rem' }}>
              <input
                type="checkbox"
                checked={hasSaved}
                onChange={(e) => setHasSaved(e.target.checked)}
                style={{ width: '16px', height: '16px', accentColor: 'var(--accent-phantom)' }}
              />
              <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                I have backed up my 12-word recovery phrase
              </span>
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="pill-btn pill-btn-phantom"
            style={{ width: '100%', padding: '0.8rem', fontSize: '0.95rem' }}
          >
            {loading ? 'Securing Wallet...' : 'Create & Unlock Wallet'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '1rem' }}>
          <button
            type="button"
            onClick={onSwitchToImport}
            style={{ background: 'none', border: 'none', color: 'var(--accent-phantom)', fontSize: '0.85rem', cursor: 'pointer', textDecoration: 'underline' }}
          >
            Already have a seed phrase? Import Wallet
          </button>
        </div>
      </div>
    </div>
  );
};
