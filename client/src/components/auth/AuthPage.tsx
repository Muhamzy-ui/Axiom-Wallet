import { useState, useEffect, useCallback } from "react";
import {
  Eye, EyeOff, ArrowRight, Loader2, CheckCircle2, XCircle,
  AlertCircle, Mail, Lock, User, Shield, ChevronLeft, Zap,
  TrendingUp, Activity, Check, Sparkles, Sun, Moon
} from "lucide-react";
import {
  signUp, login, forgotPassword, resetPassword, verifyEmail, resendVerification,
  getPasswordStrength, validatePasswordStrength, validateEmail,
  type AuthUser, type PasswordStrength,
} from "../../services/authService";
import { useTheme } from "../../services/themeContext";
import { copyToClipboard } from "../../services/clipboard";
import "./AuthPage.css";

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────
type AuthView = "login" | "signup" | "forgot" | "reset" | "verify-pending" | "verify-success";

interface AuthPageProps {
  onAuth: (user: AuthUser) => void;
  initialView?: AuthView;
  resetToken?: string;
}

// ─────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────

function PasswordStrengthBar({ password }: { password: string }) {
  const strength: PasswordStrength = getPasswordStrength(password);
  const rules = [
    { label: "8+ characters", ok: password.length >= 8 },
    { label: "Uppercase", ok: /[A-Z]/.test(password) },
    { label: "Lowercase", ok: /[a-z]/.test(password) },
    { label: "Number", ok: /[0-9]/.test(password) },
    { label: "Special char", ok: /[^a-zA-Z0-9]/.test(password) },
  ];

  if (!password) return null;

  return (
    <div className="pw-strength-wrap">
      <div className="pw-strength-top">
        <span className="pw-strength-title">Password strength:</span>
        <span className={`pw-label pw-label-${strength}`}>
          {strength.toUpperCase()}
        </span>
      </div>
      <div className="pw-strength-bars">
        <div className={`pw-bar ${strength === "weak" || strength === "medium" || strength === "strong" ? `bar-${strength}` : ""}`} />
        <div className={`pw-bar ${strength === "medium" || strength === "strong" ? `bar-${strength}` : ""}`} />
        <div className={`pw-bar ${strength === "strong" ? `bar-${strength}` : ""}`} />
      </div>
      <div className="pw-rules">
        {rules.map((r) => (
          <div key={r.label} className={`pw-rule ${r.ok ? "ok" : "fail"}`}>
            {r.ok ? <Check size={11} strokeWidth={3} /> : <span className="pw-rule-dot" />}
            <span>{r.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

interface FormFieldProps {
  id: string;
  label: string;
  type: string;
  value: string;
  placeholder?: string;
  onChange: (v: string) => void;
  onBlur?: () => void;
  error?: string;
  icon: React.ElementType;
  autoComplete?: string;
  disabled?: boolean;
  extraHeader?: React.ReactNode;
}

function FormField({
  id, label, type, value, placeholder, onChange, onBlur, error, icon: Icon, autoComplete, disabled, extraHeader,
}: FormFieldProps) {
  const [showPw, setShowPw] = useState(false);
  const isPassword = type === "password";
  const inputType = isPassword ? (showPw ? "text" : "password") : type;

  return (
    <div className={`auth-field ${error ? "has-error" : ""}`}>
      <div className="auth-field-header">
        <label htmlFor={id} className="auth-field-label">{label}</label>
        {extraHeader}
      </div>
      <div className="auth-input-wrap">
        <Icon size={18} className="auth-field-icon" />
        <input
          id={id}
          type={inputType}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          placeholder={placeholder}
          autoComplete={autoComplete}
          disabled={disabled}
          className="auth-input"
        />
        {isPassword && (
          <button
            type="button"
            className="auth-eye"
            onClick={() => setShowPw(!showPw)}
            tabIndex={-1}
            aria-label={showPw ? "Hide password" : "Show password"}
          >
            {showPw ? <EyeOff size={17} /> : <Eye size={17} />}
          </button>
        )}
      </div>
      {error && (
        <div className="auth-field-error">
          <AlertCircle size={13} />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Branding Panel (Left side on desktop)
// ─────────────────────────────────────────────────────────────
function BrandingPanel({ view }: { view: AuthView }) {
  const [activeTick, setActiveTick] = useState(0);

  const mockTrades = [
    { type: "BUY", token: "POPCAT", amount: "42.5 SOL", time: "just now", val: "+$6,140" },
    { type: "SWAP", token: "BONK", amount: "18.2 SOL", time: "6s ago", val: "+$2,630" },
    { type: "BUY", token: "WIF", amount: "35.0 SOL", time: "14s ago", val: "+$5,060" },
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveTick((p) => (p + 1) % mockTrades.length);
    }, 3500);
    return () => clearInterval(interval);
  }, []);

  const taglines: Record<AuthView, { headline: string; highlight: string; sub: string }> = {
    login: {
      headline: "Trade Smarter.",
      highlight: "Trade Faster.",
      sub: "Professional memecoin execution with DeFi-grade security, instant swaps, and real-time live charting.",
    },
    signup: {
      headline: "Your Keys.",
      highlight: "Your Kingdom.",
      sub: "A true non-custodial wallet engineered for the fastest Solana memecoin traders.",
    },
    forgot: {
      headline: "Account",
      highlight: "Recovery.",
      sub: "Instant, cryptographic password reset verified directly through your email.",
    },
    reset: {
      headline: "Secure",
      highlight: "Fresh Start.",
      sub: "Your assets and keys remain completely safe. Create a strong password to continue.",
    },
    "verify-pending": {
      headline: "Almost",
      highlight: "Ready to Trade.",
      sub: "Check your inbox for the activation link and safely secure your seed phrase.",
    },
    "verify-success": {
      headline: "Welcome to",
      highlight: "Axiom Terminal.",
      sub: "Your email has been verified. Step into high-performance decentralized trading.",
    },
  };

  const { headline, highlight, sub } = taglines[view];
  const { toggleTheme, isLight } = useTheme();

  return (
    <aside className="auth-brand-panel" aria-label="Axiom Wallet Branding">
      {/* Background ambient glowing mesh */}
      <div className="brand-glow brand-glow-1" />
      <div className="brand-glow brand-glow-2" />
      <div className="brand-glow brand-glow-3" />
      <div className="brand-grid-pattern" />

      {/* Brand Header */}
      <div className="brand-top-bar">
        <div className="brand-logo">
          <div className="brand-logo-icon">A</div>
          <span className="brand-logo-text">AXIOM</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            type="button"
            className="auth-theme-toggle"
            onClick={toggleTheme}
            title={isLight ? "Switch to Dark Mode" : "Switch to Light Mode"}
            aria-label={isLight ? "Switch to Dark Mode" : "Switch to Light Mode"}
          >
            {isLight ? <Moon size={16} /> : <Sun size={16} />}
          </button>
          <div className="brand-badge-live">
            <span className="live-dot" />
            <span>SOLANA MAINNET</span>
          </div>
        </div>
      </div>

      {/* Hero Showcase Card */}
      <div className="brand-showcase-card">
        {/* Terminal Header */}
        <div className="showcase-header">
          <div className="showcase-token-pill">
            <span className="token-avatar">🐱</span>
            <div>
              <div className="token-name">POPCAT / SOL</div>
              <div className="token-chain">Raydium Liquidity Pool</div>
            </div>
          </div>
          <div className="showcase-price-block">
            <span className="showcase-price">$0.2717</span>
            <span className="showcase-badge-green">+342.5%</span>
          </div>
        </div>

        {/* Animated Wave Chart */}
        <div className="brand-chart-wrap">
          <svg viewBox="0 0 420 180" className="brand-chart-svg" preserveAspectRatio="none">
            <defs>
              <linearGradient id="chartGradArea" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#7C3AED" stopOpacity={isLight ? 0.25 : 0.45} />
                <stop offset="60%" stopColor="#10B981" stopOpacity={isLight ? 0.1 : 0.15} />
                <stop offset="100%" stopColor="#10B981" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="chartLineGrad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#7C3AED" />
                <stop offset="45%" stopColor="#8B5CF6" />
                <stop offset="75%" stopColor="#10B981" />
                <stop offset="100%" stopColor="#34D399" />
              </linearGradient>
              <filter id="neonGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="4" result="glow" />
                <feMerge>
                  <feMergeNode in="glow" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Grid lines */}
            <line x1="0" y1="45" x2="420" y2="45" stroke={isLight ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.04)"} strokeDasharray="3 3" />
            <line x1="0" y1="90" x2="420" y2="90" stroke={isLight ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.04)"} strokeDasharray="3 3" />
            <line x1="0" y1="135" x2="420" y2="135" stroke={isLight ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.04)"} strokeDasharray="3 3" />

            {/* Area under curve */}
            <path
              d="M0,150 C40,145 70,120 110,130 C150,140 180,95 220,105 C260,115 290,55 330,65 C360,75 390,30 420,20 L420,180 L0,180 Z"
              fill="url(#chartGradArea)"
            />

            {/* Dynamic Main Chart Line */}
            <path
              d="M0,150 C40,145 70,120 110,130 C150,140 180,95 220,105 C260,115 290,55 330,65 C360,75 390,30 420,20"
              fill="none"
              stroke="url(#chartLineGrad)"
              strokeWidth="3.2"
              strokeLinecap="round"
              filter="url(#neonGlow)"
              className="chart-animated-line"
            />

            {/* Pulsing Beacon at peak */}
            <g transform="translate(420, 20)">
              <circle r="12" fill="#10B981" opacity="0.2" className="beacon-ring" />
              <circle r="7" fill="#10B981" opacity="0.4" className="beacon-ring-2" />
              <circle r="4" fill="#34D399" filter="url(#neonGlow)" />
            </g>
          </svg>

          {/* Floating Metric Badges with bobbing CSS animation */}
          <div className="brand-stat-card brand-stat-1">
            <div className="stat-card-glow" />
            <div className="brand-stat-label">24H VOLUME</div>
            <div className="brand-stat-val text-emerald">$2.48M</div>
            <div className="brand-stat-sub">▲ 18.4% today</div>
          </div>

          <div className="brand-stat-card brand-stat-2">
            <div className="stat-card-glow" />
            <div className="brand-stat-label">ACTIVE TRADERS</div>
            <div className="brand-stat-val text-purple">2,491</div>
            <div className="brand-stat-sub">⚡ 14ms latency</div>
          </div>

          <div className="brand-stat-card brand-stat-3">
            <div className="stat-card-glow" />
            <div className="brand-stat-label">EXECUTION</div>
            <div className="brand-stat-val text-cyan">&lt; 45ms</div>
            <div className="brand-stat-sub">0% gas markup</div>
          </div>
        </div>

        {/* Live Simulation Ticker */}
        <div className="showcase-ticker">
          <div className="ticker-label">
            <Activity size={12} className="ticker-icon" />
            <span>LIVE ORDER FLOW</span>
          </div>
          <div className="ticker-item" key={activeTick}>
            <span className={`ticker-pill ${mockTrades[activeTick].type === "BUY" ? "buy" : "swap"}`}>
              {mockTrades[activeTick].type}
            </span>
            <span className="ticker-token">{mockTrades[activeTick].amount} {mockTrades[activeTick].token}</span>
            <span className="ticker-val">{mockTrades[activeTick].val}</span>
            <span className="ticker-time">{mockTrades[activeTick].time}</span>
          </div>
        </div>
      </div>

      {/* Hero Content at Bottom */}
      <div className="brand-content-bottom">
        <h1 className="brand-headline">
          {headline} <span className="brand-headline-gradient">{highlight}</span>
        </h1>
        <p className="brand-sub">{sub}</p>

        {/* Feature Pills */}
        <div className="brand-pills">
          <div className="brand-pill">
            <Zap size={13} className="pill-icon text-purple" />
            <span>Sub-second swaps</span>
          </div>
          <div className="brand-pill">
            <Shield size={13} className="pill-icon text-emerald" />
            <span>Non-custodial & secure</span>
          </div>
          <div className="brand-pill">
            <TrendingUp size={13} className="pill-icon text-cyan" />
            <span>Rug-pull safeguard</span>
          </div>
        </div>
      </div>
    </aside>
  );
}

// ─────────────────────────────────────────────────────────────
// Sign Up Form
// ─────────────────────────────────────────────────────────────
function SignUpForm({ onSuccess, onSwitch }: {
  onSuccess: (seedPhrase: string, email: string) => void;
  onSwitch: () => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [terms, setTerms] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [globalError, setGlobalError] = useState("");
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const touch = (field: string) => setTouched((p) => ({ ...p, [field]: true }));

  const fieldErrors = useCallback(() => {
    const e: Record<string, string> = {};
    if (touched.name && !name.trim()) e.name = "Full name is required.";
    if (touched.email && !email) e.email = "Email is required.";
    else if (touched.email && !validateEmail(email)) e.email = "Enter a valid email address.";
    if (touched.password && !validatePasswordStrength(password))
      e.password = "Password doesn't meet requirements.";
    if (touched.confirm && confirm !== password) e.confirm = "Passwords do not match.";
    if (touched.terms && !terms) e.terms = "You must accept the Terms of Service.";
    return e;
  }, [name, email, password, confirm, terms, touched]);

  const currentErrors = fieldErrors();
  const isFormValid =
    name.trim() && email && validateEmail(email) &&
    validatePasswordStrength(password) && confirm === password && terms;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ name: true, email: true, password: true, confirm: true, terms: true });
    if (!isFormValid) return;

    setLoading(true);
    setGlobalError("");

    const res = await signUp({
      full_name: name.trim(),
      email,
      password,
      confirm_password: confirm,
      accepted_terms: terms,
    });
    setLoading(false);

    if (res.success) {
      onSuccess(res.seed_phrase || "", email);
    } else {
      if (res.field) {
        setErrors({ [res.field]: res.error || "Invalid value." });
      } else {
        setGlobalError(res.error || "Sign up failed. Please try again.");
      }
    }
  };

  const agentRef = typeof window !== "undefined" ? localStorage.getItem("axiom_agent_ref") : null;

  return (
    <form className="auth-form" onSubmit={handleSubmit} noValidate>
      <div className="auth-form-header">
        <h2 className="auth-card-title">Create your account</h2>
        <p className="auth-card-sub">Join thousands of decentralized traders on Axiom Wallet</p>
      </div>

      {agentRef && (
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "8px 12px", borderRadius: 10,
          background: "rgba(34, 209, 248, 0.08)", border: "1px solid rgba(34, 209, 248, 0.25)",
          color: "#22D1F8", fontSize: 11, fontWeight: 600, marginBottom: 12
        }}>
          <Sparkles size={14} style={{ flexShrink: 0 }} />
          <span>Onboarding via Partner Link: <strong style={{ color: "#fff" }}>/{agentRef}</strong></span>
        </div>
      )}

      {globalError && (
        <div className="auth-banner error">
          <AlertCircle size={16} />
          <span>{globalError}</span>
        </div>
      )}

      <FormField
        id="signup-name"
        label="Full Name"
        type="text"
        placeholder="Satoshi Nakamoto"
        value={name}
        onChange={setName}
        onBlur={() => touch("name")}
        error={currentErrors.name || errors.full_name}
        icon={User}
        autoComplete="name"
      />

      <FormField
        id="signup-email"
        label="Email Address"
        type="email"
        placeholder="you@example.com"
        value={email}
        onChange={setEmail}
        onBlur={() => touch("email")}
        error={currentErrors.email || errors.email}
        icon={Mail}
        autoComplete="email"
      />

      <FormField
        id="signup-pw"
        label="Password"
        type="password"
        placeholder="Create a strong password"
        value={password}
        onChange={setPassword}
        onBlur={() => touch("password")}
        error={currentErrors.password || errors.password}
        icon={Lock}
        autoComplete="new-password"
      />

      {password && <PasswordStrengthBar password={password} />}

      <FormField
        id="signup-confirm"
        label="Confirm Password"
        type="password"
        placeholder="Repeat your password"
        value={confirm}
        onChange={setConfirm}
        onBlur={() => touch("confirm")}
        error={currentErrors.confirm || errors.confirm_password}
        icon={Lock}
        autoComplete="new-password"
      />

      <label className={`auth-checkbox ${currentErrors.terms ? "has-error" : ""}`}>
        <input
          type="checkbox"
          checked={terms}
          onChange={(e) => { setTerms(e.target.checked); touch("terms"); }}
          id="accept-terms"
        />
        <span className="auth-checkmark" />
        <span className="auth-checkbox-label">
          I agree to the{" "}
          <a href="#" onClick={(e) => e.preventDefault()}>Terms of Service</a>
          {" "}and{" "}
          <a href="#" onClick={(e) => e.preventDefault()}>Privacy Policy</a>
        </span>
      </label>
      {currentErrors.terms && (
        <div className="auth-field-error" style={{ marginTop: -8, marginBottom: 4 }}>
          <AlertCircle size={12} />
          <span>{currentErrors.terms}</span>
        </div>
      )}

      <button
        type="submit"
        className="auth-submit-btn"
        disabled={loading}
      >
        <span className="btn-glow-layer" />
        {loading ? (
          <><Loader2 size={18} className="spin" /> Creating account…</>
        ) : (
          <>
            <span>Create Account</span>
            <ArrowRight size={17} className="btn-icon-arrow" />
          </>
        )}
      </button>

      <div className="auth-switch">
        Already have an account?{" "}
        <button type="button" onClick={onSwitch}>Sign in</button>
      </div>
    </form>
  );
}

// ─────────────────────────────────────────────────────────────
// Login Form
// ─────────────────────────────────────────────────────────────
function LoginForm({ onSuccess, onSwitch, onForgot }: {
  onSuccess: (user: AuthUser) => void;
  onSwitch: () => void;
  onForgot: () => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [rateLimited, setRateLimited] = useState<{ minutes: number } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please enter both your email and password.");
      return;
    }
    setLoading(true);
    setError("");
    setRateLimited(null);

    const res = await login({ email, password, remember_me: remember });
    setLoading(false);

    if (res.success && res.user_id) {
      onSuccess({
        user_id: res.user_id,
        email: res.email!,
        full_name: res.full_name,
        is_admin: res.is_admin!,
        is_email_verified: res.is_email_verified!,
        wallet_address: res.wallet_address!,
      });
    } else if (res.rate_limited) {
      setRateLimited({ minutes: res.retry_after_minutes || 15 });
    } else {
      setError(res.error || "Invalid email or password.");
    }
  };

  return (
    <form className="auth-form" onSubmit={handleSubmit} noValidate>
      <div className="auth-form-header">
        <h2 className="auth-card-title">Welcome back</h2>
        <p className="auth-card-sub">Enter your credentials to access your trading wallet</p>
      </div>

      {error && (
        <div className="auth-banner error">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}
      {rateLimited && (
        <div className="auth-banner warning">
          <Shield size={16} />
          <span>
            Too many failed attempts. Please wait <strong>{rateLimited.minutes} minute(s)</strong> before trying again.
          </span>
        </div>
      )}

      <FormField
        id="login-email"
        label="Email Address"
        type="email"
        placeholder="you@example.com"
        value={email}
        onChange={setEmail}
        icon={Mail}
        autoComplete="email"
        disabled={!!rateLimited}
      />

      <FormField
        id="login-pw"
        label="Password"
        type="password"
        placeholder="••••••••••••"
        value={password}
        onChange={setPassword}
        icon={Lock}
        autoComplete="current-password"
        disabled={!!rateLimited}
        extraHeader={
          <button type="button" className="auth-link-sm" onClick={onForgot}>
            Forgot password?
          </button>
        }
      />

      <div className="auth-row">
        <label className="auth-checkbox">
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
          />
          <span className="auth-checkmark" />
          <span className="auth-checkbox-label">Remember me for 30 days</span>
        </label>
      </div>

      <button
        type="submit"
        className="auth-submit-btn"
        disabled={loading || !!rateLimited || !email || !password}
      >
        <span className="btn-glow-layer" />
        {loading ? (
          <><Loader2 size={18} className="spin" /> Signing in…</>
        ) : (
          <>
            <span>Sign In</span>
            <ArrowRight size={17} className="btn-icon-arrow" />
          </>
        )}
      </button>

      <div className="auth-switch">
        Don't have an account?{" "}
        <button type="button" onClick={onSwitch}>Create one</button>
      </div>
    </form>
  );
}

// ─────────────────────────────────────────────────────────────
// Forgot Password Form
// ─────────────────────────────────────────────────────────────
function ForgotForm({ onBack }: { onBack: () => void }) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateEmail(email)) {
      setError("Please enter a valid email address.");
      return;
    }
    setLoading(true);
    setError("");
    await forgotPassword(email);
    setLoading(false);
    setSent(true);
  };

  if (sent) {
    return (
      <div className="auth-form auth-form-center">
        <div className="auth-success-icon pulse">
          <Mail size={32} />
        </div>
        <h2 className="auth-card-title">Check your inbox</h2>
        <p className="auth-success-sub">
          If an account exists for <strong>{email}</strong>, a password reset link has been dispatched.
          The link expires in <strong>1 hour</strong>.
        </p>
        <div className="auth-helper-note">
          Didn't receive it? Check spam folder or{" "}
          <button type="button" className="auth-link-inline" onClick={() => setSent(false)}>
            try again
          </button>.
        </div>
        <button type="button" className="auth-back-btn" onClick={onBack}>
          <ChevronLeft size={16} />
          <span>Back to login</span>
        </button>
      </div>
    );
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit} noValidate>
      <div className="auth-form-header">
        <h2 className="auth-card-title">Reset password</h2>
        <p className="auth-card-sub">Enter your email and we'll send a cryptographic recovery link.</p>
      </div>

      {error && (
        <div className="auth-banner error">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      <FormField
        id="forgot-email"
        label="Email Address"
        type="email"
        placeholder="you@example.com"
        value={email}
        onChange={setEmail}
        icon={Mail}
        autoComplete="email"
      />

      <button type="submit" className="auth-submit-btn" disabled={loading || !email}>
        <span className="btn-glow-layer" />
        {loading ? (
          <><Loader2 size={18} className="spin" /> Sending reset link…</>
        ) : (
          <>
            <span>Send Reset Link</span>
            <ArrowRight size={17} className="btn-icon-arrow" />
          </>
        )}
      </button>

      <button type="button" className="auth-back-btn" onClick={onBack}>
        <ChevronLeft size={16} />
        <span>Back to login</span>
      </button>
    </form>
  );
}

// ─────────────────────────────────────────────────────────────
// Reset Password Form
// ─────────────────────────────────────────────────────────────
function ResetForm({ token, onSuccess }: { token: string; onSuccess: (user: AuthUser) => void }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [globalError, setGlobalError] = useState("");
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const touch = (field: string) => setTouched((p) => ({ ...p, [field]: true }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ password: true, confirm: true });

    if (!validatePasswordStrength(password)) {
      setErrors({ password: "Password doesn't meet requirements." });
      return;
    }
    if (password !== confirm) {
      setErrors({ confirm: "Passwords do not match." });
      return;
    }

    setLoading(true);
    setGlobalError("");
    const res = await resetPassword({ token, password, confirm_password: confirm });
    setLoading(false);

    if (res.success && res.user_id) {
      onSuccess({
        user_id: res.user_id,
        email: res.email!,
        is_admin: res.is_admin!,
        is_email_verified: true,
        wallet_address: res.wallet_address!,
      });
    } else if (res.field) {
      setErrors({ [res.field]: res.error! });
    } else {
      setGlobalError(res.error || "Reset failed. The link may have expired.");
    }
  };

  return (
    <form className="auth-form" onSubmit={handleSubmit} noValidate>
      <div className="auth-form-header">
        <h2 className="auth-card-title">Set new password</h2>
        <p className="auth-card-sub">Choose a secure password to protect your wallet assets</p>
      </div>

      {globalError && (
        <div className="auth-banner error">
          <AlertCircle size={16} />
          <span>{globalError}</span>
        </div>
      )}

      <FormField
        id="reset-pw"
        label="New Password"
        type="password"
        placeholder="Enter new password"
        value={password}
        onChange={setPassword}
        onBlur={() => touch("password")}
        error={errors.password}
        icon={Lock}
        autoComplete="new-password"
      />

      {password && <PasswordStrengthBar password={password} />}

      <FormField
        id="reset-confirm"
        label="Confirm New Password"
        type="password"
        placeholder="Re-type new password"
        value={confirm}
        onChange={setConfirm}
        onBlur={() => touch("confirm")}
        error={errors.confirm}
        icon={Lock}
        autoComplete="new-password"
      />

      <button
        type="submit"
        className="auth-submit-btn"
        disabled={loading || !validatePasswordStrength(password) || password !== confirm}
      >
        <span className="btn-glow-layer" />
        {loading ? (
          <><Loader2 size={18} className="spin" /> Updating password…</>
        ) : (
          <>
            <span>Reset Password</span>
            <ArrowRight size={17} className="btn-icon-arrow" />
          </>
        )}
      </button>
    </form>
  );
}

// ─────────────────────────────────────────────────────────────
// Verify Pending Screen (after signup)
// ─────────────────────────────────────────────────────────────
function VerifyPendingScreen({ email, seedPhrase, onResend, onBackToLogin }: {
  email: string;
  seedPhrase: string;
  onResend: () => void;
  onBackToLogin?: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [seedSaved, setSeedSaved] = useState(false);
  const [resendStatus, setResendStatus] = useState<string>("");

  const copySeed = () => {
    copyToClipboard(seedPhrase);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleResendClick = async () => {
    setResendStatus("Sending...");
    await onResend();
    setResendStatus("Verification email resent!");
    setTimeout(() => setResendStatus(""), 4000);
  };

  return (
    <div className="auth-form auth-form-center">
      <div className="auth-success-icon pulse">
        <Mail size={34} />
      </div>
      <h2 className="auth-card-title">Verify your email</h2>
      <p className="auth-success-sub">
        We sent an activation link to <strong>{email || "your inbox"}</strong>.<br />
        Click the link to activate your decentralized trading account.
      </p>

      {seedPhrase && (
        <div className="seed-phrase-box">
          <div className="seed-phrase-header">
            <Shield size={16} className="text-amber" />
            <strong>YOUR 12-WORD RECOVERY PHRASE</strong>
          </div>
          <p className="seed-phrase-warning">
            ⚠️ This recovery phrase is shown <strong>once only</strong>. Write it down offline.
            If you lose it, neither Axiom nor anyone else can recover your funds.
          </p>
          <div className="seed-phrase-words">
            {seedPhrase.split(" ").map((word, i) => (
              <span key={i} className="seed-word">
                <span className="seed-num">{i + 1}</span>
                <span className="seed-text">{word}</span>
              </span>
            ))}
          </div>
          <div className="seed-phrase-actions">
            <button type="button" className="seed-copy-btn" onClick={copySeed}>
              {copied ? (
                <><CheckCircle2 size={15} /> Copied to clipboard!</>
              ) : (
                <><Sparkles size={15} /> Copy entire recovery phrase</>
              )}
            </button>
            <label className="auth-checkbox seed-saved-check">
              <input
                type="checkbox"
                checked={seedSaved}
                onChange={(e) => setSeedSaved(e.target.checked)}
              />
              <span className="auth-checkmark" />
              <span className="auth-checkbox-label">I have safely recorded my recovery phrase offline</span>
            </label>
          </div>
        </div>
      )}

      {resendStatus ? (
        <div className="resend-feedback-msg">{resendStatus}</div>
      ) : (
        <button type="button" className="auth-link-btn" onClick={handleResendClick}>
          Didn't receive email? Resend verification
        </button>
      )}

      {onBackToLogin && (
        <div style={{ marginTop: 20, width: "100%" }}>
          <button
            type="button"
            className="auth-submit-btn"
            onClick={onBackToLogin}
          >
            <span>Return to Sign In</span>
            <ArrowRight size={17} className="btn-icon-arrow" />
          </button>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Main AuthPage Component
// ─────────────────────────────────────────────────────────────
export function AuthPage({ onAuth, initialView = "login", resetToken }: AuthPageProps) {
  const [view, setView] = useState<AuthView>(initialView);
  const [pendingEmail, setPendingEmail] = useState("");
  const [pendingSeed, setPendingSeed] = useState("");

  // Handle URL reset token
  useEffect(() => {
    if (resetToken && initialView === "reset") {
      setView("reset");
    }
  }, [resetToken, initialView]);

  // Handle email verification token from URL ?token=TOKEN&mode=verify
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const vToken = params.get("token");
    const mode = params.get("mode");
    if (vToken && mode === "verify") {
      verifyEmail(vToken).then((res) => {
        if (res.success && res.user_id) {
          onAuth({
            user_id: res.user_id,
            email: res.email!,
            full_name: res.full_name,
            is_admin: res.is_admin!,
            is_email_verified: true,
            wallet_address: res.wallet_address!,
          });
        }
      });
    }
  }, [onAuth]);

  const handleSignupSuccess = (seedPhrase: string, email: string) => {
    setPendingSeed(seedPhrase);
    setPendingEmail(email);
    setView("verify-pending");
  };

  const handleLoginSuccess = (user: AuthUser) => {
    onAuth(user);
  };

  const handleResendVerification = async () => {
    if (pendingEmail) {
      await resendVerification(pendingEmail);
    }
  };

  const showTabs = view === "login" || view === "signup";
  const { toggleTheme, isLight } = useTheme();

  return (
    <div className="auth-page-container">
      {/* Mobile-Only Topbar */}
      <header className="auth-mobile-header">
        <div className="brand-logo">
          <div className="brand-logo-icon">A</div>
          <span className="brand-logo-text">AXIOM</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            type="button"
            className="auth-theme-toggle"
            onClick={toggleTheme}
            title={isLight ? "Switch to Dark Mode" : "Switch to Light Mode"}
            aria-label={isLight ? "Switch to Dark Mode" : "Switch to Light Mode"}
          >
            {isLight ? <Moon size={16} /> : <Sun size={16} />}
          </button>
          <div className="brand-badge-live">
            <span className="live-dot" />
            <span>SOLANA</span>
          </div>
        </div>
      </header>

      {/* Split-Screen: Left Branding Showcase (Desktop) */}
      <BrandingPanel view={view} />

      {/* Split-Screen: Right Authentication Form Panel */}
      <main className="auth-form-panel">
        {/* Desktop Theme toggle on form side */}
        <div style={{ position: "absolute", top: 24, right: 28, zIndex: 30 }}>
          <button
            type="button"
            className="auth-theme-toggle"
            onClick={toggleTheme}
            title={isLight ? "Switch to Dark Mode" : "Switch to Light Mode"}
            aria-label={isLight ? "Switch to Dark Mode" : "Switch to Light Mode"}
          >
            {isLight ? <Moon size={16} /> : <Sun size={16} />}
          </button>
        </div>

        {/* Ambient atmospheric lighting behind card */}
        <div className="auth-panel-glow auth-panel-glow-1" />
        <div className="auth-panel-glow auth-panel-glow-2" />

        <div className="auth-card-wrap">
          {/* Mobile Hero Teaser (< 900px) */}
          <div className="auth-mobile-teaser">
            <h2 className="mobile-teaser-title">
              Trade Smarter. <span className="brand-headline-gradient">Trade Faster.</span>
            </h2>
            <div className="mobile-teaser-stats">
              <span className="stat-chip">🚀 $2.48M 24h Vol</span>
              <span className="stat-chip">⚡ &lt; 45ms Swaps</span>
              <span className="stat-chip">🛡️ Non-Custodial</span>
            </div>
          </div>

          {/* Premium Glassmorphic Card */}
          <div className="auth-glass-card">
            {/* Seamless Segmented Switcher Tabs */}
            {showTabs && (
              <div className="auth-segmented-tabs" role="tablist">
                <button
                  type="button"
                  role="tab"
                  aria-selected={view === "login"}
                  className={`auth-segment-tab ${view === "login" ? "active" : ""}`}
                  onClick={() => setView("login")}
                >
                  <span>Sign In</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={view === "signup"}
                  className={`auth-segment-tab ${view === "signup" ? "active" : ""}`}
                  onClick={() => setView("signup")}
                >
                  <span>Create Account</span>
                </button>
              </div>
            )}

            {/* Active View Form */}
            <div className="auth-view-content">
              {view === "login" && (
                <LoginForm
                  onSuccess={handleLoginSuccess}
                  onSwitch={() => setView("signup")}
                  onForgot={() => setView("forgot")}
                />
              )}
              {view === "signup" && (
                <SignUpForm
                  onSuccess={handleSignupSuccess}
                  onSwitch={() => setView("login")}
                />
              )}
              {view === "forgot" && (
                <ForgotForm onBack={() => setView("login")} />
              )}
              {view === "reset" && resetToken && (
                <ResetForm
                  token={resetToken}
                  onSuccess={handleLoginSuccess}
                />
              )}
              {view === "verify-pending" && (
                <VerifyPendingScreen
                  email={pendingEmail}
                  seedPhrase={pendingSeed}
                  onResend={handleResendVerification}
                  onBackToLogin={() => setView("login")}
                />
              )}
            </div>

            {/* Card Security Trust Footer */}
            <div className="auth-card-footer">
              <div className="footer-shield-item">
                <Shield size={12} className="footer-shield-icon" />
                <span>AES-256 Encrypted & Non-Custodial</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
