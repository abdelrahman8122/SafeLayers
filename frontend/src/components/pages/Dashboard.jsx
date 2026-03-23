import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useBalance } from '../../context/BalanceContext';

export default function Dashboard() {
  const { user } = useAuth();
  const { loadingAccounts, refreshAccounts, getChecking, getSavings, getLoan, fmt } = useBalance();
  const navigate = useNavigate();

  // Refresh every time Dashboard mounts (i.e. every time you navigate to it)
  useEffect(() => {
    refreshAccounts();
    // Also auto-refresh every 10 seconds while on dashboard
    const interval = setInterval(refreshAccounts, 10000);
    return () => clearInterval(interval);
  }, []);

  const checking = getChecking();
  const savings  = getSavings();
  const loan     = getLoan();

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const firstName = user?.fullName?.split(' ')[0] || 'Mariam';

  const balCards = [
    {
      label: 'Checking Account',
      amount: checking?.balance,
      sub: checking ? `**** **** **** ${checking.accountNumber?.slice(-4)}` : 'Loading...',
      color: '#C9961A',
      bg: 'linear-gradient(135deg,#1A2D4A,#0D1A2E)',
    },
    {
      label: 'Savings Account',
      amount: savings?.balance,
      sub: savings ? `${savings.interestRate || 5.2}% p.a. · Auto-save on` : 'Loading...',
      color: '#22C55E',
      bg: 'linear-gradient(135deg,#0D2E1A,#071A0D)',
    },
    {
      label: 'Active Loan',
      amount: loan?.loanAmount,
      sub: loan ? `EGP ${loan.monthlyPayment}/mo · Next payment due` : 'No active loan',
      color: '#60A5FA',
      bg: 'linear-gradient(135deg,#0D1A2E,#071220)',
    },
  ];

  return (
    <div>
      {/* Greeting */}
      <div className="page-header fade-up-1">
        <h1>{greeting}, {firstName} 👋</h1>
        <p>
          {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          &nbsp;·&nbsp; Last login: Today from Cairo, Egypt
        </p>
      </div>

      {/* Balance cards — pulled live from DB */}
      <div className="grid-3 fade-up-2" style={{ marginBottom: '1.6rem' }}>
        {balCards.map(({ label, amount, sub, color, bg }) => (
          <div key={label}
            style={{ borderRadius: 'var(--r)', background: bg, padding: '1.3rem 1.4rem', border: '1px solid rgba(255,255,255,.06)', position: 'relative', overflow: 'hidden', cursor: 'default', transition: 'transform .2s,box-shadow .2s' }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 12px 30px rgba(0,0,0,.3)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}
          >
            <div style={{ position: 'absolute', top: -40, right: -40, width: 140, height: 140, borderRadius: '50%', background: `radial-gradient(circle,${color}14,transparent 70%)` }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: '.65rem' }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: color, animation: 'pulse 2s infinite' }} />
              <span style={{ fontSize: '.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.8px', color }}>{label}</span>
            </div>
            <div className="mono" style={{ fontSize: '1.65rem', fontWeight: 600, color: '#fff', lineHeight: 1.1, marginBottom: '.28rem' }}>
              {loadingAccounts && amount === undefined
                ? <span style={{ opacity: .4, fontSize: '1rem' }}>Loading...</span>
                : amount !== undefined ? fmt(amount) : '—'
              }
            </div>
            <div style={{ fontSize: '.72rem', color: 'rgba(255,255,255,.45)' }}>{sub}</div>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="grid-4 fade-up-3" style={{ marginBottom: '1.6rem' }}>
        {[
          { icon: '↔️', label: 'Send Money', path: '/transfer', bg: 'var(--blue-dim)' },
          { icon: '⬇️', label: 'Top Up',     path: '/deposit',  bg: 'var(--green-dim)' },
          { icon: '⬆️', label: 'Withdraw',   path: '/withdraw', bg: 'var(--red-dim)' },
          { icon: '🏦', label: 'Loans',      path: '/loans',    bg: 'var(--gold-dim)' },
        ].map(({ icon, label, path, bg }) => (
          <button key={label} onClick={() => navigate(path)}
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '1rem .85rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '.5rem', cursor: 'pointer', transition: 'all .2s', boxShadow: 'var(--shadow)' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--gold)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'none'; }}
          >
            <div style={{ width: 40, height: 40, borderRadius: 10, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>{icon}</div>
            <span style={{ fontSize: '.8rem', fontWeight: 600, color: 'var(--text)' }}>{label}</span>
          </button>
        ))}
      </div>

      {/* Bottom section */}
      <div className="grid-main fade-up-4">
        <div className="card">
          <div className="card-header">
            <span className="card-title">Recent Transactions</span>
            <button className="card-action" onClick={() => navigate('/history')}>View All →</button>
          </div>
          {[
            { icon: '💰', name: 'Salary Deposit',       meta: 'Mar 15 · Payroll',  amt: '+EGP 12,000', credit: true,  badge: 'done' },
            { icon: '🛒', name: 'Carrefour Market',      meta: 'Mar 14 · POS',      amt: '-EGP 847',    credit: false, badge: 'done' },
            { icon: '💸', name: 'Transfer — Nouran M.',  meta: 'Mar 13 · Instant',  amt: '-EGP 2,500',  credit: false, badge: 'done' },
            { icon: '⚡', name: 'EEHC Electricity',      meta: 'Mar 12 · Bill Pay', amt: '-EGP 430',    credit: false, badge: 'pending' },
          ].map(tx => (
            <div key={tx.name} className="tx-row">
              <div className="tx-icon" style={{ background: tx.credit ? 'var(--green-dim)' : 'var(--red-dim)' }}>{tx.icon}</div>
              <div className="tx-info">
                <div className="tx-name">{tx.name}</div>
                <div className="tx-meta">{tx.meta}</div>
              </div>
              <div className="tx-right">
                <div className={`tx-amount ${tx.credit ? 'credit' : 'debit'}`}>{tx.amt}</div>
                <span className={`tx-badge ${tx.badge}`}>{tx.badge === 'done' ? 'Completed' : 'Pending'}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="stack">
          <div className="card">
            <div className="card-header">
              <span className="card-title">Live Balances</span>
              <button className="card-action" onClick={refreshAccounts}>↻ Refresh</button>
            </div>
            {[
              { label: 'Checking', value: checking?.balance, green: true },
              { label: 'Savings',  value: savings?.balance,  green: true },
              { label: 'Loan',     value: loan?.loanAmount,  green: false },
            ].map(({ label, value, green }) => (
              <div key={label} className="info-row">
                <span className="info-label">{label}</span>
                <span className="info-value mono" style={{ color: green ? 'var(--green-lt)' : 'var(--blue-lt)' }}>
                  {value !== undefined ? fmt(value) : '—'}
                </span>
              </div>
            ))}
          </div>

          <div className="card">
            <div className="card-header"><span className="card-title">Security Status</span><span className="badge badge-green">Protected</span></div>
            {[
              { label: '2FA',        value: '✓ Enabled' },
              { label: 'Session',    value: 'HttpOnly cookies' },
              { label: 'Transport',  value: 'TLS 1.3'   },
              { label: 'Zero Trust', value: '✓ Active'  },
            ].map(({ label, value }) => (
              <div key={label} className="info-row">
                <span className="info-label">{label}</span>
                <span className="info-value" style={{ color: 'var(--green-lt)' }}>{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
