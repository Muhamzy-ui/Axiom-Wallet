import React, { useState, useEffect, useMemo } from 'react';
import {
  Users, DollarSign, TrendingUp, Shield, Clock, CheckCircle2, XCircle,
  Copy, ExternalLink, RefreshCw, LogOut, Search, ArrowDownRight,
  Wallet, Award, AlertCircle, Sparkles, X
} from 'lucide-react';
import { api } from '../../services/api';
import { JuniorAdmin, JuniorAdminMetrics, WithdrawalRequest } from '../../types';

interface JuniorAdminDashboardProps {
  juniorAdmin: JuniorAdmin;
  onLogout: () => void;
}

const C = {
  bg: '#05070c',
  headerBg: 'rgba(10, 14, 23, 0.92)',
  surface: '#0b1018',
  surfaceCard: 'rgba(13, 19, 32, 0.85)',
  surfaceHover: '#131b2c',
  border: 'rgba(255, 255, 255, 0.08)',
  borderCyan: 'rgba(34, 209, 248, 0.28)',
  cyan: '#22d1f8',
  cyanBg: 'rgba(34, 209, 248, 0.12)',
  emerald: '#10b981',
  emeraldBg: 'rgba(16, 185, 129, 0.12)',
  emeraldBorder: 'rgba(16, 185, 129, 0.28)',
  amber: '#f59e0b',
  amberBg: 'rgba(245, 158, 11, 0.12)',
  amberBorder: 'rgba(245, 158, 11, 0.28)',
  rose: '#f43f5e',
  roseBg: 'rgba(244, 63, 94, 0.12)',
  roseBorder: 'rgba(244, 63, 94, 0.28)',
  text: '#f8fafc',
  textMuted: '#94a3b8',
  textDim: '#64748b',
};

export const JuniorAdminDashboard: React.FC<JuniorAdminDashboardProps> = ({
  juniorAdmin: initialJa,
  onLogout,
}) => {
  const [ja, setJa] = useState<JuniorAdmin>(initialJa);
  const [metrics, setMetrics] = useState<JuniorAdminMetrics['kpis'] | null>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [deposits, setDeposits] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'deposits' | 'withdrawals'>('overview');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [processingWdId, setProcessingWdId] = useState<number | null>(null);

  // Load fresh data
  const fetchData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const [mRes, uRes, dRes, wRes] = await Promise.all([
        api.getJuniorAdminMetrics(ja.id).catch(() => null),
        api.getJuniorAdminUsers(ja.id).catch(() => []),
        api.getJuniorAdminDeposits(ja.id).catch(() => []),
        api.getJuniorAdminWithdrawals(ja.id).catch(() => []),
      ]);
      if (mRes) {
        setMetrics(mRes.kpis);
        if (mRes.junior_admin) setJa(mRes.junior_admin);
      }
      setUsers(uRes);
      setDeposits(dRes);
      setWithdrawals(wRes);
    } catch (err) {
      console.error('Failed to load Junior Admin data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => fetchData(false), 12000);
    return () => clearInterval(interval);
  }, [ja.id]);

  const referralUrl = useMemo(() => {
    const origin = window.location.origin;
    return `${origin}/${ja.slug}`;
  }, [ja.slug]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(referralUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleApproveWd = async (id: number) => {
    if (!confirm(`Are you sure you want to approve Withdrawal #${id}?`)) return;
    setProcessingWdId(id);
    try {
      await api.approveJuniorAdminWithdrawal(id, undefined, ja.id);
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Approval failed');
    } finally {
      setProcessingWdId(null);
    }
  };

  const handleRejectWd = async (id: number) => {
    const reason = prompt('Enter decline reason for user:');
    if (!reason) return;
    setProcessingWdId(id);
    try {
      await api.rejectJuniorAdminWithdrawal(id, reason, ja.id);
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Decline failed');
    } finally {
      setProcessingWdId(null);
    }
  };

  const [processingDepId, setProcessingDepId] = useState<number | null>(null);

  const handleApproveDep = async (id: number) => {
    setProcessingDepId(id);
    try {
      const res = await api.approveJuniorAdminDeposit(id, ja.id);
      await fetchData();
      alert(res.message || 'Deposit approved and digits credited!');
    } catch (err: any) {
      alert(err.message || 'Approval failed');
    } finally {
      setProcessingDepId(null);
    }
  };

  const handleRejectDep = async (id: number) => {
    if (!confirm(`Are you sure you want to decline deposit #${id}?`)) return;
    setProcessingDepId(id);
    try {
      await api.rejectJuniorAdminDeposit(id, ja.id);
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Decline failed');
    } finally {
      setProcessingDepId(null);
    }
  };

  // Filtered lists
  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return users;
    const q = searchQuery.toLowerCase().trim();
    return users.filter(u =>
      (u.email && u.email.toLowerCase().includes(q)) ||
      (u.wallet_address && u.wallet_address.toLowerCase().includes(q)) ||
      (u.full_name && u.full_name.toLowerCase().includes(q)) ||
      (u.registered_via_slug && u.registered_via_slug.toLowerCase().includes(q)) ||
      (u.id && String(u.id).toLowerCase().includes(q)) ||
      (u.total_balance_usd !== undefined && String(u.total_balance_usd).includes(q))
    );
  }, [users, searchQuery]);

  const filteredDeposits = useMemo(() => {
    if (!searchQuery.trim()) return deposits;
    const q = searchQuery.toLowerCase().trim();
    return deposits.filter(d =>
      (d.user && d.user.toLowerCase().includes(q)) ||
      (d.currency && d.currency.toLowerCase().includes(q)) ||
      (d.tx_hash && d.tx_hash.toLowerCase().includes(q)) ||
      (d.amount && String(d.amount).toLowerCase().includes(q)) ||
      (d.amount_usd && String(d.amount_usd).toLowerCase().includes(q)) ||
      (d.status && d.status.toLowerCase().includes(q))
    );
  }, [deposits, searchQuery]);

  const filteredWithdrawals = useMemo(() => {
    if (!searchQuery.trim()) return withdrawals;
    const q = searchQuery.toLowerCase().trim();
    return withdrawals.filter(w =>
      (w.user_address && w.user_address.toLowerCase().includes(q)) ||
      (w.destination_address && w.destination_address.toLowerCase().includes(q)) ||
      (w.currency && w.currency.toLowerCase().includes(q)) ||
      (w.amount && String(w.amount).toLowerCase().includes(q)) ||
      (w.status && w.status.toLowerCase().includes(q)) ||
      (w.network && w.network.toLowerCase().includes(q)) ||
      (w.tx_hash && w.tx_hash.toLowerCase().includes(q)) ||
      (w.rejection_reason && w.rejection_reason.toLowerCase().includes(q))
    );
  }, [withdrawals, searchQuery]);

  const pendingWithdrawalsCount = withdrawals.filter(w => w.status === 'PENDING').length;

  return (
    <div style={{
      minHeight: '100vh',
      background: C.bg,
      color: C.text,
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      boxSizing: 'border-box'
    }}>
      <style>{`
        @keyframes jaSpin { to { transform: rotate(360deg); } }
        .ja-grid-kpis {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 16px;
        }
        .ja-grid-overview {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 20px;
        }
        .ja-tab-btn {
          padding: 8px 16px;
          border-radius: 10px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          background: transparent;
          border: 1px solid transparent;
          color: #94a3b8;
          display: flex;
          align-items: center;
          gap: 8px;
          transition: all 150ms ease;
          white-space: nowrap;
        }
        .ja-tab-btn:hover {
          color: #fff;
          background: rgba(255, 255, 255, 0.05);
        }
        .ja-tab-btn.active {
          color: #22d1f8;
          background: rgba(34, 209, 248, 0.14);
          border-color: rgba(34, 209, 248, 0.35);
        }
        .ja-table-row:hover {
          background: rgba(255, 255, 255, 0.03);
        }
        @media (max-width: 1024px) {
          .ja-grid-kpis {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
          .ja-grid-overview {
            grid-template-columns: 1fr;
          }
        }
        @media (max-width: 680px) {
          .ja-grid-kpis {
            grid-template-columns: 1fr;
            gap: 12px;
          }
          .ja-header-wrap {
            padding: 12px 16px !important;
          }
          .ja-main-wrap {
            padding: 16px 12px !important;
          }
          .ja-referral-flex {
            flex-direction: column !important;
            align-items: stretch !important;
          }
          .ja-action-bar {
            flex-direction: column !important;
            align-items: stretch !important;
            gap: 12px !important;
          }
        }
      `}</style>

      {/* Top Navigation Bar */}
      <header className="ja-header-wrap" style={{
        position: 'sticky',
        top: 0,
        zIndex: 40,
        background: C.headerBg,
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderBottom: `1px solid ${C.border}`,
        padding: '14px 28px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #06b6d4 0%, #6366f1 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 20px rgba(6, 182, 212, 0.35)'
          }}>
            <Shield size={22} color="#fff" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontWeight: 800, fontSize: '16px', letterSpacing: '-0.3px', color: '#fff' }}>
                Axiom Partner Portal
              </span>
              <span style={{
                fontSize: '11px',
                fontWeight: 700,
                color: C.cyan,
                background: C.cyanBg,
                border: `1px solid ${C.borderCyan}`,
                borderRadius: '20px',
                padding: '2px 8px'
              }}>
                Junior Admin
              </span>
            </div>
            <div style={{ fontSize: '12px', color: C.textMuted, marginTop: '2px' }}>
              Agent: <strong style={{ color: '#fff' }}>{ja.name}</strong> (@{ja.username})
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={() => fetchData(true)}
            disabled={refreshing}
            style={{
              padding: '8px 14px',
              borderRadius: '10px',
              background: 'rgba(255, 255, 255, 0.06)',
              border: `1px solid ${C.border}`,
              color: C.textMuted,
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 150ms'
            }}
            onMouseOver={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)')}
            onMouseOut={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)')}
            title="Refresh All Data"
          >
            <RefreshCw size={14} style={{ animation: refreshing ? 'jaSpin 0.8s linear infinite' : 'none', color: refreshing ? C.cyan : 'inherit' }} />
            <span>Sync</span>
          </button>

          <button
            onClick={onLogout}
            style={{
              padding: '8px 14px',
              borderRadius: '10px',
              background: C.roseBg,
              border: `1px solid ${C.roseBorder}`,
              color: C.rose,
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 150ms'
            }}
            onMouseOver={(e) => (e.currentTarget.style.background = 'rgba(244, 63, 94, 0.2)')}
            onMouseOut={(e) => (e.currentTarget.style.background = C.roseBg)}
          >
            <LogOut size={14} />
            <span>Logout</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="ja-main-wrap" style={{ maxWidth: '1280px', margin: '0 auto', padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* Referral Link Showcase Banner */}
        <section style={{
          position: 'relative',
          overflow: 'hidden',
          borderRadius: '20px',
          background: 'linear-gradient(135deg, rgba(8, 25, 45, 0.8) 0%, rgba(12, 17, 28, 0.95) 60%, rgba(20, 15, 38, 0.85) 100%)',
          border: `1px solid ${C.borderCyan}`,
          padding: '24px',
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5), 0 0 25px rgba(34, 209, 248, 0.08)'
        }}>
          <div className="ja-referral-flex" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '20px' }}>
            <div style={{ maxWidth: '680px' }}>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 12px',
                borderRadius: '20px',
                background: 'rgba(34, 209, 248, 0.15)',
                border: '1px solid rgba(34, 209, 248, 0.35)',
                color: C.cyan,
                fontSize: '11px',
                fontWeight: 800,
                letterSpacing: '0.4px',
                marginBottom: '10px'
              }}>
                <Award size={13} />
                <span>PARTNER REFERRAL ONBOARDING LINK (SLUG: /{ja.slug})</span>
              </div>
              <h2 style={{ fontSize: '22px', fontWeight: 800, margin: '0 0 8px', letterSpacing: '-0.4px', color: '#fff' }}>
                Share your unique link to onboard users to your dashboard
              </h2>
              <p style={{ fontSize: '13px', color: C.textMuted, margin: 0, lineHeight: 1.5 }}>
                Users registering through your link will be permanently tagged to your account. Your dashboard isolates your signups, balances, and deposits. You earn <strong style={{ color: C.cyan }}>{ja.commission_pct}% commission</strong>.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', minWidth: '280px' }}>
              <div style={{
                background: 'rgba(5, 7, 12, 0.85)',
                border: `1px solid ${C.border}`,
                borderRadius: '12px',
                padding: '10px 14px',
                fontSize: '13px',
                fontFamily: 'monospace',
                color: C.cyan,
                overflowX: 'auto',
                whiteSpace: 'nowrap',
                userSelect: 'all'
              }}>
                {referralUrl}
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={handleCopyLink}
                  style={{
                    flex: 1,
                    padding: '10px 16px',
                    borderRadius: '10px',
                    border: 'none',
                    background: copiedLink ? '#10b981' : '#22d1f8',
                    color: '#000',
                    fontWeight: 700,
                    fontSize: '13px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    transition: 'all 150ms',
                    boxShadow: copiedLink ? '0 0 15px rgba(16, 185, 129, 0.4)' : '0 0 15px rgba(34, 209, 248, 0.4)'
                  }}
                >
                  {copiedLink ? <CheckCircle2 size={16} /> : <Copy size={16} />}
                  <span>{copiedLink ? 'Copied Referral Link!' : 'Copy Link'}</span>
                </button>

                <a
                  href={referralUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    padding: '10px 14px',
                    borderRadius: '10px',
                    background: 'rgba(255, 255, 255, 0.08)',
                    border: `1px solid ${C.border}`,
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textDecoration: 'none'
                  }}
                  title="Test link in new tab"
                >
                  <ExternalLink size={16} />
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* KPI Grid (4 Cards) */}
        <section className="ja-grid-kpis">
          <div style={{
            background: C.surfaceCard,
            border: `1px solid ${C.border}`,
            borderRadius: '16px',
            padding: '20px',
            backdropFilter: 'blur(10px)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: C.textMuted, fontSize: '12px', fontWeight: 600 }}>
              <span>My Assigned Users</span>
              <Users size={18} color={C.cyan} />
            </div>
            <div style={{ fontSize: '28px', fontWeight: 800, color: '#fff', marginTop: '10px' }}>
              {metrics?.total_users ?? users.length}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: C.textDim, marginTop: '8px' }}>
              <span style={{ color: C.emerald, fontWeight: 700 }}>+{metrics?.users_today ?? 0} today</span>
              <span>•</span>
              <span>+{metrics?.users_this_week ?? 0} this week</span>
            </div>
          </div>

          <div style={{
            background: C.surfaceCard,
            border: `1px solid ${C.border}`,
            borderRadius: '16px',
            padding: '20px',
            backdropFilter: 'blur(10px)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: C.textMuted, fontSize: '12px', fontWeight: 600 }}>
              <span>Total Deposits (USD)</span>
              <DollarSign size={18} color={C.emerald} />
            </div>
            <div style={{ fontSize: '28px', fontWeight: 800, color: C.emerald, marginTop: '10px' }}>
              ${(metrics?.total_deposits_usd ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div style={{ fontSize: '11px', color: C.textMuted, marginTop: '8px' }}>
              Today: <strong style={{ color: '#fff' }}>${metrics?.deposits_today_usd ?? 0}</strong>
            </div>
          </div>

          <div style={{
            background: C.surfaceCard,
            border: `1px solid ${C.border}`,
            borderRadius: '16px',
            padding: '20px',
            backdropFilter: 'blur(10px)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: C.textMuted, fontSize: '12px', fontWeight: 600 }}>
              <span>Estimated Commission</span>
              <Award size={18} color={C.amber} />
            </div>
            <div style={{ fontSize: '28px', fontWeight: 800, color: C.amber, marginTop: '10px' }}>
              ${(metrics?.commission_earned_usd ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div style={{ fontSize: '11px', color: C.textMuted, marginTop: '8px' }}>
              Rate: <strong style={{ color: C.amber }}>{ja.commission_pct}%</strong> of volume
            </div>
          </div>

          <div style={{
            background: C.surfaceCard,
            border: `1px solid ${pendingWithdrawalsCount > 0 ? C.roseBorder : C.border}`,
            borderRadius: '16px',
            padding: '20px',
            backdropFilter: 'blur(10px)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: C.textMuted, fontSize: '12px', fontWeight: 600 }}>
              <span>Pending Withdrawals</span>
              <Clock size={18} color={C.rose} />
            </div>
            <div style={{ fontSize: '28px', fontWeight: 800, color: pendingWithdrawalsCount > 0 ? C.rose : '#fff', marginTop: '10px' }}>
              {pendingWithdrawalsCount}
            </div>
            <div style={{ fontSize: '11px', color: C.textMuted, marginTop: '8px' }}>
              Pending Vol: <strong style={{ color: '#fff' }}>${(metrics?.pending_withdrawals_usd ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
            </div>
          </div>
        </section>

        {/* Tab Selection Bar & Search */}
        <section className="ja-action-bar" style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: `1px solid ${C.border}`,
          paddingBottom: '14px',
          gap: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflowX: 'auto' }}>
            <button
              onClick={() => setActiveTab('overview')}
              className={`ja-tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
            >
              Overview
            </button>

            <button
              onClick={() => setActiveTab('users')}
              className={`ja-tab-btn ${activeTab === 'users' ? 'active' : ''}`}
            >
              <Users size={15} />
              <span>My Users ({users.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('deposits')}
              className={`ja-tab-btn ${activeTab === 'deposits' ? 'active' : ''}`}
            >
              <ArrowDownRight size={15} />
              <span>Deposits ({deposits.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('withdrawals')}
              className={`ja-tab-btn ${activeTab === 'withdrawals' ? 'active' : ''}`}
            >
              <Clock size={15} />
              <span>Withdrawals</span>
              {pendingWithdrawalsCount > 0 && (
                <span style={{
                  background: C.rose,
                  color: '#fff',
                  fontSize: '10px',
                  fontWeight: 800,
                  borderRadius: '10px',
                  padding: '1px 6px'
                }}>
                  {pendingWithdrawalsCount}
                </span>
              )}
            </button>
          </div>

          <div style={{ position: 'relative', minWidth: '240px' }}>
            <Search size={15} color={C.textDim} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Search user, address, slug, tx..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                background: 'rgba(10, 14, 23, 0.8)',
                border: `1px solid ${C.border}`,
                borderRadius: '10px',
                padding: searchQuery ? '9px 30px 9px 34px' : '9px 12px 9px 34px',
                fontSize: '12px',
                color: '#fff',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'transparent',
                  border: 'none',
                  color: C.textDim,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  padding: 2
                }}
                title="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </section>

        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div className="ja-grid-overview">
              {/* Recent Users Widget */}
              <div style={{
                background: C.surfaceCard,
                border: `1px solid ${C.border}`,
                borderRadius: '16px',
                padding: '20px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Users size={16} color={C.cyan} />
                    <span>Recent Signups on /{ja.slug}</span>
                  </h3>
                  <button
                    onClick={() => setActiveTab('users')}
                    style={{ background: 'transparent', border: 'none', color: C.cyan, fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                  >
                    View All &rarr;
                  </button>
                </div>

                {filteredUsers.length === 0 ? (
                  <div style={{ padding: '36px 0', textAlign: 'center', color: C.textDim, fontSize: '12px' }}>
                    {searchQuery ? `No users matching "${searchQuery}"` : `No users registered via your link yet. Share /${ja.slug} to start onboarding.`}
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {filteredUsers.slice(0, 5).map((u) => (
                      <div key={u.id} style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 12px',
                        background: 'rgba(255, 255, 255, 0.02)',
                        borderRadius: '10px',
                        border: `1px solid ${C.border}`
                      }}>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '13px', color: '#fff' }}>{u.email || 'Anonymous User'}</div>
                          <div style={{ fontSize: '11px', fontFamily: 'monospace', color: C.textDim, marginTop: '2px' }}>
                            {u.wallet_address?.slice(0, 10)}...{u.wallet_address?.slice(-6)}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontWeight: 700, fontSize: '13px', color: C.emerald }}>${u.total_balance_usd ?? '0.00'}</div>
                          <div style={{ fontSize: '10px', color: C.textDim }}>{u.created_at}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Pending Withdrawals Action Queue */}
              <div style={{
                background: C.surfaceCard,
                border: `1px solid ${C.border}`,
                borderRadius: '16px',
                padding: '20px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Clock size={16} color={C.rose} />
                    <span>Pending Withdrawals Queue</span>
                  </h3>
                  <button
                    onClick={() => setActiveTab('withdrawals')}
                    style={{ background: 'transparent', border: 'none', color: C.rose, fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                  >
                    Queue ({pendingWithdrawalsCount}) &rarr;
                  </button>
                </div>

                {filteredWithdrawals.filter(w => w.status === 'PENDING').length === 0 ? (
                  <div style={{ padding: '36px 0', textAlign: 'center', color: C.textDim, fontSize: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                    <CheckCircle2 size={24} color={C.emerald} />
                    <span>{searchQuery ? `No pending withdrawals matching "${searchQuery}"` : 'All clear! No pending withdrawal requests from your users.'}</span>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {filteredWithdrawals.filter(w => w.status === 'PENDING').slice(0, 3).map((w) => (
                      <div key={w.id} style={{
                        padding: '12px 14px',
                        background: 'rgba(255, 255, 255, 0.02)',
                        border: `1px solid ${C.border}`,
                        borderRadius: '12px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ fontWeight: 800, fontSize: '14px', color: '#fff' }}>
                            {w.amount} {w.currency}
                          </div>
                          <span style={{ fontSize: '11px', color: C.amber, background: C.amberBg, border: `1px solid ${C.amberBorder}`, padding: '2px 8px', borderRadius: '6px', fontWeight: 600 }}>
                            Pending
                          </span>
                        </div>
                        <div style={{ fontSize: '11px', fontFamily: 'monospace', color: C.textDim, wordBreak: 'break-all' }}>
                          To: {w.destination_address}
                        </div>
                        <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                          <button
                            onClick={() => handleApproveWd(w.id)}
                            disabled={processingWdId === w.id}
                            style={{
                              flex: 1,
                              padding: '7px 12px',
                              borderRadius: '8px',
                              background: C.emeraldBg,
                              border: `1px solid ${C.emeraldBorder}`,
                              color: C.emerald,
                              fontWeight: 700,
                              fontSize: '12px',
                              cursor: 'pointer'
                            }}
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleRejectWd(w.id)}
                            disabled={processingWdId === w.id}
                            style={{
                              flex: 1,
                              padding: '7px 12px',
                              borderRadius: '8px',
                              background: C.roseBg,
                              border: `1px solid ${C.roseBorder}`,
                              color: C.rose,
                              fontWeight: 700,
                              fontSize: '12px',
                              cursor: 'pointer'
                            }}
                          >
                            Decline
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Recent Deposits Widget */}
            <div style={{
              background: C.surfaceCard,
              border: `1px solid ${C.border}`,
              borderRadius: '16px',
              padding: '20px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ArrowDownRight size={16} color={C.emerald} />
                  <span>Recent User Deposits</span>
                </h3>
                <button
                  onClick={() => setActiveTab('deposits')}
                  style={{ background: 'transparent', border: 'none', color: C.emerald, fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                >
                  View All &rarr;
                </button>
              </div>

              {filteredDeposits.length === 0 ? (
                <div style={{ padding: '28px 0', textAlign: 'center', color: C.textDim, fontSize: '12px' }}>
                  {searchQuery ? `No deposits matching "${searchQuery}"` : 'No deposits recorded yet from your assigned users.'}
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
                    <thead>
                      <tr style={{ borderBottom: `1px solid ${C.border}`, color: C.textDim }}>
                        <th style={{ paddingBottom: '10px' }}>User</th>
                        <th style={{ paddingBottom: '10px' }}>Amount</th>
                        <th style={{ paddingBottom: '10px' }}>USD Value</th>
                        <th style={{ paddingBottom: '10px' }}>Status</th>
                        <th style={{ paddingBottom: '10px' }}>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredDeposits.slice(0, 5).map((d) => (
                        <tr key={d.id} className="ja-table-row" style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                          <td style={{ padding: '12px 0', fontFamily: 'monospace', color: C.textMuted }}>{d.user}</td>
                          <td style={{ padding: '12px 0', fontWeight: 700, color: '#fff' }}>{d.amount} {d.currency}</td>
                          <td style={{ padding: '12px 0', fontWeight: 700, color: C.emerald }}>${d.amount_usd}</td>
                          <td style={{ padding: '12px 0' }}>
                            <span style={{ fontSize: '10px', fontWeight: 700, color: C.emerald, background: C.emeraldBg, border: `1px solid ${C.emeraldBorder}`, padding: '2px 8px', borderRadius: '12px' }}>
                              {d.status}
                            </span>
                          </td>
                          <td style={{ padding: '12px 0', color: C.textDim, fontSize: '11px' }}>{d.created_at}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: MY USERS */}
        {activeTab === 'users' && (
          <div style={{
            background: C.surfaceCard,
            border: `1px solid ${C.border}`,
            borderRadius: '16px',
            padding: '24px'
          }}>
            <div style={{ marginBottom: '18px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0 }}>Registered Users Under /{ja.slug}</h3>
              <p style={{ fontSize: '12px', color: C.textMuted, margin: '4px 0 0' }}>
                Total: {filteredUsers.length} users strictly isolated to your dashboard
              </p>
            </div>

            {filteredUsers.length === 0 ? (
              <div style={{ padding: '48px 0', textAlign: 'center', color: C.textDim, fontSize: '13px' }}>
                No users match your criteria. Share <span style={{ color: C.cyan, fontFamily: 'monospace' }}>/{ja.slug}</span> with users to get started.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${C.border}`, color: C.textDim, fontSize: '11px', textTransform: 'uppercase' }}>
                      <th style={{ paddingBottom: '12px' }}>User / Email</th>
                      <th style={{ paddingBottom: '12px' }}>Wallet Address</th>
                      <th style={{ paddingBottom: '12px' }}>Link Slug</th>
                      <th style={{ paddingBottom: '12px' }}>Portfolio USD</th>
                      <th style={{ paddingBottom: '12px' }}>Registered At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((u) => (
                      <tr key={u.id} className="ja-table-row" style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                        <td style={{ padding: '14px 0' }}>
                          <div style={{ fontWeight: 700, color: '#fff' }}>{u.email || 'Anonymous'}</div>
                          {u.full_name && <div style={{ fontSize: '11px', color: C.textDim }}>{u.full_name}</div>}
                        </td>
                        <td style={{ padding: '14px 0', fontFamily: 'monospace', color: C.cyan, fontSize: '11px' }}>
                          {u.wallet_address?.slice(0, 12)}...{u.wallet_address?.slice(-8)}
                        </td>
                        <td style={{ padding: '14px 0' }}>
                          <span style={{ fontSize: '11px', fontFamily: 'monospace', color: C.cyan, background: C.cyanBg, border: `1px solid ${C.borderCyan}`, padding: '2px 8px', borderRadius: '6px' }}>
                            /{u.registered_via_slug || ja.slug}
                          </span>
                        </td>
                        <td style={{ padding: '14px 0', fontWeight: 800, color: C.emerald }}>
                          ${u.total_balance_usd ?? '0.00'}
                        </td>
                        <td style={{ padding: '14px 0', color: C.textDim, fontSize: '11px' }}>
                          {u.created_at}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: DEPOSITS */}
        {activeTab === 'deposits' && (
          <div style={{
            background: C.surfaceCard,
            border: `1px solid ${C.border}`,
            borderRadius: '16px',
            padding: '24px'
          }}>
            <div style={{ marginBottom: '18px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0 }}>Confirmed & Pending Deposits</h3>
              <p style={{ fontSize: '12px', color: C.textMuted, margin: '4px 0 0' }}>
                Total: {filteredDeposits.length} deposits from your users
              </p>
            </div>

            {filteredDeposits.length === 0 ? (
              <div style={{ padding: '48px 0', textAlign: 'center', color: C.textDim, fontSize: '13px' }}>
                No deposit records found for your users.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${C.border}`, color: C.textDim, fontSize: '11px', textTransform: 'uppercase' }}>
                      <th style={{ paddingBottom: '12px' }}>User</th>
                      <th style={{ paddingBottom: '12px' }}>Amount</th>
                      <th style={{ paddingBottom: '12px' }}>USD Value</th>
                      <th style={{ paddingBottom: '12px' }}>Tx Hash</th>
                      <th style={{ paddingBottom: '12px' }}>Status</th>
                      <th style={{ paddingBottom: '12px' }}>Date</th>
                      <th style={{ paddingBottom: '12px' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDeposits.map((d) => (
                      <tr key={d.id} className="ja-table-row" style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                        <td style={{ padding: '14px 0', fontFamily: 'monospace', color: C.textMuted }}>{d.user}</td>
                        <td style={{ padding: '14px 0', fontWeight: 700, color: '#fff' }}>{d.amount} {d.currency}</td>
                        <td style={{ padding: '14px 0', fontWeight: 800, color: C.emerald }}>${d.amount_usd}</td>
                        <td style={{ padding: '14px 0', fontFamily: 'monospace', color: C.textDim, fontSize: '11px' }}>
                          {d.tx_hash ? (
                            <a
                              href={d.tx_hash.length > 70 ? `https://solscan.io/tx/${d.tx_hash}` : `https://tronscan.org/#/transaction/${d.tx_hash}`}
                              target="_blank"
                              rel="noreferrer"
                              style={{ color: '#A78BFA', textDecoration: 'none' }}
                            >
                              {d.tx_hash.slice(0, 8)}... ↗
                            </a>
                          ) : '—'}
                        </td>
                        <td style={{ padding: '14px 0' }}>
                          <span style={{
                            fontSize: '10px',
                            fontWeight: 700,
                            color: d.status === 'confirmed' ? C.emerald : d.status === 'rejected' ? C.rose : C.amber,
                            background: d.status === 'confirmed' ? C.emeraldBg : d.status === 'rejected' ? C.roseBg : C.amberBg,
                            border: `1px solid ${d.status === 'confirmed' ? C.emeraldBorder : d.status === 'rejected' ? C.roseBorder : C.amberBorder}`,
                            padding: '2px 8px',
                            borderRadius: '12px'
                          }}>
                            {d.status}
                          </span>
                        </td>
                        <td style={{ padding: '14px 0', color: C.textDim, fontSize: '11px' }}>{d.created_at}</td>
                        <td style={{ padding: '14px 0' }}>
                          {d.status === 'pending' ? (
                            <div style={{ display: 'flex', gap: '6px' }}>
                              <button
                                type="button"
                                disabled={processingDepId === d.id}
                                onClick={() => handleApproveDep(d.id)}
                                style={{
                                  padding: '4px 10px',
                                  borderRadius: '6px',
                                  background: 'rgba(16, 185, 129, 0.2)',
                                  border: '1px solid #10B981',
                                  color: '#10B981',
                                  fontWeight: 700,
                                  fontSize: '11px',
                                  cursor: 'pointer'
                                }}
                              >
                                {processingDepId === d.id ? 'Releasing...' : '⚡ Release Digits'}
                              </button>
                              <button
                                type="button"
                                disabled={processingDepId === d.id}
                                onClick={() => handleRejectDep(d.id)}
                                style={{
                                  padding: '4px 8px',
                                  borderRadius: '6px',
                                  background: 'rgba(239, 68, 68, 0.15)',
                                  border: '1px solid rgba(239, 68, 68, 0.3)',
                                  color: '#EF4444',
                                  fontWeight: 600,
                                  fontSize: '11px',
                                  cursor: 'pointer'
                                }}
                              >
                                ✕
                              </button>
                            </div>
                          ) : (
                            <span style={{ fontSize: '11px', color: C.textDim }}>—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: WITHDRAWALS */}
        {activeTab === 'withdrawals' && (
          <div style={{
            background: C.surfaceCard,
            border: `1px solid ${C.border}`,
            borderRadius: '16px',
            padding: '24px'
          }}>
            <div style={{ marginBottom: '18px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0 }}>Withdrawal Approval Queue</h3>
              <p style={{ fontSize: '12px', color: C.textMuted, margin: '4px 0 0' }}>
                Review and approve or reject user withdrawals
              </p>
            </div>

            {filteredWithdrawals.length === 0 ? (
              <div style={{ padding: '48px 0', textAlign: 'center', color: C.textDim, fontSize: '13px' }}>
                No withdrawal requests found for your users.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {filteredWithdrawals.map((w) => (
                  <div key={w.id} style={{
                    padding: '16px 20px',
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: `1px solid ${C.border}`,
                    borderRadius: '14px',
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '16px'
                  }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '16px', fontWeight: 800, color: '#fff' }}>{w.amount} {w.currency}</span>
                        <span style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          color: w.status === 'PENDING' ? C.amber : w.status === 'APPROVED' ? C.emerald : C.rose,
                          background: w.status === 'PENDING' ? C.amberBg : w.status === 'APPROVED' ? C.emeraldBg : C.roseBg,
                          border: `1px solid ${w.status === 'PENDING' ? C.amberBorder : w.status === 'APPROVED' ? C.emeraldBorder : C.roseBorder}`,
                          padding: '2px 8px',
                          borderRadius: '6px'
                        }}>
                          {w.status}
                        </span>
                      </div>
                      <div style={{ fontSize: '11px', fontFamily: 'monospace', color: C.textMuted }}>User: {w.user_address}</div>
                      <div style={{ fontSize: '11px', fontFamily: 'monospace', color: C.textDim }}>Destination: {w.destination_address} ({w.network || 'TRC-20'})</div>
                      <div style={{ fontSize: '10px', color: C.textDim }}>Submitted: {w.created_at}</div>
                      {w.rejection_reason && (
                        <div style={{ fontSize: '11px', color: C.rose }}>Reason: {w.rejection_reason}</div>
                      )}
                    </div>

                    {w.status === 'PENDING' ? (
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={() => handleApproveWd(w.id)}
                          disabled={processingWdId === w.id}
                          style={{
                            padding: '9px 18px',
                            borderRadius: '10px',
                            background: '#10b981',
                            border: 'none',
                            color: '#000',
                            fontWeight: 700,
                            fontSize: '12px',
                            cursor: 'pointer',
                            transition: 'all 150ms'
                          }}
                        >
                          {processingWdId === w.id ? 'Processing...' : 'Approve Withdrawal'}
                        </button>
                        <button
                          onClick={() => handleRejectWd(w.id)}
                          disabled={processingWdId === w.id}
                          style={{
                            padding: '9px 16px',
                            borderRadius: '10px',
                            background: C.roseBg,
                            border: `1px solid ${C.roseBorder}`,
                            color: C.rose,
                            fontWeight: 700,
                            fontSize: '12px',
                            cursor: 'pointer',
                            transition: 'all 150ms'
                          }}
                        >
                          Decline
                        </button>
                      </div>
                    ) : (
                      <div style={{ fontSize: '11px', color: C.textDim, fontFamily: 'monospace' }}>
                        {w.tx_hash ? `TX: ${w.tx_hash.slice(0, 16)}...` : 'Status: Closed'}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </main>
    </div>
  );
};
