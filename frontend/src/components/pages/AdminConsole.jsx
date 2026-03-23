import React, { useEffect, useState } from 'react';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';

const cardStyle = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--r)',
  padding: '1.1rem 1.15rem',
  boxShadow: 'var(--shadow)',
};

const mutedText = {
  color: 'var(--text2)',
  fontSize: '.78rem',
};

const tableCell = {
  padding: '.72rem .55rem',
  borderBottom: '1px solid var(--border)',
  verticalAlign: 'top',
  fontSize: '.82rem',
};

const formatDate = (value) => {
  if (!value) return 'Never';
  return new Date(value).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatMoney = (value) =>
  'EGP ' + Number(value ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 });

const getRoleTone = (role) => {
  if (role === 'admin') return { bg: 'var(--gold-dim)', color: 'var(--gold)' };
  if (role === 'teller') return { bg: 'var(--blue-dim)', color: 'var(--blue-lt)' };
  return { bg: 'var(--green-dim)', color: 'var(--green-lt)' };
};

export default function AdminConsole() {
  const { user } = useAuth();
  const [overview, setOverview] = useState({ stats: {}, recentTransactions: [] });
  const [users, setUsers] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyKey, setBusyKey] = useState('');
  const [error, setError] = useState('');

  const loadAdminData = async ({ silent = false } = {}) => {
    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      setError('');
      const [overviewRes, usersRes, accountsRes, loansRes] = await Promise.all([
        api.get('/admin/overview'),
        api.get('/admin/users'),
        api.get('/admin/accounts'),
        api.get('/admin/loans'),
      ]);

      setOverview(overviewRes.data);
      setUsers(usersRes.data.users || []);
      setAccounts(accountsRes.data.accounts || []);
      setLoans(loansRes.data.loans || []);
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'Failed to load admin data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  const handleToggleUser = async (targetUser) => {
    const pendingKey = `user-${targetUser.id}`;
    setBusyKey(pendingKey);

    try {
      await api.patch(`/admin/users/${targetUser.id}/status`, {
        isActive: !targetUser.isActive,
      });
      await loadAdminData({ silent: true });
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'Unable to update user status.');
    } finally {
      setBusyKey('');
    }
  };

  const handleToggleFreeze = async (account) => {
    const pendingKey = `account-${account._id}`;
    setBusyKey(pendingKey);

    try {
      await api.patch(`/admin/accounts/${account._id}/freeze`, {
        isFrozen: !account.isFrozen,
      });
      await loadAdminData({ silent: true });
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'Unable to update account status.');
    } finally {
      setBusyKey('');
    }
  };

  const statCards = [
    {
      label: 'Total Users',
      value: overview.stats.totalUsers ?? 0,
      detail: `${overview.stats.activeCustomers ?? 0} active customers`,
      accent: 'var(--gold)',
    },
    {
      label: 'Frozen Accounts',
      value: overview.stats.frozenAccounts ?? 0,
      detail: `${overview.stats.lockedUsers ?? 0} locked users`,
      accent: 'var(--red)',
    },
    {
      label: 'Active Loans',
      value: overview.stats.activeLoans ?? 0,
      detail: `${overview.stats.pendingTransactions ?? 0} pending transactions`,
      accent: 'var(--blue-lt)',
    },
    {
      label: 'Transactions Today',
      value: overview.stats.transactionsToday ?? 0,
      detail: `${overview.stats.adminUsers ?? 0} admin account(s)`,
      accent: 'var(--green-lt)',
    },
  ];

  return (
    <div>
      <div
        className="page-header fade-up-1"
        style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}
      >
        <div style={{ flex: 1 }}>
          <h1>Admin Console</h1>
          <p>
            Governance view for users, accounts, loans, and recent transaction activity.
            {' '}Logged in as {user?.fullName || 'Admin'}.
          </p>
        </div>
        <button
          onClick={() => loadAdminData({ silent: true })}
          disabled={refreshing}
          style={{
            border: '1px solid var(--border)',
            background: 'var(--surface)',
            color: 'var(--text)',
            borderRadius: 10,
            padding: '.7rem .95rem',
            cursor: 'pointer',
            minWidth: 120,
          }}
        >
          {refreshing ? 'Refreshing...' : 'Refresh Data'}
        </button>
      </div>

      {error && (
        <div className="card fade-up-2" style={{ marginBottom: '1rem', borderColor: 'var(--red)' }}>
          <div style={{ color: 'var(--red)', fontWeight: 700, marginBottom: '.25rem' }}>
            Admin API Warning
          </div>
          <div style={mutedText}>{error}</div>
        </div>
      )}

      <div className="grid-4 fade-up-2" style={{ marginBottom: '1.35rem' }}>
        {statCards.map((card) => (
          <div key={card.label} style={{ ...cardStyle, position: 'relative', overflow: 'hidden' }}>
            <div
              style={{
                position: 'absolute',
                top: -36,
                right: -36,
                width: 120,
                height: 120,
                borderRadius: '50%',
                background: `radial-gradient(circle, ${card.accent}20, transparent 70%)`,
              }}
            />
            <div
              style={{
                ...mutedText,
                textTransform: 'uppercase',
                letterSpacing: '.08em',
                fontWeight: 700,
              }}
            >
              {card.label}
            </div>
            <div
              className="mono"
              style={{ fontSize: '1.65rem', fontWeight: 700, margin: '.35rem 0 .2rem' }}
            >
              {loading ? '--' : card.value}
            </div>
            <div style={mutedText}>{card.detail}</div>
          </div>
        ))}
      </div>

      <div className="grid-main fade-up-3" style={{ alignItems: 'start' }}>
        <div style={cardStyle}>
          <div className="card-header" style={{ marginBottom: '.8rem' }}>
            <span className="card-title">User Access Control</span>
            <span className="badge badge-gold">{users.length} records</span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr
                  style={{
                    textAlign: 'left',
                    color: 'var(--text2)',
                    fontSize: '.72rem',
                    textTransform: 'uppercase',
                    letterSpacing: '.08em',
                  }}
                >
                  <th style={tableCell}>User</th>
                  <th style={tableCell}>Role</th>
                  <th style={tableCell}>Security</th>
                  <th style={tableCell}>Status</th>
                  <th style={tableCell}>Action</th>
                </tr>
              </thead>
              <tbody>
                {users.map((entry) => {
                  const tone = getRoleTone(entry.role);
                  const isBusy = busyKey === `user-${entry.id}`;

                  return (
                    <tr key={entry.id}>
                      <td style={tableCell}>
                        <div style={{ fontWeight: 700 }}>{entry.fullName}</div>
                        <div style={mutedText}>{entry.email}</div>
                        <div className="mono" style={{ ...mutedText, marginTop: '.18rem' }}>
                          {entry.accountNumber}
                        </div>
                      </td>
                      <td style={tableCell}>
                        <span
                          style={{
                            display: 'inline-flex',
                            padding: '.18rem .55rem',
                            borderRadius: 999,
                            background: tone.bg,
                            color: tone.color,
                            fontWeight: 700,
                            fontSize: '.72rem',
                            textTransform: 'uppercase',
                          }}
                        >
                          {entry.role}
                        </span>
                      </td>
                      <td style={tableCell}>
                        <div>{entry.twoFactorEnabled ? '2FA enabled' : '2FA pending'}</div>
                        <div style={mutedText}>{entry.kycVerified ? 'KYC verified' : 'KYC pending'}</div>
                        <div style={mutedText}>Last login: {formatDate(entry.lastLogin)}</div>
                      </td>
                      <td style={tableCell}>
                        <div style={{ color: entry.isActive ? 'var(--green-lt)' : 'var(--red)' }}>
                          {entry.isActive ? 'Active' : 'Inactive'}
                        </div>
                        <div style={mutedText}>
                          {entry.lockUntil
                            ? `Locked until ${formatDate(entry.lockUntil)}`
                            : 'Not locked'}
                        </div>
                      </td>
                      <td style={tableCell}>
                        <button
                          onClick={() => handleToggleUser(entry)}
                          disabled={isBusy}
                          style={{
                            border: '1px solid var(--border)',
                            background: entry.isActive ? 'var(--red-dim)' : 'var(--green-dim)',
                            color: 'var(--text)',
                            borderRadius: 8,
                            padding: '.45rem .7rem',
                            cursor: 'pointer',
                          }}
                        >
                          {isBusy ? 'Saving...' : entry.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="stack">
          <div style={cardStyle}>
            <div className="card-header" style={{ marginBottom: '.8rem' }}>
              <span className="card-title">Loan Portfolio</span>
              <span className="badge badge-green">{loans.length} active loans</span>
            </div>
            {loans.length === 0 ? (
              <div style={mutedText}>No active loans found.</div>
            ) : (
              loans.slice(0, 5).map((loan) => (
                <div key={loan._id} className="info-row" style={{ alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontWeight: 700 }}>{loan.owner?.fullName || 'Unknown user'}</div>
                    <div style={mutedText}>{loan.owner?.accountNumber || loan.accountNumber}</div>
                    <div style={mutedText}>
                      {loan.loanTermMonths} months at {loan.loanRate}% APR
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div className="mono" style={{ fontWeight: 700 }}>
                      {formatMoney(loan.loanAmount || loan.balance)}
                    </div>
                    <div style={mutedText}>Monthly {formatMoney(loan.monthlyPayment)}</div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div style={cardStyle}>
            <div className="card-header" style={{ marginBottom: '.8rem' }}>
              <span className="card-title">Recent Transactions</span>
              <span className="badge badge-gold">
                {overview.recentTransactions?.length || 0} items
              </span>
            </div>
            {(overview.recentTransactions || []).length === 0 ? (
              <div style={mutedText}>No recent transactions available.</div>
            ) : (
              overview.recentTransactions.map((tx) => (
                <div key={tx._id || tx.reference} className="tx-row">
                  <div
                    className="tx-icon"
                    style={{
                      background: tx.status === 'pending' ? 'var(--gold-dim)' : 'var(--blue-dim)',
                    }}
                  >
                    {tx.type?.slice(0, 1)?.toUpperCase() || 'T'}
                  </div>
                  <div className="tx-info">
                    <div className="tx-name">{tx.owner?.fullName || 'Unknown user'}</div>
                    <div className="tx-meta">
                      {tx.type} · {tx.owner?.accountNumber || 'N/A'}
                    </div>
                  </div>
                  <div className="tx-right">
                    <div className="tx-amount">{formatMoney(tx.amount)}</div>
                    <span className={`tx-badge ${tx.status === 'pending' ? 'pending' : 'done'}`}>
                      {tx.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="card fade-up-4" style={{ marginTop: '1.35rem' }}>
        <div className="card-header" style={{ marginBottom: '.8rem' }}>
          <span className="card-title">Account Control</span>
          <span className="badge badge-green">{accounts.length} accounts</span>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr
                style={{
                  textAlign: 'left',
                  color: 'var(--text2)',
                  fontSize: '.72rem',
                  textTransform: 'uppercase',
                  letterSpacing: '.08em',
                }}
              >
                <th style={tableCell}>Account</th>
                <th style={tableCell}>Owner</th>
                <th style={tableCell}>Balance</th>
                <th style={tableCell}>State</th>
                <th style={tableCell}>Action</th>
              </tr>
            </thead>
            <tbody>
              {accounts.slice(0, 8).map((account) => {
                const isBusy = busyKey === `account-${account._id}`;

                return (
                  <tr key={account._id}>
                    <td style={tableCell}>
                      <div style={{ fontWeight: 700 }}>{account.accountNumber}</div>
                      <div style={mutedText}>{account.type}</div>
                    </td>
                    <td style={tableCell}>
                      <div>{account.owner?.fullName || 'Unknown user'}</div>
                      <div style={mutedText}>{account.owner?.email || 'No email'}</div>
                    </td>
                    <td style={tableCell}>
                      <div className="mono">{formatMoney(account.balance)}</div>
                      <div style={mutedText}>Daily limit {formatMoney(account.dailyLimit)}</div>
                    </td>
                    <td style={tableCell}>
                      <div style={{ color: account.isFrozen ? 'var(--red)' : 'var(--green-lt)' }}>
                        {account.isFrozen ? 'Frozen' : 'Operational'}
                      </div>
                      <div style={mutedText}>{account.isActive ? 'Active record' : 'Inactive record'}</div>
                    </td>
                    <td style={tableCell}>
                      <button
                        onClick={() => handleToggleFreeze(account)}
                        disabled={isBusy}
                        style={{
                          border: '1px solid var(--border)',
                          background: account.isFrozen ? 'var(--green-dim)' : 'var(--red-dim)',
                          color: 'var(--text)',
                          borderRadius: 8,
                          padding: '.45rem .7rem',
                          cursor: 'pointer',
                        }}
                      >
                        {isBusy ? 'Saving...' : account.isFrozen ? 'Unfreeze' : 'Freeze'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
