import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  LayoutDashboard, Coins, Users, ArrowDownToLine, Clock,
  Activity, Settings, Bell, Search, LogOut, ChevronDown,
  Plus, Check, X, RefreshCw,
  DollarSign, AlertTriangle, Zap, Filter,
  ChevronLeft, ChevronRight, ArrowUpRight,
  ArrowDownRight, ToggleLeft, ToggleRight, Save, Layers,
  Globe, Lock, BarChart2, Shield, Skull, TrendingUp, TrendingDown,
  Copy, RotateCcw, Sparkles, ExternalLink, Edit3,
  Sun, Moon, Menu, Smartphone, Eye, EyeOff
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import { api } from '../../services/api';
import { AdminMetrics, WithdrawalRequest, MemeToken, PlatformDepositWallet } from '../../types';
import { marketStore, MarketToken, LiveTrade } from '../../services/marketStore';
import { Sparkline } from '../common/Sparkline';
import { useTheme } from '../../services/themeContext';
import { copyToClipboard } from '../../services/clipboard';

/* ── Design tokens ─────────────────────────────────────────────── */
const C = {
  bg:      'var(--bg)',
  surface: 'var(--surface)',
  surface2:'var(--surface2)',
  surface3:'var(--surface3)',
  border:  'var(--border)',
  violet:  'var(--violet)',
  green:   'var(--green)',
  red:     'var(--red)',
  amber:   'var(--amber)',
  muted:   'var(--muted)',
  text:    'var(--text)',
};

/* ── Stub data ─────────────────────────────────────────────────── */
const STUB_METRICS: AdminMetrics = {
  kpis: {
    total_volume_usd: '1,428,500',
    active_traders: 1186,
    pending_withdrawals: 18,
    platform_fees_usd: '42,850',
  },
  asset_distribution: [
    { name: 'SOL',  percentage: 48, amount_usd: 686568, color: '#7C3AED' },
    { name: 'USDT', percentage: 32, amount_usd: 457120, color: '#10B981' },
    { name: 'ETH',  percentage: 20, amount_usd: 285700, color: '#22D1F8' },
  ],
  volume_trend: Array.from({ length: 30 }, (_, i) => ({
    date: new Date(Date.now() - (29 - i) * 86400000).toLocaleDateString('en', { month: 'short', day: 'numeric' }),
    volume: 30000 + Math.random() * 90000,
  })),
};

const STUB_WITHDRAWALS: WithdrawalRequest[] = [
  { id: 1, user_address: '0xdd33ee...#4d2343', currency: 'SOL',  amount: '0.0000', network_fee: '0.001', destination_address: '0xAbCd...1234', status: 'APPROVED', created_at: '2024-01-15T10:30:00Z', updated_at: '2024-01-15T11:00:00Z' },
  { id: 2, user_address: '0xdd34ee...#462206', currency: 'USDT', amount: '5000',   network_fee: '2.50',  destination_address: '0xEfGh...5678', status: 'PENDING',  created_at: '2024-01-15T09:15:00Z', updated_at: '2024-01-15T09:15:00Z' },
  { id: 3, user_address: '0xdd34ee...#4d2305', currency: 'ETH',  amount: '0.00',   network_fee: '0.005', destination_address: '0xIjKl...9012', status: 'PENDING',  created_at: '2024-01-15T08:45:00Z', updated_at: '2024-01-15T08:45:00Z' },
  { id: 4, user_address: '0xabc1de...#9f3421', currency: 'SOL',  amount: '125.50', network_fee: '0.001', destination_address: '0xMnOp...3456', status: 'PENDING',  created_at: '2024-01-14T22:10:00Z', updated_at: '2024-01-14T22:10:00Z' },
  { id: 5, user_address: '0xbba2ef...#7c1298', currency: 'USDT', amount: '3200',   network_fee: '2.50',  destination_address: '0xQrSt...7890', status: 'REJECTED', rejection_reason: 'KYC mismatch', created_at: '2024-01-14T18:00:00Z', updated_at: '2024-01-14T18:30:00Z' },
];

const STUB_TOKENS: MemeToken[] = [
  { id: 1, name: 'BONK',    symbol: 'BONK',  logo_url: '', description: 'The dog coin of Solana', total_supply: '100000000000000', current_price_usd: '0.00002510', market_cap_usd: '1870000000', liquidity_usd: '18400000', change_24h: '+12.64', is_active: true,  is_rugged: false, created_at: '2024-01-01T00:00:00Z' },
  { id: 2, name: 'WIF',     symbol: 'WIF',   logo_url: '', description: 'dogwifhat',               total_supply: '998926392',       current_price_usd: '0.8720',      market_cap_usd: '871000000',   liquidity_usd: '45000000',  change_24h: '-6.08',  is_active: true,  is_rugged: false, created_at: '2024-01-05T00:00:00Z' },
  { id: 3, name: 'POPCAT',  symbol: 'POPCAT',logo_url: '', description: 'Pop the cat',             total_supply: '979964160',       current_price_usd: '0.6240',      market_cap_usd: '611000000',   liquidity_usd: '28000000',  change_24h: '+3.21',  is_active: true,  is_rugged: false, created_at: '2024-01-10T00:00:00Z' },
  { id: 4, name: 'RUGTOKEN',symbol: 'RUGT',  logo_url: '', description: 'Rugged token',            total_supply: '1000000000',      current_price_usd: '0.00000001',  market_cap_usd: '10',          liquidity_usd: '100',       change_24h: '-99.9',  is_active: false, is_rugged: true,  created_at: '2024-01-12T00:00:00Z' },
];

const STUB_USERS = [
  { id: 1, address: '0xdd33ee...#4d2343', username: 'CryptoWhale', balance: '$48,230', joined: '2023-11-01', status: 'active'    },
  { id: 2, address: '0xdd34ee...#462206', username: 'MoonBoy99',   balance: '$12,840', joined: '2023-12-15', status: 'active'    },
  { id: 3, address: '0xabc1de...#9f3421', username: 'DeFiDegen',   balance: '$3,210',  joined: '2024-01-02', status: 'suspended' },
  { id: 4, address: '0xbba2ef...#7c1298', username: 'SolanaKing',  balance: '$91,000', joined: '2023-10-20', status: 'active'    },
  { id: 5, address: '0xccd3ff...#2b5512', username: 'MemeLord',    balance: '$780',    joined: '2024-01-10', status: 'active'    },
];

const STUB_DEPOSITS = [
  { id: 1, user: '0xdd33ee...#4d2343', amount: '$5,000',  token: 'USDT', date: '2024-01-15 10:30', status: 'completed' },
  { id: 2, user: '0xbba2ef...#7c1298', amount: '$22,400', token: 'SOL',  date: '2024-01-15 09:15', status: 'completed' },
  { id: 3, user: '0xccd3ff...#2b5512', amount: '$780',    token: 'ETH',  date: '2024-01-15 08:45', status: 'pending'   },
  { id: 4, user: '0xabc1de...#9f3421', amount: '$1,200',  token: 'USDT', date: '2024-01-14 22:10', status: 'failed'    },
  { id: 5, user: '0xdd34ee...#462206', amount: '$8,750',  token: 'SOL',  date: '2024-01-14 18:00', status: 'completed' },
];

const STUB_TRADES = [
  { id: 1, trader: '0xdd33ee...#4d2343', pair: 'BONK/USDT',  side: 'BUY',  amount: '2,450,000 BONK', price: '$0.000025', time: '2024-01-15 10:32' },
  { id: 2, trader: '0xbba2ef...#7c1298', pair: 'WIF/SOL',    side: 'SELL', amount: '1,200 WIF',      price: '$0.872',    time: '2024-01-15 10:28' },
  { id: 3, trader: '0xccd3ff...#2b5512', pair: 'SOL/USDT',   side: 'BUY',  amount: '45 SOL',         price: '$179.84',   time: '2024-01-15 10:15' },
  { id: 4, trader: '0xabc1de...#9f3421', pair: 'POPCAT/SOL', side: 'BUY',  amount: '800 POPCAT',     price: '$0.624',    time: '2024-01-15 10:05' },
  { id: 5, trader: '0xdd34ee...#462206', pair: 'ETH/USDT',   side: 'SELL', amount: '2.5 ETH',        price: '$3,240',    time: '2024-01-15 09:58' },
];

/* ── Shared UI primitives ──────────────────────────────────────── */
function Badge({ status }: { status: string }) {
  const m: Record<string, [string, string, string]> = {
    APPROVED:  ['Approved',       C.green, 'rgba(16,185,129,0.12)'],
    approved:  ['Approved',       C.green, 'rgba(16,185,129,0.12)'],
    completed: ['Completed',      C.green, 'rgba(16,185,129,0.12)'],
    active:    ['Active',         C.green, 'rgba(16,185,129,0.12)'],
    PENDING:   ['Pending Review', C.amber, 'rgba(245,158,11,0.12)'],
    pending:   ['Pending',        C.amber, 'rgba(245,158,11,0.12)'],
    suspended: ['Suspended',      C.amber, 'rgba(245,158,11,0.12)'],
    REJECTED:  ['Rejected',       C.red,   'rgba(239,68,68,0.12)' ],
    failed:    ['Failed',         C.red,   'rgba(239,68,68,0.12)' ],
  };
  const [label, color, bg] = m[status] ?? [status, C.muted, 'rgba(255,255,255,0.06)'];
  return <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, color, background: bg, border: `1px solid ${color}22` }}>{label}</span>;
}

function Btn({ children, onClick, ghost = false, danger = false, sm = false, disabled = false, title, style }: {
  children: React.ReactNode; onClick?: () => void; ghost?: boolean; danger?: boolean; sm?: boolean; disabled?: boolean; title?: string; style?: React.CSSProperties;
}) {
  return (
    <button onClick={disabled ? undefined : onClick}
      disabled={disabled}
      title={title}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: sm ? '5px 12px' : '8px 16px', background: disabled ? 'rgba(255,255,255,0.04)' : danger ? C.red : ghost ? 'rgba(255,255,255,0.05)' : C.violet, border: ghost || disabled ? `1px solid ${C.border}` : 'none', borderRadius: 10, color: disabled ? C.muted : '#fff', fontSize: sm ? 11 : 12, fontWeight: 700, cursor: disabled ? 'not-allowed' : 'pointer', transition: 'opacity 150ms', ...style }}
      onMouseOver={e => (!disabled && (e.currentTarget.style.opacity = '0.8'))}
      onMouseOut={e  => (!disabled && (e.currentTarget.style.opacity = '1'))}
    >{children}</button>
  );
}

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 'clamp(14px, 2.5vw, 20px)', maxWidth: '100%', boxSizing: 'border-box', overflow: 'hidden', ...style }}>
      {children}
    </div>
  );
}

function StatCard({ icon, label, value, color }: { icon: React.ReactElement; label: string; value: string | number; color: string }) {
  return (
    <Card style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0, padding: 'clamp(12px, 2vw, 18px)' }}>
      <div style={{ width: 44, height: 44, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${color}22`, flexShrink: 0 }}>
        {React.cloneElement(icon, { size: 20, color })}
      </div>
      <div style={{ minWidth: 0, flex: 1, overflow: 'hidden' }}>
        <div style={{ fontSize: 11, color: C.muted, fontWeight: 600, marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</div>
        <div style={{ fontSize: 'clamp(18px, 3.5vw, 22px)', fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{value}</div>
      </div>
    </Card>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '60px 20px', color: C.muted }}>
      <Layers size={40} style={{ marginBottom: 12, opacity: 0.35 }} />
      <div style={{ fontSize: 14 }}>{message}</div>
    </div>
  );
}

function LoadingSpinner() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
      <div style={{ width: 36, height: 36, borderRadius: '50%', border: `3px solid ${C.border}`, borderTop: `3px solid ${C.violet}`, animation: 'spin 0.8s linear infinite' }} />
    </div>
  );
}

function Toast({ msg, onClose }: { msg: string; onClose: () => void }) {
  return (
    <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999, background: C.green, color: '#fff', borderRadius: 12, padding: '12px 20px', fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', gap: 10, boxShadow: '0 8px 32px rgba(16,185,129,0.3)', animation: 'slideUp 200ms ease' }}>
      <Check size={16} />{msg}
      <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', marginLeft: 8 }}><X size={14} /></button>
    </div>
  );
}

const TH: React.CSSProperties = { textAlign: 'left', padding: '12px 16px', fontSize: 11, color: C.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' };
const TD: React.CSSProperties = { padding: '14px 16px', fontSize: 13 };
const TR_HOVER = {
  onMouseOver: (e: React.MouseEvent<HTMLTableRowElement>) => (e.currentTarget.style.background = 'var(--hover-bg)'),
  onMouseOut:  (e: React.MouseEvent<HTMLTableRowElement>) => (e.currentTarget.style.background = 'transparent'),
};

function ChartTip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: '10px 14px' }}>
      <div style={{ color: C.muted, fontSize: 11, marginBottom: 4 }}>{label}</div>
      <div style={{ color: C.violet, fontWeight: 700 }}>${payload[0].value.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
    </div>
  );
}

/* ── Clean Formatting Helpers ───────────────────────────────────── */
function fmtUSD(val: any): string {
  if (val === null || val === undefined || val === '') return '$0.00';
  const n = typeof val === 'number' ? val : parseFloat(String(val).replace(/[^0-9.-]/g, '')) || 0;
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtCrypto(val: any, sym = '', maxDecimals = 4): string {
  if (val === null || val === undefined || val === '') return '0.00';
  const n = typeof val === 'number' ? val : parseFloat(String(val).replace(/[^0-9.-]/g, '')) || 0;
  const formatted = n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: maxDecimals });
  return sym ? `${formatted} ${sym}` : formatted;
}

function fmtCount(val: any): string {
  if (val === null || val === undefined) return '0';
  const n = typeof val === 'number' ? val : parseInt(String(val).replace(/[^0-9-]/g, '')) || 0;
  return n.toLocaleString('en-US');
}

/* ── Searchable Coin Select Component ───────────────────────────── */
interface SearchableCoinSelectProps {
  value: string;
  onChange: (sym: string) => void;
  tokens: MarketToken[];
  includeAll?: boolean;
  allLabel?: string;
  width?: string | number;
}

function SearchableCoinSelect({
  value,
  onChange,
  tokens,
  includeAll = true,
  allLabel = 'All Coins',
  width = 220,
}: SearchableCoinSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      setTimeout(() => inputRef.current?.focus(), 60);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isOpen]);

  // Escape key closes dropdown
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    if (isOpen) window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const selectedToken = tokens.find(t => t.sym.toUpperCase() === value.toUpperCase());

  const filtered = tokens.filter(t => {
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase().replace('$', '');
    return t.sym.toLowerCase().includes(q) || t.name.toLowerCase().includes(q);
  });

  return (
    <div ref={containerRef} style={{ position: 'relative', width, minWidth: 160 }}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => {
          setIsOpen(prev => !prev);
          setSearch('');
        }}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          background: C.surface,
          border: `1px solid ${isOpen ? C.violet : C.border}`,
          borderRadius: 8,
          padding: '6px 12px',
          color: C.text,
          fontSize: 12,
          fontWeight: 700,
          cursor: 'pointer',
          outline: 'none',
          boxShadow: isOpen ? '0 0 0 2px rgba(124,58,237,0.25)' : 'none',
          transition: 'all 150ms'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0, overflow: 'hidden' }}>
          {value === 'all' || !selectedToken ? (
            <>
              <span style={{ fontSize: 13 }}>🪙</span>
              <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{allLabel}</span>
            </>
          ) : (
            <>
              {selectedToken.imageUrl ? (
                <img
                  src={selectedToken.imageUrl}
                  alt={selectedToken.sym}
                  style={{ width: 16, height: 16, borderRadius: '50%', objectFit: 'cover' }}
                  onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                />
              ) : (
                <div style={{ width: 16, height: 16, borderRadius: '50%', background: C.violet, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 800 }}>
                  {selectedToken.sym.slice(0, 1)}
                </div>
              )}
              <span style={{ color: C.text, fontWeight: 800 }}>${selectedToken.sym}</span>
              <span style={{ fontSize: 11, color: C.muted, fontWeight: 600 }}>{selectedToken.price}</span>
            </>
          )}
        </div>
        <ChevronDown size={14} color={C.muted} style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 150ms', flexShrink: 0 }} />
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            right: 0,
            width: Math.max(260, typeof width === 'number' ? width : 260),
            background: C.surface,
            border: `1px solid ${C.border}`,
            borderRadius: 12,
            boxShadow: '0 16px 40px rgba(0, 0, 0, 0.65), 0 0 0 1px rgba(255, 255, 255, 0.06)',
            zIndex: 99999,
            overflow: 'hidden',
            animation: 'slideUp 120ms ease'
          }}
        >
          {/* Embedded Search Box */}
          <div style={{ padding: '8px 10px', borderBottom: `1px solid ${C.border}`, background: 'rgba(255,255,255,0.02)' }}>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Search size={13} color={C.muted} style={{ position: 'absolute', left: 9 }} />
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search coin ticker, name..."
                style={{
                  width: '100%',
                  background: C.surface2,
                  border: `1px solid ${C.border}`,
                  borderRadius: 7,
                  padding: '6px 26px 6px 28px',
                  color: C.text,
                  fontSize: 12,
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
              {search && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch('');
                    inputRef.current?.focus();
                  }}
                  style={{ position: 'absolute', right: 7, background: 'none', border: 'none', color: C.muted, cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>

          {/* Options List */}
          <div style={{ maxHeight: 260, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '4px 0' }}>
            {includeAll && !search && (
              <div
                onClick={() => {
                  onChange('all');
                  setIsOpen(false);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  cursor: 'pointer',
                  background: value === 'all' ? 'rgba(124,58,237,0.15)' : 'transparent',
                  color: value === 'all' ? C.violet : C.text,
                  fontSize: 12,
                  fontWeight: 700,
                  transition: 'background 100ms'
                }}
                onMouseOver={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
                onMouseOut={e => (e.currentTarget.style.background = value === 'all' ? 'rgba(124,58,237,0.15)' : 'transparent')}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span>🪙</span>
                  <span>{allLabel}</span>
                </div>
                {value === 'all' && <Check size={14} color={C.violet} />}
              </div>
            )}

            {filtered.length === 0 ? (
              <div style={{ padding: '16px 12px', textAlign: 'center', color: C.muted, fontSize: 12 }}>
                No coins matching "{search}"
              </div>
            ) : (
              filtered.map(tok => {
                const isSelected = tok.sym.toUpperCase() === value.toUpperCase();
                return (
                  <div
                    key={tok.sym}
                    onClick={() => {
                      onChange(tok.sym);
                      setIsOpen(false);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '7px 12px',
                      cursor: 'pointer',
                      background: isSelected ? 'rgba(124,58,237,0.15)' : 'transparent',
                      color: isSelected ? C.violet : C.text,
                      fontSize: 12,
                      fontWeight: 600,
                      transition: 'background 100ms'
                    }}
                    onMouseOver={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
                    onMouseOut={e => (e.currentTarget.style.background = isSelected ? 'rgba(124,58,237,0.15)' : 'transparent')}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                      {tok.imageUrl ? (
                        <img
                          src={tok.imageUrl}
                          alt={tok.sym}
                          style={{ width: 20, height: 20, borderRadius: '50%', objectFit: 'cover' }}
                          onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                        />
                      ) : (
                        <div style={{ width: 20, height: 20, borderRadius: '50%', background: C.surface2, color: C.text, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800 }}>
                          {tok.sym.slice(0, 1)}
                        </div>
                      )}
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                          <span style={{ fontWeight: 800, color: C.text }}>${tok.sym}</span>
                          <span style={{ fontSize: 10, color: C.muted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 90 }}>{tok.name}</span>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: C.text }}>{tok.price}</span>
                      <span style={{ fontSize: 10, fontWeight: 700, color: tok.pos ? C.green : C.red }}>{tok.change}</span>
                      {isSelected && <Check size={14} color={C.violet} />}
                    </div>
                  </div>
                );
              })
            )}
          </div>
          <div style={{ padding: '6px 12px', borderTop: `1px solid ${C.border}`, fontSize: 10, color: C.muted, background: 'rgba(255,255,255,0.01)', display: 'flex', justifyContent: 'space-between' }}>
            <span>{filtered.length} coins</span>
            <span>Esc to close</span>
          </div>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════ PAGE 1: DASHBOARD ════════════════════════ */
function DashboardPage({ metrics, withdrawals, onApprove, onReject, loading, search }: {
  metrics: AdminMetrics; withdrawals: WithdrawalRequest[];
  onApprove(id: number): void; onReject(id: number): void;
  loading: boolean; search: string;
}) {
  const [range, setRange] = useState<'7' | '30'>('7');
  // Tab switcher to cleanly isolate Pending Withdrawals Queue and Settled Platform Transactions
  const [activeQueueTab, setActiveQueueTab] = useState<'pending' | 'settled'>('pending');
  const [rowsLimit, setRowsLimit] = useState<number>(5);

  if (loading) return <LoadingSpinner />;
  const k = metrics?.kpis || (STUB_METRICS.kpis as any);
  const rawTrend = Array.isArray(metrics?.volume_trend) && metrics.volume_trend.length > 0 ? metrics.volume_trend : STUB_METRICS.volume_trend;
  const trend = range === '7' ? rawTrend.slice(-7) : rawTrend;

  const wList = Array.isArray(withdrawals) ? withdrawals : [];

  // Separate Pending Withdrawals from Completed/Other Transactions
  const pendingWithdrawals = wList.filter(w => 
    w && w.status === 'PENDING' &&
    (!search || (w.user_address || '').toLowerCase().includes(search.toLowerCase()) || (w.currency || '').toLowerCase().includes(search.toLowerCase()))
  );

  const completedTransactions = wList.filter(w => 
    w && w.status !== 'PENDING' &&
    (!search || (w.user_address || '').toLowerCase().includes(search.toLowerCase()) || (w.currency || '').toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* 1. Primary Top All-Time Platform KPIs */}
      <div className="admin-kpi-grid">
        <StatCard icon={<BarChart2 />}  label="Total Platform Volume" value={fmtUSD(k.total_volume_usd)}  color={C.violet} />
        <StatCard icon={<Users />}      label="Active Traders"         value={fmtCount(k.active_traders)} color={C.green}  />
        <StatCard icon={<Clock />}      label="Pending Withdrawals"    value={fmtCount(k.pending_withdrawals)} color={C.amber}  />
        <StatCard icon={<DollarSign />} label="Platform Fees"          value={fmtUSD(k.platform_fees_usd)} color={C.violet} />
      </div>

      {/* 2. Daily / Real-Time Financial Velocity Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: 14 }}>
        <div style={{ background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.22)', borderRadius: 14, padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 42, height: 42, borderRadius: 10, background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.green, flexShrink: 0 }}>
            <ArrowDownToLine size={20} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 11, color: C.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Deposits Today</div>
            <div style={{ fontSize: 18, fontWeight: 900, color: C.text, marginTop: 2 }}>{fmtUSD(k.deposits_today_usd || 0)}</div>
            <div style={{ fontSize: 11, color: C.green, fontWeight: 600 }}>{k.deposits_today_count || 0} confirmed today</div>
          </div>
        </div>

        <div style={{ background: 'rgba(124, 58, 237, 0.05)', border: '1px solid rgba(124, 58, 237, 0.22)', borderRadius: 14, padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 42, height: 42, borderRadius: 10, background: 'rgba(124, 58, 237, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.violet, flexShrink: 0 }}>
            <Zap size={20} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 11, color: C.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Coin Buys Today</div>
            <div style={{ fontSize: 18, fontWeight: 900, color: C.text, marginTop: 2 }}>{fmtUSD(k.buys_today_usd || 0)}</div>
            <div style={{ fontSize: 11, color: '#A78BFA', fontWeight: 600 }}>{k.buys_today_count || 0} buy orders</div>
          </div>
        </div>

        <div style={{ background: 'rgba(245, 158, 11, 0.05)', border: '1px solid rgba(245, 158, 11, 0.25)', borderRadius: 14, padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 42, height: 42, borderRadius: 10, background: 'rgba(245, 158, 11, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.amber, flexShrink: 0 }}>
            <Clock size={20} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 11, color: C.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Pending Withdrawals</div>
            <div style={{ fontSize: 18, fontWeight: 900, color: C.amber, marginTop: 2 }}>{fmtUSD(k.pending_withdrawals_usd || 0)}</div>
            <div style={{ fontSize: 11, color: C.muted, fontWeight: 600 }}>{k.pending_withdrawals || 0} awaiting review</div>
          </div>
        </div>

        <div style={{ background: 'rgba(59, 130, 246, 0.05)', border: '1px solid rgba(59, 130, 246, 0.22)', borderRadius: 14, padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 42, height: 42, borderRadius: 10, background: 'rgba(59, 130, 246, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#60A5FA', flexShrink: 0 }}>
            <Check size={20} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 11, color: C.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Successful Withdrawals</div>
            <div style={{ fontSize: 18, fontWeight: 900, color: C.text, marginTop: 2 }}>{fmtUSD(k.approved_withdrawals_usd || 0)}</div>
            <div style={{ fontSize: 11, color: '#60A5FA', fontWeight: 600 }}>{k.approved_withdrawals_count || 0} payouts paid</div>
          </div>
        </div>
      </div>

      <div className="admin-charts-grid">
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div style={{ fontWeight: 700, fontSize: 15 }}>Trading Volume Trend</div>
            <div style={{ display: 'flex', gap: 4, background: 'rgba(255,255,255,0.05)', borderRadius: 8, padding: 3 }}>
              {(['7', '30'] as const).map(r => (
                <button key={r} onClick={() => setRange(r)} style={{ padding: '4px 14px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, background: range === r ? C.violet : 'transparent', color: range === r ? '#fff' : C.muted, transition: 'all 150ms' }}>{r} Days</button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={trend} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="vg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={C.violet} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={C.violet} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="date" tick={{ fill: C.muted, fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: C.muted, fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} width={45} />
              <Tooltip content={<ChartTip />} />
              <Area type="monotone" dataKey="volume" stroke={C.violet} strokeWidth={2} fill="url(#vg)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16 }}>Asset Distribution</div>
          {(() => {
            const assetDist = Array.isArray(metrics?.asset_distribution) && metrics.asset_distribution.length > 0
              ? metrics.asset_distribution
              : STUB_METRICS.asset_distribution;
            return (
              <>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={assetDist} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="percentage">
                      {assetDist.map((d, i) => <Cell key={i} fill={d.color || '#7C3AED'} />)}
                    </Pie>
                    <Tooltip formatter={((v: unknown) => `${v}%`) as any} contentStyle={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                  {assetDist.map(d => (
                    <div key={d.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: d.color || '#7C3AED' }} />
                        <span style={{ fontSize: 13, fontWeight: 600 }}>{d.name}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{ fontSize: 12, color: C.muted }}>${((d.amount_usd || 0) / 1000).toFixed(0)}k</span>
                        <span style={{ fontSize: 13, fontWeight: 700, minWidth: 35, textAlign: 'right' }}>{d.percentage || 0}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            );
          })()}
        </Card>
      </div>

      {/* Top 8 Live Platform Coins Quick Rail */}
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
          <div style={{ fontWeight: 700, fontSize: 15, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span>Live Platform Assets ({(marketStore?.tokens || []).length})</span>
            <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 12, background: 'rgba(124,58,237,0.15)', color: C.violet, fontWeight: 700 }}>
              Live Ticker
            </span>
          </div>
          <span style={{ fontSize: 12, color: C.muted }}>Top volume ranking</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 140px), 1fr))', gap: 10 }}>
          {(marketStore?.tokens || []).slice(0, 8).map((tok, idx) => {
            return (
              <div
                key={tok.sym}
                style={{
                  background: 'rgba(255,255,255,0.02)',
                  border: `1px solid ${C.border}`,
                  borderRadius: 12,
                  padding: '12px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 10, fontWeight: 800, color: C.muted }}>#{idx + 1}</span>
                    {tok.imageUrl ? (
                      <img src={tok.imageUrl} alt={tok.sym} style={{ width: 24, height: 24, borderRadius: '50%', objectFit: 'cover' }} onError={e => { (e.target as HTMLElement).style.display = 'none'; }} />
                    ) : null}
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 13, color: C.text }}>{tok.sym}</div>
                      <div style={{ fontSize: 10, color: C.muted }}>{tok.name}</div>
                    </div>
                  </div>
                  <Sparkline pts={tok.sparkline} isUp={tok.pos} width={68} height={24} />
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', borderTop: `1px solid ${C.border}`, paddingTop: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{tok.price}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: tok.pos ? C.green : C.red, background: tok.pos ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)', padding: '2px 6px', borderRadius: 4 }}>
                    {tok.change}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* 3. TRANSACTION MANAGEMENT: SEGMENTED BUTTON SWITCHER FOR WITHDRAWAL QUEUE & SETTLED TRANSACTIONS */}
      <Card style={{ border: activeQueueTab === 'pending' && pendingWithdrawals.length > 0 ? '1px solid rgba(245, 158, 11, 0.4)' : undefined }}>
        {/* Header & Tab Buttons */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
          {/* Segmented Switcher Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.04)', padding: 4, borderRadius: 10, border: `1px solid ${C.border}`, gap: 4 }}>
            <button
              onClick={() => setActiveQueueTab('pending')}
              style={{
                padding: '7px 14px',
                borderRadius: 7,
                border: 'none',
                background: activeQueueTab === 'pending' ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'transparent',
                color: activeQueueTab === 'pending' ? '#000' : C.text,
                fontWeight: 800,
                fontSize: 13,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                transition: 'all 0.15s ease'
              }}
            >
              <span>⚡ Pending Approval Queue</span>
              <span style={{
                fontSize: 11,
                padding: '2px 7px',
                borderRadius: 10,
                background: activeQueueTab === 'pending' ? 'rgba(0,0,0,0.25)' : 'rgba(245,158,11,0.2)',
                color: activeQueueTab === 'pending' ? '#000' : C.amber,
                fontWeight: 900
              }}>
                {pendingWithdrawals.length}
              </span>
            </button>

            <button
              onClick={() => setActiveQueueTab('settled')}
              style={{
                padding: '7px 14px',
                borderRadius: 7,
                border: 'none',
                background: activeQueueTab === 'settled' ? 'linear-gradient(135deg, #6366f1, #7c3aed)' : 'transparent',
                color: activeQueueTab === 'settled' ? '#fff' : C.text,
                fontWeight: 800,
                fontSize: 13,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                transition: 'all 0.15s ease'
              }}
            >
              <span>📜 Settled Platform Transactions</span>
              <span style={{
                fontSize: 11,
                padding: '2px 7px',
                borderRadius: 10,
                background: activeQueueTab === 'settled' ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.08)',
                color: activeQueueTab === 'settled' ? '#fff' : C.muted,
                fontWeight: 800
              }}>
                {completedTransactions.length}
              </span>
            </button>
          </div>

          {/* Right Controls: Quick switch button & Max rows limiter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: C.muted }}>
              <span>Show rows:</span>
              {[5, 10, 25].map(cnt => (
                <button
                  key={cnt}
                  onClick={() => setRowsLimit(cnt)}
                  style={{
                    padding: '3px 8px',
                    borderRadius: 6,
                    border: `1px solid ${rowsLimit === cnt ? C.violet : C.border}`,
                    background: rowsLimit === cnt ? 'rgba(124,58,237,0.2)' : 'transparent',
                    color: rowsLimit === cnt ? C.text : C.muted,
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  {cnt}
                </button>
              ))}
            </div>

            <button
              onClick={() => setActiveQueueTab(activeQueueTab === 'pending' ? 'settled' : 'pending')}
              style={{
                padding: '6px 12px',
                borderRadius: 8,
                border: `1px solid ${C.border}`,
                background: 'rgba(255,255,255,0.03)',
                color: C.text,
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}
            >
              {activeQueueTab === 'pending' ? (
                <><span>View Settled History</span><ChevronRight size={14} /></>
              ) : (
                <><span>View Pending Queue ({pendingWithdrawals.length})</span><ChevronRight size={14} /></>
              )}
            </button>
          </div>
        </div>

        {/* View 1: PENDING APPROVAL QUEUE */}
        {activeQueueTab === 'pending' && (
          <div>
            {pendingWithdrawals.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '36px 20px', color: C.muted, background: 'rgba(255,255,255,0.015)', borderRadius: 12 }}>
                <Check size={32} color={C.green} style={{ marginBottom: 8 }} />
                <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>All Clear! No Pending Withdrawals</div>
                <div style={{ fontSize: 12, marginTop: 4 }}>Any new user withdrawal requests will appear here immediately for instant 1-click approval.</div>
              </div>
            ) : (
              <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', width: '100%' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 640 }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${C.border}`, background: 'rgba(245,158,11,0.04)' }}>
                      <th style={TH}>User</th>
                      <th style={TH}>Payout Amount</th>
                      <th style={TH}>Currency</th>
                      <th style={TH}>Destination Address</th>
                      <th style={TH}>Date</th>
                      <th style={TH}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingWithdrawals.slice(0, rowsLimit).map(w => (
                      <tr key={w.id} {...TR_HOVER} style={{ borderBottom: `1px solid ${C.border}` }}>
                        <td style={{ ...TD, fontFamily: 'monospace', fontSize: 12 }}>
                          {w.user_address.length > 14 ? `${w.user_address.slice(0, 6)}...${w.user_address.slice(-4)}` : w.user_address}
                        </td>
                        <td style={{ ...TD, fontWeight: 800, color: C.amber, fontSize: 14 }}>
                          {fmtCrypto(w.amount, w.currency)}
                        </td>
                        <td style={TD}>
                          <span style={{ fontWeight: 700, background: 'rgba(255,255,255,0.06)', padding: '2px 8px', borderRadius: 6 }}>
                            {w.currency}
                          </span>
                        </td>
                        <td style={{ ...TD, fontFamily: 'monospace', fontSize: 11, color: C.muted }}>
                          {w.destination_address ? `${w.destination_address.slice(0, 8)}...${w.destination_address.slice(-6)}` : 'Platform Default'}
                        </td>
                        <td style={{ ...TD, color: C.muted, fontSize: 11 }}>{new Date(w.created_at).toLocaleDateString()}</td>
                        <td style={TD}>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <Btn sm onClick={() => onApprove(w.id)}><Check size={12} />Approve Payout</Btn>
                            <Btn sm danger onClick={() => onReject(w.id)}><X size={12} />Reject</Btn>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* View 2: SETTLED PLATFORM TRANSACTIONS */}
        {activeQueueTab === 'settled' && (
          <div>
            {completedTransactions.length === 0 ? (
              <EmptyState message="No settled transactions found." />
            ) : (
              <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', width: '100%' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600 }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                      <th style={TH}>User</th>
                      <th style={TH}>Amount</th>
                      <th style={TH}>Currency</th>
                      <th style={TH}>Date</th>
                      <th style={TH}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {completedTransactions.slice(0, rowsLimit).map(w => (
                      <tr key={w.id} {...TR_HOVER} style={{ borderBottom: `1px solid ${C.border}` }}>
                        <td style={{ ...TD, fontFamily: 'monospace', fontSize: 12 }}>
                          {w.user_address.length > 14 ? `${w.user_address.slice(0, 6)}...${w.user_address.slice(-4)}` : w.user_address}
                        </td>
                        <td style={{ ...TD, fontWeight: 700 }}>{fmtCrypto(w.amount, w.currency)}</td>
                        <td style={TD}>{w.currency}</td>
                        <td style={{ ...TD, color: C.muted, fontSize: 11 }}>{new Date(w.created_at).toLocaleDateString()}</td>
                        <td style={TD}><Badge status={w.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}

const AVATAR_PRESETS = [
  { name: "Popcat", url: "https://coin-images.coingecko.com/coins/images/33890/large/popcat.png", icon: "🐱" },
  { name: "Doge",   url: "https://coin-images.coingecko.com/coins/images/5/large/dogecoin.png", icon: "🐶" },
  { name: "Pepe",   url: "https://coin-images.coingecko.com/coins/images/29850/large/pepe-token.png", icon: "🐸" },
  { name: "Bonk",   url: "https://coin-images.coingecko.com/coins/images/28600/large/bonk.jpg", icon: "🦴" },
  { name: "Wif",    url: "https://coin-images.coingecko.com/coins/images/33566/large/dogwifhat.jpg", icon: "🧢" },
  { name: "Rocket", url: "https://images.unsplash.com/photo-1517976487502-5f7946f10157?w=128&auto=format&fit=crop&q=80", icon: "🚀" },
  { name: "Diamond",url: "https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=128&auto=format&fit=crop&q=80", icon: "💎" },
  { name: "Flame",  url: "https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=128&auto=format&fit=crop&q=80", icon: "🔥" },
];

const generateSolanaAddress = () =>
  Array.from({ length: 44 }, () => "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"[Math.floor(Math.random() * 58)]).join("");

/* ══════════════════════ PAGE 2: COIN LAUNCHER & MARKET MAKER ═════════ */
function MemeCoinsPage({ search }: { search: string }) {
  const [, setTick] = useState(0);
  useEffect(() => {
    return marketStore.subscribe(() => setTick(t => t + 1));
  }, []);

  const [selectedSym, setSelectedSym] = useState(() => (typeof localStorage !== "undefined" && localStorage.getItem("axiom_selected_sym") && localStorage.getItem("axiom_selected_sym") !== "POPCAT") ? localStorage.getItem("axiom_selected_sym")! : "BTC");
  const [modal, setModal] = useState(false);
  const [rugModal, setRugModal] = useState<string | null>(null);
  
  // Control modes: dollars ($ USD) vs percent (%) vs target ($ direct target)
  const [controlMode, setControlMode] = useState<'dollars' | 'percent' | 'target'>('dollars');
  const [customPump, setCustomPump] = useState("15");
  const [customDump, setCustomDump] = useState("15");
  const [customDollarPump, setCustomDollarPump] = useState("0.05");
  const [customDollarDump, setCustomDollarDump] = useState("0.05");
  const [targetPriceInput, setTargetPriceInput] = useState("");

  const [localSearch, setLocalSearch] = useState("");
  const [realAuditTrades, setRealAuditTrades] = useState<any[]>([]);
  const [loadingTrades, setLoadingTrades] = useState(false);

  const [form, setForm] = useState({
    name: '',
    symbol: '',
    contractAddress: '',
    supply: '1000000000',
    price: '0.005',
    marketCap: '5000000',
    liquidity: '50000',
    logo_url: AVATAR_PRESETS[0].url,
    description: ''
  });

  // Edit Existing Meme Coin Modal State
  const [editModalToken, setEditModalToken] = useState<MarketToken | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    symbol: '',
    contractAddress: '',
    supply: '1000000000',
    price: '0.005',
    marketCap: '5000000',
    liquidity: '50000',
    logo_url: '',
    change: '+0.00%',
    description: ''
  });

  const [toast, setToast] = useState<string | null>(null);
  const toast_ = (m: string) => { setToast(m); setTimeout(() => setToast(null), 3500); };

  const tokens = marketStore.tokens;
  const effectiveSearch = (localSearch || search || "").trim().toLowerCase();
  const filtered = tokens.filter(t => {
    if (!effectiveSearch) return true;
    return (
      t.name.toLowerCase().includes(effectiveSearch) ||
      t.sym.toLowerCase().includes(effectiveSearch) ||
      (t.poolAddress && t.poolAddress.toLowerCase().includes(effectiveSearch)) ||
      (t.contractAddress && t.contractAddress.toLowerCase().includes(effectiveSearch))
    );
  });
  const activeToken = marketStore.getToken(selectedSym) || tokens[0];

  // Fetch real audit trades for the selected token
  useEffect(() => {
    let isMounted = true;
    setLoadingTrades(true);
    api.getAdminTrades(selectedSym).then(data => {
      if (isMounted) {
        setRealAuditTrades(data || []);
        setLoadingTrades(false);
      }
    }).catch(() => {
      if (isMounted) setLoadingTrades(false);
    });
    return () => { isMounted = false; };
  }, [selectedSym]);

  // Update target price and dollar input defaults when active token changes
  useEffect(() => {
    if (activeToken && activeToken.numericPrice) {
      setTargetPriceInput(String(activeToken.numericPrice));
      const p = activeToken.numericPrice;
      const sensible = p < 0.001 ? Number((p * 0.25).toFixed(8)) : p < 1 ? Number((p * 0.20).toFixed(4)) : Number((p * 0.05).toFixed(2));
      setCustomDollarPump(String(sensible));
      setCustomDollarDump(String(sensible));
    }
  }, [activeToken?.sym]);

  // Deploy Modal Live Calculation Handlers
  const handleDeployMarketCapChange = (val: string) => {
    const mcap = parseFloat(val) || 0;
    const supply = parseFloat(form.supply) || 1;
    const newPrice = supply > 0 ? (mcap / supply) : 0;
    setForm(prev => ({
      ...prev,
      marketCap: val,
      price: newPrice > 0 ? (newPrice < 0.001 ? newPrice.toFixed(8) : newPrice < 1 ? newPrice.toFixed(6) : newPrice.toFixed(4)) : prev.price
    }));
  };

  const handleDeployPriceChange = (val: string) => {
    const price = parseFloat(val) || 0;
    const supply = parseFloat(form.supply) || 0;
    const newMcap = price * supply;
    setForm(prev => ({
      ...prev,
      price: val,
      marketCap: newMcap > 0 ? String(Math.round(newMcap)) : prev.marketCap
    }));
  };

  const handleDeploySupplyChange = (val: string) => {
    const supply = parseFloat(val) || 0;
    const price = parseFloat(form.price) || 0;
    const newMcap = price * supply;
    setForm(prev => ({
      ...prev,
      supply: val,
      marketCap: newMcap > 0 ? String(Math.round(newMcap)) : prev.marketCap
    }));
  };

  const openDeployModal = () => {
    setForm({
      name: '',
      symbol: '',
      contractAddress: generateSolanaAddress(),
      supply: '1000000000',
      price: '0.005',
      marketCap: '5000000',
      liquidity: '50000',
      logo_url: AVATAR_PRESETS[0].url,
      description: 'The next 100x viral community token on Solana'
    });
    setModal(true);
  };

  // Edit Existing Token Handlers
  const openEditModal = (t: MarketToken) => {
    setEditModalToken(t);
    const supplyVal = t.supply ? String(t.supply) : '1000000000';
    const priceVal = String(t.numericPrice || 0.005);
    const mcapVal = t.numericPrice && t.supply ? String(Math.round(t.numericPrice * t.supply)) : '5000000';
    let liqVal = '50000';
    if (t.liq) {
      const raw = t.liq.replace(/[^0-9.]/g, '');
      if (t.liq.includes('M')) liqVal = String((parseFloat(raw) || 0) * 1e6);
      else if (t.liq.includes('K')) liqVal = String((parseFloat(raw) || 0) * 1e3);
      else if (t.liq.includes('B')) liqVal = String((parseFloat(raw) || 0) * 1e9);
      else if (parseFloat(raw)) liqVal = raw;
    }
    setEditForm({
      name: t.name || '',
      symbol: t.sym || '',
      contractAddress: t.contractAddress || t.poolAddress || '',
      supply: supplyVal,
      price: priceVal,
      marketCap: mcapVal,
      liquidity: liqVal,
      logo_url: t.imageUrl || '',
      change: t.change || '+0.00%',
      description: ''
    });
  };

  const handleEditMarketCapChange = (val: string) => {
    const mcap = parseFloat(val) || 0;
    const supply = parseFloat(editForm.supply) || 1;
    const newPrice = supply > 0 ? (mcap / supply) : 0;
    setEditForm(prev => ({
      ...prev,
      marketCap: val,
      price: newPrice > 0 ? (newPrice < 0.001 ? newPrice.toFixed(8) : newPrice < 1 ? newPrice.toFixed(6) : newPrice.toFixed(4)) : prev.price
    }));
  };

  const handleEditPriceChange = (val: string) => {
    const price = parseFloat(val) || 0;
    const supply = parseFloat(editForm.supply) || 0;
    const newMcap = price * supply;
    setEditForm(prev => ({
      ...prev,
      price: val,
      marketCap: newMcap > 0 ? String(Math.round(newMcap)) : prev.marketCap
    }));
  };

  const handleEditSupplyChange = (val: string) => {
    const supply = parseFloat(val) || 0;
    const price = parseFloat(editForm.price) || 0;
    const newMcap = price * supply;
    setEditForm(prev => ({
      ...prev,
      supply: val,
      marketCap: newMcap > 0 ? String(Math.round(newMcap)) : prev.marketCap
    }));
  };

  const saveEditToken = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editModalToken) return;

    marketStore.updateToken(editModalToken.sym, {
      name: editForm.name.trim(),
      contractAddress: editForm.contractAddress.trim(),
      imageUrl: editForm.logo_url.trim(),
      supply: parseFloat(editForm.supply) || undefined,
      price: parseFloat(editForm.price) || undefined,
      marketCap: parseFloat(editForm.marketCap) || undefined,
      liquidity: parseFloat(editForm.liquidity) || undefined,
      change: editForm.change.trim() || undefined,
    });

    api.controlToken(editModalToken.sym, 'update', 0, {
      name: editForm.name.trim(),
      contract_address: editForm.contractAddress.trim(),
      price: editForm.price,
      liquidity: editForm.liquidity,
      supply: editForm.supply,
      logo_url: editForm.logo_url.trim(),
    }).catch(() => {});

    toast_(`✅ Successfully updated $${editModalToken.sym} metrics and synced DEX!`);
    setEditModalToken(null);
  };

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.symbol) {
      toast_("Please enter Token Name and Symbol");
      return;
    }
    const contractAddr = form.contractAddress.trim() || generateSolanaAddress();
    const created = marketStore.createToken({
      name: form.name.trim(),
      symbol: form.symbol.trim().toUpperCase(),
      price: form.price,
      supply: form.supply,
      liquidity: form.liquidity,
      contractAddress: contractAddr,
      logo_url: form.logo_url,
      description: form.description,
    });
    try {
      await api.createMemeToken({
        name: form.name.trim(),
        symbol: form.symbol.trim().toUpperCase(),
        supply: form.supply,
        price: form.price,
        liquidity: form.liquidity,
        contract_address: contractAddr,
        logo_url: form.logo_url,
        description: form.description,
      });
    } catch {
      // marketStore updated in memory & persisted locally
    }
    setSelectedSym(created.sym);
    marketStore.setActiveSym(created.sym);
    setModal(false);
    toast_(`🚀 $${created.sym} deployed and live on Axiom Wallet DEX!`);
  };

  // Dollar pump/dump controls
  const handlePumpDollar = (sym: string, dollars: number) => {
    if (!dollars || dollars <= 0) return;
    setSelectedSym(sym);
    marketStore.setActiveSym(sym);
    marketStore.pumpTokenDollar(sym, dollars);
    const tok = marketStore.getToken(sym);
    toast_(`🚀 Pumped $${sym} by +$${dollars}! Live Price: ${tok?.price || ''} | Liquidity: ${tok?.liq || ''}`);
  };

  const handleDumpDollar = (sym: string, dollars: number) => {
    if (!dollars || dollars <= 0) return;
    setSelectedSym(sym);
    marketStore.setActiveSym(sym);
    marketStore.dumpTokenDollar(sym, dollars);
    const tok = marketStore.getToken(sym);
    toast_(`📉 Dumped $${sym} by -$${dollars}! Live Price: ${tok?.price || ''} | Liquidity: ${tok?.liq || ''}`);
  };

  // Target price direct set
  const handleSetTargetPrice = (sym: string, targetPrice: number) => {
    if (targetPrice <= 0) return;
    setSelectedSym(sym);
    marketStore.setActiveSym(sym);
    marketStore.setTokenTargetPrice(sym, targetPrice);
    const tok = marketStore.getToken(sym);
    toast_(`🎯 Set $${sym} target price to $${targetPrice}! Live: ${tok?.price || ''} | Liquidity: ${tok?.liq || ''}`);
  };

  // Percentage pump/dump controls
  const handlePump = (sym: string, pct: number) => {
    if (!pct || pct <= 0) return;
    setSelectedSym(sym);
    marketStore.setActiveSym(sym);
    marketStore.pumpToken(sym, pct);
    const tok = marketStore.getToken(sym);
    toast_(`🚀 Pumped $${sym} by +${pct}%! Live Price: ${tok?.price || ''} | Liquidity: ${tok?.liq || ''}`);
  };

  const handleDump = (sym: string, pct: number) => {
    if (!pct || pct <= 0) return;
    setSelectedSym(sym);
    marketStore.setActiveSym(sym);
    marketStore.dumpToken(sym, pct);
    const tok = marketStore.getToken(sym);
    toast_(`📉 Dumped $${sym} by -${pct}%! Live Price: ${tok?.price || ''} | Liquidity: ${tok?.liq || ''}`);
  };

  const handleRugpull = (sym: string) => {
    if (marketStore.isMajorToken(sym)) {
      toast_(`🛡️ Major crypto $${sym} is protected and cannot be rugpulled.`);
      setRugModal(null);
      return;
    }
    marketStore.rugpullToken(sym);
    setRugModal(null);
    toast_(`⚠️ Liquidity completely drained for $${sym}. Trading suspended.`);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {toast && <Toast msg={toast} onClose={() => setToast(null)} />}

      {/* Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
        <div>
          <div style={{ fontSize: 'clamp(17px, 3.5vw, 22px)', fontWeight: 900, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span>Market Maker &amp; Coin Controls</span>
            <span style={{ fontSize: 11, padding: '3px 9px', borderRadius: 20, background: 'rgba(16,185,129,0.15)', color: C.green, border: `1px solid ${C.green}33`, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.green, display: 'inline-block' }} />
              Live Engine Active
            </span>
          </div>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>
            Deploy custom tokens, inject price movements using Dollars or Percentages, monitor real user buyers, and manage liquidity.
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', width: '100%', maxWidth: 460 }}>
          <div style={{ position: 'relative', flex: '1 1 180px', minWidth: 160 }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: C.muted }} />
            <input
              value={localSearch}
              onChange={e => setLocalSearch(e.target.value)}
              placeholder="Search coin, ticker or contract..."
              style={{
                width: '100%',
                background: C.surface,
                border: `1px solid ${C.border}`,
                borderRadius: 10,
                padding: '8px 12px 8px 32px',
                color: C.text,
                fontSize: 12,
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
            {localSearch && (
              <button
                onClick={() => setLocalSearch('')}
                style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: C.muted, cursor: 'pointer' }}
              >
                <X size={13} />
              </button>
            )}
          </div>
          <Btn onClick={openDeployModal}>
            <Plus size={16} />Deploy New Coin
          </Btn>
        </div>
      </div>

      {/* Active Token Controller Card */}
      <Card style={{ background: C.surface, borderColor: 'rgba(124,58,237,0.25)', padding: 22 }}>
        {/* Token selector tabs */}
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 14, borderBottom: `1px solid ${C.border}`, marginBottom: 18 }}>
          {filtered.length === 0 ? (
            <div style={{ fontSize: 12, color: C.muted, padding: '8px 0' }}>
              No coins matching "{effectiveSearch}"
            </div>
          ) : (
            filtered.map(t => {
              const isSel = t.sym === selectedSym;
              return (
                <button
                  key={t.sym}
                  onClick={() => setSelectedSym(t.sym)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '8px 14px',
                    borderRadius: 10,
                    border: isSel ? `1px solid ${C.violet}` : `1px solid ${C.border}`,
                    background: isSel ? 'rgba(124,58,237,0.18)' : C.surface2,
                    color: isSel ? C.violet : C.text,
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 150ms',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {t.imageUrl && (
                    <img src={t.imageUrl} alt={t.sym} style={{ width: 18, height: 18, borderRadius: '50%', objectFit: 'cover' }} onError={(e) => { (e.target as any).style.display = 'none'; }} />
                  )}
                  <span>{t.sym}</span>
                  <span style={{ fontSize: 11, color: t.pos ? C.green : C.red, fontWeight: 600 }}>{t.price}</span>
                  {t.is_rugged && <span style={{ fontSize: 10, color: C.red }}>HALTED</span>}
                </button>
              );
            })
          )}
        </div>

        {/* Selected token stats row - includes Real User Buyers & User Volume */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 120px), 1fr))', gap: 12, marginBottom: 20 }}>
          <div style={{ background: C.surface2, padding: '10px 14px', borderRadius: 10, border: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 11, color: C.muted, fontWeight: 600 }}>COIN</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: C.text, marginTop: 2 }}>{activeToken.name} (${activeToken.sym})</div>
          </div>
          <div style={{ background: C.surface2, padding: '10px 14px', borderRadius: 10, border: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 11, color: C.muted, fontWeight: 600 }}>LIVE PRICE</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: C.text, marginTop: 2 }}>{activeToken.price}</div>
          </div>
          <div style={{ background: C.surface2, padding: '10px 14px', borderRadius: 10, border: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 11, color: C.muted, fontWeight: 600 }}>24H CHANGE</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: activeToken.pos ? C.green : C.red, marginTop: 2 }}>{activeToken.change}</div>
          </div>
          <div style={{ background: C.surface2, padding: '10px 14px', borderRadius: 10, border: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 11, color: C.muted, fontWeight: 600 }}>LIQUIDITY</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: C.text, marginTop: 2 }}>{activeToken.liq}</div>
          </div>
          <div style={{ background: C.surface2, padding: '10px 14px', borderRadius: 10, border: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 11, color: C.muted, fontWeight: 600 }}>MARKET CAP</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: C.text, marginTop: 2 }}>{activeToken.cap}</div>
          </div>

          {/* User Holder & Volume Calculations */}
          <div style={{ background: 'rgba(16, 185, 129, 0.08)', padding: '10px 14px', borderRadius: 10, border: '1px solid rgba(16, 185, 129, 0.25)' }}>
            <div style={{ fontSize: 11, color: C.green, fontWeight: 700 }}>REAL BUYERS</div>
            <div style={{ fontSize: 16, fontWeight: 900, color: C.text, marginTop: 2 }}>{fmtCount(activeToken.user_holders_count || 0)} Users</div>
          </div>
          <div style={{ background: 'rgba(124, 58, 237, 0.08)', padding: '10px 14px', borderRadius: 10, border: '1px solid rgba(124, 58, 237, 0.25)' }}>
            <div style={{ fontSize: 11, color: '#A78BFA', fontWeight: 700 }}>USER BUY VOL</div>
            <div style={{ fontSize: 16, fontWeight: 900, color: C.text, marginTop: 2 }}>{fmtUSD(activeToken.total_user_buy_volume_usd || 0)}</div>
          </div>

          <div style={{ background: C.surface2, padding: '10px 14px', borderRadius: 10, border: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 11, color: C.muted, fontWeight: 600 }}>STATUS</div>
            <div style={{ marginTop: 4 }}>
              <Badge status={activeToken.is_rugged ? 'failed' : 'active'} />
            </div>
          </div>
          <div style={{ background: 'rgba(124,58,237,0.12)', padding: '8px 10px', borderRadius: 10, border: '1px solid rgba(124,58,237,0.3)', display: 'flex', alignItems: 'center' }}>
            <button
              onClick={() => openEditModal(activeToken)}
              style={{
                width: '100%',
                height: '100%',
                minHeight: 40,
                background: 'linear-gradient(135deg, #7C3AED 0%, #6366F1 100%)',
                border: 'none',
                borderRadius: 8,
                padding: '8px 12px',
                color: '#fff',
                fontSize: 12,
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                boxShadow: '0 2px 10px rgba(124,58,237,0.35)',
                transition: 'all 150ms'
              }}
            >
              <Edit3 size={14} />
              <span>Edit Metrics</span>
            </button>
          </div>
        </div>

        {/* MODE SELECTOR: Dollars ($ USD) vs Percentage (%) vs Exact Target ($) */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 16, background: 'rgba(255,255,255,0.02)', padding: '8px 12px', borderRadius: 12, border: `1px solid ${C.border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: C.text }}>
            <DollarSign size={15} color={C.violet} />
            <span>Pump / Dump Control Method:</span>
          </div>
          <div style={{ display: 'flex', gap: 4, background: C.surface2, padding: 3, borderRadius: 8 }}>
            <button
              onClick={() => setControlMode('dollars')}
              style={{
                padding: '6px 14px',
                borderRadius: 6,
                border: 'none',
                background: controlMode === 'dollars' ? C.violet : 'transparent',
                color: controlMode === 'dollars' ? '#fff' : C.muted,
                fontWeight: 800,
                fontSize: 12,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                transition: 'all 150ms'
              }}
            >
              <span>💵 Dollar ($ USD) Mode</span>
            </button>
            <button
              onClick={() => setControlMode('percent')}
              style={{
                padding: '6px 14px',
                borderRadius: 6,
                border: 'none',
                background: controlMode === 'percent' ? C.violet : 'transparent',
                color: controlMode === 'percent' ? '#fff' : C.muted,
                fontWeight: 800,
                fontSize: 12,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                transition: 'all 150ms'
              }}
            >
              <span>% Percentage Mode</span>
            </button>
            <button
              onClick={() => setControlMode('target')}
              style={{
                padding: '6px 14px',
                borderRadius: 6,
                border: 'none',
                background: controlMode === 'target' ? C.violet : 'transparent',
                color: controlMode === 'target' ? '#fff' : C.muted,
                fontWeight: 800,
                fontSize: 12,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                transition: 'all 150ms'
              }}
            >
              <span>🎯 Exact Target Price</span>
            </button>
          </div>
        </div>

        {/* Action Grids: DOLLAR MODE vs PERCENTAGE MODE vs TARGET PRICE */}
        {controlMode === 'dollars' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: 16 }}>
            {/* DOLLAR PUMP CONTROLS */}
            <div style={{ background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.25)', borderRadius: 14, padding: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <TrendingUp size={18} color={C.green} />
                  <div style={{ fontWeight: 800, fontSize: 15, color: C.text }}>Pump by Dollar Amount ($)</div>
                </div>
                <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 6, background: 'rgba(16,185,129,0.15)', color: C.green, fontWeight: 700 }}>
                  Expands Liquidity & Vol
                </span>
              </div>
              <div style={{ fontSize: 11, color: C.muted, marginBottom: 14 }}>
                Adds exact dollar increment to unit price, dynamically expanding pool liquidity & volume.
              </div>

              {/* Dynamic Presets tailored to coin price magnitude */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 12 }}>
                {[
                  { pct: 10, label: '+10%' },
                  { pct: 25, label: '+25%' },
                  { pct: 50, label: '+50%' },
                  { pct: 100, label: '+100%' }
                ].map(({ pct, label }) => {
                  const amt = Number((activeToken.numericPrice * (pct / 100)).toFixed(activeToken.numericPrice < 0.001 ? 8 : activeToken.numericPrice < 1 ? 4 : 2));
                  return (
                    <button
                      key={pct}
                      onClick={() => handlePumpDollar(activeToken.sym, amt)}
                      style={{ padding: '8px 4px', background: 'rgba(16,185,129,0.15)', border: `1px solid ${C.green}44`, borderRadius: 8, color: C.green, fontSize: 11, fontWeight: 800, cursor: 'pointer', textAlign: 'center' }}
                      title={`Pump +$${amt} (${label})`}
                    >
                      <div>{label}</div>
                      <div style={{ fontSize: 9, opacity: 0.85, marginTop: 2 }}>+${amt < 0.001 ? amt.toFixed(6) : amt < 1 ? amt.toFixed(3) : amt.toFixed(2)}</div>
                    </button>
                  );
                })}
              </div>

              {/* Custom Dollar Pump */}
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <span style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: C.green, fontSize: 12, fontWeight: 800 }}>+$</span>
                  <input
                    type="number"
                    step="any"
                    value={customDollarPump}
                    onChange={e => setCustomDollarPump(e.target.value)}
                    placeholder="0.0001"
                    style={{ width: '100%', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: '7px 10px 7px 26px', color: C.text, fontSize: 12, outline: 'none' }}
                  />
                </div>
                <Btn sm onClick={() => handlePumpDollar(activeToken.sym, parseFloat(customDollarPump) || 0)}>
                  <Zap size={12} />Pump 🚀
                </Btn>
              </div>

              {/* Live Impact Preview */}
              {(() => {
                const addAmt = parseFloat(customDollarPump) || 0;
                if (addAmt <= 0) return null;
                const curP = activeToken.numericPrice || 0.001;
                const newP = curP + addAmt;
                const pct = ((addAmt) / curP) * 100;
                const curLiq = marketStore.parseShortUsd(activeToken.liq) || ((curP * (activeToken.supply || 1e9)) * 0.18);
                const newLiq = curLiq * Math.sqrt(Math.max(0.01, 1 + pct / 100));
                return (
                  <div style={{ marginTop: 10, padding: '8px 10px', background: 'rgba(16,185,129,0.08)', borderRadius: 8, border: '1px solid rgba(16,185,129,0.22)', fontSize: 11, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: C.muted }}>New Price:</span>
                      <span style={{ fontWeight: 800, color: C.text }}>${newP < 0.001 ? newP.toFixed(8) : newP < 1 ? newP.toFixed(4) : newP.toFixed(2)} <span style={{ color: C.green }}>({pct >= 0 ? '+' : ''}{pct.toFixed(1)}%)</span></span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: C.muted }}>Projected Liquidity:</span>
                      <span style={{ fontWeight: 800, color: '#A78BFA' }}>{marketStore.formatShortUsd(newLiq)} <span style={{ color: C.green, fontSize: 10 }}>(+{marketStore.formatShortUsd(newLiq - curLiq)})</span></span>
                    </div>
                    {pct > 500 && (
                      <div style={{ fontSize: 10, color: C.amber, fontWeight: 700, marginTop: 2 }}>
                        ⚠️ Caution: High impact (+{pct.toFixed(0)}% jump)
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* DOLLAR DUMP CONTROLS */}
            <div style={{ background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: 14, padding: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <TrendingDown size={18} color={C.red} />
                  <div style={{ fontWeight: 800, fontSize: 15, color: C.text }}>Dump by Dollar Amount ($)</div>
                </div>
                <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 6, background: 'rgba(239,68,68,0.15)', color: C.red, fontWeight: 700 }}>
                  Contracts Liquidity
                </span>
              </div>
              <div style={{ fontSize: 11, color: C.muted, marginBottom: 14 }}>
                Reduces token price by exact dollar value smoothly.
              </div>

              {/* Dynamic Presets tailored to coin price magnitude */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 12 }}>
                {[
                  { pct: 10, label: '-10%' },
                  { pct: 25, label: '-25%' },
                  { pct: 50, label: '-50%' },
                  { pct: 75, label: '-75%' }
                ].map(({ pct, label }) => {
                  const amt = Number((activeToken.numericPrice * (pct / 100)).toFixed(activeToken.numericPrice < 0.001 ? 8 : activeToken.numericPrice < 1 ? 4 : 2));
                  return (
                    <button
                      key={pct}
                      onClick={() => handleDumpDollar(activeToken.sym, amt)}
                      style={{ padding: '8px 4px', background: 'rgba(239,68,68,0.15)', border: `1px solid ${C.red}44`, borderRadius: 8, color: C.red, fontSize: 11, fontWeight: 800, cursor: 'pointer', textAlign: 'center' }}
                      title={`Dump -$${amt} (${label})`}
                    >
                      <div>{label}</div>
                      <div style={{ fontSize: 9, opacity: 0.85, marginTop: 2 }}>-${amt < 0.001 ? amt.toFixed(6) : amt < 1 ? amt.toFixed(3) : amt.toFixed(2)}</div>
                    </button>
                  );
                })}
              </div>

              {/* Custom Dollar Dump */}
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <span style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: C.red, fontSize: 12, fontWeight: 800 }}>-$</span>
                  <input
                    type="number"
                    step="any"
                    value={customDollarDump}
                    onChange={e => setCustomDollarDump(e.target.value)}
                    placeholder="0.0001"
                    style={{ width: '100%', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: '7px 10px 7px 26px', color: C.text, fontSize: 12, outline: 'none' }}
                  />
                </div>
                <Btn sm danger onClick={() => handleDumpDollar(activeToken.sym, parseFloat(customDollarDump) || 0)}>
                  <ArrowDownRight size={12} />Dump 📉
                </Btn>
              </div>

              {/* Live Dump Impact Preview */}
              {(() => {
                const subAmt = parseFloat(customDollarDump) || 0;
                if (subAmt <= 0) return null;
                const curP = activeToken.numericPrice || 0.001;
                const newP = Math.max(0.00000001, curP - subAmt);
                const pct = ((subAmt) / curP) * 100;
                const curLiq = marketStore.parseShortUsd(activeToken.liq) || ((curP * (activeToken.supply || 1e9)) * 0.18);
                const newLiq = curLiq * Math.sqrt(Math.max(0.01, 1 - pct / 100));
                return (
                  <div style={{ marginTop: 10, padding: '8px 10px', background: 'rgba(239,68,68,0.08)', borderRadius: 8, border: '1px solid rgba(239,68,68,0.22)', fontSize: 11, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: C.muted }}>New Price:</span>
                      <span style={{ fontWeight: 800, color: C.text }}>${newP < 0.001 ? newP.toFixed(8) : newP < 1 ? newP.toFixed(4) : newP.toFixed(2)} <span style={{ color: C.red }}>(-{pct.toFixed(1)}%)</span></span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: C.muted }}>Projected Liquidity:</span>
                      <span style={{ fontWeight: 800, color: '#A78BFA' }}>{marketStore.formatShortUsd(newLiq)} <span style={{ color: C.red, fontSize: 10 }}>(-{marketStore.formatShortUsd(curLiq - newLiq)})</span></span>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* EMERGENCY DRAIN */}
            {(() => {
              const isMajor = marketStore.isMajorToken(activeToken.sym);
              return (
                <div style={{ background: isMajor ? 'rgba(255, 255, 255, 0.02)' : 'rgba(185, 28, 28, 0.1)', border: `1px solid ${isMajor ? 'rgba(255, 255, 255, 0.1)' : 'rgba(239, 68, 68, 0.45)'}`, borderRadius: 14, padding: 18, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <Skull size={18} color={isMajor ? C.muted : '#EF4444'} />
                      <div style={{ fontWeight: 800, fontSize: 15, color: isMajor ? C.muted : '#EF4444' }}>Emergency Liquidity Drain</div>
                    </div>
                    <div style={{ fontSize: 11, color: isMajor ? C.muted : '#FCA5A5', marginBottom: 14, lineHeight: 1.5 }}>
                      {isMajor ? '🛡️ Major asset is protected and cannot be drained.' : 'Drains token pool liquidity to $0.00 and suspends further trading.'}
                    </div>
                  </div>

                  <button
                    onClick={() => setRugModal(activeToken.sym)}
                    disabled={isMajor || activeToken.is_rugged}
                    style={{
                      width: '100%',
                      padding: '12px',
                      background: (isMajor || activeToken.is_rugged) ? 'rgba(255,255,255,0.05)' : '#DC2626',
                      border: 'none',
                      borderRadius: 10,
                      color: (isMajor || activeToken.is_rugged) ? C.muted : '#fff',
                      fontSize: 13,
                      fontWeight: 900,
                      cursor: (isMajor || activeToken.is_rugged) ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      boxShadow: (isMajor || activeToken.is_rugged) ? 'none' : '0 4px 14px rgba(220,38,38,0.4)',
                    }}
                  >
                    <Skull size={16} />
                    {isMajor ? `🛡️ $${activeToken.sym} PROTECTED` : activeToken.is_rugged ? 'LIQUIDITY DRAINED' : `DRAIN LIQUIDITY $${activeToken.sym}`}
                  </button>
                </div>
              );
            })()}
          </div>
        )}

        {controlMode === 'target' && (
          <div style={{ background: 'rgba(124, 58, 237, 0.05)', border: '1px solid rgba(124, 58, 237, 0.25)', borderRadius: 14, padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <Sparkles size={18} color={C.violet} />
              <div style={{ fontWeight: 800, fontSize: 15, color: C.text }}>Set Exact Target Price for ${activeToken.sym}</div>
            </div>
            <div style={{ fontSize: 12, color: C.muted, marginBottom: 16 }}>
              Directly sets the price to whatever target amount you desire. The system will automatically compute whether it is a pump or dump and sync with the DEX chart immediately.
            </div>

            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', maxWidth: 640 }}>
              <div style={{ position: 'relative', flex: '1 1 200px' }}>
                <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: C.violet, fontSize: 15, fontWeight: 900 }}>$</span>
                <input
                  type="number"
                  step="any"
                  value={targetPriceInput}
                  onChange={e => setTargetPriceInput(e.target.value)}
                  placeholder="0.0500"
                  style={{
                    width: '100%',
                    background: C.bg,
                    border: `1px solid ${C.border}`,
                    borderRadius: 10,
                    padding: '10px 14px 10px 28px',
                    color: C.text,
                    fontSize: 16,
                    fontWeight: 800,
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* Quick multipliers */}
              <div style={{ display: 'flex', gap: 6 }}>
                {[2, 5, 10].map(mult => {
                  const curr = activeToken.numericPrice || 0.005;
                  const tgt = Number((curr * mult).toFixed(4));
                  return (
                    <button
                      key={mult}
                      onClick={() => {
                        setTargetPriceInput(String(tgt));
                        handleSetTargetPrice(activeToken.sym, tgt);
                      }}
                      style={{ padding: '8px 12px', background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
                    >
                      {mult}x (${tgt})
                    </button>
                  );
                })}
              </div>

              <Btn onClick={() => handleSetTargetPrice(activeToken.sym, parseFloat(targetPriceInput) || 0.01)}>
                <Check size={14} />Apply Target Price Immediately 🚀
              </Btn>
            </div>
          </div>
        )}

        {controlMode === 'percent' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))', gap: 16 }}>
            {/* PERCENT PUMP */}
            <div style={{ background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.25)', borderRadius: 14, padding: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <TrendingUp size={18} color={C.green} />
                <div style={{ fontWeight: 800, fontSize: 15, color: C.text }}>Percentage Pump Controls</div>
              </div>
              <div style={{ fontSize: 11, color: C.muted, marginBottom: 14 }}>
                Pumps price upward by exact percentage calculation.
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 12 }}>
                <button
                  onClick={() => handlePump(activeToken.sym, 10)}
                  style={{ padding: '8px 10px', background: 'rgba(16,185,129,0.15)', border: `1px solid ${C.green}44`, borderRadius: 8, color: C.green, fontSize: 12, fontWeight: 800, cursor: 'pointer' }}
                >
                  +10% Pump
                </button>
                <button
                  onClick={() => handlePump(activeToken.sym, 25)}
                  style={{ padding: '8px 10px', background: 'rgba(16,185,129,0.22)', border: `1px solid ${C.green}66`, borderRadius: 8, color: C.green, fontSize: 12, fontWeight: 800, cursor: 'pointer' }}
                >
                  +25% Super
                </button>
                <button
                  onClick={() => handlePump(activeToken.sym, 50)}
                  style={{ padding: '8px 10px', background: C.green, border: 'none', borderRadius: 8, color: '#fff', fontSize: 12, fontWeight: 900, cursor: 'pointer' }}
                >
                  +50% Mega
                </button>
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <input
                    type="number"
                    value={customPump}
                    onChange={e => setCustomPump(e.target.value)}
                    placeholder="Custom %"
                    style={{ width: '100%', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: '7px 24px 7px 10px', color: C.text, fontSize: 12, outline: 'none' }}
                  />
                  <span style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', color: C.muted, fontSize: 11 }}>%</span>
                </div>
                <Btn sm onClick={() => handlePump(activeToken.sym, parseFloat(customPump) || 10)}>
                  <Zap size={12} />Pump 🚀
                </Btn>
              </div>
            </div>

            {/* PERCENT DUMP */}
            <div style={{ background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: 14, padding: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <TrendingDown size={18} color={C.red} />
                <div style={{ fontWeight: 800, fontSize: 15, color: C.text }}>Percentage Dump Controls</div>
              </div>
              <div style={{ fontSize: 11, color: C.muted, marginBottom: 14 }}>
                Dumps price downward by exact percentage.
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 12 }}>
                <button
                  onClick={() => handleDump(activeToken.sym, 10)}
                  style={{ padding: '8px 10px', background: 'rgba(239,68,68,0.15)', border: `1px solid ${C.red}44`, borderRadius: 8, color: C.red, fontSize: 12, fontWeight: 800, cursor: 'pointer' }}
                >
                  -10% Shake
                </button>
                <button
                  onClick={() => handleDump(activeToken.sym, 25)}
                  style={{ padding: '8px 10px', background: 'rgba(239,68,68,0.22)', border: `1px solid ${C.red}66`, borderRadius: 8, color: C.red, fontSize: 12, fontWeight: 800, cursor: 'pointer' }}
                >
                  -25% Heavy
                </button>
                <button
                  onClick={() => handleDump(activeToken.sym, 50)}
                  style={{ padding: '8px 10px', background: C.red, border: 'none', borderRadius: 8, color: '#fff', fontSize: 12, fontWeight: 900, cursor: 'pointer' }}
                >
                  -50% Crash
                </button>
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <input
                    type="number"
                    value={customDump}
                    onChange={e => setCustomDump(e.target.value)}
                    placeholder="Custom %"
                    style={{ width: '100%', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: '7px 24px 7px 10px', color: C.text, fontSize: 12, outline: 'none' }}
                  />
                  <span style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', color: C.muted, fontSize: 11 }}>%</span>
                </div>
                <Btn sm danger onClick={() => handleDump(activeToken.sym, parseFloat(customDump) || 10)}>
                  <ArrowDownRight size={12} />Dump 📉
                </Btn>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Real User Live Trades Audit Stream for the Selected Token */}
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', flexWrap: 'wrap', gap: 8 }}>
          <div style={{ fontWeight: 800, fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>Real User Trades Audit Stream for ${activeToken.sym}</span>
            <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 12, background: 'rgba(16,185,129,0.15)', color: C.green, fontWeight: 700 }}>
              Live Platform Orders
            </span>
          </div>
          <span style={{ fontSize: 11, color: C.muted }}>Showing {realAuditTrades.length} verified trades</span>
        </div>
        
        {loadingTrades ? (
          <div style={{ padding: 24, textAlign: 'center', color: C.muted }}>Loading on-chain trade audit...</div>
        ) : realAuditTrades.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '36px 20px', color: C.muted }}>
            <Activity size={32} style={{ marginBottom: 8, opacity: 0.35 }} />
            <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>No real user trades recorded yet for ${activeToken.sym}</div>
            <div style={{ fontSize: 11, marginTop: 4 }}>When real users buy or sell ${activeToken.sym} on the exchange, each order with its exact hash and amounts will appear here.</div>
          </div>
        ) : (
          <div style={{ maxHeight: 280, overflowY: 'auto', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, minWidth: 640 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${C.border}`, background: 'rgba(255,255,255,0.015)' }}>
                  {['Side', 'User Account', 'Total USD', `Token Amount (${activeToken.sym})`, 'Price', 'Tx Hash', 'Date'].map(h => (
                    <th key={h} style={TH}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {realAuditTrades.slice(0, 20).map(t => {
                  const isBuy = t.side === 'BUY';
                  const usdVal = (parseFloat(t.price_usd) || 0) * (parseFloat(t.token_amount) || 0);
                  return (
                    <tr key={t.id || t.tx_hash} style={{ borderBottom: `1px solid ${C.border}` }} {...TR_HOVER}>
                      <td style={TD}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 12, fontSize: 10, fontWeight: 800, background: isBuy ? `${C.green}22` : `${C.red}22`, color: isBuy ? C.green : C.red }}>
                          {isBuy ? '↑ BUY' : '↓ SELL'}
                        </span>
                      </td>
                      <td style={{ ...TD, fontFamily: 'monospace', fontSize: 11, color: '#A78BFA' }}>
                        {t.user_email || t.user_address || 'User'}
                      </td>
                      <td style={{ ...TD, fontWeight: 700, color: isBuy ? C.green : C.red }}>{fmtUSD(usdVal)}</td>
                      <td style={{ ...TD, color: C.text, fontWeight: 600 }}>{fmtCrypto(t.token_amount, activeToken.sym)}</td>
                      <td style={{ ...TD, fontWeight: 600 }}>{fmtUSD(t.price_usd)}</td>
                      <td style={{ ...TD, fontFamily: 'monospace', fontSize: 10, color: C.muted }}>
                        {t.tx_hash ? `${t.tx_hash.slice(0, 8)}...${t.tx_hash.slice(-6)}` : '—'}
                      </td>
                      <td style={{ ...TD, color: C.muted, fontSize: 11 }}>{t.created_at ? new Date(t.created_at).toLocaleDateString() : 'Recent'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Full Token Directory Table with User Holders & Volume */}
      <div>
        <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 14 }}>All Active Meme Coins ({filtered.length})</div>
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', width: '100%' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
              <thead><tr style={{ borderBottom: `1px solid ${C.border}`, background: 'rgba(255,255,255,0.02)' }}>
                {['Token', 'Price', '24h Change', 'Liquidity', 'Mkt Cap', 'Real Buyers', 'User Volume', 'Contract', 'Status', 'Quick Actions'].map(h => <th key={h} style={TH}>{h}</th>)}
              </tr></thead>
            <tbody>
              {filtered.length === 0 ? <tr><td colSpan={10}><EmptyState message="No tokens found." /></td></tr> : filtered.map(t => (
                <tr key={t.sym} style={{ borderBottom: `1px solid ${C.border}` }} {...TR_HOVER}>
                  <td style={TD}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {t.imageUrl ? (
                        <img src={t.imageUrl} alt={t.sym} style={{ width: 34, height: 34, borderRadius: '50%', objectFit: 'cover' }} onError={(e) => { (e.target as any).style.display = 'none'; }} />
                      ) : (
                        <div style={{ width: 34, height: 34, borderRadius: '50%', background: `${C.violet}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 12, color: C.violet }}>
                          {t.sym.slice(0, 2)}
                        </div>
                      )}
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                          {t.name}
                          {t.isNew && <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 4, background: 'rgba(16,185,129,0.2)', color: C.green, fontWeight: 800 }}>NEW</span>}
                        </div>
                        <div style={{ fontSize: 11, color: C.muted }}>${t.sym}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ ...TD, fontWeight: 700 }}>{t.price}</td>
                  <td style={{ ...TD, fontWeight: 700, color: t.pos ? C.green : C.red }}>{t.change}</td>
                  <td style={{ ...TD, color: C.muted }}>{t.liq}</td>
                  <td style={{ ...TD, color: C.muted }}>{t.cap}</td>
                  <td style={{ ...TD, fontWeight: 700, color: C.text }}>
                    {fmtCount(t.user_holders_count || 0)}
                  </td>
                  <td style={{ ...TD, fontWeight: 700, color: C.green }}>
                    {fmtUSD(t.total_user_buy_volume_usd || 0)}
                  </td>
                  <td style={TD}>
                    {(t.contractAddress || t.poolAddress) ? (
                      <div
                        onClick={() => {
                          const addr = t.contractAddress || t.poolAddress || '';
                          copyToClipboard(addr);
                          toast_(`Copied contract: ${addr.slice(0, 8)}...`);
                        }}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          background: 'rgba(124,58,237,0.1)',
                          border: '1px solid rgba(124,58,237,0.25)',
                          padding: '3px 8px',
                          borderRadius: 6,
                          color: '#A78BFA',
                          fontFamily: 'monospace',
                          fontSize: 11,
                          cursor: 'pointer',
                        }}
                        title="Click to copy full contract address"
                      >
                        <span>{(t.contractAddress || t.poolAddress || '').slice(0, 4)}...{(t.contractAddress || t.poolAddress || '').slice(-4)}</span>
                        <Copy size={11} />
                      </div>
                    ) : (
                      <span style={{ color: C.muted, fontSize: 11 }}>—</span>
                    )}
                  </td>
                  <td style={TD}><Badge status={t.is_rugged ? 'failed' : 'active'} /></td>
                  <td style={TD}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <Btn sm ghost onClick={() => openEditModal(t)} title="Edit coin metrics">
                        <Edit3 size={12} /> Edit
                      </Btn>
                      <Btn sm ghost onClick={() => handlePumpDollar(t.sym, 0.05)}>+$0.05 🚀</Btn>
                      <Btn sm ghost danger onClick={() => handleDumpDollar(t.sym, 0.05)}>-$0.05 📉</Btn>
                      {!t.is_rugged && (
                        <Btn sm danger onClick={() => setRugModal(t.sym)}>💀 Drain</Btn>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </Card>
      </div>


      {/* Create / Deploy Token Modal */}
      {modal && (() => {
        const priceNum = parseFloat(form.price) || 0;
        const supplyNum = parseFloat(form.supply) || 0;
        const liquidityNum = parseFloat(form.liquidity) || 0;
        const mktCapVal = parseFloat(form.marketCap) || (priceNum * supplyNum);
        const solVal = priceNum / 179.84;
        const formatMcap = (v: number) => {
          if (v >= 1e9) return `$${(v / 1e9).toFixed(2)}B`;
          if (v >= 1e6) return `$${(v / 1e6).toFixed(2)}M`;
          if (v >= 1e3) return `$${(v / 1e3).toFixed(0)}K`;
          return `$${v.toFixed(2)}`;
        };

        return (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 20, padding: 26, width: '100%', maxWidth: 540, maxHeight: '90vh', overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                <div>
                  <div style={{ fontWeight: 900, fontSize: 18, color: C.text, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Sparkles size={18} color={C.violet} />
                    <span>Deploy New Meme Token</span>
                  </div>
                  <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>Mint SPL token & list live on Axiom Wallet DEX with real pool contract</div>
                </div>
                <button onClick={() => setModal(false)} style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', padding: 4 }}><X size={18} /></button>
              </div>

              {/* Directly Editable Live Metrics Banner */}
              <div style={{ background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.3)', borderRadius: 14, padding: '12px 14px', marginBottom: 18, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                {/* MARKET CAP CARD */}
                <div style={{ background: C.surface2, border: '1px solid rgba(16,185,129,0.35)', borderRadius: 10, padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 10, color: C.muted, fontWeight: 800, textTransform: 'uppercase' }}>
                    <span>Market Cap</span>
                    <span style={{ color: C.green, fontSize: 9, fontWeight: 700, background: 'rgba(16,185,129,0.15)', padding: '1px 5px', borderRadius: 4 }}>✏️ EDIT</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <span style={{ color: C.green, fontWeight: 900, fontSize: 15 }}>$</span>
                    <input
                      type="number"
                      step="any"
                      value={form.marketCap}
                      onChange={e => handleDeployMarketCapChange(e.target.value)}
                      placeholder="5000000"
                      style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', color: C.green, fontWeight: 900, fontSize: 15, fontFamily: 'inherit', padding: 0 }}
                    />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 10, color: C.muted }}>
                    <span style={{ fontWeight: 700, color: '#34D399' }}>{formatMcap(mktCapVal)}</span>
                    <span>${mktCapVal.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                  </div>
                </div>

                {/* PRICE CARD */}
                <div style={{ background: C.surface2, border: '1px solid rgba(124,58,237,0.35)', borderRadius: 10, padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 10, color: C.muted, fontWeight: 800, textTransform: 'uppercase' }}>
                    <span>Price (USD / SOL)</span>
                    <span style={{ color: '#A78BFA', fontSize: 9, fontWeight: 700, background: 'rgba(124,58,237,0.15)', padding: '1px 5px', borderRadius: 4 }}>✏️ EDIT</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <span style={{ color: C.text, fontWeight: 900, fontSize: 15 }}>$</span>
                    <input
                      type="number"
                      step="any"
                      value={form.price}
                      onChange={e => handleDeployPriceChange(e.target.value)}
                      placeholder="0.0050"
                      style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', color: C.text, fontWeight: 900, fontSize: 15, fontFamily: 'inherit', padding: 0 }}
                    />
                  </div>
                  <div style={{ fontSize: 10, color: '#A78BFA', fontWeight: 600 }}>
                    {solVal < 0.0001 ? solVal.toFixed(7) : solVal.toFixed(5)} SOL
                  </div>
                </div>

                {/* LIQUIDITY CARD */}
                <div style={{ background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 10, padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 10, color: C.muted, fontWeight: 800, textTransform: 'uppercase' }}>
                    <span>Initial Liquidity</span>
                    <span style={{ color: C.muted, fontSize: 9, fontWeight: 700, background: 'rgba(124,58,237,0.08)', padding: '1px 5px', borderRadius: 4 }}>✏️ EDIT</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <span style={{ color: C.text, fontWeight: 900, fontSize: 15 }}>$</span>
                    <input
                      type="number"
                      step="any"
                      value={form.liquidity}
                      onChange={e => setForm(prev => ({ ...prev, liquidity: e.target.value }))}
                      placeholder="50000"
                      style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', color: C.text, fontWeight: 900, fontSize: 15, fontFamily: 'inherit', padding: 0 }}
                    />
                  </div>
                  <div style={{ fontSize: 10, color: C.muted }}>
                    Solana DEX Pool
                  </div>
                </div>
              </div>

              <form onSubmit={create} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* Name & Symbol Row */}
                <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, color: C.muted, fontWeight: 700, textTransform: 'uppercase', marginBottom: 5 }}>Token Name *</label>
                    <input
                      required
                      value={form.name}
                      onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g. Pepe Moon Rocket"
                      style={{ width: '100%', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: '9px 12px', color: C.text, fontSize: 13, boxSizing: 'border-box', outline: 'none' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, color: C.muted, fontWeight: 700, textTransform: 'uppercase', marginBottom: 5 }}>Symbol / Ticker *</label>
                    <input
                      required
                      value={form.symbol}
                      onChange={e => setForm(prev => ({ ...prev, symbol: e.target.value.toUpperCase() }))}
                      placeholder="e.g. PMOON"
                      style={{ width: '100%', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: '9px 12px', color: C.text, fontSize: 13, boxSizing: 'border-box', outline: 'none', fontWeight: 800 }}
                    />
                  </div>
                </div>

                {/* Contract Address Input */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                    <label style={{ fontSize: 11, color: C.muted, fontWeight: 700, textTransform: 'uppercase' }}>Contract Address (Solana Base58)</label>
                    <button
                      type="button"
                      onClick={() => setForm(prev => ({ ...prev, contractAddress: generateSolanaAddress() }))}
                      style={{ background: 'none', border: 'none', color: '#A78BFA', fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                    >
                      <RotateCcw size={11} /> Regenerate
                    </button>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <input
                      value={form.contractAddress}
                      onChange={e => setForm(prev => ({ ...prev, contractAddress: e.target.value }))}
                      placeholder="Auto-generated Solana address..."
                      style={{ flex: 1, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: '9px 12px', color: '#A78BFA', fontFamily: 'monospace', fontSize: 12, outline: 'none' }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (form.contractAddress) {
                          copyToClipboard(form.contractAddress);
                          toast_("Contract address copied!");
                        }
                      }}
                      style={{ background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 10, padding: '0 12px', color: C.muted, cursor: 'pointer' }}
                      title="Copy contract address"
                    >
                      <Copy size={14} />
                    </button>
                  </div>
                </div>

                {/* Picture / Logo with Avatar Presets */}
                <div>
                  <label style={{ display: 'block', fontSize: 11, color: C.muted, fontWeight: 700, textTransform: 'uppercase', marginBottom: 5 }}>
                    Coin Picture / Logo (Preset or Image URL)
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <div style={{ width: 42, height: 42, borderRadius: '50%', border: `2px solid ${C.violet}`, overflow: 'hidden', flexShrink: 0, background: C.surface2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {form.logo_url ? (
                        <img src={form.logo_url} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { (e.target as any).style.display = 'none'; }} />
                      ) : (
                        <Coins size={20} color={C.muted} />
                      )}
                    </div>
                    <input
                      value={form.logo_url}
                      onChange={e => setForm(prev => ({ ...prev, logo_url: e.target.value }))}
                      placeholder="Paste image URL (https://...)"
                      style={{ flex: 1, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: '9px 12px', color: C.text, fontSize: 12, outline: 'none' }}
                    />
                  </div>
                  {/* Preset quick chips */}
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {AVATAR_PRESETS.map(p => (
                      <button
                        key={p.name}
                        type="button"
                        onClick={() => setForm(prev => ({ ...prev, logo_url: p.url }))}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 5,
                          padding: '4px 9px',
                          borderRadius: 20,
                          border: form.logo_url === p.url ? `1px solid ${C.violet}` : `1px solid ${C.border}`,
                          background: form.logo_url === p.url ? 'rgba(124,58,237,0.18)' : C.surface2,
                          color: form.logo_url === p.url ? C.violet : C.text,
                          fontSize: 11,
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        <span>{p.icon}</span>
                        <span>{p.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 4-Field Grid: Market Cap, Price USD, Total Supply, Liquidity */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, color: C.muted, fontWeight: 700, textTransform: 'uppercase', marginBottom: 5 }}>Market Cap ($) *</label>
                    <input
                      required
                      type="number"
                      step="any"
                      value={form.marketCap}
                      onChange={e => handleDeployMarketCapChange(e.target.value)}
                      placeholder="5000000"
                      style={{ width: '100%', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: '9px 12px', color: C.green, fontWeight: 700, fontSize: 12, boxSizing: 'border-box', outline: 'none' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, color: C.muted, fontWeight: 700, textTransform: 'uppercase', marginBottom: 5 }}>Price USD ($) *</label>
                    <input
                      required
                      type="number"
                      step="any"
                      value={form.price}
                      onChange={e => handleDeployPriceChange(e.target.value)}
                      placeholder="0.005"
                      style={{ width: '100%', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: '9px 12px', color: C.text, fontSize: 12, boxSizing: 'border-box', outline: 'none' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, color: C.muted, fontWeight: 700, textTransform: 'uppercase', marginBottom: 5 }}>Total Supply *</label>
                    <input
                      required
                      type="number"
                      value={form.supply}
                      onChange={e => handleDeploySupplyChange(e.target.value)}
                      placeholder="1000000000"
                      style={{ width: '100%', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: '9px 12px', color: C.text, fontSize: 12, boxSizing: 'border-box', outline: 'none' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, color: C.muted, fontWeight: 700, textTransform: 'uppercase', marginBottom: 5 }}>Liquidity ($) *</label>
                    <input
                      required
                      type="number"
                      value={form.liquidity}
                      onChange={e => setForm(prev => ({ ...prev, liquidity: e.target.value }))}
                      placeholder="50000"
                      style={{ width: '100%', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: '9px 12px', color: C.text, fontSize: 12, boxSizing: 'border-box', outline: 'none' }}
                    />
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label style={{ display: 'block', fontSize: 11, color: C.muted, fontWeight: 700, textTransform: 'uppercase', marginBottom: 5 }}>Description</label>
                  <input
                    value={form.description}
                    onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Short description of the coin community..."
                    style={{ width: '100%', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: '9px 12px', color: C.text, fontSize: 12, boxSizing: 'border-box', outline: 'none' }}
                  />
                </div>

                <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                  <Btn ghost onClick={() => setModal(false)}>Cancel</Btn>
                  <Btn><Zap size={14} />Deploy Token & Launch Pool 🚀</Btn>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

      {/* Edit Meme Coin Metrics Modal */}
      {editModalToken && (() => {
        const priceNum = parseFloat(editForm.price) || 0;
        const supplyNum = parseFloat(editForm.supply) || 0;
        const liquidityNum = parseFloat(editForm.liquidity) || 0;
        const mktCapVal = parseFloat(editForm.marketCap) || (priceNum * supplyNum);
        const solVal = priceNum / 179.84;
        const formatMcap = (v: number) => {
          if (v >= 1e9) return `$${(v / 1e9).toFixed(2)}B`;
          if (v >= 1e6) return `$${(v / 1e6).toFixed(2)}M`;
          if (v >= 1e3) return `$${(v / 1e3).toFixed(0)}K`;
          return `$${v.toFixed(2)}`;
        };

        return (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1050, padding: 16 }}>
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 20, padding: 26, width: '100%', maxWidth: 540, maxHeight: '92vh', overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                <div>
                  <div style={{ fontWeight: 900, fontSize: 18, color: C.text, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Edit3 size={18} color={C.violet} />
                    <span>Edit Meme Coin Metrics — ${editModalToken.sym}</span>
                  </div>
                  <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
                    Update live market cap, price, liquidity, supply, and coin details on DEX
                  </div>
                </div>
                <button onClick={() => setEditModalToken(null)} style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', padding: 4 }}><X size={18} /></button>
              </div>

              {/* Dynamic Live Metrics Editable Preview Banner */}
              <div style={{ background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.3)', borderRadius: 14, padding: '12px 14px', marginBottom: 18, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                {/* MARKET CAP CARD */}
                <div style={{ background: C.surface2, border: '1px solid rgba(16,185,129,0.35)', borderRadius: 10, padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 10, color: C.muted, fontWeight: 800, textTransform: 'uppercase' }}>
                    <span>Market Cap</span>
                    <span style={{ color: C.green, fontSize: 9, fontWeight: 700, background: 'rgba(16,185,129,0.15)', padding: '1px 5px', borderRadius: 4 }}>✏️ EDIT</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <span style={{ color: C.green, fontWeight: 900, fontSize: 15 }}>$</span>
                    <input
                      type="number"
                      step="any"
                      value={editForm.marketCap}
                      onChange={e => handleEditMarketCapChange(e.target.value)}
                      placeholder="5000000"
                      style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', color: C.green, fontWeight: 900, fontSize: 15, fontFamily: 'inherit', padding: 0 }}
                    />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 10, color: C.muted }}>
                    <span style={{ fontWeight: 700, color: '#34D399' }}>{formatMcap(mktCapVal)}</span>
                    <span>${mktCapVal.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                  </div>
                </div>

                {/* PRICE CARD */}
                <div style={{ background: C.surface2, border: '1px solid rgba(124,58,237,0.35)', borderRadius: 10, padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 10, color: C.muted, fontWeight: 800, textTransform: 'uppercase' }}>
                    <span>Price (USD / SOL)</span>
                    <span style={{ color: '#A78BFA', fontSize: 9, fontWeight: 700, background: 'rgba(124,58,237,0.15)', padding: '1px 5px', borderRadius: 4 }}>✏️ EDIT</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <span style={{ color: C.text, fontWeight: 900, fontSize: 15 }}>$</span>
                    <input
                      type="number"
                      step="any"
                      value={editForm.price}
                      onChange={e => handleEditPriceChange(e.target.value)}
                      placeholder="0.0050"
                      style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', color: C.text, fontWeight: 900, fontSize: 15, fontFamily: 'inherit', padding: 0 }}
                    />
                  </div>
                  <div style={{ fontSize: 10, color: '#A78BFA', fontWeight: 600 }}>
                    {solVal < 0.0001 ? solVal.toFixed(7) : solVal.toFixed(5)} SOL
                  </div>
                </div>

                {/* LIQUIDITY CARD */}
                <div style={{ background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 10, padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 10, color: C.muted, fontWeight: 800, textTransform: 'uppercase' }}>
                    <span>Initial Liquidity</span>
                    <span style={{ color: C.muted, fontSize: 9, fontWeight: 700, background: 'rgba(124,58,237,0.08)', padding: '1px 5px', borderRadius: 4 }}>✏️ EDIT</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <span style={{ color: C.text, fontWeight: 900, fontSize: 15 }}>$</span>
                    <input
                      type="number"
                      step="any"
                      value={editForm.liquidity}
                      onChange={e => setEditForm(prev => ({ ...prev, liquidity: e.target.value }))}
                      placeholder="50000"
                      style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', color: C.text, fontWeight: 900, fontSize: 15, fontFamily: 'inherit', padding: 0 }}
                    />
                  </div>
                  <div style={{ fontSize: 10, color: C.muted }}>
                    Solana DEX Pool
                  </div>
                </div>
              </div>

              <form onSubmit={saveEditToken} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* Name & Symbol */}
                <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, color: C.muted, fontWeight: 700, textTransform: 'uppercase', marginBottom: 5 }}>Token Name *</label>
                    <input
                      required
                      value={editForm.name}
                      onChange={e => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                      style={{ width: '100%', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: '9px 12px', color: C.text, fontSize: 13, boxSizing: 'border-box', outline: 'none' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, color: C.muted, fontWeight: 700, textTransform: 'uppercase', marginBottom: 5 }}>Symbol / Ticker</label>
                    <input
                      disabled
                      value={editForm.symbol}
                      style={{ width: '100%', background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 10, padding: '9px 12px', color: C.muted, fontSize: 13, boxSizing: 'border-box', outline: 'none', fontWeight: 800, cursor: 'not-allowed' }}
                    />
                  </div>
                </div>

                {/* Contract Address */}
                <div>
                  <label style={{ display: 'block', fontSize: 11, color: C.muted, fontWeight: 700, textTransform: 'uppercase', marginBottom: 5 }}>Contract Address (Solana Base58)</label>
                  <input
                    value={editForm.contractAddress}
                    onChange={e => setEditForm(prev => ({ ...prev, contractAddress: e.target.value }))}
                    style={{ width: '100%', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: '9px 12px', color: '#A78BFA', fontFamily: 'monospace', fontSize: 12, boxSizing: 'border-box', outline: 'none' }}
                  />
                </div>

                {/* Picture / Logo */}
                <div>
                  <label style={{ display: 'block', fontSize: 11, color: C.muted, fontWeight: 700, textTransform: 'uppercase', marginBottom: 5 }}>Coin Picture / Logo (Preset or Image URL)</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <div style={{ width: 42, height: 42, borderRadius: '50%', border: `2px solid ${C.violet}`, overflow: 'hidden', flexShrink: 0, background: C.surface2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {editForm.logo_url ? (
                        <img src={editForm.logo_url} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { (e.target as any).style.display = 'none'; }} />
                      ) : (
                        <Coins size={20} color={C.muted} />
                      )}
                    </div>
                    <input
                      value={editForm.logo_url}
                      onChange={e => setEditForm(prev => ({ ...prev, logo_url: e.target.value }))}
                      placeholder="Paste image URL (https://...)"
                      style={{ flex: 1, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: '9px 12px', color: C.text, fontSize: 12, outline: 'none' }}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {AVATAR_PRESETS.map(p => (
                      <button
                        key={p.name}
                        type="button"
                        onClick={() => setEditForm(prev => ({ ...prev, logo_url: p.url }))}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 5,
                          padding: '4px 9px',
                          borderRadius: 20,
                          border: editForm.logo_url === p.url ? `1px solid ${C.violet}` : `1px solid ${C.border}`,
                          background: editForm.logo_url === p.url ? 'rgba(124,58,237,0.18)' : C.surface2,
                          color: editForm.logo_url === p.url ? C.violet : C.text,
                          fontSize: 11,
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        <span>{p.icon}</span>
                        <span>{p.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 4-Field Metrics Grid: Market Cap, Price, Supply, Liquidity */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, color: C.muted, fontWeight: 700, textTransform: 'uppercase', marginBottom: 5 }}>Market Cap ($) *</label>
                    <input
                      required
                      type="number"
                      step="any"
                      value={editForm.marketCap}
                      onChange={e => handleEditMarketCapChange(e.target.value)}
                      style={{ width: '100%', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: '9px 12px', color: C.green, fontWeight: 700, fontSize: 12, boxSizing: 'border-box', outline: 'none' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, color: C.muted, fontWeight: 700, textTransform: 'uppercase', marginBottom: 5 }}>Price USD ($) *</label>
                    <input
                      required
                      type="number"
                      step="any"
                      value={editForm.price}
                      onChange={e => handleEditPriceChange(e.target.value)}
                      style={{ width: '100%', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: '9px 12px', color: C.text, fontSize: 12, boxSizing: 'border-box', outline: 'none' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, color: C.muted, fontWeight: 700, textTransform: 'uppercase', marginBottom: 5 }}>Total Supply *</label>
                    <input
                      required
                      type="number"
                      value={editForm.supply}
                      onChange={e => handleEditSupplyChange(e.target.value)}
                      style={{ width: '100%', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: '9px 12px', color: C.text, fontSize: 12, boxSizing: 'border-box', outline: 'none' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, color: C.muted, fontWeight: 700, textTransform: 'uppercase', marginBottom: 5 }}>Liquidity ($) *</label>
                    <input
                      required
                      type="number"
                      value={editForm.liquidity}
                      onChange={e => setEditForm(prev => ({ ...prev, liquidity: e.target.value }))}
                      style={{ width: '100%', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: '9px 12px', color: C.text, fontSize: 12, boxSizing: 'border-box', outline: 'none' }}
                    />
                  </div>
                </div>

                {/* 24h Change */}
                <div>
                  <label style={{ display: 'block', fontSize: 11, color: C.muted, fontWeight: 700, textTransform: 'uppercase', marginBottom: 5 }}>24h Change (e.g. +15.5%)</label>
                  <input
                    value={editForm.change}
                    onChange={e => setEditForm(prev => ({ ...prev, change: e.target.value }))}
                    placeholder="+0.00%"
                    style={{ width: '100%', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: '9px 12px', color: C.text, fontSize: 12, boxSizing: 'border-box', outline: 'none' }}
                  />
                </div>

                <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                  <Btn ghost onClick={() => setEditModalToken(null)}>Cancel</Btn>
                  <Btn><Save size={14} />Save Changes & Sync DEX 🚀</Btn>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

      {/* Rugpull Confirmation Modal */}
      {rugModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }}>
          <div style={{ background: '#1A0D0D', border: '2px solid #EF4444', borderRadius: 18, padding: 24, width: 400, textAlign: 'center' }}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(239,68,68,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <Skull size={28} color="#EF4444" />
            </div>
            <div style={{ fontWeight: 900, fontSize: 18, color: '#fff', marginBottom: 8 }}>CONFIRM RUGPULL</div>
            <p style={{ fontSize: 12, color: '#FCA5A5', lineHeight: 1.5, marginBottom: 20 }}>
              Are you sure you want to rugpull <b>${rugModal}</b>? This will dump the token price to <b>$0.00000001 (-99.99%)</b> and set liquidity to $0. This action is irreversible.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <Btn ghost onClick={() => setRugModal(null)}>Cancel</Btn>
              <button
                onClick={() => handleRugpull(rugModal)}
                style={{ padding: '10px 18px', background: '#DC2626', border: 'none', borderRadius: 10, color: '#fff', fontSize: 13, fontWeight: 900, cursor: 'pointer' }}
              >
                Yes, Execute Rugpull 💀
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

/* ══════════════════════ PAGE 3: USERS & WALLETS ══════════════════ */
function UsersPage({ metrics, loading, search }: { metrics: AdminMetrics; loading: boolean; search: string }) {
  const [users, setUsers] = useState<any[]>(STUB_USERS);
  const [localSearch, setLocalSearch] = useState('');
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [sel, setSel] = useState<any | null>(null);
  const [page, setPage] = useState(1);
  const PER = 10;

  useEffect(() => {
    let isMounted = true;
    setLoadingUsers(true);
    api.getAdminUsers().then(data => {
      if (isMounted && data && data.length > 0) {
        setUsers(data);
      }
    }).catch(() => {
      // keep fallback
    }).finally(() => {
      if (isMounted) setLoadingUsers(false);
    });
    return () => { isMounted = false; };
  }, []);

  const effectiveSearch = (localSearch || search || '').toLowerCase().trim();
  const filtered = users.filter(u => {
    if (!effectiveSearch) return true;
    const ident = (u.email || u.username || '').toLowerCase();
    const addr = (u.wallet_address || u.address || '').toLowerCase();
    const name = (u.full_name || '').toLowerCase();
    const idStr = String(u.id || '').toLowerCase();
    const status = (u.status || '').toLowerCase();
    const balStr = String(u.total_balance_usd || u.balance || '').toLowerCase();
    return ident.includes(effectiveSearch) || addr.includes(effectiveSearch) || name.includes(effectiveSearch) || idStr.includes(effectiveSearch) || status.includes(effectiveSearch) || balStr.includes(effectiveSearch);
  });

  const pages = Math.max(1, Math.ceil(filtered.length / PER));
  const slice = filtered.slice((page - 1) * PER, page * PER);
  const toggle = (id: any) => setUsers(p => p.map(u => u.id === id ? { ...u, status: u.status === 'suspended' ? 'active' : 'suspended' } : u));

  if (loading) return <LoadingSpinner />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* 4 Calculation Velocity Cards for Users */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: 14 }}>
        <div style={{ background: 'rgba(124, 58, 237, 0.05)', border: '1px solid rgba(124, 58, 237, 0.22)', borderRadius: 14, padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 42, height: 42, borderRadius: 10, background: 'rgba(124, 58, 237, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.violet, flexShrink: 0 }}>
            <Users size={20} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 11, color: C.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Registered Users</div>
            <div style={{ fontSize: 18, fontWeight: 900, color: C.text, marginTop: 2 }}>
              {fmtCount(metrics?.kpis?.total_users || users.length || 1186)}
            </div>
            <div style={{ fontSize: 11, color: '#A78BFA', fontWeight: 600 }}>Total platform accounts</div>
          </div>
        </div>

        <div style={{ background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.22)', borderRadius: 14, padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 42, height: 42, borderRadius: 10, background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.green, flexShrink: 0 }}>
            <Zap size={20} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 11, color: C.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>New Users Today</div>
            <div style={{ fontSize: 18, fontWeight: 900, color: C.green, marginTop: 2 }}>
              {fmtCount(metrics?.kpis?.users_today || 0)}
            </div>
            <div style={{ fontSize: 11, color: C.green, fontWeight: 600 }}>Signed up in last 24h</div>
          </div>
        </div>

        <div style={{ background: 'rgba(59, 130, 246, 0.05)', border: '1px solid rgba(59, 130, 246, 0.22)', borderRadius: 14, padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 42, height: 42, borderRadius: 10, background: 'rgba(59, 130, 246, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#60A5FA', flexShrink: 0 }}>
            <Clock size={20} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 11, color: C.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>New Users This Week</div>
            <div style={{ fontSize: 18, fontWeight: 900, color: C.text, marginTop: 2 }}>
              {fmtCount(metrics?.kpis?.users_this_week || 0)}
            </div>
            <div style={{ fontSize: 11, color: '#60A5FA', fontWeight: 600 }}>Past 7 days velocity</div>
          </div>
        </div>

        <div style={{ background: 'rgba(245, 158, 11, 0.05)', border: '1px solid rgba(245, 158, 11, 0.22)', borderRadius: 14, padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 42, height: 42, borderRadius: 10, background: 'rgba(245, 158, 11, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.amber, flexShrink: 0 }}>
            <DollarSign size={20} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 11, color: C.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total User Asset Value</div>
            <div style={{ fontSize: 18, fontWeight: 900, color: C.text, marginTop: 2 }}>
              {fmtUSD(metrics?.kpis?.user_assets_usd || 0)}
            </div>
            <div style={{ fontSize: 11, color: C.amber, fontWeight: 600 }}>Total portfolio custody</div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <div style={{ fontSize: 18, fontWeight: 800 }}>Users &amp; Wallets ({filtered.length})</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', minWidth: 200 }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: C.muted }} />
            <input
              value={localSearch}
              onChange={e => { setLocalSearch(e.target.value); setPage(1); }}
              placeholder="Search user, address, name..."
              style={{ width: '100%', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: localSearch ? '7px 28px 7px 30px' : '7px 12px 7px 30px', color: C.text, fontSize: 12, outline: 'none', boxSizing: 'border-box' }}
            />
            {localSearch && (
              <button
                type="button"
                onClick={() => { setLocalSearch(''); setPage(1); }}
                style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: C.muted, cursor: 'pointer', padding: 2 }}
              >
                <X size={12} />
              </button>
            )}
          </div>
          {loadingUsers && <span style={{ fontSize: 11, color: C.muted }}>Syncing live users...</span>}
        </div>
      </div>

      <Card style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', width: '100%' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 640 }}>
            <thead><tr style={{ borderBottom: `1px solid ${C.border}`, background: 'rgba(255,255,255,0.02)' }}>
              {['User Account', 'Wallet Address', 'Total Assets', 'Joined Date', 'Status', 'Actions'].map(h => <th key={h} style={TH}>{h}</th>)}
            </tr></thead>
            <tbody>
              {slice.length === 0 ? <tr><td colSpan={6}><EmptyState message="No users found." /></td></tr> : slice.map(u => {
                const label = u.email || u.username || 'User';
                const addr = u.wallet_address || u.address || '0x...';
                const bal = u.total_balance_usd !== undefined ? fmtUSD(u.total_balance_usd) : fmtUSD(u.balance);
                const date = u.created_at || u.joined || 'Recent';
                return (
                  <tr key={u.id} style={{ borderBottom: `1px solid ${C.border}`, cursor: 'pointer' }} onClick={() => setSel(u)} {...TR_HOVER}>
                    <td style={TD}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 34, height: 34, borderRadius: '50%', background: `${C.violet}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 11, color: C.violet }}>
                          {label.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700 }}>{label}</div>
                          {u.is_email_verified && <span style={{ fontSize: 9, color: C.green, fontWeight: 700 }}>Verified</span>}
                        </div>
                      </div>
                    </td>
                    <td style={{ ...TD, fontSize: 12, color: C.muted, fontFamily: 'monospace' }}>
                      {addr.length > 16 ? `${addr.slice(0, 8)}...${addr.slice(-6)}` : addr}
                    </td>
                    <td style={{ ...TD, fontWeight: 800, color: C.text }}>{bal}</td>
                    <td style={{ ...TD, color: C.muted, fontSize: 12 }}>{date}</td>
                    <td style={TD}><Badge status={u.status || 'active'} /></td>
                    <td style={TD} onClick={e => e.stopPropagation()}>
                      <Btn sm ghost danger={u.status === 'active'} onClick={() => toggle(u.id)}>
                        {u.status === 'suspended' ? <><Shield size={12} />Reinstate</> : <><X size={12} />Suspend</>}
                      </Btn>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {pages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, padding: 16, borderTop: `1px solid ${C.border}` }}>
            <Btn sm ghost onClick={() => setPage(p => Math.max(1, p - 1))}><ChevronLeft size={14} /></Btn>
            <span style={{ fontSize: 13, color: C.muted }}>Page {page} of {pages}</span>
            <Btn sm ghost onClick={() => setPage(p => Math.min(pages, p + 1))}><ChevronRight size={14} /></Btn>
          </div>
        )}
      </Card>

      {sel && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 900 }} onClick={() => setSel(null)}>
          <div style={{ position: 'fixed', right: 0, top: 0, bottom: 0, width: 'min(360px, 90vw)', background: C.surface, borderLeft: `1px solid ${C.border}`, padding: 24, overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
              <div style={{ fontWeight: 800, fontSize: 16 }}>User Portfolio Detail</div>
              <button onClick={() => setSel(null)} style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: `${C.violet}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 18, color: C.violet }}>
                {(sel.email || sel.username || 'U').slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: 16 }}>{sel.email || sel.username}</div>
                <div style={{ fontSize: 11, color: C.muted, fontFamily: 'monospace', marginTop: 2 }}>
                  {sel.wallet_address || sel.address}
                </div>
              </div>
            </div>
            {[
              ['Net Asset Value', sel.total_balance_usd !== undefined ? fmtUSD(sel.total_balance_usd) : fmtUSD(sel.balance)],
              ['Registration Date', sel.created_at || sel.joined || 'Recent'],
              ['Account Status', sel.status || 'Active']
            ].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: `1px solid ${C.border}` }}>
                <span style={{ color: C.muted, fontSize: 13 }}>{k}</span>
                <span style={{ fontWeight: 700, fontSize: 13 }}>{v}</span>
              </div>
            ))}
            <div style={{ marginTop: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Asset Balances</div>
              {sel.balances ? (
                Object.entries(sel.balances).map(([curr, amt]) => (
                  <div key={curr} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: `1px solid ${C.border}` }}>
                    <span style={{ color: C.muted, fontSize: 12, fontWeight: 700 }}>{curr}</span>
                    <span style={{ fontWeight: 600, fontSize: 12 }}>{fmtCrypto(amt, curr)}</span>
                  </div>
                ))
              ) : (
                ['SOL', 'USDT', 'ETH', 'BTC'].map(c => (
                  <div key={c} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: `1px solid ${C.border}` }}>
                    <span style={{ color: C.muted, fontSize: 12, fontWeight: 700 }}>{c}</span>
                    <span style={{ fontWeight: 600, fontSize: 12 }}>0.00 {c}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════ PAGE 4: DEPOSITS ═════════════════════════ */
function DepositsPage({ metrics, loading, search }: { metrics: AdminMetrics; loading: boolean; search: string }) {
  const [sf, setSf] = useState('all');
  const [localSearch, setLocalSearch] = useState('');
  const [deposits, setDeposits] = useState<any[]>(STUB_DEPOSITS);
  const [loadingDeposits, setLoadingDeposits] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setLoadingDeposits(true);
    api.getAdminDeposits().then(data => {
      if (isMounted && data && data.length > 0) {
        setDeposits(data);
      }
    }).catch(() => {
      // keep fallback
    }).finally(() => {
      if (isMounted) setLoadingDeposits(false);
    });
    return () => { isMounted = false; };
  }, []);

  const k = metrics?.kpis || {} as any;
  const effectiveSearch = (localSearch || search || '').toLowerCase().trim();

  const rows = deposits.filter(d => {
    const userStr = (d.user || '').toLowerCase();
    const tokenStr = (d.currency || d.token || '').toLowerCase();
    const txStr = (d.tx_hash || '').toLowerCase();
    const amtStr = String(d.amount || '').toLowerCase();
    const usdStr = String(d.amount_usd || '').toLowerCase();
    const statStr = (d.status || '').toLowerCase();
    const ms = !effectiveSearch || userStr.includes(effectiveSearch) || tokenStr.includes(effectiveSearch) || txStr.includes(effectiveSearch) || amtStr.includes(effectiveSearch) || usdStr.includes(effectiveSearch) || statStr.includes(effectiveSearch);
    return ms && (sf === 'all' || d.status === sf);
  });

  if (loading) return <LoadingSpinner />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* 4 Calculation Velocity Cards for Deposits */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: 14 }}>
        <div style={{ background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.22)', borderRadius: 14, padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 42, height: 42, borderRadius: 10, background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.green, flexShrink: 0 }}>
            <ArrowDownToLine size={20} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 11, color: C.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Deposits Today</div>
            <div style={{ fontSize: 18, fontWeight: 900, color: C.text, marginTop: 2 }}>{fmtUSD(k.deposits_today_usd || 0)}</div>
            <div style={{ fontSize: 11, color: C.green, fontWeight: 600 }}>{k.deposits_today_count || 0} confirmed today</div>
          </div>
        </div>

        <div style={{ background: 'rgba(59, 130, 246, 0.05)', border: '1px solid rgba(59, 130, 246, 0.22)', borderRadius: 14, padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 42, height: 42, borderRadius: 10, background: 'rgba(59, 130, 246, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#60A5FA', flexShrink: 0 }}>
            <Clock size={20} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 11, color: C.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Deposits This Week</div>
            <div style={{ fontSize: 18, fontWeight: 900, color: C.text, marginTop: 2 }}>{fmtUSD(k.deposits_this_week_usd || 0)}</div>
            <div style={{ fontSize: 11, color: '#60A5FA', fontWeight: 600 }}>7 days running volume</div>
          </div>
        </div>

        <div style={{ background: 'rgba(124, 58, 237, 0.05)', border: '1px solid rgba(124, 58, 237, 0.22)', borderRadius: 14, padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 42, height: 42, borderRadius: 10, background: 'rgba(124, 58, 237, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.violet, flexShrink: 0 }}>
            <Zap size={20} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 11, color: C.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Deposits This Month</div>
            <div style={{ fontSize: 18, fontWeight: 900, color: C.text, marginTop: 2 }}>{fmtUSD(k.deposits_this_month_usd || 0)}</div>
            <div style={{ fontSize: 11, color: '#A78BFA', fontWeight: 600 }}>30 days inflow total</div>
          </div>
        </div>

        <div style={{ background: 'rgba(245, 158, 11, 0.05)', border: '1px solid rgba(245, 158, 11, 0.22)', borderRadius: 14, padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 42, height: 42, borderRadius: 10, background: 'rgba(245, 158, 11, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.amber, flexShrink: 0 }}>
            <DollarSign size={20} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 11, color: C.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>All-Time Deposits</div>
            <div style={{ fontSize: 18, fontWeight: 900, color: C.text, marginTop: 2 }}>{fmtUSD(k.deposits_all_usd || k.total_volume_usd || 0)}</div>
            <div style={{ fontSize: 11, color: C.amber, fontWeight: 600 }}>Total verified deposits</div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <div style={{ fontSize: 18, fontWeight: 800 }}>Platform Deposits ({rows.length})</div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', minWidth: 180 }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: C.muted }} />
            <input
              value={localSearch}
              onChange={e => setLocalSearch(e.target.value)}
              placeholder="Search user, currency, tx..."
              style={{ width: '100%', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: localSearch ? '6px 28px 6px 30px' : '6px 12px 6px 30px', color: C.text, fontSize: 12, outline: 'none', boxSizing: 'border-box' }}
            />
            {localSearch && (
              <button
                type="button"
                onClick={() => setLocalSearch('')}
                style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: C.muted, cursor: 'pointer', padding: 2 }}
              >
                <X size={12} />
              </button>
            )}
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
            <Filter size={15} color={C.muted} />
            {['all', 'confirmed', 'completed', 'pending', 'failed'].map(s => (
              <button key={s} onClick={() => setSf(s)} style={{ padding: '5px 12px', borderRadius: 8, border: `1px solid ${sf === s ? C.violet : C.border}`, background: sf === s ? `${C.violet}22` : 'transparent', color: sf === s ? C.violet : C.muted, fontSize: 11, fontWeight: 700, cursor: 'pointer', textTransform: 'capitalize', transition: 'all 150ms' }}>{s}</button>
            ))}
          </div>
        </div>
      </div>

      <Card style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', width: '100%' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 640 }}>
            <thead><tr style={{ borderBottom: `1px solid ${C.border}`, background: 'rgba(255,255,255,0.02)' }}>
              {['User', 'Deposit Amount', 'USD Value', 'Token / Currency', 'Date / Time', 'Status'].map(h => <th key={h} style={TH}>{h}</th>)}
            </tr></thead>
            <tbody>
              {rows.length === 0 ? <tr><td colSpan={6}><EmptyState message="No deposits match your filters." /></td></tr> : rows.map(d => {
                const currency = d.currency || d.token || 'USDT';
                const amtFormatted = fmtCrypto(d.amount, currency);
                const usdFormatted = d.amount_usd !== undefined ? fmtUSD(d.amount_usd) : fmtUSD(d.amount);
                return (
                  <tr key={d.id} style={{ borderBottom: `1px solid ${C.border}` }} {...TR_HOVER}>
                    <td style={{ ...TD, fontSize: 12, color: C.text, fontFamily: 'monospace' }}>
                      {d.user && d.user.length > 16 ? `${d.user.slice(0, 8)}...${d.user.slice(-6)}` : d.user}
                    </td>
                    <td style={{ ...TD, fontWeight: 800, color: d.status === 'failed' ? C.red : C.green }}>
                      {amtFormatted}
                    </td>
                    <td style={{ ...TD, fontWeight: 700, color: C.text }}>
                      {usdFormatted}
                    </td>
                    <td style={TD}>
                      <span style={{ fontWeight: 700, background: 'rgba(255,255,255,0.06)', padding: '2px 8px', borderRadius: 6 }}>
                        {currency}
                      </span>
                    </td>
                    <td style={{ ...TD, color: C.muted, fontSize: 12 }}>{d.created_at || d.date}</td>
                    <td style={TD}><Badge status={d.status} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}


/* ══════════════════════ PAGE 4.5: DEPOSIT WALLETS (MULTI-NETWORK POOL) ═════════ */
function DepositWalletsPage({ loading: parentLoading }: { loading: boolean }) {
  const [wallets, setWallets] = useState<PlatformDepositWallet[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedNetwork, setSelectedNetwork] = useState<string>('ALL');
  const [toast, setToast] = useState<string | null>(null);
  const toast_ = (m: string) => { setToast(m); setTimeout(() => setToast(null), 3500); };

  const NETWORKS = [
    'ALL',
    'TRON (TRC-20)',
    'BNB Chain (BEP-20)',
    'Solana (SPL)',
    'Ethereum (ERC-20)',
    'Bitcoin (BTC)'
  ];

  const fetchWallets = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.getAdminDepositWallets();
      if (res.wallets && res.wallets.length > 0) {
        setWallets(res.wallets);
      }
    } catch {
      // Keep state if offline
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWallets();
  }, [fetchWallets]);

  const handleUpdateField = (id: number, field: keyof PlatformDepositWallet, value: any) => {
    setWallets(prev => prev.map(w => w.id === id ? { ...w, [field]: value } : w));
  };

  const handleAddWallet = () => {
    const net = selectedNetwork === 'ALL' ? 'TRON (TRC-20)' : selectedNetwork;
    const newIdx = wallets.length + 1;
    const newWallet: PlatformDepositWallet = {
      id: Date.now(),
      order_index: newIdx,
      label: `Hot Vault #${newIdx} (${net})`,
      address: '',
      network: net,
      is_active: true,
      total_received_usd: '0.00'
    };
    setWallets(prev => [...prev, newWallet]);
    toast_(`Added new ${net} wallet draft. Enter address & click Save.`);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const res = await api.updateAdminDepositWallets(wallets);
      if (res.success) {
        setWallets(res.wallets);
        toast_("✅ All Deposit Wallets successfully updated and synced live!");
      }
    } catch (e: any) {
      toast_("❌ Failed to update wallets: " + (e.message || "Unknown error"));
    } finally {
      setSaving(false);
    }
  };

  const filteredWallets = selectedNetwork === 'ALL'
    ? wallets
    : wallets.filter(w => (w.network || '').toLowerCase().includes(selectedNetwork.toLowerCase()) || selectedNetwork.toLowerCase().includes((w.network || '').toLowerCase()));

  const activeCount = wallets.filter(w => w.is_active).length;
  const totalVolume = wallets.reduce((sum, w) => sum + Number(w.total_received_usd || 0), 0);

  if (loading || parentLoading) return <LoadingSpinner />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {toast && <Toast msg={toast} onClose={() => setToast(null)} />}

      {/* Top Header & Save Button */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800 }}>Platform Multi-Network Deposit Wallets</div>
          <div style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>
            Manage receiving wallets across TRON, BNB Chain, Solana, Ethereum, and Bitcoin. Edit or change any address anytime.
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Btn onClick={handleAddWallet} style={{ background: C.surface2, border: `1px solid ${C.border}`, color: C.text, padding: '10px 16px', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, cursor: 'pointer' }}>
            <Plus size={15} /> Add Wallet
          </Btn>
          <Btn onClick={handleSave} style={{ background: C.violet, color: '#fff', padding: '10px 22px', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, cursor: 'pointer' }}>
            {saving ? <RefreshCw size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={15} />}
            {saving ? 'Saving...' : 'Save All Changes'}
          </Btn>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
        <StatCard icon={<Shield />} label="Active Platform Wallets" value={`${activeCount} / ${wallets.length}`} color={C.green} />
        <StatCard icon={<Zap />} label="Supported Chains" value="TRON · BSC · SOL · ETH · BTC" color={C.violet} />
        <StatCard icon={<DollarSign />} label="Total Pool Volume" value={`$${totalVolume.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} color={C.amber} />
      </div>

      {/* Exodus / Multi-Wallet Setup Guide Banner */}
      <div style={{ padding: '14px 18px', background: 'rgba(124, 58, 237, 0.08)', borderRadius: 12, border: '1px solid rgba(124, 58, 237, 0.25)', display: 'flex', alignItems: 'center', gap: 14 }}>
        <Sparkles size={20} color={C.violet} style={{ flexShrink: 0 }} />
        <div style={{ fontSize: 13, lineHeight: 1.5 }}>
          <b>💡 How to link your personal wallet (Exodus, Trust Wallet, MetaMask):</b><br />
          Open Exodus on your phone or PC, click <b>Receive</b> for each asset (TRON for USDT TRC-20, BSC for USDT BEP-20, Solana, Ethereum, Bitcoin), then copy & paste your receive addresses into the corresponding network cards below. Whenever users deposit funds, they drop straight into your Exodus wallet!
        </div>
      </div>

      {/* Network Filter Pills with Count Badges */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: C.muted, marginRight: 4 }}>Select Network Pool:</span>
        {NETWORKS.map(net => {
          const count = net === 'ALL'
            ? wallets.length
            : wallets.filter(w => (w.network || '').toLowerCase().includes(net.split(' ')[0].toLowerCase())).length;
          return (
            <button
              key={net}
              type="button"
              onClick={() => setSelectedNetwork(net)}
              style={{
                padding: '6px 14px',
                borderRadius: 20,
                fontSize: 12,
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                background: selectedNetwork === net ? C.violet : C.surface2,
                color: selectedNetwork === net ? '#fff' : C.muted,
                transition: 'all 150ms',
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}
            >
              <span>{net === 'ALL' ? 'All Chains' : net}</span>
              <span style={{
                fontSize: 10,
                padding: '1px 6px',
                borderRadius: 10,
                background: selectedNetwork === net ? 'rgba(255,255,255,0.25)' : C.surface,
                color: selectedNetwork === net ? '#fff' : C.text
              }}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Pool Header for Selected Network */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 18px', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 800, color: C.text }}>
            {selectedNetwork === 'ALL' ? 'Platform Multi-Chain Vaults (25 Wallets Pool)' : `${selectedNetwork} Pool (5 Dedicated Vaults)`}
          </div>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 3 }}>
            {selectedNetwork === 'ALL'
              ? 'Displaying all 25 wallets across 5 chains. Enter or update your receiving addresses and click "Save All Changes".'
              : `Fill in all 5 ${selectedNetwork} receiving addresses. When users deposit via ${selectedNetwork}, the system randomly routes to 1 of these 5 addresses.`}
          </div>
        </div>
        <div style={{ fontSize: 12, fontWeight: 700, color: C.violet, background: 'rgba(124,58,237,0.12)', padding: '6px 14px', borderRadius: 8, whiteSpace: 'nowrap' }}>
          {filteredWallets.length} / 5 Slots
        </div>
      </div>

      {/* Wallets Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 290px), 1fr))', gap: 16 }}>
        {filteredWallets.map((w, index) => {
          const slotNum = (index % 5) + 1;
          return (
          <Card key={w.id} style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: 20, border: `1px solid ${w.is_active ? C.border : 'rgba(239,68,68,0.3)'}`, background: w.is_active ? C.surface : 'rgba(239,68,68,0.03)', borderRadius: 14 }}>
            {/* Vault Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ width: 28, height: 28, borderRadius: 8, background: C.violet, color: '#fff', fontSize: 12, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  #{slotNum}
                </span>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 800 }}>{w.label || `Vault Slot #${slotNum}`}</div>
                  <div style={{ fontSize: 11, color: C.muted }}>{w.network || 'Solana (SPL)'} · Global ID #{w.order_index || index + 1}</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleUpdateField(w.id, 'is_active', !w.is_active)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
                title="Toggle Active Status"
              >
                <span style={{ fontSize: 11, fontWeight: 700, color: w.is_active ? C.green : C.red }}>
                  {w.is_active ? 'ACTIVE' : 'DISABLED'}
                </span>
                {w.is_active ? <ToggleRight size={28} color={C.green} /> : <ToggleLeft size={28} color={C.muted} />}
              </button>
            </div>

            {/* Network Selector */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 6 }}>
                Blockchain Network
              </label>
              <select
                value={w.network || 'Solana (SPL)'}
                onChange={e => handleUpdateField(w.id, 'network', e.target.value)}
                style={{ width: '100%', background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 8, padding: '8px 12px', color: C.text, fontSize: 13, outline: 'none', cursor: 'pointer' }}
              >
                <option value="TRON (TRC-20)">TRON (TRC-20) — (USDT TRC20)</option>
                <option value="BNB Chain (BEP-20)">BNB Chain (BEP-20) — (USDT & BNB)</option>
                <option value="Solana (SPL)">Solana (SPL) — (SOL, USDT, USDC)</option>
                <option value="Ethereum (ERC-20)">Ethereum (ERC-20) — (ETH & USDT)</option>
                <option value="Bitcoin (BTC)">Bitcoin (BTC) — (Native BTC)</option>
              </select>
            </div>

            {/* Label Input */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 6 }}>
                Vault Name / Label
              </label>
              <input
                type="text"
                value={w.label}
                onChange={e => handleUpdateField(w.id, 'label', e.target.value)}
                style={{ width: '100%', background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 8, padding: '8px 12px', color: C.text, fontSize: 13, outline: 'none' }}
                placeholder="e.g. Exodus TRON Vault"
              />
            </div>

            {/* Address Input */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Receiving Address ({w.network})
                </label>
                <button
                  type="button"
                  onClick={() => {
                    copyToClipboard(w.address);
                    toast_(`Copied address to clipboard!`);
                  }}
                  style={{ background: 'none', border: 'none', color: C.violet, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700 }}
                >
                  <Copy size={12} /> Copy
                </button>
              </div>
              <input
                type="text"
                value={w.address}
                onChange={e => handleUpdateField(w.id, 'address', e.target.value)}
                style={{ width: '100%', background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 8, padding: '9px 12px', color: C.text, fontSize: 12, fontFamily: 'monospace', outline: 'none' }}
                placeholder={
                  (w.network || '').includes('TRON') ? 'TRON address (starts with T...)' :
                  (w.network || '').includes('BNB') || (w.network || '').includes('Ethereum') ? 'EVM address (0x...)' :
                  (w.network || '').includes('Bitcoin') ? 'Bitcoin address (bc1... or 1...)' :
                  'Solana Base58 address...'
                }
              />
            </div>

            {/* Card Footer */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, borderTop: `1px solid ${C.border}`, fontSize: 11, color: C.muted }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <Shield size={12} color={C.green} /> Status: <b style={{ color: w.is_active ? C.green : C.red }}>{w.is_active ? 'Active on Platform' : 'Disabled'}</b>
              </span>
              <span>Total Received: <b style={{ color: C.text }}>${Number(w.total_received_usd || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</b></span>
            </div>
          </Card>
          );
        })}
      </div>

      {/* Bottom Save Button */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
        <Btn onClick={handleSave} style={{ background: C.violet, color: '#fff', padding: '10px 24px', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, cursor: 'pointer' }}>
          {saving ? <RefreshCw size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={15} />}
          {saving ? 'Saving...' : 'Save All Changes'}
        </Btn>
      </div>
    </div>
  );
}

/* ══════════════════════ PAGE 5: PENDING WITHDRAWALS ═════════════ */
function WithdrawalsPage({ loading: initialLoading, search }: { loading: boolean; search: string }) {
  const [ws, setWs] = useState<WithdrawalRequest[]>(STUB_WITHDRAWALS);
  const [localSearch, setLocalSearch] = useState('');
  const [loading, setLoading] = useState(initialLoading);
  const [toast, setToast] = useState<string | null>(null);
  const [actionModal, setActionModal] = useState<{
    type: 'approve' | 'reject';
    item: WithdrawalRequest;
  } | null>(null);
  const [customTxHash, setCustomTxHash] = useState('');
  const [rejectReason, setRejectReason] = useState('Compliance verification failed');
  const [submittingAction, setSubmittingAction] = useState(false);

  const toast_ = (m: string) => { setToast(m); setTimeout(() => setToast(null), 3500); };

  const fetchWs = useCallback(async () => {
    try {
      const data = await api.getAdminWithdrawals();
      if (data && data.length > 0) {
        setWs(data);
      }
    } catch {
      // fallback to stubs
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWs();
  }, [fetchWs]);

  const handleApprove = async () => {
    if (!actionModal) return;
    setSubmittingAction(true);
    try {
      const res = await api.approveWithdrawal(actionModal.item.id, customTxHash.trim() || undefined);
      setWs(p => p.map(w => w.id === actionModal.item.id ? { ...w, status: 'APPROVED' as const, tx_hash: res.tx_hash } : w));
      toast_(`✅ Withdrawal #${actionModal.item.id} approved! TxHash: ${res.tx_hash.slice(0, 12)}...`);
      setActionModal(null);
      setCustomTxHash('');
    } catch (err: any) {
      toast_(`❌ Approval failed: ${err.message || 'Network error'}`);
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleReject = async () => {
    if (!actionModal) return;
    setSubmittingAction(true);
    try {
      await api.rejectWithdrawal(actionModal.item.id, rejectReason.trim() || 'Admin rejection');
      setWs(p => p.map(w => w.id === actionModal.item.id ? { ...w, status: 'REJECTED' as const } : w));
      toast_(`🛡️ Withdrawal #${actionModal.item.id} rejected. Locked funds refunded to user.`);
      setActionModal(null);
      setRejectReason('Compliance verification failed');
    } catch (err: any) {
      toast_(`❌ Rejection failed: ${err.message || 'Network error'}`);
    } finally {
      setSubmittingAction(false);
    }
  };

  const pending = ws.filter(w => w.status === 'PENDING');
  const total   = pending.reduce((s, w) => s + parseFloat(w.amount || '0'), 0);
  const effectiveSearch = (localSearch || search || '').toLowerCase().trim();
  const rows    = ws.filter(w => !effectiveSearch ||
    (w.id && String(w.id).includes(effectiveSearch)) ||
    (w.user_address && w.user_address.toLowerCase().includes(effectiveSearch)) ||
    (w.user_email && w.user_email.toLowerCase().includes(effectiveSearch)) ||
    (w.destination_address && w.destination_address.toLowerCase().includes(effectiveSearch)) ||
    (w.currency && w.currency.toLowerCase().includes(effectiveSearch)) ||
    (w.network && w.network.toLowerCase().includes(effectiveSearch)) ||
    (w.amount && String(w.amount).toLowerCase().includes(effectiveSearch)) ||
    (w.status && w.status.toLowerCase().includes(effectiveSearch)) ||
    (w.tx_hash && w.tx_hash.toLowerCase().includes(effectiveSearch)) ||
    (w.audit_note && w.audit_note.toLowerCase().includes(effectiveSearch))
  );

  if (loading) return <LoadingSpinner />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {toast && <Toast msg={toast} onClose={() => setToast(null)} />}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))', gap: 16 }}>
        <StatCard icon={<Clock />}      label="Pending Count"  value={pending.length}                color={C.amber} />
        <StatCard icon={<DollarSign />} label="Pending Amount" value={`$${total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}  color={C.amber} />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <div style={{ fontSize: 18, fontWeight: 800 }}>All Withdrawals ({rows.length})</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', minWidth: 200 }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: C.muted }} />
            <input
              value={localSearch}
              onChange={e => setLocalSearch(e.target.value)}
              placeholder="Search user, destination, ID..."
              style={{ width: '100%', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: localSearch ? '7px 28px 7px 30px' : '7px 12px 7px 30px', color: C.text, fontSize: 12, outline: 'none', boxSizing: 'border-box' }}
            />
            {localSearch && (
              <button
                type="button"
                onClick={() => setLocalSearch('')}
                style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: C.muted, cursor: 'pointer', padding: 2 }}
              >
                <X size={12} />
              </button>
            )}
          </div>
          <button
            onClick={() => { setLoading(true); fetchWs(); }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: 'var(--surface2)',
              border: `1px solid ${C.border}`,
              color: C.text,
              borderRadius: 8,
              padding: '6px 12px',
              fontSize: 12,
              cursor: 'pointer',
              fontWeight: 600
            }}
          >
            <RefreshCw size={13} /> Refresh List
          </button>
        </div>
      </div>

      <Card style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', width: '100%' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 780 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${C.border}`, background: 'rgba(255,255,255,0.02)' }}>
                {['ID', 'User & Audit', 'Amount', 'Network', 'Destination', 'Routing Policy', 'Date', 'Status', 'Actions'].map(h => (
                  <th key={h} style={TH}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan={9}><EmptyState message="No withdrawals found." /></td></tr>
              ) : rows.map(w => {
                const isInstant = w.withdrawal_type === 'INSTANT_REFUND';
                return (
                  <tr key={w.id} style={{ borderBottom: `1px solid ${C.border}` }} {...TR_HOVER}>
                    <td style={{ ...TD, color: C.muted }}>#{w.id}</td>
                    <td style={TD}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {w.user_email && <span style={{ fontWeight: 700, fontSize: 12 }}>{w.user_email}</span>}
                        <span style={{ fontSize: 11, color: C.muted, fontFamily: 'monospace' }}>
                          {w.user_address.length > 14 ? `${w.user_address.slice(0, 6)}...${w.user_address.slice(-4)}` : w.user_address}
                        </span>
                        {w.audit_note && (
                          <span style={{ fontSize: 10, color: isInstant ? '#10B981' : '#F59E0B', fontWeight: 600 }}>
                            {w.audit_note}
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={{ ...TD, fontWeight: 700 }}>${w.amount} {w.currency}</td>
                    <td style={{ ...TD, fontSize: 11, color: C.text }}>{w.network || 'TRON (TRC-20)'}</td>
                    <td style={{ ...TD, fontSize: 11, color: C.muted, fontFamily: 'monospace' }}>
                      {w.destination_address.length > 14 ? `${w.destination_address.slice(0, 6)}...${w.destination_address.slice(-4)}` : w.destination_address}
                    </td>
                    <td style={TD}>
                      {isInstant ? (
                        <span style={{
                          padding: '3px 8px',
                          borderRadius: 6,
                          fontSize: 11,
                          fontWeight: 700,
                          background: 'rgba(16,185,129,0.12)',
                          color: '#10B981',
                          border: '1px solid rgba(16,185,129,0.25)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4
                        }}>
                          <Zap size={11} /> 24h Instant
                        </span>
                      ) : (
                        <span style={{
                          padding: '3px 8px',
                          borderRadius: 6,
                          fontSize: 11,
                          fontWeight: 700,
                          background: 'rgba(245,158,11,0.12)',
                          color: '#F59E0B',
                          border: '1px solid rgba(245,158,11,0.25)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4
                        }}>
                          <Shield size={11} /> Trading Review
                        </span>
                      )}
                    </td>
                    <td style={{ ...TD, color: C.muted, fontSize: 11 }}>{new Date(w.created_at).toLocaleDateString()}</td>
                    <td style={TD}><Badge status={w.status} /></td>
                    <td style={TD}>
                      {w.status === 'PENDING' ? (
                        <div style={{ display: 'flex', gap: 6 }}>
                          <Btn sm onClick={() => { setActionModal({ type: 'approve', item: w }); setCustomTxHash(''); }}>
                            <Check size={12} />Approve
                          </Btn>
                          <Btn sm danger onClick={() => { setActionModal({ type: 'reject', item: w }); setRejectReason('Compliance verification failed'); }}>
                            <X size={12} />Reject
                          </Btn>
                        </div>
                      ) : w.status === 'APPROVED' && w.tx_hash ? (
                        <span style={{ fontSize: 10, fontFamily: 'monospace', color: '#A78BFA' }}>
                          Tx: {w.tx_hash.slice(0, 8)}...
                        </span>
                      ) : (
                        <span style={{ fontSize: 11, color: C.muted }}>—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Approve / Reject Modal Dialog */}
      {actionModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: C.surface,
            border: `1px solid ${C.border}`,
            borderRadius: 16,
            padding: 24,
            width: 440,
            maxWidth: '92vw',
            boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
            display: 'flex',
            flexDirection: 'column',
            gap: 16
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: C.text }}>
                {actionModal.type === 'approve' ? 'Approve & Send Withdrawal' : 'Decline Withdrawal Request'}
              </div>
              <button
                onClick={() => setActionModal(null)}
                style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer' }}
              >
                <X size={16} />
              </button>
            </div>

            <div style={{
              background: 'var(--surface2)',
              border: `1px solid ${C.border}`,
              borderRadius: 10,
              padding: 12,
              fontSize: 12,
              display: 'flex',
              flexDirection: 'column',
              gap: 6
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: C.muted }}>User:</span>
                <span style={{ fontWeight: 600 }}>{actionModal.item.user_email || actionModal.item.user_address}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: C.muted }}>Amount:</span>
                <span style={{ fontWeight: 800, color: '#10B981' }}>${actionModal.item.amount} {actionModal.item.currency}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: C.muted }}>Network:</span>
                <span style={{ fontWeight: 600 }}>{actionModal.item.network || 'TRON (TRC-20)'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: C.muted }}>Destination:</span>
                <span style={{ fontFamily: 'monospace', fontSize: 11 }}>{actionModal.item.destination_address}</span>
              </div>
              {actionModal.item.audit_note && (
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: `1px solid ${C.border}`, paddingTop: 4 }}>
                  <span style={{ color: C.muted }}>Audit Note:</span>
                  <span style={{ color: '#F59E0B', fontWeight: 600, fontSize: 11 }}>{actionModal.item.audit_note}</span>
                </div>
              )}
            </div>

            {actionModal.type === 'approve' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: C.text }}>
                  Manual Transaction Hash (Optional)
                </label>
                <input
                  placeholder="Paste TxID if transferred manually via Exodus / Trust Wallet"
                  value={customTxHash}
                  onChange={e => setCustomTxHash(e.target.value)}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 8,
                    background: 'var(--surface2)',
                    border: `1px solid ${C.border}`,
                    color: C.text,
                    fontSize: 12,
                    fontFamily: 'monospace',
                    outline: 'none'
                  }}
                />
                <span style={{ fontSize: 11, color: C.muted }}>
                  If left empty, a secure on-chain withdrawal signature will be automatically generated.
                </span>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: C.text }}>
                  Reason for Rejection
                </label>
                <input
                  placeholder="e.g. Invalid recipient address, suspicious activity"
                  value={rejectReason}
                  onChange={e => setRejectReason(e.target.value)}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 8,
                    background: 'var(--surface2)',
                    border: `1px solid ${C.border}`,
                    color: C.text,
                    fontSize: 12,
                    outline: 'none'
                  }}
                />
                <div style={{
                  padding: '8px 10px',
                  borderRadius: 6,
                  background: 'rgba(239,68,68,0.08)',
                  border: '1px solid rgba(239,68,68,0.2)',
                  fontSize: 11,
                  color: '#EF4444',
                  lineHeight: 1.35
                }}>
                  ⚠️ <b>Immediate Balance Restore:</b> Declining this withdrawal will automatically release the locked ${actionModal.item.amount} back to the user's available balance.
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 6 }}>
              <button
                type="button"
                onClick={() => setActionModal(null)}
                style={{
                  padding: '8px 14px',
                  borderRadius: 8,
                  background: 'transparent',
                  border: `1px solid ${C.border}`,
                  color: C.muted,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              {actionModal.type === 'approve' ? (
                <Btn onClick={handleApprove} disabled={submittingAction}>
                  <Check size={14} /> {submittingAction ? 'Approving...' : 'Confirm Approval'}
                </Btn>
              ) : (
                <Btn danger onClick={handleReject} disabled={submittingAction}>
                  <X size={14} /> {submittingAction ? 'Rejecting...' : 'Confirm Rejection & Refund'}
                </Btn>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════ PAGE 6: TRADES ══════════════════════════ */
function TradesPage({ metrics, loading, search }: { metrics: AdminMetrics; loading: boolean; search: string }) {
  const [sf, setSf] = useState<'all' | 'BUY' | 'SELL'>('all');
  const [symFilter, setSymFilter] = useState('all');
  const [localSearch, setLocalSearch] = useState('');
  const [trades, setTrades] = useState<any[]>([]);
  const [loadingTrades, setLoadingTrades] = useState(false);

  const fetchRealTrades = useCallback(async () => {
    try {
      setLoadingTrades(true);
      const data = await api.getAdminTrades(symFilter, sf);
      if (data) {
        setTrades(data);
      }
    } catch {
      // offline fallback
    } finally {
      setLoadingTrades(false);
    }
  }, [symFilter, sf]);

  useEffect(() => {
    fetchRealTrades();
    const iv = setInterval(fetchRealTrades, 5000);
    return () => clearInterval(iv);
  }, [fetchRealTrades]);

  const allTokens = marketStore.tokens;
  const k = metrics?.kpis || {} as any;

  const effectiveSearch = (localSearch || search || '').toLowerCase().trim();
  const filtered = trades.filter(t => {
    const ident = (t.user_email || t.user_address || '').toLowerCase();
    const sym = (t.token_symbol || '').toLowerCase();
    const hash = (t.tx_hash || '').toLowerCase();
    const side = (t.side || '').toLowerCase();
    const amt = String(t.amount || '').toLowerCase();
    const total = String(t.total_usd || '').toLowerCase();
    return !effectiveSearch || ident.includes(effectiveSearch) || sym.includes(effectiveSearch) || hash.includes(effectiveSearch) || side.includes(effectiveSearch) || amt.includes(effectiveSearch) || total.includes(effectiveSearch);
  });

  if (loading) return <LoadingSpinner />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* 4 Calculation Velocity Cards for Trades / Deposits */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: 14 }}>
        <div style={{ background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.22)', borderRadius: 14, padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 42, height: 42, borderRadius: 10, background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.green, flexShrink: 0 }}>
            <Zap size={20} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 11, color: C.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Trade Volume Today</div>
            <div style={{ fontSize: 18, fontWeight: 900, color: C.text, marginTop: 2 }}>
              {fmtUSD(k.trades_today_usd || k.buys_today_usd || 0)}
            </div>
            <div style={{ fontSize: 11, color: C.green, fontWeight: 600 }}>{k.buys_today_count || trades.length} orders executed</div>
          </div>
        </div>

        <div style={{ background: 'rgba(59, 130, 246, 0.05)', border: '1px solid rgba(59, 130, 246, 0.22)', borderRadius: 14, padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 42, height: 42, borderRadius: 10, background: 'rgba(59, 130, 246, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#60A5FA', flexShrink: 0 }}>
            <Clock size={20} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 11, color: C.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Trade Volume This Week</div>
            <div style={{ fontSize: 18, fontWeight: 900, color: C.text, marginTop: 2 }}>
              {fmtUSD(k.trades_this_week_usd || k.buys_this_week_usd || 0)}
            </div>
            <div style={{ fontSize: 11, color: '#60A5FA', fontWeight: 600 }}>7 days user trade activity</div>
          </div>
        </div>

        <div style={{ background: 'rgba(124, 58, 237, 0.05)', border: '1px solid rgba(124, 58, 237, 0.22)', borderRadius: 14, padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 42, height: 42, borderRadius: 10, background: 'rgba(124, 58, 237, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.violet, flexShrink: 0 }}>
            <BarChart2 size={20} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 11, color: C.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Trade Volume This Month</div>
            <div style={{ fontSize: 18, fontWeight: 900, color: C.text, marginTop: 2 }}>
              {fmtUSD(k.trades_this_month_usd || k.buys_this_month_usd || 0)}
            </div>
            <div style={{ fontSize: 11, color: '#A78BFA', fontWeight: 600 }}>30 days platform volume</div>
          </div>
        </div>

        <div style={{ background: 'rgba(245, 158, 11, 0.05)', border: '1px solid rgba(245, 158, 11, 0.22)', borderRadius: 14, padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 42, height: 42, borderRadius: 10, background: 'rgba(245, 158, 11, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.amber, flexShrink: 0 }}>
            <DollarSign size={20} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 11, color: C.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Platform Volume</div>
            <div style={{ fontSize: 18, fontWeight: 900, color: C.text, marginTop: 2 }}>
              {fmtUSD(k.total_volume_usd || 0)}
            </div>
            <div style={{ fontSize: 11, color: C.amber, fontWeight: 600 }}>All-time verified DEX volume</div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ fontSize: 18, fontWeight: 800 }}>Platform Live Trades ({filtered.length})</div>
          <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 12, background: 'rgba(16,185,129,0.15)', color: C.green, fontWeight: 700 }}>
            Real User Orders
          </span>
          {loadingTrades && <span style={{ fontSize: 11, color: C.muted }}>Syncing...</span>}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', minWidth: 160 }}>
            <Search size={13} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: C.muted }} />
            <input
              value={localSearch}
              onChange={e => setLocalSearch(e.target.value)}
              placeholder="Search user, tx..."
              style={{ width: '100%', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: localSearch ? '6px 26px 6px 28px' : '6px 10px 6px 28px', color: C.text, fontSize: 12, outline: 'none', boxSizing: 'border-box' }}
            />
            {localSearch && (
              <button
                type="button"
                onClick={() => setLocalSearch('')}
                style={{ position: 'absolute', right: 7, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: C.muted, cursor: 'pointer', padding: 2 }}
              >
                <X size={12} />
              </button>
            )}
          </div>
          {/* Searchable Coin Selector with instant filter */}
          <SearchableCoinSelect
            value={symFilter}
            onChange={setSymFilter}
            tokens={allTokens}
            includeAll={true}
            allLabel="All Coins"
            width={220}
          />

          {/* Side Selector */}
          <div style={{ display: 'flex', gap: 4 }}>
            {([['all','All'],['BUY','Buys'],['SELL','Sells']] as const).map(([v, l]) => (
              <button key={v} onClick={() => setSf(v)} style={{ padding: '6px 12px', borderRadius: 8, border: `1px solid ${sf === v ? C.violet : C.border}`, background: sf === v ? `${C.violet}22` : 'transparent', color: sf === v ? C.violet : C.muted, fontSize: 11, fontWeight: 700, cursor: 'pointer', transition: 'all 150ms' }}>{l}</button>
            ))}
          </div>
        </div>
      </div>

      <Card style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', width: '100%' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
            <thead><tr style={{ borderBottom: `1px solid ${C.border}`, background: 'rgba(255,255,255,0.02)' }}>
              {['User Account', 'Pair', 'Side', 'Amount', 'USD Value', 'Price', 'Tx Hash', 'Time'].map(h => <th key={h} style={TH}>{h}</th>)}
            </tr></thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8}>
                    <EmptyState message="No real user trades match your selected filters." />
                  </td>
                </tr>
              ) : (
                filtered.map(t => {
                  const isBuy = t.side === 'BUY';
                  const userLabel = t.user_email || t.user_address || 'User';
                  const usdVal = (parseFloat(t.price_usd) || 0) * (parseFloat(t.token_amount) || 0);
                  const tokenAmtStr = fmtCrypto(t.token_amount, t.token_symbol);
                  const pairStr = `${t.token_symbol || 'TOKEN'}/${t.base_currency || 'USDT'}`;
                  const timeStr = t.created_at ? new Date(t.created_at).toLocaleString() : 'Recent';
                  return (
                    <tr key={t.id || t.tx_hash} style={{ borderBottom: `1px solid ${C.border}` }} {...TR_HOVER}>
                      <td style={{ ...TD, fontSize: 12, color: '#A78BFA', fontFamily: 'monospace' }}>
                        {userLabel.length > 18 ? `${userLabel.slice(0, 8)}...${userLabel.slice(-6)}` : userLabel}
                      </td>
                      <td style={{ ...TD, fontWeight: 700 }}>{pairStr}</td>
                      <td style={TD}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: isBuy ? `${C.green}22` : `${C.red}22`, color: isBuy ? C.green : C.red }}>
                          {isBuy ? <ArrowDownRight size={10} /> : <ArrowUpRight size={10} />}{t.side}
                        </span>
                      </td>
                      <td style={{ ...TD, fontWeight: 600 }}>{tokenAmtStr}</td>
                      <td style={{ ...TD, fontWeight: 700, color: isBuy ? C.green : C.red }}>{fmtUSD(usdVal)}</td>
                      <td style={{ ...TD, fontWeight: 600 }}>{fmtUSD(t.price_usd)}</td>
                      <td style={{ ...TD, fontFamily: 'monospace', fontSize: 11, color: C.muted }}>
                        {t.tx_hash ? `${t.tx_hash.slice(0, 8)}...${t.tx_hash.slice(-6)}` : '—'}
                      </td>
                      <td style={{ ...TD, color: C.muted, fontSize: 11 }}>{timeStr}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}


/* ══════════════════════ PAGE 7: SETTINGS ════════════════════════ */
function SettingsPage({ loading }: { loading: boolean }) {
  const [s, setS]         = useState({ fee: '0.30', minW: '10', maintenance: false, networks: { Solana: true, Ethereum: true, BSC: false, Polygon: true } as Record<string, boolean> });
  const [swiftsatsUrl, setSwiftsatsUrl] = useState(() => localStorage.getItem('swiftsats_base_url') || 'http://localhost:5173');
  const [swiftsatsRate, setSwiftsatsRate] = useState(() => localStorage.getItem('swiftsats_usd_ngn_rate') || '1600');
  const [copiedHook, setCopiedHook] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const save = () => {
    localStorage.setItem('swiftsats_base_url', swiftsatsUrl.trim() || 'http://localhost:5173');
    localStorage.setItem('swiftsats_usd_ngn_rate', swiftsatsRate.trim() || '1600');
    setToast('Settings & Onramp Gateway saved!');
    setTimeout(() => setToast(null), 3000);
  };
  if (loading) return <LoadingSpinner />;
  const INP: React.CSSProperties = { width: '100%', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: '10px 12px', color: C.text, fontSize: 14, boxSizing: 'border-box', outline: 'none' };
  const LBL: React.CSSProperties = { display: 'block', fontSize: 11, color: C.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 };
  return (
    <div style={{ maxWidth: 560 }}>
      {toast && <Toast msg={toast} onClose={() => setToast(null)} />}
      <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 24 }}>Platform Settings</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Card>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}><DollarSign size={16} color={C.violet} />Platform Fee</div>
          <label style={LBL}>Fee Percentage (%)</label>
          <input type="number" step="0.01" min="0" max="5" value={s.fee} onChange={e => setS(p => ({ ...p, fee: e.target.value }))} style={INP} />
        </Card>
        <Card>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}><ArrowDownToLine size={16} color={C.violet} />Withdrawal Limits</div>
          <label style={LBL}>Minimum Withdrawal (USD)</label>
          <input type="number" min="1" value={s.minW} onChange={e => setS(p => ({ ...p, minW: e.target.value }))} style={INP} />
        </Card>
        <Card>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}><Globe size={16} color={C.violet} />Supported Networks</div>
          {Object.entries(s.networks).map(([n, on]) => (
            <div key={n} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: `1px solid ${C.border}` }}>
              <div><div style={{ fontWeight: 600, fontSize: 13 }}>{n}</div><div style={{ fontSize: 11, color: C.muted }}>EVM Compatible</div></div>
              <button onClick={() => setS(p => ({ ...p, networks: { ...p.networks, [n]: !on } }))} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}>
                {on ? <ToggleRight size={32} color={C.violet} /> : <ToggleLeft size={32} color={C.muted} />}
              </button>
            </div>
          ))}
        </Card>
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}><Lock size={16} color={s.maintenance ? C.red : C.muted} />Maintenance Mode</div>
              <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>Disables all user trading and deposits.</div>
            </div>
            <button onClick={() => setS(p => ({ ...p, maintenance: !p.maintenance }))} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
              {s.maintenance ? <ToggleRight size={36} color={C.red} /> : <ToggleLeft size={36} color={C.muted} />}
            </button>
          </div>
          {s.maintenance && <div style={{ marginTop: 12, padding: '10px 14px', background: `${C.red}15`, borderRadius: 10, border: `1px solid ${C.red}33`, color: C.red, fontSize: 12, fontWeight: 600 }}>⚠ Maintenance mode is ON — users cannot trade or deposit.</div>}
        </Card>

        {/* Naira Onramp Integration Card */}
        <Card>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Zap size={16} color="#10B981" />
            <span>Naira (NGN) Bank Onramp Gateway</span>
          </div>

          <label style={LBL}>Onramp Portal Base URL</label>
          <input
            type="text"
            value={swiftsatsUrl}
            onChange={e => setSwiftsatsUrl(e.target.value)}
            placeholder="http://localhost:5173 or https://pay.example.com"
            style={{ ...INP, marginBottom: 12 }}
          />

          <label style={LBL}>USD to Naira (NGN) Exchange Rate</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 14, fontWeight: 800, color: C.muted }}>₦</span>
            <input
              type="number"
              value={swiftsatsRate}
              onChange={e => setSwiftsatsRate(e.target.value)}
              placeholder="1600"
              style={{ ...INP, flex: 1 }}
            />
            <span style={{ fontSize: 12, color: C.muted, whiteSpace: 'nowrap' }}>per $1.00 USD</span>
          </div>

          <label style={LBL}>Webhook Receiver URL (Paste into Gateway)</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: '8px 10px', marginBottom: 8 }}>
            <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#C4B5FD', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              http://localhost:8000/api/webhooks/swiftsats/
            </span>
            <button
              type="button"
              onClick={() => {
                const hookUrl = `${window.location.origin}/api/webhooks/`;
                copyToClipboard(hookUrl);
                setCopiedHook(true);
                setTimeout(() => setCopiedHook(false), 2000);
              }}
              style={{ background: copiedHook ? '#10B981' : C.violet, color: '#fff', border: 'none', borderRadius: 6, padding: '4px 8px', fontSize: 10, fontWeight: 700, cursor: 'pointer' }}
            >
              {copiedHook ? 'Copied' : 'Copy'}
            </button>
          </div>
          <div style={{ fontSize: 11, color: C.muted }}>
            When a user clicks "Buy", Axiom pre-fills your assigned platform vault wallet and redirects them to the payment portal for Naira bank transfer.
          </div>
        </Card>

        <Btn onClick={save}><Save size={15} />Save Changes</Btn>
      </div>
    </div>
  );
}

/* ══════════════════════ ERROR BOUNDARY ══════════════════════════ */
interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class AdminErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Admin Dashboard Error:", error, errorInfo);
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    if (this.state.hasError && this.props.children !== prevProps.children) {
      this.setState({ hasError: false, error: null });
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '40px 24px', textAlign: 'center', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, margin: 20 }}>
          <AlertTriangle size={38} color={C.amber} style={{ marginBottom: 12 }} />
          <h3 style={{ fontSize: 18, fontWeight: 800, color: C.text, marginBottom: 8 }}>Dashboard View Recovered</h3>
          <p style={{ fontSize: 13, color: C.muted, maxWidth: 440, margin: '0 auto 18px' }}>
            {this.state.error?.message || 'A temporary issue occurred while rendering this page.'}
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
            style={{ padding: '8px 20px', background: C.violet, color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
          >
            Reload Admin View
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

/* ══════════════════════ PAGE: JUNIOR ADMINS ════════════════════════ */
function JuniorAdminsPage({ loading: globalLoading, search = '' }: { loading: boolean; search?: string }) {
  const [juniorAdmins, setJuniorAdmins] = useState<any[]>([]);
  const [localSearch, setLocalSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingJa, setEditingJa] = useState<any | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [passcode, setPasscode] = useState('');
  const [slug, setSlug] = useState('');
  const [commissionPct, setCommissionPct] = useState('10.0');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [visiblePasscodes, setVisiblePasscodes] = useState<Record<string, boolean>>({});

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.getJuniorAdmins();
      setJuniorAdmins(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !passcode.trim() || !slug.trim()) {
      setFormError('Agent Name, Passcode, and Link Slug are required.');
      return;
    }
    setFormError(null);
    setSubmitting(true);
    try {
      await api.createJuniorAdmin({
        name: name.trim(),
        username: username.trim() || undefined,
        passcode: passcode.trim(),
        slug: slug.trim().toLowerCase(),
        commission_pct: parseFloat(commissionPct) || 10.0,
      });
      setShowCreateModal(false);
      setName('');
      setUsername('');
      setPasscode('');
      setSlug('');
      setCommissionPct('10.0');
      await loadData();
    } catch (err: any) {
      setFormError(err.message || 'Failed to create Junior Admin');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingJa) return;
    setFormError(null);
    setSubmitting(true);
    try {
      await api.updateJuniorAdmin(editingJa.id, {
        name: editingJa.name,
        username: editingJa.username,
        passcode: editingJa.passcode,
        slug: editingJa.slug,
        commission_pct: editingJa.commission_pct,
      });
      setEditingJa(null);
      await loadData();
    } catch (err: any) {
      setFormError(err.message || 'Failed to update Junior Admin');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (ja: any) => {
    try {
      await api.updateJuniorAdmin(ja.id, { is_active: !ja.is_active });
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to toggle status');
    }
  };

  const handleDelete = async (ja: any) => {
    if (!confirm(`Are you sure you want to delete Junior Admin "${ja.name}"? Users previously registered will be preserved.`)) return;
    try {
      await api.deleteJuniorAdmin(ja.id);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete');
    }
  };

  const handleCopyLink = (jaSlug: string, jaId: string) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://axiomwallet.com';
    const link = `${origin}/${jaSlug}`;
    navigator.clipboard.writeText(link);
    setCopiedId(jaId);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const toggleShowPasscode = (id: string) => {
    setVisiblePasscodes(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const originUrl = typeof window !== 'undefined' ? window.location.origin : 'https://axiomwallet.com';

  const effectiveSearch = (localSearch || search || '').toLowerCase().trim();
  const filteredJuniorAdmins = juniorAdmins.filter(ja => {
    if (!effectiveSearch) return true;
    return (
      (ja.name && ja.name.toLowerCase().includes(effectiveSearch)) ||
      (ja.username && ja.username.toLowerCase().includes(effectiveSearch)) ||
      (ja.slug && ja.slug.toLowerCase().includes(effectiveSearch)) ||
      (ja.passcode && ja.passcode.toLowerCase().includes(effectiveSearch)) ||
      (ja.id && String(ja.id).toLowerCase().includes(effectiveSearch))
    );
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header with CTA */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800, color: C.text, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span>Junior Admins & Referral Links</span>
            <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: 'rgba(124,58,237,0.15)', color: C.violet, border: `1px solid ${C.violet}33`, fontWeight: 700 }}>
              {juniorAdmins.length} Active Agents
            </span>
          </div>
          <div style={{ fontSize: 13, color: C.muted, marginTop: 4, maxWidth: 680, lineHeight: 1.4 }}>
            Register Junior Admins with unique custom links (e.g. <code style={{ color: C.violet, fontWeight: 700 }}>/1</code>, <code style={{ color: C.violet, fontWeight: 700 }}>/alpha</code>). 
            Users who create a wallet or sign up through their link are strictly attributed to their portal.
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', minWidth: 200 }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: C.muted }} />
            <input
              value={localSearch}
              onChange={e => setLocalSearch(e.target.value)}
              placeholder="Search agent, slug, PIN..."
              style={{ width: '100%', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: localSearch ? '8px 28px 8px 30px' : '8px 12px 8px 30px', color: C.text, fontSize: 12, outline: 'none', boxSizing: 'border-box' }}
            />
            {localSearch && (
              <button
                type="button"
                onClick={() => setLocalSearch('')}
                style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: C.muted, cursor: 'pointer', padding: 2 }}
              >
                <X size={12} />
              </button>
            )}
          </div>
          <button
            onClick={() => { setShowCreateModal(true); setFormError(null); }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 18px',
              borderRadius: 12,
              background: `linear-gradient(135deg, ${C.violet} 0%, #6D28D9 100%)`,
              color: '#fff',
              border: 'none',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 4px 16px rgba(124,58,237,0.3)',
              transition: 'all 150ms'
            }}
          >
            <Plus size={16} /> Register Junior Admin
          </button>
        </div>
      </div>

      {/* Strict Isolation Notice Card */}
      <div style={{ background: 'rgba(34, 209, 248, 0.05)', border: '1px solid rgba(34, 209, 248, 0.22)', borderRadius: 14, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(34, 209, 248, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#22D1F8', flexShrink: 0 }}>
          <Shield size={18} />
        </div>
        <div style={{ fontSize: 12, color: C.text, lineHeight: 1.4 }}>
          <span style={{ fontWeight: 800, color: '#22D1F8' }}>Strict User & Data Isolation Enforced: </span>
          Junior Admin users are isolated to their own dashboard at <code style={{ color: '#22D1F8' }}>/junior-admin</code>. Your Super Admin "Users & Wallets", Deposits, and Withdrawals queues will NOT mix or display Junior Admin users.
        </div>
      </div>

      {/* Agents Table / List */}
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', width: '100%' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 860 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${C.border}`, background: 'rgba(255,255,255,0.02)' }}>
                {['Agent / Junior Admin', 'Unique Referral Link', 'Login Passcode', 'Users', 'Volume / Deposits', 'Commission', 'Status', 'Actions'].map(h => (
                  <th key={h} style={TH}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8}><LoadingSpinner /></td></tr>
              ) : filteredJuniorAdmins.length === 0 ? (
                <tr><td colSpan={8}><EmptyState message={effectiveSearch ? `No Junior Admins matching "${effectiveSearch}".` : "No Junior Admins registered yet. Click '+ Register Junior Admin' to create one."} /></td></tr>
              ) : (
                filteredJuniorAdmins.map((ja: any) => {
                  const fullUrl = `${originUrl}/${ja.slug}`;
                  const isCopied = copiedId === ja.id;
                  const isPwVisible = !!visiblePasscodes[ja.id];
                  return (
                    <tr key={ja.id} style={{ borderBottom: `1px solid ${C.border}` }} {...TR_HOVER}>
                      {/* Name & Username */}
                      <td style={TD}>
                        <div style={{ fontWeight: 800, color: C.text }}>{ja.name}</div>
                        <div style={{ fontSize: 11, color: C.muted }}>@{ja.username}</div>
                      </td>

                      {/* Unique Referral Link */}
                      <td style={TD}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#22D1F8', background: 'rgba(34,209,248,0.1)', padding: '3px 8px', borderRadius: 6, border: '1px solid rgba(34,209,248,0.2)' }}>
                            /{ja.slug}
                          </span>
                          <button
                            onClick={() => handleCopyLink(ja.slug, ja.id)}
                            style={{
                              padding: '4px 8px',
                              borderRadius: 6,
                              background: isCopied ? C.green : C.surface2,
                              color: isCopied ? '#fff' : C.text,
                              border: `1px solid ${C.border}`,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              fontSize: 11,
                              fontWeight: 700,
                              transition: 'all 150ms'
                            }}
                            title="Copy link"
                          >
                            {isCopied ? <Check size={12} /> : <Copy size={12} />}
                            <span>{isCopied ? 'Copied' : 'Copy'}</span>
                          </button>
                          <a
                            href={fullUrl}
                            target="_blank"
                            rel="noreferrer"
                            style={{ color: C.muted, display: 'inline-flex', alignItems: 'center', padding: 4 }}
                            title="Test Link"
                          >
                            <ExternalLink size={13} />
                          </a>
                        </div>
                      </td>

                      {/* Login Passcode */}
                      <td style={TD}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontFamily: 'monospace', fontSize: 12, color: C.text }}>
                            {isPwVisible ? ja.passcode : '••••••••'}
                          </span>
                          <button
                            onClick={() => toggleShowPasscode(ja.id)}
                            style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', display: 'flex', padding: 2 }}
                            title={isPwVisible ? "Hide Passcode" : "Show Passcode"}
                          >
                            {isPwVisible ? <EyeOff size={13} /> : <Eye size={13} />}
                          </button>
                        </div>
                      </td>

                      {/* Tagged Users Count */}
                      <td style={TD}>
                        <div style={{ fontWeight: 800, color: C.text }}>{ja.users_count || 0}</div>
                        <div style={{ fontSize: 10, color: C.muted }}>users</div>
                      </td>

                      {/* Processed Deposits */}
                      <td style={TD}>
                        <div style={{ fontWeight: 800, color: C.green }}>{fmtUSD(ja.total_deposits_usd || 0)}</div>
                        <div style={{ fontSize: 10, color: C.muted }}>Vol: {fmtUSD(ja.total_volume_usd || 0)}</div>
                      </td>

                      {/* Commission % */}
                      <td style={TD}>
                        <div style={{ fontWeight: 800, color: C.amber }}>{ja.commission_pct}%</div>
                        <div style={{ fontSize: 10, color: C.muted }}>
                          ~{fmtUSD((ja.total_deposits_usd || 0) * (parseFloat(ja.commission_pct) / 100))}
                        </div>
                      </td>

                      {/* Status */}
                      <td style={TD}>
                        <button
                          onClick={() => handleToggleActive(ja)}
                          style={{
                            padding: '3px 10px',
                            borderRadius: 20,
                            fontSize: 11,
                            fontWeight: 800,
                            cursor: 'pointer',
                            border: `1px solid ${ja.is_active ? C.green : C.muted}44`,
                            background: ja.is_active ? 'rgba(16,185,129,0.12)' : 'rgba(255,255,255,0.06)',
                            color: ja.is_active ? C.green : C.muted
                          }}
                        >
                          {ja.is_active ? 'Active' : 'Disabled'}
                        </button>
                      </td>

                      {/* Actions */}
                      <td style={TD}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <button
                            onClick={() => { setEditingJa({ ...ja }); setFormError(null); }}
                            style={{ padding: '4px 8px', borderRadius: 6, background: C.surface2, border: `1px solid ${C.border}`, color: C.text, fontSize: 11, cursor: 'pointer' }}
                            title="Edit"
                          >
                            <Edit3 size={13} />
                          </button>
                          <button
                            onClick={() => handleDelete(ja)}
                            style={{ padding: '4px 8px', borderRadius: 6, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: C.red, fontSize: 11, cursor: 'pointer' }}
                            title="Delete"
                          >
                            <X size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Registration Modal */}
      {showCreateModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(5px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16
        }}>
          <div style={{
            width: '100%', maxWidth: 480, background: C.surface,
            border: `1px solid ${C.border}`, borderRadius: 18, padding: 24,
            boxShadow: '0 20px 50px rgba(0,0,0,0.7)', position: 'relative'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: C.text }}>Register New Junior Admin</div>
              <button onClick={() => setShowCreateModal(false)} style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            {formError && (
              <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', color: '#FCA5A5', fontSize: 12, marginBottom: 16 }}>
                {formError}
              </div>
            )}

            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: C.text, marginBottom: 6 }}>
                  Agent Full Name <span style={{ color: C.red }}>*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. David Vance"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 10, background: C.surface2, border: `1px solid ${C.border}`, color: C.text, fontSize: 13, outline: 'none' }}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: C.text, marginBottom: 6 }}>
                    Username <span style={{ color: C.muted }}>(Optional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. dvance"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 10, background: C.surface2, border: `1px solid ${C.border}`, color: C.text, fontSize: 13, outline: 'none' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: C.text, marginBottom: 6 }}>
                    Passcode / PIN <span style={{ color: C.red }}>*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 789123"
                    value={passcode}
                    onChange={e => setPasscode(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 10, background: C.surface2, border: `1px solid ${C.border}`, color: C.text, fontSize: 13, outline: 'none' }}
                    required
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: C.text, marginBottom: 6 }}>
                  Referral Link Slug <span style={{ color: C.red }}>*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. 1 or alpha or agent1"
                  value={slug}
                  onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, ''))}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 10, background: C.surface2, border: `1px solid ${C.border}`, color: '#22D1F8', fontWeight: 800, fontSize: 13, outline: 'none', fontFamily: 'monospace' }}
                  required
                />
                <div style={{ fontSize: 11, color: C.muted, marginTop: 5 }}>
                  Live Link Preview: <span style={{ color: '#22D1F8', fontWeight: 700 }}>{originUrl}/{slug || '1'}</span>
                </div>
                <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>
                  * "A single letter or number can make a difference" — e.g. /1, /2, /a, /b.
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: C.text, marginBottom: 6 }}>
                  Deposit Commission %
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="100"
                  value={commissionPct}
                  onChange={e => setCommissionPct(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 10, background: C.surface2, border: `1px solid ${C.border}`, color: C.text, fontSize: 13, outline: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  style={{ padding: '10px 16px', borderRadius: 10, background: 'transparent', border: `1px solid ${C.border}`, color: C.text, fontSize: 13, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    padding: '10px 20px', borderRadius: 10,
                    background: C.violet, color: '#fff', border: 'none',
                    fontSize: 13, fontWeight: 700, cursor: submitting ? 'not-allowed' : 'pointer'
                  }}
                >
                  {submitting ? 'Registering...' : 'Register Agent'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingJa && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(5px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16
        }}>
          <div style={{
            width: '100%', maxWidth: 480, background: C.surface,
            border: `1px solid ${C.border}`, borderRadius: 18, padding: 24,
            boxShadow: '0 20px 50px rgba(0,0,0,0.7)', position: 'relative'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: C.text }}>Edit Junior Admin</div>
              <button onClick={() => setEditingJa(null)} style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            {formError && (
              <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', color: '#FCA5A5', fontSize: 12, marginBottom: 16 }}>
                {formError}
              </div>
            )}

            <form onSubmit={handleUpdate} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: C.text, marginBottom: 6 }}>
                  Agent Name
                </label>
                <input
                  type="text"
                  value={editingJa.name}
                  onChange={e => setEditingJa({ ...editingJa, name: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 10, background: C.surface2, border: `1px solid ${C.border}`, color: C.text, fontSize: 13, outline: 'none' }}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: C.text, marginBottom: 6 }}>
                    Username
                  </label>
                  <input
                    type="text"
                    value={editingJa.username}
                    onChange={e => setEditingJa({ ...editingJa, username: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 10, background: C.surface2, border: `1px solid ${C.border}`, color: C.text, fontSize: 13, outline: 'none' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: C.text, marginBottom: 6 }}>
                    Passcode / PIN
                  </label>
                  <input
                    type="text"
                    value={editingJa.passcode}
                    onChange={e => setEditingJa({ ...editingJa, passcode: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 10, background: C.surface2, border: `1px solid ${C.border}`, color: C.text, fontSize: 13, outline: 'none' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: C.text, marginBottom: 6 }}>
                  Referral Link Slug
                </label>
                <input
                  type="text"
                  value={editingJa.slug}
                  onChange={e => setEditingJa({ ...editingJa, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, '') })}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 10, background: C.surface2, border: `1px solid ${C.border}`, color: '#22D1F8', fontWeight: 800, fontSize: 13, outline: 'none', fontFamily: 'monospace' }}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: C.text, marginBottom: 6 }}>
                  Deposit Commission %
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={editingJa.commission_pct}
                  onChange={e => setEditingJa({ ...editingJa, commission_pct: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 10, background: C.surface2, border: `1px solid ${C.border}`, color: C.text, fontSize: 13, outline: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
                <button
                  type="button"
                  onClick={() => setEditingJa(null)}
                  style={{ padding: '10px 16px', borderRadius: 10, background: 'transparent', border: `1px solid ${C.border}`, color: C.text, fontSize: 13, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    padding: '10px 20px', borderRadius: 10,
                    background: C.violet, color: '#fff', border: 'none',
                    fontSize: 13, fontWeight: 700, cursor: submitting ? 'not-allowed' : 'pointer'
                  }}
                >
                  {submitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════ ROOT COMPONENT ══════════════════════════ */
interface AdminDashboardProps { onExitAdmin: () => void; }
type Page = 'dashboard' | 'tokens' | 'users' | 'junior_admins' | 'deposits' | 'deposit_wallets' | 'withdrawals' | 'trades' | 'settings';

const NAV: { id: Page; label: string; icon: React.ReactElement }[] = [
  { id: 'dashboard',       label: 'Dashboard',               icon: <LayoutDashboard size={18} /> },
  { id: 'tokens',          label: 'Coins & Market Maker',    icon: <Coins size={18} />           },
  { id: 'users',           label: 'Users & Wallets',          icon: <Users size={18} />           },
  { id: 'junior_admins',   label: 'Junior Admins & Links',    icon: <Globe size={18} />           },
  { id: 'deposits',        label: 'Deposits',                icon: <ArrowDownToLine size={18} /> },
  { id: 'deposit_wallets', label: 'Deposit Wallets (5 Pool)', icon: <Shield size={18} />          },
  { id: 'withdrawals',     label: 'Pending Withdrawals',     icon: <Clock size={18} />           },
  { id: 'trades',          label: 'Trades',                  icon: <Activity size={18} />        },
  { id: 'settings',        label: 'Platform Settings',        icon: <Settings size={18} />        },
];

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onExitAdmin }) => {
  const [page,           setPage]           = useState<Page>('dashboard');
  const [metrics,        setMetrics]        = useState<AdminMetrics>(STUB_METRICS);
  const [ws,             setWs]             = useState<WithdrawalRequest[]>(STUB_WITHDRAWALS);
  const [tokens,         setTokens]         = useState<MemeToken[]>(STUB_TOKENS);
  const [loading,        setLoading]        = useState(false);
  const [search,         setSearch]         = useState('');
  const [bell,           setBell]           = useState(false);
  const [prof,           setProf]           = useState(false);
  const [toast,          setToast]          = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { toggleTheme, isLight } = useTheme();
  const toast_ = (m: string) => { setToast(m); setTimeout(() => setToast(null), 3000); };

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [m, w, t] = await Promise.all([api.getAdminMetrics(), api.getAdminWithdrawals(), api.getTokens()]);
      setMetrics(m); setWs(w); setTokens(t);
    } catch { /* keep stubs on API error */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const approve = async (id: number) => {
    try { await api.approveWithdrawal(id); } catch { /* stub */ }
    setWs(p => p.map(w => w.id === id ? { ...w, status: 'APPROVED' as const } : w));
    toast_(`Withdrawal #${id} approved!`);
  };
  const reject = async (id: number) => {
    try { await api.rejectWithdrawal(id, 'Admin rejection'); } catch { /* stub */ }
    setWs(p => p.map(w => w.id === id ? { ...w, status: 'REJECTED' as const } : w));
    toast_(`Withdrawal #${id} rejected.`);
  };

  const pending = ws.filter(w => w.status === 'PENDING').length;

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100%', background: C.bg, fontFamily: "'Inter', sans-serif", color: C.text, overflow: 'hidden', position: 'relative' }}>
      <style>{`
        @keyframes spin        { to { transform: rotate(360deg); } }
        @keyframes slideUp     { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes slideInLeft { from { transform: translateX(-100%); } to { transform: translateX(0); } }
        @keyframes fadeIn      { from { opacity: 0; } to { opacity: 1; } }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(124,58,237,0.4); border-radius: 4px; }
        input:focus { border-color: rgba(124,58,237,0.5) !important; }

        .admin-kpi-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
        }
        .admin-charts-grid {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 16px;
        }
        .admin-desktop-sidebar {
          width: 240px;
          flex-shrink: 0;
          background: ${C.surface};
          border-right: 1px solid ${C.border};
          display: flex;
          flex-direction: column;
          padding: 20px 0;
        }
        .admin-mobile-menu-btn {
          display: none;
          background: none;
          border: none;
          color: ${C.text};
          cursor: pointer;
          align-items: center;
          justify-content: center;
          padding: 6px;
          border-radius: 8px;
        }
        .admin-bottom-nav {
          display: none;
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          height: 64px;
          background: ${C.surface};
          border-top: 1px solid ${C.border};
          z-index: 1000;
          align-items: center;
          justify-content: space-around;
          padding-bottom: env(safe-area-inset-bottom, 4px);
          box-shadow: 0 -4px 20px rgba(0,0,0,0.3);
        }
        .admin-main-area {
          flex: 1;
          overflow-y: auto;
          overflow-x: hidden;
          padding: 24px;
          width: 100%;
          max-width: 100%;
          box-sizing: border-box;
        }

        @media (min-width: 1025px) {
          .admin-bottom-nav { display: none !important; }
          .admin-mobile-menu-btn { display: none !important; }
        }

        @media (max-width: 1024px) {
          .admin-desktop-sidebar { display: none !important; }
          .admin-mobile-menu-btn { display: flex !important; }
          .admin-kpi-grid { grid-template-columns: repeat(2, 1fr) !important; gap: 12px !important; }
          .admin-charts-grid { grid-template-columns: 1fr !important; }
          .admin-bottom-nav { display: flex !important; }
          .admin-main-area { padding: 16px 14px 84px 14px !important; }
        }

        @media (max-width: 640px) {
          .admin-kpi-grid { grid-template-columns: 1fr !important; gap: 10px !important; }
          .admin-header-search { display: none !important; }
          .admin-main-area { padding: 12px 10px 80px 10px !important; }
        }
      `}</style>

      {toast && <Toast msg={toast} onClose={() => setToast(null)} />}

      {/* ── Slide-Out Mobile Navigation Drawer ── */}
      {mobileMenuOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(4px)',
            zIndex: 1500,
            display: 'flex',
            animation: 'fadeIn 180ms ease'
          }}
          onClick={() => setMobileMenuOpen(false)}
        >
          <aside
            style={{
              width: 280,
              maxWidth: '85vw',
              height: '100%',
              background: C.surface,
              borderRight: `1px solid ${C.border}`,
              display: 'flex',
              flexDirection: 'column',
              padding: '20px 0',
              animation: 'slideInLeft 200ms ease',
              boxShadow: '10px 0 30px rgba(0,0,0,0.6)'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px 18px', borderBottom: `1px solid ${C.border}`, marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: C.violet, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Zap size={18} color="#fff" />
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 14, lineHeight: 1 }}>Axiom Wallet</div>
                  <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>Admin Navigation</div>
                </div>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', padding: 4 }}
              >
                <X size={20} />
              </button>
            </div>
            <nav style={{ flex: 1, padding: '0 12px', display: 'flex', flexDirection: 'column', gap: 3, overflowY: 'auto' }}>
              {NAV.map(n => {
                const active = page === n.id;
                return (
                  <button
                    key={n.id}
                    onClick={() => { setPage(n.id); setSearch(''); setMobileMenuOpen(false); }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '12px 14px',
                      borderRadius: 10,
                      border: 'none',
                      cursor: 'pointer',
                      background: active ? C.violet : 'transparent',
                      color: active ? '#fff' : C.muted,
                      fontSize: 13,
                      fontWeight: active ? 700 : 500,
                      transition: 'all 150ms',
                      textAlign: 'left',
                      width: '100%'
                    }}
                  >
                    {React.cloneElement(n.icon, { color: active ? '#fff' : C.muted })}
                    <span style={{ flex: 1 }}>{n.label}</span>
                    {n.id === 'withdrawals' && pending > 0 && (
                      <span style={{ background: C.amber, color: '#000', borderRadius: 20, padding: '2px 8px', fontSize: 10, fontWeight: 800 }}>
                        {pending}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
            <div style={{ padding: '12px 16px', borderTop: `1px solid ${C.border}`, marginTop: 10 }}>
              <button
                onClick={onExitAdmin}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: 10,
                  border: 'none',
                  background: 'rgba(239,68,68,0.1)',
                  color: C.red,
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                <LogOut size={16} /> Exit Admin
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* ── Desktop Sidebar ── */}
      <aside className="admin-desktop-sidebar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 20px 24px', borderBottom: `1px solid ${C.border}`, marginBottom: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: C.violet, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Zap size={18} color="#fff" />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 14, lineHeight: 1 }}>Axiom Wallet</div>
            <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>Admin Console</div>
          </div>
        </div>
        <nav style={{ flex: 1, padding: '0 12px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {NAV.map(n => {
            const active = page === n.id;
            return (
              <button
                key={n.id}
                onClick={() => { setPage(n.id); setSearch(''); }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '10px 14px',
                  borderRadius: 10,
                  border: 'none',
                  cursor: 'pointer',
                  background: active ? C.violet : 'transparent',
                  color: active ? '#fff' : C.muted,
                  fontSize: 13,
                  fontWeight: active ? 700 : 500,
                  transition: 'all 150ms',
                  textAlign: 'left',
                  width: '100%'
                }}
                onMouseOver={e => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                onMouseOut={e  => { if (!active) e.currentTarget.style.background = 'transparent'; }}
              >
                {React.cloneElement(n.icon, { color: active ? '#fff' : C.muted })}
                <span style={{ flex: 1 }}>{n.label}</span>
                {n.id === 'withdrawals' && pending > 0 && (
                  <span style={{ background: C.amber, color: '#000', borderRadius: 20, padding: '1px 7px', fontSize: 10, fontWeight: 800 }}>
                    {pending}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
        <div style={{ padding: 12, borderTop: `1px solid ${C.border}`, marginTop: 12 }}>
          <button
            onClick={onExitAdmin}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              width: '100%',
              padding: '10px 14px',
              borderRadius: 10,
              border: 'none',
              background: 'rgba(239,68,68,0.08)',
              color: C.red,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'background 150ms'
            }}
            onMouseOver={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.15)')}
            onMouseOut={e  => (e.currentTarget.style.background = 'rgba(239,68,68,0.08)')}
          >
            <LogOut size={16} /> Exit Admin
          </button>
        </div>
      </aside>

      {/* ── Main Content Area ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative', width: '100%', maxWidth: '100%' }}>
        {/* Top bar */}
        <header style={{ height: 60, display: 'flex', alignItems: 'center', gap: 12, padding: '0 18px', background: C.bg, borderBottom: `1px solid ${C.border}`, flexShrink: 0, width: '100%', boxSizing: 'border-box' }}>
          {/* Mobile menu hamburger button */}
          <button
            className="admin-mobile-menu-btn"
            onClick={() => setMobileMenuOpen(true)}
            title="Open Menu"
            style={{ padding: 8, borderRadius: 8, background: 'rgba(255,255,255,0.04)' }}
          >
            <Menu size={22} />
          </button>

          {/* Brand Logo & Name */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: C.violet, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Zap size={14} color="#fff" />
            </div>
            <div style={{ fontWeight: 800, fontSize: 13, whiteSpace: 'nowrap' }}>
              Axiom <span style={{ color: C.muted, fontWeight: 500, fontSize: 11 }}>Admin</span>
            </div>
          </div>

          {/* Search bar (desktop/tablet) */}
          <div className="admin-header-search" style={{ flex: 1, maxWidth: 360, position: 'relative', marginLeft: 8, minWidth: 0 }}>
            <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: C.muted }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search across admin..."
              style={{
                width: '100%',
                background: C.surface,
                border: `1px solid ${C.border}`,
                borderRadius: 10,
                padding: search ? '8px 30px 8px 36px' : '8px 12px 8px 36px',
                color: C.text,
                fontSize: 13,
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                style={{
                  position: 'absolute',
                  right: 10,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: C.muted,
                  cursor: 'pointer',
                  padding: 2,
                  display: 'flex',
                  alignItems: 'center'
                }}
                title="Clear search"
              >
                <X size={13} />
              </button>
            )}
          </div>

          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            {/* Refresh */}
            <button onClick={refresh} title="Refresh Data" style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', display: 'flex', padding: 6, borderRadius: 8 }}>
              <RefreshCw size={16} />
            </button>

            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              title={isLight ? "Switch to Dark Mode" : "Switch to Light Mode"}
              aria-label={isLight ? "Switch to Dark Mode" : "Switch to Light Mode"}
              style={{
                background: 'none',
                border: 'none',
                color: C.muted,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                padding: 6,
                borderRadius: 8,
                transition: 'color 150ms'
              }}
              onMouseOver={e => (e.currentTarget.style.color = C.text)}
              onMouseOut={e => (e.currentTarget.style.color = C.muted)}
            >
              {isLight ? <Moon size={17} /> : <Sun size={17} />}
            </button>

            {/* Bell Alerts */}
            <div style={{ position: 'relative' }}>
              <button onClick={() => setBell(p => !p)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.muted, display: 'flex', position: 'relative', padding: 6, borderRadius: 8 }}>
                <Bell size={18} />
                {pending > 0 && (
                  <span style={{ position: 'absolute', top: 0, right: 0, width: 16, height: 16, borderRadius: '50%', background: C.violet, color: '#fff', fontSize: 9, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {pending}
                  </span>
                )}
              </button>
              {bell && (
                <div style={{ position: 'absolute', right: 0, top: 40, width: 'min(300px, calc(100vw - 24px))', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: 16, zIndex: 1200, boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
                  <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 12 }}>Recent Alerts</div>
                  {ws.filter(w => w.status === 'PENDING').slice(0, 3).map(w => (
                    <div key={w.id} style={{ display: 'flex', gap: 8, padding: '8px 0', borderBottom: `1px solid ${C.border}` }}>
                      <AlertTriangle size={14} color={C.amber} style={{ flexShrink: 0, marginTop: 2 }} />
                      <div style={{ fontSize: 12 }}>
                        <span style={{ color: C.amber, fontWeight: 700 }}>Pending withdrawal</span>
                        <div style={{ color: C.muted }}>{w.user_address} · {w.amount} {w.currency}</div>
                      </div>
                    </div>
                  ))}
                  {pending === 0 && <div style={{ fontSize: 12, color: C.muted }}>No pending alerts.</div>}
                </div>
              )}
            </div>

            {/* Profile */}
            <div style={{ position: 'relative' }}>
              <button onClick={() => setProf(p => !p)} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: C.text, padding: '4px 6px', borderRadius: 8 }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: C.violet, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: '#fff' }}>
                  A
                </div>
                <ChevronDown size={14} color={C.muted} />
              </button>
              {prof && (
                <div style={{ position: 'absolute', right: 0, top: 44, width: 'min(170px, calc(100vw - 24px))', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 8, zIndex: 1200, boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
                  <button
                    onClick={() => { setPage('settings'); setProf(false); }}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 12px', background: 'none', border: 'none', color: C.text, fontSize: 13, cursor: 'pointer', borderRadius: 8 }}
                  >
                    <Settings size={14} color={C.muted} /> Settings
                  </button>
                  <button
                    onClick={onExitAdmin}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 12px', background: 'none', border: 'none', color: C.red, fontSize: 13, cursor: 'pointer', borderRadius: 8 }}
                  >
                    <LogOut size={14} /> Log out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Main page content container with error recovery boundary */}
        <main className="admin-main-area" onClick={() => { setBell(false); setProf(false); }}>
          <AdminErrorBoundary key={page}>
            {page === 'dashboard'       && <DashboardPage metrics={metrics} withdrawals={ws} onApprove={approve} onReject={reject} loading={loading} search={search} />}
            {page === 'tokens'          && <MemeCoinsPage search={search} />}
            {page === 'users'           && <UsersPage metrics={metrics} loading={loading} search={search} />}
            {page === 'junior_admins'   && <JuniorAdminsPage loading={loading} search={search} />}
            {page === 'deposits'        && <DepositsPage metrics={metrics} loading={loading} search={search} />}
            {page === 'deposit_wallets' && <DepositWalletsPage loading={loading} />}
            {page === 'withdrawals'     && <WithdrawalsPage loading={loading} search={search} />}
            {page === 'trades'          && <TradesPage metrics={metrics} loading={loading} search={search} />}
            {page === 'settings'        && <SettingsPage loading={loading} />}
          </AdminErrorBoundary>
        </main>


        {/* ── React Native / iOS Frosted Glass Bottom Navigation Bar ── */}
        <div className="admin-bottom-nav">
          {[
            { id: 'dashboard',   label: 'Dashboard',   icon: <LayoutDashboard size={20} /> },
            { id: 'tokens',      label: 'Coins',       icon: <Coins size={20} /> },
            { id: 'withdrawals', label: 'Withdrawals', icon: <ArrowDownToLine size={20} />, badge: pending },
            { id: 'trades',      label: 'Trades',      icon: <Activity size={20} /> },
            { id: 'more',        label: 'More',        icon: <Menu size={20} /> },
          ].map(item => {
            const active = page === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  if (item.id === 'more') {
                    setMobileMenuOpen(true);
                  } else {
                    setPage(item.id as Page);
                  }
                }}
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 3,
                  background: 'none',
                  border: 'none',
                  color: active ? C.violet : C.muted,
                  cursor: 'pointer',
                  padding: '6px 0',
                  position: 'relative'
                }}
              >
                <div style={{ position: 'relative' }}>
                  {React.cloneElement(item.icon, { color: active ? C.violet : C.muted })}
                  {item.badge && item.badge > 0 ? (
                    <span style={{
                      position: 'absolute',
                      top: -4,
                      right: -8,
                      background: C.amber,
                      color: '#000',
                      borderRadius: '50%',
                      width: 15,
                      height: 15,
                      fontSize: 9,
                      fontWeight: 800,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      {item.badge}
                    </span>
                  ) : null}
                </div>
                <span style={{ fontSize: 10, fontWeight: active ? 700 : 500 }}>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

