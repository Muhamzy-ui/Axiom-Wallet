import React, { useState, useEffect } from 'react';
import { Shield, Lock, User, ArrowRight, ArrowLeft, KeyRound, AlertCircle, Eye, EyeOff, Sparkles } from 'lucide-react';
import { api } from '../../services/api';
import { JuniorAdmin } from '../../types';
import { JuniorAdminDashboard } from './JuniorAdminDashboard';

export const JuniorAdminPortal: React.FC = () => {
  const [currentJa, setCurrentJa] = useState<JuniorAdmin | null>(null);
  const [passcode, setPasscode] = useState('');
  const [username, setUsername] = useState('');
  const [showPasscode, setShowPasscode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);

  // Check saved session on mount
  useEffect(() => {
    try {
      const savedJa = localStorage.getItem('axiom_ja_data');
      const savedId = localStorage.getItem('axiom_ja_id');
      if (savedJa && savedId) {
        const parsed = JSON.parse(savedJa);
        setCurrentJa(parsed);
      }
    } catch {
      localStorage.removeItem('axiom_ja_data');
      localStorage.removeItem('axiom_ja_id');
    } finally {
      setInitializing(false);
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passcode.trim()) {
      setError('Please enter your Assigned Passcode');
      return;
    }
    setError(null);
    setLoading(true);

    try {
      const res = await api.juniorAdminLogin({
        username: username.trim() || undefined,
        passcode: passcode.trim(),
        pin: passcode.trim(),
      });

      if (res.success && res.junior_admin) {
        localStorage.setItem('axiom_ja_id', res.junior_admin.id);
        localStorage.setItem('axiom_ja_data', JSON.stringify(res.junior_admin));
        localStorage.setItem('axiom_ja_token', res.token);
        setCurrentJa(res.junior_admin);
      } else {
        setError('Invalid passcode or account inactive.');
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('axiom_ja_id');
    localStorage.removeItem('axiom_ja_data');
    localStorage.removeItem('axiom_ja_token');
    setCurrentJa(null);
    setPasscode('');
    setUsername('');
  };

  if (initializing) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#06080d',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#94A3B8'
      }}>
        <div style={{
          width: 36,
          height: 36,
          borderRadius: '50%',
          border: '3px solid rgba(34, 209, 248, 0.2)',
          borderTop: '3px solid #22D1F8',
          animation: 'jaSpin 0.8s linear infinite'
        }} />
        <style>{`@keyframes jaSpin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (currentJa) {
    return <JuniorAdminDashboard juniorAdmin={currentJa} onLogout={handleLogout} />;
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(ellipse at top, #091a2e 0%, #060911 60%, #030408 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      color: '#fff',
      position: 'relative',
      overflow: 'hidden',
      boxSizing: 'border-box'
    }}>
      {/* Background ambient lighting */}
      <div style={{
        position: 'absolute',
        top: '15%',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '560px',
        height: '380px',
        background: 'radial-gradient(circle, rgba(34, 209, 248, 0.15) 0%, rgba(99, 102, 241, 0.08) 50%, rgba(0,0,0,0) 70%)',
        filter: 'blur(70px)',
        pointerEvents: 'none'
      }} />

      <style>{`
        @keyframes jaSpin { to { transform: rotate(360deg); } }
        @keyframes jaFadeIn { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
        @media (max-width: 480px) {
          .ja-login-card {
            padding: 24px 18px !important;
            border-radius: 16px !important;
          }
        }
      `}</style>

      <div style={{ width: '100%', maxWidth: '440px', position: 'relative', zIndex: 1, animation: 'jaFadeIn 250ms ease' }}>
        {/* Top Back Nav & Version */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <a
            href="/"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              color: '#94A3B8',
              fontSize: '12px',
              textDecoration: 'none',
              transition: 'color 150ms'
            }}
            onMouseOver={(e) => (e.currentTarget.style.color = '#fff')}
            onMouseOut={(e) => (e.currentTarget.style.color = '#94A3B8')}
          >
            <ArrowLeft size={14} /> Back to Wallet
          </a>
          <span style={{ fontSize: '11px', color: '#64748B', fontFamily: 'monospace', fontWeight: 600 }}>
            AGENT_PORTAL_V2
          </span>
        </div>

        {/* Central Glassmorphic Login Card */}
        <div className="ja-login-card" style={{
          width: '100%',
          background: 'rgba(12, 17, 28, 0.88)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(34, 209, 248, 0.25)',
          borderRadius: '20px',
          padding: '36px 32px',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.7), 0 0 30px rgba(34, 209, 248, 0.12)',
          boxSizing: 'border-box'
        }}>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, rgba(34, 209, 248, 0.25) 0%, rgba(99, 102, 241, 0.35) 100%)',
              border: '1px solid rgba(34, 209, 248, 0.4)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '16px',
              boxShadow: '0 0 25px rgba(34, 209, 248, 0.3)'
            }}>
              <Shield size={32} color="#22D1F8" />
            </div>

            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '3px 12px',
              borderRadius: '20px',
              background: 'rgba(34, 209, 248, 0.12)',
              border: '1px solid rgba(34, 209, 248, 0.3)',
              fontSize: '11px',
              fontWeight: 800,
              color: '#22D1F8',
              letterSpacing: '0.6px',
              marginBottom: '10px'
            }}>
              <Sparkles size={12} /> JUNIOR ADMIN PORTAL
            </div>

            <h1 style={{ fontSize: '24px', fontWeight: 800, margin: '0 0 8px', letterSpacing: '-0.5px' }}>
              Partner Sign In
            </h1>
            <p style={{ fontSize: '13px', color: '#94A3B8', margin: 0, lineHeight: 1.45 }}>
              Access your isolated agent dashboard to track user signups, monitor deposits, and review withdrawal requests.
            </p>
          </div>

          {/* Error Notice */}
          {error && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.35)',
              borderRadius: '10px',
              padding: '10px 14px',
              fontSize: '12px',
              color: '#FCA5A5',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '18px'
            }}>
              <AlertCircle size={16} color="#F87171" style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{
                display: 'block',
                fontSize: '12px',
                fontWeight: 700,
                color: '#CBD5E1',
                marginBottom: '7px'
              }}>
                Username / Identifier <span style={{ color: '#64748B', fontWeight: 500 }}>(Optional)</span>
              </label>
              <div style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748B' }}>
                  <User size={16} />
                </div>
                <input
                  type="text"
                  placeholder="e.g. agent1"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'rgba(6, 9, 16, 0.85)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '12px',
                    padding: '12px 14px 12px 38px',
                    fontSize: '14px',
                    color: '#fff',
                    fontFamily: 'inherit',
                    outline: 'none',
                    boxSizing: 'border-box',
                    transition: 'border-color 150ms'
                  }}
                  onFocus={(e) => (e.target.style.borderColor = '#22D1F8')}
                  onBlur={(e) => (e.target.style.borderColor = 'rgba(255, 255, 255, 0.12)')}
                />
              </div>
            </div>

            <div>
              <label style={{
                display: 'block',
                fontSize: '12px',
                fontWeight: 700,
                color: '#CBD5E1',
                marginBottom: '7px'
              }}>
                Security Passcode / PIN <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748B' }}>
                  <KeyRound size={16} />
                </div>
                <input
                  type={showPasscode ? 'text' : 'password'}
                  autoFocus
                  placeholder="Enter assigned PIN (e.g. 123456)"
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'rgba(6, 9, 16, 0.85)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '12px',
                    padding: '12px 42px 12px 38px',
                    fontSize: '14px',
                    color: '#fff',
                    fontFamily: 'inherit',
                    outline: 'none',
                    boxSizing: 'border-box',
                    transition: 'border-color 150ms'
                  }}
                  onFocus={(e) => (e.target.style.borderColor = '#22D1F8')}
                  onBlur={(e) => (e.target.style.borderColor = 'rgba(255, 255, 255, 0.12)')}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPasscode(!showPasscode)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'transparent',
                    border: 'none',
                    color: '#64748B',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                  title={showPasscode ? 'Hide passcode' : 'Show passcode'}
                >
                  {showPasscode ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                background: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)',
                border: 'none',
                borderRadius: '12px',
                padding: '13px',
                fontSize: '14px',
                fontWeight: 700,
                color: '#fff',
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 4px 20px rgba(6, 182, 212, 0.35)',
                transition: 'transform 100ms, opacity 150ms',
                marginTop: '6px'
              }}
              onMouseOver={(e) => (!loading && (e.currentTarget.style.opacity = '0.92'))}
              onMouseOut={(e) => (!loading && (e.currentTarget.style.opacity = '1'))}
            >
              {loading ? (
                <div style={{
                  width: 18,
                  height: 18,
                  borderRadius: '50%',
                  border: '2px solid rgba(255,255,255,0.3)',
                  borderTop: '2px solid #fff',
                  animation: 'jaSpin 0.8s linear infinite'
                }} />
              ) : (
                <>
                  <span>Sign In To Portal</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          <div style={{ marginTop: '22px', textAlign: 'center', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '16px' }}>
            <p style={{ fontSize: '11px', color: '#64748B', margin: 0 }}>
              Need credentials or link slug change? Contact your Super Administrator.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
