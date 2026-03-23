import React, { useState } from 'react';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';

export default function Cards() {
  const { user } = useAuth();
  const [frozen, setFrozen] = useState(false);
  const [showCvv, setShowCvv] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  const handleFreeze = async () => {
    setLoading(true);
    try {
      const { data } = await api.patch('/accounts/freeze');
      setFrozen(data.isFrozen);
      setMsg(data.message);
      setTimeout(() => setMsg(''), 3000);
    } catch {
      // Demo mode fallback
      setFrozen(f => !f);
      setMsg(frozen ? 'Card unfrozen successfully' : 'Card frozen successfully');
      setTimeout(() => setMsg(''), 3000);
    } finally {
      setLoading(false);
    }
  };

  const name = user?.fullName || 'Mariam Ahmed';

  return (
    <div>
      <div className="page-header fade-up-1">
        <h1>My Cards</h1>
        <p>Manage your payment cards and spending limits</p>
      </div>

      <div className="grid-2 fade-up-2">
        <div className="stack">
          {/* Virtual card */}
          <div style={{
            borderRadius: 18, background: frozen ? 'linear-gradient(135deg,#1a1a2e,#16213e)' : 'linear-gradient(135deg,#1A2D4A,#0D1A2E)',
            padding: '24px 28px', border: '1px solid rgba(201,150,26,.22)',
            boxShadow: '0 20px 50px rgba(0,0,0,.4)', position: 'relative', overflow: 'hidden',
            transition: 'all .3s', filter: frozen ? 'grayscale(60%)' : 'none',
          }}>
            <div style={{ position: 'absolute', top: -50, right: -50, width: 180, height: 180, borderRadius: '50%', background: 'radial-gradient(circle,rgba(201,150,26,.08),transparent 70%)' }} />
            {frozen && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,.45)', borderRadius: 18, zIndex: 2 }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 28, marginBottom: 6 }}>🔒</div>
                  <div style={{ color: '#fff', fontWeight: 700, fontSize: '.9rem' }}>Card Frozen</div>
                </div>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.3rem' }}>
              <div style={{ fontSize: '.62rem', fontWeight: 800, color: 'rgba(201,150,26,.75)', letterSpacing: '1.5px', textTransform: 'uppercase' }}>SafeLayers Bank</div>
              <div style={{ fontSize: '.63rem', color: 'rgba(255,255,255,.35)' }}>VISA Platinum</div>
            </div>
            <div style={{ width: 30, height: 22, borderRadius: 4, background: 'linear-gradient(135deg,#B8860B,#E8B84B)', marginBottom: 14 }} />
            <div style={{ fontFamily: 'JetBrains Mono', fontSize: '.82rem', letterSpacing: '3.5px', color: 'rgba(255,255,255,.5)', marginBottom: 12 }}>
              4539 •••• •••• 3126
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <div>
                <div style={{ fontSize: '.58rem', color: 'rgba(255,255,255,.35)', textTransform: 'uppercase', letterSpacing: .5, marginBottom: 2 }}>Card Holder</div>
                <div style={{ fontSize: '.74rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: .7, color: '#fff' }}>{name}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '.58rem', color: 'rgba(255,255,255,.35)', textTransform: 'uppercase', letterSpacing: .5, marginBottom: 2 }}>Expires</div>
                <div style={{ fontFamily: 'JetBrains Mono', fontSize: '.72rem', color: 'rgba(255,255,255,.6)' }}>03/28</div>
              </div>
            </div>
          </div>

          {/* Card actions */}
          <div className="card">
            <div className="card-header"><span className="card-title">Card Actions</span></div>
            {msg && <div className="alert alert-success">{msg}</div>}
            <div className="grid-2" style={{ gap: '.6rem' }}>
              <button className={`btn ${frozen ? 'btn-success' : 'btn-ghost'} btn-sm`} style={{ width: '100%' }} onClick={handleFreeze} disabled={loading}>
                {loading ? <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> : frozen ? '🔓 Unfreeze' : '🔒 Freeze'}
              </button>
              <button className="btn btn-ghost btn-sm" style={{ width: '100%' }} onClick={() => setShowCvv(s => !s)}>
                {showCvv ? '🙈 Hide CVV' : '👁 Show CVV'}
              </button>
              <button className="btn btn-ghost btn-sm" style={{ width: '100%' }}>📋 Details</button>
              <button className="btn btn-danger btn-sm" style={{ width: '100%' }}>🚫 Cancel Card</button>
            </div>
            {showCvv && (
              <div style={{ marginTop: '1rem', textAlign: 'center', background: 'var(--gold-dim)', border: '1px solid rgba(201,150,26,.2)', borderRadius: 'var(--r-sm)', padding: '.8rem' }}>
                <div style={{ fontSize: '.72rem', color: 'var(--text2)', marginBottom: 4 }}>CVV (expires in 30s)</div>
                <div style={{ fontFamily: 'JetBrains Mono', fontSize: '1.6rem', fontWeight: 700, color: 'var(--gold-lt)', letterSpacing: 6 }}>427</div>
              </div>
            )}
          </div>
        </div>

        {/* Limits & settings */}
        <div className="card fade-up-3">
          <div className="card-header"><span className="card-title">Limits &amp; Settings</span></div>
          {[
            { label: 'Daily Spend Limit', value: 'EGP 50,000' },
            { label: 'Online Transactions', value: '✓ Enabled', green: true },
            { label: 'International', value: '✓ Enabled', green: true },
            { label: 'Contactless', value: '✓ Enabled', green: true },
            { label: 'ATM Withdrawal', value: 'EGP 20,000/day' },
            { label: 'Card Status', value: frozen ? '🔒 Frozen' : '✓ Active', green: !frozen },
          ].map(({ label, value, green }) => (
            <div key={label} className="info-row">
              <span className="info-label">{label}</span>
              <span className="info-value" style={green ? { color: 'var(--green-lt)' } : {}}>{value}</span>
            </div>
          ))}
          <div style={{ marginTop: '1.2rem' }}>
            <div className="sf-item" style={{ paddingTop: 0 }}>
              <div className="sf-icon" style={{ background: 'var(--green-dim)' }}>✅</div>
              <div className="sf-info">
                <h4>3DS Verification Active</h4>
                <p>All online transactions require your authenticator-app code after password sign-in.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
