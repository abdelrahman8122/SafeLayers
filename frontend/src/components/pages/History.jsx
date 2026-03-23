import React, { useState, useEffect } from 'react';
import api from '../../utils/api';

const fmt = (n) => 'EGP ' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2 });

const DEMO_TX = [
  { _id: '1', icon: '💰', description: 'Salary Deposit', meta: 'Mar 15, 2026 · REF: TXN-2026-0315-001', amount: 12000, type: 'deposit', status: 'completed' },
  { _id: '2', icon: '🛒', description: 'Carrefour Market', meta: 'Mar 14, 2026 · REF: TXN-2026-0314-003', amount: 847, type: 'withdrawal', status: 'completed' },
  { _id: '3', icon: '💸', description: 'Transfer — Nouran Mostafa', meta: 'Mar 13, 2026 · REF: TXN-2026-0313-007', amount: 2500, type: 'transfer', status: 'completed' },
  { _id: '4', icon: '⚡', description: 'EEHC Electricity Bill', meta: 'Mar 12, 2026 · REF: TXN-2026-0312-002', amount: 430, type: 'transfer', status: 'pending' },
  { _id: '5', icon: '🏦', description: 'Savings Interest', meta: 'Mar 1, 2026 · REF: TXN-2026-0301-001', amount: 488, type: 'deposit', status: 'completed' },
  { _id: '6', icon: '🍔', description: 'Koshary El Tahrir', meta: 'Feb 28, 2026 · REF: TXN-2026-0228-005', amount: 195, type: 'withdrawal', status: 'completed' },
  { _id: '7', icon: '💼', description: 'Freelance Payment', meta: 'Feb 25, 2026 · REF: TXN-2026-0225-001', amount: 8500, type: 'deposit', status: 'completed' },
  { _id: '8', icon: '🚗', description: 'Loan Repayment', meta: 'Feb 20, 2026 · REF: TXN-2026-0220-002', amount: 944, type: 'loan_payment', status: 'completed' },
];

export default function History() {
  const [filter, setFilter] = useState('all');
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/transactions/history?type=${filter}&limit=50`)
      .then(r => setTransactions(r.data.transactions || []))
      .catch(() => setTransactions(DEMO_TX))
      .finally(() => setLoading(false));
  }, [filter]);

  const isCredit = (tx) => tx.type === 'deposit' || tx.type === 'interest';
  const iconFor = (tx) => tx.icon || (isCredit(tx) ? '💰' : tx.type === 'transfer' ? '💸' : '⬆️');

  const filtered = filter === 'all' ? transactions
    : filter === 'credit' ? transactions.filter(t => isCredit(t))
    : transactions.filter(t => !isCredit(t));

  return (
    <div>
      <div className="page-header fade-up-1">
        <h1>Transaction History</h1>
        <p>Immutable audit ledger — every transaction logged with IP, session and timestamp</p>
      </div>

      <div className="fade-up-2">
        <div className="tabs">
          {['all', 'credit', 'debit'].map(t => (
            <button key={t} className={`tab-btn ${filter === t ? 'active' : ''}`} onClick={() => { setFilter(t); setLoading(true); }}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        <div className="card">
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}><div className="spinner" /></div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text2)', fontSize: '.9rem' }}>No transactions found.</div>
          ) : filtered.map(tx => (
            <div key={tx._id} className="tx-row">
              <div className="tx-icon" style={{ background: isCredit(tx) ? 'var(--green-dim)' : tx.type === 'transfer' ? 'var(--blue-dim)' : 'var(--red-dim)' }}>
                {iconFor(tx)}
              </div>
              <div className="tx-info">
                <div className="tx-name">{tx.description}</div>
                <div className="tx-meta">{tx.meta || (tx.createdAt ? new Date(tx.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) + ' · ' + tx.reference : '')}</div>
              </div>
              <div className="tx-right">
                <div className={`tx-amount ${isCredit(tx) ? 'credit' : 'debit'}`}>
                  {isCredit(tx) ? '+' : '-'}{fmt(tx.amount)}
                </div>
                <span className={`tx-badge ${tx.status === 'completed' ? 'done' : 'pending'}`}>
                  {tx.status === 'completed' ? 'Completed' : 'Pending'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
