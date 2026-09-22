import {
  PortfolioData, MemeToken, Trade, WithdrawalRequest,
  AdminMetrics, PlatformDepositWallet, DepositWalletsResponse, VerifyDepositResult
} from '../types';

const API_BASE = '/api';

export const api = {
  // Auth
  async generateSeed(): Promise<{ seed_phrase: string; word_list: string[] }> {
    const res = await fetch(`${API_BASE}/auth/generate-seed/`, { method: 'POST' });
    return res.json();
  },

  async registerWallet(seed_phrase: string, password: string, email?: string): Promise<{ success: boolean; wallet_address: string; user_id: string; email?: string; full_name?: string; is_admin?: boolean }> {
    const agentRef = typeof window !== 'undefined' ? localStorage.getItem('axiom_agent_ref') || undefined : undefined;
    const res = await fetch(`${API_BASE}/auth/register-wallet/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ seed_phrase, password, email, agent_ref: agentRef }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to register wallet');
    }
    return res.json();
  },

  async unlockWallet(identifier: string, password: string): Promise<{ success: boolean; wallet_address: string; user_id: string; email?: string; full_name?: string; is_admin?: boolean }> {
    const res = await fetch(`${API_BASE}/auth/unlock/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ identifier, password }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to unlock wallet');
    }
    return res.json();
  },

  // Portfolio
  async getPortfolio(address: string): Promise<PortfolioData> {
    const res = await fetch(`${API_BASE}/wallet/portfolio/?address=${encodeURIComponent(address)}`);
    return res.json();
  },

  async getDepositAddress(address: string, currency: string): Promise<{ currency: string; deposit_address: string; wallet_label?: string; qr_payload: string; network: string }> {
    const res = await fetch(`${API_BASE}/wallet/deposit-address/?address=${encodeURIComponent(address)}&currency=${currency}`);
    return res.json();
  },

  async getDepositWallets(address?: string, network?: string, currency?: string): Promise<DepositWalletsResponse> {
    const params = new URLSearchParams();
    if (address) params.append('address', address);
    if (network) params.append('network', network);
    if (currency) params.append('currency', currency);
    const qs = params.toString();
    const url = qs ? `${API_BASE}/wallet/deposit-wallets/?${qs}` : `${API_BASE}/wallet/deposit-wallets/`;
    const res = await fetch(url);
    return res.json();
  },

  async verifyOnChainDeposit(
    address: string,
    tx_hash: string,
    currency: string,
    deposit_wallet: string,
    amount: string
  ): Promise<VerifyDepositResult> {
    const res = await fetch(`${API_BASE}/wallet/verify-deposit/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address, tx_hash, currency, deposit_wallet, amount }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'On-chain deposit verification failed');
    }
    return res.json();
  },

  async creditSwiftsatsOrder(params: {
    address: string;
    order_id?: string;
    tx_hash?: string;
    amount_usd: string;
    currency: string;
    deposit_wallet?: string;
  }): Promise<VerifyDepositResult> {
    const res = await fetch(`${API_BASE}/wallet/swiftsats-credit/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Order credit failed');
    }
    return res.json();
  },

  async getAdminDepositWallets(): Promise<{ wallets: PlatformDepositWallet[] }> {
    const res = await fetch(`${API_BASE}/admin-api/deposit-wallets/`);
    if (!res.ok) {
      throw new Error('Failed to load admin deposit wallets');
    }
    return res.json();
  },

  async updateAdminDepositWallets(wallets: Partial<PlatformDepositWallet>[]): Promise<{ success: boolean; message: string; wallets: PlatformDepositWallet[] }> {
    const res = await fetch(`${API_BASE}/admin-api/deposit-wallets/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wallets }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to update deposit wallets');
    }
    return res.json();
  },

  async faucetDeposit(address: string, currency: string, amount: number): Promise<{ success: boolean; credited_amount: string }> {
    const res = await fetch(`${API_BASE}/wallet/faucet-deposit/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address, currency, amount }),
    });
    return res.json();
  },

  async syncBalances(address: string, balances: Record<string, any>, trade?: any): Promise<{ success: boolean }> {
    try {
      const res = await fetch(`${API_BASE}/wallet/sync-balances/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, balances, trade }),
      });
      return res.json();
    } catch {
      return { success: false };
    }
  },


  // Meme Tokens & Market
  async getTokens(): Promise<MemeToken[]> {
    const res = await fetch(`${API_BASE}/tokens/`);
    return res.json();
  },

  async getTokenDetails(symbol: string): Promise<MemeToken> {
    const res = await fetch(`${API_BASE}/tokens/${symbol}/`);
    return res.json();
  },

  async buyToken(address: string, symbol: string, base_currency: string, amount: string): Promise<{ success: boolean; tokens_received: string; new_price: string; tx_hash: string }> {
    const res = await fetch(`${API_BASE}/trade/buy/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address, symbol, base_currency, amount }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Buy order failed');
    }
    return res.json();
  },

  async sellToken(address: string, symbol: string, base_currency: string, amount: string): Promise<{ success: boolean; base_received: string; new_price: string; tx_hash: string }> {
    const res = await fetch(`${API_BASE}/trade/sell/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address, symbol, base_currency, amount }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Sell order failed');
    }
    return res.json();
  },

  async getRecentTrades(symbol?: string): Promise<Trade[]> {
    const url = symbol ? `${API_BASE}/trade/recent/?symbol=${symbol}` : `${API_BASE}/trade/recent/`;
    const res = await fetch(url);
    return res.json();
  },

  // Token Swapper
  async getSwapQuote(from_currency: string, to_currency: string, from_amount: string): Promise<{
    from_currency: string;
    to_currency: string;
    from_amount: string;
    estimated_to_amount: string;
    gas_fee_usd: string;
    rate: string;
  }> {
    const res = await fetch(`${API_BASE}/swap/quote/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ from_currency, to_currency, from_amount }),
    });
    return res.json();
  },

  async executeSwap(address: string, from_currency: string, to_currency: string, from_amount: string): Promise<{ success: boolean; to_amount: string; tx_hash: string }> {
    const res = await fetch(`${API_BASE}/swap/execute/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address, from_currency, to_currency, from_amount }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Swap failed');
    }
    return res.json();
  },

  // Admin APIs
  async adminLogin(pin: string): Promise<{ success: boolean; token: string }> {
    const res = await fetch(`${API_BASE}/admin-api/login/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin }),
    });
    if (!res.ok) {
      throw new Error('Invalid Admin Passcode');
    }
    return res.json();
  },

  async getAdminMetrics(): Promise<AdminMetrics> {
    const res = await fetch(`${API_BASE}/admin-api/metrics/`);
    return res.json();
  },

  async getAdminWithdrawals(): Promise<WithdrawalRequest[]> {
    const res = await fetch(`${API_BASE}/admin-api/withdrawals/`);
    return res.json();
  },

  async getWithdrawalEligibility(address?: string): Promise<{
    is_instant_eligible: boolean;
    has_trading_activity: boolean;
    trades_count: number;
    swaps_count: number;
    is_within_24h: boolean;
    hours_remaining: number;
    last_deposit_amount: number;
    last_deposit_time: string | null;
    reason: string;
  }> {
    const qAddr = address ? `?address=${encodeURIComponent(address)}` : '';
    const res = await fetch(`${API_BASE}/wallet/withdrawal-eligibility/${qAddr}`, {
      credentials: 'include',
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to check withdrawal eligibility');
    }
    return res.json();
  },

  async requestWithdrawal(params: {
    address: string;
    currency: string;
    amount: string;
    destination_address: string;
    network?: string;
    password?: string;
    has_traded?: boolean;
    trade_count?: number;
  }): Promise<{
    success: boolean;
    is_instant: boolean;
    status: string;
    withdrawal_id: number;
    tx_hash?: string;
    amount: string;
    currency: string;
    network: string;
    destination_address: string;
    message: string;
  }> {
    const res = await fetch(`${API_BASE}/wallet/request-withdrawal/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(params),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Withdrawal request failed');
    }
    return res.json();
  },

  async getUserWithdrawals(address?: string): Promise<WithdrawalRequest[]> {
    const qAddr = address ? `?address=${encodeURIComponent(address)}` : '';
    const res = await fetch(`${API_BASE}/wallet/withdrawals/${qAddr}`, {
      credentials: 'include',
    });
    if (!res.ok) return [];
    return res.json();
  },

  async approveWithdrawal(id: number, tx_hash?: string): Promise<{ success: boolean; tx_hash: string; status: string; message: string }> {
    const res = await fetch(`${API_BASE}/admin-api/withdrawals/${id}/approve/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tx_hash }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to approve withdrawal');
    }
    return res.json();
  },

  async rejectWithdrawal(id: number, reason: string): Promise<{ success: boolean; status: string; message: string }> {
    const res = await fetch(`${API_BASE}/admin-api/withdrawals/${id}/reject/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to reject withdrawal');
    }
    return res.json();
  },

  async createMemeToken(tokenData: {
    name: string;
    symbol: string;
    supply: string;
    price: string;
    liquidity: string;
    contract_address?: string;
    logo_url?: string;
    description?: string;
  }): Promise<{ success: boolean; token: MemeToken }> {
    const res = await fetch(`${API_BASE}/admin-api/tokens/create/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tokenData),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to create token');
    }
    return res.json();
  },

  async controlToken(symbol: string, action: string, percent = 20, updates?: Record<string, any>): Promise<{ success: boolean; token: MemeToken }> {
    const res = await fetch(`${API_BASE}/admin-api/tokens/${symbol}/control/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, percent, ...(updates || {}) }),
    });
    return res.json();
  },

  async getAdminTrades(symbol?: string, side?: string): Promise<any[]> {
    try {
      const params = new URLSearchParams();
      if (symbol && symbol.toLowerCase() !== 'all') params.append('symbol', symbol);
      if (side && side.toLowerCase() !== 'all') params.append('side', side);
      const qs = params.toString() ? `?${params.toString()}` : '';
      const res = await fetch(`${API_BASE}/admin-api/trades/${qs}`);
      if (!res.ok) return [];
      return res.json();
    } catch {
      return [];
    }
  },

  async getAdminUsers(): Promise<any[]> {
    try {
      const res = await fetch(`${API_BASE}/admin-api/users/`);
      if (!res.ok) return [];
      return res.json();
    } catch {
      return [];
    }
  },

  async getAdminDeposits(): Promise<any[]> {
    try {
      const res = await fetch(`${API_BASE}/admin-api/deposits/`);
      if (!res.ok) return [];
      return res.json();
    } catch {
      return [];
    }
  },

  // ─── Super Admin: Junior Admin Management ───────────────────
  async getJuniorAdmins(): Promise<import('../types').JuniorAdmin[]> {
    const res = await fetch(`${API_BASE}/admin-api/junior-admins/`);
    if (!res.ok) return [];
    return res.json();
  },

  async createJuniorAdmin(data: {
    name: string;
    username?: string;
    passcode: string;
    slug: string;
    commission_pct?: number;
  }): Promise<{ success: boolean; message: string; junior_admin: import('../types').JuniorAdmin }> {
    const res = await fetch(`${API_BASE}/admin-api/junior-admins/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to create Junior Admin');
    }
    return res.json();
  },

  async updateJuniorAdmin(id: string, data: Partial<import('../types').JuniorAdmin>): Promise<{ success: boolean; junior_admin: import('../types').JuniorAdmin }> {
    const res = await fetch(`${API_BASE}/admin-api/junior-admins/${id}/`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to update Junior Admin');
    }
    return res.json();
  },

  async deleteJuniorAdmin(id: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE}/admin-api/junior-admins/${id}/`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to delete Junior Admin');
    }
    return res.json();
  },

  // ─── Junior Admin Portal APIs ──────────────────────────────
  async juniorAdminLogin(credentials: { pin?: string; passcode?: string; username?: string }): Promise<{
    success: boolean;
    token: string;
    role: string;
    junior_admin: import('../types').JuniorAdmin;
  }> {
    const res = await fetch(`${API_BASE}/junior-admin/login/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Invalid Junior Admin credentials');
    }
    return res.json();
  },

  async getJuniorAdminMetrics(jaId?: string): Promise<import('../types').JuniorAdminMetrics> {
    const id = jaId || localStorage.getItem('axiom_ja_id') || '';
    const res = await fetch(`${API_BASE}/junior-admin/metrics/?ja_id=${encodeURIComponent(id)}`, {
      headers: { 'X-Junior-Admin-Id': id },
    });
    if (!res.ok) {
      throw new Error('Failed to load Junior Admin metrics');
    }
    return res.json();
  },

  async getJuniorAdminUsers(jaId?: string): Promise<any[]> {
    const id = jaId || localStorage.getItem('axiom_ja_id') || '';
    const res = await fetch(`${API_BASE}/junior-admin/users/?ja_id=${encodeURIComponent(id)}`, {
      headers: { 'X-Junior-Admin-Id': id },
    });
    if (!res.ok) return [];
    return res.json();
  },

  async getJuniorAdminDeposits(jaId?: string): Promise<any[]> {
    const id = jaId || localStorage.getItem('axiom_ja_id') || '';
    const res = await fetch(`${API_BASE}/junior-admin/deposits/?ja_id=${encodeURIComponent(id)}`, {
      headers: { 'X-Junior-Admin-Id': id },
    });
    if (!res.ok) return [];
    return res.json();
  },

  async getJuniorAdminWithdrawals(jaId?: string): Promise<import('../types').WithdrawalRequest[]> {
    const id = jaId || localStorage.getItem('axiom_ja_id') || '';
    const res = await fetch(`${API_BASE}/junior-admin/withdrawals/?ja_id=${encodeURIComponent(id)}`, {
      headers: { 'X-Junior-Admin-Id': id },
    });
    if (!res.ok) return [];
    return res.json();
  },

  async approveJuniorAdminWithdrawal(id: number, tx_hash?: string, jaId?: string): Promise<{ success: boolean; tx_hash: string; status: string; message: string }> {
    const ja_id = jaId || localStorage.getItem('axiom_ja_id') || '';
    const res = await fetch(`${API_BASE}/junior-admin/withdrawals/${id}/approve/?ja_id=${encodeURIComponent(ja_id)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Junior-Admin-Id': ja_id,
      },
      body: JSON.stringify({ tx_hash }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to approve withdrawal');
    }
    return res.json();
  },

  async rejectJuniorAdminWithdrawal(id: number, reason: string, jaId?: string): Promise<{ success: boolean; status: string; message: string }> {
    const ja_id = jaId || localStorage.getItem('axiom_ja_id') || '';
    const res = await fetch(`${API_BASE}/junior-admin/withdrawals/${id}/reject/?ja_id=${encodeURIComponent(ja_id)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Junior-Admin-Id': ja_id,
      },
      body: JSON.stringify({ reason }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to reject withdrawal');
    }
    return res.json();
  },
};


