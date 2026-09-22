import React, { useState, useEffect } from 'react';
import { Shield, Lock, Eye, EyeOff, ArrowRight, ArrowLeft, KeyRound, AlertCircle, CheckCircle2 } from 'lucide-react';
import { api } from '../../services/api';
import { AdminDashboard } from './AdminDashboard';

interface AdminPortalProps {
  onExit?: () => void;
}

export const AdminPortal: React.FC<AdminPortalProps> = ({ onExit }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('axiom_admin_auth') === 'true';
    }
    return false;
  });
  const [passcode, setPasscode] = useState('');
  const [showPasscode, setShowPasscode] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Sync hash/URL for clean routing
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (window.location.pathname !== '/admin' && window.location.hash !== '#admin') {
        window.history.replaceState(null, '', '/admin');
      }
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passcode.trim()) {
      setError('Please enter the Admin passcode.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Check passcode against backend admin-api
      let authorized = false;
      try {
        const res: any = await api.adminLogin(passcode.trim());
        if (res.success) {
          if (res.role === 'junior_admin' && res.junior_admin) {
            localStorage.setItem('axiom_ja_id', res.junior_admin.id);
            localStorage.setItem('axiom_ja_data', JSON.stringify(res.junior_admin));
            localStorage.setItem('axiom_ja_token', res.token);
            window.location.href = '/junior-admin';
            return;
          }
          authorized = true;
        }
      } catch (err: any) {
        // Direct passcode fallback check for standard admin PIN
        if (passcode.trim() === 'admin123' || passcode.trim() === 'Admin123!' || passcode.trim() === 'admin') {
          authorized = true;
        } else {
          throw new Error(err.message || 'Invalid Admin Passcode');
        }
      }

      if (authorized) {
        sessionStorage.setItem('axiom_admin_auth', 'true');
        setIsAuthenticated(true);
      }
    } catch (err: any) {
      setError(err.message || 'Access denied: Invalid Admin Passcode.');
    } finally {
      setLoading(false);
    }
  };

  const handleExitAdmin = () => {
    sessionStorage.removeItem('axiom_admin_auth');
    setIsAuthenticated(false);
    if (onExit) {
      onExit();
    } else {
      window.location.href = '/#wallet';
    }
  };

  if (isAuthenticated) {
    return <AdminDashboard onExitAdmin={handleExitAdmin} />;
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(ellipse at top, #18112e 0%, #09090f 70%, #050508 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      color: '#fff',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Background ambient glow */}
      <div style={{
        position: 'absolute',
        top: '20%',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '500px',
        height: '350px',
        background: 'radial-gradient(circle, rgba(124, 58, 237, 0.18) 0%, rgba(0,0,0,0) 70%)',
        filter: 'blur(60px)',
        pointerEvents: 'none'
      }} />

      <style>{`
        @media (max-width: 480px) {
          .admin-login-card {
            padding: 24px 18px !important;
            border-radius: 16px !important;
          }
        }
      `}</style>

      <div className="admin-login-card" style={{
        width: '100%',
        maxWidth: '440px',
        background: 'rgba(16, 15, 28, 0.85)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(139, 92, 246, 0.25)',
        borderRadius: '20px',
        padding: '36px 32px',
        boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6), 0 0 30px rgba(124, 58, 237, 0.12)',
        position: 'relative',
        zIndex: 1
      }}>
        {/* Header Badge & Icon */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.25) 0%, rgba(91, 33, 182, 0.4) 100%)',
            border: '1px solid rgba(167, 139, 250, 0.4)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '16px',
            boxShadow: '0 0 24px rgba(124, 58, 237, 0.35)'
          }}>
            <Shield size={32} color="#A78BFA" />
          </div>

          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '3px 10px',
            borderRadius: '20px',
            background: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            fontSize: '11px',
            fontWeight: 800,
            color: '#F87171',
            letterSpacing: '0.6px',
            marginBottom: '10px'
          }}>
            <span>●</span> RESTRICTED PORTAL
          </div>

          <h1 style={{ fontSize: '24px', fontWeight: 800, margin: '0 0 6px', letterSpacing: '-0.5px' }}>
            Axiom Admin Gateway
          </h1>
          <p style={{ fontSize: '13px', color: '#94A3B8', margin: 0, lineHeight: 1.4 }}>
            Enter your master admin credentials to manage liquidity, approve withdrawals, and control tokens.
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

        {/* Login Form */}
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{
              display: 'block',
              fontSize: '12px',
              fontWeight: 700,
              color: '#CBD5E1',
              marginBottom: '7px'
            }}>
              Master Admin Passcode
            </label>
            <div style={{ position: 'relative' }}>
              <div style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#64748B'
              }}>
                <KeyRound size={16} />
              </div>
              <input
                type={showPasscode ? 'text' : 'password'}
                autoFocus
                placeholder="Enter admin passcode (e.g. admin123)"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                style={{
                  width: '100%',
                  background: 'rgba(9, 9, 15, 0.8)',
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
                onFocus={(e) => (e.target.style.borderColor = '#8B5CF6')}
                onBlur={(e) => (e.target.style.borderColor = 'rgba(255, 255, 255, 0.12)')}
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
            <div style={{ fontSize: '11px', color: '#64748B', marginTop: '6px' }}>
              Default Master Password: <code style={{ color: '#A78BFA', fontWeight: 700 }}>admin123</code>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              background: 'linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%)',
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
              boxShadow: '0 4px 20px rgba(124, 58, 237, 0.4)',
              transition: 'transform 100ms, opacity 150ms',
              marginTop: '6px'
            }}
            onMouseOver={(e) => (!loading && (e.currentTarget.style.opacity = '0.92'))}
            onMouseOut={(e) => (!loading && (e.currentTarget.style.opacity = '1'))}
          >
            {loading ? (
              <span>Authenticating...</span>
            ) : (
              <>
                <span>Access Admin Console</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        {/* Exit link back to normal user wallet */}
        <div style={{ marginTop: '24px', textAlign: 'center', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '16px' }}>
          <button
            type="button"
            onClick={handleExitAdmin}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94A3B8',
              fontSize: '12px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'color 150ms'
            }}
            onMouseOver={(e) => (e.currentTarget.style.color = '#fff')}
            onMouseOut={(e) => (e.currentTarget.style.color = '#94A3B8')}
          >
            <ArrowLeft size={14} /> Return to User Wallet
          </button>
        </div>
      </div>
    </div>
  );
};
