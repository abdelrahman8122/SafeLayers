import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { useAuth } from '../../context/AuthContext';

const emptyCode = () => ['', '', '', '', '', ''];

const portals = {
  customer: {
    title: 'Customer Portal',
    subtitle: 'Daily banking, transfers, cards, and loans',
    accent: 'var(--green-lt)',
  },
  admin: {
    title: 'Admin Portal',
    subtitle: 'Oversight, user control, account governance',
    accent: 'var(--gold)',
  },
};

const passwordStrength = (password) => {
  let score = 0;
  if (password.length >= 8) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  const labels = ['', 'Weak', 'Fair', 'Strong', 'Very Strong'];
  const colors = ['', '#DC2626', '#D97706', '#15803D', '#1D4ED8'];

  return { score, label: labels[score], color: colors[score] };
};

const formatAccountNumber = (value) => {
  let digits = value.replace(/\D/g, '');
  if (digits.length > 3) digits = `${digits.slice(0, 3)}-${digits.slice(3)}`;
  if (digits.length > 7) digits = `${digits.slice(0, 7)}-${digits.slice(7)}`;
  return digits.slice(0, 14);
};

const formatPortalName = (role) =>
  role ? role.charAt(0).toUpperCase() + role.slice(1) : 'Selected';

export default function LoginPage() {
  const { login, verifyTotp, confirmTotpSetup } = useAuth();

  const [portal, setPortal] = useState('customer');
  const [stage, setStage] = useState('credentials');
  const [accountNumber, setAccountNumber] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordMeter, setPasswordMeter] = useState({ score: 0, label: '', color: '' });
  const [code, setCode] = useState(emptyCode());
  const [preAuthToken, setPreAuthToken] = useState('');
  const [manualEntryKey, setManualEntryKey] = useState('');
  const [provisioningUri, setProvisioningUri] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const currentPortal = portals[portal];

  const resetCode = () => setCode(emptyCode());

  const resetToCredentials = () => {
    setStage('credentials');
    setPreAuthToken('');
    setManualEntryKey('');
    setProvisioningUri('');
    resetCode();
    setError('');
  };

  const selectPortal = (nextPortal) => {
    setPortal(nextPortal);
    resetToCredentials();
  };

  const handleLogin = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const data = await login(accountNumber, password);

      if (data.role && data.role !== portal) {
        setError(
          `This account belongs to the ${formatPortalName(
            data.role
          )} portal. Switch the portal selection and try again.`
        );
        return;
      }

      setPreAuthToken(data.preAuthToken || '');
      setManualEntryKey(data.manualEntryKey || '');
      setProvisioningUri(data.provisioningUri || '');
      resetCode();

      if (data.requiresTwoFactorSetup) {
        setStage('setup');
        return;
      }

      if (data.requiresTwoFactor) {
        setStage('verify');
      }
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCodeInput = (value, index) => {
    if (!/^\d?$/.test(value)) return;

    const next = [...code];
    next[index] = value;
    setCode(next);

    if (value && index < 5) {
      document.getElementById(`auth-code-${index + 1}`)?.focus();
    }
  };

  const handleCodeKey = (event, index) => {
    if (event.key === 'Backspace' && !code[index] && index > 0) {
      document.getElementById(`auth-code-${index - 1}`)?.focus();
    }
  };

  const submitCode = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const token = code.join('');

      if (stage === 'setup') {
        await confirmTotpSetup(preAuthToken, token);
      } else {
        await verifyTotp(preAuthToken, token);
      }
    } catch (requestError) {
      setError(
        requestError.response?.data?.error || 'Unable to verify the authenticator code.'
      );
      resetCode();
      document.getElementById('auth-code-0')?.focus();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '42% 58%', minHeight: '100vh' }}>
      <div
        style={{
          background: 'var(--surface)',
          borderRight: '1px solid var(--border)',
          padding: '2.8rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '2rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              background: 'var(--gold)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              color: '#fff',
              fontSize: 14,
            }}
          >
            SL
          </div>
          <span style={{ fontWeight: 700, fontSize: 16 }}>
            Safe<span style={{ color: 'var(--gold)' }}>Layers</span>
          </span>
        </div>

        <div
          style={{
            width: '100%',
            maxWidth: 320,
            borderRadius: 18,
            background: 'linear-gradient(135deg,#1A2D4A,#0D1A2E)',
            padding: '20px 24px',
            border: '1px solid rgba(201,150,26,.22)',
            boxShadow: '0 20px 50px rgba(0,0,0,.4)',
          }}
        >
          <div style={{ fontSize: '.72rem', color: 'rgba(255,255,255,.5)', marginBottom: 12 }}>
            Selected access
          </div>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff', marginBottom: 8 }}>
            {currentPortal.title}
          </div>
          <div style={{ fontSize: '.8rem', color: 'rgba(255,255,255,.72)', lineHeight: 1.6 }}>
            {portal === 'customer'
              ? 'Customer accounts can use transfers, deposits, withdrawals, cards, and loans.'
              : 'Admin accounts can review users, freeze accounts, inspect loans, and monitor transactions.'}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          {[
            'Choose the portal before entering credentials',
            'Customer and admin use the same secure backend',
            'The backend still checks the real role before access is granted',
            'Admin accounts can be created from signup with the admin setup key',
          ].map((text) => (
            <div
              key={text}
              style={{
                padding: '10px 12px',
                borderRadius: 8,
                border: '1px solid var(--border)',
                background: 'var(--bg3)',
                fontSize: '.8rem',
                color: 'var(--text2)',
              }}
            >
              {text}
            </div>
          ))}
        </div>
      </div>

      <div
        style={{
          background: 'var(--bg)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '3rem',
        }}
      >
        {stage === 'credentials' && (
          <form onSubmit={handleLogin} style={{ width: '100%', maxWidth: 420 }} className="fade-up">
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 10,
                marginBottom: '1.25rem',
              }}
            >
              {Object.entries(portals).map(([key, config]) => {
                const selected = portal === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => selectPortal(key)}
                    style={{
                      border: `1px solid ${selected ? config.accent : 'var(--border)'}`,
                      background: selected ? 'var(--gold-dim)' : 'var(--surface)',
                      color: 'var(--text)',
                      borderRadius: 12,
                      padding: '.9rem .95rem',
                      textAlign: 'left',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ fontWeight: 700, marginBottom: '.2rem' }}>{config.title}</div>
                    <div style={{ fontSize: '.76rem', color: 'var(--text2)', lineHeight: 1.45 }}>
                      {config.subtitle}
                    </div>
                  </button>
                );
              })}
            </div>

            <h2 style={{ fontSize: '1.6rem', fontWeight: 700, marginBottom: '.3rem' }}>
              Sign in to the {currentPortal.title}
            </h2>
            <p style={{ color: 'var(--text2)', fontSize: '.88rem', marginBottom: '1.2rem' }}>
              Use your account number and password. If the role does not match the selected
              portal, the sign-in will stop safely.
            </p>

            {portal === 'admin' && (
              <div className="alert alert-info" style={{ marginBottom: '1rem' }}>
                Admin access is only for accounts already promoted to the <strong>admin</strong> role.
              </div>
            )}

            {error && <div className="alert alert-error">{error}</div>}

            <div className="field">
              <label>Account Number</label>
              <div className="input-wrap">
                <input
                  type="text"
                  placeholder="233-126-0001"
                  value={accountNumber}
                  onChange={(event) => setAccountNumber(formatAccountNumber(event.target.value))}
                  required
                />
              </div>
            </div>

            <div className="field">
              <label>Password</label>
              <div className="input-wrap">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    setPasswordMeter(passwordStrength(event.target.value));
                  }}
                  required
                  style={{ paddingRight: '3.5rem' }}
                />
                <button
                  type="button"
                  className="eye-btn"
                  onClick={() => setShowPassword((current) => !current)}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
              {password && (
                <>
                  <div className="str-bar">
                    <div
                      className="str-fill"
                      style={{
                        width: `${passwordMeter.score * 25}%`,
                        background: passwordMeter.color,
                      }}
                    />
                  </div>
                  <div className="str-hint" style={{ color: passwordMeter.color }}>
                    {passwordMeter.label}
                  </div>
                </>
              )}
            </div>

            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? (
                <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
              ) : (
                `Continue to ${currentPortal.title}`
              )}
            </button>

            <p
              style={{
                textAlign: 'center',
                marginTop: '.9rem',
                fontSize: '.82rem',
                color: 'var(--text2)',
              }}
            >
              Need a new customer account?{' '}
              <Link to="/signup" style={{ color: 'var(--gold)', fontWeight: 600 }}>
                Create one
              </Link>
            </p>
          </form>
        )}

        {stage === 'setup' && (
          <form onSubmit={submitCode} style={{ width: '100%', maxWidth: 440 }} className="fade-up">
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <div
                style={{
                  display: 'inline-flex',
                  padding: '.3rem .7rem',
                  borderRadius: 999,
                  background: 'var(--gold-dim)',
                  color: 'var(--gold)',
                  fontSize: '.72rem',
                  fontWeight: 700,
                  marginBottom: '.8rem',
                }}
              >
                {currentPortal.title}
              </div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '.35rem' }}>
                Set up Two-Factor Authentication
              </h2>
              <p style={{ color: 'var(--text2)', fontSize: '.88rem' }}>
                Scan the QR code below with your authenticator app.
              </p>
            </div>

            {error && <div className="alert alert-error">{error}</div>}

            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.2rem' }}>
              <div
                style={{
                  background: '#fff',
                  padding: 16,
                  borderRadius: 12,
                  border: '2px solid rgba(201,150,26,.3)',
                  boxShadow: '0 4px 20px rgba(0,0,0,.3)',
                }}
              >
                <QRCodeSVG value={provisioningUri} size={200} level="M" />
              </div>
            </div>

            <details style={{ marginBottom: '1rem' }}>
              <summary
                style={{
                  fontSize: '.78rem',
                  color: 'var(--text3)',
                  cursor: 'pointer',
                  userSelect: 'none',
                  padding: '6px 0',
                }}
              >
                Cannot scan? Enter the key manually instead
              </summary>
              <div
                style={{
                  background: 'var(--bg3)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--r-sm)',
                  padding: '.8rem',
                  marginTop: '.5rem',
                }}
              >
                <div
                  style={{
                    fontSize: '.68rem',
                    color: 'var(--text3)',
                    textTransform: 'uppercase',
                    letterSpacing: '.8px',
                    marginBottom: '.3rem',
                  }}
                >
                  Manual setup key
                </div>
                <div
                  className="mono"
                  style={{
                    fontSize: '.9rem',
                    fontWeight: 700,
                    color: 'var(--gold-lt)',
                    letterSpacing: 2,
                    wordBreak: 'break-all',
                  }}
                >
                  {manualEntryKey}
                </div>
              </div>
            </details>

            <p
              style={{
                color: 'var(--text2)',
                fontSize: '.84rem',
                marginBottom: '.8rem',
                textAlign: 'center',
              }}
            >
              Enter the 6-digit code from your authenticator app
            </p>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', margin: '1rem 0' }}>
              {code.map((digit, index) => (
                <input
                  key={index}
                  id={`auth-code-${index}`}
                  type="text"
                  maxLength={1}
                  value={digit}
                  onChange={(event) => handleCodeInput(event.target.value, index)}
                  onKeyDown={(event) => handleCodeKey(event, index)}
                  className="mono"
                  style={{
                    width: 46,
                    height: 54,
                    textAlign: 'center',
                    fontSize: '1.3rem',
                    fontWeight: 600,
                    border: `1.5px solid ${digit ? 'rgba(201,150,26,.4)' : 'var(--border)'}`,
                    borderRadius: 'var(--r-sm)',
                    color: 'var(--text)',
                    outline: 'none',
                    background: digit ? 'var(--gold-dim2)' : 'var(--inp-bg)',
                  }}
                />
              ))}
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading || code.some((digit) => !digit)}
            >
              {loading ? (
                <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
              ) : (
                'Finish setup and sign in'
              )}
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              style={{ marginTop: '.6rem' }}
              onClick={resetToCredentials}
            >
              Back to login
            </button>
          </form>
        )}

        {stage === 'verify' && (
          <form onSubmit={submitCode} style={{ width: '100%', maxWidth: 400 }} className="fade-up">
            <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
              <div
                style={{
                  display: 'inline-flex',
                  padding: '.3rem .7rem',
                  borderRadius: 999,
                  background: 'var(--gold-dim)',
                  color: 'var(--gold)',
                  fontSize: '.72rem',
                  fontWeight: 700,
                  marginBottom: '.8rem',
                }}
              >
                {currentPortal.title}
              </div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '.35rem' }}>
                Verify your sign-in
              </h2>
              <p style={{ color: 'var(--text2)', fontSize: '.88rem' }}>
                Enter the current 6-digit code from your authenticator app.
              </p>
            </div>

            {error && <div className="alert alert-error">{error}</div>}

            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', margin: '1.5rem 0' }}>
              {code.map((digit, index) => (
                <input
                  key={index}
                  id={`auth-code-${index}`}
                  type="text"
                  maxLength={1}
                  value={digit}
                  onChange={(event) => handleCodeInput(event.target.value, index)}
                  onKeyDown={(event) => handleCodeKey(event, index)}
                  className="mono"
                  style={{
                    width: 46,
                    height: 54,
                    textAlign: 'center',
                    fontSize: '1.3rem',
                    fontWeight: 600,
                    border: `1.5px solid ${digit ? 'rgba(201,150,26,.4)' : 'var(--border)'}`,
                    borderRadius: 'var(--r-sm)',
                    color: 'var(--text)',
                    outline: 'none',
                    background: digit ? 'var(--gold-dim2)' : 'var(--inp-bg)',
                  }}
                />
              ))}
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading || code.some((digit) => !digit)}
            >
              {loading ? (
                <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
              ) : (
                'Verify and sign in'
              )}
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              style={{ marginTop: '.6rem' }}
              onClick={resetToCredentials}
            >
              Back to login
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
