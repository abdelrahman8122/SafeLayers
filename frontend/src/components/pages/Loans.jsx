import React, { useState, useEffect } from 'react';
import api from '../../utils/api';

const fmt = (n) => 'EGP ' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2 });

const LOAN_TYPES = [
  { key: 'personal', label: 'Personal Loan', rate: 8.5, max: 'EGP 200,000', term: '12–60 months', desc: 'Fast 24h approval' },
  { key: 'home', label: 'Home Mortgage', rate: 6.2, max: 'EGP 3,000,000', term: '5–25 years', desc: 'Collateral required' },
  { key: 'car', label: 'Car Loan', rate: 9.0, max: 'EGP 500,000', term: '12–72 months', desc: 'Vehicle collateral' },
  { key: 'business', label: 'Business Loan', rate: 11.5, max: 'EGP 1,000,000', term: '6–48 months', desc: 'Business docs required' },
];

const calcMonthly = (p, rate, months) => {
  const r = rate / 100 / 12;
  if (r === 0) return p / months;
  return p * (r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1);
};

export default function Loans() {
  const [selectedLoan, setSelectedLoan] = useState(0);
  const [amount, setAmount] = useState('');
  const [term, setTerm] = useState('36');
  const [calc, setCalc] = useState(null);
  const [activeLoan, setActiveLoan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    api.get('/loans').then(r => setActiveLoan(r.data.loan)).catch(() => {});
  }, []);

  useEffect(() => {
    if (parseFloat(amount) >= 1000) {
      const loanType = LOAN_TYPES[selectedLoan];
      const mo = calcMonthly(parseFloat(amount), loanType.rate, parseInt(term));
      const total = mo * parseInt(term);
      setCalc({ monthly: mo, interest: total - parseFloat(amount), total });
    } else {
      setCalc(null);
    }
  }, [amount, term, selectedLoan]);

  const handleApply = async () => {
    setShowModal(false);
    setLoading(true); setError(''); setSuccess('');
    try {
      const { data } = await api.post('/loans/apply', {
        loanType: LOAN_TYPES[selectedLoan].key,
        amount: parseFloat(amount),
        termMonths: parseInt(term),
      });
      setSuccess(`Loan approved! Monthly payment: ${fmt(data.monthlyPayment)}`);
      setActiveLoan({ loanAmount: data.amount, monthlyPayment: data.monthlyPayment, loanRate: data.annualRate, paymentsRemaining: data.termMonths });
      setAmount('');
    } catch (err) {
      setError(err.response?.data?.error || 'Application failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="page-header fade-up-1">
        <h1>Loan Products</h1>
        <p>AI-assisted advisory — credit scoring &amp; risk analysis</p>
      </div>

      <div className="grid-main fade-up-2">
        <div className="stack">
          {/* Loan type selector */}
          <div className="card">
            <div className="card-header"><span className="card-title">Choose Loan Type</span></div>
            {LOAN_TYPES.map((loan, i) => (
              <div key={loan.key} onClick={() => setSelectedLoan(i)}
                style={{ border: `1.5px solid ${selectedLoan === i ? 'var(--gold)' : 'var(--border)'}`, borderRadius: 'var(--r)', padding: '.9rem 1.1rem', cursor: 'pointer', transition: 'all .15s', marginBottom: '.6rem', background: selectedLoan === i ? 'var(--gold-dim2)' : 'transparent' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <span style={{ fontWeight: 700, fontSize: '.92rem' }}>{loan.label}</span>
                  <span style={{ fontFamily: 'JetBrains Mono', fontWeight: 700, color: 'var(--gold-lt)', fontSize: '.88rem' }}>{loan.rate}%</span>
                </div>
                <div style={{ fontSize: '.78rem', color: 'var(--text2)' }}>Up to {loan.max} · {loan.term} · {loan.desc}</div>
              </div>
            ))}
          </div>

          {/* Calculator */}
          <div className="card">
            <div className="card-header"><span className="card-title">Loan Calculator</span></div>
            <div className="field"><label>Loan Amount (EGP)</label><input type="number" min="1000" value={amount} onChange={e => setAmount(e.target.value)} placeholder="e.g. 50,000" /></div>
            <div className="field"><label>Repayment Period</label>
              <select value={term} onChange={e => setTerm(e.target.value)}>
                {['12','24','36','48','60'].map(t => <option key={t} value={t}>{t} months</option>)}
              </select>
            </div>
            {calc && (
              <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', padding: '.9rem 1.1rem', marginBottom: '1.2rem' }}>
                <div className="info-row"><span className="info-label">Monthly Payment</span><span className="mono" style={{ color: 'var(--gold-lt)', fontWeight: 700 }}>{fmt(calc.monthly)}</span></div>
                <div className="info-row"><span className="info-label">Total Interest</span><span className="mono">{fmt(calc.interest)}</span></div>
                <div className="info-row" style={{ borderBottom: 'none' }}><span className="info-label" style={{ fontWeight: 700 }}>Total Repayment</span><span className="mono" style={{ fontWeight: 700 }}>{fmt(calc.total)}</span></div>
              </div>
            )}
            {error && <div className="alert alert-error">{error}</div>}
            {success && <div className="alert alert-success">{success}</div>}
            <button className="btn btn-primary" disabled={loading || !calc} onClick={() => setShowModal(true)}>
              {loading ? <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> : 'Submit Application'}
            </button>
          </div>
        </div>

        <div className="stack">
          {/* Active loan */}
          <div className="card">
            <div className="card-header"><span className="card-title">Active Loan</span><span className="badge badge-green">On Track</span></div>
            {[
              { label: 'Loan Type', value: 'Personal Loan' },
              { label: 'Principal', value: fmt(activeLoan?.loanAmount ?? 30000) },
              { label: 'Rate', value: `${activeLoan?.loanRate ?? 8.5}% p.a.` },
              { label: 'Monthly', value: fmt(activeLoan?.monthlyPayment ?? 944) },
              { label: 'Remaining', value: `${activeLoan?.paymentsRemaining ?? 28} months` },
              { label: 'Next Due', value: 'Apr 1, 2026', highlight: true },
            ].map(({ label, value, highlight }) => (
              <div key={label} className="info-row"><span className="info-label">{label}</span><span className="info-value" style={highlight ? { color: 'var(--gold-lt)' } : {}}>{value}</span></div>
            ))}
            <div className="progress-wrap" style={{ marginTop: '1rem' }}>
              <div className="progress-fill" style={{ width: '15%' }} />
            </div>
            <div style={{ fontSize: '.72rem', color: 'var(--text3)', marginTop: 5 }}>5 of 36 payments made</div>
          </div>

          {/* AI Advisory */}
          <div className="card">
            <div className="card-header"><span className="card-title">AI Credit Advisory</span><span className="badge badge-blue">ML Model</span></div>
            <div style={{ background: 'var(--blue-dim)', border: '1px solid rgba(29,78,216,.15)', borderRadius: 'var(--r-sm)', padding: '.85rem', fontSize: '.82rem', color: 'var(--text2)', lineHeight: 1.6, marginBottom: '.9rem' }}>
              <strong style={{ color: 'var(--blue-lt)' }}>Credit Score Analysis:</strong> Score <strong style={{ color: 'var(--text)' }}>742 (Excellent)</strong>. Consolidating your loan could reduce rate by 1.2%.
            </div>
            {[
              { label: 'Credit Score', value: '742 — Excellent', color: 'var(--green-lt)' },
              { label: 'Debt-to-Income', value: '18.4%' },
              { label: 'Max Eligibility', value: 'EGP 200,000' },
            ].map(({ label, value, color }) => (
              <div key={label} className="info-row"><span className="info-label">{label}</span><span className="info-value" style={color ? { color } : {}}>{value}</span></div>
            ))}
          </div>
        </div>
      </div>

      {/* Confirm modal */}
      {showModal && calc && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Confirm Loan Application</h3>
            <p>Submit your application for {LOAN_TYPES[selectedLoan].label}?</p>
            <div className="modal-detail">
              <div className="info-row"><span className="info-label">Type</span><span className="info-value">{LOAN_TYPES[selectedLoan].label}</span></div>
              <div className="info-row"><span className="info-label">Amount</span><span className="info-value mono" style={{ color: 'var(--gold-lt)' }}>{fmt(parseFloat(amount))}</span></div>
              <div className="info-row"><span className="info-label">Rate</span><span className="info-value">{LOAN_TYPES[selectedLoan].rate}% p.a.</span></div>
              <div className="info-row" style={{ borderBottom: 'none' }}><span className="info-label">Monthly</span><span className="info-value mono">{fmt(calc.monthly)}</span></div>
            </div>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleApply}>Confirm</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
