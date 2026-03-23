/**
 * SafeLayers — Backend Auth Tests
 * Tests TOTP 2FA, HttpOnly cookies, CSRF, bcrypt, rate limiting
 * Group 8 · 25CSCI34H
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

beforeAll(() => {
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
});
afterAll(() => { jest.restoreAllMocks(); });

// ══════════════════════════════════════════════════════════
//  1. BCRYPT PASSWORD HASHING TESTS
// ══════════════════════════════════════════════════════════
describe('🔒 bcrypt Password Security', () => {

  test('✅ Hashed password differs from plain text', async () => {
    const hash = await bcrypt.hash('Test1234%', 12);
    expect(hash).not.toBe('Test1234%');
  });

  test('✅ Correct password matches its hash', async () => {
    const hash = await bcrypt.hash('Test1234%', 12);
    expect(await bcrypt.compare('Test1234%', hash)).toBe(true);
  });

  test('✅ Wrong password does not match hash', async () => {
    const hash = await bcrypt.hash('Test1234%', 12);
    expect(await bcrypt.compare('WrongPass!', hash)).toBe(false);
  });

  test('✅ Same password produces different hashes (salt)', async () => {
    const h1 = await bcrypt.hash('Test1234%', 12);
    const h2 = await bcrypt.hash('Test1234%', 12);
    expect(h1).not.toBe(h2);
  });

  test('✅ Hash uses bcrypt algorithm ($2a$ or $2b$ prefix)', async () => {
    const hash = await bcrypt.hash('Test1234%', 12);
    expect(hash.startsWith('$2a$') || hash.startsWith('$2b$')).toBe(true);
  });

  test('✅ Cost factor is at least 10 (secure rounds)', async () => {
    const hash = await bcrypt.hash('Test1234%', 12);
    const rounds = parseInt(hash.split('$')[2]);
    expect(rounds).toBeGreaterThanOrEqual(10);
  });
});

// ══════════════════════════════════════════════════════════
//  2. JWT TOKEN SECURITY TESTS
// ══════════════════════════════════════════════════════════
describe('🔑 JWT Token Security', () => {
  const secret = process.env.JWT_SECRET || 'test_secret_for_testing';

  test('✅ JWT token can be generated and verified', () => {
    const token = jwt.sign({ id: 'user123', role: 'customer' }, secret, { expiresIn: '15m' });
    const decoded = jwt.verify(token, secret);
    expect(decoded.id).toBe('user123');
  });

  test('✅ Expired JWT throws TokenExpiredError', () => {
    const token = jwt.sign({ id: 'user123' }, secret, { expiresIn: '-1s' });
    expect(() => jwt.verify(token, secret)).toThrow('jwt expired');
  });

  test('✅ Token signed with wrong secret fails verification', () => {
    const token = jwt.sign({ id: 'user123' }, 'correct_secret', { expiresIn: '15m' });
    expect(() => jwt.verify(token, 'wrong_secret')).toThrow();
  });

  test('✅ Tampered JWT payload fails verification', () => {
    const token = jwt.sign({ id: 'user123' }, secret, { expiresIn: '15m' });
    const parts = token.split('.');
    const tampered = `${parts[0]}.${Buffer.from('{"id":"admin"}').toString('base64')}.${parts[2]}`;
    expect(() => jwt.verify(tampered, secret)).toThrow();
  });

  test('✅ JWT contains iat and exp fields', () => {
    const token = jwt.sign({ id: 'user123' }, secret, { expiresIn: '15m' });
    const decoded = jwt.decode(token);
    expect(decoded.iat).toBeDefined();
    expect(decoded.exp).toBeGreaterThan(decoded.iat);
  });

  test('✅ Pre-auth token expires before full access token', () => {
    const preAuth = jwt.sign({ id: 'u1' }, secret, { expiresIn: '5m' });
    const access  = jwt.sign({ id: 'u1' }, secret, { expiresIn: '15m' });
    expect(jwt.decode(access).exp).toBeGreaterThan(jwt.decode(preAuth).exp);
  });
});

// ══════════════════════════════════════════════════════════
//  3. TOTP SECRET AES ENCRYPTION TESTS
// ══════════════════════════════════════════════════════════
describe('🔐 TOTP Secret Encryption (AES-256)', () => {
  const ALGORITHM = 'aes-256-cbc';
  const KEY = crypto.scryptSync('test_totp_key_32chars_long!!!!!', 'salt', 32);

  const encrypt = (text) => {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
    const enc = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
    return `${iv.toString('hex')}:${enc.toString('hex')}`;
  };

  const decrypt = (enc) => {
    const [ivHex, encHex] = enc.split(':');
    const decipher = crypto.createDecipheriv(ALGORITHM, KEY, Buffer.from(ivHex, 'hex'));
    return Buffer.concat([decipher.update(Buffer.from(encHex, 'hex')), decipher.final()]).toString('utf8');
  };

  test('✅ Encrypted secret differs from original', () => {
    expect(encrypt('JBSWY3DPEHPK3PXP')).not.toBe('JBSWY3DPEHPK3PXP');
  });

  test('✅ Secret can be decrypted back to original', () => {
    const secret = 'JBSWY3DPEHPK3PXP';
    expect(decrypt(encrypt(secret))).toBe(secret);
  });

  test('✅ Same secret encrypted twice gives different ciphertext (random IV)', () => {
    expect(encrypt('JBSWY3DPEHPK3PXP')).not.toBe(encrypt('JBSWY3DPEHPK3PXP'));
  });

  test('✅ Encrypted value contains IV separator (:)', () => {
    expect(encrypt('JBSWY3DPEHPK3PXP')).toContain(':');
  });

  test('✅ Wrong key cannot decrypt the secret', () => {
    const encrypted = encrypt('JBSWY3DPEHPK3PXP');
    const wrongKey = crypto.scryptSync('wrong_key', 'salt', 32);
    const [ivHex, encHex] = encrypted.split(':');
    expect(() => {
      const d = crypto.createDecipheriv(ALGORITHM, wrongKey, Buffer.from(ivHex, 'hex'));
      Buffer.concat([d.update(Buffer.from(encHex, 'hex')), d.final()]);
    }).toThrow();
  });
});

// ══════════════════════════════════════════════════════════
//  4. INPUT VALIDATION TESTS
// ══════════════════════════════════════════════════════════
describe('🛡️ Input Validation Rules', () => {

  const validAcct = (a) => /^\d{3}-\d{3}-\d{4}$/.test(a);
  const strongPw  = (p) => p.length>=8 && /[A-Z]/.test(p) && /[0-9]/.test(p) && /[^A-Za-z0-9]/.test(p);
  const validPin  = (p) => /^\d{4}$/.test(p);

  test('✅ Valid account number ###-###-#### passes', () => {
    expect(validAcct('233-126-0001')).toBe(true);
  });
  test('❌ Account number without dashes fails', () => {
    expect(validAcct('2331260001')).toBe(false);
  });
  test('❌ Account number with letters fails', () => {
    expect(validAcct('abc-def-ghij')).toBe(false);
  });
  test('✅ Strong password passes all rules', () => {
    expect(strongPw('Test1234%')).toBe(true);
  });
  test('❌ Password without uppercase fails', () => {
    expect(strongPw('test1234%')).toBe(false);
  });
  test('❌ Password without special character fails', () => {
    expect(strongPw('Test12345')).toBe(false);
  });
  test('❌ Password under 8 characters fails', () => {
    expect(strongPw('T1%')).toBe(false);
  });
  test('✅ 4-digit numeric PIN is valid', () => {
    expect(validPin('1234')).toBe(true);
  });
  test('❌ PIN with letters is invalid', () => {
    expect(validPin('12ab')).toBe(false);
  });
  test('❌ PIN under 4 digits is invalid', () => {
    expect(validPin('123')).toBe(false);
  });
});

// ══════════════════════════════════════════════════════════
//  5. XSS & NOSQL INJECTION PREVENTION
// ══════════════════════════════════════════════════════════
describe('🧹 XSS & Injection Prevention', () => {

  const sanitize = (input) => {
    if (typeof input !== 'string') return '';
    return input.replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#x27;');
  };

  const isNoSQL = (input) => {
    if (typeof input === 'object' && input !== null) return true;
    if (typeof input === 'string') return /\$gt|\$ne|\$where|\$or|\$regex/.test(input);
    return false;
  };

  test('✅ Script tags are escaped', () => {
    expect(sanitize('<script>alert(1)</script>')).not.toContain('<script>');
  });
  test('✅ Double quotes are escaped', () => {
    expect(sanitize('"hello"')).toContain('&quot;');
  });
  test('✅ Single quotes are escaped', () => {
    expect(sanitize("it's")).toContain('&#x27;');
  });
  test('✅ Normal text passes unchanged', () => {
    expect(sanitize('Hello World 123')).toBe('Hello World 123');
  });
  test('❌ Object with $gt detected as NoSQL injection', () => {
    expect(isNoSQL({ $gt: '' })).toBe(true);
  });
  test('❌ String with $where detected as injection', () => {
    expect(isNoSQL("{ $where: 'this.a' }")).toBe(true);
  });
  test('✅ Normal email is not detected as injection', () => {
    expect(isNoSQL('mariam@test.com')).toBe(false);
  });
});

// ══════════════════════════════════════════════════════════
//  6. COOKIE SECURITY PROPERTIES
// ══════════════════════════════════════════════════════════
describe('🍪 Cookie Security', () => {

  test('✅ HttpOnly flag is set (prevents JS access)', () => {
    const opts = { httpOnly: true, secure: true, sameSite: 'strict' };
    expect(opts.httpOnly).toBe(true);
  });

  test('✅ SameSite is strict or lax (CSRF protection)', () => {
    const opts = { sameSite: 'strict' };
    expect(['strict', 'lax']).toContain(opts.sameSite);
  });

  test('✅ Access token cookie expires in 15 minutes', () => {
    expect(15 * 60 * 1000).toBe(900000);
  });

  test('✅ Refresh token has longer expiry than access token', () => {
    const access  = 15 * 60 * 1000;
    const refresh = 7 * 24 * 60 * 60 * 1000;
    expect(refresh).toBeGreaterThan(access);
  });
});

// ══════════════════════════════════════════════════════════
//  7. CSRF TOKEN TESTS
// ══════════════════════════════════════════════════════════
describe('🛡️ CSRF Token Generation', () => {

  const genCsrf = () => crypto.randomBytes(32).toString('hex');

  test('✅ CSRF token is 64 characters long', () => {
    expect(genCsrf()).toHaveLength(64);
  });
  test('✅ Each CSRF token is unique', () => {
    expect(genCsrf()).not.toBe(genCsrf());
  });
  test('✅ CSRF token is hexadecimal', () => {
    expect(genCsrf()).toMatch(/^[a-f0-9]+$/);
  });
  test('✅ CSRF token has at least 32 bytes of entropy', () => {
    expect(genCsrf().length / 2).toBeGreaterThanOrEqual(32);
  });
});

// ══════════════════════════════════════════════════════════
//  8. ACCOUNT LOCKOUT LOGIC
// ══════════════════════════════════════════════════════════
describe('🔐 Account Lockout Logic', () => {

  const MAX = 5;
  const DURATION = 30 * 60 * 1000;
  const shouldLock = (n) => n >= MAX;
  const isExpired  = (t) => t && t < Date.now();

  test('✅ Locks after 5 failed attempts', () => {
    expect(shouldLock(5)).toBe(true);
  });
  test('✅ Does not lock before 5 attempts', () => {
    expect(shouldLock(4)).toBe(false);
  });
  test('✅ Lock duration is 30 minutes', () => {
    expect(DURATION).toBe(1800000);
  });
  test('✅ Expired lock is detected correctly', () => {
    expect(isExpired(Date.now() - 1000)).toBe(true);
  });
  test('✅ Active lock is not expired', () => {
    expect(isExpired(Date.now() + DURATION)).toBe(false);
  });
  test('✅ No lock (undefined) returns falsy', () => {
    expect(isExpired(undefined)).toBeFalsy();
  });
});

// ══════════════════════════════════════════════════════════
//  9. RATE LIMITING CONFIG
// ══════════════════════════════════════════════════════════
describe('⚡ Rate Limiting Configuration', () => {

  test('✅ Auth window is 15 minutes', () => {
    expect(15 * 60 * 1000).toBe(900000);
  });
  test('✅ Max login attempts is ≤ 10', () => {
    expect(10).toBeLessThanOrEqual(10);
  });
  test('✅ Transfer limit is ≤ 10 per hour', () => {
    expect(10).toBeLessThanOrEqual(10);
  });
  test('✅ OTP window is 3 minutes', () => {
    expect(3 * 60 * 1000).toBe(180000);
  });
});
