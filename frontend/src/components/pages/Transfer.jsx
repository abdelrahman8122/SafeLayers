import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import { useBalance } from '../../context/BalanceContext';
import { useFavorites } from '../../hooks/useFavorites';
import { sanitizeTextInput } from '../../utils/sanitize';

export default function Transfer() {
  const { getChecking, getSavings, refreshAccounts, fmt } = useBalance();
  const { favorites, addFavorite, removeFavorite, isFavorite } = useFavorites();

  const [toAccount, setToAccount] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [fromType, setFromType] = useState('checking');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [saveFavorite, setSaveFavorite] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);

  const checking = getChecking();
  const savings = getSavings();
  const selectedAccount = fromType === 'checking' ? checking : savings;
  const total = parseFloat(amount) || 0;

  useEffect(() => { refreshAccounts(); }, []);

  const selectFavorite = (fav) => {
    setToAccount(fav.account);
    setRecipientName(fav.name);
    setError('');
    setResult(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!toAccount.match(/^\d{3}-\d{3}-\d{4}$/)) return setError('Account number must be in format ###-###-####');
    if (!recipientName.trim()) return setError('Please enter the recipient name.');
    if (!amount || total <= 0) return setError('Please enter a valid amount.');
    if (selectedAccount && total > selectedAccount.balance) return setError('Insufficient funds. Available: ' + fmt(selectedAccount.balance));
    if (!pin || pin.length < 4) return setError('Please enter your 4-digit PIN.');
    setError('');
    setShowModal(true);
  };

  const confirmTransfer = async () => {
    setShowModal(false);
    setLoading(true);
    try {
      const { data } = await api.post('/transactions/transfer', {
        toAccountNumber: toAccount,
        amount: total,
        description,
        pin,
        fromAccountType: fromType,
      });
      if (saveFavorite && recipientName.trim()) {
        addFavorite(recipientName.trim(), toAccount);
      }
      await refreshAccounts();
      setResult({ message: data.message, reference: data.reference, newBalance: data.newBalance });
      setAmount(''); setPin(''); setDescription(''); setToAccount(''); setRecipientName(''); setSaveFavorite(false);
    } catch (err) {
      setError(err.response?.data?.error || 'Transfer failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="page-header fade-up-1">
        <h1>Send Money</h1>
        <p>Instant transfers — HttpOnly cookie session, CSRF protected</p>
      </div>

      <div className="grid-main fade-up-2">
        <div className="stack">
          <div className="card">
            <div className="card-header">
              <span className="card-title">Frequent Contacts</span>
              {favorites.length > 0 && <span style={{fontSize:'.72rem',color:'var(--text3)'}}>{favorites.length} saved</span>}
            </div>

            {favorites.length === 0 ? (
              <div style={{textAlign:'center',padding:'1rem 0',color:'var(--text3)',fontSize:'.82rem'}}>
                No favorites yet — fill in a recipient below and toggle ⭐ to save them
              </div>
            ) : (
              <div style={{display:'flex',gap:'.75rem',marginBottom:'1rem',overflowX:'auto',paddingBottom:4}}>
                {favorites.map((fav) => (
                  <div key={fav.account} style={{position:'relative'}}>
                    <div onClick={() => selectFavorite(fav)}
                      style={{display:'flex',flexDirection:'column',alignItems:'center',gap:5,minWidth:56,cursor:'pointer',
                        opacity:toAccount===fav.account?1:.6,transition:'opacity .15s'}}>
                      <div style={{width:44,height:44,borderRadius:'50%',background:fav.color,
                        display:'flex',alignItems:'center',justifyContent:'center',fontSize:'.75rem',fontWeight:700,color:'#fff',
                        border:toAccount===fav.account?'2.5px solid var(--gold)':'2.5px solid transparent',transition:'border .15s'}}>
                        {fav.initials}
                      </div>
                      <span style={{fontSize:'.7rem',fontWeight:500,color:'var(--text2)',whiteSpace:'nowrap'}}>
                        {fav.name.split(' ')[0]}
                      </span>
                    </div>
                    <button onClick={() => removeFavorite(fav.account)} title="Remove"
                      style={{position:'absolute',top:-4,right:-4,width:16,height:16,borderRadius:'50%',
                        background:'var(--red)',border:'none',color:'#fff',fontSize:9,cursor:'pointer',
                        display:'flex',alignItems:'center',justifyContent:'center'}}>×</button>
                  </div>
                ))}
              </div>
            )}

            <div className="field">
              <label>Recipient Account Number</label>
              <input type="text" placeholder="###-###-####" value={toAccount}
                onChange={e => {
                  let v = e.target.value.replace(/\D/g,'');
                  if (v.length>3) v=v.slice(0,3)+'-'+v.slice(3);
                  if (v.length>7) v=v.slice(0,7)+'-'+v.slice(7);
                  setToAccount(v.slice(0,14));
                }} />
            </div>
            <div className="field">
              <label>Recipient Name</label>
                <input type="text" placeholder="Full name of recipient" value={recipientName} onChange={e => setRecipientName(sanitizeTextInput(e.target.value))} />
            </div>
            <div className="field" style={{marginBottom:0}}>
              <label>From Account</label>
              <select value={fromType} onChange={e => setFromType(e.target.value)}>
                <option value="checking">Checking — {fmt(checking?.balance ?? 0)}</option>
                <option value="savings">Savings — {fmt(savings?.balance ?? 0)}</option>
              </select>
            </div>
          </div>

          <div className="card">
            <div className="card-header"><span className="card-title">Amount &amp; Details</span></div>
            <form onSubmit={handleSubmit}>
              <div className="field">
                <label>Amount (EGP)</label>
                <input type="number" min="1" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" />
                {selectedAccount && amount > 0 && (
                  <div style={{fontSize:'.72rem',color:total>selectedAccount.balance?'var(--red-lt)':'var(--green-lt)',marginTop:3}}>
                    Available: {fmt(selectedAccount.balance)}
                  </div>
                )}
              </div>
              <div className="field">
                <label>Description (optional)</label>
                <input type="text" value={description} onChange={e => setDescription(sanitizeTextInput(e.target.value))} placeholder="e.g. Rent payment" maxLength={200} />
              </div>
              <div className="field">
                <label>Transaction PIN</label>
                <div className="input-wrap">
                  <input type={showPin?'text':'password'} value={pin}
                    onChange={e => setPin(e.target.value.replace(/\D/g,'').slice(0,4))}
                    placeholder="••••" maxLength={4} style={{paddingRight:'3.5rem'}} />
                  <button type="button" className="eye-btn" onClick={() => setShowPin(s=>!s)}>{showPin?'Hide':'Show'}</button>
                </div>
              </div>

              {toAccount && recipientName && !isFavorite(toAccount) && (
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',
                  background:'var(--bg3)',border:'1px solid var(--border)',borderRadius:'var(--r-sm)',
                  padding:'.7rem 1rem',marginBottom:'1rem'}}>
                  <div>
                    <div style={{fontSize:'.82rem',fontWeight:600}}>⭐ Save to favorites</div>
                    <div style={{fontSize:'.72rem',color:'var(--text2)'}}>Add {recipientName} to frequent contacts</div>
                  </div>
                  <label className="toggle">
                    <input type="checkbox" checked={saveFavorite} onChange={e => setSaveFavorite(e.target.checked)} />
                    <div className="toggle-track" />
                  </label>
                </div>
              )}

              {isFavorite(toAccount) && toAccount && (
                <div style={{fontSize:'.78rem',color:'var(--gold-lt)',marginBottom:'1rem'}}>⭐ Already in your favorites</div>
              )}

              {total > 0 && (
                <div style={{background:'var(--bg3)',border:'1px solid var(--border)',borderRadius:'var(--r-sm)',padding:'.85rem 1rem',marginBottom:'1.1rem'}}>
                  <div className="info-row" style={{fontSize:'.84rem'}}><span>Amount</span><span className="mono">{fmt(total)}</span></div>
                  <div className="info-row" style={{fontSize:'.84rem'}}><span>Fee</span><span>EGP 0.00</span></div>
                  <div className="info-row" style={{fontSize:'.9rem',fontWeight:700,borderBottom:'none'}}><span>Total Deducted</span><span className="mono" style={{color:'var(--gold-lt)'}}>{fmt(total)}</span></div>
                  {selectedAccount && (
                    <div style={{fontSize:'.75rem',color:'var(--text3)',marginTop:6}}>
                      Balance after transfer: {fmt(Math.max(0,(selectedAccount.balance||0)-total))}
                    </div>
                  )}
                </div>
              )}

              {error && <div className="alert alert-error">{error}</div>}
              {result && (
                <div className="alert alert-success">
                  ✓ {result.message} · REF: {result.reference}
                  {result.newBalance!==undefined && <div style={{fontSize:'.8rem',marginTop:3}}>New balance: {fmt(result.newBalance)}</div>}
                </div>
              )}

              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? <span className="spinner" style={{width:16,height:16,borderWidth:2}}/> : 'Review & Confirm'}
              </button>
            </form>
          </div>
        </div>

        <div className="card fade-up-3">
          <div className="card-header"><span className="card-title">Security Controls</span></div>
          {[
            {icon:'🔑',bg:'var(--gold-dim)',title:'HttpOnly JWT Cookies',desc:'Signed cookie sessions with refresh-token rotation and replay detection.'},
            {icon:'🔒',bg:'var(--blue-dim)',title:'TLS 1.3 Encryption',desc:'Perfect Forward Secrecy on all API calls.'},
            {icon:'🛡️',bg:'var(--red-dim)',title:'CSRF Protection',desc:'Anti-forgery tokens on all POST requests.'},
            {icon:'⚡',bg:'var(--green-dim)',title:'Rate Limiting',desc:'Max 10 transfers/hour per user at API Gateway.'},
            {icon:'📊',bg:'var(--blue-dim)',title:'ACID Transactions',desc:'MongoDB sessions prevent race conditions.'},
          ].map(({icon,bg,title,desc}) => (
            <div key={title} className="sf-item">
              <div className="sf-icon" style={{background:bg}}>{icon}</div>
              <div className="sf-info"><h4>{title}</h4><p>{desc}</p></div>
            </div>
          ))}
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Confirm Transfer</h3>
            <p>Please review before confirming.</p>
            <div className="modal-detail">
              <div className="info-row"><span className="info-label">To</span><span className="info-value">{recipientName}</span></div>
              <div className="info-row"><span className="info-label">Account</span><span className="info-value mono">{toAccount}</span></div>
              <div className="info-row"><span className="info-label">From</span><span className="info-value">{fromType==='checking'?'Checking':'Savings'}</span></div>
              <div className="info-row" style={{borderBottom:'none'}}><span className="info-label">Amount</span><span className="info-value mono" style={{color:'var(--gold-lt)'}}>{fmt(total)}</span></div>
            </div>
            <div className="alert alert-info" style={{margin:0}}>🔒 TLS 1.3 secured · cookie session verified</div>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={confirmTransfer}>Confirm</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
