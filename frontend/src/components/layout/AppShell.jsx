import React, { useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useBalance } from '../../context/BalanceContext';
import { useTheme } from '../../context/ThemeContext';

const customerNavItems = [
  { section: 'Overview' },
  { to: '/dashboard', icon: 'DB', label: 'Dashboard' },
  { to: '/history', icon: 'TX', label: 'Transactions' },
  { section: 'Banking' },
  { to: '/transfer', icon: 'TR', label: 'Transfer' },
  { to: '/deposit', icon: 'DP', label: 'Deposit' },
  { to: '/withdraw', icon: 'WD', label: 'Withdraw' },
  { to: '/loans', icon: 'LN', label: 'Loans', tag: 'Active' },
  { to: '/cards', icon: 'CD', label: 'Cards' },
  { section: 'Settings' },
  { to: '/security', icon: 'SC', label: 'Security Center' },
  { to: '/profile', icon: 'ME', label: 'Profile' },
];

const adminNavItems = [
  { section: 'Overview' },
  { to: '/admin', icon: 'AD', label: 'Admin Console', tag: 'RBAC' },
  { section: 'Settings' },
  { to: '/security', icon: 'SC', label: 'Security Center' },
  { to: '/profile', icon: 'ME', label: 'Profile' },
];

export default function AppShell() {
  const { user, logout, formatSessionTime } = useAuth();
  const { toggleTheme } = useTheme();
  const { refreshAccounts } = useBalance();
  const navigate = useNavigate();

  const navItems = user?.role === 'admin' ? adminNavItems : customerNavItems;
  const accountLabel = user?.role === 'admin' ? 'Administrator' : 'Premium Account';

  useEffect(() => {
    if (user?.role === 'admin') {
      return undefined;
    }

    refreshAccounts();
    return undefined;
  }, [refreshAccounts, user?.role]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="app-layout">
      <aside
        style={{
          width: 'var(--sb-width)',
          background: 'var(--surface)',
          borderRight: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          position: 'fixed',
          top: 0,
          left: 0,
          height: '100vh',
          overflowY: 'auto',
          zIndex: 50,
          transition: 'background .2s, border .2s',
        }}
      >
        <div style={{ padding: '1.3rem 1.2rem .9rem', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div
              style={{
                width: 30,
                height: 30,
                borderRadius: 7,
                background: 'var(--gold)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 12,
                fontWeight: 800,
                color: '#fff',
              }}
            >
              SL
            </div>
            <span style={{ fontSize: 13, fontWeight: 700 }}>
              Safe<span style={{ color: 'var(--gold)' }}>Layers</span>
            </span>
          </div>
        </div>

        <nav style={{ flex: 1, paddingBottom: '1rem' }}>
          {navItems.map((item, index) => {
            if (item.section) {
              return (
                <div
                  key={`${item.section}-${index}`}
                  style={{
                    padding: '.9rem 1.2rem .3rem',
                    fontSize: '.65rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '1.2px',
                    color: 'var(--text3)',
                  }}
                >
                  {item.section}
                </div>
              );
            }

            return (
              <NavLink
                key={item.to}
                to={item.to}
                style={({ isActive }) => ({
                  display: 'flex',
                  alignItems: 'center',
                  gap: 9,
                  padding: '.58rem 1.1rem',
                  margin: '1px .5rem',
                  borderRadius: 8,
                  cursor: 'pointer',
                  border: 'none',
                  background: isActive ? 'var(--gold-dim)' : 'transparent',
                  color: isActive ? 'var(--gold)' : 'var(--text2)',
                  fontSize: '.9rem',
                  fontWeight: 500,
                  textDecoration: 'none',
                  transition: 'all .15s',
                  position: 'relative',
                })}
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <div
                        style={{
                          position: 'absolute',
                          left: -8,
                          top: 0,
                          bottom: 0,
                          width: 3,
                          background: 'var(--gold)',
                          borderRadius: '0 2px 2px 0',
                        }}
                      />
                    )}
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 6,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 11,
                        fontWeight: 700,
                        background: isActive ? 'var(--gold-dim)' : 'transparent',
                      }}
                    >
                      {item.icon}
                    </div>
                    {item.label}
                    {item.tag && (
                      <span
                        style={{
                          marginLeft: 'auto',
                          fontSize: '.6rem',
                          fontWeight: 700,
                          padding: '1px 6px',
                          borderRadius: 20,
                          background: 'var(--gold-dim)',
                          color: 'var(--gold-lt)',
                        }}
                      >
                        {item.tag}
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        <div style={{ padding: '.9rem 1.1rem', borderTop: '1px solid var(--border)' }}>
          <div
            onClick={() => navigate('/profile')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 9,
              padding: '.55rem .7rem',
              borderRadius: 8,
              background: 'var(--bg3)',
              cursor: 'pointer',
              transition: 'background .15s',
            }}
          >
            <div
              style={{
                width: 30,
                height: 30,
                borderRadius: '50%',
                background: 'var(--gold)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '.68rem',
                fontWeight: 800,
                color: '#fff',
                flexShrink: 0,
              }}
            >
              {user?.fullName?.split(' ').map((part) => part[0]).join('').slice(0, 2) || 'SL'}
            </div>
            <div>
              <div style={{ fontSize: '.8rem', fontWeight: 600, lineHeight: 1.2 }}>
                {user?.fullName || 'SafeLayers User'}
              </div>
              <div style={{ fontSize: '.65rem', color: 'var(--text2)' }}>{accountLabel}</div>
            </div>
            <button
              onClick={(event) => {
                event.stopPropagation();
                handleLogout();
              }}
              style={{
                marginLeft: 'auto',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: '.68rem',
                color: 'var(--text3)',
                padding: 4,
              }}
              title="Sign out"
            >
              OUT
            </button>
          </div>
        </div>
      </aside>

      <div className="main-area">
        <header
          style={{
            height: 56,
            background: 'var(--surface)',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            padding: '0 1.8rem',
            gap: '.9rem',
            position: 'sticky',
            top: 0,
            zIndex: 40,
            transition: 'background .2s, border .2s',
          }}
        >
          <div style={{ flex: 1 }} />

          <div className="badge badge-green">
            <div
              style={{
                width: 4,
                height: 4,
                borderRadius: '50%',
                background: 'var(--green-lt)',
                animation: 'pulse 2s infinite',
              }}
            />
            TLS 1.3
          </div>

          <div className="badge badge-gold">
            <div
              style={{
                width: 4,
                height: 4,
                borderRadius: '50%',
                background: 'var(--gold-lt)',
                animation: 'pulse 2s infinite',
              }}
            />
            <span className="mono" style={{ fontSize: '.72rem' }}>
              Session: {formatSessionTime()}
            </span>
          </div>

          <button className="theme-toggle" onClick={toggleTheme} title="Toggle light/dark mode">
            <span className="theme-icon moon">MO</span>
            <span className="theme-icon sun">SU</span>
          </button>

          <div
            style={{
              position: 'relative',
              width: 32,
              height: 32,
              borderRadius: 8,
              border: '1.5px solid var(--border)',
              background: 'var(--bg3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 11,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            NT
            <div
              style={{
                position: 'absolute',
                top: 5,
                right: 5,
                width: 5,
                height: 5,
                borderRadius: '50%',
                background: 'var(--red)',
                border: '1.5px solid var(--surface)',
              }}
            />
          </div>
        </header>

        <main className="page-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
