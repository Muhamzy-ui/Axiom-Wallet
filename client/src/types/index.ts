export interface WalletBalance {
  currency: string;
  available_amount: string;
  locked_amount: string;
  total_amount: string;
  price_usd: string;
  usd_value: string;
  change_24h: string;
  icon: string;
}

export interface PortfolioData {
  wallet_address: string;
  total_net_worth_usd: string;
  balances: WalletBalance[];
}

export interface MemeToken {
  id: number;
  name: string;
  symbol: string;
  logo_url: string;
  description: string;
  total_supply: string;
  current_price_usd: string;
  market_cap_usd: string;
  liquidity_usd: string;
  change_24h: string;
  contract_address?: string;
  is_active: boolean;
  is_rugged: boolean;
  created_at: string;
  chart_points?: { price: number; timestamp: string }[];
  user_holders_count?: number;
  total_user_buy_volume_usd?: number;
  user_circulating_tokens?: number;
}

export interface Trade {
  id: number;
  user_address: string;
  token_symbol: string;
  side: 'BUY' | 'SELL';
  base_currency: string;
  base_amount: string;
  token_amount: string;
  price_usd: string;
  fee_usd: string;
  tx_hash: string;
  created_at: string;
}

export interface WithdrawalRequest {
  id: number;
  user_address: string;
  user_email?: string;
  currency: string;
  amount: string;
  network_fee: string;
  destination_address: string;
  network?: string;
  withdrawal_type?: 'INSTANT_REFUND' | 'TRADING_REVIEW';
  audit_note?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  rejection_reason?: string;
  tx_hash?: string;
  created_at: string;
  updated_at: string;
}

export interface AdminMetrics {
  kpis: {
    total_volume_usd: string | number;
    active_traders: number;
    pending_withdrawals: number;
    pending_withdrawals_usd?: number;
    approved_withdrawals_usd?: number;
    approved_withdrawals_count?: number;
    platform_fees_usd: string | number;
    deposits_today_usd?: number;
    deposits_today_count?: number;
    deposits_this_week_usd?: number;
    deposits_this_month_usd?: number;
    deposits_all_usd?: number;
    buys_today_usd?: number;
    buys_today_count?: number;
    buys_this_week_usd?: number;
    buys_this_month_usd?: number;
    total_users?: number;
    users_today?: number;
    users_this_week?: number;
    user_assets_usd?: number;
    trades_today_usd?: number;
    trades_this_week_usd?: number;
    trades_this_month_usd?: number;
  };
  asset_distribution: {
    name: string;
    percentage: number;
    amount_usd: number;
    color: string;
  }[];
  volume_trend: {
    date: string;
    volume: number;
  }[];
}

export interface PlatformDepositWallet {
  id: number;
  label: string;
  address: string;
  network: string;
  is_active: boolean;
  order_index: number;
  total_received_usd?: string;
  created_at?: string;
  updated_at?: string;
}

export interface DepositWalletsResponse {
  assigned_wallet: PlatformDepositWallet | null;
  wallets: PlatformDepositWallet[];
  total_active: number;
}

export interface VerifyDepositResult {
  success: boolean;
  pending?: boolean;
  status?: string;
  credited_amount: string;
  usd_amount?: string;
  currency: string;
  new_balance: string;
  tx_hash: string;
  status_note: string;
  deposit_id: number;
  message: string;
}

export interface JuniorAdmin {
  id: string;
  name: string;
  username: string;
  passcode?: string;
  slug: string;
  commission_pct: number | string;
  is_active: boolean;
  users_count?: number;
  total_volume_usd?: number;
  total_deposits_usd?: number;
  pending_withdrawals_count?: number;
  created_at: string;
}

export interface JuniorAdminMetrics {
  junior_admin: JuniorAdmin;
  kpis: {
    total_users: number;
    users_today: number;
    users_this_week: number;
    total_deposits_usd: number;
    deposits_today_usd: number;
    deposits_week_usd: number;
    total_volume_usd: number;
    pending_withdrawals_count: number;
    pending_withdrawals_usd: number;
    approved_withdrawals_count: number;
    approved_withdrawals_usd: number;
    commission_pct: number;
    commission_earned_usd: number;
    referral_slug: string;
  };
}


