/**
 * authService.ts
 * Handles all authentication API calls.
 * Tokens are stored in httpOnly cookies (set by server) — NOT localStorage.
 *
 * SESSION PERSISTENCE:
 * - Access token: 60 minutes (httpOnly cookie)
 * - Refresh token: 30 days (httpOnly cookie, set with remember_me=true)
 * - On 401, we automatically try to refresh the access token before giving up.
 */

const API_BASE = (import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL.replace(/\/$/, '')}/api` : '/api');

// Attempt to silently refresh the access token using the refresh cookie
async function tryRefreshToken(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/auth/refresh/`, {
      method: 'POST',
      credentials: 'include',
    });
    return res.ok;
  } catch {
    return false;
  }
}

export interface AuthUser {
  user_id: string;
  email: string;
  full_name?: string;
  is_admin: boolean;
  is_email_verified: boolean;
  wallet_address: string;
}

export interface AuthResponse {
  success: boolean;
  message?: string;
  error?: string;
  field?: string;
  rate_limited?: boolean;
  retry_after_minutes?: number;
  user_id?: string;
  email?: string;
  full_name?: string;
  is_admin?: boolean;
  is_email_verified?: boolean;
  wallet_address?: string;
  seed_phrase?: string;
}

async function apiPost(path: string, body: Record<string, unknown>): Promise<AuthResponse> {
  try {
    const response = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include', // Send + receive httpOnly cookies
      body: JSON.stringify(body),
    });
    const text = await response.text();
    let data: any;
    try {
      data = JSON.parse(text);
    } catch {
      return {
        success: false,
        error: `Server communication error (${response.status}). Please ensure the backend is running.`,
      };
    }
    if (!response.ok && !data.success) {
      // Normalize error shape
      return { success: false, ...data };
    }
    return data;
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Network error connecting to backend service.',
    };
  }
}

async function apiGet(path: string): Promise<AuthResponse & { authenticated?: boolean }> {
  try {
    let response = await fetch(`${API_BASE}${path}`, {
      method: 'GET',
      credentials: 'include',
    });

    // If 401 (access token expired), try to silently refresh and retry once
    if (response.status === 401) {
      const refreshed = await tryRefreshToken();
      if (refreshed) {
        response = await fetch(`${API_BASE}${path}`, {
          method: 'GET',
          credentials: 'include',
        });
      } else {
        return { success: false, authenticated: false, message: 'Not authenticated' };
      }
    }

    if (!response.ok) {
      return { success: false, authenticated: false };
    }

    const text = await response.text();
    try {
      return JSON.parse(text);
    } catch {
      return { success: false, authenticated: false };
    }
  } catch (_err) {
    return { success: false, authenticated: false };
  }
}

// ── Sign Up ─────────────────────────────────────────────────────────────────
export async function signUp(params: {
  full_name: string;
  email: string;
  password: string;
  confirm_password: string;
  accepted_terms: boolean;
  agent_ref?: string;
}): Promise<AuthResponse> {
  const agentRef = params.agent_ref || (typeof window !== 'undefined' ? localStorage.getItem('axiom_agent_ref') || undefined : undefined);
  return apiPost('/auth/signup/', { ...params, agent_ref: agentRef });
}


// ── Email Verification ───────────────────────────────────────────────────────
export async function verifyEmail(token: string): Promise<AuthResponse> {
  return apiPost('/auth/verify-email/', { token });
}

export async function resendVerification(email: string): Promise<AuthResponse> {
  return apiPost('/auth/resend-verification/', { email });
}

// ── Login ────────────────────────────────────────────────────────────────────
export async function login(params: {
  email: string;
  password: string;
  remember_me: boolean;
}): Promise<AuthResponse> {
  return apiPost('/auth/login/', params);
}

// ── Logout ───────────────────────────────────────────────────────────────────
export async function logout(): Promise<void> {
  await apiPost('/auth/logout/', {});
}

// ── Session check ────────────────────────────────────────────────────────────
export async function getMe(): Promise<AuthUser | null> {
  try {
    const data = await apiGet('/auth/me/');
    if (data.authenticated && data.user_id) {
      return {
        user_id: data.user_id!,
        email: data.email!,
        full_name: data.full_name,
        is_admin: data.is_admin!,
        is_email_verified: data.is_email_verified!,
        wallet_address: data.wallet_address!,
      };
    }
    return null;
  } catch {
    return null;
  }
}

// ── Forgot Password ──────────────────────────────────────────────────────────
export async function forgotPassword(email: string): Promise<AuthResponse> {
  return apiPost('/auth/forgot-password/', { email });
}

// ── Change Password ──────────────────────────────────────────────────────────
export async function changePassword(params: {
  current_password: string;
  new_password: string;
  confirm_password: string;
}): Promise<AuthResponse> {
  return apiPost('/auth/change-password/', params);
}

// ── Reset Password ───────────────────────────────────────────────────────────
export async function resetPassword(params: {
  token: string;
  password: string;
  confirm_password: string;
}): Promise<AuthResponse> {
  return apiPost('/auth/reset-password/', params);
}

// ── Password strength ────────────────────────────────────────────────────────
export type PasswordStrength = 'weak' | 'medium' | 'strong';

export function getPasswordStrength(password: string): PasswordStrength {
  if (!password) return 'weak';
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;
  if (score <= 2) return 'weak';
  if (score <= 4) return 'medium';
  return 'strong';
}

export function validatePasswordStrength(password: string): boolean {
  return (
    password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /[0-9]/.test(password) &&
    /[^a-zA-Z0-9]/.test(password)
  );
}

export function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ── Phantom Wallet Core Operations ──────────────────────────────────────────
export async function generateSeedPhrase(): Promise<{ seed_phrase: string; word_list: string[] }> {
  const res = await fetch(`${API_BASE}/auth/generate-seed/`, { method: 'POST' });
  if (!res.ok) {
    throw new Error('Failed to generate secure seed phrase');
  }
  return res.json();
}

export async function registerPhantomWallet(params: {
  seed_phrase: string;
  password: string;
  agent_ref?: string;
}): Promise<AuthResponse> {
  const agentRef = params.agent_ref || (typeof window !== 'undefined' ? localStorage.getItem('axiom_agent_ref') || undefined : undefined);
  return apiPost('/auth/register-wallet/', {
    seed_phrase: params.seed_phrase,
    password: params.password,
    agent_ref: agentRef,
  });
}

export async function unlockPhantomWallet(params: {
  password: string;
  wallet_address?: string;
}): Promise<AuthResponse> {
  const walletAddress = params.wallet_address || getStoredWalletAddress() || '';
  return apiPost('/auth/unlock/', {
    wallet_address: walletAddress,
    password: params.password,
  });
}

export function getStoredWalletAddress(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('axiom_wallet_address');
}

export function setStoredWalletAddress(address: string): void {
  if (typeof window !== 'undefined' && address) {
    localStorage.setItem('axiom_wallet_address', address);
  }
}

export function clearStoredWalletAddress(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('axiom_wallet_address');
  }
}
