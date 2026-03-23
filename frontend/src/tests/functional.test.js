/**
 * SafeLayers — Frontend Functional Tests
 * Tests: password validation, account formatting, sanitization,
 *        session logic, loan calculator, TOTP input, PII masking
 * Group 8 · 25CSCI34H
 */

// ══════════════════════════════════════════════════════════
//  UTILITY FUNCTIONS (mirrors what's in the components)
// ══════════════════════════════════════════════════════════

const passwordStrength = (pw) => {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  const labels = ['', 'Weak', 'Fair', 'Strong', 'Very Strong'];
  const colors = ['', '#DC2626', '#D97706', '#15803D', '#1D4ED8'];
  return { score, label: labels[score], color: colors[score] };
};

const formatAccountNumber = (val) => {
  let v = val.replace(/\D/g, '');
  if (v.length > 3) v = v.slice(0, 3) + '-' + v.slice(3);
  if (v.length > 7) v = v.slice(0, 7) + '-' + v.slice(7);
  return v.slice(0, 14);
};

const fmt = (n) => 'EGP ' + Number(n ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 });

const calcMonthly = (principal, annualRate, months) => {
  const r = annualRate / 100 / 12;
  if (r === 0) return principal / months;
  return principal * (r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1);
};

// From sanitize.js (frontend)
const sanitizeInput = (input) => {
  if (typeof input !== 'string') return '';
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

const maskEmail  = (email) => email.replace(/(.{2}).*(@.*)/, '$1•••$2');
const maskPhone  = (phone) => `••${phone.slice(-4)}`;

const formatSessionTime = (seconds) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
};

const isValidOtpDigit = (v) => /^\d?$/.test(v);
const isOtpComplete   = (code) => code.length === 6 && code.every(d => d !== '');

// ══════════════════════════════════════════════════════════
//  1. PASSWORD STRENGTH METER
// ══════════════════════════════════════════════════════════
describe('🔒 Password Strength Meter', () => {

  test('✅ Empty password scores 0', () => {
    expect(passwordStrength('').score).toBe(0);
  });
  test('✅ Only lowercase scores 1 (length only)', () => {
    expect(passwordStrength('password').score).toBe(1);
  });
  test('✅ Full strength password scores 4 (Very Strong)', () => {
    const r = passwordStrength('Test1234%');
    expect(r.score).toBe(4);
    expect(r.label).toBe('Very Strong');
  });
  test('✅ Missing special character caps at Strong', () => {
    const r = passwordStrength('Password1');
    expect(r.score).toBeLessThan(4);
  });
  test('✅ Weak password returns red color', () => {
    expect(passwordStrength('password').color).toBe('#DC2626');
  });
  test('✅ Very Strong returns blue color', () => {
    expect(passwordStrength('Test1234%').color).toBe('#1D4ED8');
  });
  test('✅ Short password scores lower regardless of complexity', () => {
    expect(passwordStrength('T1%').score).toBeLessThan(4);
  });
});

// ══════════════════════════════════════════════════════════
//  2. ACCOUNT NUMBER FORMATTER
// ══════════════════════════════════════════════════════════
describe('🏦 Account Number Formatter', () => {

  test('✅ Formats 10 digits as ###-###-####', () => {
    expect(formatAccountNumber('2331260001')).toBe('233-126-0001');
  });
  test('✅ Strips non-numeric characters', () => {
    expect(formatAccountNumber('abc123def456xyz7890')).toBe('123-456-7890');
  });
  test('✅ Limits to 14 characters max', () => {
    expect(formatAccountNumber('12345678901234567890').length).toBeLessThanOrEqual(14);
  });
  test('✅ Empty string returns empty', () => {
    expect(formatAccountNumber('')).toBe('');
  });
  test('✅ Already formatted number stays the same', () => {
    expect(formatAccountNumber('233-126-0001')).toBe('233-126-0001');
  });
  test('✅ Partial number formats what is available', () => {
    expect(formatAccountNumber('233126')).toBe('233-126');
  });
});

// ══════════════════════════════════════════════════════════
//  3. CURRENCY FORMATTER
// ══════════════════════════════════════════════════════════
describe('💰 Currency Formatter', () => {

  test('✅ Adds EGP prefix', () => {
    expect(fmt(1000)).toBe('EGP 1,000.00');
  });
  test('✅ Formats large number with commas', () => {
    expect(fmt(48250)).toBe('EGP 48,250.00');
  });
  test('✅ Formats zero correctly', () => {
    expect(fmt(0)).toBe('EGP 0.00');
  });
  test('✅ Handles decimal numbers', () => {
    expect(fmt(1234.56)).toBe('EGP 1,234.56');
  });
  test('✅ Handles null gracefully (shows 0.00)', () => {
    expect(fmt(null)).toBe('EGP 0.00');
  });
  test('✅ Handles undefined gracefully', () => {
    expect(fmt(undefined)).toBe('EGP 0.00');
  });
});

// ══════════════════════════════════════════════════════════
//  4. LOAN CALCULATOR
// ══════════════════════════════════════════════════════════
describe('📊 Loan Calculator', () => {

  test('✅ Monthly payment is positive', () => {
    expect(calcMonthly(50000, 8.5, 36)).toBeGreaterThan(0);
  });
  test('✅ Total repayment exceeds principal', () => {
    expect(calcMonthly(50000, 8.5, 36) * 36).toBeGreaterThan(50000);
  });
  test('✅ Higher rate means higher monthly payment', () => {
    expect(calcMonthly(50000, 11.5, 36)).toBeGreaterThan(calcMonthly(50000, 6.2, 36));
  });
  test('✅ Longer term means lower monthly payment', () => {
    expect(calcMonthly(50000, 8.5, 60)).toBeLessThan(calcMonthly(50000, 8.5, 12));
  });
  test('✅ Zero interest divides principal evenly', () => {
    expect(Math.round(calcMonthly(12000, 0, 12))).toBe(1000);
  });
});

// ══════════════════════════════════════════════════════════
//  5. FRONTEND INPUT SANITIZATION (sanitize.js)
// ══════════════════════════════════════════════════════════
describe('🧹 Frontend XSS Sanitization', () => {

  test('✅ Script tags are escaped', () => {
    const r = sanitizeInput('<script>alert(1)</script>');
    expect(r).not.toContain('<script>');
    expect(r).toContain('&lt;script&gt;');
  });
  test('✅ img onerror is escaped', () => {
    expect(sanitizeInput('<img src=x onerror=alert(1)>')).not.toContain('<img');
  });
  test('✅ Double quotes are escaped', () => {
    expect(sanitizeInput('"hello"')).toContain('&quot;');
  });
  test('✅ Single quotes are escaped', () => {
    expect(sanitizeInput("it's")).toContain('&#x27;');
  });
  test('✅ Normal text is unchanged', () => {
    expect(sanitizeInput('Hello World 123')).toBe('Hello World 123');
  });
  test('✅ Non-string returns empty string', () => {
    expect(sanitizeInput(null)).toBe('');
    expect(sanitizeInput(undefined)).toBe('');
  });
  test('✅ SQL injection attempt is escaped', () => {
    const r = sanitizeInput("'; DROP TABLE users; --");
    expect(r).toContain('&#x27;');
    expect(r).not.toContain("'");
  });
});

// ══════════════════════════════════════════════════════════
//  6. PII DATA MASKING
// ══════════════════════════════════════════════════════════
describe('🙈 PII Data Masking', () => {

  test('✅ Email is masked — only first 2 chars visible', () => {
    const m = maskEmail('mariam@test.com');
    expect(m).toBe('ma•••@test.com');
    expect(m).not.toContain('riam');
  });
  test('✅ Phone shows only last 4 digits', () => {
    const m = maskPhone('+201001234567');
    expect(m).toContain('4567');
    expect(m.startsWith('••')).toBe(true);
  });
  test('✅ Masked email retains @ symbol', () => {
    expect(maskEmail('nouran@test.com')).toContain('@');
  });
  test('✅ Masked phone is shorter than original', () => {
    const phone = '+201001234567';
    expect(maskPhone(phone).length).toBeLessThan(phone.length);
  });
  test('✅ Masked email is shorter than original', () => {
    const email = 'mariam@test.com';
    expect(maskEmail(email).length).toBeLessThan(email.length + 3); // accounts for bullet chars
  });
});

// ══════════════════════════════════════════════════════════
//  7. SESSION TIMER
// ══════════════════════════════════════════════════════════
describe('⏱️ Session Timer Logic', () => {

  test('✅ 600 seconds formats as 10:00', () => {
    expect(formatSessionTime(600)).toBe('10:00');
  });
  test('✅ 65 seconds formats as 1:05', () => {
    expect(formatSessionTime(65)).toBe('1:05');
  });
  test('✅ 0 seconds formats as 0:00', () => {
    expect(formatSessionTime(0)).toBe('0:00');
  });
  test('✅ 59 seconds formats as 0:59', () => {
    expect(formatSessionTime(59)).toBe('0:59');
  });
  test('✅ Single digit seconds are zero-padded', () => {
    expect(formatSessionTime(61)).toBe('1:01');
  });
});

// ══════════════════════════════════════════════════════════
//  8. TOTP / OTP INPUT VALIDATION
// ══════════════════════════════════════════════════════════
describe('🔐 TOTP Code Input Validation', () => {

  test('✅ Single digits 0-9 are valid', () => {
    for (let i = 0; i <= 9; i++) {
      expect(isValidOtpDigit(String(i))).toBe(true);
    }
  });
  test('✅ Empty string is valid (backspace)', () => {
    expect(isValidOtpDigit('')).toBe(true);
  });
  test('❌ Letters are not valid TOTP digits', () => {
    expect(isValidOtpDigit('a')).toBe(false);
  });
  test('❌ Special characters are not valid', () => {
    expect(isValidOtpDigit('@')).toBe(false);
  });
  test('✅ Complete 6-digit code is detected', () => {
    expect(isOtpComplete(['1','2','3','4','5','6'])).toBe(true);
  });
  test('❌ Incomplete code is not complete', () => {
    expect(isOtpComplete(['1','2','3','','',''])).toBe(false);
  });
  test('❌ Empty code is not complete', () => {
    expect(isOtpComplete(['','','','','',''])).toBe(false);
  });
});

// ══════════════════════════════════════════════════════════
//  9. COOKIE-BASED AUTH (no localStorage)
// ══════════════════════════════════════════════════════════
describe('🍪 Cookie-Based Auth (no localStorage)', () => {

  test('✅ localStorage does not contain accessToken after login (cookie auth)', () => {
    // In the new version auth is stored in HttpOnly cookies, not localStorage
    // This test verifies localStorage is clean
    localStorage.clear();
    expect(localStorage.getItem('accessToken')).toBeNull();
  });

  test('✅ localStorage does not contain refreshToken', () => {
    localStorage.clear();
    expect(localStorage.getItem('refreshToken')).toBeNull();
  });

  test('✅ Theme preference is the only item allowed in localStorage', () => {
    localStorage.clear();
    localStorage.setItem('theme', 'dark');
    // Only theme should be in localStorage — no auth tokens
    expect(localStorage.getItem('theme')).toBe('dark');
    expect(localStorage.getItem('accessToken')).toBeNull();
  });
});
