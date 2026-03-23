import React, { useMemo, useState } from 'react';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';

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

const Toggle = ({ checked }) => (
  <label className="toggle">
    <input type="checkbox" checked={checked} readOnly />
    <div className="toggle-track" />
  </label>
);

export default function SecurityCenter() {
  const { user } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [passwordMeter, setPasswordMeter] = useState({ score: 0, label: '', color: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const layers = useMemo(
    () => [
      {
        title: 'Frontend',
        badge: 'Active',
        color: 'badge-green',
        items: [
          {
            title: 'Protected Routes',
            desc: 'React Router blocks unauthenticated access to application pages.',
            on: true,
          },
          {
            title: 'Authenticator App Enrollment UI',
            desc: 'First login now requires a TOTP app setup flow instead of a demo OTP.',
            on: Boolean(user?.twoFactorEnabled),
          },
          {
            title: 'CSRF Client Tokens',
            desc: 'Axios fetches and submits anti-forgery tokens on every write request.',
            on: true,
          },
          {
            title: 'Basic Input Sanitization',
            desc: 'User-entered free-text fields strip angle brackets before they are sent.',
            on: true,
          },
        ],
      },
      {
        title: 'Backend',
        badge: 'Active',
        color: 'badge-green',
        items: [
          {
            title: 'bcrypt Password and PIN Hashing',
            desc: 'Credentials are hashed server-side before storage.',
            on: true,
          },
          {
            title: 'HttpOnly JWT Cookie Sessions',
            desc: 'Access and refresh tokens are delivered in HttpOnly cookies.',
            on: true,
          },
          {
            title: 'Authenticator TOTP Verification',
            desc: 'TOTP secrets are encrypted at rest and verified server-side.',
            on: true,
          },
          {
            title: 'XSS and NoSQL Sanitization',
            desc: 'Requests pass through xss-clean, express-validator, and express-mongo-sanitize.',
            on: true,
          },
          {
            title: 'Rate Limiting',
            desc: 'Login, transfer, and two-factor endpoints are throttled against abuse.',
            on: true,
          },
        ],
      },
      {
        title: 'DevOps',
        badge: 'Active',
        color: 'badge-green',
        items: [
          {
            title: 'Docker Hardening',
            desc: 'Containers run as non-root users with health checks and minimal images.',
            on: true,
          },
          {
            title: 'GitHub Actions Workflow',
            desc: 'The CI/CD pipeline is now mirrored into .github/workflows for execution.',
            on: true,
          },
          {
            title: 'Kubernetes Network Controls',
            desc: 'The repo includes network policies, mTLS, and internal-only backend service rules.',
            on: true,
          },
        ],
      },
    ],
    [user?.twoFactorEnabled]
  );

  const handleChangePassword = async (event) => {
    event.preventDefault();

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await api.patch('/auth/change-password', {
        currentPassword,
        newPassword,
        confirmPassword,
      });

      setSuccess('Password updated successfully. Please sign in again to continue.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'Failed to update password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="page-header fade-up-1">
        <h1>Security Center</h1>
        <p>Current protections across the frontend, backend, and delivery pipeline.</p>
      </div>

      <div className="grid-2 fade-up-2">
        <div className="stack">
          {layers.map((layer) => (
            <div key={layer.title} className="card">
              <div className="card-header">
                <span className="card-title">{layer.title}</span>
                <span className={`badge ${layer.color}`}>{layer.badge}</span>
              </div>

              {layer.items.map((item) => (
                <div key={item.title} className="sf-item">
                  <div className="sf-info">
                    <h4>{item.title}</h4>
                    <p>{item.desc}</p>
                  </div>
                  <div className="sf-toggle">
                    <Toggle checked={item.on} />
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>

        <div className="stack">
          <div className="card">
            <div className="card-header">
              <span className="card-title">Authenticator Status</span>
            </div>
            <div className="info-row">
              <span className="info-label">Two-factor authentication</span>
              <span
                className="info-value"
                style={{ color: user?.twoFactorEnabled ? 'var(--green-lt)' : 'var(--gold-lt)' }}
              >
                {user?.twoFactorEnabled ? 'Configured' : 'Pending first login setup'}
              </span>
            </div>
            <div className="info-row">
              <span className="info-label">Session storage</span>
              <span className="info-value">HttpOnly cookies</span>
            </div>
            <div className="info-row" style={{ borderBottom: 'none' }}>
              <span className="info-label">CSRF protection</span>
              <span className="info-value">Required on POST, PATCH, PUT, DELETE</span>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <span className="card-title">Change Password</span>
            </div>

            <form onSubmit={handleChangePassword}>
              <div className="field">
                <label>Current Password</label>
                <div className="input-wrap">
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(event) => setCurrentPassword(event.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="field">
                <label>New Password</label>
                <div className="input-wrap">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(event) => {
                      setNewPassword(event.target.value);
                      setPasswordMeter(passwordStrength(event.target.value));
                    }}
                    required
                    style={{ paddingRight: '3.5rem' }}
                  />
                  <button
                    type="button"
                    className="eye-btn"
                    onClick={() => setShowNewPassword((current) => !current)}
                  >
                    {showNewPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
                {newPassword && (
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

              <div className="field">
                <label>Confirm Password</label>
                <div className="input-wrap">
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    required
                  />
                </div>
              </div>

              {error && <div className="alert alert-error">{error}</div>}
              {success && <div className="alert alert-success">{success}</div>}

              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? (
                  <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                ) : (
                  'Update password'
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
