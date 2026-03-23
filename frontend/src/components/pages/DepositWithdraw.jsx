import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import { useBalance } from '../../context/BalanceContext';

const fmtNum = (n) => 'EGP ' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2 });

// ─── DEPOSIT ──────────────────────────────────────────
export function Deposit() {
  const { getChecking, getSavings, refreshAccounts, fmt } = useBalance();
  const [amount, setAmount] = useState('');
  const [accountType, setAccountType] = useState('checking');
  const [method, setMethod] = useState('Bank Transfer (SWIFT/SEPA)');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const checking = getChecking();
  const savings  = getSavings();

  useEffect(() => { refreshAccounts(); }, []);

  const handleDeposit = async (e) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) return setError('Please enter a valid amount.');
    setLoading(true); setError(''); setResult(null);
    try {
      const { data } = await api.post('/transactions/deposit', { amount: parseFloat(amount), accountType, method });
      await refreshAccounts(); // live update
      setResult({ ...data, deposited: parseFloat(amount) });
      setAmount('');
    } catch (err) {
      setError(err.response?.data?.error || 'Deposit failed.');
    } finally { setLoading(false); }
  };

  const selectedBal = accountType === 'checking' ? checking?.balance : savings?.balance;

  return (
    <div>
      <div className="page-header fade-up-1"><h1>Deposit Funds</h1><p>Add money — XSS &amp; injection protected</p></div>
      <div className="grid-2 fade-up-2">
        <div className="card">
          <div className="card-header"><span className="card-title">Deposit Details</span></div>
          <form onSubmit={handleDeposit}>
            <div className="field">
              <label>Destination Account</label>
              <select value={accountType} onChange={e => setAccountType(e.target.value)}>
                <option value="checking">Checking — {fmt(checking?.balance ?? 0)}</option>
                <option value="savings">Savings — {fmt(savings?.balance ?? 0)}</option>
              </select>
            </div>
            <div className="field">
              <label>Deposit Method</label>
              <select value={method} onChange={e => setMethod(e.target.value)}>
                <option>Bank Transfer (SWIFT/SEPA)</option>
                <option>Internal Transfer</option>
                <option>Cash at Branch</option>
                <option>Mobile Cheque</option>
              </select>
            </div>
            <div className="field">
              <label>Amount (EGP)</label>
              <input type="number" min="1" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" />
              {selectedBal !== undefined && amount > 0 && (
                <div style={{fontSize:'.72rem',color:'var(--text3)',marginTop:3}}>
                  Balance after: {fmt((selectedBal||0) + (parseFloat(amount)||0))}
                </div>
              )}
            </div>
            <div className="field"><label>Reference (optional)</label><input type="text" placeholder="Reference number" maxLength={50} /></div>
            {error && <div className="alert alert-error">{error}</div>}
            {result && <div className="alert alert-success">✓ Deposited {fmtNum(result.deposited)} · REF: {result.reference}<br/><span style={{fontSize:'.8rem'}}>New balance: {fmt(result.newBalance)}</span></div>}
            <button type="submit" className="btn btn-success" disabled={loading}>{loading ? <span className="spinner" style={{width:16,height:16,borderWidth:2}}/> : 'Process Deposit'}</button>
          </form>
        </div>
        <div className="card">
          <div className="card-header"><span className="card-title">Input Security</span></div>
          {[
            {icon:'🧹',bg:'var(--green-dim)',title:'XSS Sanitization',desc:'express-validator + input escaping on all fields.'},
            {icon:'🔍',bg:'var(--blue-dim)',title:'Schema Validation',desc:'Validates every request before DB write.'},
            {icon:'⚠️',bg:'var(--gold-dim)',title:'Fraud Detection',desc:'Anomaly detection flags unusual deposits.'},
            {icon:'🚫',bg:'var(--red-dim)',title:'NoSQL Injection Prevention',desc:'express-mongo-sanitize strips all operators.'},
          ].map(({icon,bg,title,desc}) => (
            <div key={title} className="sf-item"><div className="sf-icon" style={{background:bg}}>{icon}</div><div className="sf-info"><h4>{title}</h4><p>{desc}</p></div></div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── WITHDRAW ─────────────────────────────────────────
export function Withdraw() {
  const { getChecking, getSavings, refreshAccounts, fmt } = useBalance();
  const [amount, setAmount] = useState('');
  const [accountType, setAccountType] = useState('checking');
  const [pin, setPin] = useState(['','','','']);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const checking = getChecking();
  const savings  = getSavings();

  useEffect(() => { refreshAccounts(); }, []);

  const handlePinInput = (val, idx) => {
    if (!/^\d?$/.test(val)) return;
    const next = [...pin]; next[idx] = val; setPin(next);
    if (val && idx < 3) document.getElementById(`pin-${idx+1}`)?.focus();
  };

  const handleWithdraw = async (e) => {
    e.preventDefault();
    const pinStr = pin.join('');
    if (!amount || parseFloat(amount) <= 0) return setError('Please enter a valid amount.');
    if (pinStr.length < 4) return setError('Please enter your 4-digit PIN.');
    const bal = accountType === 'checking' ? checking?.balance : savings?.balance;
    if (bal !== undefined && parseFloat(amount) > bal) return setError('Insufficient funds. Available: ' + fmt(bal));
    setLoading(true); setError(''); setResult(null);
    try {
      const { data } = await api.post('/transactions/withdraw', { amount: parseFloat(amount), accountType, pin: pinStr });
      await refreshAccounts(); // live update
      setResult({ ...data, withdrawn: parseFloat(amount) });
      setAmount(''); setPin(['','','','']);
    } catch (err) {
      setError(err.response?.data?.error || 'Withdrawal failed.');
    } finally { setLoading(false); }
  };

  const selectedBal = accountType === 'checking' ? checking?.balance : savings?.balance;

  return (
    <div>
      <div className="page-header fade-up-1"><h1>Withdraw Funds</h1><p>PIN + RBAC authorization required</p></div>
      <div className="grid-2 fade-up-2">
        <div className="card">
          <div className="card-header"><span className="card-title">Withdrawal Details</span></div>
          <form onSubmit={handleWithdraw}>
            <div className="field">
              <label>From Account</label>
              <select value={accountType} onChange={e => setAccountType(e.target.value)}>
                <option value="checking">Checking — {fmt(checking?.balance ?? 0)}</option>
                <option value="savings">Savings — {fmt(savings?.balance ?? 0)}</option>
              </select>
            </div>
            <div className="field">
              <label>Amount (EGP)</label>
              <input type="number" min="1" max="20000" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" />
              {selectedBal !== undefined && amount > 0 && (
                <div style={{fontSize:'.72rem',color:parseFloat(amount)>selectedBal?'var(--red-lt)':'var(--text3)',marginTop:3}}>
                  Available: {fmt(selectedBal)} · After: {fmt(Math.max(0,(selectedBal||0)-(parseFloat(amount)||0)))}
                </div>
              )}
            </div>
            <div className="field">
              <label>Transaction PIN <span style={{color:'var(--text3)',fontSize:'.72rem',textTransform:'none',letterSpacing:0,fontWeight:400}}>(your 4-digit PIN)</span></label>
              <div style={{display:'flex',gap:10}}>
                {pin.map((d,i) => (
                  <input key={i} id={`pin-${i}`} type="password" maxLength={1} value={d} inputMode="numeric"
                    onChange={e => handlePinInput(e.target.value,i)}
                    style={{width:52,height:52,textAlign:'center',fontSize:'1.3rem',background:'var(--inp-bg)',border:'1.5px solid var(--border)',borderRadius:'var(--r-sm)',color:'var(--text)',outline:'none'}}/>
                ))}
              </div>
            </div>
            <div style={{background:'var(--bg3)',borderRadius:'var(--r-sm)',padding:'.75rem .95rem',border:'1px solid var(--border)',marginBottom:'1.1rem',fontSize:'.82rem',color:'var(--text2)'}}>
              Daily limit: <strong style={{color:'var(--text)'}}>EGP 20,000</strong>
            </div>
            {error && <div className="alert alert-error">{error}</div>}
            {result && <div className="alert alert-success">✓ {result.message} · REF: {result.reference}<br/><span style={{fontSize:'.8rem'}}>New balance: {fmt(result.newBalance)}</span></div>}
            <button type="submit" className="btn btn-danger" disabled={loading}>{loading ? <span className="spinner" style={{width:16,height:16,borderWidth:2}}/> : 'Confirm Withdrawal'}</button>
          </form>
        </div>
        <div className="card">
          <div className="card-header"><span className="card-title">Withdrawal Security</span></div>
          {[
            {icon:'🔢',bg:'var(--red-dim)',title:'PIN Verification',desc:'PIN is sent over TLS and verified server-side against a bcrypt hash.'},
            {icon:'👤',bg:'var(--green-dim)',title:'RBAC Authorization',desc:'Server verifies CUSTOMER role before any debit.'},
            {icon:'📡',bg:'var(--blue-dim)',title:'Audit Trail',desc:'Each withdrawal logged with IP, session, timestamp.'},
            {icon:'🚧',bg:'var(--gold-dim)',title:'Daily Limit',desc:'EGP 20,000/day enforced server-side before processing.'},
          ].map(({icon,bg,title,desc}) => (
            <div key={title} className="sf-item"><div className="sf-icon" style={{background:bg}}>{icon}</div><div className="sf-info"><h4>{title}</h4><p>{desc}</p></div></div>
          ))}
        </div>
      </div>
    </div>
  );
}
