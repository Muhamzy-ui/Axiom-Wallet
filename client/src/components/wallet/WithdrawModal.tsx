import React, { useState } from 'react';
import { X, ArrowUpRight, AlertCircle, CheckCircle2 } from 'lucide-react';
import { api } from '../../services/api';
import { WalletBalance } from '../../types';

interface WithdrawModalProps {
  walletAddress: string;
  balances: WalletBalance[];
  onClose: () => void;
  onSuccess: () => void;
}

export const WithdrawModal: React.FC<WithdrawModalProps> = ({
  walletAddress,
  balances,
  onClose,
  onSuccess,
}) => {
  const [currency, setCurrency] = useState('SOL');
  const [destination, setDestination] = useState('');
  const [amount, setAmount] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const currentBal = balances.find((b) => b.currency === currency);
  const available = currentBal ? parseFloat(currentBal.available_amount) : 0;
  const networkFee = currency === 'SOL' ? 0.005 : currency === 'ETH' ? 0.002 : 2.0;

  const handleMax = () => {
    const maxVal = Math.max(0, available - networkFee);
    setAmount(maxVal.toString());
  };

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const withdrawAmt = parseFloat(amount);
    if (!withdrawAmt || withdrawAmt <= 0) {
      setError('Please enter a valid amount.');
      return;
    }
    if (withdrawAmt > available) {
      setError(`Insufficient ${currency} balance. Available: ${available}`);
      return;
    }
    if (!destination.trim()) {
      setError('Please enter destination wallet address.');
      return;
    }

    try {
      setLoading(true);
      await api.requestWithdrawal({
        address: walletAddress,
        password,
        currency,
        amount,
        destination_address: destination,
      });
      setSubmitted(true);
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to submit withdrawal.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ padding: '1.75rem', maxWidth: '440px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Send / Withdraw</h3>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
          >
            <X size={20} />
          </button>
        </div>

        {submitted ? (
          <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: 'rgba(0, 229, 153, 0.15)',
              color: 'var(--accent-green)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1rem',
            }}>
              <CheckCircle2 size={32} />
            </div>
            <h4 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.5rem' }}>
              Withdrawal Submitted
            </h4>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: 1.5, marginBottom: '1.5rem' }}>
              Your request to withdraw <strong>{amount} {currency}</strong> is currently pending administrator review in the Admin Queue.
            </p>
            <button onClick={onClose} className="pill-btn pill-btn-phantom" style={{ width: '100%' }}>
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleWithdraw}>
            {error && (
              <div style={{
                background: 'rgba(255, 77, 109, 0.15)',
                border: '1px solid var(--accent-red)',
                borderRadius: 'var(--radius-md)',
                padding: '0.65rem 0.85rem',
                fontSize: '0.8rem',
                color: 'var(--accent-red)',
                marginBottom: '1rem',
              }}>
                {error}
              </div>
            )}

            {/* Asset Select */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem' }}>
                Select Asset
              </label>
              <select
                className="axiom-input"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                style={{ cursor: 'pointer' }}
              >
                {balances.map((b) => (
                  <option key={b.currency} value={b.currency} style={{ background: '#1a1926' }}>
                    {b.currency} — Available: {parseFloat(b.available_amount).toLocaleString()}
                  </option>
                ))}
              </select>
            </div>

            {/* Destination Address */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem' }}>
                Destination Address
              </label>
              <input
                type="text"
                className="axiom-input"
                placeholder="External Phantom or MetaMask address"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                required
              />
            </div>

            {/* Amount with MAX button */}
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Amount</label>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                  Available: {available.toFixed(4)} {currency}
                </span>
              </div>
              <div style={{ position: 'relative' }}>
                <input
                  type="number"
                  step="any"
                  className="axiom-input"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={handleMax}
                  style={{
                    position: 'absolute',
                    right: '8px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'rgba(171, 159, 242, 0.15)',
                    border: '1px solid rgba(171, 159, 242, 0.3)',
                    color: 'var(--accent-phantom)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '0.2rem 0.5rem',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  MAX
                </button>
              </div>
            </div>

            {/* Network Fee Breakdown */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid var(--border-dark)',
              borderRadius: 'var(--radius-md)',
              padding: '0.75rem 0.9rem',
              fontSize: '0.8rem',
              marginBottom: '1rem',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>
                <span>Estimated Network Gas Fee</span>
                <span>{networkFee} {currency}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-primary)', fontWeight: 600 }}>
                <span>Total Deducted</span>
                <span>{amount ? (parseFloat(amount) + networkFee).toFixed(4) : '0.00'} {currency}</span>
              </div>
            </div>

            {/* Password Verification */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem' }}>
                Wallet Password (Security Authorization)
              </label>
              <input
                type="password"
                className="axiom-input"
                placeholder="Enter password to confirm"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="pill-btn pill-btn-phantom"
              style={{ width: '100%', padding: '0.8rem' }}
            >
              <ArrowUpRight size={16} />
              <span>{loading ? 'Submitting Request...' : 'Submit Withdrawal'}</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
