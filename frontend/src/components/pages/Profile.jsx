import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function Profile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const name = user?.fullName || 'Mariam Ahmed';
  const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2);

  return (
    <div>
      <div className="page-header fade-up-1">
        <h1>My Profile</h1>
        <p>Personal information &amp; account settings</p>
      </div>

      {/* Hero */}
      <div className="card fade-up-2" style={{ display: 'flex', alignItems: 'center', gap: '1.2rem', marginBottom: '1.5rem' }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', fontWeight: 800, color: '#fff', flexShrink: 0 }}>
          {initials}
        </div>
        <div>
          <div style={{ fontSize: '1.15rem', fontWeight: 700 }}>{name}</div>
          <div style={{ fontSize: '.82rem', color: 'var(--text2)', marginTop: 2 }}>
            ID: {user?.accountNumber || '233-126-0001'} · Joined Jan 2022 · Cairo Branch
          </div>
          <div style={{ marginTop: 6 }}>
            <span className="badge badge-gold">Premium Account</span>
          </div>
        </div>
        <div style={{ marginLeft: 'auto' }}>
          <span className="badge badge-green">✓ KYC Verified</span>
        </div>
      </div>

      <div className="grid-2 fade-up-3">
        {/* Personal info */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Personal Information</span>
            <button className="card-action">Edit ✎</button>
          </div>
          {[
            { label: 'Full Name', value: name },
            { label: 'National ID', value: '29••••1234••••', masked: true },
            { label: 'Email', value: user?.email || 'm.ahmed@mail.com' },
            { label: 'Mobile', value: '+20 10•• •••• 7892', masked: true },
            { label: 'Address', value: user?.address || 'Cairo, Egypt' },
            { label: 'Date of Birth', value: '••/••/19••', masked: true },
          ].map(({ label, value, masked }) => (
            <div key={label} className="info-row">
              <span className="info-label">{label}</span>
              <span className={`info-value ${masked ? 'masked' : ''}`}>{value}</span>
            </div>
          ))}
        </div>

        {/* Account details */}
        <div className="card">
          <div className="card-header"><span className="card-title">Account Details</span></div>
          {[
            { label: 'Account Number', value: '•••• •••• •••• 3126', masked: true },
            { label: 'IBAN', value: 'EG38 •••• •••• •••• •126', masked: true },
            { label: 'Account Type', value: 'Checking — Premium' },
            { label: 'Branch', value: 'Cairo HQ' },
            { label: 'Credit Score', value: '742 — Excellent', green: true },
            { label: 'KYC Status', value: 'Fully Verified ✓', green: true },
          ].map(({ label, value, masked, green }) => (
            <div key={label} className="info-row">
              <span className="info-label">{label}</span>
              <span className={`info-value ${masked ? 'masked' : ''}`} style={green ? { color: 'var(--green-lt)' } : {}}>{value}</span>
            </div>
          ))}
          <div style={{ display: 'flex', gap: '.65rem', marginTop: '1.2rem', flexWrap: 'wrap' }}>
            <button className="btn btn-ghost btn-sm">📄 Download Statement</button>
            <button className="btn btn-danger btn-sm" onClick={handleLogout}>↩ Sign Out</button>
          </div>
        </div>
      </div>
    </div>
  );
}
