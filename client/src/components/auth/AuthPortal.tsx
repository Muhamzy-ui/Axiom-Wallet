import React, { useState } from 'react';
import {
  Shield, Mail, Lock, Eye, EyeOff, KeyRound, Copy, Check,
  ArrowRight, ArrowLeft, Sparkles, AlertTriangle, Coins, TrendingUp, BarChart3, PieChart
} from 'lucide-react';
import { api } from '../../services/api';
import { copyToClipboard } from '../../services/clipboard';

interface AuthPortalProps {
  onSuccess: (address: string) => void;
}

export const AuthPortal: React.FC<AuthPortalProps> = ({ onSuccess }) => {
  // Modes: 'signup' | 'signin' | 'import'
  const [mode, setMode] = useState<'signup' | 'signin' | 'import'>('signup');

  // Multi-step signup: Step 1 (Email & Password), Step 2 (12-Word Seed Phrase)
  const [signupStep, setSignupStep] = useState<1 | 2>(1);

  // Form Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [termsAgreed, setTermsAgreed] = useState(false);

  // Seed phrase state
  const [generatedWords, setGeneratedWords] = useState<string[]>([]);
  const [copiedWords, setCopiedWords] = useState(false);
  const [seedConfirmed, setSeedConfirmed] = useState(false);
  const [showSeedWords, setShowSeedWords] = useState(true);

  // Sign in / Import fields
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [importPhrase, setImportPhrase] = useState('');

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Palette Constants from reference image
  const COLOR_INDIGO = '#4F46E5';
  const COLOR_CYAN = '#06B6D4';
  const COLOR_BG_DARK = '#0F172A';
  const COLOR_CARD_SURFACE = '#1E293B';
  const COLOR_WHITE = '#FFFFFF';
  const COLOR_SLATE_LIGHT = '#F1F5F9';
  const COLOR_SLATE_MUTED = '#94A3B8';

  // Step 1 -> Step 2: Validate Email and Password, generate seed phrase
  const handleProceedToSeed = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (!termsAgreed) {
      setError('Please accept the Terms of Service to continue.');
      return;
    }

    try {
      setLoading(true);
      const data = await api.generateSeed();
      setGeneratedWords(data.word_list);
      setSignupStep(2);
    } catch (err: any) {
      setError('Failed to generate seed phrase. Please check backend connection.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Confirm seed phrase and finalize registration
  const handleFinalizeSignup = async () => {
    setError('');
    if (!seedConfirmed) {
      setError('Please confirm that you have written down your 12-word recovery phrase.');
      return;
    }

    try {
      setLoading(true);
      const res = await api.registerWallet(generatedWords.join(' '), password, email);
      localStorage.setItem('axiom_wallet_address', res.wallet_address);
      if (res.email) localStorage.setItem('axiom_wallet_email', res.email);
      onSuccess(res.wallet_address);
    } catch (err: any) {
      setError(err.message || 'Failed to register wallet.');
    } finally {
      setLoading(false);
    }
  };

  // Sign In Handler
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!loginIdentifier.trim() || !loginPassword) {
      setError('Please enter your email or wallet address and password.');
      return;
    }

    try {
      setLoading(true);
      const res = await api.unlockWallet(loginIdentifier, loginPassword);
      localStorage.setItem('axiom_wallet_address', res.wallet_address);
      if (res.email) localStorage.setItem('axiom_wallet_email', res.email);
      onSuccess(res.wallet_address);
    } catch (err: any) {
      setError(err.message || 'Incorrect credentials.');
    } finally {
      setLoading(false);
    }
  };

  // Import Handler
  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const words = importPhrase.trim().split(/\s+/);
    if (words.length !== 12 && words.length !== 24) {
      setError('Recovery phrase must contain exactly 12 or 24 words.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    try {
      setLoading(true);
      const res = await api.registerWallet(words.join(' '), password, email || undefined);
      localStorage.setItem('axiom_wallet_address', res.wallet_address);
      onSuccess(res.wallet_address);
    } catch (err: any) {
      setError(err.message || 'Failed to import wallet.');
    } finally {
      setLoading(false);
    }
  };

  const copySeedToClipboard = () => {
    copyToClipboard(generatedWords.join(' '));
    setCopiedWords(true);
    setTimeout(() => setCopiedWords(false), 2000);
  };

  // Common Input Style (Guaranteed dark background, NEVER white!)
  const inputStyle: React.CSSProperties = {
    width: '100%',
    backgroundColor: '#0B1120',
    color: COLOR_WHITE,
    border: '1px solid rgba(255, 255, 255, 0.15)',
    borderRadius: '12px',
    padding: '0.85rem 1rem',
    fontSize: '0.95rem',
    outline: 'none',
    transition: 'all 0.2s',
    boxSizing: 'border-box',
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: COLOR_BG_DARK,
      color: COLOR_WHITE,
      position: 'relative',
      overflowX: 'hidden',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* 3D Fluid Ambient Mesh Behind (From Reference Image) */}
      <div style={{
        position: 'absolute',
        top: '-10%',
        left: '25%',
        width: '600px',
        height: '600px',
        background: 'radial-gradient(circle, rgba(79, 70, 229, 0.25) 0%, transparent 65%)',
        filter: 'blur(80px)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute',
        bottom: '-10%',
        right: '10%',
        width: '700px',
        height: '700px',
        background: 'radial-gradient(circle, rgba(79, 70, 229, 0.35) 0%, rgba(6, 182, 212, 0.15) 50%, transparent 70%)',
        filter: 'blur(100px)',
        pointerEvents: 'none',
      }} />

      {/* Top Navbar (Matching reference image: Brand on left, menu in center, pill button on right) */}
      <header style={{
        maxWidth: '1280px',
        width: '100%',
        margin: '0 auto',
        padding: '1.25rem 2rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'relative',
        zIndex: 10,
      }}>
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            background: `linear-gradient(135deg, ${COLOR_INDIGO} 0%, ${COLOR_CYAN} 100%)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: `0 4px 14px rgba(79, 70, 229, 0.5)`,
          }}>
            <Shield size={20} color="#FFFFFF" />
          </div>
          <span style={{ fontSize: '1.35rem', fontWeight: 800, letterSpacing: '-0.02em', color: COLOR_WHITE }}>
            Axiom
          </span>
        </div>

        {/* Center Nav Links */}
        <nav style={{ display: 'flex', gap: '2rem', fontSize: '0.9rem', color: COLOR_SLATE_MUTED, fontWeight: 500 }}>
          <span style={{ color: COLOR_WHITE, cursor: 'pointer' }}>Home</span>
          <span style={{ cursor: 'pointer' }}>Features</span>
          <span style={{ cursor: 'pointer' }}>Meme Terminal</span>
          <span style={{ cursor: 'pointer' }}>Security</span>
        </nav>

        {/* Top Right Action Button */}
        <button
          onClick={() => { setMode('signup'); setSignupStep(1); }}
          style={{
            backgroundColor: COLOR_INDIGO,
            color: COLOR_WHITE,
            border: 'none',
            borderRadius: '9999px',
            padding: '0.65rem 1.4rem',
            fontSize: '0.88rem',
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: `0 4px 18px rgba(79, 70, 229, 0.5)`,
            transition: 'all 0.2s',
          }}
        >
          Get Started
        </button>
      </header>

      {/* Main Content Showcase: Left Hero + Right Card */}
      <main style={{
        maxWidth: '1280px',
        width: '100%',
        margin: 'auto',
        padding: '2rem 2rem 4rem',
        display: 'grid',
        gridTemplateColumns: '1.15fr 1fr',
        gap: '3.5rem',
        alignItems: 'center',
        position: 'relative',
        zIndex: 10,
      }}>
        {/* Left Side: Hero Section matching reference image */}
        <div>
          <h1 style={{
            fontSize: '3.4rem',
            fontWeight: 900,
            lineHeight: 1.12,
            letterSpacing: '-0.03em',
            color: COLOR_WHITE,
            marginBottom: '1.25rem',
          }}>
            Build the future<br />
            with <span style={{
              background: `linear-gradient(135deg, ${COLOR_INDIGO} 30%, ${COLOR_CYAN} 100%)`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>innovative solutions</span>
          </h1>

          <p style={{
            fontSize: '1.05rem',
            color: COLOR_SLATE_MUTED,
            lineHeight: 1.6,
            maxWidth: '520px',
            marginBottom: '2rem',
          }}>
            Powerful tools to help you trade, swap, and scale meme coins with zero gas delays and institutional cryptographic ledger protection.
          </p>

          <div style={{ display: 'flex', gap: '1rem', marginBottom: '3rem' }}>
            <button
              onClick={() => { setMode('signup'); setSignupStep(1); }}
              style={{
                backgroundColor: COLOR_INDIGO,
                color: COLOR_WHITE,
                border: 'none',
                borderRadius: '9999px',
                padding: '0.85rem 1.8rem',
                fontSize: '0.95rem',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: `0 6px 22px rgba(79, 70, 229, 0.6)`,
              }}
            >
              Get Started
            </button>
            <button
              onClick={() => setMode('signin')}
              style={{
                backgroundColor: 'transparent',
                color: COLOR_WHITE,
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '9999px',
                padding: '0.85rem 1.8rem',
                fontSize: '0.95rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Sign In
            </button>
          </div>

          {/* Floating 3D Dark Dashboard Preview Card (Exactly like reference image) */}
          <div style={{
            background: 'linear-gradient(145deg, #1E293B 0%, #0F172A 100%)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: '20px',
            padding: '1.5rem',
            boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.8), 0 0 40px rgba(79, 70, 229, 0.25)',
            maxWidth: '480px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: COLOR_INDIGO, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Coins size={16} color="#fff" />
                </div>
                <span style={{ fontSize: '0.9rem', fontWeight: 700 }}>Axiom Platform Terminal</span>
              </div>
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: `conic-gradient(${COLOR_INDIGO} 0% 65%, ${COLOR_CYAN} 65% 100%)` }} />
            </div>

            {/* Glowing Charts layout inside card */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '1rem', alignItems: 'center', marginBottom: '1rem' }}>
              {/* Mini Bar Chart */}
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px', height: '60px', padding: '0.5rem', background: 'rgba(0, 0, 0, 0.3)', borderRadius: '8px' }}>
                <div style={{ width: '12px', height: '40%', background: COLOR_INDIGO, borderRadius: '3px' }} />
                <div style={{ width: '12px', height: '70%', background: COLOR_INDIGO, borderRadius: '3px' }} />
                <div style={{ width: '12px', height: '95%', background: COLOR_CYAN, borderRadius: '3px', boxShadow: `0 0 8px ${COLOR_CYAN}` }} />
                <div style={{ width: '12px', height: '60%', background: COLOR_INDIGO, borderRadius: '3px' }} />
              </div>

              {/* Glowing Line Wave Chart */}
              <div style={{ height: '60px' }}>
                <svg viewBox="0 0 200 60" style={{ width: '100%', height: '100%' }}>
                  <defs>
                    <linearGradient id="glowLineGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={COLOR_CYAN} stopOpacity="0.4" />
                      <stop offset="100%" stopColor={COLOR_INDIGO} stopOpacity="0.0" />
                    </linearGradient>
                  </defs>
                  <path d="M 0 45 Q 40 50, 70 30 T 140 25 T 200 10 L 200 60 L 0 60 Z" fill="url(#glowLineGrad)" />
                  <path d="M 0 45 Q 40 50, 70 30 T 140 25 T 200 10" fill="none" stroke={COLOR_CYAN} strokeWidth="2.5" />
                </svg>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: COLOR_SLATE_MUTED, borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '0.75rem' }}>
              <span>Liquidity: <strong style={{ color: COLOR_WHITE }}>$850,000</strong></span>
              <span>24h Vol: <strong style={{ color: COLOR_WHITE }}>$1,428,500</strong></span>
              <span>Gas Fee: <strong style={{ color: '#10B981' }}>$0.00</strong></span>
            </div>
          </div>
        </div>

        {/* Right Side: Auth Card with exact color palette */}
        <div style={{
          backgroundColor: COLOR_CARD_SURFACE,
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: '24px',
          padding: '2.5rem',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.8), 0 0 1px 1px rgba(255, 255, 255, 0.05) inset',
          position: 'relative',
        }}>
          {/* Tabs: Create Wallet | Sign In | Import Phrase */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            backgroundColor: '#0B1120',
            padding: '0.35rem',
            borderRadius: '9999px',
            marginBottom: '2rem',
            border: '1px solid rgba(255, 255, 255, 0.08)',
          }}>
            <button
              type="button"
              onClick={() => { setMode('signup'); setSignupStep(1); setError(''); }}
              style={{
                padding: '0.65rem 0.5rem',
                borderRadius: '9999px',
                border: 'none',
                backgroundColor: mode === 'signup' ? COLOR_INDIGO : 'transparent',
                color: mode === 'signup' ? COLOR_WHITE : COLOR_SLATE_MUTED,
                fontWeight: 700,
                fontSize: '0.82rem',
                cursor: 'pointer',
                boxShadow: mode === 'signup' ? `0 2px 10px rgba(79, 70, 229, 0.5)` : 'none',
                transition: 'all 0.2s',
              }}
            >
              Create Wallet
            </button>

            <button
              type="button"
              onClick={() => { setMode('signin'); setError(''); }}
              style={{
                padding: '0.65rem 0.5rem',
                borderRadius: '9999px',
                border: 'none',
                backgroundColor: mode === 'signin' ? COLOR_INDIGO : 'transparent',
                color: mode === 'signin' ? COLOR_WHITE : COLOR_SLATE_MUTED,
                fontWeight: 700,
                fontSize: '0.82rem',
                cursor: 'pointer',
                boxShadow: mode === 'signin' ? `0 2px 10px rgba(79, 70, 229, 0.5)` : 'none',
                transition: 'all 0.2s',
              }}
            >
              Sign In
            </button>

            <button
              type="button"
              onClick={() => { setMode('import'); setError(''); }}
              style={{
                padding: '0.65rem 0.5rem',
                borderRadius: '9999px',
                border: 'none',
                backgroundColor: mode === 'import' ? COLOR_INDIGO : 'transparent',
                color: mode === 'import' ? COLOR_WHITE : COLOR_SLATE_MUTED,
                fontWeight: 700,
                fontSize: '0.82rem',
                cursor: 'pointer',
                boxShadow: mode === 'import' ? `0 2px 10px rgba(79, 70, 229, 0.5)` : 'none',
                transition: 'all 0.2s',
              }}
            >
              Import Phrase
            </button>
          </div>

          {/* Error Banner */}
          {error && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
              backgroundColor: 'rgba(244, 63, 94, 0.15)',
              border: '1px solid #F43F5E',
              color: '#F43F5E',
              padding: '0.75rem 1rem',
              borderRadius: '12px',
              fontSize: '0.85rem',
              marginBottom: '1.5rem',
            }}>
              <AlertTriangle size={18} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {/* ========================================================= */}
          {/* SIGN UP: STEP 1 (EMAIL & PASSWORD FIRST)                  */}
          {/* ========================================================= */}
          {mode === 'signup' && signupStep === 1 && (
            <form onSubmit={handleProceedToSeed}>
              <div style={{ marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '1.65rem', fontWeight: 800, color: COLOR_WHITE, marginBottom: '0.35rem' }}>
                  Create your account
                </h2>
                <p style={{ color: COLOR_SLATE_MUTED, fontSize: '0.875rem' }}>
                  Step 1 of 2: Set your credentials before generating your private keys.
                </p>
              </div>

              {/* Email Input */}
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: COLOR_SLATE_MUTED, marginBottom: '0.4rem' }}>
                  Email Address
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="email"
                    style={inputStyle}
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                  <Mail size={18} color={COLOR_SLATE_MUTED} style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                </div>
              </div>

              {/* Password Input */}
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: COLOR_SLATE_MUTED, marginBottom: '0.4rem' }}>
                  Password
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    style={inputStyle}
                    placeholder="Create password (min 6 characters)"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: COLOR_SLATE_MUTED, cursor: 'pointer' }}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: COLOR_SLATE_MUTED, marginBottom: '0.4rem' }}>
                  Confirm Password
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  style={inputStyle}
                  placeholder="Re-enter password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>

              {/* Terms Checkbox */}
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '1.75rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={termsAgreed}
                  onChange={(e) => setTermsAgreed(e.target.checked)}
                  style={{ width: '16px', height: '16px', accentColor: COLOR_INDIGO }}
                />
                <span style={{ fontSize: '0.82rem', color: COLOR_SLATE_MUTED }}>
                  I agree to the Terms of Service and Privacy Policy
                </span>
              </label>

              {/* Big CTA Button with #4F46E5 */}
              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%',
                  backgroundColor: COLOR_INDIGO,
                  color: COLOR_WHITE,
                  border: 'none',
                  borderRadius: '9999px',
                  padding: '0.9rem',
                  fontSize: '0.95rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.6rem',
                  boxShadow: `0 4px 20px rgba(79, 70, 229, 0.5)`,
                  transition: 'all 0.2s',
                }}
              >
                <span>{loading ? 'Securing Credentials...' : 'Continue to Secret Phrase'}</span>
                <ArrowRight size={18} />
              </button>
            </form>
          )}

          {/* ========================================================= */}
          {/* SIGN UP: STEP 2 (PHANTOM SEED PHRASE REVEAL)              */}
          {/* ========================================================= */}
          {mode === 'signup' && signupStep === 2 && (
            <div>
              <button
                type="button"
                onClick={() => setSignupStep(1)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: 'none', border: 'none', color: COLOR_SLATE_MUTED, cursor: 'pointer', marginBottom: '1rem', fontSize: '0.85rem' }}
              >
                <ArrowLeft size={16} /> Back to Credentials
              </button>

              <div style={{ marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: COLOR_CYAN, fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                  <KeyRound size={16} />
                  <span>STEP 2 OF 2: MASTER RECOVERY KEY</span>
                </div>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: COLOR_WHITE }}>Secret Recovery Phrase</h2>
                <p style={{ color: COLOR_SLATE_MUTED, fontSize: '0.85rem', marginTop: '0.2rem' }}>
                  Write down these 12 words in order and store them safely. Never disclose your seed phrase.
                </p>
              </div>

              {/* 12-Word Grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '0.55rem',
                backgroundColor: '#0B1120',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '14px',
                padding: '1rem',
                marginBottom: '1rem',
                filter: showSeedWords ? 'none' : 'blur(5px)',
                transition: 'filter 0.2s ease',
              }}>
                {generatedWords.map((word, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      padding: '0.5rem 0.65rem',
                      borderRadius: '8px',
                      border: '1px solid rgba(255, 255, 255, 0.06)',
                    }}
                  >
                    <span style={{ fontSize: '0.72rem', color: COLOR_SLATE_MUTED, fontWeight: 600, width: '16px' }}>
                      {idx + 1}.
                    </span>
                    <span style={{ fontSize: '0.88rem', fontWeight: 700, color: COLOR_CYAN }}>
                      {word}
                    </span>
                  </div>
                ))}
              </div>

              {/* Action Buttons: Copy & Hide */}
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
                <button
                  type="button"
                  onClick={copySeedToClipboard}
                  style={{
                    flex: 1,
                    backgroundColor: 'rgba(255, 255, 255, 0.06)',
                    color: COLOR_WHITE,
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '9999px',
                    padding: '0.65rem 1rem',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                  }}
                >
                  {copiedWords ? <Check size={16} color="#10B981" /> : <Copy size={16} />}
                  <span>{copiedWords ? 'Copied to Clipboard!' : 'Copy 12 Words'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowSeedWords(!showSeedWords)}
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.06)',
                    color: COLOR_WHITE,
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '9999px',
                    padding: '0.65rem 0.9rem',
                    cursor: 'pointer',
                  }}
                  title="Toggle Word Visibility"
                >
                  {showSeedWords ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {/* Confirmation Checkbox */}
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem', marginBottom: '1.5rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={seedConfirmed}
                  onChange={(e) => setSeedConfirmed(e.target.checked)}
                  style={{ width: '16px', height: '16px', accentColor: COLOR_INDIGO, marginTop: '2px' }}
                />
                <span style={{ fontSize: '0.82rem', color: COLOR_SLATE_MUTED, lineHeight: 1.4 }}>
                  I have written down and securely stored my 12-word recovery phrase.
                </span>
              </label>

              <button
                type="button"
                onClick={handleFinalizeSignup}
                disabled={loading}
                style={{
                  width: '100%',
                  backgroundColor: COLOR_INDIGO,
                  color: COLOR_WHITE,
                  border: 'none',
                  borderRadius: '9999px',
                  padding: '0.9rem',
                  fontSize: '0.95rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.6rem',
                  boxShadow: `0 4px 20px rgba(79, 70, 229, 0.5)`,
                }}
              >
                <span>{loading ? 'Creating Wallet Vault...' : 'Launch Axiom Wallet'}</span>
                <Sparkles size={18} />
              </button>
            </div>
          )}

          {/* ========================================================= */}
          {/* SIGN IN FLOW (EMAIL / WALLET ADDRESS + PASSWORD)          */}
          {/* ========================================================= */}
          {mode === 'signin' && (
            <form onSubmit={handleSignIn}>
              <div style={{ marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '1.65rem', fontWeight: 800, color: COLOR_WHITE, marginBottom: '0.35rem' }}>
                  Welcome back
                </h2>
                <p style={{ color: COLOR_SLATE_MUTED, fontSize: '0.875rem' }}>
                  Sign in with your email or connected wallet address.
                </p>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: COLOR_SLATE_MUTED, marginBottom: '0.4rem' }}>
                  Email or Wallet Address
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    style={inputStyle}
                    placeholder="name@example.com or Ax..."
                    value={loginIdentifier}
                    onChange={(e) => setLoginIdentifier(e.target.value)}
                    autoFocus
                    required
                  />
                  <Mail size={18} color={COLOR_SLATE_MUTED} style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                </div>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: 600, color: COLOR_SLATE_MUTED }}>
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setMode('import')}
                    style={{ background: 'none', border: 'none', color: COLOR_CYAN, fontSize: '0.78rem', cursor: 'pointer' }}
                  >
                    Forgot password?
                  </button>
                </div>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    style={inputStyle}
                    placeholder="Enter wallet password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: COLOR_SLATE_MUTED, cursor: 'pointer' }}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%',
                  backgroundColor: COLOR_INDIGO,
                  color: COLOR_WHITE,
                  border: 'none',
                  borderRadius: '9999px',
                  padding: '0.9rem',
                  fontSize: '0.95rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.6rem',
                  boxShadow: `0 4px 20px rgba(79, 70, 229, 0.5)`,
                }}
              >
                <span>{loading ? 'Authenticating...' : 'Sign In to Wallet'}</span>
                <ArrowRight size={18} />
              </button>

              <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
                <span style={{ fontSize: '0.82rem', color: COLOR_SLATE_MUTED }}>
                  Don't have a wallet yet?{' '}
                  <button
                    type="button"
                    onClick={() => { setMode('signup'); setSignupStep(1); }}
                    style={{ background: 'none', border: 'none', color: COLOR_CYAN, fontWeight: 700, cursor: 'pointer' }}
                  >
                    Create one now
                  </button>
                </span>
              </div>
            </form>
          )}

          {/* ========================================================= */}
          {/* IMPORT FLOW (RECOVERY PHRASE)                             */}
          {/* ========================================================= */}
          {mode === 'import' && (
            <form onSubmit={handleImport}>
              <div style={{ marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '1.65rem', fontWeight: 800, color: COLOR_WHITE, marginBottom: '0.35rem' }}>
                  Import Secret Phrase
                </h2>
                <p style={{ color: COLOR_SLATE_MUTED, fontSize: '0.875rem' }}>
                  Enter your 12-word recovery seed phrase to restore your wallet access.
                </p>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: COLOR_SLATE_MUTED, marginBottom: '0.4rem' }}>
                  Secret Recovery Phrase (12 Words)
                </label>
                <textarea
                  rows={3}
                  style={{ ...inputStyle, resize: 'none', lineHeight: 1.5 }}
                  placeholder="word1 word2 word3 ... word12"
                  value={importPhrase}
                  onChange={(e) => setImportPhrase(e.target.value)}
                  required
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: COLOR_SLATE_MUTED, marginBottom: '0.4rem' }}>
                  Email (Optional for notifications)
                </label>
                <input
                  type="email"
                  style={inputStyle}
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: COLOR_SLATE_MUTED, marginBottom: '0.4rem' }}>
                  New Password
                </label>
                <input
                  type="password"
                  style={inputStyle}
                  placeholder="Create password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: COLOR_SLATE_MUTED, marginBottom: '0.4rem' }}>
                  Confirm Password
                </label>
                <input
                  type="password"
                  style={inputStyle}
                  placeholder="Confirm password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%',
                  backgroundColor: COLOR_INDIGO,
                  color: COLOR_WHITE,
                  border: 'none',
                  borderRadius: '9999px',
                  padding: '0.9rem',
                  fontSize: '0.95rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.6rem',
                  boxShadow: `0 4px 20px rgba(79, 70, 229, 0.5)`,
                }}
              >
                <span>{loading ? 'Restoring Wallet...' : 'Restore & Enter Wallet'}</span>
                <ArrowRight size={18} />
              </button>
            </form>
          )}
        </div>
      </main>

      {/* Footer Color Palette Confirmation (Just like the bottom bar in reference image) */}
      <footer style={{
        maxWidth: '1280px',
        width: '100%',
        margin: '0 auto',
        padding: '1.5rem 2rem',
        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: '0.8rem',
        color: COLOR_SLATE_MUTED,
        position: 'relative',
        zIndex: 10,
      }}>
        <div>© 2026 Axiom Wallet Inc. Institutional Meme Coin Architecture.</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>Palette Verified:</span>
          <div style={{ display: 'flex', gap: '6px' }}>
            <span style={{ width: '18px', height: '18px', borderRadius: '4px', background: COLOR_INDIGO, display: 'inline-block' }} title="#4F46E5" />
            <span style={{ width: '18px', height: '18px', borderRadius: '4px', background: COLOR_CYAN, display: 'inline-block' }} title="#06B6D4" />
            <span style={{ width: '18px', height: '18px', borderRadius: '4px', background: COLOR_BG_DARK, border: '1px solid rgba(255,255,255,0.2)', display: 'inline-block' }} title="#0F172A" />
            <span style={{ width: '18px', height: '18px', borderRadius: '4px', background: COLOR_WHITE, display: 'inline-block' }} title="#FFFFFF" />
            <span style={{ width: '18px', height: '18px', borderRadius: '4px', background: COLOR_SLATE_LIGHT, display: 'inline-block' }} title="#F1F5F9" />
          </div>
        </div>
      </footer>
    </div>
  );
};
